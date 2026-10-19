// Cómo se escriben las cosas de Express Shopping, igual en el chat y en las
// pantallas. Puro.

import type { Vuelo } from "./tipos";
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

/** "Ropa (adulto y bebé)" → "Ropa". */
export function categoriaCorta(cat: string): string {
  return cat.replace(/\s*\(.*\)\s*$/, "");
}

const FMT_DIA_LARGO = new Intl.DateTimeFormat("es-SV", { timeZone: ZONA_SV, weekday: "long", day: "numeric", month: "long" });

/** "miércoles 21 de octubre": el día del vuelo, como se le dice a un cliente. */
export function diaDeVuelo(v: Vuelo | undefined): string {
  // Intl pone coma después del día de la semana ("miércoles, 21"); en una frase sobra.
  return v ? FMT_DIA_LARGO.format(new Date(v.sale)).replace(",", "") : "próximo vuelo";
}

const FMT_MES_ANIO = new Intl.DateTimeFormat("es-SV", { timeZone: "UTC", month: "long", year: "numeric" });

/** "enero de 2023" de una fecha "YYYY-MM-DD". */
export function mesYAnio(ymd: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? FMT_MES_ANIO.format(new Date(`${ymd}T12:00:00Z`)) : "";
}
