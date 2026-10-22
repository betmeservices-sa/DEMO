"use client";

// Las promociones de un hotel de muestra, con la misma forma que devuelve
// /api/promos. Encender, editar, crear y borrar quedan como movimientos del demo.

import type { Promocion, PromocionNueva } from "@/lib/promos";
import { registrar, vistaDe } from "./store";

export function leerPromocionesMuestra(tenant: string): Promocion[] | null {
  return vistaDe(tenant)?.promociones ?? null;
}

export function guardarPromocionMuestra(cambios: Partial<PromocionNueva>, actor: string, id?: string): string | null {
  if (!id && !cambios.nombre?.trim()) return "La promoción necesita un nombre.";
  registrar({ tipo: "promo.guardar", promoId: id, promo: cambios, actor });
  return null;
}

export function borrarPromocionMuestra(id: string, actor: string) {
  registrar({ tipo: "promo.borrar", promoId: id, actor });
}
