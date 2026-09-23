"use client";

// Estado del centro de reclutamiento, en el navegador.
//
// Dos fuentes:
//   - El DEMO (36 perfiles de ejemplo) vive en localStorage: cada visitante
//     puede arrastrar y crear sin pisarle el tablero al siguiente.
//   - Los candidatos REALES (los que llegan del formulario de carreras) viven
//     en el servidor (/api/talento/estado, tablas talento_* en Supabase) y los
//     comparte todo el equipo: su etapa, la decision Aprobado / Rechazado y
//     las notas se guardan alla.
//
// En cuanto existe al menos un candidato real, el panel muestra SOLO los
// reales y esconde los de ejemplo. Las vacantes siguen siendo las del tablero
// (el formulario entra a ellas por puesto), y las entrevistas y el onboarding
// quedan en este navegador.
//
// Un solo estado para todas las pantallas (useSyncExternalStore): mover a
// alguien en el Pipeline se ve al instante en Perfiles y en el Dashboard.

import { useSyncExternalStore } from "react";
import { diaSv, diasEntre } from "./fechas";
import { desplazar, reducirTalento, type AccionTalento } from "./operaciones";
import { sembrarTalento, VERSION_TALENTO } from "./seed";
import { mezclarReales } from "./mezcla";
import type { Candidato, EstadoGhl, EstadoTalento, Postulacion } from "./tipos";

const KEY = "ccg.talento.v1";
const REFRESCO_MS = 30_000;

let local: EstadoTalento | null = null;
let real: { candidatos: Candidato[]; postulaciones: Postulacion[] } | null = null;
let vista: EstadoTalento | null = null;
const oyentes = new Set<() => void>();

function emitir() {
  vista = null;
  for (const l of oyentes) l();
}

function guardarLocal() {
  try {
    if (local) window.localStorage.setItem(KEY, JSON.stringify(local));
  } catch {
    // Sin espacio o en modo privado: el demo sigue en memoria.
  }
}

function cargarLocal(): EstadoTalento {
  if (local) return local;
  let leido: EstadoTalento | null = null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) leido = JSON.parse(raw) as EstadoTalento;
  } catch {
    leido = null;
  }
  if (!leido || leido.version !== VERSION_TALENTO) {
    local = sembrarTalento();
  } else {
    // Lo guardado hace dias se corre hasta hoy (ver desplazar).
    const hoy = diaSv(new Date());
    const dias = diasEntre(`${leido.sembradoEn}T00:00:00Z`, `${hoy}T00:00:00Z`);
    local = dias > 0 ? desplazar(leido, dias) : leido;
  }
  guardarLocal();
  return local;
}

export function hayReales(): boolean {
  return Boolean(real && real.candidatos.length > 0);
}

/** Lo que ven las pantallas: el demo, o los reales sobre las vacantes del tablero. */
function mezclar(): EstadoTalento {
  const l = cargarLocal();
  return hayReales() ? mezclarReales(l, real!) : l;
}

function leer(): EstadoTalento {
  if (!vista) vista = mezclar();
  pedirReales();
  return vista;
}

// --- Sincronizacion con el servidor ---
let pedido = false;
let pendientes = 0;

async function traerReales() {
  if (pendientes > 0) return; // no pisar lo que se esta guardando
  try {
    const r = await fetch("/api/talento/estado", { cache: "no-store" });
    if (!r.ok) return;
    const d = (await r.json()) as { ok: boolean; candidatos?: Candidato[]; postulaciones?: Postulacion[] };
    if (!d.ok || pendientes > 0) return;
    real = { candidatos: d.candidatos ?? [], postulaciones: d.postulaciones ?? [] };
    emitir();
  } catch {
    // Sin red: se queda con lo ultimo que tuvo.
  }
}

function pedirReales() {
  if (pedido || typeof window === "undefined") return;
  pedido = true;
  void traerReales();
  window.setInterval(() => void traerReales(), REFRESCO_MS);
  window.addEventListener("focus", () => void traerReales());
}

