// Persistencia del tablero de eventos (solo servidor).
//
// Tres tablas en el esquema public (supabase/migrations/20261006120000_eventos_pizzahut.sql):
//   eventos_llamadas     cada llamada que reportó Daniela, sea o no propuesta
//   eventos_propuestas   la base de cada propuesta REAL (la muestra no se guarda)
//   eventos_movimientos  lo que la gente hizo encima: etapa, notas, asesor
//
// Las llamadas guardan resumen, transcripción y datos: la plataforma de voz
// borra su historial a los 14 días y el tablero no puede depender de eso. El
// audio se copia aparte a un bucket privado (lib/eventos/grabacion.ts).
//
// Entra con una llave SECRETA porque las tablas tienen RLS sin policies: son
// datos de contacto de personas reales. Sin la llave, en local cae a memoria
// (para probar sin tocar la base) y en producción FALLA FUERTE: caer en
// silencio sería perder propuestas reales sin que nadie se entere.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { LlamadaEvento, Movimiento, Propuesta } from "./tipos";

type Cliente = SupabaseClient<any, any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export const TENANT_EVENTOS = "pizzahut";
export const BUCKET_GRABACIONES = "eventos-grabaciones";

const T_LLAMADAS = "eventos_llamadas";
const T_PROPUESTAS = "eventos_propuestas";
const T_MOVIMIENTOS = "eventos_movimientos";

export class SinBaseEventos extends Error {}

let cliente: Cliente | null | undefined;

