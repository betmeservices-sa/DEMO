import { NextResponse } from "next/server";
import { historialDe } from "@/lib/consultorio/almacen";
import { tenantFromRequest } from "@/lib/tenants/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// El historial de un teléfono en la clínica, para su ficha de Contactos: con
// qué doctor se registró, qué exámenes se ha hecho, qué facturas pagó y qué
// recetas y notas le dejaron. Solo para la sesión de la clínica: con la de
// otro cliente, la ruta no existe.
export async function GET(req: Request) {
  if (tenantFromRequest(req) !== "consultorio") {
    return NextResponse.json({ ok: false, error: "No existe." }, { status: 404 });
  }
  const telefono = new URL(req.url).searchParams.get("telefono") ?? "";
  if (telefono.replace(/\D/g, "").length < 8) {
    return NextResponse.json({ ok: false, error: "Falta el teléfono." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, historial: await historialDe(telefono) });
}
