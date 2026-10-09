// La ruta de Vapi de una agente de voz que sigue la demo por WhatsApp. Cada
// agente tiene la suya (app/api/webhooks/vapi/<panel>/route.ts) y todas
// atienden igual, con lo de su agente (lib/seguir-por-whatsapp.ts).
//
// Dos cosas llegan:
//   1. "seguir_por_whatsapp" (en plena llamada): le manda la plantilla con la
//      que la misma agente abre el chat desde el número del panel, la deja en
//      el hilo de la bandeja, guarda lo que van hablando y le contesta a la
//      agente de voz al instante para que se lo diga a la persona.
//   2. "end-of-call-report" (al colgar): guarda el resumen y la conversación
//      completa, para que la agente de WhatsApp sepa todo lo que se habló.
//
// PÚBLICA (la llama Vapi) y valida el secreto. Cada ruta solo atiende a SU
// agente: con el secreto filtrado, nadie puede usarla para mandar plantillas a
// cualquier número desde otro agente. Nunca responde 5xx: Vapi reintentaría y
// la persona recibiría dos mensajes.

import { NextResponse } from "next/server";
import { secretoVapiValido } from "./vapi-secreto";
import { buscarToolCall } from "./callback-llamada";
import { enviarPlantilla } from "./wa-send";
import { addOutbound } from "./wa-store";
import { encenderIaSiNadieDecidio } from "./ai-store";
import { guardarContextoLlamada, transcriptDe } from "./llamada-contexto";
import { NOMBRE_TOOL_WHATSAPP, numeroWhatsApp, type AgenteSeguirPorWhatsApp } from "./seguir-por-whatsapp";

interface CuerpoVapi {
  message?: {
    type?: string;
    call?: {
      id?: string;
      assistantId?: string;
      customer?: { number?: string };
      assistantOverrides?: { variableValues?: Record<string, unknown> };
    };
    customer?: { number?: string };
    artifact?: unknown;
    analysis?: { summary?: string };
    summary?: string;
    transcript?: string;
  };
}

// Una sola plantilla por llamada y número, aunque el modelo llame dos veces a
// la herramienta en la misma llamada.
const g = globalThis as unknown as { __whatsappPorLlamada?: Set<string> };
const yaEnviados: Set<string> = (g.__whatsappPorLlamada ??= new Set());

function respuesta(toolCallId: string, texto: string) {
  return NextResponse.json({ results: [{ toolCallId, result: texto }] });
}

/** Al colgar: el resumen y la conversación completa, para la agente de WhatsApp. */
async function alColgar(msg: NonNullable<CuerpoVapi["message"]>, a: AgenteSeguirPorWhatsApp) {
  if (msg.call?.assistantId !== a.assistantId) return NextResponse.json({ ok: true, ignorado: "otro agente" });
  const telefono = numeroWhatsApp(msg.call?.customer?.number ?? msg.customer?.number);
  if (!telefono) return NextResponse.json({ ok: true, ignorado: "sin número" });
  const transcript =
    transcriptDe(msg.artifact, a.agente) ??
    (typeof msg.transcript === "string" ? transcriptDe({ transcript: msg.transcript }, a.agente) : null);
  const resumen = msg.analysis?.summary || msg.summary || null;
  try {
    await guardarContextoLlamada({ tenant: a.tenant, telefono, callId: msg.call?.id ?? null, resumen, transcript });
  } catch (err) {
    console.error(`[seguir-por-whatsapp:${a.tenant}] no se pudo guardar el contexto al colgar:`, err);
  }
  return NextResponse.json({ ok: true, guardado: Boolean(resumen || transcript) });
}

export async function atenderVapiSeguirPorWhatsApp(req: Request, a: AgenteSeguirPorWhatsApp): Promise<Response> {
  if (!secretoVapiValido(req)) return NextResponse.json({ ok: false }, { status: 401 });

  let body: CuerpoVapi;
  try {
    body = (await req.json()) as CuerpoVapi;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const msg = body.message;
  if (msg?.type === "end-of-call-report") return alColgar(msg, a);

  const tool = buscarToolCall(msg, NOMBRE_TOOL_WHATSAPP);
  if (!tool) return NextResponse.json({ ok: true, ignorado: msg?.type ?? "sin tipo" });

  const log = `[seguir-por-whatsapp:${a.tenant}]`;
  if (msg?.call?.assistantId !== a.assistantId) {
    console.error(`${log} agente no autorizado:`, msg?.call?.assistantId);
    return respuesta(tool.id, a.respuestas.otroAgente);
  }

  const vars = msg.call.assistantOverrides?.variableValues ?? {};
  const numero = numeroWhatsApp(tool.args.telefono || msg.call.customer?.number || msg.customer?.number);
  if (!numero) return respuesta(tool.id, a.respuestas.sinNumero);

  const clave = `${msg.call.id ?? "sin-id"}|${numero}`;
  if (yaEnviados.has(clave)) return respuesta(tool.id, a.respuestas.repetido);

  const nombre = tool.args.nombre || vars.nombre;

  // Lo que van hablando, ANTES del envío: si la persona contesta el WhatsApp
  // mientras sigue al teléfono, la agente de WhatsApp ya lo tiene.
  try {
    const resumen = typeof tool.args.resumen === "string" ? tool.args.resumen : null;
    await guardarContextoLlamada({
      tenant: a.tenant,
      telefono: numero,
      callId: msg.call.id ?? null,
      resumen,
      transcript: transcriptDe(msg.artifact, a.agente),
    });
  } catch (err) {
    console.error(`${log} no se pudo guardar el contexto:`, err);
  }

  try {
    const env = await enviarPlantilla(numero, a.plantilla.nombre, a.plantilla.idioma, a.variables(nombre), {
      tenant: a.tenant,
    });
    if (!env.ok) {
      console.error(`${log} no se pudo enviar:`, env.error);
      return respuesta(tool.id, a.respuestas.fallo);
    }
    yaEnviados.add(clave);
    if (env.id) {
      await addOutbound({ waId: env.id, to: numero, texto: a.texto(nombre), ts: new Date().toISOString(), tenant: a.tenant });
    }
    // Cuando conteste, que le responda la misma agente (si nadie la apagó a
    // mano en ese chat).
    await encenderIaSiNadieDecidio(a.tenant, numero);
    console.log(`${log} plantilla enviada a …${numero.slice(-4)} (llamada ${msg.call.id ?? "?"})`);
    return respuesta(tool.id, a.respuestas.enviado);
  } catch (err) {
    console.error(log, err);
    return respuesta(tool.id, a.respuestas.fallo);
  }
}
