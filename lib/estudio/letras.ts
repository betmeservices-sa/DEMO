// Las letras del texto que va encima de las fotos.
//
// Un catálogo corto y cerrado: ninguna es de sistema (nada de Arial ni
// Helvetica), todas traen tildes y ñ, y cada una dice con qué fotos va. La
// sugerencia sale de lo que se leyó de la foto (LecturaImagen) y de la marca,
// así quien arma la pieza elige entre tres que ya van con esa foto.
//
// El texto lo pone la plantilla con esta letra, nunca el modelo de imagen.

import type { CSSProperties } from "react";
import type { EstiloImagen, LecturaImagen, Marca, Pieza, TipoPieza } from "./tipos";

export interface Letra {
  id: string;
  /** La familia tal como la sirve Google Fonts. */
  familia: string;
  /** Lo que se le pide a Google Fonts: ejes y pesos. */
  pedido: string;
  /** La familia genérica mientras carga. */
  generica: "serif" | "sans-serif" | "cursive";
  peso: number;
  /** Cómo se lee la letra, en una o dos palabras. */
  caracter: string;
  /** Con qué fotos va, de más a menos. */
  vaCon: EstiloImagen[];
  mayusculas?: boolean;
  /** Tamaño relativo: una condensada aguanta más grande, una de brocha lo necesita. */
  escala: number;
  interlineado: number;
  espaciado?: string;
  /** Hasta cuántos caracteres se lee bien encima de una foto. */
  maximo: number;
  /** Aguanta un precio o un porcentaje grande. */
  oferta?: boolean;
}

export const LETRAS: Letra[] = [
  {
    id: "fraunces",
    familia: "Fraunces",
    pedido: "Fraunces:opsz,wght@9..144,600",
    generica: "serif",
    peso: 600,
    caracter: "Clásica",
    vaCon: ["clasica", "calida", "lujo"],
    escala: 1,
    interlineado: 1.02,
    espaciado: "-0.01em",
    maximo: 60,
  },
  {
    id: "big-shoulders",
    familia: "Big Shoulders Display",
    pedido: "Big+Shoulders+Display:wght@800",
    generica: "sans-serif",
    peso: 800,
    caracter: "De obra",
    vaCon: ["obra", "clasica"],
    mayusculas: true,
    escala: 1.25,
    interlineado: 0.92,
    espaciado: "0.01em",
    maximo: 48,
    oferta: true,
  },
  {
    id: "outfit",
    familia: "Outfit",
    pedido: "Outfit:wght@600",
    generica: "sans-serif",
    peso: 600,
    caracter: "Moderna",
    vaCon: ["moderna", "lujo"],
    escala: 0.95,
    interlineado: 1.04,
    espaciado: "-0.02em",
    maximo: 70,
  },
  {
    id: "zilla-slab",
    familia: "Zilla Slab",
    pedido: "Zilla+Slab:wght@700",
    generica: "serif",
    peso: 700,
    caracter: "Artesanal",
    vaCon: ["calida", "obra", "clasica"],
    escala: 1.02,
    interlineado: 1,
    maximo: 60,
  },
  {
    id: "caveat-brush",
    familia: "Caveat Brush",
    pedido: "Caveat+Brush",
    generica: "cursive",
    peso: 400,
    caracter: "A brocha",
    vaCon: ["obra", "calida"],
    escala: 1.3,
    interlineado: 0.95,
    maximo: 30,
  },
  {
    id: "bodoni-moda",
    familia: "Bodoni Moda",
    pedido: "Bodoni+Moda:opsz,wght@6..96,600",
    generica: "serif",
    peso: 600,
    caracter: "Fina",
    vaCon: ["lujo", "moderna"],
    escala: 1.02,
    interlineado: 1.02,
    maximo: 50,
  },
  {
    id: "montserrat",
    familia: "Montserrat",
    pedido: "Montserrat:wght@800",
    generica: "sans-serif",
    peso: 800,
    caracter: "Geométrica",
    vaCon: ["moderna", "obra"],
    escala: 0.86,
    interlineado: 1,
    espaciado: "-0.02em",
    maximo: 50,
    oferta: true,
  },
];

const POR_ID = new Map(LETRAS.map((l) => [l.id, l]));

export function letraPorId(id: string | undefined): Letra | undefined {
  return id ? POR_ID.get(id) : undefined;
}

