// La cola de recordatorios: agendar al colgar, consumir cuando vence.
//
// Reemplaza al barrido que recorría todas las conversaciones cada minuto. La
// diferencia no es solo de costo: el barrido preguntaba "¿alguien cumplió el
// minuto?" y la respuesta casi siempre era no; acá la llamada deja escrita la
// hora exacta y nadie pregunta nada hasta que llega.
//
// SI NO HAY SUPABASE, cae a memoria del proceso igual que los demás stores, y
// lo dice por consola UNA vez. En memoria el recordatorio no sobrevive a un
// despliegue, que es justamente lo que esta tabla vino a arreglar, así que el
// aviso importa: es la señal de que la migración no se aplicó.

import { getSupabase } from "./supabase";

const TABLA = "recordatorios_agendados";

export interface CitaRecordatorio {
  id: number;
  tenant: string;
  telefono: string;
  enviarA: string;
}

/** Respaldo en memoria. Se pierde al reiniciar: es el modo degradado. */
const memoria = new Map<string, { id: number; tenant: string; telefono: string; enviarA: string }>();
let proximoId = 1;
let avisado = false;

function aviso(donde: string): void {
  if (avisado) return;
  avisado = true;
  console.warn(
    `[recordatorios-agenda] sin Supabase en ${donde}: la cola vive en memoria y se pierde en el ` +
      `proximo despliegue. Revisar la migracion 20260921120000_recordatorios_agendados.sql.`,
  );
}

const llave = (tenant: string, telefono: string) => `${tenant}:${telefono}`;

/**
 * Agenda el recordatorio para dentro de `minutos`.
 *
 * Reemplaza la cita viva que hubiera para ese número: si la persona llama dos
 * veces seguidas, lo que vale es la última llamada, no la primera.
 */
export async function agendarRecordatorio(
  tenant: string,
  telefono: string,
  minutos: number,
): Promise<void> {
  const enviarA = new Date(Date.now() + minutos * 60_000).toISOString();
  const sb = getSupabase(tenant);
  if (!sb) {
    aviso("agendar");
    memoria.set(llave(tenant, telefono), { id: proximoId++, tenant, telefono, enviarA });
    return;
  }
  // Se borra la cita viva anterior antes de poner la nueva: el índice único
  // sobre (tenant, telefono) donde procesado_ts is null no admite dos.
  await sb.from(TABLA).delete().eq("tenant", tenant).eq("telefono", telefono).is("procesado_ts", null);
  const { error } = await sb.from(TABLA).insert({ tenant, telefono, enviar_a: enviarA });
  if (error) {
    console.error("[recordatorios-agenda] no se pudo agendar:", error.message);
    memoria.set(llave(tenant, telefono), { id: proximoId++, tenant, telefono, enviarA });
  }
}

/** Las citas que ya vencieron y nadie atendió. */
export async function citasVencidas(tenant: string, ahora: Date): Promise<CitaRecordatorio[]> {
  const sb = getSupabase(tenant);
  if (!sb) {
    aviso("vencidas");
    return [...memoria.values()]
      .filter((c) => c.tenant === tenant && c.enviarA <= ahora.toISOString())
      .map((c) => ({ id: c.id, tenant: c.tenant, telefono: c.telefono, enviarA: c.enviarA }));
  }
  const { data, error } = await sb
    .from(TABLA)
    .select("id, tenant, telefono, enviar_a")
    .eq("tenant", tenant)
    .is("procesado_ts", null)
    .lte("enviar_a", ahora.toISOString())
    .order("enviar_a", { ascending: true })
    .limit(50);
  if (error) {
    console.error("[recordatorios-agenda] no se pudo leer la cola:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id as number,
    tenant: r.tenant as string,
    telefono: r.telefono as string,
    enviarA: r.enviar_a as string,
  }));
}

/**
 * Cierra la cita. Se llama SIEMPRE que se intentó, salga o no salga el mensaje.
 *
 * Si solo se cerrara al enviar, un número que la decisión descarta (porque
 * contestó, porque no sabemos su nombre) quedaría vencido para siempre y se
 * miraría en cada pasada: el mismo desperdicio que vinimos a quitar.
 */
export async function cerrarCita(tenant: string, id: number, resultado: string): Promise<void> {
  const sb = getSupabase(tenant);
  if (!sb) {
    for (const [k, v] of memoria) if (v.id === id) memoria.delete(k);
    return;
  }
  const { error } = await sb
    .from(TABLA)
    .update({ procesado_ts: new Date().toISOString(), resultado: resultado.slice(0, 200) })
    .eq("id", id);
  if (error) console.error("[recordatorios-agenda] no se pudo cerrar la cita:", error.message);
}

/**
 * Vacía la cola en memoria. SOLO para pruebas, igual que `clearHistory` en
 * wa-store: sin esto una cita de un caso se filtra al siguiente y las pruebas
 * se contaminan entre sí.
 */
export function limpiarAgendaEnMemoria(): void {
  memoria.clear();
  proximoId = 1;
  avisado = false;
}
