// Probar a Valeria desde el demo: lo que se decide sin red.
//
// El guion de Valeria (la agente del WhatsApp real del hospital) vive en el
// hub, en una sola copia. El demo del Centro Ginecológico no lo tiene ni lo
// quiere tener: reenvía cada turno a `POST /api/hospital/probar` del hub con
// un secreto compartido, y el hub lo corre en modo espejo (nada se guarda, no
// abre casos, no sale por WhatsApp). Acá solo se arma la petición y se cuida
// que nadie deje el chat en bucle.

import type { Politica } from "../freno";

export interface MensajeDePrueba {
  autor: "cliente" | "agente";
  texto: string;
}

export const HUB_POR_DEFECTO = "https://hub.miagentia.com";
export const RUTA_HUB = "/api/hospital/probar";

/** Lo que se le dice a quien prueba cuando el demo no tiene con qué llamar al hub. */
export const SIN_CONEXION = "Falta configurar la conexión con el hub.";
export const SIN_RESPUESTA = "Valeria no respondió. Intenta de nuevo.";

/** Tope de un historial de prueba: más que esto es un bucle, no una prueba. */
export const MAX_MENSAJES = 200;
const MAX_LARGO = 4000;

/**
 * Sesenta turnos cada diez minutos por conversación. El hub tiene el mismo
 * freno; este se aplica antes para no cargarle al hub lo que se puede parar
 * acá.
 */
export const FRENO_PRUEBA: Politica = { max: 60, ventanaSeg: 10 * 60 };

/** El cuerpo que manda el navegador, limpio. null si no tiene forma. */
export function cuerpoDePrueba(b: unknown): { sesion: string; mensajes: MensajeDePrueba[] } | null {
  const cuerpo = (b ?? {}) as { sesion?: unknown; mensajes?: unknown };
  const sesion = String(cuerpo.sesion ?? "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40) || "sin-sesion";
  if (!Array.isArray(cuerpo.mensajes)) return null;
  const mensajes: MensajeDePrueba[] = [];
  for (const m of cuerpo.mensajes.slice(-MAX_MENSAJES)) {
    const autor = (m as { autor?: unknown })?.autor;
    const texto = String((m as { texto?: unknown })?.texto ?? "").trim().slice(0, MAX_LARGO);
    if ((autor !== "cliente" && autor !== "agente") || !texto) continue;
    mensajes.push({ autor, texto });
  }
  if (mensajes.length === 0 || mensajes[mensajes.length - 1].autor !== "cliente") return null;
  return { sesion, mensajes };
}

/** Con qué se cuenta el freno: la conversación, que es lo que el navegador identifica. */
export function claveDeFreno(sesion: string): string {
  return `valeria-demo:${sesion}`;
}

/** A dónde se reenvía. HUB_URL permite apuntar a otro hub (local, por ejemplo). */
export function urlDelHub(base: string | undefined = process.env.HUB_URL): string {
  const b = (base ?? "").trim().replace(/\/+$/, "") || HUB_POR_DEFECTO;
  return `${b}${RUTA_HUB}`;
}

/** La petición al hub, lista para `fetch`. null sin secreto: el camino está cerrado. */
export function peticionAlHub(
  cuerpo: { sesion: string; mensajes: MensajeDePrueba[] },
  secreto: string | undefined = process.env.VALERIA_PRUEBA_SECRET,
  base?: string,
): { url: string; init: RequestInit } | null {
  const s = (secreto ?? "").trim();
  if (!s) return null;
  return {
    url: urlDelHub(base),
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s}` },
      body: JSON.stringify(cuerpo),
    },
  };
}
