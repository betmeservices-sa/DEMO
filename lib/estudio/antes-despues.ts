// Antes y después: dos fotos de la misma obra, siempre en ese orden.
//
// La pieza guarda las dos en `medios`, el antes primero. En un carrusel son
// dos láminas; en un post o un anuncio (una sola imagen) van juntas, el antes
// arriba y el después abajo. Cada foto lleva su etiqueta en el idioma de la
// pieza. Lo usan la vista previa, las miniaturas y la descarga.

import type { Idioma, Pieza } from "./tipos";

const ETIQUETAS: Record<Idioma, [string, string]> = {
  es: ["Antes", "Después"],
  en: ["Before", "After"],
};

/** "Antes" y "Después" (o "Before" y "After"), en ese orden. */
export function etiquetasDe(idioma: Idioma): [string, string] {
  return ETIQUETAS[idioma] ?? ETIQUETAS.es;
}

/** La letra de las etiquetas: la misma en la pantalla y en el archivo (viene en el catálogo de letras.ts). */
export const LETRA_ETIQUETA = { familia: "Montserrat", peso: 800 } as const;

export function esAntesDespues(p: Pick<Pieza, "antesDespues" | "medios">): boolean {
  return Boolean(p.antesDespues) && p.medios.length >= 2;
}

/** Post o anuncio de antes y después: las dos fotos en una sola imagen. */
export function enUnaImagen(p: Pick<Pieza, "antesDespues" | "medios" | "tipo">): boolean {
  return esAntesDespues(p) && p.tipo !== "carrusel";
}

/** La etiqueta de la lámina i de un carrusel de antes y después (solo las dos primeras). */
export function etiquetaDeLamina(p: Pick<Pieza, "antesDespues" | "medios" | "tipo" | "idioma">, i: number): string | undefined {
  if (!esAntesDespues(p) || p.tipo !== "carrusel" || i > 1) return undefined;
  return etiquetasDe(p.idioma)[i];
}
