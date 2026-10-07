import { NextResponse } from "next/server";
import { getAiEnabled, setAiEnabled } from "@/lib/ai-store";
import { leerSesion, sesionDeCookieHeader } from "@/lib/session";
import { VE } from "@/lib/modulos";
import { tenantFromRequest } from "@/lib/tenants/server";
import { fijarIaDeLosNumerosDe, iaDeLosNumerosDe } from "@/lib/wa-conexiones-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// El Modo IA de ESTE panel (lo lee el toggle de la bandeja). Cada panel tiene
// el suyo: encenderlo en uno no enciende a los demas. Si el panel tiene numero
// propio con interruptor, lo que se muestra es ese numero, porque es lo que de
// verdad decide si el agente contesta.
//
// No expone que credenciales estan configuradas: eso le da pistas a un atacante.
export async function GET(req: Request) {
  const tenant = tenantFromRequest(req);
  const delNumero = await iaDeLosNumerosDe(tenant);
  return NextResponse.json({ enabled: delNumero ?? (await getAiEnabled(tenant)) });
}

// Enciende/apaga el Modo IA de ESTE panel: su interruptor y el de sus numeros
// propios. Los otros paneles no se tocan.
//
// Solo dirección. Esconder el botón en la barra es comodidad; esto es lo que
// impide que alguien lo apague con una petición a mano. Y no es un detalle:
// apagarlo deja al agente mudo para TODAS las conversaciones del cliente.
export async function POST(req: Request) {
  const sesion = await leerSesion(sesionDeCookieHeader(req.headers.get("cookie")));
  if (sesion?.fijo && !(VE[sesion.rol] ?? []).includes("settings")) {
    return NextResponse.json(
      { ok: false, error: "Tu perfil no puede cambiar el Modo IA." },
      { status: 403 },
    );
  }

  let body: { enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const enabled = Boolean(body.enabled);
  const tenant = tenantFromRequest(req);
  await setAiEnabled(tenant, enabled);
  await fijarIaDeLosNumerosDe(tenant, enabled);
  return NextResponse.json({ ok: true, enabled });
}
