// Lo común de las rutas /api/estudio: la frontera del panel y la lectura del
// cuerpo. Solo el panel del motor de contenido llama a estas rutas.

import { NextResponse } from "next/server";
import { tenantFromRequest } from "@/lib/tenants/server";

export const TENANT_ESTUDIO = "estudio";

export function fueraDelPanel(req: Request): NextResponse | null {
  if (tenantFromRequest(req) !== TENANT_ESTUDIO) {
    return NextResponse.json({ ok: false, error: "Este módulo no está habilitado." }, { status: 403 });
  }
  return null;
}

export async function cuerpo<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export function malPedido(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}
