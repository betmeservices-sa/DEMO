// Estado de conversaciones de WhatsApp (asignacion, estado, departamento).
// Respaldado en Supabase; cae a memoria si no hay env configurado.
//
// POR PANEL (tenant): la misma persona puede escribirle a dos clientes, y
// resolver o asignar su chat en uno no puede tocar el del otro. Hasta
// 2026-10-07 la tabla era `wa_conversaciones`, solo por telefono, y ademas
// devolvia las conversaciones de TODOS los paneles a cualquiera. Tabla actual:
// `wa_conversacion_estado` (tenant, wa_from).
import { getSupabase } from "./supabase";

export interface Conversacion {
  wa_from: string;
  asignado_a: string | null;
  estado: string | null;
  departamento: string | null;
}

// Fallback en memoria, por panel.
const memConvs = new Map<string, Map<string, Conversacion>>();

function memDe(tenant: string): Map<string, Conversacion> {
  let m = memConvs.get(tenant);
  if (!m) memConvs.set(tenant, (m = new Map()));
  return m;
}

export async function getConversaciones(tenant: string): Promise<Conversacion[]> {
  const sb = getSupabase();
  if (!sb) return Array.from(memDe(tenant).values());
  const { data, error } = await sb
    .from("wa_conversacion_estado")
    .select("wa_from, asignado_a, estado, departamento")
    .eq("tenant", tenant);
  if (error) {
    console.error("wa_conversacion_estado select:", error.message);
    return [];
  }
  return (data ?? []) as Conversacion[];
}

export async function upsertConversacion(
  tenant: string,
  c: {
    wa_from: string;
    asignado_a?: string | null;
    estado?: string;
    departamento?: string;
  },
): Promise<void> {
  const sb = getSupabase();

  if (!sb) {
    const mem = memDe(tenant);
    const prev = mem.get(c.wa_from) ?? {
      wa_from: c.wa_from,
      asignado_a: null,
      estado: null,
      departamento: null,
    };
    // null explicito desasigna; undefined no toca el campo.
    mem.set(c.wa_from, {
      wa_from: c.wa_from,
      asignado_a: "asignado_a" in c ? (c.asignado_a ?? null) : prev.asignado_a,
      estado: c.estado !== undefined ? c.estado : (prev.estado ?? null),
      departamento: c.departamento !== undefined ? c.departamento : (prev.departamento ?? null),
    });
    return;
  }

  // Solo incluye los campos presentes en el objeto (upsert parcial).
  const patch: Record<string, unknown> = {
    tenant,
    wa_from: c.wa_from,
    updated_at: new Date().toISOString(),
  };
  // "asignado_a" in c distingue null explicito de undefined (campo ausente).
  if ("asignado_a" in c) patch.asignado_a = c.asignado_a ?? null;
  if (c.estado !== undefined) patch.estado = c.estado;
  if (c.departamento !== undefined) patch.departamento = c.departamento;

  const { error } = await sb.from("wa_conversacion_estado").upsert(patch, { onConflict: "tenant,wa_from" });
  if (error) console.error("wa_conversacion_estado upsert:", error.message);
}
