// La pantalla de "alta de un número en vivo" habla con esta ruta.
//
// GET  -> qué líneas se pueden usar hoy, o el estado de una corrida (?id=).
// POST -> arranca el alta de una línea.
//
// Pide sesión (la cierra proxy.ts) y solo la atiende el panel comercial: acá se
// da de alta un número de WhatsApp de verdad, no es una pantalla de adorno.

import { NextResponse } from "next/server";
import { leerSesion, sesionDeCookieHeader } from "@/lib/session";
import {
  TENANT_DEMO,
  estadoDeCorrida,
  iniciarAlta,
  lineasParaOfrecer,
} from "@/lib/alta-numero-orquestador";
import { hayBase, ultimasCorridas } from "@/lib/alta-numero-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function puede(req: Request): Promise<boolean> {
  const s = await leerSesion(sesionDeCookieHeader(req.headers.get("cookie")));
  return Boolean(s && (s.tenant === TENANT_DEMO || s.tenant === "miagentia"));
}

export async function GET(req: Request) {
  if (!(await puede(req))) return NextResponse.json({ ok: false, error: "No es tu panel." }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const corrida = await estadoDeCorrida(id);
    if (!corrida) return NextResponse.json({ ok: false, error: "No existe esa corrida." }, { status: 404 });
    return NextResponse.json({ ok: true, corrida });
  }

  const { lineas, motivo } = await lineasParaOfrecer();
  return NextResponse.json({
    ok: true,
    lineas,
    motivo,
    conBase: hayBase(),
    historial: await ultimasCorridas(TENANT_DEMO, 5),
  });
}

export async function POST(req: Request) {
  if (!(await puede(req))) return NextResponse.json({ ok: false, error: "No es tu panel." }, { status: 403 });

  if (!hayBase()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Sin base de datos la corrida no puede avanzar: el código del agente llega por otra función y no se vería acá.",
      },
      { status: 503 },
    );
  }

  let numero = "";
  try {
    numero = String(((await req.json()) as { numero?: string }).numero ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "Falta el número." }, { status: 400 });
  }

  const r = await iniciarAlta(numero);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
