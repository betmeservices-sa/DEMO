// El tablero del hospital, con cifras REALES de su WhatsApp y sus tickets.
//
// Hasta el 2026-10-07 el dashboard del hospital pintaba las tarjetas genéricas
// del demo (seed.metrics: "38 conversaciones hoy", "CSAT 4.7"), que eran de
// muestra. Desde que Claudia atiende pacientes de verdad, lo que se ve acá
// tiene que salir de la base: cuántas conversaciones entran, a qué hora, cuántas
// contestó Claudia, cuáles están esperando a una persona y cómo va la cola de
// tickets de Marielos.
//
// `armarPanelHospital` es una función pura (se prueba sin base); el que lee de
// Supabase es `cargarPanelHospital`. Todas las fechas se cortan en hora de El
// Salvador, que es la del hospital.

import { getSupabase } from "./supabase";
import { RESPONSABLE_HOSPITAL } from "./tickets-tenant";
import { TIPOS, type EstadoTicket } from "./tickets";

const TZ = "America/El_Salvador";
const DIA_MS = 24 * 3600 * 1000;
/** Un chat cuyo último mensaje es de la persona y lleva más de esto sin respuesta, "espera". */
const ESPERA_MIN = 3;
/** Una respuesta de Claudia cuenta como respuesta a un mensaje si llega dentro de esto. */
const RESPUESTA_MAX_MS = 15 * 60 * 1000;

export interface MensajePanel {
  from: string;
  nombre?: string | null;
  texto?: string | null;
  direccion: "in" | "out";
  /** true = lo escribió una persona desde el panel (staff_id). false = Claudia. */
  manual: boolean;
  /** ISO con zona. */
  ts: string;
}

export interface EstadoConvPanel {
  from: string;
  estado: string | null;
  asignadoA: string | null;
}

export interface TicketPanel {
  estado: EstadoTicket;
  tipo: string;
  asignadoA?: string | null;
  creado: string;
  resuelto?: string | null;
}

/** Lo que pasó en UN día (hoy o ayer), en hora de El Salvador. */
export interface ResumenDia {
  /** Teléfonos distintos que escribieron ese día. */
  conversaciones: number;
  mensajesEntrantes: number;
  /** Conversaciones del día con al menos una respuesta de Claudia. */
  respondidasPorIA: number;
  /** Conversaciones del día en las que escribió una persona desde el panel. */
  atendidasPorPersona: number;
  /** Tickets que se abrieron ese día. */
  ticketsCreados: number;
}

export interface PanelHospital {
  generadoEn: string;
  hoy: ResumenDia & {
    /** Contra ayer. null si ayer no hubo nada con qué comparar. */
    deltaPct: number | null;
  };
  /** El día completo anterior: lo primero que se mira al llegar en la mañana. */
  ayer: ResumenDia;
  semana: {
    conversaciones: number;
    /** Contra los 7 días anteriores. */
    deltaPct: number | null;
    mensajesEntrantes: number;
    /** % de las conversaciones de la semana con al menos una respuesta de Claudia. */
    pctIA: number | null;
    /** Mediana, en segundos, de lo que tarda Claudia en contestar. */
    respuestaMedianaSeg: number | null;
  };
  /** Chats cuyo último mensaje es de la persona y nadie ha contestado. */
  esperan: Array<{ from: string; nombre: string; texto: string; desde: string; minutos: number }>;
  /** Últimos 14 días, del más viejo al más nuevo. */
  porDia: Array<{ dia: string; etiqueta: string; conversaciones: number; entrantes: number }>;
  /** Mensajes entrantes por hora del día (0 a 23), últimos 7 días. */
  porHora: number[];
  tickets: {
    sinTomar: number;
    deResponsable: number;
    enProceso: number;
    resueltosHoy: number;
    abiertosPorTipo: Array<{ tipo: string; label: string; n: number }>;
  };
}

// ── Hora de El Salvador ──────────────────────────────────────────────────────

const fmtDia = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const fmtHora = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" });
const fmtEtiqueta = new Intl.DateTimeFormat("es-SV", { timeZone: TZ, weekday: "short", day: "numeric" });

/** "2026-10-07" en hora de El Salvador. */
export function claveDiaSV(ts: string | Date): string {
  return fmtDia.format(typeof ts === "string" ? new Date(ts) : ts);
}

function horaSV(ts: string): number {
  return Number(fmtHora.format(new Date(ts)));
}

function etiquetaDia(d: Date): string {
  // "mar 7": sin el punto que algunos motores le ponen a la abreviatura.
  return fmtEtiqueta.format(d).replace(".", "");
}

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const v = [...valores].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
}

