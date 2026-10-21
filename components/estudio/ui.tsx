"use client";

// Las piezas visuales del motor de contenido. El vidrio y los colores salen de
// globals.css ([data-tenant="estudio"], [data-shell="estudio"]).

import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Facebook, Instagram, Linkedin, Play, Store, Youtube, Layers } from "lucide-react";
import { cn } from "@/lib/cn";
import type { EstadoPieza, Marca, Pieza, Red, TipoPieza } from "@/lib/estudio/tipos";

export function Vidrio({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "aside" | "article";
}) {
  return <Tag className={cn("es-vidrio rounded-[24px]", className)}>{children}</Tag>;
}

/** Título de un bloque: el rótulo y, a la derecha, lo que se puede hacer con él. */
export function Cabecera({ titulo, detalle, accion }: { titulo: string; detalle?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text)]">{titulo}</h2>
        {detalle && <p className="mt-0.5 text-[12.5px] text-[var(--text-3)]">{detalle}</p>}
      </div>
      {accion}
    </div>
  );
}

type Variante = "primario" | "vidrio" | "fantasma" | "peligro";

export function Boton({
  variante = "vidrio",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variante === "primario" && "es-primario",
        variante === "vidrio" &&
          "border border-[var(--border)] bg-white/[0.05] text-[var(--text)] hover:border-[var(--border-2)] hover:bg-white/[0.09]",
        variante === "fantasma" && "text-[var(--text-2)] hover:bg-white/[0.06] hover:text-[var(--text)]",
        variante === "peligro" && "border border-[rgba(255,107,107,0.35)] text-[var(--es-rojo)] hover:bg-[rgba(255,107,107,0.1)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export const NOMBRE_RED: Record<Red, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  google: "Perfil de Google",
  youtube: "YouTube",
};

const COLOR_RED: Record<Red, string> = {
  instagram: "#E1306C",
  facebook: "#1877F2",
  tiktok: "#111111",
  linkedin: "#0A66C2",
  google: "#34A853",
  youtube: "#FF0033",
};

function GlifoTikTok({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.5 3c.3 2.1 1.6 3.6 3.8 3.9v3a7.3 7.3 0 0 1-3.8-1.2v6.1a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v3.1a2.6 2.6 0 1 0 1.7 2.4V3h3Z" />
    </svg>
  );
}

/** El ícono de la red en su color, en una pastilla. */
export function IconoRed({ red, size = 22, apagado = false }: { red: Red; size?: number; apagado?: boolean }) {
  const glifo = Math.round(size * 0.56);
  const Icono =
    red === "instagram" ? Instagram : red === "facebook" ? Facebook : red === "linkedin" ? Linkedin : red === "youtube" ? Youtube : red === "google" ? Store : null;
  return (
    <span
      title={NOMBRE_RED[red]}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full text-white", apagado && "opacity-35 grayscale")}
      style={{
        width: size,
        height: size,
        background: COLOR_RED[red],
        boxShadow: red === "tiktok" ? "inset 0 0 0 1px rgba(255,255,255,0.18)" : undefined,
      }}
    >
      {Icono ? <Icono size={glifo} strokeWidth={2.2} /> : <GlifoTikTok size={glifo} />}
    </span>
  );
}

export function RedesFila({ redes, size = 18 }: { redes: Red[]; size?: number }) {
  return (
    <span className="inline-flex items-center -space-x-1">
      {redes.map((r) => (
        <span key={r} className="rounded-full ring-2 ring-[#13203a]">
          <IconoRed red={r} size={size} />
        </span>
      ))}
    </span>
  );
}

export const ESTADO: Record<EstadoPieza, { texto: string; color: string }> = {
  por_aprobar: { texto: "Por aprobar", color: "var(--es-ambar)" },
  aprobada: { texto: "Aprobada", color: "var(--es-violeta)" },
  programada: { texto: "Programada", color: "var(--es-cian)" },
  publicada: { texto: "Publicada", color: "var(--es-verde)" },
  fallida: { texto: "Falló", color: "var(--es-rojo)" },
  rechazada: { texto: "Rechazada", color: "var(--text-3)" },
};

export function EstadoPill({ estado, className }: { estado: EstadoPieza; className?: string }) {
  const e = ESTADO[estado];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold", className)}
      style={{ color: e.color, background: `color-mix(in srgb, ${e.color} 14%, transparent)` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: e.color }} />
      {e.texto}
    </span>
  );
}

export const TIPO: Record<TipoPieza, string> = {
  imagen: "Imagen",
  carrusel: "Carrusel",
  video: "Video",
  anuncio: "Anuncio",
  texto: "Texto",
};

/** El monograma de la marca en su color. */
export function MarcaSello({ marca, size = 28, className }: { marca: Marca; size?: number; className?: string }) {
  return (
    <span
      className={cn("es-rotulo inline-flex shrink-0 items-center justify-center rounded-[30%] font-bold text-white", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.46,
        background: `linear-gradient(140deg, ${marca.colores[0]}, color-mix(in srgb, ${marca.colores[0]} 55%, ${marca.colores[1]}))`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
      }}
      aria-hidden
    >
      {marca.iniciales}
    </span>
  );
}

