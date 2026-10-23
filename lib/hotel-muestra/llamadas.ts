// Las llamadas de la recepcionista de voz de un hotel de muestra.
//
// Dos fuentes con la misma forma: la muestra (inventada, relativa a la hora de
// cada carga) y las llamadas REALES a la línea, que el servidor trae de Vapi
// con lo que la agente anotó al colgar (`analysis.structuredData`, el contrato
// está en lib/tesoro-agente.ts). De las dos sale lo mismo en el panel: la
// llamada en Llamadas, el apartado en "Reservas por confirmar" y, si alguien
// del equipo tiene que llamar o escribir, el ticket.

import type { Ticket, TipoTicket, PrioridadTicket } from "@/lib/tickets";
import type { VapiCall } from "@/lib/vapi";
import { FORMAS_DE_PAGO, MOTIVOS, TEMAS } from "@/lib/tesoro-agente";
import type { HotelMuestra, LlamadaSemilla } from "./tipos";
import { diaSemana, diaSV, hash, sumarDias } from "./fechas";
import { habitacionDe, totalEstadia } from "./libro";

export type MotivoLlamada = (typeof MOTIVOS)[number];
export type FormaDePago = (typeof FORMAS_DE_PAGO)[number];
export type TemaLlamada = (typeof TEMAS)[number];

/** Lo que la agente anota de la llamada. Todo opcional: se anota solo lo que se dijo. */
export interface DatosLlamada {
  motivo?: MotivoLlamada;
  nombre?: string;
  telefono?: string;
  correo?: string;
  /** YYYY-MM-DD */
  fecha_llegada?: string;
  /** YYYY-MM-DD */
  fecha_salida?: string;
  noches?: number;
  adultos?: number;
  ninos?: number;
  /** Id de habitación del hotel ("deluxe-triple"). */
  habitacion?: string;
  total_estimado?: number;
  forma_pago?: FormaDePago;
  reserva_apartada?: boolean;
  requiere_asesor?: boolean;
  siguiente_paso?: string;
  mascota?: boolean;
  temas?: TemaLlamada[];
  notas?: string;
}

export interface TurnoLlamada {
  quien: "agente" | "cliente";
  texto: string;
}

export interface LlamadaHotel {
  id: string;
  origen: "real" | "muestra";
  /** ISO. Cuando contestó la agente. */
  inicio: string;
  duracionSeg: number;
  /** Como viene de la línea (+503...), o vacío si llegó oculto. */
  numero: string;
  resumen: string;
  datos: DatosLlamada;
  turnos: TurnoLlamada[];
  /** Hay audio para escuchar (solo las reales). */
  grabacion: boolean;
  /** Vapi todavía no la terminó: sin resumen ni datos por ahora. */
  enCurso: boolean;
}

export const NOMBRE_MOTIVO: Record<MotivoLlamada, string> = {
  reserva: "Reserva",
  cotizacion: "Cotización",
  consulta: "Consulta",
  day_pass: "Day Pass",
  evento: "Evento",
  huesped_en_casa: "Huésped en casa",
  cambio_o_cancelacion: "Cambio o cancelación",
  queja: "Queja",
  otro: "Otro",
};

export const NOMBRE_TEMA: Record<TemaLlamada, string> = {
  check_in_out: "Check in y check out",
  mascotas: "Mascotas",
  alimentos: "Comida de afuera",
  precios: "Precios",
  disponibilidad: "Disponibilidad",
  day_pass: "Day Pass",
  pagos: "Formas de pago",
  ubicacion: "Cómo llegar",
  restaurante: "Restaurante",
  ninos: "Niños",
  eventos: "Eventos",
  factura: "Factura",
  otro: "Otro",
};

export const NOMBRE_PAGO: Record<FormaDePago, string> = {
  transferencia: "Transferencia",
  link_de_pago: "Tarjeta por link de pago",
  no_definida: "Sin definir",
};

// ── De Vapi a la forma del panel ──

