// Cómo se le pide una imagen al modelo (OpenAI, gpt-image-2.5).
//
// La imagen sale SIN texto y, cuando la lámina lleva rótulo, con el tercio de
// arriba o el de abajo despejado: ahí la plantilla pone después el titular
// con su letra (letras.ts). El resto sale de la marca (rubro, ciudad,
// colores) y de la idea de la pieza. En un carrusel cada lámina dice que es
// parte de la misma serie, para que no salgan tres fotos de estilos distintos.
//
// Después el modelo con visión lee la imagen que salió (LecturaImagen) y la
// letra se sugiere con lo que de verdad quedó, no con lo que se pidió.

import type { Marca, OrigenImagen, PedidoImagen, Pieza } from "./tipos";

export const MODELO_IMAGEN = "gpt-image-2.5-flare";

/** 4:5, el feed de Instagram y Facebook. El modelo pide lados múltiplos de 16. */
export const TAMANO_IMAGEN = "1088x1360";

/** Los formatos que llevan imagen elegible: generada o foto de obra. */
export function llevaImagen(tipo: Pieza["tipo"]): boolean {
  return tipo === "imagen" || tipo === "carrusel" || tipo === "anuncio";
}

/** De dónde sale la imagen de la pieza. El anuncio, sin decir nada, la genera. */
export function origenDe(p: Pick<Pieza, "tipo" | "origenImagen">): OrigenImagen {
  return p.origenImagen ?? (p.tipo === "anuncio" ? "ia" : "obra");
}

/** Arriba, salvo que la idea pida el espacio abajo: en una casa arriba queda el cielo; en un cuarto, la pared. */
export function zonaParaTexto(idea: string): "arriba" | "abajo" {
  return /\babajo\b|inferior|\bbottom\b/i.test(idea) ? "abajo" : "arriba";
}

/** La idea sin la nota de dónde va el titular, que el pedido ya dice aparte. */
function escena(idea: string): string {
  return idea
    .replace(/,?\s*(con\s+)?espacio (arriba|abajo)[^,.]*/i, "")
    .trim()
    .replace(/[.\s]+$/, "");
}

export interface EntradaImagen {
  marca: Pick<Marca, "nombre" | "rubro" | "ciudad" | "colores">;
  idea: string;
  /** Si esta lámina lleva texto encima. */
  conTexto: boolean;
  /** En un carrusel: qué lámina es (desde 0) de cuántas. */
  lamina?: { i: number; n: number };
}

export function pedidoDeImagen(e: EntradaImagen): PedidoImagen {
  const zona = e.conTexto ? zonaParaTexto(e.idea) : undefined;
  const { marca } = e;
  const lineas = [
    `Fotografía realista para las redes de ${marca.nombre}, ${marca.rubro.toLowerCase()} en ${marca.ciudad}.`,
    `Escena: ${escena(e.idea)}.`,
    "Luz natural, colores reales y acabados limpios, como una buena foto de obra terminada.",
    zona
      ? `Vertical 4:5. El tercio ${zona === "arriba" ? "superior" : "inferior"} queda despejado y sin detalles (cielo, pared lisa o fondo desenfocado) porque ahí va un titular; lo importante de la escena va en los otros dos tercios.`
      : "Vertical 4:5. La escena ocupa todo el cuadro.",
    `Tonos que combinen con los colores de la marca (${marca.colores.join(", ")}) sin que dominen la escena.`,
    e.lamina && e.lamina.n > 1
      ? `Lámina ${e.lamina.i + 1} de ${e.lamina.n} de una misma serie: la misma luz, la misma paleta y el mismo estilo de encuadre en todas.`
      : undefined,
    "Sin texto, letras, números, logos ni marcas de agua dentro de la imagen.",
    "Si aparece gente, de espaldas o trabajando, sin caras en primer plano.",
  ];
  return {
    modelo: MODELO_IMAGEN,
    tamano: TAMANO_IMAGEN,
    calidad: "medium",
    zonaLibre: zona,
    prompt: lineas.filter(Boolean).join("\n"),
  };
}

/** Un pedido por lámina; la lámina sin rótulo no pide espacio libre. */
export function pedidosDePieza(p: Pick<Pieza, "ideaImagen" | "titulo" | "rotulos" | "medios" | "tipo">, marca: EntradaImagen["marca"]): PedidoImagen[] {
  const n = Math.max(1, p.tipo === "carrusel" ? p.medios.length : 1);
  return Array.from({ length: n }, (_, i) =>
    pedidoDeImagen({
      marca,
      idea: p.ideaImagen ?? p.titulo,
      conTexto: Boolean(p.rotulos?.[i]?.trim()),
      lamina: n > 1 ? { i, n } : undefined,
    }),
  );
}
