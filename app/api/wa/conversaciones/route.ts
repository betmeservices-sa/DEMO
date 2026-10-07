import { NextResponse } from "next/server";
import { getConversaciones, upsertConversacion } from "@/lib/conv-store";
import { tenantFromRequest } from "@/lib/tenants/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET -> { conversaciones: Conversacion[] } de ESTE panel.
export async function GET(req: Request) {
  const conversaciones = await getConversaciones(tenantFromRequest(req));
  return NextResponse.json({ conversaciones });
}

// POST body: { wa_from, asignado_a?, estado?, departamento? }
// -> { ok: true }
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalido" }, { status: 400 });
  }

  const wa_from = typeof body.wa_from === "string" ? body.wa_from.trim() : "";
  if (!wa_from) {
    return NextResponse.json({ ok: false, error: "Falta 'wa_from'" }, { status: 400 });
  }

  const patch: {
    wa_from: string;
    asignado_a?: string | null;
    estado?: string;
    departamento?: string;
  } = { wa_from };

  const ESTADOS = new Set(["nuevo", "en_progreso", "resuelto"]);
  const DEPARTAMENTOS = new Set([
    "ventas",
    "usados",
    "taller",
    "repuestos",
    "pintura",
    "crediq",
    "atencion",
  ]);

  if ("asignado_a" in body) {
    const v = body.asignado_a;
    patch.asignado_a = v === null ? null : typeof v === "string" ? v : undefined;
  }
  if (typeof body.estado === "string") {
    if (!ESTADOS.has(body.estado)) {
      return NextResponse.json({ ok: false, error: "Estado invalido" }, { status: 400 });
    }
    patch.estado = body.estado;
  }
  if (typeof body.departamento === "string") {
    if (!DEPARTAMENTOS.has(body.departamento)) {
      return NextResponse.json({ ok: false, error: "Departamento invalido" }, { status: 400 });
    }
    patch.departamento = body.departamento;
  }

  await upsertConversacion(tenantFromRequest(req), patch);
  return NextResponse.json({ ok: true });
}
