import { NextResponse } from "next/server";
import { conLectura, proveedores } from "@/lib/estudio/proveedores";
import type { PedidoTexto } from "@/lib/estudio/proveedores/tipos";
import { cuerpo, fueraDelPanel, malPedido } from "@/lib/estudio/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Un encargo (prompt + perfil de la marca) se vuelve piezas para aprobar.
export async function POST(req: Request) {
  const cerrado = fueraDelPanel(req);
  if (cerrado) return cerrado;
  const p = await cuerpo<PedidoTexto>(req);
  if (!p?.marca?.id || !p.texto?.trim() || !p.formato || !p.encargoId) return malPedido("Falta la marca o el encargo.");
  if (!Number.isInteger(p.cantidad) || p.cantidad < 1 || p.cantidad > 12) return malPedido("La cantidad va de 1 a 12.");
  const r = await proveedores().texto.generar(p);
  const leidas = await conLectura(r.piezas);
  return NextResponse.json({ ok: true, piezas: leidas.piezas, uso: [...r.uso, ...leidas.uso] });
}
