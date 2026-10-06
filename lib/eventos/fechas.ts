// Fechas del tablero de eventos, siempre en hora de El Salvador.
//
// El Salvador está en UTC-6 todo el año (no cambia de horario), así que el día
// y la hora local salen restando seis horas, sin depender de la zona de la
// máquina: el servidor de producción corre en UTC y el navegador puede estar en
// cualquier lado, y los dos tienen que decir el mismo "hoy".

export const ZONA_SV = "America/El_Salvador";
const DESFASE_MS = 6 * 3_600_000;
const DIA_MS = 86_400_000;

function aMs(x: Date | string | number): number {
  return typeof x === "number" ? x : new Date(x).getTime();
}

/** "YYYY-MM-DD" del día en El Salvador. */
export function diaSV(x: Date | string | number = Date.now()): string {
  return new Date(aMs(x) - DESFASE_MS).toISOString().slice(0, 10);
}

/** Hora local (0 a 23) en El Salvador. */
export function horaSV(x: Date | string | number): number {
  return new Date(aMs(x) - DESFASE_MS).getUTCHours();
}

/** Día de la semana en El Salvador (0 domingo a 6 sábado). */
export function diaSemanaSV(x: Date | string | number): number {
  return new Date(aMs(x) - DESFASE_MS).getUTCDay();
}

/** Día de la semana de una fecha "YYYY-MM-DD". */
export function diaSemanaDeFecha(ymd: string): number {
  return new Date(`${ymd}T12:00:00Z`).getUTCDay();
}

export function sumarDias(ymd: string, n: number): string {
  const t = Date.parse(`${ymd}T12:00:00Z`) + n * DIA_MS;
  return new Date(t).toISOString().slice(0, 10);
}

/** Días de `a` a `b` (b - a), en fechas "YYYY-MM-DD". */
export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DIA_MS);
}

/** El instante (ISO) de una hora local de El Salvador. */
export function isoDeSV(ymd: string, hora: number, minuto = 0): string {
  const base = Date.parse(`${ymd}T00:00:00Z`) + DESFASE_MS;
  return new Date(base + hora * 3_600_000 + minuto * 60_000).toISOString();
}

export function esFechaValida(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

const FMT_FECHA = new Intl.DateTimeFormat("es-SV", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});
const FMT_FECHA_LARGA = new Intl.DateTimeFormat("es-SV", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const FMT_HORA = new Intl.DateTimeFormat("es-SV", {
  timeZone: ZONA_SV,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const FMT_DIA_HORA = new Intl.DateTimeFormat("es-SV", {
  timeZone: ZONA_SV,
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const FMT_MES = new Intl.DateTimeFormat("es-SV", { timeZone: "UTC", month: "long", year: "numeric" });

/** "sáb 14 nov" de una fecha "YYYY-MM-DD". */
export function fechaCorta(ymd: string): string {
  if (!esFechaValida(ymd)) return "";
  return FMT_FECHA.format(new Date(`${ymd}T12:00:00Z`)).replace(/\./g, "");
}

export function fechaLarga(ymd: string): string {
  if (!esFechaValida(ymd)) return "";
  return FMT_FECHA_LARGA.format(new Date(`${ymd}T12:00:00Z`));
}

/** "3:40 p. m." en hora de El Salvador. */
export function horaCorta(iso: string): string {
  return FMT_HORA.format(new Date(iso));
}

/** "14 nov, 3:40 p. m." en hora de El Salvador. */
export function diaHora(iso: string): string {
  return FMT_DIA_HORA.format(new Date(iso));
}

/** "Noviembre de 2026" del mes de una fecha. */
export function nombreMes(ymd: string): string {
  const s = FMT_MES.format(new Date(`${ymd.slice(0, 7)}-15T12:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "hace 3 h", "hace 2 días": para la actividad reciente. */
export function haceCuanto(iso: string, ahora = Date.now()): string {
  const min = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

/** "3:05" de una duración en segundos. */
export function duracion(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
