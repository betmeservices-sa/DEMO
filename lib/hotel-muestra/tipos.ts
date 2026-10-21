// Un hotel de MUESTRA: el panel de Porta Stays (que salió del de Yali) con
// datos inventados, para enseñarle el producto a un hotel que todavía no es
// cliente. Nada de esto lee Cloudbeds, Supabase ni Meta: la ocupación, las
// reservas, los apartados, los tickets y las cifras del agente se arman en el
// navegador a partir de la fecha de hoy, y lo que se mueve en el demo se guarda
// en localStorage con la llave de ESE panel.
//
// Un hotel nuevo es un archivo de datos (ver nawi.ts): sus zonas, sus
// habitaciones con tarifa, su gente y sus casos. Las pantallas son las mismas.

import type { TipoTicket, EstadoTicket, OrigenTicket, PrioridadTicket } from "@/lib/tickets";
import type { TenantId } from "@/lib/tenants/types";

export interface HabitacionMuestra {
  id: string;
  nombre: string;
  /** Cuántas hay de este tipo. */
  unidades: number;
  /** Tarifa de muestra por noche, entre semana. El fin de semana sube. */
  tarifaNoche: number;
  /** Personas que caben. */
  capacidad: number;
}

/** Lo que en Porta era "Location A/B/C": una parte del hotel con su ocupación. */
export interface ZonaMuestra {
  id: string;
  nombre: string;
  ubicacion: string;
  habitaciones: HabitacionMuestra[];
}

export interface CanalPeso {
  canal: string;
  peso: number;
}

/** Una reserva del libro: la de la muestra, la que entra a mano o un apartado confirmado. */
export interface ReservaMuestra {
  id: string;
  zonaId: string;
  habitacionId: string;
  huesped: string;
  /** Primera noche, YYYY-MM-DD. */
  desde: string;
  /** Día de salida, YYYY-MM-DD (esa noche ya no cuenta). */
  hasta: string;
  huespedes: number;
  total: number;
  canal: string;
  /** "agente" = la cerró el agente por chat. */
  origen: "muestra" | "agente" | "manual";
}

export type EstadoApartado = "esperando_pago" | "comprobante";

/** Lo que el agente dejó apartado por una hora y espera que alguien confirme. */
export interface ApartadoSemilla {
  id: string;
  huesped: string;
  zonaId: string;
  habitacionId: string;
  /** Noches desde hoy hasta la llegada. */
  llegaEnDias: number;
  noches: number;
  personas: number;
  estado: EstadoApartado;
  /** Minutos que le quedan a la hora del apartado. */
  quedanMin: number;
  canal: "WhatsApp" | "Instagram" | "Messenger";
  nota?: string;
  /** La conversación de la bandeja de donde salió ("Ver chat"). */
  conversacionId?: string;
}

export type EstadoCerrada = "confirmada" | "rechazada";

export interface CerradaSemilla {
  id: string;
  huesped: string;
  zonaId: string;
  habitacionId: string;
  llegaEnDias: number;
  noches: number;
  personas: number;
  estado: EstadoCerrada;
  /** Quién la confirmó (persona de reservas). */
  porQuien?: string;
  nota?: string;
}

/**
 * Las columnas de "Reservas en pausa" que se siembran. "Esperando el pago" no
 * va acá: sale de los apartados que siguen abiertos.
 */
export type GrupoPausa = "se_cayo";

export interface PausaSemilla {
  huesped: string;
  grupo: GrupoPausa;
  /** El monto sale de su tarifa, igual que en el resto del tablero. */
  habitacionId: string;
  llegaEnDias: number;
  noches: number;
  /** Hace cuántos días quedó así. 0 = hoy. */
  haceDias: number;
}

export interface TicketSemilla {
  numero: number;
  titulo: string;
  detalle: string;
  tipo: TipoTicket;
  estado: EstadoTicket;
  prioridad: PrioridadTicket;
  origen: OrigenTicket;
  contactoNombre: string;
  area: string;
  asignadoA?: string;
  conversacionId?: string;
  /** Hace cuántos minutos entró. */
  haceMin: number;
  /** Minutos que tardaron en tomarlo (si ya lo tomaron). */
  tomadoEn?: number;
  /** Minutos que tardaron en cerrarlo desde que lo tomaron (si ya se cerró). */
  resueltoEn?: number;
  notas?: { autor: string; texto: string; haceMin: number }[];
}

/** Un tema de "Qué nos piden" con su peso en las conversaciones. */
export interface TemaPedido {
  tema: string;
  /** Proporción de las conversaciones que lo tocan (0 a 1). */
  peso: number;
}

export interface HotelMuestra {
  tenant: TenantId;
  /** Como se llama el agente en el panel ("la cerró Camila"). */
  agente: string;
  /** Quien confirma en Reservas (sale en "Últimas cerradas"). */
  confirmaReservas: string;
  /** Prefijo de los números de reserva ("NW-1W7XWB"). */
  prefijoReserva: string;
  /** Prefijo de los apartados ("AP-2041"). */
  prefijoApartado: string;
  /** Subtítulo de la vista general ("Las tres zonas: ocupación, llegadas y reservas"). */
  resumenGeneral: string;
  zonas: ZonaMuestra[];
  canales: CanalPeso[];
  /** Ocupación base entre semana y en fin de semana (0 a 1). */
  ocupacion: { semana: number; finde: number };
  nombres: string[];
  apellidos: string[];
  apartados: ApartadoSemilla[];
  cerradas: CerradaSemilla[];
  pausa: PausaSemilla[];
  tickets: TicketSemilla[];
  temas: TemaPedido[];
  /** Conversaciones nuevas en un día normal (para IA Performance). */
  conversacionesDia: number;
}

// ── Lo que se hace en el demo y queda guardado en el navegador ──

export type Movimiento =
  | { id: string; ts: string; tipo: "apartado.confirmar"; apartadoId: string; actor: string }
  | { id: string; ts: string; tipo: "apartado.rechazar"; apartadoId: string; actor: string }
  | { id: string; ts: string; tipo: "reserva.nueva"; reserva: ReservaMuestra; actor: string }
  | { id: string; ts: string; tipo: "ticket.nuevo"; ticket: TicketNuevoMuestra; actor: string }
  | { id: string; ts: string; tipo: "ticket.asignar"; ticketId: string; staffId: string; actor: string }
  | { id: string; ts: string; tipo: "ticket.estado"; ticketId: string; estado: EstadoTicket; actor: string }
  | { id: string; ts: string; tipo: "ticket.nota"; ticketId: string; texto: string; actor: string };

export interface TicketNuevoMuestra {
  titulo: string;
  detalle: string;
  tipo: TipoTicket;
  prioridad: PrioridadTicket;
  origen: OrigenTicket;
  creadoPor: string;
  contactoNombre: string;
  contactoTelefono?: string;
  area: string;
  asignadoA?: string;
  conversacionId?: string;
}
