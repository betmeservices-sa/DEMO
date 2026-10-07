// Lo que se habló por teléfono, para que el agente de WhatsApp lo sepa.
//
// En el panel comercial la agente de voz y la de WhatsApp son LA MISMA Sofía:
// si en la llamada la persona contó que tiene una clínica y que pierde
// mensajes de noche, la Sofía de WhatsApp no puede volver a preguntárselo.
//
// Se guarda la última llamada de cada teléfono EN CADA PANEL (tenant,
// telefono), en dos momentos: cuando Sofía usa "seguir_por_whatsapp" (con el
// resumen que ella misma escribe y lo que va de la conversación) y al colgar
// (el resumen de Vapi y la transcripción completa). Tabla `llamada_contexto`.
//
// Lo puro (leer el payload de Vapi, armar el bloque para el guion) va arriba y
// está probado; la base, abajo.

import { getSupabase } from "./supabase";

export interface ContextoLlamada {
  tenant: string;
  telefono: string;
  callId: string | null;
  resumen: string | null;
  transcript: string | null;
  actualizado: string;
}

/** Solo dígitos, con 503 si vino local. Igual que el `from` de WhatsApp. */
export function telefonoClave(raw: unknown): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (d.length === 8) return `503${d}`;
  return d.length >= 10 && d.length <= 15 ? d : null;
}

interface MensajeArtefacto {
  role?: string;
  message?: string;
  content?: string;
}

/**
 * La conversación de la llamada como texto ("Sofía: ... / Persona: ...").
 * Vapi la manda como `artifact.transcript` (texto) al colgar y como
 * `artifact.messages` mientras la llamada sigue. Se aceptan las dos.
 */
export function transcriptDe(artifact: unknown): string | null {
  const a = (artifact ?? {}) as { transcript?: unknown; messages?: unknown };
  if (typeof a.transcript === "string" && a.transcript.trim()) {
    return a.transcript.replace(/^AI:/gm, "Sofía:").replace(/^User:/gm, "Persona:").trim();
  }
  if (Array.isArray(a.messages)) {
    const lineas = (a.messages as MensajeArtefacto[])
      .map((m) => {
        const texto = (m.message ?? m.content ?? "").trim();
        if (!texto) return null;
        if (m.role === "user") return `Persona: ${texto}`;
        if (m.role === "bot" || m.role === "assistant") return `Sofía: ${texto}`;
        return null; // system, tool_calls, tool_call_result: no son la conversación
      })
      .filter((l): l is string => Boolean(l));
    return lineas.length ? lineas.join("\n") : null;
  }
  return null;
}

const MAX_TRANSCRIPT = 6000;
const VIGENCIA_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * El bloque que se le pega al guion del agente de WhatsApp. Vacío si no hay
 * llamada o si fue hace más de dos semanas (ya no es "lo que hablamos").
 */
export function bloqueContextoLlamada(c: ContextoLlamada | null, ahora = Date.now()): string {
  if (!c || (!c.resumen && !c.transcript)) return "";
  if (ahora - new Date(c.actualizado).getTime() > VIGENCIA_MS) return "";
  let transcript = c.transcript ?? "";
  if (transcript.length > MAX_TRANSCRIPT) transcript = "[...]\n" + transcript.slice(-MAX_TRANSCRIPT);
  const partes = [
    "",
    "",
    "LO QUE HABLASTE CON ESTA PERSONA POR TELÉFONO",
    "Tú misma hablaste con esta persona en una llamada (eres la misma Sofía). Úsalo para no volver a preguntar lo que ya te dijo y para retomar donde quedaron. No lo recites: menciona como mucho una cosa, como quien se acuerda.",
  ];
  if (c.resumen) partes.push(`Resumen: ${c.resumen}`);
  if (transcript) partes.push(`Conversación de la llamada:\n${transcript}`);
  return partes.join("\n");
}

// ── Base ──

const mem = new Map<string, ContextoLlamada>();
const llave = (tenant: string, tel: string) => `${tenant}|${tel}`;

/**
 * Guarda o completa el contexto de la última llamada. Lo que no viene no pisa
 * lo que había: el resumen de la herramienta sobrevive aunque al colgar Vapi
 * no mande resumen, y la transcripción final reemplaza a la parcial.
 */
export async function guardarContextoLlamada(c: {
  tenant: string;
  telefono: string;
  callId?: string | null;
  resumen?: string | null;
  transcript?: string | null;
}): Promise<void> {
  const tel = telefonoClave(c.telefono);
  if (!tel) return;
  const previo = await leerContextoLlamada(c.tenant, tel);
  // Si es OTRA llamada, lo de la anterior no se mezcla.
  const mismaLlamada = previo && (!c.callId || !previo.callId || previo.callId === c.callId);
  const base = mismaLlamada ? previo : null;
  const registro: ContextoLlamada = {
    tenant: c.tenant,
    telefono: tel,
    callId: c.callId ?? base?.callId ?? null,
    resumen: c.resumen?.trim() || base?.resumen || null,
    transcript: c.transcript?.trim() || base?.transcript || null,
    actualizado: new Date().toISOString(),
  };
  mem.set(llave(c.tenant, tel), registro);
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("llamada_contexto").upsert(
    {
      tenant: registro.tenant,
      telefono: registro.telefono,
      call_id: registro.callId,
      resumen: registro.resumen,
      transcript: registro.transcript,
      actualizado: registro.actualizado,
    },
    { onConflict: "tenant,telefono" },
  );
  if (error) console.error("[llamada-contexto] guardar:", error.message);
}

export async function leerContextoLlamada(tenant: string, telefono: string): Promise<ContextoLlamada | null> {
  const tel = telefonoClave(telefono);
  if (!tel) return null;
  const sb = getSupabase();
  if (!sb) return mem.get(llave(tenant, tel)) ?? null;
  const { data, error } = await sb
    .from("llamada_contexto")
    .select("tenant, telefono, call_id, resumen, transcript, actualizado")
    .eq("tenant", tenant)
    .eq("telefono", tel)
    .maybeSingle();
  if (error) {
    console.error("[llamada-contexto] leer:", error.message);
    return mem.get(llave(tenant, tel)) ?? null;
  }
  if (!data) return null;
  const r = data as Record<string, string | null>;
  return {
    tenant: r.tenant as string,
    telefono: r.telefono as string,
    callId: r.call_id,
    resumen: r.resumen,
    transcript: r.transcript,
    actualizado: r.actualizado as string,
  };
}

/** Los paneles cuyo agente de WhatsApp lee lo que se habló por teléfono. */
const PANELES_CON_CONTEXTO = new Set(["comercial"]);

/** El bloque para el guion, o "" si el panel no lo usa o no hubo llamada. */
export async function contextoDeLlamadaPara(tenant: string | undefined, telefono: string | undefined): Promise<string> {
  if (!tenant || !telefono || !PANELES_CON_CONTEXTO.has(tenant)) return "";
  try {
    return bloqueContextoLlamada(await leerContextoLlamada(tenant, telefono));
  } catch (err) {
    console.error("[llamada-contexto]", err);
    return "";
  }
}
