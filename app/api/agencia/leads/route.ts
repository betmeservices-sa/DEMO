// Los leads de las landings de conferencia (miagentia.com/sandra y /andrea)
// para la pantalla /leads de la agencia.
//
// Solo para el panel comercial de MiAgentIA (tenant "comercial", login demoa)
// y la cuenta de la agencia con `todos`: son prospectos de MiAgentIA, no de un
// cliente, y el tablero de la agencia (demok) no los muestra.

import { NextResponse } from "next/server";
import { leerSesion, sesionDeCookieHeader } from "@/lib/session";
import { hayLlaveLeads, leerLeadsConferencia } from "@/lib/leads-conferencia-store";

export const dynamic = "force-dynamic";

const SIN_CACHE = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const sesion = await leerSesion(sesionDeCookieHeader(req.headers.get("cookie")));
  if (!sesion) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (!sesion.todos && sesion.tenant !== "comercial") {
    return NextResponse.json({ ok: false, error: "Solo para el panel comercial" }, { status: 403 });
  }
  if (!hayLlaveLeads()) {
    return NextResponse.json(
      { ok: false, error: "Falta la llave de la base de leads en este entorno." },
      { status: 503, headers: SIN_CACHE },
    );
  }
  try {
    const leads = await leerLeadsConferencia();
    return NextResponse.json({ ok: true, leads }, { headers: SIN_CACHE });
  } catch (err) {
    console.error("[agencia/leads]", err);
    return NextResponse.json({ ok: false, error: "No se pudieron leer los leads." }, { status: 502, headers: SIN_CACHE });
  }
}