export function enProduccion(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

function llave(): string | undefined {
  // La de talento es del mismo proyecto y ya está en producción; una propia
  // de eventos, si existe, manda.
  return process.env.SUPABASE_EVENTOS_SECRET_KEY || process.env.SUPABASE_TALENTO_SECRET_KEY || undefined;
}

function db(): Cliente | null {
  if (cliente !== undefined) return cliente;
  const key = llave();
  const url = process.env.SUPABASE_URL || "https://pfzxpidlbuxxtlycdwaj.supabase.co";
  cliente = key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return cliente;
}

function base(): Cliente | null {
  const c = db();
  if (!c && enProduccion()) throw new SinBaseEventos("Falta la llave secreta de la base (SUPABASE_EVENTOS_SECRET_KEY).");
  return c;
}

/** "memoria" en local sin llave; "base" con la base de verdad. */
export function dondeGuarda(): "base" | "memoria" {
  return db() ? "base" : "memoria";
}

// ── Respaldo en memoria, solo desarrollo ──
interface Mem {
  llamadas: Map<string, FilaLlamada>;
  propuestas: Map<string, FilaPropuesta>;
  movimientos: FilaMovimiento[];
  audios: Map<string, { bytes: ArrayBuffer; tipo: string }>;
}
const g = globalThis as unknown as { __eventosPh?: Mem };
const mem: Mem = (g.__eventosPh ??= { llamadas: new Map(), propuestas: new Map(), movimientos: [], audios: new Map() });

// ── Filas ──

interface FilaLlamada {
  id: string;
  tenant: string;
  assistant_id: string | null;
  numero: string;
  inicio: string;
  fin: string;
  duracion_seg: number;
  resumen: string;
  transcripcion: string;
  motivo: string;
  es_propuesta: boolean;
  propuesta_id: string | null;
  datos: Record<string, unknown>;
  grabacion_urls: string[];
  grabacion_path: string | null;
  prueba: boolean;
  recibido?: string;
}

interface FilaPropuesta {
  id: string;
  tenant: string;
  llamada_id: string | null;
  canal: string;
  creada: string;
  datos: Propuesta["datos"];
  resumen: string;
  asesor_id: string;
  prueba: boolean;
  recibido?: string;
}

interface FilaMovimiento {
  id: string;
  tenant: string;
  propuesta_id: string;
  tipo: string;
  valor: Record<string, unknown>;
  actor: string;
  ts: string;
}

function aLlamada(f: FilaLlamada): LlamadaEvento {
  return {
    id: f.id,
    origen: "real",
    assistantId: f.assistant_id,
    numero: f.numero ?? "",
    inicio: new Date(f.inicio).toISOString(),
    fin: new Date(f.fin).toISOString(),
    duracionSeg: Number(f.duracion_seg) || 0,
    resumen: f.resumen ?? "",
    grabacion: Boolean(f.grabacion_path) || (f.grabacion_urls ?? []).length > 0,
    esPropuesta: Boolean(f.es_propuesta),
    motivo: (f.motivo as LlamadaEvento["motivo"]) ?? "otro",
    propuestaId: f.propuesta_id ?? undefined,
    prueba: Boolean(f.prueba),
  };
}

function aPropuesta(f: FilaPropuesta): Propuesta {
  const creada = new Date(f.creada).toISOString();
  return {
    id: f.id,
    origen: "real",
    canal: (f.canal as Propuesta["canal"]) ?? "llamada",
    creada,
    datos: f.datos,
    resumen: f.resumen ?? "",
    etapa: "nueva",
    asesorId: f.asesor_id,
    primerContacto: null,
    notasInternas: [],
    historial: [{ ts: creada, de: null, a: "nueva", actor: "ia" }],
    llamadaId: f.llamada_id ?? undefined,
    prueba: Boolean(f.prueba),
  };
}

function aMovimiento(f: FilaMovimiento): Movimiento {
  return {
    id: f.id,
    propuestaId: f.propuesta_id,
    tipo: f.tipo as Movimiento["tipo"],
    valor: f.valor ?? {},
    actor: f.actor,
    ts: new Date(f.ts).toISOString(),
  };
}

// ── Lectura ──

const COLS_LLAMADA =
  "id, tenant, assistant_id, numero, inicio, fin, duracion_seg, resumen, motivo, es_propuesta, propuesta_id, grabacion_urls, grabacion_path, prueba";

export async function listarLlamadasReales(): Promise<LlamadaEvento[]> {
  const c = base();
  if (!c) return [...mem.llamadas.values()].map(aLlamada);
  const { data, error } = await c
    .from(T_LLAMADAS)
    .select(COLS_LLAMADA)
    .eq("tenant", TENANT_EVENTOS)
    .order("inicio", { ascending: false })
    .limit(2000);
  if (error) throw error;
  return ((data ?? []) as FilaLlamada[]).map(aLlamada);
}

/** Una llamada real con su transcripción, o null. */
export async function leerLlamadaReal(
  id: string,
): Promise<(LlamadaEvento & { transcripcion: string; grabacionPath: string | null; grabacionUrls: string[] }) | null> {
  const c = base();
  let f: FilaLlamada | undefined;
  if (!c) f = mem.llamadas.get(id);
  else {
    const { data, error } = await c.from(T_LLAMADAS).select(`${COLS_LLAMADA}, transcripcion`).eq("id", id).maybeSingle();
    if (error) throw error;
    f = (data as FilaLlamada | null) ?? undefined;
  }
  if (!f || f.tenant !== TENANT_EVENTOS) return null;
  return {
    ...aLlamada(f),
    transcripcion: f.transcripcion ?? "",
    grabacionPath: f.grabacion_path ?? null,
    grabacionUrls: f.grabacion_urls ?? [],
  };
}

export async function listarPropuestasReales(): Promise<Propuesta[]> {
  const c = base();
  if (!c) return [...mem.propuestas.values()].map(aPropuesta);
  const { data, error } = await c
    .from(T_PROPUESTAS)
    .select("id, tenant, llamada_id, canal, creada, datos, resumen, asesor_id, prueba")
    .eq("tenant", TENANT_EVENTOS)
    .order("creada", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return ((data ?? []) as FilaPropuesta[]).map(aPropuesta);
}

export async function listarMovimientos(): Promise<Movimiento[]> {
  const c = base();
  if (!c) return mem.movimientos.map(aMovimiento);
  const { data, error } = await c
    .from(T_MOVIMIENTOS)
    .select("id, tenant, propuesta_id, tipo, valor, actor, ts")
    .eq("tenant", TENANT_EVENTOS)
    .order("ts", { ascending: true })
    .limit(5000);
  if (error) throw error;
  return ((data ?? []) as FilaMovimiento[]).map(aMovimiento);
}

// ── Escritura ──

/**
 * Guarda la llamada. Idempotente: la misma llamada reportada dos veces deja
 * una sola fila (la plataforma reintenta si el webhook tarda).
 * Devuelve true si la llamada era nueva.
 */
export async function guardarLlamada(
  l: LlamadaEvento & { transcripcion: string; datosCrudos: Record<string, unknown> },
  urls: string[],
): Promise<boolean> {
  const fila: FilaLlamada = {
    id: l.id,
    tenant: TENANT_EVENTOS,
    assistant_id: l.assistantId ?? null,
    numero: l.numero,
    inicio: l.inicio,
    fin: l.fin,
    duracion_seg: l.duracionSeg,
    resumen: l.resumen,
    transcripcion: l.transcripcion,
    motivo: l.motivo,
    es_propuesta: l.esPropuesta,
    propuesta_id: l.propuestaId ?? null,
    datos: l.datosCrudos,
    grabacion_urls: urls,
    grabacion_path: null,
    prueba: Boolean(l.prueba),
  };
  const c = base();
  if (!c) {
    if (mem.llamadas.has(l.id)) return false;
    mem.llamadas.set(l.id, fila);
    return true;
  }
  const { data, error } = await c
    .from(T_LLAMADAS)
    .upsert(fila, { onConflict: "id", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** Crea la propuesta si no existe. true = se creó ahora. */
export async function crearPropuesta(p: Propuesta): Promise<boolean> {
  const fila: FilaPropuesta = {
    id: p.id,
    tenant: TENANT_EVENTOS,
    llamada_id: p.llamadaId ?? null,
    canal: p.canal,
    creada: p.creada,
    datos: p.datos,
    resumen: p.resumen,
    asesor_id: p.asesorId,
    prueba: Boolean(p.prueba),
  };
  const c = base();
  if (!c) {
    if (mem.propuestas.has(p.id)) return false;
    mem.propuestas.set(p.id, fila);
    return true;
  }
  const { data, error } = await c
    .from(T_PROPUESTAS)
    .upsert(fila, { onConflict: "id", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function agregarMovimiento(m: Movimiento): Promise<void> {
  const fila: FilaMovimiento = {
    id: m.id,
    tenant: TENANT_EVENTOS,
    propuesta_id: m.propuestaId,
    tipo: m.tipo,
    valor: m.valor,
    actor: m.actor,
    ts: m.ts,
  };
  const c = base();
  if (!c) {
    mem.movimientos.push(fila);
    return;
  }
  const { error } = await c.from(T_MOVIMIENTOS).insert(fila);
  if (error) throw error;
}

export async function marcarGrabacion(id: string, path: string): Promise<void> {
  const c = base();
  if (!c) {
    const f = mem.llamadas.get(id);
    if (f) f.grabacion_path = path;
    return;
  }
  const { error } = await c.from(T_LLAMADAS).update({ grabacion_path: path }).eq("id", id);
  if (error) throw error;
}

// ── Audio ──

export async function subirAudio(path: string, bytes: ArrayBuffer, tipo: string): Promise<void> {
  const c = base();
  if (!c) {
    mem.audios.set(path, { bytes, tipo });
    return;
  }
  const { error } = await c.storage.from(BUCKET_GRABACIONES).upload(path, bytes, { contentType: tipo, upsert: true });
  if (error) throw error;
}

/** URL firmada por una hora. En memoria, null (se sirve directo). */
export async function urlDeAudio(path: string): Promise<string | null> {
  const c = base();
  if (!c) return null;
  const { data, error } = await c.storage.from(BUCKET_GRABACIONES).createSignedUrl(path, 3600);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

export function audioEnMemoria(path: string): { bytes: ArrayBuffer; tipo: string } | null {
  return mem.audios.get(path) ?? null;
}
