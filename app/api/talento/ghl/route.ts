import { NextResponse } from "next/server";
import { tenantFromRequest } from "@/lib/tenants/server";
import { configGhl, marcarEnGhl, type AccionGhl } from "@/lib/talento/ghl";
import { guardarGhl, leerCandidato } from "@/lib/talento/servidor";
import type { EstadoGhl } from "@/lib/talento/tipos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Marca en GHL la decision sobre un candidato real. La llama el panel despues
// de Aprobado, Rechazado o Deshacer, sin esperarla: si GHL falla, la decision
// en el tablero ya quedo, y aca se anota el error para reintentar desde la
// ficha. Sin las env de GHL no hace nada y responde ok.

const ACCIONES: AccionGhl[] = ["aprobado", "rechazado", "deshacer"];

export async function POST(req: Request) {
  if (tenantFromRequest(req) !== "betme") return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  let body: { candidatoId?: unknown; accion?: unknown; previo?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Formato inválido." }, { status: 400 });
  }
  const accion = body.accion as AccionGhl;
  const previo = body.previo === "aprobado" || body.previo === "rechazado" ? body.previo : undefined;
  if (typeof body.candidatoId !== "string" || !ACCIONES.includes(accion)) {
    return NextResponse.json({ ok: false, error: "Faltan datos." }, { status: 400 });
  }

  const cfg = configGhl();
  if (!cfg) return NextResponse.json({ ok: true, omitido: true });

  try {
    const c = await leerCandidato(body.candidatoId);
    if (!c) return NextResponse.json({ ok: false, error: "Candidato no encontrado." }, { status: 404 });
    const r = await marcarEnGhl(cfg, { email: c.correo, telefono: c.telefono }, accion, previo);
    const ghl: EstadoGhl = r.ok
      ? { estado: "ok", accion, previo, ts: new Date().toISOString() }
      : { estado: "error", accion, previo, ts: new Date().toISOString(), detalle: r.error };
    if (!r.ok) console.error("[talento/ghl]", body.candidatoId, r.error);
    await guardarGhl(c.id, ghl);
    return NextResponse.json({ ok: true, ghl });
  } catch (e) {
    console.error("[talento/ghl] no se pudo registrar:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "No se pudo registrar el resultado." }, { status: 500 });
  }
}
