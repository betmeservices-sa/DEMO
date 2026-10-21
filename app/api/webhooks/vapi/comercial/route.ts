import { atenderVapiSeguirPorWhatsApp } from "@/lib/seguir-por-whatsapp-webhook";
import { atenderLlamadaEntrante } from "@/lib/llamada-entrante";
import { SOFIA_COMERCIAL } from "@/lib/seguir-por-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Sofía de MiAgentIA, en el panel comercial. Su número de WhatsApp y de voz es
// el mismo: 2505 4610.
//
// "assistant-request" cuando alguien llama al 2505 4610: contesta Sofía con lo
// que esa persona ya habló por WhatsApp o por teléfono (lib/llamada-entrante.ts).
// "seguir_por_whatsapp" en plena llamada (le sale la plantilla
// sofia_continuar_demo desde el número del panel) y "end-of-call-report" al
// colgar (lo que se habló queda para la Sofía de WhatsApp). Solo atiende a
// Sofía. Cómo, en lib/seguir-por-whatsapp-webhook.ts.
export async function POST(req: Request) {
  const tipo = await req
    .clone()
    .json()
    .then((b: { message?: { type?: string } }) => b?.message?.type)
    .catch(() => undefined);
  if (tipo === "assistant-request") return atenderLlamadaEntrante(req, SOFIA_COMERCIAL);
  return atenderVapiSeguirPorWhatsApp(req, SOFIA_COMERCIAL);
}
