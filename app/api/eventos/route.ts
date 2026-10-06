import { NextResponse } from "next/server";
import { tenantFromRequest } from "@/lib/tenants/server";
import { estadoEventos } from "@/lib/eventos/servidor";
import { TENANT_EVENTOS } from "@/lib/eventos/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Propuestas (muestra + reales con sus movimientos) y llamadas del tablero de
// Pizza Hut. Solo para su panel.
export async function GET(req: Request) {
  if (tenantFromRequest(req) !== TENANT_EVENTOS) {
    return NextResponse.json({ ok: false, error: "Este módulo no está habilitado." }, { status: 403 });
  }
  const ahora = Date.now();
  const e = await estadoEventos(ahora);
  return NextResponse.json({ ok: true, ahora, ...e });
}
