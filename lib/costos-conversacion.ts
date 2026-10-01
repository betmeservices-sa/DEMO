// El costo de IA de cada conversación que atendió el agente de un cliente.
//
// Lo pidió el usuario el 2026-10-01: desde que Sofía arrancó con luna, una fila
// por conversación con cuántos mensajes mandó Sofía, cuánto costó y cuánto costó
// en promedio cada mensaje suyo; el total arriba y todo dividido por canal. Solo
// cuentan los mensajes del agente: los del huésped y los del equipo no entran.
//
// LA CONVERSACIÓN es la misma que se factura (lib/plan-conversaciones.ts): una
// sesión de 24 h que arranca con la primera respuesta del agente.
//
// SUS MENSAJES son los que el agente mandó en el chat dentro de esas 24 h, más
// los que mandó un rato antes de la primera respuesta con modelo (el menú fijo
// de "¿a qué hotel?", o el mismo primer mensaje si quedó guardado unos segundos
// antes que su consumo), hasta GRACIA_MS. Los del huésped solo sirven para
// saber su nombre.
//
// EL COSTO es la suma del costo de las respuestas del agente en la sesión. Cada
// respuesta ya trae todas sus llamadas al modelo: herramientas, revisor y
// reescritura.
//
// Puro: sin base ni reloj.

import { DURACION_CONVERSACION_MS, conversacionesDelCiclo } from "./plan-conversaciones";

/** Desde cuándo se reporta a cada cliente: cuando su agente arrancó como hoy. */
export const ARRANQUE_DEL_AGENTE: Record<string, { desde: string; etiqueta: string }> = {
  // La primera respuesta con luna fue el lunes 28 de septiembre de 2026 a las
  // 10:07:52 a. m. (El Salvador); la última con Haiku, a las 9:49 de esa mañana.
  yaly: { desde: "2026-09-28T16:07:00.000Z", etiqueta: "lunes 28 de septiembre, 10:07 a. m." },
};

/** Lo que se mira antes del arranque de una sesión para encontrar el mensaje que la disparó. */
export const GRACIA_MS = 2 * 60 * 60 * 1000;

export type Quien = "huesped" | "agente" | "equipo";
export type Canal = "whatsapp" | "facebook" | "instagram";
export const CANALES: readonly Canal[] = ["whatsapp", "facebook", "instagram"];

export interface RespuestaConCosto {
  /** El chat, como lo guarda el consumo: teléfono o "<canal>:<persona>". */
  chat: string;
  ts: string;
  costo: number;
}

export interface MensajeDelChat {
  chat: string;
  ts: string;
  quien: Quien;
  /** El nombre con que se presenta el huésped, si viene. */
  nombre?: string | null;
}

export interface CostoDeConversacion {
  chat: string;
  inicio: string;
  canal: Canal;
  /** El último nombre con que escribió el huésped en la conversación. */
  nombre: string | null;
  /** Mensajes que mandó el agente en la conversación. */
  mensajes: number;
  costo: number;
  /** Costo entre los mensajes del agente; null si no mandó ninguno. */
  porMensaje: number | null;
}

export interface ResumenDeCostos {
  conversaciones: number;
  /** Mensajes del agente. */
  mensajes: number;
  costo: number;
  porConversacion: number | null;
  porMensaje: number | null;
}

export interface ResumenDeCanal extends ResumenDeCostos {
  canal: Canal;
  /** Qué parte del costo total se llevó este canal (0 a 1). */
  parteDelCosto: number;
}

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

export function canalDeChat(chat: string): Canal {
  if (chat.startsWith("facebook:")) return "facebook";
  if (chat.startsWith("instagram:")) return "instagram";
  return "whatsapp";
}

/**
 * Una fila por conversación que arrancó desde `desde`, de la más nueva a la más
 * vieja. Las respuestas hay que pasarlas desde 24 h antes de `desde`, igual
 * que en el plan: así una sesión que venía abierta no se cuenta como nueva.
 */