function duracionTexto(seg?: number): string {
  if (!seg) return "";
  return `0:${String(seg).padStart(2, "0")}`;
}

/**
 * La pieza como se ve: la foto, el póster del video o, si es solo texto, una
 * tarjeta con los colores de la marca. `forma` decide el recorte.
 */
export function Miniatura({
  pieza,
  marca,
  forma = "cuadro",
  sinTexto = false,
  className,
}: {
  pieza: Pieza;
  marca?: Marca;
  forma?: "cuadro" | "vertical" | "post";
  /** En miniaturas chicas, sin el texto encima: solo la imagen. */
  sinTexto?: boolean;
  className?: string;
}) {
  const aspecto = forma === "vertical" ? "aspect-[9/16]" : forma === "post" ? "aspect-[4/5]" : "aspect-square";
  const foto = pieza.medios[0];
  const color = marca?.colores[0] ?? "#5bbcd6";

  if (pieza.tipo === "video" && !foto) {
    return (
      <div
        className={cn("relative overflow-hidden rounded-[14px]", aspecto, className)}
        style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${color} 40%, #16233d), #0f1a30)` }}
      >
        {!sinTexto && <p className="absolute inset-x-3 top-3 line-clamp-6 text-[11px] leading-snug text-white/80">{pieza.guion}</p>}
        <span className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2 py-0.5 text-[10.5px] font-semibold text-white/90">
          Guion
        </span>
      </div>
    );
  }

  if (pieza.tipo === "texto" && !foto) {
    return (
      <div
        className={cn("relative flex overflow-hidden rounded-[14px] p-3", aspecto, className)}
        style={{ background: `linear-gradient(150deg, ${color}, color-mix(in srgb, ${color} 45%, #0f1a30))` }}
      >
        {!sinTexto && (
          <p className="es-rotulo line-clamp-5 self-end text-[17px] font-semibold leading-[1.05] text-white">{pieza.titulo}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-[14px] bg-[#1a2843]", aspecto, className)}>
      {foto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt={pieza.ideaImagen ?? pieza.titulo} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      )}
      {pieza.tipo === "texto" && !sinTexto && (
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/75 via-black/20 to-transparent p-3">
          <p className="es-rotulo line-clamp-3 text-[16px] font-semibold leading-[1.05] text-white">{pieza.titulo}</p>
        </div>
      )}
      {pieza.tipo === "video" && (
        <>
          <span className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
          <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
            <Play size={15} className="ml-0.5 fill-white text-white" />
          </span>
          <span className="es-rotulo absolute bottom-1.5 right-2 text-[13px] font-semibold text-white">{duracionTexto(pieza.duracion)}</span>
        </>
      )}
      {pieza.tipo === "anuncio" && !sinTexto && (
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-[#0b1830]/85 px-2 py-1.5 backdrop-blur">
          <span className="min-w-0 truncate text-[10.5px] font-semibold text-white">{pieza.anuncio?.titular ?? pieza.titulo}</span>
          <span className="shrink-0 rounded-[5px] bg-[var(--es-acento)] px-1.5 py-0.5 text-[9.5px] font-bold text-[#0b1830]">
            {pieza.anuncio?.cta ?? "Ver más"}
          </span>
        </span>
      )}
      {pieza.tipo === "carrusel" && pieza.medios.length > 1 && (
        <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[10.5px] font-semibold text-white backdrop-blur">
          <Layers size={11} />
          {pieza.medios.length}
        </span>
      )}
    </div>
  );
}

/** Un reloj que avanza solo, para lo que cambia con el tiempo (videos armándose). */
export function useAhora(cadaMs = 1000): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), cadaMs);
    return () => window.clearInterval(id);
  }, [cadaMs]);
  return ahora;
}

/** "1,240" para cifras de créditos. */
export function creditos(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** "1 crédito", "16 créditos". */
export function creditosTexto(n: number): string {
  const r = Math.round(n);
  return `${r.toLocaleString("en-US")} ${r === 1 ? "crédito" : "créditos"}`;
}

/** Un aviso corto que se va solo. */
export function Aviso({ texto, tono = "ok" }: { texto: string; tono?: "ok" | "error" }) {
  return (
    <div
      role="status"
      className="es-vidrio pointer-events-none fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full px-4 py-2 text-[13px] font-medium lg:bottom-8"
      style={{ color: tono === "error" ? "var(--es-rojo)" : "var(--text)" }}
    >
      {texto}
    </div>
  );
}

export function useAviso(): [ReactNode, (texto: string, tono?: "ok" | "error") => void] {
  const [aviso, setAviso] = useState<{ texto: string; tono: "ok" | "error"; n: number } | null>(null);
  useEffect(() => {
    if (!aviso) return;
    const id = window.setTimeout(() => setAviso(null), 2600);
    return () => window.clearTimeout(id);
  }, [aviso]);
  const nodo = aviso ? <Aviso key={aviso.n} texto={aviso.texto} tono={aviso.tono} /> : null;
  return [nodo, (texto, tono = "ok") => setAviso({ texto, tono, n: Date.now() })];
}
