// Marca en GHL la decision del equipo sobre un candidato: un tag de
// aprobado o de rechazado en su contacto (y quita el contrario).
//
// Todo sale de env y SIN esas env no se llama a GHL ni falla nada:
//   GHL_TALENTO_PIT            token privado de la location
//   GHL_TALENTO_LOCATION       id de la location donde viven los contactos
//   GHL_TALENTO_TAG_APROBADO   nombre del tag de aprobado
//   GHL_TALENTO_TAG_RECHAZADO  nombre del tag de rechazado
//
// El contacto se busca por correo y, si no aparece, por telefono. API v2.

const BASE = "https://services.leadconnectorhq.com";
const VERSION = "2021-07-28";

export interface ConfigGhl {
  pit: string;
  location: string;
  tagAprobado: string;
  tagRechazado: string;
}

export function configGhl(env: Record<string, string | undefined> = process.env): ConfigGhl | null {
  const pit = env.GHL_TALENTO_PIT?.trim();
  const location = env.GHL_TALENTO_LOCATION?.trim();
  const tagAprobado = env.GHL_TALENTO_TAG_APROBADO?.trim();
  const tagRechazado = env.GHL_TALENTO_TAG_RECHAZADO?.trim();
  if (!pit || !location || !tagAprobado || !tagRechazado) return null;
  return { pit, location, tagAprobado, tagRechazado };
}

export type AccionGhl = "aprobado" | "rechazado" | "deshacer";

export type ResultadoGhl =
  | { ok: true; contactoId: string; puso?: string; quito?: string }
  | { ok: false; error: string };

type Fetch = typeof fetch;

function cabeceras(cfg: ConfigGhl): Record<string, string> {
  return {
    Authorization: `Bearer ${cfg.pit}`,
    Version: VERSION,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

class ErrorGhl extends Error {}

async function pedir(f: Fetch, cfg: ConfigGhl, ruta: string, init: RequestInit = {}): Promise<unknown> {
  const r = await f(`${BASE}${ruta}`, { ...init, headers: cabeceras(cfg), cache: "no-store" });
  const texto = await r.text();
  if (!r.ok) throw new ErrorGhl(`GHL respondió ${r.status}${texto ? `: ${texto.slice(0, 160)}` : ""}`);
  try {
    return texto ? JSON.parse(texto) : {};
  } catch {
    return {};
  }
}

/** El id del contacto en la location, por correo y despues por telefono. */
export async function buscarContacto(cfg: ConfigGhl, datos: { email?: string; telefono?: string }, f: Fetch = fetch): Promise<string | null> {
  const intentos: string[] = [];
  if (datos.email) intentos.push(`email=${encodeURIComponent(datos.email.toLowerCase())}`);
  if (datos.telefono) intentos.push(`number=${encodeURIComponent(datos.telefono.replace(/[^\d+]/g, ""))}`);
  for (const q of intentos) {
    const d = (await pedir(f, cfg, `/contacts/search/duplicate?locationId=${encodeURIComponent(cfg.location)}&${q}`)) as {
      contact?: { id?: string } | null;
    };
    if (d.contact?.id) return d.contact.id;
  }
  return null;
}

/**
 * Aprobado: pone el tag de aprobado y quita el de rechazado. Rechazado, al
 * reves. Deshacer: quita el que se puso por `previo`.
 */
export async function marcarEnGhl(
  cfg: ConfigGhl,
  datos: { email?: string; telefono?: string },
  accion: AccionGhl,
  previo?: "aprobado" | "rechazado",
  f: Fetch = fetch,
): Promise<ResultadoGhl> {
  try {
    const id = await buscarContacto(cfg, datos, f);
    if (!id) return { ok: false, error: "No se encontró el contacto en GHL (por correo ni por teléfono)." };
    const tag = (r: "aprobado" | "rechazado") => (r === "aprobado" ? cfg.tagAprobado : cfg.tagRechazado);
    const ruta = `/contacts/${encodeURIComponent(id)}/tags`;
    if (accion === "deshacer") {
      if (!previo) return { ok: true, contactoId: id };
      await pedir(f, cfg, ruta, { method: "DELETE", body: JSON.stringify({ tags: [tag(previo)] }) });
      return { ok: true, contactoId: id, quito: tag(previo) };
    }
    const contrario = accion === "aprobado" ? "rechazado" : "aprobado";
    await pedir(f, cfg, ruta, { method: "POST", body: JSON.stringify({ tags: [tag(accion)] }) });
    await pedir(f, cfg, ruta, { method: "DELETE", body: JSON.stringify({ tags: [tag(contrario)] }) });
    return { ok: true, contactoId: id, puso: tag(accion), quito: tag(contrario) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falló la llamada a GHL." };
  }
}
