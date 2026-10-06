import { NextResponse } from "next/server";
import { tenantFromRequest } from "@/lib/tenants/server";
import { leerLlamadaReal, TENANT_EVENTOS } from "@/lib/eventos/store";
import { llamadaDelTenant } from "@/lib/eventos/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// La transcripción de una llamada REAL (la lista no la trae para no pesar).
// Las de muestra las arma la pantalla.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (tenantFromRequest(req) !== TENANT_EVENTOS) {
    return NextResponse.json({ ok: false, error: "Este módulo no está habilitado." }, { status: 403 });
  }
  const { id } = await params;
  try {
    const l = await leerLlamadaReal(id);
    if (!l || !llamadaDelTenant(l.assistantId)) {
      return NextResponse.json({ ok: false, error: "Esa llamada no existe." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, transcripcion: l.transcripcion, grabacion: l.grabacion });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
