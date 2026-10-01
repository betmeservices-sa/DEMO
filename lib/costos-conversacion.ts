// El costo de IA de cada conversación que atendió el agente de un cliente.
//
// Lo pidió el usuario el 2026-10-01: desde que Sofía arrancó con luna, una fila
// por conversación con cuántos mensajes hubo, cuánto costó y cuánto costó en
// promedio cada mensaje.
//
// LA CONVERSACIÓN es la misma que se factura (lib/plan-conversaciones.ts): una
// sesión de 24 h que arranca con la primera respuesta del agente.
//
// SUS MENSAJES son los del chat dentro de esas 24 h, más los que el huésped
// mandó justo antes de que arrancara (son los que la dispararon), hasta
// GRACIA_MS antes. Un mensaje que cae dentro de las 24 h de una sesión es de
// esa; si no, de la que arranca dentro de la gracia; si no, de ninguna (por
// ejemplo, el equipo escribiendo en un chat donde el agente no contestó).
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

export type ConteoDeMensajes = Record<Quien, number> & { total: number };

export interface CostoDeConversacion {
  chat: string;
  inicio: string;
  canal: "whatsapp" | "facebook" | "instagram";
  /** El último nombre con que escribió el huésped en la conversación. */
  nombre: string | null;
  /** Respuestas del agente que costaron (las que pasaron por el modelo). */
  respuestas: number;
  mensajes: ConteoDeMensajes;
  costo: number;
  /** Costo entre los mensajes que mandó el agente; null si no mandó ninguno. */
  porMensajeAgente: number | null;
  /** Costo entre todos los mensajes de la conversación; null si no hay. */
  porMensaje: number | null;
}

export interface ResumenDeCostos {
  conversaciones: number;
  respuestas: number;
  mensajes: ConteoDeMensajes;
  costo: number;
  porConversacion: number | null;
  porMensajeAgente: number | null;
  porMensaje: number | null;
}

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;
const cero = (): ConteoDeMensajes => ({ huesped: 0, agente: 0, equipo: 0, total: 0 });

export function canalDeChat(chat: string): CostoDeConversacion["canal"] {
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
      respuestas: 0,
      mensajes: cero(),
      costo: 0,
      porMensajeAgente: null,
      porMensaje: null,
    };
    const lista = porChat.get(s.chat) ?? [];
    lista.push({ inicio: Date.parse(s.inicio), fila });
    porChat.set(s.chat, lista);
    if (Date.parse(s.inicio) >= t0) filas.push(fila);
  }

  const sesionDe = (chat: string, t: number): CostoDeConversacion | null => {
    const lista = porChat.get(chat);
    if (!lista || Number.isNaN(t)) return null;
    let i = -1;
    while (i + 1 < lista.length && lista[i + 1]!.inicio <= t) i++;
    if (i >= 0 && t < lista[i]!.inicio + DURACION_CONVERSACION_MS) return lista[i]!.fila;
    const siguiente = lista[i + 1];
    return siguiente && siguiente.inicio - t <= GRACIA_MS ? siguiente.fila : null;
  };

  for (const r of respuestas) {
    const f = sesionDe(r.chat, Date.parse(r.ts));
    if (!f) continue;
    f.respuestas++;
    f.costo += r.costo;
  }
  const enOrden = [...mensajes].sort((a, b) => a.ts.localeCompare(b.ts));
  for (const m of enOrden) {
    const f = sesionDe(m.chat, Date.parse(m.ts));
    if (!f) continue;
    f.mensajes[m.quien]++;
    f.mensajes.total++;
    if (m.quien === "huesped" && m.nombre?.trim()) f.nombre = m.nombre.trim();
  }
  for (const f of filas) {
    f.costo = r6(f.costo);
    f.porMensajeAgente = f.mensajes.agente > 0 ? f.costo / f.mensajes.agente : null;
    f.porMensaje = f.mensajes.total > 0 ? f.costo / f.mensajes.total : null;
  }
  return filas.sort((a, b) => b.inicio.localeCompare(a.inicio) || a.chat.localeCompare(b.chat));
}

export function resumenDeCostos(filas: readonly CostoDeConversacion[]): ResumenDeCostos {
  const mensajes = cero();
  let costo = 0;
  let respuestas = 0;
  for (const f of filas) {
    costo += f.costo;
    respuestas += f.respuestas;
    mensajes.huesped += f.mensajes.huesped;
    mensajes.agente += f.mensajes.agente;
    mensajes.equipo += f.mensajes.equipo;
    mensajes.total += f.mensajes.total;
  }
  costo = r6(costo);
  return {
    conversaciones: filas.length,
    respuestas,
    mensajes,
    costo,
    porConversacion: filas.length > 0 ? costo / filas.length : null,
    porMensajeAgente: mensajes.agente > 0 ? costo / mensajes.agente : null,
    porMensaje: mensajes.total > 0 ? costo / mensajes.total : null,
  };
}
