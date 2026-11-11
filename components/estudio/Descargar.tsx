"use client";

// Bajar la pieza: lista para subir (la foto con su titular, con la letra y el
// velo de la vista previa) o solo la foto. Un carrusel baja todas sus láminas
// en un .zip.
//
// La pieza lista se dibuja aquí, en el navegador, igual que Rotulo.tsx la
// pinta encima de la foto: mismas medidas en proporción al ancho, ahora a
// 1080 × 1350. Un antes y después lleva sus etiquetas (AntesDespues.tsx) y,
// si es un post o un anuncio, las dos fotos en un solo archivo, el antes
// arriba.

import { useState } from "react";
import { Download, ImageIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { LETRA_ETIQUETA, enUnaImagen, esAntesDespues, etiquetaDeLamina, etiquetasDe } from "@/lib/estudio/antes-despues";
import { ALTO_DESCARGA, ANCHO_DESCARGA, extensionDe, nombreArchivo, partirEquilibrado } from "@/lib/estudio/descarga";
import { letraDe, rotulosDe, tamanoRotulo, type Letra } from "@/lib/estudio/letras";
import type { LecturaImagen, Marca, Pieza } from "@/lib/estudio/tipos";
import { armarZip } from "@/lib/estudio/zip";
import { MEDIDA_ETIQUETA } from "./AntesDespues";
import { VELO, colorVisible } from "./Rotulo";

async function bytesDe(url: string): Promise<Blob> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`No se pudo leer la foto (${r.status}).`);
  return r.blob();
}

/** Px de una medida en em de la letra (el espaciado viene en em). */
function enPx(medida: string | undefined, tamano: number): number {
  if (!medida) return 0;
  const n = Number.parseFloat(medida);
  return medida.endsWith("em") ? n * tamano : n;
}

/** La foto cubre el rectángulo, centrada y recortada, como object-cover. */
async function cubrir(ctx: CanvasRenderingContext2D, foto: Blob, x: number, y: number, ancho: number, alto: number) {
  const img = await createImageBitmap(foto);
  const escala = Math.max(ancho / img.width, alto / img.height);
  const w = img.width * escala;
  const h = img.height * escala;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, ancho, alto);
  ctx.clip();
  ctx.drawImage(img, x + (ancho - w) / 2, y + (alto - h) / 2, w, h);
  ctx.restore();
  img.close();
}

/** "ANTES" o "DESPUÉS" en su píldora, arriba a la izquierda del tramo que empieza en y. */
async function etiqueta(ctx: CanvasRenderingContext2D, texto: string, y: number, cqw: number) {
  const m = MEDIDA_ETIQUETA;
  const tamano = m.letra * cqw;
  const fuente = `${LETRA_ETIQUETA.peso} ${tamano}px "${LETRA_ETIQUETA.familia}", sans-serif`;
  const t = texto.toUpperCase();
  await document.fonts.load(fuente, t);
  ctx.save();
  ctx.font = fuente;
  ctx.letterSpacing = `${m.espaciado * tamano}px`;
  const padX = m.padX * cqw;
  const padY = m.padY * cqw;
  const w = ctx.measureText(t).width + 2 * padX;
  const h = tamano + 2 * padY;
  const x0 = m.margen * cqw;
  const y0 = y + m.margen * cqw;
  ctx.fillStyle = "rgba(11,24,48,0.8)";
  ctx.beginPath();
  ctx.roundRect(x0, y0, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(t, x0 + padX, y0 + h / 2);
  ctx.restore();
}

/**
 * Una lámina: la foto (o las dos de un antes y después, el antes arriba), el
 * titular con su velo si lo lleva, y encima las etiquetas.
 */
async function lamina(
  fotos: Blob[],
  etiquetas: string[],
  texto: string,
  letra: Letra,
  lectura: LecturaImagen | undefined,
  color: string,
): Promise<Blob> {
  const W = ANCHO_DESCARGA;
  const H = ALTO_DESCARGA;
  const cqw = W / 100;
  const lienzo = document.createElement("canvas");
  lienzo.width = W;
  lienzo.height = H;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("El navegador no dejó dibujar la pieza.");

  // Dónde empieza cada foto: una cubre el cuadro; dos se lo parten con una línea blanca.
  const raya = Math.round(MEDIDA_ETIQUETA.linea * cqw);
  const mitad = (H - raya) / 2;
  const tramos = fotos.length >= 2 ? [0, mitad + raya] : [0];
  if (tramos.length === 2) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    await cubrir(ctx, fotos[0], 0, 0, W, mitad);
    await cubrir(ctx, fotos[1], 0, mitad + raya, W, mitad);
  } else {
    await cubrir(ctx, fotos[0], 0, 0, W, H);
  }

  if (texto.trim()) {
    const arriba = (lectura?.zona ?? "abajo") === "arriba";
    const velo = VELO[lectura?.tono ?? "medio"];
    const g = arriba ? ctx.createLinearGradient(0, 0, 0, H) : ctx.createLinearGradient(0, H, 0, 0);
    g.addColorStop(0, `rgba(8,14,28,${velo})`);
    g.addColorStop(0.38, `rgba(8,14,28,${velo * 0.45})`);
    g.addColorStop(0.62, "rgba(8,14,28,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const tamano = tamanoRotulo(letra, texto) * cqw;
    const fuente = `${letra.peso} ${tamano}px "${letra.familia}", ${letra.generica}`;
    await document.fonts.load(fuente, texto);
    ctx.font = fuente;
    ctx.letterSpacing = `${enPx(letra.espaciado, tamano)}px`;
    const linea = tamano * letra.interlineado;
    const margen = 7 * cqw;
    const anchoMax = (W - 2 * margen) * 0.86;
    const renglones = partirEquilibrado(letra.mayusculas ? texto.toUpperCase() : texto, (s) => ctx.measureText(s).width, anchoMax);

    const barra = { w: 12 * cqw, h: 1.1 * cqw, separacion: 3 * cqw };
    const alto = barra.h + barra.separacion + renglones.length * linea;
    const y0 = arriba ? margen : H - margen - alto;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(margen, y0, barra.w, barra.h, barra.h / 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 3.6 * cqw;
    ctx.shadowOffsetY = 0.3 * cqw;
    renglones.forEach((r, k) => ctx.fillText(r, margen, y0 + barra.h + barra.separacion + k * linea + linea / 2));
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  for (let k = 0; k < Math.min(etiquetas.length, tramos.length); k++) {
    if (etiquetas[k]) await etiqueta(ctx, etiquetas[k], tramos[k], cqw);
  }

  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("No salió el archivo."))), "image/png"));
}

