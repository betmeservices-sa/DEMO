// Cómo se cerró cada reserva: quién la cerró y a qué hora pasó cada cosa.
//
// LA PREGUNTA QUE CONTESTA, tal como la hizo el cliente: de las confirmadas,
// "qué tanto fue Sofía y qué tanto fue Vero", con la hora en que arrancó la
// conversación, la hora en que se le pasó a una persona, y la hora en que se
// cerró el trato.
//
// VA APARTE DE /api/agencia/resumen a propósito. Esto lee el hilo completo de
// cada reserva, o sea una consulta por reserva. Meterlo en el resumen haría
// lento el panel entero para un bloque que no siempre se mira.
//
// GET ?cliente=<tenant>&periodo=hoy|ayer|7d|30d|rango&desde=AAAA-MM-DD&hasta=AAAA-MM-DD
//
// Las confirmadas se cortan igual que en el resumen (por el día en que se
// apartaron), y son TODAS: "Quién cerró" tiene que cuadrar con el bloque de la
// plata. Antes había un tope de 40 y con 44 confirmadas en 30 días las cuatro
// que sobraban no aparecían en ningún lado.
//
// Solo para la agencia: acá se ve la operación de un cliente con nombre y
// apellido de quién cerró qué.

import { NextResponse } from "next/server";
import { leerSesion, sesionDeCookieHeader } from "@/lib/session";
import { esAgencia } from "@/lib/tenants/voz";
import { isTenantId } from "@/lib/tenants";
import { tenantFromRequest } from "@/lib/tenants/server";
import { listarPreReservas } from "@/lib/yali-prereservas";
import { mensajesAnteriores } from "@/lib/meta-messages-store";
import { comoSeCerro, resumirCierres, type Cierre, type MensajeDelHilo } from "@/lib/cierre-de-reserva";
import type { MetaCanal } from "@/lib/meta-messages-store";
import { esPeriodo, rangoDePeriodo } from "@/lib/periodos";
import { confirmadasDelPeriodo } from "@/lib/agencia-resumen";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Una consulta por reserva: con muchas confirmadas esto toma unos segundos.
export const maxDuration = 60;

/** Cuántos mensajes del hilo se miran. De sobra para ver cómo se cerró. */
const HILO = 200;

/** Cuántos hilos se leen a la vez, para no abrir cien consultas juntas. */
const EN_PARALELO = 8;

/** Cuántos apartados se leen para cortar el periodo (el mismo que el resumen). */
const TOPE_RESERVAS = 1000;

/**
 * Los mensajes de un chat de WhatsApp, con quién mandó cada saliente.
 *
 * Antes no se leía: la clave de WhatsApp es "wa:<teléfono>", sin tercera
 * parte, y el hilo llegaba vacío. Con eso las 21 reservas de WhatsApp de un
 * mes salían como "las cerró Sofía" sin haber mirado un mensaje.
 */
async function hiloWhatsapp(tenant: string, telefono: string): Promise<MensajeDelHilo[]> {
  const sb = getSupabase(tenant);
  if (!sb) return [];
  const { data, error } = await sb
    .from("wa_messages")
    .select("direccion, ts, staff_id, staff_nombre")
    .eq("tenant", tenant)
    .eq("wa_from", telefono)
    .order("ts", { ascending: false })
    .limit(HILO);
  if (error) throw new Error(error.message);
  const filas = (data ?? []) as { direccion: string; ts: string; staff_id: string | null; staff_nombre: string | null }[];
  return filas.map((m) => ({
    direction: m.direccion === "in" ? "in" : "out",
    ts: m.ts,
    staffId: m.staff_id,
    staffNombre: m.staff_nombre,
  }));
}

/** Corre `fn` sobre la lista de a `n` a la vez, sin perder el orden. */
async function deAPocos<T, R>(lista: readonly T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < lista.length; i += n) out.push(...(await Promise.all(lista.slice(i, i + n).map(fn))));
  return out;
}

export async function GET(req: Request) {
  // La agencia y nadie más: esto muestra quién de un cliente cerró qué.
  const tenantDelPanel = tenantFromRequest(req);
  if (!esAgencia(tenantDelPanel)) {
    return NextResponse.json({ ok: false, error: "Solo para la agencia" }, { status: 403 });
  }
  const sesion = await leerSesion(sesionDeCookieHeader(req.headers.get("cookie")));
  if (!sesion) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const q = new URL(req.url).searchParams;
  const pedido = q.get("cliente") ?? "";
  if (!isTenantId(pedido)) {
    return NextResponse.json({ ok: false, error: "Falta el cliente." }, { status: 400 });
  }

  const periodo = q.get("periodo");
  const { desde, hasta } = rangoDePeriodo(esPeriodo(periodo) ? periodo : "7d", new Date(), q.get("desde"), q.get("hasta"));

  const todas = await listarPreReservas(pedido, undefined, TOPE_RESERVAS).catch(() => []);
  const confirmadas = confirmadasDelPeriodo(todas, desde, hasta);

  const cierres = await deAPocos(confirmadas, EN_PARALELO, async (r) => {
    // La clave dice de dónde vino: "<canal>:<pagina>:<persona>" en Messenger e
    // Instagram, "wa:<teléfono>" en WhatsApp, "manual:<ts>" si la cargó una
    // persona desde el panel. Una reserva sin hilo que leer se devuelve igual,
    // como "sin datos", en vez de desaparecerla y que los totales no cuadren.
    const [canal, pageId, senderId] = (r.clave ?? "").split(":");
    let mensajes: MensajeDelHilo[] = [];
    const esMeta = (canal === "facebook" || canal === "instagram") && !!pageId && !!senderId;
    if (canal === "wa" && pageId) {
      mensajes = await hiloWhatsapp(pedido, pageId).catch(() => []);
    } else if (esMeta) {
      const h = await mensajesAnteriores(
        { canal: canal as MetaCanal, pageId, senderId },
        null,
        HILO,
        pedido,
      ).catch(() => ({ mensajes: [] }));
      mensajes = h.mensajes.map((m) => ({
        direction: m.direction === "in" ? "in" : "out",
        ts: m.ts,
        staffId: m.staffId ?? null,
        staffNombre: m.staffNombre ?? null,
      }));
    }

    let cierre: Cierre = comoSeCerro(mensajes, r.confirmadaTs ?? null);
    // Cargada a mano desde el panel: la hizo una persona, no hay chat.
    if (canal === "manual") {
      cierre = { ...cierre, cerro: "persona", persona: r.confirmadaPor ?? null };
    }

    return {
      id: r.id,
      huesped: r.huesped ?? "",
      sede: r.sedeNombre ?? "",
      habitacion: r.habitacionNombre ?? "",
      total: r.total ?? 0,
      noches: r.noches ?? 0,
      confirmadaTs: r.confirmadaTs ?? null,
      confirmadaPor: r.confirmadaPor ?? null,
      comprobanteTs: r.comprobanteTs ?? null,
      // El visor de chat de la agencia lee Messenger e Instagram.
      conversacion: esMeta ? r.clave : null,
      cierre,
    };
  });

  return NextResponse.json({ ok: true, cliente: pedido, resumen: resumirCierres(cierres), cierres });
}
