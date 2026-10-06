// Copia el audio de una llamada a nuestro bucket privado.
//
// La plataforma de voz borra el historial a los 14 días, y con él la
// grabación. Una propuesta de un concierto en cuatro meses tiene que poder
// escucharse en cuatro meses, así que al colgar (en `after`, sin demorar la
// respuesta al webhook) se baja el audio y se sube a `eventos-grabaciones`.
//
// Las URL que trae el reporte apuntan al bucket privado de la plataforma y a
// veces responden 400; las que se pueden bajar son las firmadas que da la API
// de la llamada. Se prueban en ese orden. Si nada funciona, la llamada queda
// sin copia y se sigue sirviendo desde la plataforma mientras exista.

import { fetchVapiCall } from "@/lib/vapi";
import { marcarGrabacion, subirAudio } from "./store";

const ESPERA_MS = 20_000;

async function bajar(url: string): Promise<{ bytes: ArrayBuffer; tipo: string } | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ESPERA_MS);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) return null;
    const bytes = await r.arrayBuffer();
    if (bytes.byteLength < 1000) return null;
    return { bytes, tipo: r.headers.get("content-type")?.split(";")[0] || "audio/wav" };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function extension(tipo: string): string {
  if (tipo.includes("mpeg") || tipo.includes("mp3")) return "mp3";
  if (tipo.includes("ogg")) return "ogg";
  if (tipo.includes("mp4") || tipo.includes("m4a")) return "m4a";
  return "wav";
}

export async function copiarGrabacion(callId: string, urlsDelReporte: string[]): Promise<string | null> {
  const candidatas: string[] = [];
  try {
    const call = await fetchVapiCall(callId);
    const a = call?.artifact;
    if (a?.presignedMonoUrl) candidatas.push(a.presignedMonoUrl);
    if (a?.presignedStereoUrl) candidatas.push(a.presignedStereoUrl);
  } catch (err) {
    console.error(`[eventos] no se pudo pedir la llamada ${callId}:`, err);
  }
  candidatas.push(...urlsDelReporte);

  for (const url of [...new Set(candidatas)]) {
    const audio = await bajar(url);
    if (!audio) continue;
    const path = `${callId}.${extension(audio.tipo)}`;
    try {
      await subirAudio(path, audio.bytes, audio.tipo);
      await marcarGrabacion(callId, path);
      return path;
    } catch (err) {
      console.error(`[eventos] no se pudo guardar el audio de ${callId}:`, err);
      return null;
    }
  }
  return null;
}