const texto = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const numero = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined);
const fecha = (v: unknown): string | undefined => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
const deLista = <T extends string>(lista: readonly T[], v: unknown): T | undefined =>
  typeof v === "string" && (lista as readonly string[]).includes(v) ? (v as T) : undefined;

/** Lo que vino en structuredData, con cada campo revisado: un dato raro se descarta, no rompe el panel. */
export function datosDeLlamada(raw: unknown): DatosLlamada {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const datos: DatosLlamada = {
    motivo: deLista(MOTIVOS, r.motivo),
    nombre: texto(r.nombre),
    telefono: texto(r.telefono)?.replace(/\D/g, "") || undefined,
    correo: texto(r.correo)?.toLowerCase(),
    fecha_llegada: fecha(r.fecha_llegada),
    fecha_salida: fecha(r.fecha_salida),
    noches: numero(r.noches),
    adultos: numero(r.adultos),
    ninos: numero(r.ninos),
    habitacion: texto(r.habitacion),
    total_estimado: numero(r.total_estimado),
    forma_pago: deLista(FORMAS_DE_PAGO, r.forma_pago),
    reserva_apartada: r.reserva_apartada === true || undefined,
    requiere_asesor: r.requiere_asesor === true || undefined,
    siguiente_paso: texto(r.siguiente_paso),
    mascota: r.mascota === true || undefined,
    temas: Array.isArray(r.temas) ? r.temas.filter((t): t is TemaLlamada => deLista(TEMAS, t) !== undefined) : undefined,
    notas: texto(r.notas),
  };
  return Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== undefined)) as DatosLlamada;
}

/** Las marcas de actuación de la voz ("[curious]") no son parte de lo que se dijo. */
function sinMarcas(t: string): string {
  return t.replace(/\[\s*[a-z ]+\s*\]\s*/gi, "").trim();
}

function turnosDe(call: VapiCall): TurnoLlamada[] {
  const mensajes = call.artifact?.messages ?? [];
  const turnos: TurnoLlamada[] = [];
  for (const m of mensajes) {
    const quien = m.role === "bot" || m.role === "assistant" ? "agente" : m.role === "user" ? "cliente" : null;
    const t = quien && typeof m.message === "string" ? sinMarcas(m.message) : "";
    if (quien && t) turnos.push({ quien, texto: t });
  }
  if (turnos.length || !call.transcript) return turnos;
  // Sin mensajes sueltos, el transcript plano: "AI: ..." / "User: ...".
  for (const linea of call.transcript.split("\n")) {
    const m = /^(AI|User|Assistant|Bot):\s*(.+)$/i.exec(linea.trim());
    if (m) turnos.push({ quien: /^user$/i.test(m[1]) ? "cliente" : "agente", texto: sinMarcas(m[2]) });
  }
  return turnos;
}

export function llamadaDeVapi(call: VapiCall): LlamadaHotel | null {
  // Una llamada borrada en Vapi queda como rastro de facturación, sin número
  // ni conversación: no es una llamada que mostrar.
  if (!call?.id || call.endedReason === "call-deleted") return null;
  const inicio = call.startedAt ?? call.createdAt;
  if (!inicio) return null;
  const fin = call.endedAt ? Date.parse(call.endedAt) : NaN;
  const duracionSeg = Number.isFinite(fin) ? Math.max(0, Math.round((fin - Date.parse(inicio)) / 1000)) : 0;
  const enCurso = !call.endedAt && call.status !== "ended";
  return {
    id: call.id,
    origen: "real",
    inicio,
    duracionSeg,
    numero: call.customer?.number ?? "",
    resumen: texto(call.analysis?.summary) ?? (enCurso ? "Llamada en curso." : "Sin resumen."),
    datos: datosDeLlamada(call.analysis?.structuredData),
    turnos: turnosDe(call),
    grabacion: Boolean(call.recordingUrl || call.artifact?.recordingUrl || call.artifact?.presignedMonoUrl),
    enCurso,
  };
}

// ── La muestra ──

