import { NextResponse } from "next/server";
import { exigirModulo } from "@/lib/permisos";
import { tenantFromRequest } from "@/lib/tenants/server";
import { golpe } from "@/lib/freno";
import { generarRespuesta } from "@/lib/ai";
import { sinMarkdown } from "@/lib/negritas";
import {
  FRENO_PRUEBA,
  SIN_CONEXION,
  SIN_RESPUESTA,
  claveDeFreno,
  cuerpoDePrueba,
  guionDePrueba,
  peticionAlHub,
  turnosParaIA,
  type CasoDePrueba,
} from "@/lib/consultorio/valeria";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Probar a Valeria desde el demo del Centro Ginecológico.
//
// Dos guiones:
// - "laboratorio" (por defecto): la Valeria del lab corre aquí mismo, con su
//   guion, su base y luna, igual que un turno real del tenant. Lo único que
//   cambia es que la conversación es "prueba:<sesion>": los casos que abriría
//   no se abren, solo se devuelven para mostrarlos.
// - "hospital": no hay guion de este lado. Se reenvía la conversación al hub,
//   donde vive la Valeria del número real, y se devuelve lo que ella dijo.
// Nada se guarda: el historial viaja completo en cada turno y vive en el
// navegador de quien prueba.
export async function POST(req: Request) {
  const permiso = await exigirModulo(req, "valeria");
  if (!permiso.ok) return permiso.respuesta;
  if (tenantFromRequest(req) !== "consultorio") {
    return NextResponse.json({ ok: false, error: "No existe." }, { status: 404 });
  }

  const b = await req.json().catch(() => ({}));
  const cuerpo = cuerpoDePrueba(b);
  if (!cuerpo) {
    return NextResponse.json({ ok: false, error: "Escribe algo." }, { status: 400 });
  }
  const guion = guionDePrueba(b);

  const peticion = guion === "hospital" ? peticionAlHub(cuerpo) : null;
  if (guion === "hospital" && !peticion) {
    return NextResponse.json({ ok: false, error: SIN_CONEXION }, { status: 503 });
  }

  if (await golpe(claveDeFreno(cuerpo.sesion), FRENO_PRUEBA)) {
    return NextResponse.json(
      { ok: false, error: "Muchos mensajes seguidos. Espera unos minutos y vuelve a probar." },
      { status: 429 },
    );
  }

  if (guion === "laboratorio") {
    try {
      const casos: CasoDePrueba[] = [];
      const r = await generarRespuesta(
        turnosParaIA(cuerpo.mensajes),
        { onCaso: (c) => void casos.push(c) },
        { tenantId: "consultorio", clave: `prueba:${cuerpo.sesion}` },
      );
      return NextResponse.json({ ok: true, respuesta: sinMarkdown(r.texto), casos });
    } catch (e) {
      console.error("consultorio/valeria (laboratorio):", e);
      return NextResponse.json({ ok: false, error: SIN_RESPUESTA });
    }
  }

  try {
    const r = await fetch(peticion!.url, { ...peticion!.init, cache: "no-store" });
    const d = (await r.json().catch(() => null)) as { ok?: boolean; respuesta?: string; error?: string } | null;
    if (!d || typeof d.ok !== "boolean") {
      console.error("consultorio/valeria: el hub respondió", r.status);
      return NextResponse.json({ ok: false, error: SIN_RESPUESTA });
    }
    // Lo que dijo el hub, tal cual, con su estado: un 429 de allá también
    // es un "espera un rato" acá.
    return NextResponse.json(
      d.ok ? { ok: true, respuesta: d.respuesta } : { ok: false, error: d.error ?? SIN_RESPUESTA },
      { status: r.ok ? 200 : r.status },
    );
  } catch (e) {
    console.error("consultorio/valeria:", e);
    return NextResponse.json({ ok: false, error: SIN_RESPUESTA });
  }
}
