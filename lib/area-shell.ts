"use client";

// El area elegida en las pestanas de arriba del shell "flotante".
//
// Filtra la bandeja y el tablero a la vez, asi que vive fuera de los dos: un
// almacen chico con suscripcion, guardado por pestana del navegador
// (sessionStorage) y POR CLIENTE. La llave lleva el tenant a proposito: el
// login recarga en la misma pestana, y sin el tenant en la llave un "Cobros"
// elegido en la Caja dejaria la bandeja de otro cliente filtrada por un
// departamento que no tiene, o sea vacia.
//
// Un cliente sin `areas` en su TenantConfig siempre lee "todos": para los
// paneles de siempre esto no cambia nada.

import { useSyncExternalStore } from "react";
import type { DepartmentId } from "./data/types";
import { activeTenant, activeTenantId } from "./tenants/active";

export type AreaShell = "todos" | DepartmentId;

const oyentes = new Set<() => void>();

function clave(): string {
  return `ccg.area.${activeTenantId()}`;
}

function leer(): AreaShell {
  if (typeof window === "undefined") return "todos";
  const areas = activeTenant().areas;
  if (!areas || areas.length === 0) return "todos";
  const v = window.sessionStorage.getItem(clave());
  return v && (areas as string[]).includes(v) ? (v as DepartmentId) : "todos";
}

function suscribir(cb: () => void): () => void {
  oyentes.add(cb);
  return () => oyentes.delete(cb);
}

export function fijarArea(area: AreaShell): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(clave(), area);
  oyentes.forEach((cb) => cb());
}

/** El area activa del panel, o "todos". */
export function useArea(): AreaShell {
  return useSyncExternalStore(suscribir, leer, () => "todos");
}

/** ¿Esta conversacion entra en el area elegida? */
export function enArea(area: AreaShell, departamento: DepartmentId): boolean {
  return area === "todos" || departamento === area;
}
