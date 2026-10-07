import { NextResponse } from "next/server";
import { tenantFromRequest } from "@/lib/tenants/server";
import { bloquearNumeroWa } from "@/lib/wa-send";
import { borrarConversacionCompleta } from "@/lib/wa-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "Borrar y bloquear" una conversación de WhatsApp: bloquea el número (deja de
// escribir) y borra todo su historial de la base. Solo lo llama la UI para
// gerentes/jefes/dirección; el gating de rol vive en el cliente.
export async function POST(req: Request) {
  let body: { from?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const from = (body.from ?? "").replace(/\D/g, "");
  if (from.length < 6) {
    return NextResponse.json({ ok: false, error: "Número inválido" }, { status: 400 });
  }

  const tenant = tenantFromRequest(req);
  // 1. Bloquear en WhatsApp (que no vuelva a escribir) en el número de ESTE panel.
  const bloqueo = await bloquearNumeroWa(from, { tenant });
  // 2. Borrar su conversación de ESTE panel (aunque el bloqueo falle). Lo que
  //    esa persona tenga con otros clientes no se toca.
  await borrarConversacionCompleta(tenant, from);

  return NextResponse.json({ ok: true, bloqueado: bloqueo.ok, error: bloqueo.error });
}
