import { NextResponse } from "next/server";
import { fetchVapiAgentes, hayLlaveVapi, lanzarLlamadaVapi } from "@/lib/vapi";
import { destinoRiesgoso, normalizarDestinoSV } from "@/lib/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lista los agentes de Vapi con su numero asignado y su script.
// El script se sirve completo a proposito: esta pantalla es solo de la agencia.
export async function GET() {
  try {
    const agentes = await fetchVapiAgentes();
    return NextResponse.json({
      source: hayLlaveVapi() ? "vapi" : "demo",
      agentes,
      sincronizadaEn: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ source: "vapi", agentes: [], error: msg }, { status: 502 });
  }
}

// Dispara una llamada saliente real.
// Body: { assistantId, phoneNumberId, numero }
export async function POST(req: Request) {
  let body: { assistantId?: string; phoneNumberId?: string; numero?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const assistantId = body.assistantId?.trim();
  const phoneNumberId = body.phoneNumberId?.trim();
  if (!assistantId || !phoneNumberId) {
    return NextResponse.json(
      { ok: false, error: "Faltan 'assistantId' o 'phoneNumberId'" },
      { status: 400 },
    );
  }

  const numero = normalizarDestinoSV(body.numero ?? "");
  if (!numero) {
    return NextResponse.json(
      { ok: false, error: "Número inválido. Usá 8 dígitos de El Salvador (ej. 7539 1721)." },
      { status: 400 },
    );
  }

  if (!hayLlaveVapi()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Estás en modo demostración (falta VAPI_PRIVATE_KEY). No se puede lanzar una llamada real.",
      },
      { status: 409 },
    );
  }

  try {
    const llamada = await lanzarLlamadaVapi({ assistantId, phoneNumberId, numero });
    return NextResponse.json({
      ok: true,
      id: llamada.id,
      status: llamada.status,
      numero,
      // El rango 6 no termina por el trunk: la llamada se crea igual, pero
      // avisamos para que nadie lo lea como "el agente falló".
      aviso: destinoRiesgoso(numero)
        ? "El destino es del rango 6, que hoy no termina por el trunk (SIP 480). Es muy probable que no timbre."
        : undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
