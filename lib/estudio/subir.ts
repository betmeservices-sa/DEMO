"use client";

// Subir una foto desde la computadora o el teléfono.
//
// El navegador la achica antes de mandarla (una foto de teléfono pesa 5 a
// 10 MB y Vercel corta en 4,5): lado largo de 2048 px en JPG, que en el feed
// no se nota. Queda girada como se ve, sin los datos del teléfono (EXIF). El
// servidor la guarda en los medios de la marca y devuelve su URL.

const LADO_MAX = 2048;
const CALIDAD = 0.88;

async function abrir(archivo: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(archivo, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`No se pudo abrir "${archivo.name}". Súbela en JPG o PNG.`);
  }
}

/** La foto lista para subir: JPG, a lo sumo 2048 px de lado largo. */
export async function prepararFoto(archivo: File): Promise<Blob> {
  const img = await abrir(archivo);
  const escala = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
  const w = Math.round(img.width * escala);
  const h = Math.round(img.height * escala);
  const lienzo = document.createElement("canvas");
  lienzo.width = w;
  lienzo.height = h;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("El navegador no dejó preparar la foto.");
  // Fondo blanco por si es un PNG con transparencia (el JPG no la tiene).
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  img.close();
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo preparar la foto."))), "image/jpeg", CALIDAD));
}

/** Sube la foto a los medios de la marca y devuelve su URL. */
export async function subirFoto(archivo: File, marcaId: string): Promise<string> {
  if (!archivo.type.startsWith("image/")) throw new Error(`"${archivo.name}" no es una foto.`);
  const datos = new FormData();
  datos.append("foto", await prepararFoto(archivo), "foto.jpg");
  datos.append("marcaId", marcaId);
  const r = await fetch("/api/estudio/subir", { method: "POST", body: datos });
  const j = (await r.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null;
  if (!r.ok || !j?.ok || !j.url) throw new Error(j?.error ?? "No se pudo subir la foto. Vuelve a intentar.");
  return j.url;
}

/** El nombre del archivo como título legible: "fachada_coral-gables.jpg" → "fachada coral gables". */
export function tituloDeArchivo(nombre: string): string {
  return nombre.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Foto";
}
