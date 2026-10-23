import { NextResponse } from "next/server";
import { tenantFromRequest } from "@/lib/tenants/server";
import { assistantIdDeTenant } from "@/lib/tenants/voz";
import { hotelMuestraDe } from "@/lib/hotel-muestra/registro";
import { llamadaDeVapi, type LlamadaHotel } from "@/lib/hotel-muestra/llamadas";
import { fetchVapiCallsDeAsistente } from "@/lib/vapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Las llamadas REALES a la recepcionista de voz de un hotel de muestra, con lo
// que la agente anotó al colgar. El resto del hotel es muestra del navegador;
// esto es lo único que viene de afuera, y viene de Vapi, no de ningún sistema
// del hotel.
//
// La frontera es el agente del panel que pide: la cuenta de voz tiene agentes
// de varios clientes y aquí solo se piden las llamadas del suyo.
export async function GET(req: Request) {
  const tenant = tenantFromRequest(req);
  const hotel = hotelMuestraDe(tenant);
  const asistente = assistantIdDeTenant(tenant);
  if (!hotel?.voz || !asistente) {
    return NextResponse.json({ ok: false, error: "Este panel no tiene línea de voz." }, { status: 403 });
  }
  try {
    const crudas = await fetchVapiCallsDeAsistente(asistente, 100);
    const llamadas = crudas
      .filter((c) => c.assistantId === asistente)
      .map(llamadaDeVapi)
      .filter((l): l is LlamadaHotel => l !== null);
    return NextResponse.json({ ok: true, llamadas });
  } catch (err) {
    // La muestra sigue: el panel se ve igual, solo sin las reales.
    return NextResponse.json(
      { ok: false, llamadas: [], error: err instanceof Error ? err.message : "No se pudo consultar Vapi." },
      { status: 502 },
    );
  }
}
