import { NextResponse } from "next/server";
import { fetchVapiCalls, hayLlaveVapi } from "@/lib/vapi";
import { guardarLlamadas, haySupabase, leerLlamadas } from "@/lib/calls-store";
import { resumirLlamadas } from "@/lib/calls-metrics";
import type { CallRecord } from "@/lib/data/types";

export const dynamic = "force-dynamic";

// USD por minuto que cobra el carrier. Vapi no lo incluye (transport llega en 0
// con trunk propio). Si vale 0, la UI oculta el costo real.
function tarifaCarrier(): number {
  const v = Number(process.env.CARRIER_RATE_PER_MINUTE);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * Sincroniza contra Vapi y devuelve el estado actual.
 * Si Vapi falla pero hay historial en Supabase, se sirve el historial con un
 * aviso: preferimos datos viejos antes que una pantalla rota.
 */
async function armarRespuesta() {
  const tarifa = tarifaCarrier();
  let calls: CallRecord[] = [];
  let error: string | undefined;
  let persistido = false;

  try {
    const frescas = await fetchVapiCalls();
    if (haySupabase()) {
      await guardarLlamadas(frescas);
      calls = await leerLlamadas();
      persistido = true;
    } else {
      calls = frescas;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Error desconocido";
    if (haySupabase()) {
      try {
        calls = await leerLlamadas();
        persistido = true;
      } catch {
        // Si tambien falla la base, se devuelve la lista vacia con el error.
      }
    }
  }

  return {
    source: hayLlaveVapi() ? "vapi" : "demo",
    persistido,
    tarifaCarrier: tarifa,
    metrics: resumirLlamadas(calls, tarifa),
    calls,
    sincronizadaEn: new Date().toISOString(),
    ...(error ? { error } : {}),
  };
}

export async function GET() {
  const body = await armarRespuesta();
  return NextResponse.json(body, { status: body.error && body.calls.length === 0 ? 502 : 200 });
}

// Mismo trabajo que GET. Existe para que el boton "Sincronizar" exprese
// intencion de escritura y no quede cacheado por ningun intermediario.
export async function POST() {
  const body = await armarRespuesta();
  return NextResponse.json(body, { status: body.error && body.calls.length === 0 ? 502 : 200 });
}
