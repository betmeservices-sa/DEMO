// Lo que se le pide al modelo de texto: el copy de cada pieza con la voz de la
// marca, a partir de lo que se escribió en Crear. Puro, para probarlo sin red;
// la llamada vive en proveedores/openai.ts.
//
// El modelo devuelve lo mismo que un ángulo del banco (título, texto,
// hashtags, láminas, guion e idea de la imagen), así que el resto del motor
// arma las piezas igual que con la muestra.

import { fotoDeMuestraPara, type Angulo, type TextoAngulo } from "./banco";
import { LAMINAS_CARRUSEL, laminasDeCarrusel } from "./generador";
import { llevaImagen } from "./imagen";
import type { Idioma, Marca, Pieza, TipoPieza } from "./tipos";

/** El titular va encima de la foto: largo, no cabe en las letras grandes. */
export const LARGO_TITULO = 40;
export const LARGO_LAMINA = 45;

const FORMATO: Record<TipoPieza, string> = {
  imagen: "un post de una imagen para Instagram y Facebook",
  carrusel: `un carrusel de ${LAMINAS_CARRUSEL} láminas para Instagram`,
  video: "un video corto vertical (Reels, TikTok, Shorts) que dice a cámara el avatar de la marca",
  anuncio: "un anuncio pagado de Meta, en Facebook e Instagram",
  texto: "una publicación solo de texto para Facebook, LinkedIn y Google",
};

function formatoCon(formato: TipoPieza, laminas: number): string {
  return formato === "carrusel" ? `un carrusel de ${laminas} láminas para Instagram` : FORMATO[formato];
}

/**
 * Las fotos del encargo que el modelo puede ver: las subidas (URL pública o
 * data URL en local). Las de muestra viven dentro del panel y no le llegan.
 */
export function fotosParaModelo(fotos?: string[]): string[] {
  return (fotos ?? []).filter((f) => /^(https:|data:image\/)/.test(f));
}

export interface FotosDelPedido {
  /** Cuántas fotos van adjuntas al pedido, en orden. */
  n: number;
  /** La primera es el antes y la segunda el después. */
  antesDespues?: boolean;
}

/** Qué son las fotos adjuntas y cómo se usan: el modelo escribe sobre lo que se ve en ellas. */
function lineasDeFotos(formato: TipoPieza, f: FotosDelPedido | undefined, piezas: number): string[] {
  if (!f?.n || !llevaImagen(formato)) return [];
  if (f.antesDespues) {
    return [
      "Van dos fotos de la misma obra: la PRIMERA es el ANTES y la SEGUNDA el DESPUÉS.",
      formato === "carrusel"
        ? "El carrusel lleva esas dos láminas en ese orden: primero el antes, después el después."
        : "La imagen las muestra juntas, el antes arriba y el después abajo.",
      "Escribe sobre el cambio que se ve entre las dos. No describas nada que no se vea en las fotos.",
    ];
  }
  const una = f.n === 1;
  return [
    una ? "Va una foto de la obra." : `Van ${f.n} fotos de la obra, en orden.`,
    formato === "carrusel"
      ? una
        ? "Es la primera lámina del carrusel."
        : `Son las láminas del carrusel en ese orden (lámina 1 = foto 1).`
      : una || piezas === 1
        ? "Es la imagen de la pieza."
        : `La pieza 1 lleva la foto 1, la 2 la foto 2, y así${piezas > f.n ? `, volviendo a la foto 1 después de la ${f.n}` : ""}.`,
    "Escribe sobre lo que se ve en su foto. No describas nada que no se vea.",
  ];
}

const IDIOMA: Record<Idioma, string> = { es: "español", en: "inglés" };

/** Quién es la marca y qué no se dice. Va de instrucciones, igual en cada pedido. */
export function instruccionesDeMarca(marca: Marca): string {
  return [
    `Escribes el contenido de redes de ${marca.nombre}, ${marca.rubro.toLowerCase()} en ${marca.ciudad}.`,
    `Voz de la marca: ${marca.tono}`,
    `Servicios: ${marca.servicios.join(", ")}.`,
    marca.ofertas.length ? `Ofertas vigentes, solo si vienen al caso: ${marca.ofertas.join("; ")}.` : "",
    marca.palabrasProhibidas.length ? `Nunca digas: ${marca.palabrasProhibidas.map((p) => `"${p}"`).join(", ")}.` : "",
    "No inventes nada que no esté aquí ni en el pedido: precios, años de experiencia, garantías, licencias, reseñas, nombres de clientes ni cifras.",
    "Escribe como habla la gente del rubro, no como un folleto.",
  ]
    .filter(Boolean)
    .join("\n");
}

function camposDelFormato(formato: TipoPieza, marca: Marca, laminas = LAMINAS_CARRUSEL, sinTextoEncima = false): string[] {
  const otras = laminas - 1;
  return [
    formato === "anuncio"
      ? `- titulo: el titular del anuncio, máximo ${LARGO_TITULO} caracteres.`
      : formato === "video"
        ? "- titulo: el título del video, corto."
        : `- titulo: el titular que va encima de la foto, máximo ${LARGO_TITULO} caracteres.`,
    formato === "anuncio"
      ? `- texto: el texto principal del anuncio, una o dos frases que invitan a "${marca.cta.es}" (o "${marca.cta.en}" en inglés).`
      : "- texto: el texto de la publicación, de dos a cuatro frases, sin hashtags.",
    formato === "anuncio" ? "- hashtags: vacío." : "- hashtags: de tres a cinco, de su servicio y su ciudad.",
    formato === "carrusel" && !sinTextoEncima
      ? `- laminas: el texto encima de las láminas 2 a ${laminas}, ${otras} textos de máximo ${LARGO_LAMINA} caracteres que siguen al titular.`
      : "- laminas: vacío.",
    formato === "video" ? "- guion: lo que dice el avatar a cámara, en primera persona, de 60 a 110 palabras." : "- guion: vacío.",
    formato === "video" ? "- duracion: los segundos que dura el guion leído en voz alta." : "- duracion: 0.",
    formato === "video" || formato === "texto"
      ? "- idea: vacío."
      : "- idea: la escena de la foto, en español y concreta (dónde, qué se ve, a qué hora), sin texto ni logos.",
  ];
}

