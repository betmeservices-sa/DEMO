// Fechas y azar repetible para la muestra.
//
// Las fechas son SIEMPRE de El Salvador (UTC-6, sin horario de verano): un
// hotel en Mizata no cambia de día a las 6 de la tarde porque el servidor esté
// en UTC. Y el azar es un hash, no Math.random: la misma fecha arma el mismo
// libro en cada recarga y en cada pantalla, así el tablero y la ficha nunca se
// contradicen.

const TZ = "America/El_Salvador";
const FMT_DIA = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** "2026-10-21" del instante dado, en hora de El Salvador. */
export function diaSV(ms: number = Date.now()): string {
  return FMT_DIA.format(new Date(ms));
}

/** Suma días a un YYYY-MM-DD (aritmética de calendario, sin husos). */
export function sumarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  const x = new Date(Date.UTC(a, m - 1, d + n));
  return x.toISOString().slice(0, 10);
}

/** Días entre dos YYYY-MM-DD (b - a). */
export function diasEntre(a: string, b: string): number {
  const [a1, m1, d1] = a.split("-").map(Number);
  const [a2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

/** 0 = domingo … 6 = sábado. */
export function diaSemana(dia: string): number {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

/** Noche de viernes o sábado: la que se llena en la playa. */
export function esNocheFinde(dia: string): boolean {
  const s = diaSemana(dia);
  return s === 5 || s === 6;
}

/** Sábado o domingo: el día de playa del Day Pass. */
export function esDiaFinde(dia: string): boolean {
  const s = diaSemana(dia);
  return s === 0 || s === 6;
}

/** "23/10" */
export function diaMes(dia: string): string {
  const [, m, d] = dia.split("-").map(Number);
  return `${d}/${m}`;
}

/** "23 oct" */
export function fechaCorta(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(a, m - 1, d)))
    .replace(".", "");
}

/** "Viernes 23 de octubre" */
export function fechaLarga(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  const t = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(a, m - 1, d)),
  );
  return t.charAt(0).toUpperCase() + t.slice(1).replace(",", "");
}

/** Hash FNV-1a de 32 bits: rápido, estable y suficiente para repartir una muestra. */
export function hash(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Número entre 0 y 1 que siempre sale igual para la misma llave. */
export function azar(...partes: (string | number)[]): number {
  return hash(partes.join("|")) / 0xffffffff;
}

export function elegir<T>(xs: readonly T[], ...llave: (string | number)[]): T {
  return xs[Math.floor(azar(...llave) * xs.length) % xs.length];
}

export function dinero(v: number): string {
  return `$${Math.round(v).toLocaleString("en-US")}`;
}
