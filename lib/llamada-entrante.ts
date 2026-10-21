// Cuando alguien LLAMA al número de un panel donde la de voz y la de WhatsApp
// son la misma agente (MiAgentIA: Sofía en el 2505 4610, que es su número de
// WhatsApp y de voz a la vez).
//
// La línea no tiene agente fijo en Vapi: tiene esta ruta como servidor, y Vapi
// pregunta aquí con quién contestar ("assistant-request"). Se responde con la
// misma Sofía y, encima, lo que esa persona ya habló: el chat de WhatsApp y la
// última llamada. Así, quien escribió por WhatsApp y después marca no tiene
// que contar todo otra vez. El otro sentido (de la llamada al chat) ya existía:
// lib/llamada-contexto.ts.
//
// LO QUE NO PUEDE PASAR es que la llamada se caiga por esto: Vapi espera la
// respuesta unos pocos segundos. Por eso la lectura tiene un tope de tiempo y,
// pase lo que pase (base caída, sin secreto, sin historia), se contesta con la
// agente. Sin contexto, Sofía atiende igual que siempre.

import { NextResponse } from "next/server";
import { secretoVapiValido } from "./vapi-secreto";
import { getContacto } from "./contacts-store";
import { normalizarTelefono } from "./memoria-llamadas";
import { contextoDelChat, nombreDeFicha, type MensajeDelHilo } from "./pedido-de-llamada";
import { leerContextoLlamada, telefonoClave, type ContextoLlamada } from "./llamada-contexto";
import { mensajesAnteriores } from "./wa-store";
import type { AgenteSeguirPorWhatsApp } from "./seguir-por-whatsapp";

/** Cuántos mensajes del chat se leen. */
const HILO = 20;
/** Lo de hace más de dos semanas ya no es "lo que hablamos" (igual que en WhatsApp). */
const VIGENCIA_MS = 14 * 24 * 60 * 60 * 1000;
/** Lo que se espera a la base antes de contestar sin contexto. */
const TOPE_MS = 3500;

export interface EntradaContexto {
  chat: MensajeDelHilo[];
  llamada: ContextoLlamada | null;
  ahora: number;
}

/**
 * Lo que ya se habló, para la variable {{contexto}} del guion de voz. Vacío si
 * no hay nada reciente.
 */
export function contextoEntrante(e: EntradaContexto): string {
  const partes: string[] = [];

  const chat = contextoDelChat(e.chat.filter((m) => e.ahora - new Date(m.ts).getTime() <= VIGENCIA_MS));
  if (chat) partes.push(`Por WhatsApp:\n${chat}`);

  const l = e.llamada;
  if (l && e.ahora - new Date(l.actualizado).getTime() <= VIGENCIA_MS) {
    if (l.resumen) partes.push(`En la última llamada: ${l.resumen}`);
    else if (l.transcript) partes.push(`En la última llamada (lo último que se dijo):\n${l.transcript.slice(-1200)}`);
  }

  return partes.join("\n\n");
}

/** El saludo cuando ya se conocen: no se presenta desde cero. */
export function saludoDeRegreso(nombre: string | null): string {
  const primer = (nombre ?? "").trim().split(/\s+/)[0];
  return `Hola${primer ? `, ${primer}` : ""}, soy Sofía de MiAgentIA. Qué gusto hablar contigo otra vez. ¿En qué te ayudo?`;
}

/**
 * La respuesta a Vapi. Siempre con la agente; las variables y el saludo, solo
 * si hay de qué acordarse.
 */
export function respuestaEntrante(assistantId: string, contexto: string, nombre: string | null) {
  if (!contexto) {
    return { assistantId, assistantOverrides: { variableValues: { llamada_entrante: "si" } } };
  }
  return {
    assistantId,
    assistantOverrides: {
      firstMessage: saludoDeRegreso(nombre),
      variableValues: { llamada_entrante: "si", contexto, nombre: nombre ?? "" },
    },
  };
}

async function leer(tenant: string, telefono: string) {
  const [{ mensajes }, llamada, ficha] = await Promise.all([
    mensajesAnteriores(telefono, null, HILO, tenant),
    leerContextoLlamada(tenant, telefono),
    getContacto(normalizarTelefono(telefono)).catch(() => null),
  ]);
  const chat: MensajeDelHilo[] = mensajes.map((m) => ({ direction: m.direccion, texto: m.texto ?? "", ts: m.ts }));
  return { chat, llamada, nombre: nombreDeFicha(ficha, tenant) };
}

interface CuerpoEntrante {
  message?: { call?: { customer?: { number?: string } }; customer?: { number?: string } };
}

export async function atenderLlamadaEntrante(req: Request, a: AgenteSeguirPorWhatsApp) {
  const log = `[llamada-entrante:${a.tenant}]`;
  // Sin secreto se atiende igual, pero sin leer nada de nadie.
  if (!secretoVapiValido(req)) return NextResponse.json(respuestaEntrante(a.assistantId, "", null));

  let body: CuerpoEntrante = {};
  try {
    body = (await req.json()) as CuerpoEntrante;
  } catch {
    /* sin cuerpo: se atiende sin contexto */
  }
  const telefono = telefonoClave(body.message?.call?.customer?.number ?? body.message?.customer?.number);
  if (!telefono) return NextResponse.json(respuestaEntrante(a.assistantId, "", null));

  try {
    const tope = new Promise<null>((r) => setTimeout(() => r(null), TOPE_MS));
    const leido = await Promise.race([leer(a.tenant, telefono), tope]);
    if (!leido) {
      console.error(`${log} ${telefono}: la base no contestó a tiempo, se atiende sin contexto`);
      return NextResponse.json(respuestaEntrante(a.assistantId, "", null));
    }
    const contexto = contextoEntrante({ chat: leido.chat, llamada: leido.llamada, ahora: Date.now() });
    console.log(`${log} ${telefono}: ${contexto ? `con contexto (${contexto.length} caracteres)` : "sin historia"}`);
    return NextResponse.json(respuestaEntrante(a.assistantId, contexto, leido.nombre));
  } catch (err) {
    console.error(`${log} ${telefono}:`, err);
    return NextResponse.json(respuestaEntrante(a.assistantId, "", null));
  }
}
