// El plan de conversaciones de un cliente, con dos contadores.
//
// LO QUE SE ACORDÓ CON YALI (2026-09-24): el plan es de 1.000 conversaciones
// al mes, y las de Day Pass van APARTE con 500 propias. Una conversación de Day
// Pass no gasta del plan general hasta que se acaban sus 500; de ahí en
// adelante cada Day Pass extra sí suma al general.
//
//   general = conversaciones que no son de Day Pass + (Day Pass por encima de 500)
//
// Qué es UNA conversación: un chat distinto al que el agente respondió en el
// mes (la misma definición que "Conversaciones atendidas" del consumo). La
// misma persona en dos meses cuenta en los dos.
//
// Qué la hace de Day Pass: que haya hablado del Day Pass, según el análisis
// diario de las conversaciones (temas) o porque el huésped lo escribió con
// todas las letras. Si habló del Day Pass y de otra cosa, es de Day Pass.
//
// Puro: sin base ni reloj, para poder probarlo.

import { claveDeDia, inicioDeMes, partesSV } from "./periodos";

export interface PlanConversaciones {
  /** Conversaciones generales incluidas por mes. */
  generales: number;
  /** Conversaciones de Day Pass incluidas por mes, aparte de las generales. */
  dayPass: number;
}

/** Los planes vigentes. Un cliente sin plan acá no muestra contadores. */
export const PLANES: Record<string, PlanConversaciones> = {
  yaly: { generales: 1000, dayPass: 500 },
};

export interface Contador {
  usadas: number;
  incluidas: number;
  /** Lo que pasó de lo incluido. 0 si no se pasó. */
  excedente: number;
}

export interface UsoDelPlan {
  dayPass: Contador;
  general: Contador;
  /** Conversaciones de Day Pass que, por pasar de su cupo, cuentan en el general. */
  dayPassAlGeneral: number;
  /** Todas las conversaciones del mes, de los dos tipos. */
  total: number;
  /** Conversaciones de Day Pass del mes, antes de repartir. */
  totalDayPass: number;
}

const contador = (usadas: number, incluidas: number): Contador => ({
  usadas,
  incluidas,
  excedente: Math.max(0, usadas - incluidas),
});

/**
 * Reparte las conversaciones del mes entre los dos contadores.
 *
 * `conversaciones` son los ids de chat que el agente atendió; `deDayPass`, los
 * que hablaron de Day Pass (puede traer ids de otros meses: solo cuentan los
 * que además están en `conversaciones`).
 */
export function usoDelPlan(
  conversaciones: Iterable<string>,
  deDayPass: ReadonlySet<string>,
  plan: PlanConversaciones,
): UsoDelPlan {
  let total = 0;
  let totalDayPass = 0;
  for (const id of new Set(conversaciones)) {
    total++;
    if (deDayPass.has(id)) totalDayPass++;
  }
  const dayPassAlGeneral = Math.max(0, totalDayPass - plan.dayPass);
  const generales = total - totalDayPass;
  return {
    dayPass: contador(Math.min(totalDayPass, plan.dayPass), plan.dayPass),
    general: contador(generales + dayPassAlGeneral, plan.generales),
    dayPassAlGeneral,
    total,
    totalDayPass,
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
