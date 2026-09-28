// Lo que el tablero de la agencia cuenta de un cliente en el periodo elegido:
// las reservas (por quién las creó y cómo terminaron) y los tickets.
//
// Antes estos bloques leían siempre los últimos 30 días y no se movían con el
// filtro de arriba: con "Hoy" el consumo cambiaba y la plata seguía igual.
//
// Puro, sin base ni reloj: el periodo llega ya cortado en hora de El Salvador
// (lib/periodos) y acá solo se filtra y se cuenta.

import type { Periodo } from "./periodos";

/** Los filtros del tablero de la agencia, en el orden en que se muestran. */
export const PERIODOS_AGENCIA: readonly Periodo[] = ["hoy", "ayer", "7d", "30d", "rango"];

/**
 * ¿`ts` cae en [desde, hasta)? Se compara la fecha y no el texto: la base
 * devuelve "+00:00" y el periodo viene con "Z", y como texto no ordenan igual.
 */
export function enRango(ts: string | null | undefined, desde: string, hasta: string): boolean {
  if (!ts) return false;
  const t = Date.parse(ts);
  return !Number.isNaN(t) && t >= Date.parse(desde) && t < Date.parse(hasta);
}

export interface Monto {
  n: number;
  total: number;
}

/**
 * Quién creó la reserva. No hay columna que lo diga: se deduce de las huellas
 * que deja cada camino (ver el análisis del 2026-09-28):
 *   - "prueba": el chat de prueba de Sofía (clave "prueba:...") o motivo
 *     "Prueba" / "reset de la prueba". Nunca se cuenta.
 *   - "manual": el formulario del panel (clave "manual:..." o nota "Reserva
 *     tomada a mano por ...").
 *   - "sofia": solo apartar_estadia escribe `vence` (la hora de apartado).
 *   - "detectada": la detección que lee los chats que atendió el equipo
 *     (nota "Detectada del chat ...", sin `vence`).
 *   - "otro": filas viejas sin ninguna huella.
 */
export type OrigenReserva = "sofia" | "detectada" | "manual" | "prueba" | "otro";

interface ReservaParaContar {
  estado: string;
  total?: number | null;
  creada: string;
  clave?: string | null;
  notas?: string | null;
  vence?: string | null;
  motivoRechazo?: string | null;
  /** Las fechas de la estadía: con la clave, dicen si dos filas son la misma. */
  desde?: string | null;
  hasta?: string | null;
}

export function origenDeReserva(r: ReservaParaContar): OrigenReserva {
  const clave = r.clave ?? "";
  const notas = r.notas ?? "";
  if (clave.startsWith("prueba:") || /^(prueba|reset de la prueba)$/i.test((r.motivoRechazo ?? "").trim())) return "prueba";
  if (clave.startsWith("manual:") || notas.includes("Reserva tomada a mano por")) return "manual";
  if (r.vence) return "sofia";
  if (notas.startsWith("Detectada del chat")) return "detectada";
  return "otro";
}

/**
 * Cuánto dura un apartado sin pagar (APARTADO_MINUTOS de yali-prereservas).
 * Las filas de Sofía traen su `vence`; las que no, se miden desde que se
 * crearon con la misma hora.
 */
const APARTADO_MS = 60 * 60_000;

/** Los motivos que el equipo escribe cuando el huésped no pagó o no siguió. */
const NO_PAGO = /no pag|no confirm|no contest|no respond|no quiso pagar/i;
/** La estadía sí se hizo, pero por otro camino (no es plata perdida). */
const OTRA_VIA =
  /ingres[oó] (a |de (manera|forma) )?manual|cloudbeds directamente|pag[oó] en (el )?hotel|vendi[oó] en (el )?hotel/i;
/** Sofía volvió a apartar en el mismo chat: el huésped no se perdió. */
const REEMPLAZADA = /reemplazada por un apartado nuevo/i;
/** Rechazada sin escribir motivo: el panel guarda "rechazada por <nombre>". */
const SIN_MOTIVO = /^\s*(rechazada por\b|$)/i;

type Cierre = "confirmada" | "porVerificar" | "pendiente" | "otraVia" | "noPago" | "otra" | "sinMotivo" | "reemplazada";

