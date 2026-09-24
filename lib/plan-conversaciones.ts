// El plan de conversaciones de un cliente: lo pagado, y lo que viene después.
//
// LO QUE SE ACORDÓ CON YALI (2026-09-24): el plan son 1.000 conversaciones al
// mes y esas ya están pagadas, sean del tema que sean. Se cuentan en orden
// cronológico: las primeras 1.000 del mes son del plan. Desde la 1.001 se
// separan:
//
//   - las de Day Pass van a un cupo propio de 500;
//   - las que no son de Day Pass son excedente;
//   - las de Day Pass que pasen de 500 también son excedente.
//
// Qué es UNA conversación: un chat distinto al que el agente respondió en el
// mes (la misma definición que "Conversaciones atendidas" del consumo). La
// misma persona en dos meses cuenta en los dos. Su lugar en la fila es la hora
// de la PRIMERA respuesta del agente en el mes.
//
// Qué la hace de Day Pass: que haya hablado del Day Pass, según el análisis
// diario de las conversaciones (temas) o porque el huésped lo escribió con
// todas las letras. Si habló del Day Pass y de otra cosa, es de Day Pass.
//
// Puro: sin base ni reloj, para poder probarlo.

import { claveDeDia, inicioDeMes, partesSV } from "./periodos";

export interface PlanConversaciones {
  /** Conversaciones incluidas (pagadas) por mes, de cualquier tema. */
  incluidas: number;
  /** Cupo de Day Pass para las que llegan DESPUÉS de las incluidas. */
  dayPass: number;
}

/** Los planes vigentes. Un cliente sin plan acá no muestra contadores. */
export const PLANES: Record<string, PlanConversaciones> = {
  yaly: { incluidas: 1000, dayPass: 500 },
};

export interface Contador {
  usadas: number;
  incluidas: number;
  /** Lo que pasó de lo incluido. 0 si no se pasó. */
  excedente: number;
}

export interface UsoDelPlan {
  /** Las primeras del mes, las que cubre el plan. */
  pagadas: Contador & {
    /** Cuántas de las pagadas fueron de Day Pass (solo informativo). */
    dayPass: number;
    /** Cuándo entró la última que cubre el plan; null si no se llenó. */
    llenoEl: string | null;
  };
  /** Desde la conversación que sigue a las pagadas. */
  despues: {
    dayPass: Contador;
    sinDayPass: number;
    /** Day Pass por encima de su cupo. */
    dayPassSobreCupo: number;
    /** Lo que ya no cubre nada: sin Day Pass + Day Pass sobre su cupo. */
    excedente: number;
  };
  total: number;
  totalDayPass: number;
}

export interface ConversacionDelMes {
  id: string;
  /** Primera respuesta del agente en el mes (ISO). Decide el orden. */
  primera: string;
}

const contador = (usadas: number, incluidas: number): Contador => ({
  usadas,
  incluidas,
  excedente: Math.max(0, usadas - incluidas),
});

/**
 * Las conversaciones del mes en orden, a partir de las respuestas del agente:
 * una por chat, con la hora de su primera respuesta.
 */
export function conversacionesDelMes(respuestas: Iterable<{ waFrom: string; ts: string }>): ConversacionDelMes[] {
  const primera = new Map<string, string>();
  for (const r of respuestas) {
    const antes = primera.get(r.waFrom);
    if (!antes || Date.parse(r.ts) < Date.parse(antes)) primera.set(r.waFrom, r.ts);
  }
  return [...primera.entries()]
    .map(([id, ts]) => ({ id, primera: ts }))
    .sort((a, b) => Date.parse(a.primera) - Date.parse(b.primera) || a.id.localeCompare(b.id));
}

/**
 * Reparte las conversaciones del mes: las primeras `incluidas` son del plan y
 * desde ahí se separan Day Pass (con su cupo) y el resto (excedente).
 *
 * `deDayPass` puede traer ids de otros meses: solo cuentan los que además
 * están en `conversaciones`.
 */
export function usoDelPlan(
  conversaciones: readonly ConversacionDelMes[],
  deDayPass: ReadonlySet<string>,
  plan: PlanConversaciones,
): UsoDelPlan {
  const pagadas = conversaciones.slice(0, plan.incluidas);
  const resto = conversaciones.slice(plan.incluidas);
  const dpDespues = resto.filter((c) => deDayPass.has(c.id)).length;
  const sinDayPass = resto.length - dpDespues;
  const dayPassSobreCupo = Math.max(0, dpDespues - plan.dayPass);
  return {
    pagadas: {
      ...contador(pagadas.length, plan.incluidas),
      dayPass: pagadas.filter((c) => deDayPass.has(c.id)).length,
      llenoEl: pagadas.length >= plan.incluidas ? pagadas[pagadas.length - 1]!.primera : null,
    },
    despues: {
      dayPass: contador(dpDespues, plan.dayPass),
      sinDayPass,
      dayPassSobreCupo,
      excedente: sinDayPass + dayPassSobreCupo,
    },
    total: conversaciones.length,
    totalDayPass: conversaciones.filter((c) => deDayPass.has(c.id)).length,
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

/**
 * El mes del plan que corresponde al periodo elegido: el mes en que termina.
 * Con "Hoy" o "7 días" es el mes en curso; con un rango de agosto, agosto.
 */
export function mesDelPlan(hastaExclusivo: string): { desde: string; hasta: string; etiqueta: string; clave: string } {
  const fin = Date.parse(hastaExclusivo) - 1;
  const desde = inicioDeMes(fin);
  const hasta = inicioDeMes(fin, 1);
  const p = partesSV(fin);
  return {
    desde: new Date(desde).toISOString(),
    hasta: new Date(hasta).toISOString(),
    etiqueta: `${MESES_LARGOS[p.m]} ${p.y}`,
    clave: claveDeDia(desde).slice(0, 7),
  };
}

const MESES_LARGOS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
