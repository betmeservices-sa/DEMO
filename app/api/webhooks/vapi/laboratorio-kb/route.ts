import { NextResponse } from "next/server";
import { buscarToolCall } from "@/lib/callback-llamada";
import { respuestaDeBusqueda } from "@/lib/consultorio/lab-kb";
import { BASE_LAB } from "@/lib/consultorio/lab-kb-datos";
import { secretoVapiValido } from "@/lib/vapi-secreto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

// La base del laboratorio para el agente de voz "Sofia - Laboratorio CEGISA"
// (Vapi, +503 2505-4605). Es la MISMA búsqueda que usa Valeria del lab en el
// WhatsApp 2247-1141 (kb_buscar, lib/consultorio/lab-kb.ts): un precio se
// cambia en lib/consultorio/lab-kb-*.ts, se despliega, y lo toman los dos.
//
// La ruta es PÚBLICA (la llama Vapi desde sus servidores) y valida el secreto
// compartido de Vapi en el header x-vapi-secret.

// Nombre de la herramienta en Vapi (un route.ts solo puede exportar lo de Next).
const NOMBRE_TOOL_LAB = "buscar_en_base";

/** Hoy (AAAA-MM-DD) en El Salvador, para vencer promociones a tiempo. */
function hoyEnElSalvador(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function POST(req: Request) {
  if (!secretoVapiValido(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  const cuerpo = (await req.json().catch(() => ({}))) as { message?: unknown };
  const llamada = buscarToolCall(cuerpo.message, NOMBRE_TOOL_LAB);
  if (!llamada) return NextResponse.json({ results: [] });
  // La voz sí da el precio con aseguradora de la lista del lab (evaluaciones
  // del 2026-11-09); el WhatsApp no lo ve.
  const result = respuestaDeBusqueda(BASE_LAB, llamada.args.consulta, hoyEnElSalvador(), {
    conPrecioAseguradora: true,
  });
  return NextResponse.json({ results: [{ toolCallId: llamada.id, result }] });
}
