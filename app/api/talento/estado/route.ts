import { NextResponse } from "next/server";
import { tenantFromRequest } from "@/lib/tenants/server";
import { guardarCambios, leerReal } from "@/lib/talento/servidor";
import type { Candidato, Postulacion } from "@/lib/talento/tipos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Los candidatos reales de BetMe y su pipeline, compartidos por todo el
// equipo. Pide sesion (la pone el middleware) y que sea el panel de BetMe:
// son datos personales de postulantes reales.

function soloBetme(req: Request) {
  return tenantFromRequest(req) === "betme";
}

export async function GET(req: Request) {
  if (!soloBetme(req)) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  try {
    const r = await leerReal();
    return NextResponse.json({ ok: true, ...r }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("[talento/estado] lectura:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "No se pudieron leer los candidatos." }, { status: 500 });
  }
}

const MAX_ITEMS = 200;

export async function POST(req: Request) {
  if (!soloBetme(req)) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  let body: { candidatos?: unknown; postulaciones?: unknown; borrar?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Formato inválido." }, { status: 400 });
  }
  const candidatos = (Array.isArray(body.candidatos) ? body.candidatos : []).filter(
    (c): c is Candidato => Boolean(c && typeof c === "object" && typeof (c as Candidato).id === "string" && typeof (c as Candidato).nombre === "string"),
  );
  const postulaciones = (Array.isArray(body.postulaciones) ? body.postulaciones : []).filter(
    (p): p is Postulacion =>
      Boolean(p && typeof p === "object" && typeof (p as Postulacion).id === "string" && typeof (p as Postulacion).candidatoId === "string"),
  );
  const borrar = (Array.isArray(body.borrar) ? body.borrar : []).filter((x): x is string => typeof x === "string");
  if (candidatos.length + postulaciones.length + borrar.length > MAX_ITEMS) {
    return NextResponse.json({ ok: false, error: "Demasiados cambios juntos." }, { status: 413 });
  }
  try {
    await guardarCambios(candidatos, postulaciones, borrar);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[talento/estado] escritura:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "No se pudieron guardar los cambios." }, { status: 500 });
  }
}
