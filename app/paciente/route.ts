import { NextResponse } from "next/server";
import { sucursalActual } from "@/lib/consultorio/actual";
import { esDeLaClinica } from "@/lib/consultorio/guardia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// La tercera vista: lo que ve el paciente en su teléfono.
//
// Es un atajo, no una pantalla: manda a la página pública de la sucursal que se
// está mirando en el mostrador. Existe para poder enseñar esa vista sin buscar
// el código a mano, y para que siga apuntando a la sucursal correcta cuando se
// cambia de una a otra.
export async function GET(req: Request) {
  if (!(await esDeLaClinica())) {
    return new Response("No existe", { status: 404 });
  }
  const sucursal = await sucursalActual();
  return NextResponse.redirect(new URL(`/s/${sucursal.codigo}`, new URL(req.url).origin));
}
