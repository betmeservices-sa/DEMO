import { NextResponse } from "next/server";
import { conLectura, proveedores } from "@/lib/estudio/proveedores";
import { FallaOpenAI } from "@/lib/estudio/proveedores/openai";
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
  let r;
  try {
    r = await proveedores().texto.reescribir(b.pieza, b.marca, b.motivo ?? "");
  } catch (e) {
    console.error("[estudio] otra versión:", e);
    const porque = e instanceof FallaOpenAI ? `${e.paraPersona} ` : "";
    return NextResponse.json({ ok: false, error: `${porque}No salió la otra versión y no se descontaron créditos. Vuelve a intentar.` }, { status: 502 });
  }
  const leida = await conLectura([r.pieza]);
  return NextResponse.json({ ok: true, pieza: leida.piezas[0], uso: [...r.uso, ...leida.uso] });
}
