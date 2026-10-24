import { NextResponse } from "next/server";
import { conImagenes, conLectura, proveedores } from "@/lib/estudio/proveedores";
import { FallaImagen } from "@/lib/estudio/proveedores/openai";
import type { PedidoTexto } from "@/lib/estudio/proveedores/tipos";
import { cuerpo, fueraDelPanel, malPedido } from "@/lib/estudio/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Las imágenes de un carrusel salen en paralelo, pero cada una tarda: más que el texto.
export const maxDuration = 300;

// Un encargo (prompt + perfil de la marca) se vuelve piezas para aprobar.
export async function POST(req: Request) {
  const cerrado = fueraDelPanel(req);
  if (cerrado) return cerrado;
  const p = await cuerpo<PedidoTexto>(req);
  if (!p?.marca?.id || !p.texto?.trim() || !p.formato || !p.encargoId) return malPedido("Falta la marca o el encargo.");
  if (!Number.isInteger(p.cantidad) || p.cantidad < 1 || p.cantidad > 12) return malPedido("La cantidad va de 1 a 12.");
  const r = await proveedores().texto.generar(p);
  // Primero las imágenes (si se piden al modelo) y después se leen: la letra sale de la imagen que quedó.
  let conImagen;
  try {
    conImagen = await conImagenes(r.piezas, p.marca);
  } catch (e) {
    console.error("[estudio] imagen:", e);
    const porque = e instanceof FallaImagen ? `${e.paraPersona} ` : "";
    return NextResponse.json({ ok: false, error: `${porque}No salieron las imágenes y no se descontaron créditos. Vuelve a generar.` }, { status: 502 });
  }
  const leidas = await conLectura(conImagen);
  return NextResponse.json({ ok: true, piezas: leidas.piezas, uso: [...r.uso, ...leidas.uso] });
}
