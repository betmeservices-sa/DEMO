import { NextResponse } from "next/server";
import { proveedores } from "@/lib/estudio/proveedores";
import { cuerpo, fueraDelPanel, malPedido } from "@/lib/estudio/servidor";
import type { Marca, Pieza } from "@/lib/estudio/tipos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Programa una pieza aprobada en el planificador de la marca: un post por red.
export async function POST(req: Request) {
  const cerrado = fueraDelPanel(req);
  if (cerrado) return cerrado;
  const b = await cuerpo<{ pieza: Pieza; marca: Marca; cuando: string }>(req);
  if (!b?.pieza?.id || !b.marca?.id || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(b.cuando ?? "")) {
    return malPedido("Falta la pieza o la fecha.");
  }
  if (b.pieza.estado === "por_aprobar" || b.pieza.estado === "rechazada") {
    return NextResponse.json({ ok: false, error: "Solo se programa lo aprobado." }, { status: 409 });
  }
  const r = await proveedores().publicador.programar(b.pieza, b.marca, b.cuando);
  return NextResponse.json({ ok: true, ...r });
}
