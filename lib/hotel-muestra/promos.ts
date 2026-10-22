// Promociones de un hotel de muestra: las de sus datos, con lo que se movió en
// el demo encima (encender, apagar, editar, crear, borrar). Tienen la forma
// que devuelve /api/promos, así la pantalla es la de siempre.

import type { Promocion } from "@/lib/promos";
import type { HotelMuestra, Movimiento } from "./tipos";
import { sumarDias } from "./fechas";

export function promocionesDeMuestra(hotel: HotelMuestra, movimientos: Movimiento[], hoy: string): Promocion[] {
  let promos: Promocion[] = (hotel.promociones ?? []).map((s) => ({
    id: s.id,
    tenant: hotel.tenant,
    nombre: s.nombre,
    descripcion: s.descripcion,
    precio: s.precio,
    restricciones: s.restricciones,
    desde: s.desdeEnDias === undefined ? undefined : sumarDias(hoy, s.desdeEnDias),
    hasta: s.hastaEnDias === undefined ? undefined : sumarDias(hoy, s.hastaEnDias),
    activa: s.activa,
    actualizada: `${hoy}T08:00:00`,
  }));

  for (const m of movimientos) {
    if (m.tipo === "promo.guardar") {
      const cambios = Object.fromEntries(Object.entries(m.promo).filter(([, v]) => v !== undefined));
      if (m.promoId) {
        promos = promos.map((p) => (p.id === m.promoId ? { ...p, ...cambios, actualizada: m.ts } : p));
      } else {
        promos = [
          {
            id: m.id,
            tenant: hotel.tenant,
            nombre: "",
            descripcion: "",
            precio: "",
            restricciones: "",
            activa: true,
            ...cambios,
            actualizada: m.ts,
          },
          ...promos,
        ];
      }
    } else if (m.tipo === "promo.borrar") {
      promos = promos.filter((p) => p.id !== m.promoId);
    }
  }
  return promos;
}
