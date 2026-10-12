import { NextResponse } from "next/server";
import { getWaTenant, setWaTenant } from "@/lib/wa-routing";
import { isTenantId } from "@/lib/tenants";
import { exigirAgencia } from "@/lib/permisos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A qué cliente entra el número de WhatsApp en vivo (lo lee el switch).
export async function GET() {
  return NextResponse.json({ tenant: await getWaTenant() });
}

// Cambia el enrutamiento del número al cliente indicado. Los mensajes NUEVOS
// entran a ese dashboard y la IA responde con su guion.
//
// Solo la agencia: el número es uno para todo el demo, y cualquier cuenta de
// cualquier cliente podía mandárselo a otro con una petición a mano. La marca
// de agencia va dentro de la firma de la sesión, no se inventa en el navegador.
export async function POST(req: Request) {
  const permiso = await exigirAgencia(req, "Solo la agencia cambia a dónde entra el número.");
  if (!permiso.ok) return permiso.respuesta;

  let body: { tenant?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  if (!body.tenant || !isTenantId(body.tenant)) {
    return NextResponse.json({ ok: false, error: "Cliente inválido." }, { status: 400 });
  }
  await setWaTenant(body.tenant);
  return NextResponse.json({ ok: true, tenant: body.tenant });
}