function bajar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function archivos(pieza: Pieza, marca: Marca, conTexto: boolean): Promise<{ nombre: string; blob: Blob }[]> {
  const textos = rotulosDe(pieza);
  const letra = letraDe(pieza, marca);
  const color = colorVisible(marca.colores);
  // Post o anuncio de antes y después: un solo archivo con las dos fotos.
  if (conTexto && enUnaImagen(pieza)) {
    const fotos = await Promise.all(pieza.medios.slice(0, 2).map(bytesDe));
    const blob = await lamina(fotos, etiquetasDe(pieza.idioma), textos[0] ?? "", letra, pieza.lectura, color);
    return [{ nombre: nombreArchivo(marca.nombre, pieza.titulo, "png"), blob }];
  }
  const varias = pieza.medios.length > 1;
  return Promise.all(
    pieza.medios.map(async (url, i) => {
      const foto = await bytesDe(url);
      const n = varias ? i + 1 : undefined;
      if (!conTexto) return { nombre: nombreArchivo(marca.nombre, pieza.titulo, extensionDe(foto.type), n), blob: foto };
      const e = etiquetaDeLamina(pieza, i);
      const blob = await lamina([foto], e ? [e] : [], textos[i] ?? "", letra, pieza.lectura, color);
      return { nombre: nombreArchivo(marca.nombre, pieza.titulo, "png", n), blob };
    }),
  );
}

export function Descargar({ pieza, marca }: { pieza: Pieza; marca: Marca }) {
  const [ocupado, setOcupado] = useState<"lista" | "foto" | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!pieza.medios.length) return null;

  // "Lista" = con titular o con las etiquetas del antes y después; si no, solo hay fotos.
  const conRotulo = rotulosDe(pieza).some((t) => t.trim()) || esAntesDespues(pieza);
  const fotos = pieza.medios.length;
  const listas = enUnaImagen(pieza) ? 1 : fotos;
  const varias = conRotulo ? listas > 1 : fotos > 1;

  async function descargar(conTexto: boolean) {
    setOcupado(conTexto ? "lista" : "foto");
    setError(null);
    try {
      const salen = await archivos(pieza, marca, conTexto);
      if (salen.length === 1) {
        bajar(salen[0].blob, salen[0].nombre);
      } else {
        const zip = armarZip(await Promise.all(salen.map(async (s) => ({ nombre: s.nombre, datos: new Uint8Array(await s.blob.arrayBuffer()) }))));
        bajar(new Blob([zip as BlobPart], { type: "application/zip" }), nombreArchivo(marca.nombre, pieza.titulo, "zip"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo armar la descarga.");
    } finally {
      setOcupado(null);
    }
  }

  const boton =
    "flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[12.5px] font-semibold transition disabled:cursor-wait disabled:opacity-60";

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        {conRotulo && (
          <button
            type="button"
            onClick={() => descargar(true)}
            disabled={ocupado !== null}
            className={cn(boton, "bg-[var(--es-acento)] text-[#0b1830] hover:brightness-110")}
          >
            <Download size={14} />
            {ocupado === "lista" ? "Preparando…" : listas > 1 ? `Descargar las ${listas}` : "Descargar"}
          </button>
        )}
        <button
          type="button"
          onClick={() => descargar(false)}
          disabled={ocupado !== null}
          className={cn(
            boton,
            conRotulo
              ? "border border-[var(--border-2)] text-[var(--text-2)] hover:text-[var(--text)]"
              : "bg-[var(--es-acento)] text-[#0b1830] hover:brightness-110",
          )}
        >
          {conRotulo ? <ImageIcon size={14} /> : <Download size={14} />}
          {ocupado === "foto" ? "Preparando…" : conRotulo ? (fotos > 1 ? "Solo las fotos" : "Solo la foto") : fotos > 1 ? `Descargar las ${fotos}` : "Descargar la imagen"}
        </button>
      </div>
      {varias && <p className="mt-1.5 text-center text-[11.5px] text-[var(--text-3)]">Bajan juntas en un .zip</p>}
      {error && <p className="mt-1.5 text-center text-[12px] text-[var(--es-rojo)]">{error}</p>}
    </div>
  );
}
