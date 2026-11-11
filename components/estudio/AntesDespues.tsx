"use client";

// Cómo se ve un antes y después: la etiqueta de cada foto y, en un post o un
// anuncio, las dos fotos en una sola imagen (el antes arriba). Las medidas van
// en cqw, en proporción al ancho: el contenedor lleva `container-type:
// inline-size`, igual que el rótulo (Rotulo.tsx), y la descarga dibuja lo
// mismo a 1080 px (Descargar.tsx).

import { cn } from "@/lib/cn";
import { LETRA_ETIQUETA, enUnaImagen, etiquetaDeLamina, etiquetasDe } from "@/lib/estudio/antes-despues";
import type { Idioma, Pieza } from "@/lib/estudio/tipos";

/** Las medidas de la etiqueta, en % del ancho de la foto. La descarga usa las mismas. */
export const MEDIDA_ETIQUETA = { margen: 4, letra: 3.6, padX: 2.8, padY: 1.1, espaciado: 0.08, linea: 0.55 };

export function Etiqueta({ texto, className }: { texto: string; className?: string }) {
  const m = MEDIDA_ETIQUETA;
  return (
    <span
      className={cn("pointer-events-none absolute rounded-full bg-[#0b1830]/80 uppercase leading-none text-white", className)}
      style={{
        left: `${m.margen}cqw`,
        top: `${m.margen}cqw`,
        padding: `${m.padY}cqw ${m.padX}cqw`,
        fontFamily: `'${LETRA_ETIQUETA.familia}', sans-serif`,
        fontWeight: LETRA_ETIQUETA.peso,
        fontSize: `${m.letra}cqw`,
        letterSpacing: `${m.espaciado}em`,
      }}
    >
      {texto}
    </span>
  );
}

/** Las dos fotos en una imagen: el antes arriba y el después abajo, cada una con su etiqueta. */
export function FotoDividida({
  antes,
  despues,
  idioma,
  alt,
  etiquetas = true,
  className,
}: {
  antes: string;
  despues: string;
  idioma: Idioma;
  alt: string;
  etiquetas?: boolean;
  className?: string;
}) {
  const [a, d] = etiquetasDe(idioma);
  return (
    <div className={cn("flex flex-col bg-white", className)} style={{ gap: `${MEDIDA_ETIQUETA.linea}cqw` }}>
      {(
        [
          [antes, a],
          [despues, d],
        ] as const
      ).map(([src, texto]) => (
        <div key={texto} className="relative min-h-0 flex-1 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`${alt} (${texto.toLowerCase()})`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          {etiquetas && <Etiqueta texto={texto} />}
        </div>
      ))}
    </div>
  );
}

/**
 * La imagen de la pieza llenando su cuadro: la foto (con su etiqueta si es la
 * primera lámina de un carrusel de antes y después) o las dos fotos juntas.
 * El cuadro tiene que ser `relative` y llevar container-type.
 */
export function ImagenDePieza({ pieza, etiquetas = true }: { pieza: Pieza; etiquetas?: boolean }) {
  const alt = pieza.ideaImagen ?? pieza.titulo;
  if (enUnaImagen(pieza)) {
    return <FotoDividida antes={pieza.medios[0]} despues={pieza.medios[1]} idioma={pieza.idioma} alt={alt} etiquetas={etiquetas} className="absolute inset-0" />;
  }
  const foto = pieza.medios[0];
  if (!foto) return null;
  const etiqueta = etiquetas ? etiquetaDeLamina(pieza, 0) : undefined;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={foto} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      {etiqueta && <Etiqueta texto={etiqueta} />}
    </>
  );
}
