"use client";

// La pieza tal como se vería en cada red, con el texto de SU variante y la
// cuenta real de la marca. Los marcos imitan la versión oscura de cada app,
// para que en el panel se lea como un teléfono y no como otra tarjeta más.
//
// Video: Reels, TikTok y Shorts van en 9:16 con subtítulos que corren al
// darle play. El guion (antes de armar el video) no pasa por aquí: lo pinta
// la pantalla de aprobación.

import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Globe,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Pause,
  Phone,
  Play,
  Repeat2,
  Send,
  Share2,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Marca, Pieza, Red } from "@/lib/estudio/tipos";
import { MarcaSello } from "./ui";

/** El texto de esa red: el de su variante, o el de la pieza si no la tiene. */
export function textoDeRed(pieza: Pieza, red: Red): string {
  return pieza.variantes.find((v) => v.red === red)?.texto ?? pieza.texto;
}

export function cuentaDeRed(marca: Marca, red: Red): string {
  const c = marca.redes.find((r) => r.red === red)?.cuenta;
  return c || marca.nombre;
}

/** Instagram, TikTok y Shorts muestran el @; Facebook, LinkedIn y Google el nombre. */
function handle(marca: Marca, red: Red): string {
  const c = cuentaDeRed(marca, red);
  return c.startsWith("@") ? c.slice(1) : c;
}

