import { NextResponse } from "next/server";
import { tenantFromRequest } from "@/lib/tenants/server";
import { validarMovimiento } from "@/lib/eventos/estado";
import { agregarMovimiento, TENANT_EVENTOS } from "@/lib/eventos/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lo que una persona hace sobre una propuesta: moverla de etapa, anotar,
// reasignarla o marcar el primer contacto. Se guarda como un renglón más (no
// se pisa nada), igual para la muestra que para las reales.

const ACTORES = new Set(["me", "s2", "s3", "s4", "s5", "s6"]);

export async function POST(req: Request) {
  if (tenantFromRequest(req) !== TENANT_EVENTOS) {
    return NextResponse.json({ ok: false, error: "Este módulo no está habilitado." }, { status: 403 });
  }
  let body: { propuestaId?: unknown; tipo?: unknown; valor?: unknown; actor?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const propuestaId = typeof body.propuestaId === "string" ? body.propuestaId.trim() : "";
  // Muestra ("s07") o real ("ph-<id de la llamada>").
  if (!/^s\d{2}$/.test(propuestaId) && !/^ph-[\w-]{4,120}$/.test(propuestaId)) {
    return NextResponse.json({ ok: false, error: "Propuesta inválida." }, { status: 400 });
  }
  const m = validarMovimiento(body.tipo, body.valor);
  if (!m) return NextResponse.json({ ok: false, error: "Movimiento inválido." }, { status: 400 });

  const actor = typeof body.actor === "string" && ACTORES.has(body.actor) ? body.actor : "me";
  const movimiento = {
    id: crypto.randomUUID(),
    propuestaId,
    tipo: m.tipo,
    valor: m.valor,
    actor,
    ts: new Date().toISOString(),
  };
  try {
    await agregarMovimiento(movimiento);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
  return NextResponse.json({ ok: true, movimiento });
}
