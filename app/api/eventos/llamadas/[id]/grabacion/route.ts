import { NextResponse } from "next/server";
import { tenantFromRequest } from "@/lib/tenants/server";
import { audioEnMemoria, leerLlamadaReal, TENANT_EVENTOS, urlDeAudio } from "@/lib/eventos/store";
import { llamadaDelTenant } from "@/lib/eventos/servidor";
import { detalleLlamadaVapi } from "@/lib/vapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// El audio de una llamada real de Daniela.
//
// Primero la copia propia (bucket privado, URL firmada por una hora), que
// sobrevive a la retención de la plataforma de voz. Si todavía no se copió,
// la URL firmada del momento que da la plataforma. La frontera del cliente se
// aplica acá: con el id de una llamada ajena no se escucha nada.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (tenantFromRequest(req) !== TENANT_EVENTOS) {
    return NextResponse.json({ ok: false, error: "Este módulo no está habilitado." }, { status: 403 });
  }
  const { id } = await params;
  const l = await leerLlamadaReal(id).catch(() => null);
  if (!l || !llamadaDelTenant(l.assistantId)) {
    return NextResponse.json({ ok: false, error: "Esa llamada no existe." }, { status: 404 });
  }

  if (l.grabacionPath) {
    const local = audioEnMemoria(l.grabacionPath);
    if (local) return new NextResponse(local.bytes, { headers: { "Content-Type": local.tipo } });
    const url = await urlDeAudio(l.grabacionPath).catch(() => null);
    if (url) return NextResponse.redirect(url, { status: 302 });
  }

  const vapi = await detalleLlamadaVapi(id).catch(() => null);
  if (vapi?.url) return NextResponse.redirect(vapi.url, { status: 302 });
  return NextResponse.json({ ok: false, error: "Esta llamada no dejó grabación." }, { status: 404 });
}
