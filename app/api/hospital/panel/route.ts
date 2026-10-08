import { NextResponse } from "next/server";
import { cargarPanelHospital } from "@/lib/hospital-panel";
import { tenantFromRequest } from "@/lib/tenants/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Las cifras reales del WhatsApp y los tickets del hospital. Solo responde al
// panel del hospital: la sesión ya viene firmada y acá se comprueba que sea la
// suya, para que ningún otro cliente vea su operación.
export async function GET(req: Request) {
  const tenant = tenantFromRequest(req);
  if (tenant !== "hospital") {
    return NextResponse.json({ ok: false, error: "No disponible" }, { status: 403 });
  }
  try {
    const panel = await cargarPanelHospital(tenant);
    if (!panel) {
      return NextResponse.json({ ok: false, error: "Sin base de datos configurada: no hay cifras que mostrar." });
    }
    return NextResponse.json({ ok: true, panel });
  } catch (e) {
    console.error("hospital/panel:", e);
    return NextResponse.json({ ok: false, error: "No se pudieron leer las cifras en este momento." });
  }
}