function deltaPct(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

// ── Cálculo ──────────────────────────────────────────────────────────────────

export function armarPanelHospital(
  mensajes: MensajePanel[],
  estados: EstadoConvPanel[],
  tickets: TicketPanel[],
  ahora: Date = new Date(),
): PanelHospital {
  const hoyClave = claveDiaSV(ahora);
  const ayerClave = claveDiaSV(new Date(ahora.getTime() - DIA_MS));
  const hace7 = ahora.getTime() - 7 * DIA_MS;
  const hace14 = ahora.getTime() - 14 * DIA_MS;

  const ordenados = [...mensajes].sort((a, b) => a.ts.localeCompare(b.ts));
  const porChat = new Map<string, MensajePanel[]>();
  for (const m of ordenados) {
    const lista = porChat.get(m.from);
    if (lista) lista.push(m);
    else porChat.set(m.from, [m]);
  }

  // Conversaciones de un día = teléfonos distintos que ESCRIBIERON ese día.
  const convsDeDia = (clave: string) =>
    new Set(ordenados.filter((m) => m.direccion === "in" && claveDiaSV(m.ts) === clave).map((m) => m.from));
  const convsEntre = (desde: number, hasta: number) =>
    new Set(
      ordenados
        .filter((m) => {
          const t = new Date(m.ts).getTime();
          return m.direccion === "in" && t >= desde && t < hasta;
        })
        .map((m) => m.from),
    );

  // El resumen de un día: quién escribió, cuántos mensajes, a cuántos les
  // contestó Claudia y a cuántos una persona, y cuántos tickets se abrieron.
  const resumenDia = (clave: string): ResumenDia => {
    const convs = convsDeDia(clave);
    let respondidasPorIA = 0;
    let atendidasPorPersona = 0;
    for (const from of convs) {
      const delDia = (porChat.get(from) ?? []).filter((m) => claveDiaSV(m.ts) === clave);
      if (delDia.some((m) => m.direccion === "out" && !m.manual)) respondidasPorIA++;
      if (delDia.some((m) => m.direccion === "out" && m.manual)) atendidasPorPersona++;
    }
    return {
      conversaciones: convs.size,
      mensajesEntrantes: ordenados.filter((m) => m.direccion === "in" && claveDiaSV(m.ts) === clave).length,
      respondidasPorIA,
      atendidasPorPersona,
      ticketsCreados: tickets.filter((t) => claveDiaSV(t.creado) === clave).length,
    };
  };
  const hoy = resumenDia(hoyClave);
  const ayer = resumenDia(ayerClave);

  // Semana: esta contra la anterior, y qué tanto de la semana lo cubrió Claudia.
  const convsSemana = convsEntre(hace7, ahora.getTime() + 1);
  const convsSemanaAnterior = convsEntre(hace14, hace7);
  const entrantesSemana = ordenados.filter((m) => m.direccion === "in" && new Date(m.ts).getTime() >= hace7);
  let conIA = 0;
  const tiempos: number[] = [];
  for (const from of convsSemana) {
    const hilo = (porChat.get(from) ?? []).filter((m) => new Date(m.ts).getTime() >= hace7);
    if (hilo.some((m) => m.direccion === "out" && !m.manual)) conIA++;
    // Tiempo de respuesta: de cada mensaje de la persona a la PRIMERA respuesta
    // de Claudia que le sigue, sin otro mensaje de la persona en medio.
    for (let i = 0; i < hilo.length; i++) {
      if (hilo[i].direccion !== "in") continue;
      const sig = hilo[i + 1];
      if (!sig || sig.direccion !== "out" || sig.manual) continue;
      const d = new Date(sig.ts).getTime() - new Date(hilo[i].ts).getTime();
      if (d >= 0 && d <= RESPUESTA_MAX_MS) tiempos.push(Math.round(d / 1000));
    }
  }

  // Esperan: el último mensaje es de la persona y pasó el margen. Un chat que
  // alguien marcó como resuelto no se cuenta: ya lo vieron.
  const resueltos = new Set(estados.filter((e) => e.estado === "resuelto").map((e) => e.from));
  const esperan: PanelHospital["esperan"] = [];
  for (const [from, hilo] of porChat) {
    const ultimo = hilo[hilo.length - 1];
    if (ultimo.direccion !== "in" || resueltos.has(from)) continue;
    const t = new Date(ultimo.ts).getTime();
    if (t < hace7) continue;
    const minutos = Math.floor((ahora.getTime() - t) / 60000);
    if (minutos < ESPERA_MIN) continue;
    const nombre = [...hilo].reverse().find((m) => m.nombre)?.nombre ?? "";
    esperan.push({ from, nombre: nombre || from, texto: ultimo.texto ?? "", desde: ultimo.ts, minutos });
  }
  esperan.sort((a, b) => b.minutos - a.minutos);

  // Por día, 14 días, incluidos los de cero.
  const porDia: PanelHospital["porDia"] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(ahora.getTime() - i * DIA_MS);
    const clave = claveDiaSV(d);
    porDia.push({
      dia: clave,
      etiqueta: etiquetaDia(d),
      conversaciones: convsDeDia(clave).size,
      entrantes: ordenados.filter((m) => m.direccion === "in" && claveDiaSV(m.ts) === clave).length,
    });
  }

  const porHora = new Array<number>(24).fill(0);
  for (const m of entrantesSemana) porHora[horaSV(m.ts)]++;

  // Tickets.
  const abiertos = tickets.filter((t) => t.estado !== "resuelto");
  const conteoTipo = new Map<string, number>();
  for (const t of abiertos) conteoTipo.set(t.tipo, (conteoTipo.get(t.tipo) ?? 0) + 1);
  const abiertosPorTipo = [...conteoTipo.entries()]
    .map(([tipo, n]) => ({ tipo, label: TIPOS.find((x) => x.id === tipo)?.label ?? tipo, n }))
    .sort((a, b) => b.n - a.n);

  return {
    generadoEn: ahora.toISOString(),
    hoy: { ...hoy, deltaPct: deltaPct(hoy.conversaciones, ayer.conversaciones) },
    ayer,
    semana: {
      conversaciones: convsSemana.size,
      deltaPct: deltaPct(convsSemana.size, convsSemanaAnterior.size),
      mensajesEntrantes: entrantesSemana.length,
      pctIA: convsSemana.size ? Math.round((conIA / convsSemana.size) * 100) : null,
      respuestaMedianaSeg: mediana(tiempos),
    },
    esperan: esperan.slice(0, 15),
    porDia,
    porHora,
    tickets: {
      sinTomar: tickets.filter((t) => t.estado === "abierto").length,
      deResponsable: abiertos.filter((t) => t.asignadoA === RESPONSABLE_HOSPITAL).length,
      enProceso: tickets.filter((t) => t.estado === "en_proceso").length,
      resueltosHoy: tickets.filter((t) => t.estado === "resuelto" && t.resuelto && claveDiaSV(t.resuelto) === hoyClave).length,
      abiertosPorTipo,
    },
  };
}