/**
 * El pedido de un lote: cuántas piezas, en qué idioma cada una y qué lleva
 * cada campo. Con fotos adjuntas, también qué es cada una.
 */
export function pedidoDeLote(texto: string, formato: TipoPieza, marca: Marca, idiomas: Idioma[], fotos?: FotosDelPedido): string {
  const conFotos = Boolean(fotos?.n) && llevaImagen(formato);
  const laminas = conFotos ? laminasDeCarrusel(fotos!.n, fotos!.antesDespues) : LAMINAS_CARRUSEL;
  return [
    `Pedido: ${texto.trim()}`,
    `Formato: ${formatoCon(formato, laminas)}.`,
    ...lineasDeFotos(formato, fotos, idiomas.length),
    `Escribe ${idiomas.length} ${idiomas.length === 1 ? "pieza" : "piezas distintas entre sí (otro ángulo, otro gancho)"}, en este idioma cada una: ${idiomas.map((i, k) => `${k + 1}. ${IDIOMA[i]}`).join(", ")}.`,
    "Cada pieza lleva:",
    ...camposDelFormato(formato, marca, laminas, conFotos && Boolean(fotos?.antesDespues)),
  ].join("\n");
}

/** El pedido de otra versión de una pieza, con lo que dijo quien la revisó. */
export function pedidoDeVersion(pieza: Pieza, marca: Marca, motivo: string): string {
  const laminas = pieza.rotulos?.slice(1).filter(Boolean) ?? [];
  return [
    `Esta pieza no quedó. Escribe otra versión en ${IDIOMA[pieza.idioma]}, del mismo formato: ${FORMATO[pieza.tipo]}.`,
    `Motivo de quien la revisó: ${motivo.trim() || "ninguno; prueba otro ángulo y otro gancho"}.`,
    `Título actual: ${pieza.titulo}`,
    `Texto actual: ${pieza.texto}`,
    laminas.length ? `Láminas actuales: ${laminas.join(" | ")}` : "",
    pieza.guion ? `Guion actual: ${pieza.guion}` : "",
    "Escribe una sola pieza. Lleva:",
    ...camposDelFormato(pieza.tipo, marca),
  ]
    .filter(Boolean)
    .join("\n");
}

const TEXTO = { type: "string" } as const;
const LISTA = { type: "array", items: TEXTO } as const;

/** La forma fija de la respuesta: el modelo no puede devolver otra cosa. */
export const ESQUEMA_PIEZAS = {
  type: "object",
  properties: {
    piezas: {
      type: "array",
      items: {
        type: "object",
        properties: { titulo: TEXTO, texto: TEXTO, hashtags: LISTA, laminas: LISTA, guion: TEXTO, duracion: { type: "integer" }, idea: TEXTO },
        required: ["titulo", "texto", "hashtags", "laminas", "guion", "duracion", "idea"],
        additionalProperties: false,
      },
    },
  },
  required: ["piezas"],
  additionalProperties: false,
} as const;

export interface PiezaEscrita {
  titulo: string;
  texto: string;
  hashtags: string[];
  laminas: string[];
  guion: string;
  duracion: number;
  idea: string;
}

function hashtag(h: string): string {
  const limpio = h.replace(/\s+/g, "").replace(/^#+/, "");
  return limpio ? `#${limpio}` : "";
}

/**
 * Lo que escribió el modelo, como ángulos del motor. Cada uno trae el mismo
 * texto en los dos idiomas porque ya viene en el que le toca a su pieza. Las
 * piezas con foto de obra toman una de la marca que vaya con la escena.
 */
export function angulosEscritos(escritas: PiezaEscrita[], formato: TipoPieza, marca: Marca, desde = 0): Angulo[] {
  return escritas
    .filter((e) => e.titulo?.trim() && e.texto?.trim())
    .map((e, i) => {
      const t: TextoAngulo = {
        titulo: e.titulo.trim(),
        texto: e.texto.trim(),
        hashtags: [...new Set(e.hashtags.map(hashtag).filter(Boolean))],
        guion: formato === "video" ? e.guion.trim() : undefined,
        laminas: formato === "carrusel" ? e.laminas.map((l) => l.trim()) : undefined,
      };
      const idea = e.idea.trim() || e.titulo.trim();
      const foto = formato === "video" ? undefined : fotoDeMuestraPara(marca.id, undefined, desde + i, idea);
      return {
        id: `escrito-${desde + i}`,
        tipo: formato,
        claves: [],
        idea,
        fotos: foto ? [foto] : [],
        duracion: formato === "video" ? Math.min(90, Math.max(15, e.duracion || 30)) : undefined,
        es: t,
        en: t,
      };
    });
}
