// Cómo se escriben las cosas de ShopUSA, igual en el chat y en las pantallas.
// Puro.

import type { Carga } from "./tipos";
import { ZONA_SV } from "@/lib/eventos/fechas";

/** El tracking legible: los de USPS (20 dígitos o más) en grupos de cuatro, los demás tal cual. */
export function trackingLegible(t: string): string {
  return /^\d{20,}$/.test(t) ? t.replace(/(\d{4})(?=\d)/g, "$1 ") : t;
}

/** "1 paquete", "8 paquetes". */
export function cuantos(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** Solo la primera letra en mayúscula ("Lunes, 19 de octubre de 2026"). */
export function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "Licuadoras, cafeteras y freidoras de aire" cabe en una tarjeta; lo que no, se corta con puntos. */
export function categoriaCorta(cat: string, max = 34): string {
  return cat.length > max ? `${cat.slice(0, max - 1).trimEnd()}…` : cat;
}

// Cómo se nombra lo que lleva tarifa fija en una frase ("Por ser un celular...").
const ARTICULO_FIJO: Record<string, string> = {
  "Laptops y notebooks": "una laptop",
  "Celulares y smartphones": "un celular",
  Tablets: "una tablet",
  "Kindles y lectores electrónicos": "un lector electrónico",
  "Relojes y smartwatch": "un reloj inteligente",
};

export function articuloFijo(categoria: string): string {
  return ARTICULO_FIJO[categoria] ?? "un electrónico";
}

/** "a", "a y b", "a, b y c". */
export function listaDeCosas(xs: readonly string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;
}

const FMT_DIA_LARGO = new Intl.DateTimeFormat("es-SV", { timeZone: ZONA_SV, weekday: "long", day: "numeric", month: "long" });

/** "miércoles 21 de octubre": el día de la carga, como se le dice a un cliente. */
export function diaDeCarga(c: Carga | undefined): string {
  // Intl pone coma después del día de la semana ("miércoles, 21"); en una frase sobra.
  return c ? FMT_DIA_LARGO.format(new Date(c.sale)).replace(",", "") : "próxima carga";
}

/** "Carga 1042": como se nombra una carga en las pantallas y en el chat del equipo. */
export function nombreCarga(c: Pick<Carga, "id"> | string | undefined): string {
  const id = typeof c === "string" ? c : c?.id;
  return id ? `Carga ${id}` : "";
}

const FMT_MES_ANIO = new Intl.DateTimeFormat("es-SV", { timeZone: "UTC", month: "long", year: "numeric" });

/** "enero de 2023" de una fecha "YYYY-MM-DD". */
export function mesYAnio(ymd: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? FMT_MES_ANIO.format(new Date(`${ymd}T12:00:00Z`)) : "";
}
