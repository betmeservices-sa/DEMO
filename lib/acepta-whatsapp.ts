/**
 * Lo que contestó cuando se le preguntó si le escribíamos por WhatsApp, en
 * TRES estados: `true` dijo que sí, `false` dijo que NO, y `undefined` es que
 * no se llegó a preguntar (no contestó, cayó al buzón, sonó una grabación,
 * colgó antes). A ese último se le escribe igual: solo el "no" expreso cierra
 * la puerta al seguimiento.
 *
 * El análisis de Vapi lo manda como texto: "si", "no" o "sin_respuesta".
 * Antes era un booleano descrito solo como "true si quedó en seguir por
 * WhatsApp", y el modelo ponía `false` cada vez que nadie había dicho que sí:
 * una llamada sin contestar quedaba como un "no" y el seguimiento no salía
 * (2026-10-06, la llamada de CrediQ que contestó el aviso de cobro de Tigo).
 * El booleano se sigue aceptando por si llega un análisis con el esquema viejo.
 */
export function aceptaWhatsapp(valor: unknown): boolean | undefined {
  if (typeof valor === "boolean") return valor;
  if (typeof valor !== "string") return undefined;
  const t = valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (t === "si") return true;
  if (t === "no") return false;
  return undefined;
}
