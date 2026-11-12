// Casos (tickets) que abren las Valerias de voz de CEGISA desde una llamada.
//
// POR QUÉ EXISTE. En las evaluaciones del 2026-11-09 (30 llamadas de prueba del
// personal del hospital) Valeria "no creó ticket cuando correspondía" en 17 de
// 23 llamadas. No era que se le olvidara: la voz no tenía con qué abrirlo. El
// guion decía "toma nota" y ahí se quedaba; la compañera del laboratorio nunca
// se enteraba. El WhatsApp del lab sí abre casos (crear_ticket en lib/ai.ts);
// esto es lo mismo para la llamada, con el mismo tablero y la misma dueña.
//
// La herramienta `crear_ticket` de Vapi llama a /api/webhooks/vapi/ticket con
// `?panel=laboratorio` (Valeria del Laboratorio, tenant consultorio) o
// `?panel=imagenologia` (Valeria de Ultrasonografía, panel de Imagenología).
// Los dos tableros leen public.tickets del Supabase de demos.

import { telefonoClave } from "./llamada-contexto";
import type { TicketNuevo, TipoTicket } from "./tickets";
import { RESPONSABLE_LAB } from "./tickets-tenant";

export const NOMBRE_TOOL_TICKET_VOZ = "crear_ticket";

export type PanelVoz = "laboratorio" | "imagenologia";

interface DestinoVoz {
  tenant: string;
  area: string;
  asignadoA?: string;
  /** Cómo se nombra al área en la frase de cierre. */
  quien: string;
}

export const DESTINOS_VOZ: Record<PanelVoz, DestinoVoz> = {
  // Igual que el WhatsApp del lab: área "laboratorio" (el id, no la etiqueta)
  // y a nombre de Verónica, la encargada.
  laboratorio: { tenant: "consultorio", area: "laboratorio", asignadoA: RESPONSABLE_LAB, quien: "Una compañera del laboratorio" },
  // Panel de Imagenología: entra a "Recepción de Ultras", su área por defecto.
  imagenologia: { tenant: "imagenologia", area: "recepcion", quien: "Una compañera de Ultrasonografía" },
};

export function esPanelVoz(v: unknown): v is PanelVoz {
  return typeof v === "string" && v in DESTINOS_VOZ;
}

const TIPOS_VOZ: readonly TipoTicket[] = ["resultados", "cotizacion", "facturacion", "informacion", "queja", "cita", "otro"];

function tipoValido(v: unknown): TipoTicket {
  return typeof v === "string" && (TIPOS_VOZ as readonly string[]).includes(v) ? (v as TipoTicket) : "otro";
}

function texto(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/** La hora de El Salvador como la escribe una persona: "12/11 10:32 a. m.". */
export function horaSV(ahora: Date): string {
  return new Intl.DateTimeFormat("es-SV", {
    timeZone: "America/El_Salvador",
    day: "2-digit",
    month: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(ahora);
}

export interface ArgsTicketVoz {
  tipo?: unknown;
  titulo?: unknown;
  detalle?: unknown;
  nombre?: unknown;
  /** Si la persona pidió que la contacten a otro número que el de la llamada. */
  telefono?: unknown;
}

/**
 * El teléfono del caso: el que la persona dictó si dio otro, y si no, el de la
 * llamada. Mismo formato que el `from` de WhatsApp (solo dígitos, con 503),
 * para que el tablero y la bandeja hablen del mismo número.
 */
export function telefonoDelCaso(dictado: unknown, deLaLlamada: unknown): string | undefined {
  return telefonoClave(dictado) ?? telefonoClave(deLaLlamada) ?? undefined;
}

/** El ticket que se abre con lo que mandó la herramienta. Puro. */
export function ticketDeLlamada(
  args: ArgsTicketVoz,
  destino: DestinoVoz,
  numeroLlamada: unknown,
  ahora: Date = new Date(),
): TicketNuevo {
  const telefono = telefonoDelCaso(args.telefono, numeroLlamada);
  const detalle = texto(args.detalle);
  // Quien atiende el caso ve cuándo y desde qué número llamaron, aunque la
  // persona haya pedido que la contacten a otro.
  const marca = `(Llamada a Valeria, ${horaSV(ahora)}, desde ${telefonoClave(numeroLlamada) ?? "un número oculto"}.)`;
  return {
    titulo: texto(args.titulo) || "Caso de una llamada",
    detalle: detalle ? `${detalle} ${marca}` : marca,
    tipo: tipoValido(args.tipo),
    origen: "llamada",
    creadoPor: "Valeria (llamada)",
    contactoNombre: texto(args.nombre) || "Sin nombre",
    contactoTelefono: telefono,
    area: destino.area,
    asignadoA: destino.asignadoA,
  };
}

/**
 * La frase con la que Valeria cierra. Por teléfono no se dice "le escribe por
 * aquí": se dice que la contactan a ese número. Sin minutos, igual que el
 * WhatsApp; fuera del horario de la sucursal (lunes a sábado de 6:00 a.m. a
 * 6:00 p.m., domingo hasta las 12:00 m.) se dice desde cuándo.
 */
export function cierreDeCasoVoz(destino: DestinoVoz, ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/El_Salvador",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(ahora);
  const dia = partes.find((p) => p.type === "weekday")?.value;
  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? 0);
  const cierra = dia === "Sun" ? 12 : 18;
  if (hora >= 6 && hora < cierra) return `${destino.quien} le contacta a ese número lo antes posible.`;
  if (hora < 6) return `${destino.quien} le contacta a ese número a partir de las seis de la mañana.`;
  return `${destino.quien} le contacta a ese número mañana a partir de las seis de la mañana.`;
}

/** Minutos en los que un segundo llamado del mismo número y tipo es el MISMO asunto. */
export const MINUTOS_MISMO_ASUNTO = 20;