// ── Lectura ──────────────────────────────────────────────────────────────────

/**
 * Lee los últimos 30 días del tenant y arma el panel. null = sin base (en
 * local sin Supabase no hay nada que mostrar, y el panel lo dice).
 */
export async function cargarPanelHospital(tenant = "hospital"): Promise<PanelHospital | null> {
  const sb = getSupabase(tenant);
  if (!sb) return null;
  const desde = new Date(Date.now() - 30 * DIA_MS).toISOString();

  const [msgs, convs, tks] = await Promise.all([
    sb
      .from("wa_messages")
      .select("wa_from, nombre, texto, direccion, staff_id, ts, created_at")
      .eq("tenant", tenant)
      .gte("created_at", desde)
      .order("created_at", { ascending: true })
      .limit(5000),
    sb.from("wa_conversacion_estado").select("wa_from, estado, asignado_a").eq("tenant", tenant),
    sb.from("tickets").select("estado, tipo, asignado_a, creado, resuelto").eq("tenant", tenant),
  ]);
  if (msgs.error) throw new Error(msgs.error.message);
  // Sin tabla de estados o de tickets el panel sale igual, con esas partes en cero.
  if (convs.error) console.error("[hospital-panel] estados:", convs.error.message);
  if (tks.error) console.error("[hospital-panel] tickets:", tks.error.message);

  type FilaMsg = { wa_from: string; nombre: string | null; texto: string | null; direccion: string | null; staff_id: string | null; ts: string | null; created_at: string };
  const mensajes: MensajePanel[] = ((msgs.data ?? []) as FilaMsg[]).map((r) => ({
    from: r.wa_from,
    nombre: r.nombre,
    texto: r.texto,
    direccion: r.direccion === "out" ? "out" : "in",
    manual: Boolean(r.staff_id),
    // created_at es cuándo lo recibimos nosotros; ts es el del teléfono y puede
    // venir sin zona o atrasado. Para medir respuesta sirve el nuestro.
    ts: r.created_at,
  }));
  type FilaConv = { wa_from: string; estado: string | null; asignado_a: string | null };
  const estados: EstadoConvPanel[] = ((convs.data ?? []) as FilaConv[]).map((r) => ({
    from: r.wa_from,
    estado: r.estado,
    asignadoA: r.asignado_a,
  }));
  type FilaTk = { estado: string; tipo: string; asignado_a: string | null; creado: string; resuelto: string | null };
  const tickets: TicketPanel[] = ((tks.data ?? []) as FilaTk[]).map((r) => ({
    estado: (r.estado ?? "abierto") as EstadoTicket,
    tipo: r.tipo,
    asignadoA: r.asignado_a,
    creado: r.creado,
    resuelto: r.resuelto,
  }));

  return armarPanelHospital(mensajes, estados, tickets);
}