/** El próximo `dia` de la semana (0 = domingo), mañana como pronto, más `semanas` semanas. */
function proximo(hoy: string, dia: number, semanas = 0): string {
  const faltan = ((dia - diaSemana(hoy) + 7) % 7) || 7;
  return sumarDias(hoy, faltan + semanas * 7);
}

export function llamadasDeMuestra(hotel: HotelMuestra, ahora: number): LlamadaHotel[] {
  const semillas: LlamadaSemilla[] = hotel.voz?.llamadas ?? [];
  const hoy = diaSV(ahora);
  return semillas.map((s) => {
    const { llegaDiaSemana, semanasDespues, ...datos } = s.datos;
    const llegada = llegaDiaSemana !== undefined ? proximo(hoy, llegaDiaSemana, semanasDespues) : undefined;
    const ref = s.datos.habitacion ? habitacionDe(hotel, s.datos.habitacion) : undefined;
    return {
      id: s.id,
      origen: "muestra",
      inicio: new Date(ahora - s.haceMin * 60_000 - s.duracionSeg * 1000).toISOString(),
      duracionSeg: s.duracionSeg,
      numero: s.numero,
      resumen: s.resumen,
      datos: {
        ...datos,
        ...(llegada && datos.noches ? { fecha_llegada: llegada, fecha_salida: sumarDias(llegada, datos.noches) } : {}),
        ...(llegada && datos.noches && ref ? { total_estimado: totalEstadia(ref.hab, llegada, datos.noches) } : {}),
      },
      turnos: s.turnos,
      grabacion: false,
      enCurso: false,
    };
  });
}

// ── Lo que una llamada deja en el panel ──

/** Cuánto aguanta apartada una habitación que se reservó por teléfono. */
export const APARTADO_TELEFONO_MIN = 24 * 60;

export function finDeLlamada(l: LlamadaHotel): number {
  return Date.parse(l.inicio) + l.duracionSeg * 1000;
}

function nochesDe(d: DatosLlamada): number | undefined {
  if (d.noches) return d.noches;
  if (d.fecha_llegada && d.fecha_salida) {
    const n = Math.round((Date.parse(d.fecha_salida) - Date.parse(d.fecha_llegada)) / 86_400_000);
    return n > 0 ? n : undefined;
  }
  return undefined;
}

export interface ApartadoDeLlamada {
  id: string;
  huesped: string;
  zonaId: string;
  zonaNombre: string;
  habitacionId: string;
  habitacionNombre: string;
  desde: string;
  hasta: string;
  noches: number;
  personas: number;
  total: number;
  quedanMin: number;
  nota: string;
  llamadaId: string;
}

/**
 * El apartado que dejó una reserva por teléfono, o null si no quedó una
 * (no eligió habitación o fechas, o ya pasaron las 24 horas del apartado).
 */
export function apartadoDeLlamada(hotel: HotelMuestra, l: LlamadaHotel, ahora: number): ApartadoDeLlamada | null {
  const d = l.datos;
  if (!d.reserva_apartada || !d.habitacion || !d.fecha_llegada) return null;
  const ref = habitacionDe(hotel, d.habitacion);
  const noches = nochesDe(d);
  if (!ref || !noches) return null;
  const quedanMin = APARTADO_TELEFONO_MIN - Math.floor((ahora - finDeLlamada(l)) / 60_000);
  if (quedanMin <= 0) return null;
  const pago =
    d.forma_pago === "link_de_pago"
      ? "Paga con tarjeta por link: un asesor le llama para enviárselo."
      : d.forma_pago === "transferencia"
        ? "Paga por transferencia: enviarle por WhatsApp los datos de la cuenta."
        : "Falta definir cómo paga.";
  return {
    id: `${hotel.prefijoApartado}-${5000 + (hash(l.id) % 4000)}`,
    huesped: d.nombre ?? "Sin nombre",
    zonaId: ref.zona.id,
    zonaNombre: ref.zona.nombre,
    habitacionId: ref.hab.id,
    habitacionNombre: ref.hab.nombre,
    desde: d.fecha_llegada,
    hasta: sumarDias(d.fecha_llegada, noches),
    noches,
    personas: Math.max(1, (d.adultos ?? 0) + (d.ninos ?? 0)),
    total: totalEstadia(ref.hab, d.fecha_llegada, noches),
    quedanMin,
    nota: [pago, d.notas].filter(Boolean).join(" "),
    llamadaId: l.id,
  };
}

