// Probar a Valeria desde el demo: lo que se decide sin red.
//
// Hay dos Valerias para probar:
// - La del LABORATORIO (por defecto): su guion (valeria-guion.ts) y su base
//   (lab-kb-datos.ts) viven en este demo, salen del respaldo del WhatsApp de
//   la Sucursal Escalón, y contesta con luna como cualquier turno del tenant.
// - La del HOSPITAL: su guion vive en el hub, en una sola copia. Cada turno se
//   reenvía a `POST /api/hospital/probar` con un secreto compartido, y el hub
//   lo corre en modo espejo (nada se guarda, no abre casos, no sale por
//   WhatsApp).
// Acá solo se arma lo que viaja y se cuida que nadie deje el chat en bucle.

import type { Politica } from "../freno";
import type { TurnoIA } from "../ai";

export type GuionDePrueba = "laboratorio" | "hospital";

/** El guion que pidió el navegador. Cualquier otra cosa es el del laboratorio. */
export function guionDePrueba(b: unknown): GuionDePrueba {
  return (b as { guion?: unknown } | null)?.guion === "hospital" ? "hospital" : "laboratorio";
}

/** El historial de la prueba en la forma de un turno real: lo de Valeria cuenta como del equipo. */
export function turnosParaIA(mensajes: MensajeDePrueba[]): TurnoIA[] {
  return mensajes.map((m) => ({ autor: m.autor === "cliente" ? "cliente" : "staff", texto: m.texto }));
}

/**
 * Cuándo le escribe una persona después de abrir un caso, con la hora de El
 * Salvador y el horario de la Sucursal Escalón (lunes a sábado de 6:00 a.m. a
 * 6:00 p.m., domingo hasta las 12:00 m.). No promete minutos: el personal
 * contesta entre paciente y paciente.
 */
export function cierreDeCaso(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/El_Salvador",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(ahora);
  const dia = partes.find((p) => p.type === "weekday")?.value;
  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? 0);
  const cierra = dia === "Sun" ? 12 : 18;
  if (hora >= 6 && hora < cierra) return "Una compañera del laboratorio le escribe por aquí lo antes posible.";
  if (hora < 6) return "Una compañera del laboratorio le escribe por aquí a partir de las 6:00 a.m.";
  return "Una compañera del laboratorio le escribe por aquí mañana a partir de las 6:00 a.m.";
}

/** Lo que el navegador muestra cuando Valeria habría abierto un caso en la prueba. */
export interface CasoDePrueba {
  tipo: string;
  titulo: string;
}

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
