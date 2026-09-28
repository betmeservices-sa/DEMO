// El plan de conversaciones de un cliente en su ciclo de facturación.
//
// LO QUE SE ACORDÓ CON YALI (versión del 2026-09-28):
//
//   - SIN DAY PASS: el plan incluye 1.000 conversaciones por ciclo. Desde la
//     1.001 corre el paquete adicional.
//   - DAY PASS: van aparte desde la primera. El plan incluye 500 por ciclo;
//     desde la 501 corre su propio paquete adicional.
//
// Las dos filas son independientes: una conversación de Day Pass nunca gasta
// de las 1.000 generales, ni al revés.
//
// QUÉ ES UNA CONVERSACIÓN. Lo dice la propuesta que recibió el cliente: "una
// sesión activa con un huésped, con validez de 24 horas". La sesión arranca
// con la primera respuesta del agente y dura 24 horas; la primera respuesta
// después de esas 24 horas abre otra. La misma persona puede tener varias en
// un ciclo.
//
// QUÉ LA HACE DE DAY PASS. Que el chat haya hablado del Day Pass: lo marcó el
// análisis diario de conversaciones, o el huésped lo escribió en el ciclo. Se
// decide por chat y todas sus sesiones del ciclo lo heredan: es simple de
// explicar y si se equivoca es a favor del cliente. Ojo: si el análisis diario
// cambia el tema de un chat, sus sesiones pasan de una fila a la otra.
//
// EL CICLO. Va de renovación a renovación (`diaDeRenovacion`; 1 = mes
// calendario). Se corta a la medianoche de El Salvador.
//
// Puro: sin base ni reloj, para poder probarlo.

import { medianocheSV, partesSV } from "./periodos";

export interface Cupos {
  /** Conversaciones sin Day Pass. */
  generales: number;
  /** Conversaciones de Day Pass. */
  dayPass: number;
}

export interface PlanConversaciones {
  /** Lo que el plan incluye por ciclo. */
  incluidas: Cupos;
  /** El paquete adicional que corre cuando se acaba lo incluido. */
  adicional: Cupos;
  /** Día del mes en que arranca cada ciclo. 1 = mes calendario. */
  diaDeRenovacion: number;
  /** Desde cuándo corre el plan (AAAA-MM-DD, El Salvador). Antes no hay ciclos. */
  inicio: string;
}

/** Los planes vigentes. Un cliente sin plan acá no muestra contadores. */
export const PLANES: Record<string, PlanConversaciones> = {
  // El ciclo de Yali arranca el 1 de septiembre de 2026 y va por mes calendario.
  yaly: {
    incluidas: { generales: 1000, dayPass: 500 },
    adicional: { generales: 1000, dayPass: 500 },
    diaDeRenovacion: 1,
    inicio: "2026-09-01",
  },
};

/** Lo que dura una conversación, según la propuesta: 24 horas. */
export const DURACION_CONVERSACION_MS = 24 * 60 * 60 * 1000;

export interface Contador {
  usadas: number;
  incluidas: number;
  /** Lo que pasó de lo incluido. 0 si no se pasó. */
  excedente: number;
}

export interface Conversacion {
  /** El chat (teléfono o "<canal>:<persona>"). */
  chat: string;
  /** Cuándo arrancó la sesión: la primera respuesta del agente (ISO). */
  inicio: string;
}

/** Una fila del plan: lo incluido y, pasado eso, el paquete adicional. */
export interface FilaDelPlan {
  /** Todas las del ciclo de esta fila. */
  total: number;
  /** Las que cubre el plan (nunca más que lo incluido). */
  plan: Contador;
  /** Las que van al paquete adicional, desde la que sigue a lo incluido. */
  adicional: Contador;
  /** Cuándo arrancó la última que cubre el plan; null si no se llenó. */
  llenoEl: string | null;
}

export interface UsoDelPlan {
  /** Todas las conversaciones del ciclo, con Day Pass. */
  total: number;
  generales: FilaDelPlan;
  dayPass: FilaDelPlan;
}

const contador = (usadas: number, incluidas: number): Contador => ({
  usadas,
  incluidas,
  excedente: Math.max(0, usadas - incluidas),
});

/**
 * Las conversaciones (sesiones de 24 h) a partir de las respuestas del agente,
 * en orden de inicio. La ventana es fija desde el inicio, no desde el último
 * mensaje: un chat seguido de 30 horas son dos conversaciones.
 */
export function conversacionesDelCiclo(respuestas: Iterable<{ waFrom: string; ts: string }>): Conversacion[] {
  const porChat = new Map<string, number[]>();
  for (const r of respuestas) {
    const t = Date.parse(r.ts);
    if (Number.isNaN(t)) continue;
    const lista = porChat.get(r.waFrom) ?? [];
    lista.push(t);
    porChat.set(r.waFrom, lista);
  }
  const out: Conversacion[] = [];
  for (const [chat, tiempos] of porChat) {
    tiempos.sort((a, b) => a - b);
    let inicio = -Infinity;
    for (const t of tiempos) {
      if (t >= inicio + DURACION_CONVERSACION_MS) {
        inicio = t;
        out.push({ chat, inicio: new Date(t).toISOString() });
      }
    }
  }
  return out.sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio) || a.chat.localeCompare(b.chat));
}

