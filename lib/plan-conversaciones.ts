// El plan de conversaciones de un cliente en su ciclo de facturación.
//
// LO QUE SE ACORDÓ CON YALI (versión del 2026-10-01, tarde): PAQUETES QUE SE
// LLENAN EN ORDEN.
//
//   - El plan del mes es el PRIMER paquete: 1.000 conversaciones sin Day Pass
//     y 500 de Day Pass. Cada paquete adicional trae lo mismo.
//   - Cada paquete guarda lo suyo y se gasta en orden: una conversación usa el
//     paquete más viejo que todavía tenga lugar de su tipo. Si se abre un
//     paquete nuevo y al anterior le quedaba Day Pass, el Day Pass se sigue
//     gastando del anterior hasta llenarlo, y recién ahí del nuevo (lo pidió el
//     usuario: "se tienen que consumir del paquete anterior hasta que se
//     llenen"). Lo mismo al revés con las normales.
//   - Se abre un paquete cuando llega una conversación que no cabe en ninguno
//     de los abiertos. Arriba se muestran los paquetes consumidos: los que se
//     acabaron y obligaron a abrir otro (los abiertos menos uno).
//   - Antes (de la mañana del 1 de octubre) lo que sobraba se sumaba al paquete
//     nuevo ("54 + 500 = 554"): el total era el mismo, pero no se veía de qué
//     paquete salía cada una.
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

/** Lo de un tipo de conversación en un paquete. */
export interface Cubeta {
  /** Las que se gastaron de este paquete. */
  usadas: number;
  /** Las que trae el paquete. */
  incluidas: number;
  /** Cuándo arrancó la conversación que lo llenó (ISO); null si no se llenó. */
  llenoEl: string | null;
  /** Cuántas del otro tipo llevaba el mismo paquete en ese momento; null si no se llenó. */
  delOtroAlLlenarse: number | null;
}

export interface Paquete {
  /** 1 = el plan del mes. */
  numero: number;
  /** Cuándo arrancó la conversación que no cabía en ningún otro y lo abrió (ISO); null para el plan, que abre con el ciclo. */
  abre: string | null;
  /** El tipo que no cabía cuando se abrió; null para el plan. */
  abrioPor: TipoDeConversacion | null;
  generales: Cubeta;
  dayPass: Cubeta;
}

export interface UsoDelPlan {
  /** Todas las conversaciones del ciclo, con Day Pass. */
  total: number;
  /** Todas las del ciclo sin Day Pass. */
  generales: number;
  /** Todas las del ciclo de Day Pass. */
  dayPass: number;
  /** Los paquetes abiertos en el ciclo, en orden. El primero es el plan. */
  paquetes: Paquete[];
  /** Los que se acabaron y obligaron a abrir otro: los abiertos menos uno. */
  consumidos: number;
  /** De qué paquete sale ahora cada tipo: el más viejo que todavía tiene lugar, o el último si ya no hay. */
  enUso: Record<TipoDeConversacion, number>;
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
 * Cada conversación usa el paquete más viejo que todavía tenga lugar de su
 * tipo. La que no cabe en ninguno abre un paquete nuevo y cuenta en él. Si el
 * paquete adicional no trae de ese tipo, no hay a dónde pasar y queda de más en
 * el último (`usadas` mayor que `incluidas`).
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
  const cubeta = (incluidas: number): Cubeta => ({ usadas: 0, incluidas, llenoEl: null, delOtroAlLlenarse: null });
  const paquetes: Paquete[] = [
    { numero: 1, abre: null, abrioPor: null, generales: cubeta(p.incluidas.generales), dayPass: cubeta(p.incluidas.dayPass) },
  ];
  // El paquete más viejo con lugar, por tipo. Los paquetes se llenan en orden,
  // así que solo avanza.
  const cursor: Record<TipoDeConversacion, number> = { generales: 0, dayPass: 0 };
  const lleno = (i: number, t: TipoDeConversacion) => paquetes[i]![t].usadas >= paquetes[i]![t].incluidas;

  for (const c of conversaciones) {
    const tipo: TipoDeConversacion = chatsDayPass.has(c.chat) ? "dayPass" : "generales";
    totales[tipo]++;
    while (cursor[tipo] < paquetes.length && lleno(cursor[tipo], tipo)) cursor[tipo]++;
    if (cursor[tipo] >= paquetes.length) {
      if (p.adicional[tipo] > 0) {
        paquetes.push({
          numero: paquetes.length + 1,
          abre: c.inicio,
          abrioPor: tipo,
          generales: cubeta(p.adicional.generales),
          dayPass: cubeta(p.adicional.dayPass),
        });
      } else {
        cursor[tipo] = paquetes.length - 1;
      }
    }
    const paq = paquetes[cursor[tipo]]!;
    const cub = paq[tipo];
    cub.usadas++;
    if (cub.usadas === cub.incluidas) {
      cub.llenoEl = c.inicio;
      cub.delOtroAlLlenarse = paq[tipo === "generales" ? "dayPass" : "generales"].usadas;
    }
  }

  const enUso = (t: TipoDeConversacion): number => {
    let i = cursor[t];
    while (i < paquetes.length - 1 && lleno(i, t)) i++;
    return paquetes[i]!.numero;
  };
  return {
    total: conversaciones.length,
    generales: totales.generales,
    dayPass: totales.dayPass,
    paquetes,
    consumidos: paquetes.length - 1,
    enUso: { generales: enUso("generales"), dayPass: enUso("dayPass") },
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
