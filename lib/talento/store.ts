"use client";

// Estado del centro de reclutamiento, en el navegador.
//
// Vive en localStorage y no en la base a proposito: es un demo que se le
// ensena a prospectos, y cada quien tiene que poder arrastrar candidatos,
// crear vacantes y agregar perfiles sin pisarle el tablero al siguiente. Un
// store compartido en el servidor ademas se partiria entre las funciones
// serverless (cada una con su memoria), que es el mismo problema que tuvo la
// bandeja antes de Supabase.
//
// Un solo estado para todas las pantallas (useSyncExternalStore): mover a
// alguien en el Pipeline se ve al instante en Perfiles y en el Dashboard.

import { useSyncExternalStore } from "react";
import { diaSv, diasEntre } from "./fechas";
import { desplazar, reducirTalento, type AccionTalento } from "./operaciones";
import { sembrarTalento, VERSION_TALENTO } from "./seed";
import type { EstadoTalento } from "./tipos";

const KEY = "ccg.talento.v1";

let estado: EstadoTalento | null = null;
const oyentes = new Set<() => void>();

function emitir() {
  for (const l of oyentes) l();
}

function guardar() {
  try {
    if (estado) window.localStorage.setItem(KEY, JSON.stringify(estado));
  } catch {
    // Sin espacio o en modo privado: el demo sigue en memoria.
  }
}

function cargar(): EstadoTalento {
  if (estado) return estado;
  let leido: EstadoTalento | null = null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) leido = JSON.parse(raw) as EstadoTalento;
  } catch {
    leido = null;
  }
  if (!leido || leido.version !== VERSION_TALENTO) {
    estado = sembrarTalento();
  } else {
    // Lo guardado hace dias se corre hasta hoy (ver desplazar).
    const hoy = diaSv(new Date());
    const dias = diasEntre(`${leido.sembradoEn}T00:00:00Z`, `${hoy}T00:00:00Z`);
    estado = dias > 0 ? desplazar(leido, dias) : leido;
  }
  guardar();
  return estado;
}

function subscribe(l: () => void) {
  oyentes.add(l);
  return () => oyentes.delete(l);
}

export function despachar(a: AccionTalento) {
  estado = reducirTalento(cargar(), a);
  guardar();
  emitir();
}

/** Vuelve a los datos de fabrica del demo. */
export function restablecerTalento() {
  despachar({ type: "RESTABLECER", estado: sembrarTalento() });
}

/** El estado, o null en el servidor y en el primer render (hidratacion). */
export function useTalento(): EstadoTalento | null {
  return useSyncExternalStore(subscribe, cargar, () => null);
}
