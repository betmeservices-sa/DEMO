// Horas del motor de contenido.
//
// El calendario se lee en hora de El Salvador, que es donde trabaja el equipo:
// "YYYY-MM-DDTHH:mm" sin zona, siempre de aquí (UTC-6 todo el año, sin horario
// de verano). Las marcas viven en otra ciudad (Miami, Fort Lauderdale), así
// que al lado se muestra la hora en la que su público ve el post.

export const ZONA_EQUIPO = "America/El_Salvador";
const DESFASE_SV_MIN = -6 * 60;

const pad = (n: number) => String(n).padStart(2, "0");

/** Fecha y hora de El Salvador de un instante, como "YYYY-MM-DDTHH:mm". */
export function localSV(instante: number = Date.now()): string {
  const d = new Date(instante + DESFASE_SV_MIN * 60_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** El instante de una hora de El Salvador. */
export function instanteDe(local: string): number {
  const [f, h = "00:00"] = local.split("T");
  const [y, m, d] = f.split("-").map(Number);
  const [hh, mm] = h.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) - DESFASE_SV_MIN * 60_000;
}

export function diaDe(local: string): string {
  return local.slice(0, 10);
}

export function horaDe(local: string): string {
  return local.slice(11, 16);
}

/** Suma días a una fecha "YYYY-MM-DD". */
export function sumarDias(dia: string, n: number): string {
  const [y, m, d] = dia.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** 0 = lunes ... 6 = domingo. */
export function diaSemana(dia: string): number {
  const [y, m, d] = dia.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** El lunes de la semana de esa fecha. */
export function lunesDe(dia: string): string {
  return sumarDias(dia, -diaSemana(dia));
}

const fmtHora = new Intl.DateTimeFormat("es-SV", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });

/** "9:00 a. m." de una hora de El Salvador. */
export function horaCorta(local: string): string {
  const [hh, mm] = horaDe(local).split(":").map(Number);
  return fmtHora.format(new Date(Date.UTC(2026, 0, 1, hh, mm)));
}

/** La hora de esa misma publicación en la ciudad de la marca. */
export function horaEnZona(local: string, zona: string): string {
  return new Intl.DateTimeFormat("es-SV", { hour: "numeric", minute: "2-digit", timeZone: zona }).format(
    new Date(instanteDe(local)),
  );
}

const DIAS_CORTOS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function nombreDia(dia: string, largo = false): string {
  return (largo ? DIAS_LARGOS : DIAS_CORTOS)[diaSemana(dia)];
}

/** "mar 21 oct" */
export function fechaCorta(dia: string): string {
  const [, m, d] = dia.split("-").map(Number);
  return `${nombreDia(dia)} ${d} ${MESES[m - 1]}`;
}

/** "octubre 2026" */
export function mesLargo(dia: string): string {
  const [y, m] = dia.split("-").map(Number);
  return `${MESES_LARGOS[m - 1]} ${y}`;
}

export function numeroDia(dia: string): number {
  return Number(dia.slice(8, 10));
}

/** "hace 3 min", "hace 2 h", "ayer" para el historial. */
export function haceCuanto(iso: string, ahora: number = Date.now()): string {
  const min = Math.max(0, Math.round((ahora - Date.parse(iso)) / 60_000));
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}
