"use client";

// El estado de un hotel de muestra en el navegador.
//
// Igual que ShopUSA: la muestra se arma en cada carga y lo que se hace en el
// demo (confirmar un apartado, meter una reserva, tomar un ticket) se guarda
// como movimientos en localStorage, con la llave de ESE hotel. Así el demo
// aguanta una recarga a mitad de una presentación, un hotel nunca ve lo que se
// movió en otro y nada toca la base de un cliente real.

import { useSyncExternalStore } from "react";
import { activeTenantId } from "@/lib/tenants/active";
import type { Movimiento } from "./tipos";
import { armarVista, type VistaHotel } from "./vista";
import { hotelMuestraDe } from "./registro";
import { diaSV } from "./fechas";

const clave = (tenant: string) => `hotelMuestra.${tenant}.movimientos.v1`;

const movimientos = new Map<string, Movimiento[]>();
const vistas = new Map<string, VistaHotel>();
const oyentes = new Set<() => void>();
let escuchando = false;

function leer(tenant: string): Movimiento[] {
  try {
    const raw = window.localStorage.getItem(clave(tenant));
    const xs = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(xs) ? (xs as Movimiento[]).filter((m) => m && typeof m.id === "string" && typeof m.tipo === "string") : [];
  } catch {
    return [];
  }
}

function deTenant(tenant: string): Movimiento[] {
  if (!movimientos.has(tenant)) movimientos.set(tenant, typeof window === "undefined" ? [] : leer(tenant));
  return movimientos.get(tenant)!;
}

function guardar(tenant: string) {
  try {
    window.localStorage.setItem(clave(tenant), JSON.stringify(deTenant(tenant)));
  } catch {
    // Sin almacenamiento (ventana privada estricta) el demo sigue en memoria.
  }
}

function emitir() {
  for (const f of oyentes) f();
}

function suscribir(f: () => void) {
  if (!escuchando && typeof window !== "undefined") {
    escuchando = true;
    // Otra pestaña del mismo demo movió algo: se trae para no pisarlo.
    window.addEventListener("storage", (e) => {
      if (!e.key?.startsWith("hotelMuestra.")) return;
      movimientos.clear();
      vistas.clear();
      emitir();
    });
  }
  oyentes.add(f);
  return () => oyentes.delete(f);
}

/** La vista del hotel de ESTE panel. null si el panel no es un hotel de muestra. */
export function vistaDe(tenant: string): VistaHotel | null {
  const hotel = hotelMuestraDe(tenant);
  if (!hotel) return null;
  let v = vistas.get(tenant);
  if (!v) {
    const ahora = Date.now();
    v = armarVista(hotel, deTenant(tenant), ahora, diaSV(ahora));
    vistas.set(tenant, v);
  }
  return v;
}

export function useHotelMuestra(): VistaHotel | null {
  const tenant = activeTenantId();
  return useSyncExternalStore(
    suscribir,
    () => vistaDe(tenant),
    () => null,
  );
}

function nuevoId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}

type SinSello<T> = T extends unknown ? Omit<T, "id" | "ts"> : never;

/** Guarda un movimiento del panel activo y avisa a todas las pantallas. */
export function registrar(m: SinSello<Movimiento>): Movimiento | null {
  const tenant = activeTenantId();
  if (!hotelMuestraDe(tenant)) return null;
  const completo = { ...m, id: nuevoId(), ts: new Date().toISOString() } as Movimiento;
  movimientos.set(tenant, [...deTenant(tenant), completo]);
  guardar(tenant);
  vistas.delete(tenant);
  emitir();
  return completo;
}

/** Vuelve a la muestra tal como viene: borra lo movido en este navegador. */
export function restablecer() {
  const tenant = activeTenantId();
  movimientos.set(tenant, []);
  guardar(tenant);
  vistas.delete(tenant);
  emitir();
}
