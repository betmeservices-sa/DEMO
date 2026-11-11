import { NextResponse } from "next/server";
import { guardarImagen } from "@/lib/estudio/medios";
import { fueraDelPanel, malPedido } from "@/lib/estudio/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** El navegador la achica antes de mandarla; esto es el tope por si no. Vercel corta en 4,5 MB. */
const MAXIMO = 4 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp"];

// Una foto que se sube desde Crear o la biblioteca queda donde la marca guarda
// sus medios (el bucket "estudio") y vuelve su URL. Así la pieza la puede
// usar, el modelo la puede leer y no se pierde al recargar.
export async function POST(req: Request) {
  const cerrado = fueraDelPanel(req);
  if (cerrado) return cerrado;
  let datos: FormData;
  try {
    datos = await req.formData();
  } catch {
    return malPedido("No llegó la foto.");
  }
  const foto = datos.get("foto");
  const marcaId = String(datos.get("marcaId") ?? "");
  if (!(foto instanceof Blob) || !foto.size) return malPedido("No llegó la foto.");
  if (!/^[a-z0-9-]{1,40}$/i.test(marcaId)) return malPedido("Falta la marca.");
  if (!TIPOS.includes(foto.type)) return malPedido("La foto va en JPG, PNG o WebP.");
  if (foto.size > MAXIMO) return malPedido("La foto pesa más de 4 MB.");
  try {
    const url = await guardarImagen(Buffer.from(await foto.arrayBuffer()), foto.type, marcaId);
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    console.error("[estudio] subir foto:", e);
    return NextResponse.json({ ok: false, error: "No se pudo guardar la foto. Vuelve a subirla." }, { status: 502 });
  }
}
