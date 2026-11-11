"use client";

// El estado de La Campana en el navegador: los pedidos (con su cola) y la
// agenda de reservaciones y eventos.
//
// Igual que ShopUSA: la muestra se arma en la primera carga y lo que se mueve
// en el demo se guarda en localStorage con llave propia de este panel, así una
// recarga a mitad de la presentación no pierde nada y no se toca la base de
// ningún cliente real. "Restablecer" vuelve a la muestra.
//
// Store de módulo (useSyncExternalStore): el tablero, Pedidos y la Agenda leen
// lo mismo, y lo que se mueve en una pantalla ya está en la otra.

import { useSyncExternalStore } from "react";
import { avanzar as avanzarPedido, llenarCocina, pedidoEntrante, semillaPedidos, type Pedido } from "./pedidos";
import { SUCURSALES_CAMPANA } from "./sucursales";
import { semillaAgenda, type Cita, type EstadoCita } from "./agenda";

const CLAVE = "lacampana.demo.v1";

export interface EstadoCampana {
  pedidos: Pedido[];
  citas: Cita[];
  /** La cocina toma sola de la cola cuando se libera un lugar. */
  autoCola: boolean;
  /** Cuándo se armó la muestra: si es de otro día, se rearma. */
  armado: string;
}

let estado: EstadoCampana | null = null;
const oyentes = new Set<() => void>();

function nuevo(): EstadoCampana {
  const ahora = Date.now();
  // Con la cocina tomando sola de la cola (lo que viene encendido), ninguna
  // sucursal puede arrancar con lugar libre y pedidos esperando.
  let pedidos = semillaPedidos(ahora);
  for (const s of SUCURSALES_CAMPANA) pedidos = llenarCocina(pedidos, s.id, ahora);
  return { pedidos, citas: semillaAgenda(ahora), autoCola: true, armado: new Date(ahora).toDateString() };
}

function cargar(): EstadoCampana {
  if (estado) return estado;
  try {
    const raw = window.localStorage.getItem(CLAVE);
    const e = raw ? (JSON.parse(raw) as EstadoCampana) : null;
    // Una muestra de otro día tendría la agenda corrida y pedidos de ayer en
    // cocina: se rearma.
    estado = e && e.armado === new Date().toDateString() && Array.isArray(e.pedidos) && Array.isArray(e.citas) ? e : nuevo();
  } catch {
    estado = nuevo();
  }
  return estado;
}

function fijar(e: EstadoCampana) {
  estado = e;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(e));
  } catch {
    // Sin almacenamiento (ventana privada) el demo anda igual, solo que una
    // recarga vuelve a la muestra.
  }
  for (const o of oyentes) o();
}

function suscribir(o: () => void) {
  oyentes.add(o);
  return () => oyentes.delete(o);
}

const VACIO: EstadoCampana = { pedidos: [], citas: [], autoCola: true, armado: "" };

export function useCampana(): EstadoCampana {
  return useSyncExternalStore(suscribir, cargar, () => VACIO);
}

// ─────────────────────────── Acciones ───────────────────────────

export function avanzar(id: string) {
  const e = cargar();
  fijar({ ...e, pedidos: avanzarPedido(e.pedidos, id, Date.now(), e.autoCola) });
}

export function llenar(sucursalId: string) {
  const e = cargar();
  fijar({ ...e, pedidos: llenarCocina(e.pedidos, sucursalId, Date.now()) });
}

export function simularEntrante(): Pedido {
  const e = cargar();
  const p = pedidoEntrante(e.pedidos, Date.now());
  let pedidos = [...e.pedidos, p];
  if (e.autoCola) pedidos = llenarCocina(pedidos, p.sucursalId, Date.now());
  fijar({ ...e, pedidos });
  return p;
}

export function fijarAutoCola(v: boolean) {
  const e = cargar();
  fijar({ ...e, autoCola: v });
}

export function cambiarEstadoCita(id: string, estadoCita: EstadoCita) {
  const e = cargar();
  fijar({ ...e, citas: e.citas.map((c) => (c.id === id ? { ...c, estado: estadoCita } : c)) });
}

export function agregarCita(c: Omit<Cita, "id">) {
  const e = cargar();
  const id = `C-${Math.max(100, ...e.citas.map((x) => Number(x.id.slice(2)) || 0)) + 1}`;
  fijar({ ...e, citas: [...e.citas, { ...c, id }] });
}

export function restablecer() {
  fijar(nuevo());
}
