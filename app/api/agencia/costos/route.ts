// El costo de IA de cada conversación del agente de un cliente, desde que
// arrancó como hoy (ver lib/costos-conversacion.ts).
//
// GET ?cliente=<tenant>
//
// EL COSTO SE RECALCULA desde los tokens con la tarifa real del modelo
// (lib/tokens-precios.ts), no se toma el guardado: las filas de luna se
// guardaron con la entrada a $0.10 por millón, y OpenAI la factura como
// escritura de caché a 1.25 veces eso. Con lo guardado el reporte salía un 21%
// por debajo de la factura.
//
// Solo para la agencia, igual que el resto del tablero.

import { NextResponse } from "next/server";
import { leerSesion, sesionDeCookieHeader } from "@/lib/session";
import { TENANTS } from "@/lib/tenants";
import { getSupabase } from "@/lib/supabase";
import { detalleConsumo } from "@/lib/tokens-store";
import { costoDeUso } from "@/lib/tokens-precios";
import { DURACION_CONVERSACION_MS } from "@/lib/plan-conversaciones";
import {
  ARRANQUE_DEL_AGENTE,
  GRACIA_MS,
  costosPorConversacion,
  resumenDeCostos,
  type MensajeDelChat,
} from "@/lib/costos-conversacion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Techo de seguridad de filas de consumo (Yali anda por ~600 por día). */
const TOPE_FILAS = 40000;

/** Mil es lo que PostgREST devuelve por página. */
const PAGINA = 1000;

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

const quien = (entrante: boolean, staffId: string | null): MensajeDelChat["quien"] =>
  entrante ? "huesped" : staffId === "ia" ? "agente" : "equipo";

export async function GET(req: Request) {
  const sesion = await leerSesion(sesionDeCookieHeader(req.headers.get("cookie")));
  if (!sesion) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (!sesion.todos && sesion.tenant !== "miagentia") {
    return NextResponse.json({ ok: false, error: "Solo para la agencia" }, { status: 403 });
  }

  const cliente = new URL(req.url).searchParams.get("cliente") ?? "yaly";
  if (!(cliente in TENANTS)) {
    return NextResponse.json({ ok: false, error: "Cliente desconocido" }, { status: 400 });
  }
  const arranque = ARRANQUE_DEL_AGENTE[cliente];
  if (!arranque) return NextResponse.json({ ok: true, arranque: null });

  const sb = getSupabase(cliente);
  if (!sb) return NextResponse.json({ ok: false, error: "Sin base configurada." });

  const desdeMs = Date.parse(arranque.desde);
  const desdeMensajes = new Date(desdeMs - DURACION_CONVERSACION_MS - GRACIA_MS).toISOString();

  try {
    const [consumo, wa, meta] = await Promise.all([
      // 24 h antes del arranque, como el plan: una sesión que venía abierta no es nueva.
      detalleConsumo(cliente, TOPE_FILAS, new Date(desdeMs - DURACION_CONVERSACION_MS).toISOString()),
      todas<{ wa_from: string; ts: string; direccion: string; staff_id: string | null; nombre: string | null }>((a, b) =>
        sb
          .from("wa_messages")
          .select("wa_from, ts, direccion, staff_id, nombre")
          .eq("tenant", cliente)
          .gte("ts", desdeMensajes)
          .order("id")
          .range(a, b),
      ),
      todas<{ canal: string; sender_id: string; ts: string; direction: string; staff_id: string | null; sender_name: string | null }>((a, b) =>
        sb
          .from("meta_messages")
          .select("canal, sender_id, ts, direction, staff_id, sender_name")
          .eq("tenant", cliente)
          .gte("ts", desdeMensajes)
          .order("id")
          .range(a, b),
      ),
    ]);

    const respuestas = consumo
      .filter((f) => (f.tipo ?? "respuesta") === "respuesta")
      .map((f) => {
        const real = costoDeUso(f.uso, f.modelo);
        return { chat: f.waFrom, ts: f.ts, costo: real.tarifaConocida ? real.total : f.costo.total };
      });
    const mensajes: MensajeDelChat[] = [
      ...wa.map((m) => ({
        chat: m.wa_from,
        ts: m.ts,
        quien: quien(m.direccion === "in", m.staff_id),
        nombre: m.direccion === "in" ? m.nombre : null,
      })),
      ...meta.map((m) => ({
        chat: `${m.canal === "instagram" ? "instagram" : "facebook"}:${m.sender_id}`,
        ts: m.ts,
        quien: quien(m.direction === "in", m.staff_id),
        nombre: m.direction === "in" ? m.sender_name : null,
      })),
    ];

    const conversaciones = costosPorConversacion(respuestas, mensajes, arranque.desde);
    return NextResponse.json({
      ok: true,
      arranque,
      resumen: resumenDeCostos(conversaciones),
      conversaciones,
      truncado: consumo.length >= TOPE_FILAS,
    });
  } catch (e) {
    console.error("[agencia/costos]", cliente, e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "No se pudieron leer los costos." });
  }
}
