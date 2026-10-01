// El plan de conversaciones de un cliente en su ciclo de facturación.
//
// LO QUE SE ACORDÓ CON YALI (versión del 2026-10-01): PAQUETES.
//
//   - El plan del mes es el PRIMER paquete: 1.000 conversaciones sin Day Pass
//     y 500 de Day Pass. Cada paquete adicional trae lo mismo.
//   - Cuando se acaba una de las dos (casi siempre las normales), se abre el
//     paquete siguiente: esa vuelve a contar desde cero sobre lo del paquete
//     nuevo, y la otra suma lo que le quedaba sin usar más lo del paquete
//     nuevo. Ej.: se acaban las 1.000 normales con 54 de Day Pass sin usar; el
//     paquete 2 trae 1.000 normales y 54 + 500 = 554 de Day Pass.
//   - Arriba se muestran los paquetes consumidos (el plan cuenta como uno).
//
// Septiembre de 2026, con datos reales: 2.131 normales y 833 de Day Pass. El
// plan se acabó el 20 a las 6:44 a. m. y el paquete 2 el 29 a las 6:09 p. m.,
// los dos por las normales: 2 paquetes consumidos y el mes cerró en el 3.
//
// Un tipo nunca gasta del otro: una conversación de Day Pass no descuenta de
// las normales, ni al revés.
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
  /** Lo que el plan incluye por ciclo: el paquete 1. */
  incluidas: Cupos;
  /** Lo que trae cada paquete adicional. */
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

export interface Conversacion {
  /** El chat (teléfono o "<canal>:<persona>"). */
  chat: string;
  /** Cuándo arrancó la sesión: la primera respuesta del agente (ISO). */
  inicio: string;
}

export type TipoDeConversacion = keyof Cupos;

/** Un tipo de conversación en el paquete que corre. */
export interface Bolsa {
  /** Las que van en este paquete. */
  usadas: number;
  /** Las que trae este paquete: lo suyo más lo que quedó del anterior. */
  disponibles: number;
  /** Lo que quedó sin usar del paquete anterior y se sumó a este. */
  arrastre: number;
}

/** Un paquete que ya se acabó. */
export interface PaqueteConsumido {
  /** 1 = el plan del mes. */
  numero: number;
  /** El tipo que se acabó y abrió el paquete siguiente. */
  porque: TipoDeConversacion;
  /** Cuándo arrancó la última conversación de ese tipo que entró en el paquete (ISO). */
  llenoEl: string;
}

export interface UsoDelPlan {
  /** Todas las conversaciones del ciclo, con Day Pass. */
  total: number;
  /** Todas las del ciclo sin Day Pass. */
  generales: number;
  /** Todas las del ciclo de Day Pass. */
  dayPass: number;
  /** El paquete que corre: 1 = el plan del mes. */
  paquete: number;
  /** Los que ya se acabaron, en orden. */
  consumidos: PaqueteConsumido[];
  /** Cómo va el paquete que corre. */
  actual: Record<TipoDeConversacion, Bolsa>;
}

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
 * Cuenta el ciclo por paquetes, conversación por conversación y en orden de
 * inicio (así sale `conversacionesQueArrancanEn`).
 *
 * La conversación que ya no cabe abre el paquete siguiente y cuenta en él: el
 * paquete se llenó con la anterior de su tipo, no con ella. Si el paquete
 * adicional no trae de ese tipo, no hay a dónde pasar y queda de más en el que
 * corre (`usadas` mayor que `disponibles`).
 *
 * `chatsDayPass` puede traer chats de otros ciclos: solo cuentan los que
 * además tienen conversaciones en este.
 */
export function usoDelPlan(
  conversaciones: readonly Conversacion[],
  chatsDayPass: ReadonlySet<string>,
  p: PlanConversaciones,
): UsoDelPlan {
  const totales = { generales: 0, dayPass: 0 };
  const disponibles = { ...p.incluidas };
  const arrastre = { generales: 0, dayPass: 0 };
  let usadas = { generales: 0, dayPass: 0 };
  const ultima: Record<TipoDeConversacion, string | null> = { generales: null, dayPass: null };
  const consumidos: PaqueteConsumido[] = [];
  let paquete = 1;

  for (const c of conversaciones) {
    const tipo: TipoDeConversacion = chatsDayPass.has(c.chat) ? "dayPass" : "generales";
    const otro: TipoDeConversacion = tipo === "generales" ? "dayPass" : "generales";
    totales[tipo]++;
    if (usadas[tipo] >= disponibles[tipo] && p.adicional[tipo] > 0) {
      consumidos.push({ numero: paquete, porque: tipo, llenoEl: ultima[tipo] ?? c.inicio });
      paquete++;
      arrastre[otro] = Math.max(0, disponibles[otro] - usadas[otro]);
      arrastre[tipo] = 0;
      disponibles[otro] = arrastre[otro] + p.adicional[otro];
      disponibles[tipo] = p.adicional[tipo];
      usadas = { generales: 0, dayPass: 0 };
    }
    usadas[tipo]++;
    ultima[tipo] = c.inicio;
  }

  const bolsa = (t: TipoDeConversacion): Bolsa => ({ usadas: usadas[t], disponibles: disponibles[t], arrastre: arrastre[t] });
  return {
    total: conversaciones.length,
    generales: totales.generales,
    dayPass: totales.dayPass,
    paquete,
    consumidos,
    actual: { generales: bolsa("generales"), dayPass: bolsa("dayPass") },
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
