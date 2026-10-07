import { NextResponse } from "next/server";
import { secretoVapiValido } from "@/lib/vapi-secreto";
import { buscarToolCall } from "@/lib/callback-llamada";
import { enviarPlantilla } from "@/lib/wa-send";
import { addOutbound } from "@/lib/wa-store";
import { encenderIaSiNadieDecidio } from "@/lib/ai-store";
import {
  ASISTENTE_CONFERENCIA,
  NOMBRE_TOOL_WHATSAPP,
  PLANTILLA_MIA,
  RESPUESTA_SOFIA,
  TENANT_COMERCIAL,
  numeroWhatsApp,
  textoMia,
  variablesMia,
} from "@/lib/seguir-por-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// "Seguimos por WhatsApp", en plena llamada.
//
// Sofía (la de la llamada demo de la conferencia) usa la herramienta
// `seguir_por_whatsapp` cuando la persona prefiere seguir por chat. Esto le
// manda la plantilla con la que Mia abre el chat desde el número comercial, la
// deja en el hilo de la bandeja del panel comercial y le contesta a Sofía al
// instante para que se lo diga a la persona mientras siguen al teléfono.
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
  };
}

// Una sola plantilla por llamada y número, aunque el modelo llame dos veces a
// la herramienta en la misma llamada.
const g = globalThis as unknown as { __whatsappPorLlamada?: Set<string> };
const yaEnviados: Set<string> = (g.__whatsappPorLlamada ??= new Set());

function respuesta(toolCallId: string, texto: string) {
  return NextResponse.json({ results: [{ toolCallId, result: texto }] });
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
  try {
    const env = await enviarPlantilla(numero, PLANTILLA_MIA, "es", variablesMia(nombre), { tenant: TENANT_COMERCIAL });
    if (!env.ok) {
      console.error("[seguir-por-whatsapp] no se pudo enviar:", env.error);
      return respuesta(tool.id, RESPUESTA_SOFIA.fallo);
    }
    yaEnviados.add(clave);
    if (env.id) {
      await addOutbound({ waId: env.id, to: numero, texto: textoMia(nombre), ts: new Date().toISOString(), tenant: TENANT_COMERCIAL });
    }
    // Cuando conteste, que le responda Mia (si nadie la apagó a mano en ese chat).
    await encenderIaSiNadieDecidio(TENANT_COMERCIAL, numero);
    console.log(`[seguir-por-whatsapp] plantilla enviada a …${numero.slice(-4)} (llamada ${msg.call.id ?? "?"})`);
    return respuesta(tool.id, RESPUESTA_SOFIA.enviado);
  } catch (err) {
    console.error("[seguir-por-whatsapp]", err);
    return respuesta(tool.id, RESPUESTA_SOFIA.fallo);
  }
}