function Foto({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  if (!src) return <div className={cn("bg-[#1d1814]", className)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={cn("h-full w-full object-cover", className)} />;
}

/** Las fotos de un carrusel, con flechas y puntos. */
function Carrusel({ pieza, aspecto }: { pieza: Pieza; aspecto: string }) {
  const [i, setI] = useState(0);
  const fotos = pieza.medios.length ? pieza.medios : [undefined];
  const n = fotos.length;
  useEffect(() => setI(0), [pieza.id]);
  return (
    <div className={cn("relative overflow-hidden bg-[#1d1814]", aspecto)}>
      <Foto src={fotos[Math.min(i, n - 1)]} alt={pieza.ideaImagen ?? pieza.titulo} className="absolute inset-0" />
      {pieza.tipo === "texto" && (
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/75 via-black/15 to-transparent p-4">
          <p className="es-rotulo text-[24px] font-semibold leading-[1.02] text-white">{pieza.titulo}</p>
        </div>
      )}
      {n > 1 && (
        <>
          <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
            {i + 1}/{n}
          </span>
          {i > 0 && (
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={() => setI(i - 1)}
              className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-black"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {i < n - 1 && (
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={() => setI(i + 1)}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-black"
            >
              <ChevronRight size={16} />
            </button>
          )}
          <span className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1">
            {fotos.map((_, k) => (
              <span key={k} className={cn("h-1.5 w-1.5 rounded-full", k === i ? "bg-white" : "bg-white/45")} />
            ))}
          </span>
        </>
      )}
    </div>
  );
}

/** Texto largo recortado con "más", como lo hace cada app. */
function TextoCorto({ texto, lineas = 3, prefijo }: { texto: string; lineas?: number; prefijo?: string }) {
  const [abierto, setAbierto] = useState(false);
  useEffect(() => setAbierto(false), [texto]);
  const largo = texto.length > 140;
  return (
    <div className="text-[13px] leading-[1.45] text-white/90">
      <p className={cn("whitespace-pre-line", !abierto && largo && (lineas === 2 ? "line-clamp-2" : "line-clamp-3"))}>
        {prefijo && <span className="mr-1 font-semibold text-white">{prefijo}</span>}
        {texto}
      </p>
      {largo && !abierto && (
        <button type="button" onClick={() => setAbierto(true)} className="mt-0.5 text-[12.5px] text-white/55 hover:text-white/80">
          más
        </button>
      )}
    </div>
  );
}

function Instagram({ pieza, marca }: { pieza: Pieza; marca: Marca }) {
  const h = handle(marca, "instagram");
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-[22px] border border-white/10 bg-black">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="rounded-full p-[2px]" style={{ background: "linear-gradient(45deg,#f9ce34,#ee2a7b,#6228d7)" }}>
          <span className="block rounded-full bg-black p-[2px]">
            <MarcaSello marca={marca} size={28} className="rounded-full" />
          </span>
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white">{h}</span>
        <MoreHorizontal size={18} className="text-white/80" />
      </div>
      <Carrusel pieza={pieza} aspecto="aspect-[4/5]" />
      <div className="flex items-center gap-4 px-3 pt-3 text-white">
        <Heart size={22} />
        <MessageCircle size={22} />
        <Send size={21} />
        <Bookmark size={21} className="ml-auto" />
      </div>
      <div className="px-3 pb-4 pt-2">
        <TextoCorto texto={pieza.variantes.find((v) => v.red === "instagram")?.texto ?? pieza.texto} prefijo={h} />
      </div>
    </div>
  );
}

function Facebook({ pieza, marca }: { pieza: Pieza; marca: Marca }) {
  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-[22px] border border-white/10 bg-[#242526]">
      <div className="flex items-center gap-2.5 px-3.5 pt-3">
        <MarcaSello marca={marca} size={38} className="rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[#e4e6eb]">{cuentaDeRed(marca, "facebook")}</p>
          <p className="flex items-center gap-1 text-[12px] text-[#b0b3b8]">
            Ahora · <Globe size={11} />
          </p>
        </div>
        <MoreHorizontal size={18} className="text-[#b0b3b8]" />
      </div>
      <div className="px-3.5 py-3">
        <TextoCorto texto={textoDeRed(pieza, "facebook")} />
      </div>
      <Carrusel pieza={pieza} aspecto="aspect-[4/5]" />
      <div className="mx-3.5 grid grid-cols-3 border-t border-white/10 py-1.5 text-[13px] font-semibold text-[#b0b3b8]">
        <span className="flex items-center justify-center gap-1.5 py-1.5">
          <ThumbsUp size={16} /> Me gusta
        </span>
        <span className="flex items-center justify-center gap-1.5 py-1.5">
          <MessageCircle size={16} /> Comentar
        </span>
        <span className="flex items-center justify-center gap-1.5 py-1.5">
          <Share2 size={16} /> Compartir
        </span>
      </div>
    </div>
  );
}

function LinkedIn({ pieza, marca }: { pieza: Pieza; marca: Marca }) {
  return (
    <div className="w-full max-w-[440px] overflow-hidden rounded-[22px] border border-white/10 bg-[#1b1f23]">
      <div className="flex items-center gap-2.5 px-3.5 pt-3">
        <MarcaSello marca={marca} size={42} className="rounded-[8px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-white/90">{cuentaDeRed(marca, "linkedin")}</p>
          <p className="truncate text-[12px] text-white/55">{marca.rubro}</p>
          <p className="flex items-center gap-1 text-[12px] text-white/55">
            Ahora · <Globe size={11} />
          </p>
        </div>
      </div>
      <div className="px-3.5 py-3">
        <TextoCorto texto={textoDeRed(pieza, "linkedin")} />
      </div>
      <Carrusel pieza={pieza} aspecto="aspect-[4/5]" />
      <div className="mx-3.5 grid grid-cols-4 border-t border-white/10 py-1.5 text-[12px] font-semibold text-white/60">
        <span className="flex flex-col items-center gap-0.5 py-1">
          <ThumbsUp size={16} /> Recomendar
        </span>
        <span className="flex flex-col items-center gap-0.5 py-1">
          <MessageCircle size={16} /> Comentar
        </span>
        <span className="flex flex-col items-center gap-0.5 py-1">
          <Repeat2 size={16} /> Compartir
        </span>
        <span className="flex flex-col items-center gap-0.5 py-1">
          <Send size={16} /> Enviar
        </span>
      </div>
    </div>
  );
}

function Google({ pieza, marca }: { pieza: Pieza; marca: Marca }) {
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-[22px] border border-white/10 bg-[#202124]">
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-3.5">
        <MarcaSello marca={marca} size={34} className="rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-[#e8eaed]">{cuentaDeRed(marca, "google")}</p>
          <p className="text-[12px] text-[#9aa0a6]">Novedad · Ahora</p>
        </div>
      </div>
      <Carrusel pieza={{ ...pieza, medios: pieza.medios.slice(0, 1) }} aspecto="aspect-[4/3]" />
      <div className="px-4 pb-4 pt-3">
        <TextoCorto texto={textoDeRed(pieza, "google")} lineas={3} />
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#5f6368] px-3.5 py-1.5 text-[13px] font-medium text-[#8ab4f8]">
          <Phone size={14} /> Llamar ahora
        </span>
      </div>
    </div>
  );
}

/** Los subtítulos: el guion partido en grupos cortos, como en los videos verticales. */
function trozos(texto: string, porTrozo = 5): string[] {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const fuera: string[] = [];
  for (let i = 0; i < palabras.length; i += porTrozo) fuera.push(palabras.slice(i, i + porTrozo).join(" "));
  return fuera.length ? fuera : [""];
}

const MARCO_VERTICAL: Record<"instagram" | "tiktok" | "youtube" | "facebook", string> = {
  instagram: "Reels",
  tiktok: "TikTok",
  youtube: "Shorts",
  facebook: "Reels",
};

function Vertical({ pieza, marca, red }: { pieza: Pieza; marca: Marca; red: "instagram" | "tiktok" | "youtube" | "facebook" }) {
  const lineas = useMemo(() => trozos(pieza.guion ?? pieza.texto), [pieza.guion, pieza.texto]);
  const duracion = pieza.duracion ?? 30;
  const [seg, setSeg] = useState(0);
  const [sonando, setSonando] = useState(false);

  useEffect(() => {
    setSeg(0);
    setSonando(false);
  }, [pieza.id]);

  useEffect(() => {
    if (!sonando) return;
    const id = window.setInterval(() => {
      setSeg((s) => {
        if (s + 0.25 >= duracion) {
          setSonando(false);
          return 0;
        }
        return s + 0.25;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [sonando, duracion]);

  const linea = lineas[Math.min(lineas.length - 1, Math.floor((seg / duracion) * lineas.length))];
  const h = handle(marca, red);
  const texto = textoDeRed(pieza, red);

  return (
    <div className="relative aspect-[9/16] w-full max-w-[330px] overflow-hidden rounded-[26px] border border-white/10 bg-black">
      <Foto src={pieza.medios[0] ?? marca.avatar?.foto} alt={pieza.titulo} className="absolute inset-0" />
      <span className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/80" />
      <span className="absolute left-3.5 top-3 text-[14px] font-semibold text-white">{MARCO_VERTICAL[red]}</span>

      <button
        type="button"
        onClick={() => setSonando(!sonando)}
        aria-label={sonando ? "Pausar" : "Reproducir"}
        className="absolute inset-0 flex items-center justify-center"
      >
        {!sonando && (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
            <Play size={24} className="ml-1 fill-white text-white" />
          </span>
        )}
      </button>

      {(sonando || seg > 0) && (
        <p className="es-rotulo pointer-events-none absolute inset-x-5 top-[54%] text-center text-[26px] font-bold uppercase leading-[1.02] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.8)]">
          {linea}
        </p>
      )}

      <div className="pointer-events-none absolute bottom-16 right-2.5 flex flex-col items-center gap-4 text-white">
        <Heart size={24} />
        <MessageCircle size={24} />
        <Send size={22} />
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-4 pr-10">
        <p className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-white">
          <MarcaSello marca={marca} size={22} className="rounded-full" />
          {red === "facebook" ? cuentaDeRed(marca, "facebook") : h}
        </p>
        <p className="line-clamp-2 text-[12px] leading-snug text-white/90">{texto}</p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-white/70">
          <Music2 size={11} /> Audio original · {marca.avatar?.vozNombre ?? marca.nombre}
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/15">
        <div className="h-full bg-white transition-[width] duration-200" style={{ width: `${(seg / duracion) * 100}%` }} />
      </div>
      {sonando && (
        <span className="pointer-events-none absolute right-3 top-3 text-white/80">
          <Pause size={16} />
        </span>
      )}
    </div>
  );
}

export function VistaPrevia({ pieza, marca, red }: { pieza: Pieza; marca: Marca; red: Red }) {
  if (pieza.tipo === "video" && red !== "linkedin" && red !== "google") {
    return <Vertical pieza={pieza} marca={marca} red={red} />;
  }
  switch (red) {
    case "facebook":
      return <Facebook pieza={pieza} marca={marca} />;
    case "linkedin":
      return <LinkedIn pieza={pieza} marca={marca} />;
    case "google":
      return <Google pieza={pieza} marca={marca} />;
    default:
      return <Instagram pieza={pieza} marca={marca} />;
  }
}
