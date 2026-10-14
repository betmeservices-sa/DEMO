// El agente verificador devuelve por acá el código que le dictó Meta.
//
// Dos caminos, y los dos terminan en lo mismo:
//   1. La herramienta `guardar_codigo` en plena llamada: es el camino rápido,
//      el que hace que la pantalla se complete mientras Meta todavía habla.
//   2. El reporte de fin de llamada: la red de abajo. Si el modelo no llamó a
//      la herramienta, el código se saca de lo que transcribió el agente.
//
// Con el código, el alta sigue sola hasta dejar el número contestando WhatsApp.
//
// PÚBLICA (la llama Vapi) y valida el secreto compartido. Nunca responde 5xx:
// Vapi reintentaría y Meta no da códigos de sobra.

import { NextResponse } from "next/server";
import { secretoVapiValido } from "@/lib/vapi-secreto";
import { buscarToolCall } from "@/lib/callback-llamada";
import { codigoDeTranscript, codigoValido, normalizarLinea } from "@/lib/alta-numero";
import { ASISTENTE_VERIFICADOR, continuarConCodigo } from "@/lib/alta-numero-orquestador";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NOMBRE_TOOL = "guardar_codigo";

interface CuerpoVapi {
  message?: {
    type?: string;
    call?: {
      assistantId?: string;
      phoneNumber?: { number?: string };
      phoneNumberId?: string;
    };
    phoneNumber?: { number?: string };
    artifact?: { transcript?: string };
    transcript?: string;
  };
}

/** A qué línea entró la llamada: es la que se está registrando. */
function lineaDe(msg: CuerpoVapi["message"]): string | null {
  const bruto = msg?.call?.phoneNumber?.number ?? msg?.phoneNumber?.number ?? "";
  return normalizarLinea(bruto);
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
  if (msg?.call?.assistantId && msg.call.assistantId !== ASISTENTE_VERIFICADOR) {
    return NextResponse.json({ ok: true, ignorado: "otro agente" });
  }

  const linea = lineaDe(msg);
  if (!linea) return NextResponse.json({ ok: true, ignorado: "sin línea" });

  // Camino 1: la herramienta, en plena llamada.
  const tool = buscarToolCall(msg, NOMBRE_TOOL);
  if (tool) {
    const codigo = String((tool.args as { codigo?: unknown }).codigo ?? "").replace(/\D/g, "");
    if (!codigoValido(codigo)) {
      return NextResponse.json({
        results: [{ toolCallId: tool.id, result: "Ese código no tiene seis dígitos. Espera la repetición." }],
      });
    }
    const c = await continuarConCodigo(linea, codigo);
    return NextResponse.json({
      results: [
        {
          toolCallId: tool.id,
          result: c?.estado === "error" ? `No se pudo: ${c.error}` : "Código recibido. Ya puedes colgar.",
        },
      ],
    });
  }

  // Camino 2: al colgar, del transcript.
  if (msg?.type === "end-of-call-report") {
    const texto = msg.artifact?.transcript ?? msg.transcript ?? null;
    const codigo = codigoDeTranscript(texto);
    if (!codigo) return NextResponse.json({ ok: true, ignorado: "sin código en el transcript" });
    const c = await continuarConCodigo(linea, codigo, texto);
    return NextResponse.json({ ok: true, paso: c?.paso ?? null, estado: c?.estado ?? null });
  }

  return NextResponse.json({ ok: true, ignorado: msg?.type ?? "sin tipo" });
}
