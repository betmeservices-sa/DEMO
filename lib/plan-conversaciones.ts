// El plan de conversaciones de un cliente en su ciclo de facturación.
//
// LO QUE SE ACORDÓ CON YALI (2026-09-24/27):
//
//   - PLAN: las primeras 1.000 conversaciones del ciclo, en orden cronológico y
//     del tema que sean, ya están pagadas (Plan A Starter de la propuesta).
//   - PAQUETE: desde la 1.001 corre un paquete de 1.000 generales y 500 de Day
//     Pass. Las de Day Pass van a su cupo; las demás, al general. El Day Pass
//     que pase de 500 también cuenta en el general.
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
// explicar, no cambia de un día a otro, y si se equivoca es a favor del
// cliente (el Day Pass tiene su propio cupo).
//
// EL CICLO. Va de renovación a renovación de la suscripción (Stripe), no por
// mes calendario. `diaDeRenovacion` = 1 es el mes calendario. Se corta a la
// medianoche de El Salvador.
//
// Puro: sin base ni reloj, para poder probarlo.

import { medianocheSV, partesSV } from "./periodos";

export interface PlanConversaciones {
  /** Las primeras N conversaciones del ciclo, de cualquier tema, ya pagadas. */
  plan: number;
  /** Lo que corre desde la conversación `plan + 1`. */
  paquete: { generales: number; dayPass: number };
  /** Día del mes en que se renueva la suscripción. 1 = mes calendario. */
  diaDeRenovacion: number;
}

/** Los planes vigentes. Un cliente sin plan acá no muestra contadores. */
export const PLANES: Record<string, PlanConversaciones> = {
  // El ciclo es la fecha de pago: Yali pagó el martes 22 de septiembre de 2026,
  // así que cada ciclo va del 22 al 21 del mes siguiente.
  yaly: { plan: 1000, paquete: { generales: 1000, dayPass: 500 }, diaDeRenovacion: 22 },
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

export interface UsoDelPlan {
  /** Todas las conversaciones del ciclo. */
  total: number;
  /** Todas las de Day Pass del ciclo. */
  totalDayPass: number;
  /** Las primeras del ciclo, las que cubre el plan. */
  plan: Contador & {
    /** Cuántas de las del plan fueron de Day Pass. */
    dayPass: number;
    /** Cuándo arrancó la última que cubre el plan; null si no se llenó. */
    llenoEl: string | null;
  };
  /** Desde la conversación que sigue al plan. */
  paquete: {
    total: number;
    /** Sin Day Pass, más el Day Pass sobre su cupo. */
    generales: Contador;
    dayPass: Contador;
    /** Day Pass por encima de su cupo, que pasó al general. */
    dayPassSobreCupo: number;
  };
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

/**
 * Reparte las conversaciones del ciclo: las primeras `plan` son del plan, y
 * desde la siguiente cada una va al cupo de Day Pass o al general.
 *
 * `chatsDayPass` puede traer chats de otros ciclos: solo cuentan los que
 * además tienen conversaciones en este.
 */
export function usoDelPlan(
  conversaciones: readonly Conversacion[],
  chatsDayPass: ReadonlySet<string>,
  p: PlanConversaciones,
): UsoDelPlan {
  const esDp = (c: Conversacion) => chatsDayPass.has(c.chat);
  const delPlan = conversaciones.slice(0, p.plan);
  const delPaquete = conversaciones.slice(p.plan);
  const dpPaquete = delPaquete.filter(esDp).length;
  const dayPassSobreCupo = Math.max(0, dpPaquete - p.paquete.dayPass);
  return {
    total: conversaciones.length,
    totalDayPass: conversaciones.filter(esDp).length,
    plan: {
      ...contador(delPlan.length, p.plan),
      dayPass: delPlan.filter(esDp).length,
      llenoEl: delPlan.length >= p.plan ? delPlan[delPlan.length - 1]!.inicio : null,
    },
    paquete: {
      total: delPaquete.length,
      generales: contador(delPaquete.length - dpPaquete + dayPassSobreCupo, p.paquete.generales),
      dayPass: contador(dpPaquete, p.paquete.dayPass),
      dayPassSobreCupo,
    },
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
 * El ciclo que contiene el final del periodo elegido. Con "7 días" es el ciclo
 * en curso; con un rango que termina en uno pasado, ese.
 */
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