/** Reparte una fila (ya en orden) entre lo incluido y el paquete adicional. */
function fila(conversaciones: readonly Conversacion[], incluidas: number, adicional: number): FilaDelPlan {
  const enPlan = Math.min(conversaciones.length, incluidas);
  return {
    total: conversaciones.length,
    plan: contador(enPlan, incluidas),
    adicional: contador(conversaciones.length - enPlan, adicional),
    llenoEl: conversaciones.length >= incluidas && incluidas > 0 ? conversaciones[incluidas - 1]!.inicio : null,
  };
}

/**
 * Reparte las conversaciones del ciclo en las dos filas del plan.
 *
 * `chatsDayPass` puede traer chats de otros ciclos: solo cuentan los que
 * además tienen conversaciones en este.
 */
export function usoDelPlan(
  conversaciones: readonly Conversacion[],
  chatsDayPass: ReadonlySet<string>,
  p: PlanConversaciones,
): UsoDelPlan {
  const dp = conversaciones.filter((c) => chatsDayPass.has(c.chat));
  const generales = conversaciones.filter((c) => !chatsDayPass.has(c.chat));
  return {
    total: conversaciones.length,
    generales: fila(generales, p.incluidas.generales, p.adicional.generales),
    dayPass: fila(dp, p.incluidas.dayPass, p.adicional.dayPass),
  };
}

/**
 * El id de chat del análisis, tal como lo guarda el consumo.
 *
 * El análisis usa "metac-<canal>-<página>-<persona>" en Messenger e Instagram
 * y el teléfono en WhatsApp; el consumo guarda "<canal>:<persona>" y el
 * teléfono. Sin esta traducción ninguna conversación de redes sería de Day Pass.
 */
export function idDeConsumo(idAnalisis: string): string {
  const m = /^metac-(facebook|instagram)-[^-]+-(.+)$/.exec(idAnalisis);
  return m ? `${m[1]}:${m[2]}` : idAnalisis;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
const MESES_LARGOS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** El día de renovación en ese mes: un 31 se renueva el último día de los meses cortos, como Stripe. */
function diaEn(y: number, m: number, dia: number): number {
  const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Math.min(Math.max(1, dia), ultimo);
}

/**
 * El ciclo en curso en `ahora`, o el que terminó justo antes si `anterior`.
 * Lo usa el tablero: el plan NO sigue al filtro de periodo, va por ciclo.
 */
export function cicloEnCurso(
  ahora: Date,
  diaDeRenovacion: number,
  anterior = false,
): { desde: string; hasta: string; etiqueta: string } {
  const actual = cicloDelPlan(new Date(ahora.getTime() + 1).toISOString(), diaDeRenovacion);
  return anterior ? cicloDelPlan(actual.desde, diaDeRenovacion) : actual;
}

/** La medianoche de El Salvador del día en que arrancó el plan, en ms UTC. */
export function inicioDelPlanMs(p: PlanConversaciones): number {
  const [y, m, d] = p.inicio.split("-").map(Number);
  return medianocheSV(y!, m! - 1, d!);
}

/**
 * ¿Hay un ciclo anterior que mostrar? Solo si arrancó cuando el plan ya
 * corría: agosto no es un ciclo de Yali aunque haya habido conversaciones.
 */
export function hayCicloAnterior(ahora: Date, p: PlanConversaciones): boolean {
  return Date.parse(cicloEnCurso(ahora, p.diaDeRenovacion, true).desde) >= inicioDelPlanMs(p);
}

/**
 * Las conversaciones que ARRANCAN en el ciclo. Hay que leer las respuestas
 * desde 24 h antes: una sesión que empezó el último día del ciclo anterior
 * sigue abierta al entrar en este, y sin ver su inicio se contaba dos veces.
 */
export function conversacionesQueArrancanEn(
  respuestas: Iterable<{ waFrom: string; ts: string }>,
  desde: string,
): Conversacion[] {
  const t0 = Date.parse(desde);
  return conversacionesDelCiclo(respuestas).filter((c) => Date.parse(c.inicio) >= t0);
}

/** El ciclo que contiene el instante justo antes de `hastaExclusivo`. */
export function cicloDelPlan(
  hastaExclusivo: string,
  diaDeRenovacion: number,
): { desde: string; hasta: string; etiqueta: string } {
  const fin = Date.parse(hastaExclusivo) - 1;
  const p = partesSV(fin);
  let y = p.y;
  let m = p.m;
  if (p.d < diaEn(y, m, diaDeRenovacion)) {
    m -= 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
  }
  const desde = medianocheSV(y, m, diaEn(y, m, diaDeRenovacion));
  const ys = m === 11 ? y + 1 : y;
  const ms = (m + 1) % 12;
  const hasta = medianocheSV(ys, ms, diaEn(ys, ms, diaDeRenovacion));

  const a = partesSV(desde);
  const b = partesSV(hasta - 1);
  const etiqueta =
    a.d === 1 && b.m === a.m
      ? `${MESES_LARGOS[a.m]} ${a.y}`
      : `${a.d} ${MESES[a.m]} al ${b.d} ${MESES[b.m]}${b.y !== a.y ? ` ${b.y}` : ""}`;
  return { desde: new Date(desde).toISOString(), hasta: new Date(hasta).toISOString(), etiqueta };
}
