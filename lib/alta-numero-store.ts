// Dónde vive el estado de cada corrida del alta.
//
// Mismo patrón que el resto del panel: Supabase cuando hay llave, memoria de
// respaldo para dev local. Pero acá el respaldo en memoria es solo para las
// pruebas: en Vercel la pantalla y el webhook del agente son procesos distintos,
// así que sin base la corrida no avanzaría nunca (ver el comentario de la
// migración). `hayBase()` lo dice para que la ruta pueda avisar en vez de
// quedarse colgada.

import { getSupabase } from "./supabase";
import type { Corrida, EstadoCorrida, Paso } from "./alta-numero";

const TABLA = "alta_numero_corridas";

const g = globalThis as unknown as { __altaNumero?: Map<string, Corrida> };
const memoria: Map<string, Corrida> = (g.__altaNumero ??= new Map());

export function hayBase(): boolean {
  return getSupabase("comercial") !== null;
}

function aFila(c: Corrida, tenant: string): Record<string, unknown> {
  return {
    id: c.id,
    tenant,
    numero: c.numero,
    phone_number_id: c.phoneNumberId,
    paso: c.paso,
    estado: c.estado,
    codigo: c.codigo,
    oido: c.oido,
    error: c.error,
    iniciado_en: c.iniciadoEn,
    terminado_en: c.terminadoEn,
    marcas: c.marcas,
    actualizado: new Date().toISOString(),
  };
}

function deFila(r: Record<string, unknown>): Corrida {
  return {
    id: String(r.id),
    numero: String(r.numero),
    phoneNumberId: (r.phone_number_id as string | null) ?? null,
    paso: r.paso as Paso,
    estado: r.estado as EstadoCorrida,
    codigo: (r.codigo as string | null) ?? null,
    oido: (r.oido as string | null) ?? null,
    error: (r.error as string | null) ?? null,
    iniciadoEn: new Date(String(r.iniciado_en)).toISOString(),
    terminadoEn: r.terminado_en ? new Date(String(r.terminado_en)).toISOString() : null,
    marcas: (r.marcas as Partial<Record<Paso, string>>) ?? {},
  };
}

export async function guardarCorrida(c: Corrida, tenant = "comercial"): Promise<void> {
  memoria.set(c.id, c);
  const sb = getSupabase(tenant);
  if (!sb) return;
  const { error } = await sb.from(TABLA).upsert(aFila(c, tenant), { onConflict: "id" });
  if (error) console.error("[alta-numero] guardar:", error.message);
}

export async function leerCorrida(id: string, tenant = "comercial"): Promise<Corrida | null> {
  const sb = getSupabase(tenant);
  if (sb) {
    const { data, error } = await sb.from(TABLA).select("*").eq("id", id).limit(1);
    if (!error && data && data.length) return deFila(data[0] as Record<string, unknown>);
  }
  return memoria.get(id) ?? null;
}

/**
 * La corrida viva de una línea. La necesita el webhook del agente: Vapi avisa
 * con el número al que entró la llamada, no con el id de la corrida.
 */
export async function corridaVivaDe(numero: string, tenant = "comercial"): Promise<Corrida | null> {
  const sb = getSupabase(tenant);
  if (sb) {
    const { data, error } = await sb
      .from(TABLA)
      .select("*")
      .eq("numero", numero)
      .eq("estado", "corriendo")
      .order("iniciado_en", { ascending: false })
      .limit(1);
    if (!error && data && data.length) return deFila(data[0] as Record<string, unknown>);
  }
  const vivas = [...memoria.values()]
    .filter((c) => c.numero === numero && c.estado === "corriendo")
    .sort((a, b) => b.iniciadoEn.localeCompare(a.iniciadoEn));
  return vivas[0] ?? null;
}

export async function ultimasCorridas(tenant = "comercial", tope = 10): Promise<Corrida[]> {
  const sb = getSupabase(tenant);
  if (sb) {
    const { data, error } = await sb
      .from(TABLA)
      .select("*")
      .eq("tenant", tenant)
      .order("iniciado_en", { ascending: false })
      .limit(tope);
    if (!error && data) return (data as Record<string, unknown>[]).map(deFila);
  }
  return [...memoria.values()]
    .sort((a, b) => b.iniciadoEn.localeCompare(a.iniciadoEn))
    .slice(0, tope);
}

/** Para las pruebas. */
export function olvidarCorridas(): void {
  memoria.clear();
}
