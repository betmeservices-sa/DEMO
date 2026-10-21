// Qué paneles son hoteles de muestra, y con qué datos.
//
// Sumar un hotel = su archivo de datos + una línea acá. Las pantallas (el
// tablero, los tickets, IA Performance) preguntan por esta lista y nada más.

import type { HotelMuestra } from "./tipos";
import { NAWI } from "./nawi";
import { TESORO } from "./tesoro";

const HOTELES: Record<string, HotelMuestra> = {
  nawi: NAWI,
  tesoro: TESORO,
};

export function hotelMuestraDe(tenant: string): HotelMuestra | null {
  return HOTELES[tenant] ?? null;
}

export function esHotelMuestra(tenant: string): boolean {
  return tenant in HOTELES;
}

export const TENANTS_HOTEL_MUESTRA: readonly string[] = Object.keys(HOTELES);