async function subir(candidatos: Candidato[], postulaciones: Postulacion[], borrar: string[]) {
  if (!candidatos.length && !postulaciones.length && !borrar.length) return;
  pendientes += 1;
  try {
    await fetch("/api/talento/estado", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ candidatos, postulaciones, borrar }),
    });
  } catch {
    // Se reintenta solo con la proxima lectura: lo que no llego se ve distinto
    // al refrescar, que es preferible a dar por guardado algo que no lo esta.
  } finally {
    pendientes -= 1;
  }
}

export function despachar(a: AccionTalento) {
  if (!hayReales() || a.type === "RESTABLECER") {
    local = reducirTalento(cargarLocal(), a);
    guardarLocal();
    emitir();
    return;
  }
  const antes = mezclar();
  const despues = reducirTalento(antes, a);
  // Lo local (vacantes, entrevistas, onboarding) se guarda en el navegador.
  // Las vacantes de puestos del formulario se arman al mezclar: no se guardan.
  local = {
    ...cargarLocal(),
    vacantes: despues.vacantes.filter((v) => v.origen !== "formulario"),
    entrevistas: despues.entrevistas,
    onboarding: despues.onboarding,
  };
  guardarLocal();
  // Lo real va al servidor: solo lo que cambio (el reducer no toca los demas objetos).
  const cAntes = new Set(antes.candidatos);
  const pAntes = new Set(antes.postulaciones);
  const idsDespues = new Set(despues.postulaciones.map((p) => p.id));
  const candidatos = despues.candidatos.filter((c) => !cAntes.has(c));
  const postulaciones = despues.postulaciones.filter((p) => !pAntes.has(p));
  const borrar = antes.postulaciones.filter((p) => !idsDespues.has(p.id)).map((p) => p.id);
  real = { candidatos: despues.candidatos, postulaciones: despues.postulaciones };
  emitir();
  const guardado = subir(candidatos, postulaciones, borrar);
  // La decision tambien se marca en GHL, en segundo plano y despues de que el
  // perfil quedo guardado. Si GHL falla, la ficha lo dice y deja reintentar.
  if (a.type === "DECIDIR") void guardado.then(() => marcarGhl(a.candidatoId, a.resultado));
  if (a.type === "DECISION_DESHACER") {
    const previo = antes.candidatos.find((c) => c.id === a.candidatoId)?.decision?.resultado;
    if (previo) void guardado.then(() => marcarGhl(a.candidatoId, "deshacer", previo));
  }
}

/** Pide al servidor marcar (o desmarcar) la decision en GHL. Tambien es el "Reintentar" de la ficha. */
export async function marcarGhl(candidatoId: string, accion: "aprobado" | "rechazado" | "deshacer", previo?: "aprobado" | "rechazado") {
  try {
    const r = await fetch("/api/talento/ghl", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ candidatoId, accion, previo }),
    });
    const d = (await r.json()) as { ok: boolean; ghl?: EstadoGhl };
    if (d.ghl && real) {
      real = { ...real, candidatos: real.candidatos.map((c) => (c.id === candidatoId ? { ...c, ghl: d.ghl } : c)) };
      emitir();
    }
  } catch {
    // Sin red: queda como estaba; la ficha sigue ofreciendo reintentar si hubo error antes.
  }
}

/** Vuelve a los datos de fabrica del demo. Los candidatos reales no se tocan. */
export function restablecerTalento() {
  despachar({ type: "RESTABLECER", estado: sembrarTalento() });
}

function subscribe(l: () => void) {
  oyentes.add(l);
  return () => oyentes.delete(l);
}

/** El estado, o null en el servidor y en el primer render (hidratacion). */
export function useTalento(): EstadoTalento | null {
  return useSyncExternalStore(subscribe, leer, () => null);
}

/** true cuando el panel muestra candidatos reales del formulario. */
export function useHayReales(): boolean {
  return useSyncExternalStore(subscribe, hayReales, () => false);
}