function comoTermino(r: ReservaParaContar): Cierre {
  if (r.estado === "confirmada") return "confirmada";
  if (r.estado === "comprobante_recibido") return "porVerificar";
  if (r.estado === "pendiente_pago") return "pendiente";
  const m = r.motivoRechazo ?? "";
  if (REEMPLAZADA.test(m)) return "reemplazada";
  if (OTRA_VIA.test(m)) return "otraVia";
  if (NO_PAGO.test(m)) return "noPago";
  if (SIN_MOTIVO.test(m)) return "sinMotivo";
  return "otra";
}

/** Qué fila manda cuando hay varias de la misma estadía: la que llegó más lejos. */
const PESO: Record<Cierre, number> = {
  confirmada: 7,
  porVerificar: 6,
  pendiente: 5,
  otraVia: 4,
  noPago: 3,
  otra: 2,
  sinMotivo: 1,
  reemplazada: 0,
};

/**
 * Una fila por estadía (mismo chat, mismas fechas), la que llegó más lejos.
 *
 * Existe porque la detección vuelve a crear la tarjeta de una estadía que el
 * equipo ya rechazó: el 19 de septiembre Sofía apartó una, Verónica puso "No
 * pagó", y el barrido de las 6 p.m. y el de la mañana siguiente la crearon de
 * nuevo; el tablero la contaba tres veces. Sin clave o sin fechas no se puede
 * saber si es la misma, y la fila cuenta sola.
 */
export function unaPorEstadia<T extends ReservaParaContar>(reservas: readonly T[]): T[] {
  const por = new Map<string, T>();
  const sueltas: T[] = [];
  for (const r of reservas) {
    if (!r.clave || !r.desde || !r.hasta) {
      sueltas.push(r);
      continue;
    }
    const k = `${r.clave}|${r.desde}|${r.hasta}`;
    const antes = por.get(k);
    if (!antes || PESO[comoTermino(r)] > PESO[comoTermino(antes)]) por.set(k, r);
  }
  return [...por.values(), ...sueltas];
}

export interface ReservasDelPeriodo {
  /** Pagadas y confirmadas, con quién las creó. */
  confirmadas: Monto & { porOrigen: { sofia: number; detectada: number; manual: number; otro: number } };
  /** Siguen abiertas: el apartado está en su hora, o pagó y falta verificar. */
  abiertas: Monto & { enSuHora: number; porVerificar: number };
  /** No pagaron: se les venció la hora de apartado. */
  vencidas: Monto & {
    /** Nadie las cerró: siguen "esperando pago" en la base, pero su hora ya pasó. */
    sinCerrar: number;
    /** El equipo las cerró como "no pagó", "no contestó", "no confirmó"... */
    cerradas: number;
  };
  /** Cerradas por el equipo porque la estadía entró por otro camino. */
  otraVia: number;
  /** Cerradas por el equipo por otro motivo o sin motivo escrito. */
  rechazadas: number;
  /** De las rechazadas, cuántas sin motivo escrito. */
  sinMotivo: number;
  /** Sofía las reemplazó por un apartado nuevo en el mismo chat. No cuentan. */
  reemplazadas: number;
}

/**
 * Las reservas creadas en el periodo, por cómo terminaron. Una estadía cuenta
 * UNA vez (ver unaPorEstadia), por el día en que se creó y con el estado que
 * tiene hoy. Las de prueba no cuentan en nada.
 *
 * "Vencida" se calcula al leer: nada en el sistema vence un apartado solo (se
 * queda en pendiente_pago hasta que alguien lo cierra), así que un
 * pendiente_pago cuya hora ya pasó se cuenta como vencido, no como abierto.
 */
