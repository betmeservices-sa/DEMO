import { NextResponse } from "next/server";
import { proveedores } from "@/lib/estudio/proveedores";
import { cuerpo, fueraDelPanel, malPedido } from "@/lib/estudio/servidor";
import type { Marca, Pieza } from "@/lib/estudio/tipos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Guion aprobado: arranca el video con el avatar y la voz de la marca.
export async function POST(req: Request) {
  const cerrado = fueraDelPanel(req);
  if (cerrado) return cerrado;
  const b = await cuerpo<{ pieza: Pieza; marca: Marca }>(req);
  if (!b?.pieza?.id || !b.marca?.id) return malPedido("Falta la pieza.");
  if (b.pieza.tipo !== "video" || !b.pieza.guion) return malPedido("Esa pieza no tiene guion.");
  if (!b.marca.avatar) return malPedido("La marca no tiene avatar ni voz.");
  if (b.marca.avatar.tipo === "clon" && !b.marca.avatar.consentimiento) {
    return NextResponse.json({ ok: false, error: "Falta el consentimiento firmado de la persona del avatar." }, { status: 409 });
  }
  const r = await proveedores().avatar.armarVideo(b.pieza, b.marca);
  return NextResponse.json({ ok: true, ...r });
}
