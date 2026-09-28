// El plan de conversaciones de un cliente en su ciclo de facturación: sin Day
// Pass y Day Pass, cada una con lo incluido y su paquete adicional.
//
// GET ?cliente=<tenant>&ciclo=actual|anterior
//
// Va por CICLO de facturación y NO sigue al filtro de periodo del tablero:
// "actual" es el ciclo en curso y "anterior" el que ya cerró (para cobrarlo).
//
// Solo para la agencia, igual que el resto del tablero.

import { NextResponse } from "next/server";
import { leerSesion, sesionDeCookieHeader } from "@/lib/session";
import { TENANTS } from "@/lib/tenants";
import { getSupabase } from "@/lib/supabase";
import { detalleConsumo } from "@/lib/tokens-store";
import {
  DURACION_CONVERSACION_MS,
  PLANES,
  cicloEnCurso,
  conversacionesQueArrancanEn,
  hayCicloAnterior,
  idDeConsumo,
  inicioDelPlanMs,
  usoDelPlan,
} from "@/lib/plan-conversaciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Techo de seguridad de filas de consumo por ciclo (Yali anda por ~11.000). */
const TOPE_FILAS = 40000;

/** Mil es lo que PostgREST devuelve por página. */
const PAGINA = 1000;

/**
 * El huésped nombró el Day Pass. La misma regla que usa el análisis de
 * conversaciones (MENCIONA_DAY_PASS en el panel de Yali), en POSIX para
 * Postgres. Sirve para que una conversación de HOY cuente como Day Pass sin
 * esperar al análisis de mañana a las 7:30.
 */
const MENCIONA_DAY_PASS = String.raw`\y(d[aei]y ?pass?|dai ?pass?|pasad[ií]a|pase de d[ií]a)\y`;

async function todas<T>(pedir: (desde: number, hasta: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; ; i += PAGINA) {
    const { data, error } = await pedir(i, i + PAGINA - 1);
    if (error) throw new Error(error.message);
    const filas = (data ?? []) as T[];
    out.push(...filas);
    if (filas.length < PAGINA) break;
  }
  return out;
}

export async function GET(req: Request) {
  const sesion = await leerSesion(sesionDeCookieHeader(req.headers.get("cookie")));
  if (!sesion) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (!sesion.todos && sesion.tenant !== "miagentia") {
    return NextResponse.json({ ok: false, error: "Solo para la agencia" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams;
  const cliente = q.get("cliente") ?? "";
  if (!(cliente in TENANTS)) {
    return NextResponse.json({ ok: false, error: "Cliente desconocido" }, { status: 400 });
  }
  const plan = PLANES[cliente];
  if (!plan) return NextResponse.json({ ok: true, plan: null });

  const ahora = new Date();
  const hayAnterior = hayCicloAnterior(ahora, plan);
  const pideAnterior = q.get("ciclo") === "anterior";
  // Antes de que arranque el plan no hay ciclo que mostrar (ni que cobrar).
  if (pideAnterior && !hayAnterior) return NextResponse.json({ ok: true, plan, hayAnterior, ciclo: null, uso: null });
  const ciclo = cicloEnCurso(ahora, plan.diaDeRenovacion, pideAnterior);
  // Si el plan arrancó a mitad de un ciclo, se cuenta desde que arrancó.
  const desde = new Date(Math.max(Date.parse(ciclo.desde), inicioDelPlanMs(plan))).toISOString();

  const sb = getSupabase(cliente);
  if (!sb) return NextResponse.json({ ok: false, error: "Sin base configurada." });

  try {
    const [filas, analizadas, mencionesWa, mencionesMeta] = await Promise.all([
      // 24 h antes del corte: así se ve dónde arrancó una sesión que viene
      // abierta del ciclo anterior y no se cuenta de nuevo en este.
      detalleConsumo(cliente, TOPE_FILAS, new Date(Date.parse(desde) - DURACION_CONVERSACION_MS).toISOString(), ciclo.hasta),
      // Lo que el análisis diario marcó como Day Pass, de cualquier fecha: si
      // el chat tuvo conversaciones en este ciclo, esas cuentan como Day Pass.
      todas<{ conversacion_id: string }>((a, b) =>
        sb
          .from("conversacion_analisis")
          .select("conversacion_id")
          .eq("tenant", cliente)
          .or("tema.eq.day_pass,temas.cs.{day_pass}")
          .order("conversacion_id")
          .range(a, b),
      ),
      todas<{ wa_from: string }>((a, b) =>
        sb
          .from("wa_messages")
          .select("wa_from")
          .eq("tenant", cliente)
          .eq("direccion", "in")
          .gte("ts", desde)
          .lt("ts", ciclo.hasta)
          .filter("texto", "imatch", MENCIONA_DAY_PASS)
          .order("id")
          .range(a, b),
      ),
      todas<{ canal: string; sender_id: string }>((a, b) =>
        sb
          .from("meta_messages")
          .select("canal, sender_id")
          .eq("tenant", cliente)
          .eq("direction", "in")
          .gte("ts", desde)
          .lt("ts", ciclo.hasta)
          .filter("texto", "imatch", MENCIONA_DAY_PASS)
          .order("id")
          .range(a, b),
      ),
    ]);

    // Sesiones de 24 h que arrancan en el ciclo, en orden de inicio.
    const conversaciones = conversacionesQueArrancanEn(
      filas.filter((f) => (f.tipo ?? "respuesta") === "respuesta"),
      desde,
    );
    const chatsDayPass = new Set<string>([
      ...analizadas.map((f) => idDeConsumo(f.conversacion_id)),
      ...mencionesWa.map((f) => f.wa_from),
      ...mencionesMeta.map((f) => `${f.canal === "instagram" ? "instagram" : "facebook"}:${f.sender_id}`),
    ]);

    return NextResponse.json({
      ok: true,
      plan,
      hayAnterior,
      ciclo,
      uso: usoDelPlan(conversaciones, chatsDayPass, plan),
      truncado: filas.length >= TOPE_FILAS,
    });
  } catch (e) {
    console.error("[agencia/plan]", cliente, e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "No se pudo leer el plan." });
  }
}
