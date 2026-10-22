// Qué paneles son hoteles de muestra, y con qué datos.
//
// Sumar un hotel = su archivo de datos + una línea acá. Las pantallas (el
// tablero, los tickets, IA Performance) preguntan por esta lista y nada más.

import { MODULOS_HOTEL_MUESTRA, type ModuleId } from "@/lib/modulos";
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

/**
 * El menú de un hotel de muestra, en el orden de Porta Stays. Redes,
 * Comentarios y Promociones van solo si el hotel trae esos datos (NAWI sí,
 * Tesoro no): un módulo vacío en un demo se ve como algo roto.
 */
export function modulosDeHotelMuestra(tenant: string): ModuleId[] {
  const hotel = hotelMuestraDe(tenant);
  if (!hotel) return [];
  const extra: ModuleId[] = [
    ...(hotel.redes ? (["redes", "comentarios"] as const) : []),
    ...(hotel.promociones ? (["promociones"] as const) : []),
  ];
  const i = MODULOS_HOTEL_MUESTRA.indexOf("interno") + 1;
  return [...MODULOS_HOTEL_MUESTRA.slice(0, i), ...extra, ...MODULOS_HOTEL_MUESTRA.slice(i)];
}
