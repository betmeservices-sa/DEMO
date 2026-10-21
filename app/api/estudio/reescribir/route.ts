import { NextResponse } from "next/server";
import { proveedores } from "@/lib/estudio/proveedores";
import { cuerpo, fueraDelPanel, malPedido } from "@/lib/estudio/servidor";
import type { Marca, Pieza } from "@/lib/estudio/tipos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Otra versión de una pieza, con el motivo que dio quien la revisó.
export async function POST(req: Request) {
  const cerrado = fueraDelPanel(req);
  if (cerrado) return cerrado;
  const b = await cuerpo<{ pieza: Pieza; marca: Marca; motivo?: string }>(req);
  if (!b?.pieza?.id || !b.marca?.id) return malPedido("Falta la pieza.");
  const r = await proveedores().texto.reescribir(b.pieza, b.marca, b.motivo ?? "");
  return NextResponse.json({ ok: true, ...r });
}
