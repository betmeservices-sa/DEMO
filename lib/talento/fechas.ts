// Fechas del modulo de reclutamiento, SIEMPRE en hora de El Salvador.
//
// El Salvador es UTC-6 todo el ano (no cambia de horario), asi que la hora
// local sale de restar seis horas. Se hace a mano y no con la zona del
// navegador: quien abre el demo desde otro pais tiene que ver la misma agenda.

const OFFSET_MS = 6 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

/** "AAAA-MM-DD" del dia en El Salvador para un instante. */
export function diaSv(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  return new Date(t - OFFSET_MS).toISOString().slice(0, 10);
}

/** Instante (ISO UTC) de una fecha y hora de El Salvador. */
export function isoDesdeSv(dia: string, hora: number, minuto = 0): string {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d, hora, minuto) + OFFSET_MS).toISOString();
}

/** Hora de El Salvador como "9:30 am". */
export function horaSv(iso: string): string {
  const x = new Date(new Date(iso).getTime() - OFFSET_MS);
  const h = x.getUTCHours();
  const m = x.getUTCMinutes();
  const sufijo = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${sufijo}`;
}

/** Minutos desde medianoche en El Salvador. */
export function minutosSv(iso: string): number {
  const x = new Date(new Date(iso).getTime() - OFFSET_MS);
  return x.getUTCHours() * 60 + x.getUTCMinutes();
}

export function sumarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d) + n * DIA_MS).toISOString().slice(0, 10);
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / DIA_MS);
}

/** Lunes de la semana del dia dado. */
export function lunesDe(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay(); // 0 domingo
  return sumarDias(dia, dow === 0 ? -6 : 1 - dow);
}

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "lun 22 sep" */
export function fechaCortaSv(diaOIso: string): string {
  const dia = diaOIso.length === 10 ? diaOIso : diaSv(diaOIso);
  const [a, m, d] = dia.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `${DIAS[dow]} ${d} ${MESES[m - 1]}`;
}

/** "hace 3 días", "hoy" */
export function haceSv(iso: string, ahora: Date = new Date()): string {
  const d = diasEntre(diaSv(iso) + "T00:00:00Z", diaSv(ahora) + "T00:00:00Z");
  if (d <= 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 30) return `hace ${d} días`;
  const meses = Math.round(d / 30);
  return meses === 1 ? "hace 1 mes" : `hace ${meses} meses`;
}

/** Corre un ISO n dias (conserva la hora). */
export function correrIso(iso: string, dias: number): string {
  return new Date(new Date(iso).getTime() + dias * DIA_MS).toISOString();
}
