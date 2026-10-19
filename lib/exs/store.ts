"use client";

// El estado de Express Shopping en el navegador.
//
// La muestra se arma en cada carga y lo que se hace en el demo (mover un
// paquete, despachar un vuelo, crear una prealerta desde la bandeja) se guarda
// como movimientos en localStorage, con llave propia de este panel: así el
// demo aguanta una recarga a mitad de una presentación y no toca la base de
// ningún cliente real. "Restablecer" borra los movimientos y vuelve a la
// muestra.
//
// Es un store de módulo (useSyncExternalStore): la bandeja, el tablero y la
// ficha leen lo mismo, y lo que se mueve en una pantalla ya está en la otra.

import { useSyncExternalStore } from "react";
import type { LecturaCaptura, Movimiento, Paquete, TipoMovimiento } from "./tipos";
import { movimientoValido } from "./estado";
import { armarVista, clienteDe, type VistaExs } from "./vista";
import { AHORA_DEMO, semillaExs, type CapturaPendiente } from "./semilla";

const CLAVE = "exs.movimientos.v1";

let movimientos: Movimiento[] = [];
let cargado = false;
let vista: VistaExs | null = null;
const oyentes = new Set<() => void>();

function leer(): Movimiento[] {
  try {
    const raw = window.localStorage.getItem(CLAVE);
    const xs = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(xs) ? (xs as Movimiento[]).filter((m) => m && typeof m.id === "string" && movimientoValido(m)) : [];
  } catch {
    return [];
  }
}

function guardar() {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(movimientos));
  } catch {
    // Sin almacenamiento (ventana privada estricta) el demo sigue en memoria.
  }
}

function asegurarCarga() {
  if (cargado || typeof window === "undefined") return;
  cargado = true;
  movimientos = leer();
  // Otra pestaña del mismo demo movió algo: se trae para no pisarlo.
  window.addEventListener("storage", (e) => {
    if (e.key !== CLAVE) return;
    movimientos = leer();
    vista = null;
    emitir();
  });
}

function emitir() {
  for (const f of oyentes) f();
}

function suscribir(f: () => void) {
  asegurarCarga();
  oyentes.add(f);
  return () => oyentes.delete(f);
}

function obtener(): VistaExs {
  asegurarCarga();
  if (!vista) vista = armarVista(semillaExs(AHORA_DEMO), movimientos);
  return vista;
}

// En el servidor no hay movimientos: la muestra pelada. El shell no pinta las
// pantallas hasta tener sesión, así que esto casi no se usa.
let vistaServidor: VistaExs | null = null;
function obtenerServidor(): VistaExs {
  if (!vistaServidor) vistaServidor = armarVista(semillaExs(AHORA_DEMO), []);
  return vistaServidor;
}

export function useExs(): VistaExs {
  return useSyncExternalStore(suscribir, obtener, obtenerServidor);
}

function nuevoId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}

/** Guarda un movimiento y avisa a todas las pantallas. false = no era válido. */
export function registrar(tipo: TipoMovimiento, objetivo: string, valor: Record<string, unknown>, actor: string): boolean {
  asegurarCarga();
  const m: Movimiento = { id: nuevoId(), objetivo, tipo, valor, actor, ts: new Date().toISOString() };
  if (!movimientoValido(m)) return false;
  movimientos = [...movimientos, m];
  guardar();
  vista = null;
  emitir();
  return true;
}

/** Vuelve a la muestra tal como viene: borra todo lo movido en este navegador. */
export function restablecer() {
  asegurarCarga();
  movimientos = [];
  guardar();
  vista = null;
  emitir();
}

export function hayMovimientos(): boolean {
  asegurarCarga();
  return movimientos.length > 0;
}

/** Un id de paquete que no choque con la muestra ni con lo creado antes. */
function idParaNuevo(v: VistaExs): string {
  const max = v.paquetes.reduce((n, p) => Math.max(n, Number(p.id.replace(/\D+/g, "")) || 0), 24800);
  return `P-${max + 1}`;
}

/**
 * La captura que leyó la IA pasa a ser un paquete prealertado. El aviso al
 * cliente ("quedó prealertado...") sale de ese mismo evento.
 */
export function crearPrealerta(cap: CapturaPendiente, actor: string, lectura: LecturaCaptura = cap.lectura): Paquete | null {
  const v = obtener();
  const cliente = clienteDe(v, cap.clienteId);
  if (!cliente) return null;
  const ts = new Date().toISOString();
  const paquete: Paquete = {
    id: idParaNuevo(v),
    clienteId: cliente.id,
    tracking: lectura.tracking,
    tienda: lectura.tienda,
    transportista: lectura.transportista,
    contenido: lectura.contenido,
    categoria: lectura.categoria,
    valor: lectura.valor,
    etapa: "prealertado",
    prealerta: {
      origen: "captura",
      ts,
      capturaUrl: cap.capturaUrl,
      lectura,
      conversationId: cap.conversationId,
    },
    // A domicilio se pide paquete por paquete; lo nuevo cae en su sucursal.
    entrega: { tipo: "sucursal", sucursal: cliente.sucursal },
    pagado: false,
    historial: [],
    creado: ts,
  };
  return registrar("prealerta", paquete.id, { paquete }, actor) ? paquete : null;
}
