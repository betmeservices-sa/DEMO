import { NextResponse } from "next/server";
import { secretoVapiValido } from "@/lib/vapi-secreto";
import { buscarToolCall } from "@/lib/callback-llamada";
import { enviarPlantilla } from "@/lib/wa-send";
import { addOutbound } from "@/lib/wa-store";
import { encenderIaSiNadieDecidio } from "@/lib/ai-store";
import { guardarContextoLlamada, transcriptDe } from "@/lib/llamada-contexto";
import {
  ASISTENTE_CONFERENCIA,
  NOMBRE_TOOL_WHATSAPP,
  PLANTILLA_SOFIA,
  RESPUESTA_SOFIA,
  TENANT_COMERCIAL,
  numeroWhatsApp,
  textoSofia,
  variablesSofia,
} from "@/lib/seguir-por-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Sofía de la llamada demo de la conferencia, en el panel comercial.
//
// Dos cosas llegan acá:
//   1. "seguir_por_whatsapp" (en plena llamada): le manda la plantilla con la
//      que la misma Sofía abre el chat desde el número comercial, la deja en
//      el hilo de la bandeja, guarda lo que van hablando y le contesta a la
//      Sofía de voz al instante para que se lo diga a la persona.
//   2. "end-of-call-report" (al colgar): guarda el resumen y la conversación
//      completa, para que la Sofía de WhatsApp sepa todo lo que se habló.
//
// PÚBLICA (la llama Vapi) y valida el secreto. Solo atiende al agente de la
// conferencia: con el secreto filtrado, nadie puede usarla para mandar
// plantillas a cualquier número desde otro agente. Nunca responde 5xx: Vapi
// reintentaría y la persona recibiría dos mensajes.

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

/** Al colgar: el resumen y la conversación completa, para la Sofía de WhatsApp. */
async function alColgar(msg: NonNullable<CuerpoVapi["message"]>) {
  if (msg.call?.assistantId !== ASISTENTE_CONFERENCIA) return NextResponse.json({ ok: true, ignorado: "otro agente" });
  const telefono = numeroWhatsApp(msg.call?.customer?.number ?? msg.customer?.number);
  if (!telefono) return NextResponse.json({ ok: true, ignorado: "sin número" });
  const transcript =
    transcriptDe(msg.artifact) ?? (typeof msg.transcript === "string" ? transcriptDe({ transcript: msg.transcript }) : null);
  const resumen = msg.analysis?.summary || msg.summary || null;
  try {
    await guardarContextoLlamada({ tenant: TENANT_COMERCIAL, telefono, callId: msg.call?.id ?? null, resumen, transcript });
  } catch (err) {
    console.error("[sofia-comercial] no se pudo guardar el contexto al colgar:", err);
  }
  return NextResponse.json({ ok: true, guardado: Boolean(resumen || transcript) });
}

export async function POST(req: Request) {
  if (!secretoVapiValido(req)) return NextResponse.json({ ok: false }, { status: 401 });

  let body: CuerpoVapi;
  try {
    body = (await req.json()) as CuerpoVapi;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const msg = body.message;
  if (msg?.type === "end-of-call-report") return alColgar(msg);

  const tool = buscarToolCall(msg, NOMBRE_TOOL_WHATSAPP);
  if (!tool) return NextResponse.json({ ok: true, ignorado: msg?.type ?? "sin tipo" });

  if (msg?.call?.assistantId !== ASISTENTE_CONFERENCIA) {
    console.error("[seguir-por-whatsapp] agente no autorizado:", msg?.call?.assistantId);
    return respuesta(tool.id, RESPUESTA_SOFIA.otroAgente);
  }

  const vars = msg.call.assistantOverrides?.variableValues ?? {};
  const numero = numeroWhatsApp(tool.args.telefono || msg.call.customer?.number || msg.customer?.number);
  if (!numero) return respuesta(tool.id, RESPUESTA_SOFIA.sinNumero);

  const clave = `${msg.call.id ?? "sin-id"}|${numero}`;
  if (yaEnviados.has(clave)) return respuesta(tool.id, RESPUESTA_SOFIA.repetido);

  const nombre = tool.args.nombre || vars.nombre;

  // Lo que van hablando, ANTES del envío: si la persona contesta el WhatsApp
  // mientras sigue al teléfono, la Sofía de WhatsApp ya lo tiene.
  try {
    const resumen = typeof tool.args.resumen === "string" ? tool.args.resumen : null;
    await guardarContextoLlamada({
      tenant: TENANT_COMERCIAL,
      telefono: numero,
      callId: msg.call.id ?? null,
      resumen,
      transcript: transcriptDe(msg.artifact),
    });
  } catch (err) {
    console.error("[seguir-por-whatsapp] no se pudo guardar el contexto:", err);
  }

  try {
    const env = await enviarPlantilla(numero, PLANTILLA_SOFIA, "es", variablesSofia(nombre), { tenant: TENANT_COMERCIAL });
    if (!env.ok) {
      console.error("[seguir-por-whatsapp] no se pudo enviar:", env.error);
      return respuesta(tool.id, RESPUESTA_SOFIA.fallo);
    }
    yaEnviados.add(clave);
    if (env.id) {
      await addOutbound({ waId: env.id, to: numero, texto: textoSofia(nombre), ts: new Date().toISOString(), tenant: TENANT_COMERCIAL });
    }
    // Cuando conteste, que le responda Sofía (si nadie la apagó a mano en ese chat).
    await encenderIaSiNadieDecidio(TENANT_COMERCIAL, numero);
    console.log(`[seguir-por-whatsapp] plantilla enviada a …${numero.slice(-4)} (llamada ${msg.call.id ?? "?"})`);
    return respuesta(tool.id, RESPUESTA_SOFIA.enviado);
  } catch (err) {
    console.error("[seguir-por-whatsapp]", err);
    return respuesta(tool.id, RESPUESTA_SOFIA.fallo);
  }
}
