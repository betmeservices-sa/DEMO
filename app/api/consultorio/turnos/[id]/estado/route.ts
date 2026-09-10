import { NextResponse } from "next/server";
import { sucursalActual } from "@/lib/consultorio/actual";
import { abrirTurno, cerrarTurno, turnoPorId } from "@/lib/consultorio/almacen";
import { tenantFromRequest } from "@/lib/tenants/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mover el récord de alguien. Solo desde la consola del laboratorio.
//
// Tres acciones y ninguna más: abrir el récord (arranca el cronómetro),
// continuar (queda pendiente lo que falta) y finalizar (se cierra la visita).
// Las dos últimas paran el cronómetro.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (tenantFromRequest(req) !== "consultorio") {
    return NextResponse.json({ ok: false, error: "No existe." }, { status: 404 });
  }
  const sucursalId = (await sucursalActual()).id;
  const { accion, hechos } = (await req.json().catch(() => ({}))) as {
    accion?: string;
    hechos?: string[];
  };
  const { id } = await params;

  const previo = await turnoPorId(id);
  // Un turno de otra sucursal se trata igual que uno inexistente.
  if (!previo || previo.sucursalId !== sucursalId) {
    return NextResponse.json({ ok: false, error: "Ese turno no existe." }, { status: 404 });
  }

  if (accion === "abrir") {
    return NextResponse.json({ ok: true, turno: await abrirTurno(id) });
  }

  if (accion === "continuar" || accion === "finalizar") {
    const marcados = Array.isArray(hechos) ? hechos.map(String) : [];
    return NextResponse.json({
      ok: true,
      turno: await cerrarTurno(id, marcados, accion === "finalizar"),
    });
  }

  return NextResponse.json({ ok: false, error: "Acción desconocida." }, { status: 400 });
}
