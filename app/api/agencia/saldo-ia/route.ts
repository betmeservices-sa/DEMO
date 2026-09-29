// El saldo de la cuenta de OpenAI de luna, para la vista Agencia del tablero.
// Ver lib/saldo-openai.ts: el saldo es lo cargado menos lo gastado desde esa
// carga, porque OpenAI no da el saldo por API.
//
// Solo para la agencia. Se guarda 10 minutos: OpenAI actualiza los costos con
// atraso y el tablero se refresca cada minuto.

import { NextResponse } from "next/server";
import { leerSesion, sesionDeCookieHeader } from "@/lib/session";
import { saldoOpenai, type SaldoOpenai } from "@/lib/saldo-openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIGENCIA_MS = 10 * 60_000;
let guardado: { en: number; saldo: SaldoOpenai | null } | null = null;

export async function GET(req: Request) {
  const sesion = await leerSesion(sesionDeCookieHeader(req.headers.get("cookie")));
  if (!sesion) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (!sesion.todos && sesion.tenant !== "miagentia") {
    return NextResponse.json({ ok: false, error: "Solo para la agencia" }, { status: 403 });
  }

  if (!guardado || Date.now() - guardado.en > VIGENCIA_MS) {
    try {
      guardado = { en: Date.now(), saldo: await saldoOpenai() };
    } catch (e) {
      console.error("[agencia/saldo-ia]", e instanceof Error ? e.message : e);
      return NextResponse.json({ ok: false, error: "No se pudo leer el gasto de OpenAI." });
    }
  }
  if (!guardado.saldo) return NextResponse.json({ ok: true, saldo: null });
  return NextResponse.json({ ok: true, saldo: guardado.saldo, leido: new Date(guardado.en).toISOString() });
}
