// Dónde quedan las imágenes que genera el modelo.
//
// OpenAI entrega la imagen en base64 y no la guarda: si no se sube a algún
// lado, se pierde. Con la base del panel (SUPABASE_URL + SUPABASE_SECRET_KEY)
// va al bucket público "estudio", una carpeta por marca, y la pieza guarda su
// URL. Es público porque son piezas para redes: el nombre lleva una parte al
// azar, así que nadie llega a una que no le pasaron.
//
// En local sin la llave secreta la imagen vuelve dentro de la pieza como
// data URL, para poder probar sin tocar la base. En producción eso no se
// permite: el estado del navegador no aguanta muchas imágenes.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const BUCKET_ESTUDIO = "estudio";

type Cliente = SupabaseClient<any, any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

let cliente: Cliente | null | undefined;
let bucketListo: Promise<void> | null = null;

function base(): Cliente | null {
  if (cliente !== undefined) return cliente;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  cliente = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return cliente;
}

function enProduccion(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

/** El bucket se crea solo la primera vez; si ya existe, Supabase lo dice y se sigue. */
function asegurarBucket(c: Cliente): Promise<void> {
  bucketListo ??= c.storage
    .createBucket(BUCKET_ESTUDIO, { public: true })
    .then(({ error }) => {
      if (error && !/already exists|duplicate/i.test(error.message)) throw error;
    })
    .catch((e) => {
      bucketListo = null;
      throw e;
    });
  return bucketListo;
}

function nombre(marcaId: string, extension: string): string {
  const dia = new Date().toISOString().slice(0, 10);
  const azar = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return `${marcaId.replace(/[^a-z0-9-]/gi, "")}/${dia}-${azar}.${extension}`;
}

/** Sube la imagen y devuelve su URL pública (o un data URL en local sin base). */
export async function guardarImagen(bytes: Buffer, tipo: string, marcaId: string): Promise<string> {
  const c = base();
  if (!c) {
    if (enProduccion()) throw new Error("Falta la base del panel (SUPABASE_URL y SUPABASE_SECRET_KEY) para guardar las imágenes.");
    return `data:${tipo};base64,${bytes.toString("base64")}`;
  }
  await asegurarBucket(c);
  const ruta = nombre(marcaId, tipo.split("/")[1] ?? "webp");
  const { error } = await c.storage.from(BUCKET_ESTUDIO).upload(ruta, bytes, { contentType: tipo, cacheControl: "31536000" });
  if (error) throw error;
  return c.storage.from(BUCKET_ESTUDIO).getPublicUrl(ruta).data.publicUrl;
}