export function costosPorConversacion(
  respuestas: readonly RespuestaConCosto[],
  mensajes: readonly MensajeDelChat[],
  desde: string,
): CostoDeConversacion[] {
  const t0 = Date.parse(desde);
  const sesiones = conversacionesDelCiclo(respuestas.map((r) => ({ waFrom: r.chat, ts: r.ts })));

  const porChat = new Map<string, { inicio: number; fila: CostoDeConversacion }[]>();
  const filas: CostoDeConversacion[] = [];
  for (const s of sesiones) {
    const fila: CostoDeConversacion = {
      chat: s.chat,
      inicio: s.inicio,
      canal: canalDeChat(s.chat),
      nombre: null,
      mensajes: 0,
      costo: 0,
      porMensaje: null,
    };
    const lista = porChat.get(s.chat) ?? [];
    lista.push({ inicio: Date.parse(s.inicio), fila });
    porChat.set(s.chat, lista);
    if (Date.parse(s.inicio) >= t0) filas.push(fila);
  }

  // La sesión que contiene el instante; si ninguna, la que arranca dentro de
  // la gracia (lo que se mandó justo antes de la primera respuesta con modelo).
  const sesionDe = (chat: string, t: number, conGracia: boolean): CostoDeConversacion | null => {
    const lista = porChat.get(chat);
    if (!lista || Number.isNaN(t)) return null;
    let i = -1;
    while (i + 1 < lista.length && lista[i + 1]!.inicio <= t) i++;
    if (i >= 0 && t < lista[i]!.inicio + DURACION_CONVERSACION_MS) return lista[i]!.fila;
    const siguiente = lista[i + 1];
    return conGracia && siguiente && siguiente.inicio - t <= GRACIA_MS ? siguiente.fila : null;
  };

  for (const r of respuestas) {
    const f = sesionDe(r.chat, Date.parse(r.ts), false);
    if (f) f.costo += r.costo;
  }
  const enOrden = [...mensajes].sort((a, b) => a.ts.localeCompare(b.ts));
  for (const m of enOrden) {
    if (m.quien === "agente") {
      const f = sesionDe(m.chat, Date.parse(m.ts), true);
      if (f) f.mensajes++;
    } else if (m.quien === "huesped" && m.nombre?.trim()) {
      const f = sesionDe(m.chat, Date.parse(m.ts), true);
      if (f) f.nombre = m.nombre.trim();
    }
  }
  for (const f of filas) {
    f.costo = r6(f.costo);
    f.porMensaje = f.mensajes > 0 ? f.costo / f.mensajes : null;
  }
  return filas.sort((a, b) => b.inicio.localeCompare(a.inicio) || a.chat.localeCompare(b.chat));
}

export function resumenDeCostos(filas: readonly CostoDeConversacion[]): ResumenDeCostos {
  let costo = 0;
  let mensajes = 0;
  for (const f of filas) {
    costo += f.costo;
    mensajes += f.mensajes;
  }
  costo = r6(costo);
  return {
    conversaciones: filas.length,
    mensajes,
    costo,
    porConversacion: filas.length > 0 ? costo / filas.length : null,
    porMensaje: mensajes > 0 ? costo / mensajes : null,
  };
}

/** El resumen de cada canal, del que más consume al que menos. Los canales sin conversaciones no salen. */
export function resumenPorCanal(filas: readonly CostoDeConversacion[]): ResumenDeCanal[] {
  const total = resumenDeCostos(filas).costo;
  return CANALES.map((canal) => {
    const r = resumenDeCostos(filas.filter((f) => f.canal === canal));
    return { ...r, canal, parteDelCosto: total > 0 ? r.costo / total : 0 };
  })
    .filter((r) => r.conversaciones > 0)
    .sort((a, b) => b.costo - a.costo);
}
