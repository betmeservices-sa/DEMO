// Lo puro de la descarga: el tamaño del archivo, cómo se parte el titular en
// renglones y cómo se llaman los archivos. El dibujo vive en
// components/estudio/Descargar.tsx.

/** El feed de Instagram y Facebook en vertical, 4:5. */
export const ANCHO_DESCARGA = 1080;
export const ALTO_DESCARGA = 1350;

/** Renglones a lo ancho que dé, palabra por palabra. */
function partir(palabras: string[], medir: (s: string) => number, ancho: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (actual && medir(prueba) > ancho) {
      lineas.push(actual);
      actual = p;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/**
 * Como `text-wrap: balance` en la vista previa: los mismos renglones que a
 * todo lo ancho, pero parejos, sin una palabra sola colgando en el último.
 */
export function partirEquilibrado(texto: string, medir: (s: string) => number, anchoMax: number): string[] {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  const base = partir(palabras, medir, anchoMax);
  if (base.length < 2) return base;
  let lo = 0;
  let hi = anchoMax;
  for (let k = 0; k < 20; k++) {
    const mid = (lo + hi) / 2;
    if (partir(palabras, medir, mid).length > base.length) lo = mid;
    else hi = mid;
  }
  return partir(palabras, medir, hi);
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/** "solano-pro-painting-antes-y-despues-2.png". Sin número si es una sola. */
export function nombreArchivo(marca: string, titulo: string, extension: string, lamina?: number): string {
  return `${[slug(marca), slug(titulo), lamina ?? ""].filter(Boolean).join("-")}.${extension}`;
}

/** La extensión de una imagen por su tipo, para la foto sin texto. */
export function extensionDe(tipo: string): string {
  const e = tipo.split("/")[1]?.split(";")[0] ?? "";
  return e === "jpeg" ? "jpg" : e || "png";
}