/** Los tickets se arman de las llamadas de la última semana: lo viejo ya no es pendiente de nadie. */
const TICKETS_DIAS = 7;

interface ReglaTicket {
  titulo: string;
  tipo: TipoTicket;
  prioridad: PrioridadTicket;
  area: string;
}

function reglaTicket(hotel: HotelMuestra, d: DatosLlamada): ReglaTicket | null {
  const hab = d.habitacion ? habitacionDe(hotel, d.habitacion)?.hab.nombre : undefined;
  const para = hab ? `: ${hab}` : "";
  if (d.forma_pago === "link_de_pago" && (d.reserva_apartada || d.motivo === "reserva" || d.motivo === "day_pass")) {
    return { titulo: `Enviar link de pago y confirmar${para}`, tipo: "pago", prioridad: "alta", area: d.motivo === "day_pass" ? "daypass" : "reservas" };
  }
  if (d.forma_pago === "transferencia" && (d.reserva_apartada || d.motivo === "reserva" || d.motivo === "day_pass")) {
    return { titulo: `Enviar datos de transferencia por WhatsApp${para}`, tipo: "pago", prioridad: "normal", area: d.motivo === "day_pass" ? "daypass" : "reservas" };
  }
  switch (d.motivo) {
    case "evento":
      return { titulo: "Cotizar evento", tipo: "cotizacion", prioridad: "alta", area: "eventos" };
    case "huesped_en_casa":
      return { titulo: "Huésped en casa pide atención", tipo: "mantenimiento", prioridad: "alta", area: "mantenimiento" };
    case "cambio_o_cancelacion":
      return { titulo: "Cambio o cancelación de reserva", tipo: "reserva", prioridad: "normal", area: "reservas" };
    case "queja":
      return { titulo: "Queja por teléfono", tipo: "queja", prioridad: "alta", area: "gerencia" };
  }
  if (!d.requiere_asesor) return null;
  return { titulo: "Devolver la llamada", tipo: "informacion", prioridad: "normal", area: d.motivo === "day_pass" ? "daypass" : "reservas" };
}

/** El ticket que deja una llamada en la que alguien del equipo tiene que hacer algo. Sin número: lo pone la vista. */
export function ticketDeLlamada(hotel: HotelMuestra, l: LlamadaHotel, ahora: number): Omit<Ticket, "numero"> | null {
  if (l.enCurso) return null;
  const fin = finDeLlamada(l);
  if (ahora - fin > TICKETS_DIAS * 86_400_000) return null;
  const regla = reglaTicket(hotel, l.datos);
  if (!regla) return null;
  const d = l.datos;
  const detalle = [l.resumen, d.siguiente_paso ? `Siguiente paso: ${d.siguiente_paso}` : ""].filter(Boolean).join(" ");
  return {
    id: `${hotel.tenant}-ll-${l.id}`,
    tenant: hotel.tenant,
    titulo: regla.titulo,
    detalle,
    tipo: regla.tipo,
    estado: "abierto",
    prioridad: regla.prioridad,
    origen: "llamada",
    creadoPor: hotel.agente,
    contactoNombre: d.nombre ?? "Sin nombre",
    contactoTelefono: d.telefono ?? (l.numero.replace(/\D/g, "").slice(-8) || undefined),
    area: regla.area,
    creado: new Date(fin).toISOString(),
    notas: [],
  };
}

/** Las de la muestra y las reales juntas, lo más nuevo primero. */
export function todasLasLlamadas(hotel: HotelMuestra, reales: LlamadaHotel[], ahora: number): LlamadaHotel[] {
  return [...reales, ...llamadasDeMuestra(hotel, ahora)].sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio));
}
