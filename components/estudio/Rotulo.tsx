"use client";

// El texto encima de la foto, como lo arma la plantilla de la marca, y el
// selector de su letra.
//
// El tamaño va en unidades del ancho de la foto (cqw): el contenedor de la
// foto tiene que llevar `container-type: inline-size` para que el gráfico se
// vea igual en la tarjeta chica y en la vista grande.

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  LETRAS,
  aguanta,
  describirLectura,
  estiloLetra,
  letraDe,
  rotulosDe,
  sugerirLetras,
  tamanoRotulo,
  urlFuentes,
  type Letra,
} from "@/lib/estudio/letras";
import type { LecturaImagen, Marca, Pieza } from "@/lib/estudio/tipos";

/** La hoja de Google Fonts del catálogo. React la sube al <head> una sola vez. */
export function FuentesRotulo() {
  return <link rel="stylesheet" href={urlFuentes()} precedence="default" />;
}

/** Cuánto se oscurece la foto detrás del texto: una foto clara necesita más velo. */
const VELO: Record<LecturaImagen["tono"], number> = { claro: 0.62, medio: 0.55, oscuro: 0.35 };

export function Rotulo({
  texto,
  letra,
  lectura,
  color,
}: {
  texto: string;
  letra: Letra;
  lectura?: LecturaImagen;
  /** Un color de la marca, para la barra sobre el texto. */
  color: string;
}) {
  if (!texto.trim()) return null;
  const arriba = (lectura?.zona ?? "abajo") === "arriba";
  const velo = VELO[lectura?.tono ?? "medio"];
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 flex flex-col p-[7cqw]", arriba ? "justify-start" : "justify-end")}
      style={{
        background: `linear-gradient(${arriba ? "180deg" : "0deg"}, rgba(8,14,28,${velo}) 0%, rgba(8,14,28,${velo * 0.45}) 38%, transparent 62%)`,
      }}
    >
      <span className="mb-[3cqw] block h-[1.1cqw] w-[12cqw] rounded-full" style={{ background: color }} />
      <p
        className="max-w-[86%] text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.35)] [text-wrap:balance]"
        style={{ ...estiloLetra(letra), fontSize: `${tamanoRotulo(letra, texto)}cqw` }}
      >
        {texto}
      </p>
    </div>
  );
}

/** Qué tan claro es un color #rrggbb, de 0 a 1. */
function luz(hex: string): number {
  const n = Number.parseInt(hex.replace("#", "").slice(0, 6), 16);
  if (Number.isNaN(n)) return 1;
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

/** El primer color de la marca que se ve encima del velo oscuro. */
function colorVisible(colores: string[]): string {
  return colores.find((c) => luz(c) > 0.35) ?? "#ffffff";
}

/** El rótulo de la lámina i de una pieza, con su letra. Nada si esa lámina va sin texto. */
export function RotuloDePieza({ pieza, marca, i }: { pieza: Pieza; marca: Marca; i: number }) {
  const texto = rotulosDe(pieza)[i];
  if (!texto) return null;
  return <Rotulo texto={texto} letra={letraDe(pieza, marca)} lectura={pieza.lectura} color={colorVisible(marca.colores)} />;
}

function Opcion({
  letra,
  muestra,
  activa,
  etiqueta,
  cabe,
  onElegir,
  disabled,
}: {
  letra: Letra;
  muestra: string;
  activa: boolean;
  etiqueta?: string;
  cabe: boolean;
  onElegir: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onElegir}
      disabled={disabled || !cabe}
      aria-pressed={activa}
      title={cabe ? undefined : "El texto es muy largo para esta letra"}
      className={cn(
        "flex w-full min-w-0 items-center gap-3 rounded-[14px] border px-3 py-2 text-left transition",
        activa
          ? "border-[var(--es-acento)] bg-[rgba(91,188,214,0.1)]"
          : "border-[var(--border)] bg-black/20 hover:border-[var(--border-2)] hover:bg-black/30",
        (!cabe || (disabled && !activa)) && "cursor-not-allowed opacity-45 hover:border-[var(--border)] hover:bg-black/20",
      )}
    >
      <span className="min-w-0 flex-1 truncate text-[21px] text-[var(--text)]" style={{ ...estiloLetra(letra), lineHeight: 1.25 }}>
        {muestra}
      </span>
      <span className="flex shrink-0 flex-col items-end text-right text-[11.5px] leading-tight">
        <span className="font-semibold text-[var(--text-2)]">{letra.familia}</span>
        <span className={etiqueta ? "font-semibold text-[var(--es-acento)]" : "text-[var(--text-3)]"}>{etiqueta ?? letra.caracter}</span>
      </span>
    </button>
  );
}

/** Las letras que van con la foto de la pieza, la sugerida primero; el resto del catálogo a un toque. */
export function ElegirLetra({
  pieza,
  marca,
  editable,
  onElegir,
}: {
  pieza: Pieza;
  marca: Marca;
  editable: boolean;
  onElegir: (id: string) => void;
}) {
  const [todas, setTodas] = useState(false);
  const textos = rotulosDe(pieza).filter((t) => t.trim());
  if (!textos.length) return null;
  const sugeridas = sugerirLetras({ lectura: pieza.lectura, marca, textos });
  const resto = LETRAS.filter((l) => !sugeridas.includes(l));
  const actual = letraDe(pieza, marca);
  const muestra = textos[0];
  const etiqueta = (l: Letra, i: number) => (l.id === marca.letra ? "De la marca" : i === 0 ? "Sugerida" : undefined);

  return (
    <div className="es-hueco rounded-[18px] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-semibold text-[var(--text)]">Letra en la foto</p>
        <button
          type="button"
          onClick={() => setTodas(!todas)}
          className="shrink-0 text-[12px] font-semibold text-[var(--es-acento)] hover:underline"
        >
          {todas ? "Solo las sugeridas" : `Ver las ${LETRAS.length}`}
        </button>
      </div>
      {pieza.lectura && <p className="mt-0.5 text-[12px] text-[var(--text-3)]">{describirLectura(pieza.lectura)}</p>}
      <div className="mt-3 space-y-1.5">
        {sugeridas.map((l, i) => (
          <Opcion
            key={l.id}
            letra={l}
            muestra={muestra}
            activa={actual.id === l.id}
            etiqueta={etiqueta(l, i)}
            cabe={aguanta(l, textos)}
            disabled={!editable}
            onElegir={() => onElegir(l.id)}
          />
        ))}
        {todas &&
          resto.map((l) => (
            <Opcion
              key={l.id}
              letra={l}
              muestra={muestra}
              activa={actual.id === l.id}
              etiqueta={l.id === marca.letra ? "De la marca" : undefined}
              cabe={aguanta(l, textos)}
              disabled={!editable}
              onElegir={() => onElegir(l.id)}
            />
          ))}
      </div>
    </div>
  );
}
