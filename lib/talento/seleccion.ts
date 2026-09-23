"use client";

// Los candidatos elegidos para comparar. Un solo estado para Perfiles,
// Vacantes y Pipeline (useSyncExternalStore), guardado en sessionStorage para
// que sobreviva al cambiar de pantalla.

import { useSyncExternalStore } from "react";
import { MAX_COMPARAR } from "./comparar";

export interface SeleccionComparar {
  ids: string[];
  /** Vacante desde donde se eligio (Vacantes o Pipeline filtrado). */
  vacanteId: string | null;
}

const KEY = "ccg.talento.comparar";
const VACIA: SeleccionComparar = { ids: [], vacanteId: null };

/** Agrega o quita. Con tres ya elegidos, no entra un cuarto. */
export function alternar(sel: SeleccionComparar, id: string, vacanteId?: string | null): SeleccionComparar {
  if (sel.ids.includes(id)) {
    const ids = sel.ids.filter((x) => x !== id);
    return { ids, vacanteId: ids.length ? sel.vacanteId : null };
  }
  if (sel.ids.length >= MAX_COMPARAR) return sel;
  return { ids: [...sel.ids, id], vacanteId: sel.vacanteId ?? vacanteId ?? null };
}

let actual: SeleccionComparar | null = null;
const oyentes = new Set<() => void>();

function leer(): SeleccionComparar {
  if (actual) return actual;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    actual = raw ? (JSON.parse(raw) as SeleccionComparar) : VACIA;
  } catch {
    actual = VACIA;
  }
  return actual;
}

function fijar(s: SeleccionComparar) {
  actual = s;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // modo privado: queda en memoria
  }
  for (const l of oyentes) l();
}

export function alternarComparar(id: string, vacanteId?: string | null) {
  fijar(alternar(leer(), id, vacanteId));
}

export function limpiarComparar() {
  fijar(VACIA);
}

export function useComparar(): SeleccionComparar {
  return useSyncExternalStore(
    (l) => {
      oyentes.add(l);
      return () => oyentes.delete(l);
    },
    leer,
    () => VACIA,
  );
}