/** La hoja de Google Fonts con todo el catálogo. */
export function urlFuentes(): string {
  return `https://fonts.googleapis.com/css2?${LETRAS.map((l) => `family=${l.pedido}`).join("&")}&display=swap`;
}

/** Los formatos que llevan texto encima de la foto. El video lleva subtítulos y el anuncio su titular abajo. */
export function llevaRotulo(tipo: TipoPieza): boolean {
  return tipo === "imagen" || tipo === "carrusel" || tipo === "texto";
}

/** El texto de cada lámina; sin rótulos guardados, el titular va en la portada. */
export function rotulosDe(p: Pieza): string[] {
  if (!llevaRotulo(p.tipo)) return [];
  return p.rotulos ?? [p.titulo];
}

const OFERTA = /\d+\s*%|\boff\b|descuento|gratis|\bfree\b/i;

export interface PedidoLetras {
  lectura?: LecturaImagen;
  marca?: Pick<Marca, "letra">;
  /** Los textos que van encima: manda el más largo. */
  textos: string[];
}

function puntos(l: Letra, p: PedidoLetras, largo: number, oferta: boolean): number {
  if (largo > l.maximo) return -100;
  let s = 0;
  if (p.lectura) {
    const i = l.vaCon.indexOf(p.lectura.estilo);
    if (i >= 0) s += 6 - i * 2;
  }
  if (oferta && l.oferta) s += 3;
  if (p.marca?.letra === l.id) s += 3;
  return s;
}

/**
 * Las tres letras que van con esa foto y ese texto, la mejor primero. Las que
 * no aguantan el largo del texto quedan fuera; si el texto es tan largo que
 * no entra en ninguna, van las que más aguantan. La de la marca, si aguanta,
 * sale siempre: es la de su manual.
 */
export function sugerirLetras(p: PedidoLetras, cuantas = 3): Letra[] {
  const largo = Math.max(0, ...p.textos.map((t) => t.trim().length));
  const oferta = p.textos.some((t) => OFERTA.test(t));
  const conPuntos = LETRAS.map((l, i) => ({ l, i, s: puntos(l, p, largo, oferta) }));
  const caben = conPuntos.filter((x) => x.s > -100);
  const lista = caben.length ? caben : conPuntos.map((x) => ({ ...x, s: x.l.maximo }));
  const orden = lista.sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.l);
  const elegidas = orden.slice(0, cuantas);
  const deMarca = orden.find((l) => l.id === p.marca?.letra);
  if (deMarca && !elegidas.includes(deMarca)) elegidas[elegidas.length - 1] = deMarca;
  return elegidas;
}

/** La letra de la pieza: la que eligió quien la revisa o, si no eligió, la primera sugerida. */
export function letraDe(p: Pieza, marca?: Pick<Marca, "letra">): Letra {
  return letraPorId(p.letra) ?? sugerirLetras({ lectura: p.lectura, marca, textos: rotulosDe(p) })[0];
}

/** Si una letra aguanta todos los textos de la pieza. */
export function aguanta(l: Letra, textos: string[]): boolean {
  return textos.every((t) => t.trim().length <= l.maximo);
}

export function estiloLetra(l: Letra): CSSProperties {
  return {
    fontFamily: `'${l.familia}', ${l.generica}`,
    fontWeight: l.peso,
    lineHeight: l.interlineado,
    letterSpacing: l.espaciado,
    textTransform: l.mayusculas ? "uppercase" : undefined,
  };
}

/**
 * El tamaño del texto en unidades del ancho de la foto (cqw), para que el
 * gráfico se vea igual en la tarjeta chica y en la vista grande.
 */
export function tamanoRotulo(l: Letra, texto: string): number {
  const n = texto.trim().length;
  const base = n <= 12 ? 13 : n <= 24 ? 10.5 : n <= 40 ? 8.5 : 7;
  return Math.round(base * l.escala * 10) / 10;
}

const ESTILO_NOMBRE: Record<EstiloImagen, string> = {
  clasica: "Casa clásica",
  moderna: "Líneas modernas",
  obra: "Obra en proceso",
  calida: "Ambiente cálido",
  lujo: "Acabado fino",
};

const TONO_NOMBRE: Record<LecturaImagen["tono"], string> = { claro: "clara", medio: "de tono medio", oscuro: "oscura" };

/** "Casa clásica, clara, con espacio arriba". */
export function describirLectura(l: LecturaImagen): string {
  return `${ESTILO_NOMBRE[l.estilo]}, ${TONO_NOMBRE[l.tono]}, con espacio ${l.zona}`;
}
