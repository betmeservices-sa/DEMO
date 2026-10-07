// Estado del Modo IA, respaldado en Supabase para que el webhook (always-on,
// server-side) lo lea. Si no hay Supabase, cae a memoria (solo sirve en local).
//
// ── TODO VA POR PANEL (tenant) ──
// Cada panel es independiente: encender la IA en un chat de Nissan no puede
// encenderla para esa misma persona en el panel comercial, y el "Modo IA" de
// un panel no mueve a los demas. Hasta 2026-10-07 las dos cosas eran globales
// (`ai_paused` por telefono y `ai_config` fila 1): una prueba en un panel hizo
// que Mia le contestara al mismo telefono en otro numero que tenia la IA
// apagada. Tablas: `ai_chat` (tenant, wa_from) y `ai_config_tenant` (tenant).
import { getSupabase } from "./supabase";

const memEnabled = new Map<string, boolean>(); // tenant -> Modo IA
const memOverride = new Map<string, boolean>(); // `${tenant}|${from}` -> true=ON, false=OFF; ausente=seguir

const clave = (tenant: string, from: string) => `${tenant}|${from}`;

// Modo IA del panel (default para sus chats sin override ni numero propio).
export async function getAiEnabled(tenant: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return memEnabled.get(tenant) ?? false;
  const { data, error } = await sb.from("ai_config_tenant").select("enabled").eq("tenant", tenant).maybeSingle();
  if (error) {
    console.error("ai_config_tenant select:", error.message);
    return false;
  }
  return Boolean(data?.enabled);
}

export async function setAiEnabled(tenant: string, enabled: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    memEnabled.set(tenant, enabled);
    return;
  }
  const { error } = await sb
    .from("ai_config_tenant")
    .upsert({ tenant, enabled, updated_at: new Date().toISOString() }, { onConflict: "tenant" });
  if (error) console.error("ai_config_tenant upsert:", error.message);
}

// Override de UNA conversacion de UN panel: true = IA forzada ON, false = OFF,
// null = seguir al numero o al Modo IA del panel.
export async function getChatOverride(tenant: string, from: string): Promise<boolean | null> {
  const sb = getSupabase();
  if (!sb) {
    const k = clave(tenant, from);
    return memOverride.has(k) ? (memOverride.get(k) as boolean) : null;
  }
  const { data, error } = await sb
    .from("ai_chat")
    .select("activa")
    .eq("tenant", tenant)
    .eq("wa_from", from)
    .maybeSingle();
  if (error) {
    console.error("ai_chat select:", error.message);
    return null;
  }
  if (!data) return null;
  return Boolean((data as { activa?: boolean }).activa);
}

export async function setChatOverride(tenant: string, from: string, activa: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    memOverride.set(clave(tenant, from), activa);
    return;
  }
  const { error } = await sb
    .from("ai_chat")
    .upsert({ tenant, wa_from: from, activa, updated_at: new Date().toISOString() }, { onConflict: "tenant,wa_from" });
  if (error) console.error("ai_chat upsert:", error.message);
}

// Al abrir un chat con una plantilla automatica: la IA queda encendida para que
// el agente conteste cuando la persona responda. Si alguien ya la prendio o
// apago a mano en ese chat de ese panel, se respeta.
export async function encenderIaSiNadieDecidio(tenant: string, from: string): Promise<void> {
  if ((await getChatOverride(tenant, from)) === null) await setChatOverride(tenant, from, true);
}

// La IA esta activa para este chat de este panel? Usa el override del chat si
// existe; si no, el interruptor del NUMERO al que escribieron
// (wa_connections.ia_activa) si lo tiene; y si no, el Modo IA del panel.
export async function getChatAiActiva(
  tenant: string,
  from: string,
  delNumero: boolean | null = null,
): Promise<boolean> {
  const ov = await getChatOverride(tenant, from);
  if (ov !== null) return ov;
  if (delNumero !== null) return delNumero;
  return getAiEnabled(tenant);
}
