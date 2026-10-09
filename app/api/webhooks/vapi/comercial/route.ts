import { atenderVapiSeguirPorWhatsApp } from "@/lib/seguir-por-whatsapp-webhook";
import { SOFIA_COMERCIAL } from "@/lib/seguir-por-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Sofía de la llamada demo de la conferencia, en el panel comercial.
//
// "seguir_por_whatsapp" en plena llamada (le sale la plantilla
// sofia_continuar_demo desde el número comercial) y "end-of-call-report" al
// colgar (lo que se habló queda para la Sofía de WhatsApp). Solo atiende al
// agente de la conferencia. Cómo, en lib/seguir-por-whatsapp-webhook.ts.
export function POST(req: Request) {
  return atenderVapiSeguirPorWhatsApp(req, SOFIA_COMERCIAL);
}
