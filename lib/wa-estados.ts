import { getSupabase } from "./supabase";

// Lo que Meta avisa de cada mensaje saliente: enviado, entregado, leído o
// fallido. Que Meta acepte un envío NO quiere decir que llegó: la entrega real
// viene después en `statuses` del webhook. Ver la migración wa_estados.

export interface EstadoWa {
  waId: string;
  estado: string;
  ts: string;
  destinatario?: string;
  errorCodigo?: number;
  errorTitulo?: string;
}

interface StatusMeta {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: Array<{ code?: number; title?: string; message?: string }>;
}

/** Saca los estados de entrega de un webhook de WhatsApp. Puro, sin red. */
export function estadosDelWebhook(payload: unknown): EstadoWa[] {
  const salida: EstadoWa[] = [];
  const entries = (payload as { entry?: unknown[] })?.entry ?? [];
  for (const entry of entries) {
    for (const change of (entry as { changes?: unknown[] })?.changes ?? []) {
      const value = (change as { value?: { statuses?: StatusMeta[] } })?.value;
      for (const s of value?.statuses ?? []) {
        if (!s?.id || !s?.status) continue;
        const error = s.errors?.[0];
        salida.push({
          waId: s.id,
          estado: s.status,
          ts: s.timestamp ? new Date(Number(s.timestamp) * 1000).toISOString() : new Date().toISOString(),
          destinatario: s.recipient_id,
          ...(error ? { errorCodigo: error.code, errorTitulo: error.title ?? error.message } : {}),
        });
      }
    }
  }
  return salida;
}

/** Guarda los estados. Nunca tira: si falla, se registra y el webhook sigue. */
export async function guardarEstados(estados: EstadoWa[], tenant?: string): Promise<void> {
  if (estados.length === 0) return;
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("wa_estados").upsert(
    estados.map((e) => ({
      wa_id: e.waId,
      estado: e.estado,
      ts: e.ts,
      destinatario: e.destinatario ?? null,
      tenant: tenant ?? null,
      error_codigo: e.errorCodigo ?? null,
      error_titulo: e.errorTitulo ?? null,
    })),
    { onConflict: "wa_id,estado", ignoreDuplicates: true },
  );
  if (error) console.error("wa_estados upsert:", error.message);
}
