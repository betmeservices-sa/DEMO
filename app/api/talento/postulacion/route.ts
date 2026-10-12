import { NextResponse } from "next/server";
import { LIMITE_BYTES, limpiarEnvio, validarEnvio } from "@/lib/talento/formulario";
import { registrarEnvio, SinBase } from "@/lib/talento/servidor";
import { claveIp, golpe } from "@/lib/freno";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Recibe cada postulacion del formulario de carreras de BetMe.
//
// Es PUBLICA: la llama el navegador del candidato desde la pagina del
// formulario (sitio de BetMe o dominios de GHL), que no tiene sesion. Se
// defiende con tope de tamano, validacion y freno por IP. Un secreto
// compartido no serviria: viajaria dentro del JavaScript de una pagina
// abierta. No devuelve datos de nadie, solo si se recibio.

function cors(origen: string | null) {
  // Se responde al origen que llega: el formulario vive en mas de un dominio
  // (el sitio y los de GHL) y la ruta no expone nada que leer.
  const valido = origen && /^https?:\/\/[^\s/]+$/i.test(origen) ? origen : "*";
  return {
    "access-control-allow-origin": valido,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: cors(req.headers.get("origin")) });
}

// Freno por IP, compartido entre instancias (lib/freno.ts): corta a quien
// aprieta enviar en bucle, también cuando cada pedido cae en una instancia
// distinta.
const FRENO = { max: 10, ventanaSeg: 10 * 60 };

export async function POST(req: Request) {
  const origen = req.headers.get("origin");
  const h = cors(origen);
  if (await golpe(claveIp(req, "postulacion"), FRENO)) {
    return NextResponse.json({ ok: false, error: "Demasiados envíos seguidos." }, { status: 429, headers: h });
  }

  const crudo = await req.text();
  if (crudo.length > LIMITE_BYTES) {
    return NextResponse.json({ ok: false, error: "El envío es demasiado grande." }, { status: 413, headers: h });
  }
  let json: unknown;
  try {
    json = JSON.parse(crudo);
  } catch {
    return NextResponse.json({ ok: false, error: "Formato inválido." }, { status: 400, headers: h });
  }

  const envio = limpiarEnvio(json);
  const errores = validarEnvio(envio);
  if (errores.length) {
    return NextResponse.json({ ok: false, error: errores.join(" ") }, { status: 400, headers: h });
  }

  try {
    const r = await registrarEnvio(envio, origen, new Date().toISOString());
    return NextResponse.json({ ok: true, nuevo: r.nuevo }, { status: 200, headers: h });
  } catch (e) {
    console.error("[talento/postulacion] no se pudo guardar:", e instanceof Error ? e.message : e);
    const status = e instanceof SinBase ? 503 : 500;
    return NextResponse.json({ ok: false, error: "No se pudo guardar la postulación." }, { status, headers: h });
  }
}