export function reservasDelPeriodo(
  reservas: readonly ReservaParaContar[],
  desde: string,
  hasta: string,
  ahora: number = Date.now(),
): ReservasDelPeriodo {
  const delPeriodo = unaPorEstadia(
    reservas.filter((r) => enRango(r.creada, desde, hasta) && origenDeReserva(r) !== "prueba"),
  );
  const suma = (rs: readonly ReservaParaContar[]): Monto => ({
    n: rs.length,
    total: Math.round(rs.reduce((s, r) => s + (r.total ?? 0), 0)),
  });
  const vencio = (r: ReservaParaContar) => {
    const limite = r.vence ? Date.parse(r.vence) : Date.parse(r.creada) + APARTADO_MS;
    return Number.isFinite(limite) && limite <= ahora;
  };
  const de = (c: Cierre) => delPeriodo.filter((r) => comoTermino(r) === c);

  const confirmadas = de("confirmada");
  const pendientes = de("pendiente");
  const enSuHora = pendientes.filter((r) => !vencio(r));
  const sinCerrar = pendientes.filter(vencio);
  const porVerificar = de("porVerificar");
  const noPagaron = de("noPago");
  const sinMotivo = de("sinMotivo").length;

  const porOrigen = { sofia: 0, detectada: 0, manual: 0, otro: 0 };
  for (const r of confirmadas) {
    const o = origenDeReserva(r);
    if (o !== "prueba") porOrigen[o] += 1;
  }

  return {
    confirmadas: { ...suma(confirmadas), porOrigen },
    abiertas: { ...suma([...enSuHora, ...porVerificar]), enSuHora: enSuHora.length, porVerificar: porVerificar.length },
    vencidas: { ...suma([...sinCerrar, ...noPagaron]), sinCerrar: sinCerrar.length, cerradas: noPagaron.length },
    otraVia: de("otraVia").length,
    rechazadas: de("otra").length + sinMotivo,
    sinMotivo,
    reemplazadas: de("reemplazada").length,
  };
}

/**
 * Las confirmadas del periodo, la más reciente primero. Con el MISMO corte que
 * reservasDelPeriodo (sin pruebas, una por estadía): si no, "Quién cerró" y el
 * bloque de la plata dan números distintos para el mismo periodo.
 */
export function confirmadasDelPeriodo<T extends ReservaParaContar & { confirmadaTs?: string | null }>(
  reservas: readonly T[],
  desde: string,
  hasta: string,
): T[] {
  return unaPorEstadia(
    reservas.filter((r) => r.estado === "confirmada" && enRango(r.creada, desde, hasta) && origenDeReserva(r) !== "prueba"),
  ).sort((a, b) => (b.confirmadaTs ?? b.creada).localeCompare(a.confirmadaTs ?? a.creada));
}

export interface TicketsDelPeriodo {
  /** Abiertos en el periodo. */
  periodo: number;
  abiertos: number;
  resueltos: number;
  porSofia: number;
  medianaMinutos: number | null;
  porTipo: { tipo: string; n: number }[];
}

interface TicketParaContar {
  creado: string;
  resuelto?: string;
  estado: string;
  creadoPor: string;
  tipo: string;
}

/** Los tickets que se abrieron en el periodo y en qué quedaron. */
export function ticketsDelPeriodo(
  tickets: readonly TicketParaContar[],
  desde: string,
  hasta: string,
): TicketsDelPeriodo {
  const delPeriodo = tickets.filter((k) => enRango(k.creado, desde, hasta));
  const minutos = delPeriodo
    .filter((k) => k.resuelto)
    .map((k) => (Date.parse(k.resuelto!) - Date.parse(k.creado)) / 60000)
    .filter((m) => m >= 0)
    .sort((a, b) => a - b);
  const porTipo = new Map<string, number>();
  for (const k of delPeriodo) porTipo.set(k.tipo, (porTipo.get(k.tipo) ?? 0) + 1);

  return {
    periodo: delPeriodo.length,
    abiertos: delPeriodo.filter((k) => k.estado !== "resuelto").length,
    resueltos: delPeriodo.filter((k) => k.estado === "resuelto").length,
    // El agente se guarda con su NOMBRE ("Sofía"), no con el id "ia".
    porSofia: delPeriodo.filter((k) => /^sof[ií]a$/i.test(k.creadoPor.trim())).length,
    medianaMinutos: minutos.length ? Math.round(minutos[Math.floor((minutos.length - 1) / 2)]) : null,
    porTipo: [...porTipo.entries()].map(([tipo, n]) => ({ tipo, n })).sort((a, b) => b.n - a.n),
  };
}
