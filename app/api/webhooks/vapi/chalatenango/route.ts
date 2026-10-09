import { atenderVapiSeguirPorWhatsApp } from "@/lib/seguir-por-whatsapp-webhook";
import { ELENA_CHALATENANGO } from "@/lib/seguir-por-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Elena, la demo de voz de la Caja de Crédito de Chalatenango (línea
// 2505-4608), en su panel.
//
// "seguir_por_whatsapp" en plena llamada (le sale la plantilla
// elena_continuar_demo desde el número de la Caja, +503 6452 4233) y
// "end-of-call-report" al colgar (lo que se habló queda para la Elena de
// WhatsApp). Solo atiende a Elena. Cómo, en lib/seguir-por-whatsapp-webhook.ts.
export function POST(req: Request) {
  return atenderVapiSeguirPorWhatsApp(req, ELENA_CHALATENANGO);
}
