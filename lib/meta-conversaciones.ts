// Estado de cada conversación de Messenger e Instagram: a quién está asignada,
// en qué estado va, de qué sede es y cuántas veces se le preguntó la sede.
//
// Es el espejo de wa_conversaciones + wa_sucursal para Meta. Antes la
// asignación de estas conversaciones vivía solo en el navegador de quien la
// hizo: Verónica se asignaba un chat y al recargar, o en la pantalla de Olga,
// no existía. Y la IA no tenía dónde guardar la sede ni cuántas veces la pidió.
//
// La clave es canal:page_id:sender_id, lo mismo que identifica la conversación
// en la bandeja (metac-<canal>-<pageId>-<senderId>).

import { getSupabase } from "./supabase";
import type { MetaCanal } from "./meta-messages-store";

export interface ConversacionMeta {
  clave: string;
  tenant: string;
  canal: MetaCanal;
  pageId: string;
  senderId: string;
  asignadoA: string | null;
  estado: string | null;
  departamento: string | null;
  sucursalId: string | null;
  sucursalNombre: string | null;
  intentosSucursal: number;
  /** El último mensaje entrante que la IA ya leyó al responder (mid). */
  ultimoMidAtendido: string | null;
}

export function claveMeta(canal: MetaCanal, pageId: string, senderId: string): string {
  return `${canal}:${pageId}:${senderId}`;
}

/** Lo contrario: de la clave (o del id de la bandeja) a sus partes. */
export function partesDeClave(
  clave: string,
): { canal: MetaCanal; pageId: string; senderId: string } | null {
  const m = /^(?:metac-)?(facebook|instagram)[:-](\d+)[:-](\d+)$/.exec(clave);
  return m ? { canal: m[1] as MetaCanal, pageId: m[2], senderId: m[3] } : null;
}

const mem = new Map<string, ConversacionMeta>();

interface Fila {
  clave: string;
  tenant: string;
  canal: string;
  page_id: string;
  sender_id: string;
  asignado_a: string | null;
  estado: string | null;
  departamento: string | null;
  sucursal_id: string | null;
  sucursal_nombre: string | null;
  intentos_sucursal: number | null;
  ultimo_mid_atendido?: string | null;
}

function deFila(r: Fila): ConversacionMeta {
  return {
    clave: r.clave,
    tenant: r.tenant,
    canal: r.canal as MetaCanal,
    pageId: r.page_id,
    senderId: r.sender_id,
    asignadoA: r.asignado_a,
    estado: r.estado,
    departamento: r.departamento,
    sucursalId: r.sucursal_id,
    sucursalNombre: r.sucursal_nombre,
    intentosSucursal: r.intentos_sucursal ?? 0,
    ultimoMidAtendido: r.ultimo_mid_atendido ?? null,
  };
}

function vacia(tenant: string, clave: string): ConversacionMeta {
  const p = partesDeClave(clave);
  return {
    clave,
    tenant,
    canal: p?.canal ?? "facebook",
    pageId: p?.pageId ?? "",
    senderId: p?.senderId ?? "",
    asignadoA: null,
    estado: null,
    departamento: null,
    sucursalId: null,
    sucursalNombre: null,
    intentosSucursal: 0,
    ultimoMidAtendido: null,
  };
}

export async function getConversacionMeta(tenant: string, clave: string): Promise<ConversacionMeta> {
  const sb = getSupabase(tenant);
  if (!sb) return mem.get(clave) ?? vacia(tenant, clave);
  const { data, error } = await sb.from("meta_conversaciones").select("*").eq("clave", clave).maybeSingle();
  if (error) {
    console.error("[meta-conversaciones] select:", error.message);
    return vacia(tenant, clave);
  }
  return data ? deFila(data as Fila) : vacia(tenant, clave);
}

export async function listarConversacionesMeta(tenant: string): Promise<ConversacionMeta[]> {
  const sb = getSupabase(tenant);
  if (!sb) return [...mem.values()].filter((c) => c.tenant === tenant);
  const { data, error } = await sb.from("meta_conversaciones").select("*").eq("tenant", tenant);
  if (error) {
    console.error("[meta-conversaciones] listar:", error.message);
    return [];
  }
  return ((data ?? []) as Fila[]).map(deFila);
}

export interface CambioConversacionMeta {
  /** null explícito = desasignar; ausente = no tocar. */
  asignadoA?: string | null;
  estado?: string;
  departamento?: string;
  sucursalId?: string | null;
  sucursalNombre?: string | null;
  intentosSucursal?: number;
  ultimoMidAtendido?: string;
}

