import { NextResponse } from "next/server";
import { cargarPanelLab } from "@/lib/lab-panel";
import { esPeriodo } from "@/lib/lab-panel-periodos";
import { exigirModulo } from "@/lib/permisos";
import { tenantFromRequest } from "@/lib/tenants/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Las cifras del WhatsApp del laboratorio para su dashboard. Solo el panel del
// lab, y solo los perfiles que ven el dashboard (hoy dirección y jefatura; la
// recepción del lab no, hasta que se decida quién).
export async function GET(req: Request) {
  if (tenantFromRequest(req) !== "consultorio") {
    return NextResponse.json({ ok: false, error: "No disponible" }, { status: 403 });
  }
  const permiso = await exigirModulo(req, "dashboard");
  if (!permiso.ok) return permiso.respuesta;

  const p = new URL(req.url).searchParams.get("periodo") ?? "7d";
  const periodo = esPeriodo(p) ? p : "7d";
  try {
    const panel = await cargarPanelLab(periodo);
    if (!panel) {
      return NextResponse.json({ ok: false, error: "Sin base de datos configurada: no hay cifras que mostrar." });
    }
    return NextResponse.json({ ok: true, panel });
  } catch (e) {
    console.error("laboratorio/panel:", e);
    return NextResponse.json({ ok: false, error: "No se pudieron leer las cifras en este momento." });
  }
}
