import { NextResponse } from "next/server";
import { buscarToolCall } from "@/lib/callback-llamada";
import { secretoVapiValido } from "@/lib/vapi-secreto";
import {
  DESTINOS_VOZ,
  MINUTOS_MISMO_ASUNTO,
  NOMBRE_TOOL_TICKET_VOZ,
  cierreDeCasoVoz,
  esPanelVoz,
  ticketDeLlamada,
} from "@/lib/voz-ticket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

// La herramienta `crear_ticket` de las Valerias de voz de CEGISA (Vapi): abre
// el caso en el tablero de Tickets del panel que dice `?panel=` (laboratorio o
// imagenologia). Qué se guarda y por qué: lib/voz-ticket.ts.
//
// La ruta es PÚBLICA (la llama Vapi desde sus servidores, ver proxy.ts) y
// valida el secreto compartido de Vapi en el header x-vapi-secret.

interface MensajeConLlamada {
  call?: { customer?: { number?: string } };
  customer?: { number?: string };
}

function resultado(toolCallId: string, datos: Record<string, unknown>) {
  return NextResponse.json({ results: [{ toolCallId, result: JSON.stringify(datos) }] });
}

export async function POST(req: Request) {
  if (!secretoVapiValido(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  const panel = new URL(req.url).searchParams.get("panel");
  if (!esPanelVoz(panel)) return NextResponse.json({ error: "panel desconocido" }, { status: 400 });

  const cuerpo = (await req.json().catch(() => ({}))) as { message?: unknown };
  const llamada = buscarToolCall(cuerpo.message, NOMBRE_TOOL_TICKET_VOZ);
  if (!llamada) return NextResponse.json({ results: [] });

  const destino = DESTINOS_VOZ[panel];
  const msg = (cuerpo.message ?? {}) as MensajeConLlamada;
  const numero = msg.call?.customer?.number ?? msg.customer?.number;

  try {
    // Se carga aquí a propósito: arrastra el cliente de Supabase.
    const { crearTicket, ticketAbiertoDe, agregarNota } = await import("@/lib/tickets-store");
    const nuevo = ticketDeLlamada(llamada.args, destino, numero);
    // Un asunto, un caso: si en la misma llamada el modelo vuelve a llamar la
    // herramienta porque la persona agregó un dato, va como nota.
    const previo = nuevo.contactoTelefono
      ? await ticketAbiertoDe(destino.tenant, nuevo.contactoTelefono, nuevo.tipo, MINUTOS_MISMO_ASUNTO / 60)
      : null;
    if (previo) {
      await agregarNota(destino.tenant, previo.id, nuevo.creadoPor, nuevo.detalle ?? "");
      return resultado(llamada.id, {
        ok: true,
        ya_existia: true,
        cierre: cierreDeCasoVoz(destino),
        nota: "Ya tenía este caso abierto en esta llamada; lo nuevo quedó anotado ahí. No digas que abriste otro.",
      });
    }
    await crearTicket(destino.tenant, nuevo);
    return resultado(llamada.id, { ok: true, cierre: cierreDeCasoVoz(destino) });
  } catch (e) {
    // Si no se pudo anotar, Valeria NO puede decir que quedó anotado.
    console.error("[vapi-ticket] no se pudo abrir el caso:", e);
    return resultado(llamada.id, { ok: false, error: "No se pudo anotar el caso." });
  }
}