/**
 * Toma el turno de contestar el mensaje `mid`. Devuelve true solo a UNO de
 * los que lo intenten a la vez.
 *
 * POR QUÉ (2026-11-13, Facebook del hospital): Valeria contestaba dos y tres
 * veces el mismo mensaje, a unos 20 s una de otra. El sondeo de Messenger
 * corre en cada instancia que tiene el panel abierto; dos lo veían nuevo a la
 * vez y cada una armaba su respuesta. `ultimoMidAtendido` se anotaba DESPUÉS
 * de enviar, así que ninguna veía la de la otra. Ahora se reclama ANTES de
 * redactar con un UPDATE condicional: Postgres serializa los dos UPDATE sobre
 * la misma fila y el segundo ya no cumple la condición.
 */
export async function reclamarTurnoMeta(tenant: string, clave: string, mid: string): Promise<boolean> {
  const p = partesDeClave(clave);
  if (!p) return false;
  const sb = getSupabase(tenant);
  if (!sb) {
    const prev = mem.get(clave) ?? vacia(tenant, clave);
    if (prev.ultimoMidAtendido === mid) return false;
    mem.set(clave, { ...prev, ultimoMidAtendido: mid });
    return true;
  }
  try {
    // Que la fila exista (sin pisar nada si ya estaba).
    await sb
      .from("meta_conversaciones")
      .upsert(
        { clave, tenant, canal: p.canal, page_id: p.pageId, sender_id: p.senderId, updated_at: new Date().toISOString() },
        { onConflict: "clave", ignoreDuplicates: true },
      );
    const { data, error } = await sb
      .from("meta_conversaciones")
      .update({ ultimo_mid_atendido: mid, updated_at: new Date().toISOString() })
      .eq("clave", clave)
      .or(`ultimo_mid_atendido.is.null,ultimo_mid_atendido.neq."${mid.replace(/"/g, "")}"`)
      .select("clave");
    if (error) throw new Error(error.message);
    return (data ?? []).length === 1;
  } catch (e) {
    // Sin base no se deja a nadie sin respuesta: se contesta como antes.
    console.error("[meta-conversaciones] reclamar turno:", e instanceof Error ? e.message : e);
    return true;
  }
}

/** Upsert parcial: solo toca los campos que vienen. */
export async function upsertConversacionMeta(
  tenant: string,
  clave: string,
  cambio: CambioConversacionMeta,
): Promise<void> {
  const p = partesDeClave(clave);
  if (!p) throw new Error(`Clave de conversación inválida: ${clave}`);

  const sb = getSupabase(tenant);
  if (!sb) {
    const prev = mem.get(clave) ?? vacia(tenant, clave);
    mem.set(clave, {
      ...prev,
      asignadoA: "asignadoA" in cambio ? (cambio.asignadoA ?? null) : prev.asignadoA,
      estado: cambio.estado ?? prev.estado,
      departamento: cambio.departamento ?? prev.departamento,
      sucursalId: "sucursalId" in cambio ? (cambio.sucursalId ?? null) : prev.sucursalId,
      sucursalNombre: "sucursalNombre" in cambio ? (cambio.sucursalNombre ?? null) : prev.sucursalNombre,
      intentosSucursal: cambio.intentosSucursal ?? prev.intentosSucursal,
      ultimoMidAtendido: cambio.ultimoMidAtendido ?? prev.ultimoMidAtendido,
    });
    return;
  }

  const patch: Record<string, unknown> = {
    clave,
    tenant,
    canal: p.canal,
    page_id: p.pageId,
    sender_id: p.senderId,
    updated_at: new Date().toISOString(),
  };
  if ("asignadoA" in cambio) patch.asignado_a = cambio.asignadoA ?? null;
  if (cambio.estado !== undefined) patch.estado = cambio.estado;
  if (cambio.departamento !== undefined) patch.departamento = cambio.departamento;
  if ("sucursalId" in cambio) patch.sucursal_id = cambio.sucursalId ?? null;
  if ("sucursalNombre" in cambio) patch.sucursal_nombre = cambio.sucursalNombre ?? null;
  if (cambio.intentosSucursal !== undefined) patch.intentos_sucursal = cambio.intentosSucursal;
  if (cambio.ultimoMidAtendido !== undefined) patch.ultimo_mid_atendido = cambio.ultimoMidAtendido;

  const { error } = await sb.from("meta_conversaciones").upsert(patch, { onConflict: "clave" });
  if (error) throw new Error(`meta_conversaciones upsert: ${error.message}`);
}
