"use client";

// Crear: primero QUÉ se hace (imagen, carrusel, video, anuncio o texto) y
// cuántas, después el encargo en palabras, el idioma y dónde sale. El motor
// escribe con el perfil de la marca (tono, servicios, ofertas, palabras que no
// usa) y lo que sale va directo a la cola de aprobación. Antes de generar se
// ve cuántos créditos usa y cuántos le quedan a la marca este mes.
//
// Se puede llegar con todo puesto desde la biblioteca, el calendario o videos:
// /estudio/crear?marca=<id>&formato=<tipo>&foto=<url>&texto=<...>

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Columns2, ImageIcon, ImagePlus, LoaderCircle, Play, Sparkles, WandSparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { agregarMedio, deMarca, useEstudio, useMarcaActiva } from "@/lib/estudio/store";
import { generar } from "@/lib/estudio/api";
import { diaDe, haceCuanto, localSV } from "@/lib/estudio/fechas";
import { CANTIDADES, MAX_FOTOS, creditosTotal, estimarCreditos, idiomaDe, laminasDeCarrusel, redesDelFormato } from "@/lib/estudio/generador";
import { llevaImagen } from "@/lib/estudio/imagen";
import { subirFoto, tituloDeArchivo } from "@/lib/estudio/subir";
import type { Idioma, Marca, OrigenImagen, Pieza, Red, RegistroUso, TipoPieza } from "@/lib/estudio/tipos";
import {
  Boton,
  Cabecera,
  EstadoPill,
  IconoRed,
  MarcaSello,
  Miniatura,
  NOMBRE_RED,
  RedesFila,
  TIPO,
  Vidrio,
  creditos,
  creditosTexto,
  useAviso,
} from "./ui";

const FORMATOS: TipoPieza[] = ["imagen", "carrusel", "video", "anuncio", "texto"];

function esFormato(v: string | null): v is TipoPieza {
  return FORMATOS.includes(v as TipoPieza);
}

/** "5 posts", "1 anuncio", "2 guiones de video". */
function cuantasDe(formato: TipoPieza, n: number): string {
  const uno = n === 1;
  switch (formato) {
    case "imagen":
      return `${n} ${uno ? "post" : "posts"}`;
    case "carrusel":
      return `${n} ${uno ? "carrusel" : "carruseles"}`;
    case "video":
      return `${n} ${uno ? "guion de video" : "guiones de video"}`;
    case "anuncio":
      return `${n} ${uno ? "anuncio" : "anuncios"}`;
    case "texto":
      return `${n} ${uno ? "post de texto" : "posts de texto"}`;
  }
}

/** "Instagram, Facebook y LinkedIn". */
function enLista(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;
}

// Un encargo de ejemplo por marca y formato, como lo escribiría quien la lleva.
const EJEMPLO: Record<string, Partial<Record<TipoPieza, string>>> = {
  solano: {
    imagen: "El antes y después de la fachada en Coral Gables y el interior terminado en Brickell. Mitad en inglés.",
    carrusel: "Los 3 errores al elegir color, una lámina por error, con fotos de interiores terminados.",
    video: "Rafael explicando cuántas manos de pintura lleva una pared y por qué cotizamos dos desde el principio.",
    anuncio: "Anuncio de la oferta de 10% en exteriores hasta el 30 de noviembre, con el estimado gratis en 48 horas.",
    texto: "Por qué se pela la pintura exterior, en dos o tres líneas y sin tecnicismos.",
  },
  keystone: {
    imagen: "Qué revisar en el techo después de la tormenta y el techo de metal terminado esta semana.",
    carrusel: "Teja, shingle o metal: cuánto dura cada uno y qué aguanta mejor en el sur de Florida.",
    video: "Video sin cara: tres señales de que el techo necesita revisión, con tomas de obra.",
    anuncio: "Anuncio de la inspección gratis después de la tormenta, para dueños de casa en Fort Lauderdale.",
    texto: "El financiamiento a 18 meses, explicado sin letra chiquita.",
  },
  casanova: {
    imagen: "La cocina terminada en Doral y el comedor integrado. 60% en español.",
    carrusel: "El baño antes y después, con el detalle de materiales en cada lámina.",
    video: "Daniela contando cuánto tarda una cocina completa y qué es lo que más la atrasa.",
    anuncio: "Anuncio de 15% en encimeras de cuarzo con la remodelación de cocina, solo en noviembre.",
    texto: "El diseño 3D sin costo antes de empezar la obra.",
  },
  betme: {
    imagen: "El asistente bilingüe que trabaja en tu horario y el cierre de mes sin perder el fin de semana.",
    carrusel: "5 tareas que un negocio pequeño puede delegar esta semana, una por lámina.",
    video: "Un día con un asistente remoto, de la bandeja de la mañana a las reseñas de la tarde.",
    anuncio: "Anuncio para dueños de negocio: un asistente bilingüe, con una semana de prueba.",
    texto: "Posts para LinkedIn sobre llamadas perdidas y los agentes de IA que contestan de noche.",
  },
};

function ejemploDe(m: Marca, f: TipoPieza): string {
  return EJEMPLO[m.id]?.[f] ?? `${TIPO[f]} sobre ${m.servicios.slice(0, 2).join(" y ").toLowerCase()} con la oferta del mes.`;
}

/** Lo que la marca ya gastó este mes, en hora de El Salvador. */
function usadoEsteMes(uso: RegistroUso[], marcaId: string): number {
  const mes = diaDe(localSV()).slice(0, 7);
  return creditosTotal(uso.filter((u) => u.marcaId === marcaId && localSV(Date.parse(u.fecha)).startsWith(mes)));
}

/** El dibujo de cada formato, hecho con cajas: se reconoce sin leer. */
function Dibujo({ formato, marca, cta }: { formato: TipoPieza; marca: Marca; cta: string }) {
  const color = marca.colores[0];
  const foto = marca.portada;
  switch (formato) {
    case "imagen":
      return (
        <span className="relative block h-[78px] w-[62px] overflow-hidden rounded-[8px] bg-white/10 shadow-[0_8px_18px_-8px_rgba(0,0,0,0.7)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute bottom-1.5 left-1.5 right-4 h-1.5 rounded-full bg-white/90" />
        </span>
      );
    case "carrusel":
      return (
        <span className="relative block h-[78px] w-[86px]">
          <span className="absolute left-[26px] top-[4px] h-[64px] w-[52px] rounded-[7px] bg-white/[0.14]" />
          <span className="absolute left-[14px] top-[2px] h-[68px] w-[54px] rounded-[7px] bg-white/[0.22]" />
          <span className="absolute left-0 top-0 block h-[70px] w-[56px] overflow-hidden rounded-[7px] shadow-[0_8px_18px_-8px_rgba(0,0,0,0.7)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto} alt="" className="h-full w-full object-cover" />
          </span>
          <span className="absolute bottom-0 left-[16px] flex gap-[3px]">
            <span className="h-[4px] w-[4px] rounded-full bg-white" />
            <span className="h-[4px] w-[4px] rounded-full bg-white/40" />
            <span className="h-[4px] w-[4px] rounded-full bg-white/40" />
          </span>
        </span>
      );
    case "video":
      return (
        <span
          className="relative block h-[82px] w-[46px] overflow-hidden rounded-[8px] shadow-[0_8px_18px_-8px_rgba(0,0,0,0.7)]"
          style={{ background: `linear-gradient(160deg, ${color}, #0f1a30)` }}
        >
          {marca.avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={marca.avatar.foto} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
          )}
          <span className="absolute left-1/2 top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/30 backdrop-blur">
            <Play size={9} className="ml-px fill-white text-white" />
          </span>
          <span className="absolute bottom-2 left-1.5 right-1.5 h-1 rounded-full bg-white/85" />
        </span>
      );
    case "anuncio":
      return (
        <span className="relative block w-[78px] overflow-hidden rounded-[8px] bg-[#1d2a44] shadow-[0_8px_18px_-8px_rgba(0,0,0,0.7)]">
          <span className="block h-[52px] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto} alt="" className="h-full w-full object-cover" />
          </span>
          <span className="flex items-center gap-1 px-1 py-1">
            <span className="h-1 flex-1 rounded-full bg-white/50" />
            <span className="max-w-[44px] truncate rounded-[3px] bg-[var(--es-acento)] px-1 text-[6.5px] font-bold leading-[11px] text-[#0b1830]">{cta}</span>
          </span>
        </span>
      );
    case "texto":
      return (
        <span className="flex h-[70px] w-[70px] flex-col justify-center gap-[5px] rounded-[8px] px-2" style={{ background: `linear-gradient(150deg, ${color}, color-mix(in srgb, ${color} 40%, #0f1a30))` }}>
          <span className="h-1.5 w-full rounded-full bg-white/90" />
          <span className="h-1.5 w-[85%] rounded-full bg-white/70" />
          <span className="h-1.5 w-[60%] rounded-full bg-white/70" />
        </span>
      );
  }
}

function TarjetaFormato({
  formato,
  marca,
  activo,
  laminas,
  onElegir,
}: {
  formato: TipoPieza;
  marca: Marca;
  activo: boolean;
  /** Las láminas que saldría el carrusel con las fotos de ahora. */
  laminas: number;
  onElegir: () => void;
}) {
  const tiene = new Set(marca.redes.filter((r) => r.estado !== "sin_conectar").map((r) => r.red));
  const redes = redesDelFormato(formato).filter((r) => tiene.has(r));
  const sinAvatar = formato === "video" && !marca.avatar;
  const apagado = sinAvatar || redes.length === 0;
  const idioma: Idioma = marca.idiomas.es >= 50 ? "es" : "en";
  const dato =
    formato === "video"
      ? marca.avatar?.nombre ?? "Sin avatar"
      : formato === "carrusel"
        ? `${laminas} láminas`
        : formato === "anuncio"
          ? "Facebook e Instagram"
          : redes.length
            ? enLista(redes.map((r) => (r === "google" ? "Google" : NOMBRE_RED[r])))
            : "Sin redes conectadas";

  return (
    <button
      type="button"
      onClick={onElegir}
      disabled={apagado}
      aria-pressed={activo}
      className={cn(
        "flex min-w-[124px] flex-1 flex-col items-center rounded-[20px] px-2 pb-3 pt-4 text-center transition disabled:cursor-not-allowed disabled:opacity-40",
        activo ? "bg-[rgba(91,188,214,0.12)] ring-2 ring-[var(--es-acento)]" : "es-hueco hover:border-[var(--border-2)] hover:bg-white/[0.03]",
      )}
    >
      <span aria-hidden className="flex h-[86px] items-center justify-center">
        <Dibujo formato={formato} marca={marca} cta={marca.cta[idioma]} />
      </span>
      <span className={cn("mt-2.5 text-[14px] font-semibold", activo ? "text-[var(--text)]" : "text-[var(--text-2)]")}>{TIPO[formato]}</span>
      <span className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-[var(--text-3)]">{dato}</span>
    </button>
  );
}

/** De dónde sale la imagen: la genera el modelo, son fotos de obra, o un antes y después. */
type Fuente = "ia" | "obra" | "antes_despues";
type Lado = "antes" | "despues";

/** Soltar fotos encima: solo las imágenes, en el orden en que llegan. */
function useSoltar(onArchivos: (fs: File[]) => void) {
  const [encima, setEncima] = useState(false);
  return {
    encima,
    props: {
      onDragOver: (e: DragEvent) => {
        e.preventDefault();
        setEncima(true);
      },
      onDragLeave: () => setEncima(false),
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        setEncima(false);
        const fs = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
        if (fs.length) onArchivos(fs);
      },
    },
  };
}

/** Las fotos de obra del encargo, en su orden, y el botón para subir más. */
function FotosDeObra({
  fotos,
  subiendo,
  formato,
  onArchivos,
  onQuitar,
}: {
  fotos: string[];
  subiendo: number;
  formato: TipoPieza;
  onArchivos: (fs: File[]) => void;
  onQuitar: (k: number) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { encima, props } = useSoltar(onArchivos);
  const carrusel = formato === "carrusel";
  const caben = fotos.length + subiendo < MAX_FOTOS;
  const nota =
    fotos.length + subiendo === 0
      ? "Súbelas o suéltalas aquí. Sin fotos, el motor usa las de la biblioteca de la marca."
      : carrusel
        ? fotos.length > 1
          ? "Van en este orden en el carrusel."
          : null
        : fotos.length > 1
          ? `Una foto por ${formato === "anuncio" ? "anuncio" : "post"}, en este orden.`
          : null;
  return (
    <div
      {...props}
      className={cn(
        "mt-3 rounded-[18px] border border-dashed p-2.5 transition",
        encima ? "border-[var(--es-acento)] bg-[rgba(91,188,214,0.08)]" : "border-[var(--border-2)] bg-white/[0.02]",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {fotos.map((u, k) => (
          <span key={`${k}-${u.slice(-24)}`} className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[12px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt={`Foto ${k + 1}`} className="h-full w-full object-cover" />
            {carrusel && fotos.length > 1 && (
              <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-1.5 text-[10.5px] font-bold leading-[16px] text-white">{k + 1}</span>
            )}
            <button
              type="button"
              aria-label={`Quitar la foto ${k + 1}`}
              onClick={() => onQuitar(k)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-black/85"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {Array.from({ length: subiendo }, (_, k) => (
          <span key={`subiendo-${k}`} className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[12px] bg-white/[0.06]">
            <LoaderCircle size={18} className="animate-spin text-[var(--text-3)]" />
          </span>
        ))}
        {caben && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex h-[72px] min-w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-[12px] bg-white/[0.05] px-3 text-[11.5px] font-semibold text-[var(--text-2)] transition hover:bg-white/[0.09] hover:text-[var(--text)]"
          >
            <ImagePlus size={18} />
            {fotos.length ? "Agregar" : "Subir fotos"}
          </button>
        )}
        <div className="min-w-[180px] flex-1 pl-1 text-[12px] leading-snug text-[var(--text-3)]">
          {nota && <p>{nota}</p>}
          <Link href="/estudio/biblioteca" className="font-semibold text-[var(--es-acento)] hover:underline">
            Elegir de la biblioteca
          </Link>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const fs = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (fs.length) onArchivos(fs);
        }}
      />
    </div>
  );
}

/** Una de las dos cajas del antes y después: vacía pide la foto; con foto, se cambia o se quita. */
function CajaFoto({
  etiqueta,
  url,
  subiendo,
  onArchivo,
  onQuitar,
}: {
  etiqueta: string;
  url: string | null;
  subiendo: boolean;
  onArchivo: (f: File) => void;
  onQuitar: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { encima, props } = useSoltar((fs) => onArchivo(fs[0]));
  const abrir = () => input.current?.click();
  return (
    <div
      {...props}
      className={cn(
        "relative aspect-[4/3] overflow-hidden rounded-[18px] border transition",
        encima
          ? "border-dashed border-[var(--es-acento)] bg-[rgba(91,188,214,0.08)]"
          : url
            ? "border-[var(--border)]"
            : "border-dashed border-[var(--border-2)] bg-white/[0.02]",
      )}
    >
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={etiqueta} className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute left-2.5 top-2.5 rounded-full bg-[#0b1830]/80 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white">
            {etiqueta}
          </span>
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={abrir}
              className="rounded-full bg-black/65 px-2.5 py-1 text-[11.5px] font-semibold text-white transition hover:bg-black/85"
            >
              Cambiar
            </button>
            <button
              type="button"
              aria-label={`Quitar la foto del ${etiqueta.toLowerCase()}`}
              onClick={onQuitar}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-black/85"
            >
              <X size={13} />
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={abrir}
          className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-[var(--text-2)] transition hover:bg-white/[0.04] hover:text-[var(--text)]"
        >
          <ImagePlus size={22} />
          <span className="es-rotulo mt-0.5 text-[20px] font-semibold uppercase tracking-[0.04em]">{etiqueta}</span>
          <span className="text-[11.5px] text-[var(--text-3)]">Sube o suelta la foto</span>
        </button>
      )}
      {subiendo && (
        <span className="absolute inset-0 flex items-center justify-center gap-2 bg-black/55 text-[12.5px] font-semibold text-white">
          <LoaderCircle size={16} className="animate-spin" /> Subiendo
        </span>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onArchivo(f);
        }}
      />
    </div>
  );
}

function Composer({
  marcas,
  marca,
  setMarcaId,
  onListo,
  avisar,
}: {
  marcas: Marca[];
  marca: Marca;
  setMarcaId: (id: string) => void;
  onListo: (p: Pieza[]) => void;
  avisar: (t: string, tono?: "ok" | "error") => void;
}) {
  const { uso } = useEstudio();
  const [formato, setFormato] = useState<TipoPieza>("imagen");
  const [cantidad, setCantidad] = useState(5);
  const [texto, setTexto] = useState("");
  const [es, setEs] = useState(marca.idiomas.es);
  const [idiomaUno, setIdiomaUno] = useState<Idioma>(marca.idiomas.es >= 50 ? "es" : "en");
  const [redes, setRedes] = useState<Red[]>([]);
  const [fuente, setFuente] = useState<Fuente>("ia");
  // Fotos de obra (subidas o de la biblioteca), en el orden en que van.
  const [fotos, setFotos] = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState(0);
  // Antes y después: cada una en su caja, siempre en ese orden.
  const [antes, setAntes] = useState<string | null>(null);
  const [despues, setDespues] = useState<string | null>(null);
  const [subiendoLado, setSubiendoLado] = useState<Record<Lado, boolean>>({ antes: false, despues: false });
  const [generando, setGenerando] = useState(false);

  const tiene = marca.redes.filter((r) => r.estado !== "sin_conectar");
  const disponibles = redesDelFormato(formato)
    .map((red) => tiene.find((c) => c.red === red))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  function elegirFormato(f: TipoPieza) {
    setFormato(f);
    const opciones = CANTIDADES[f];
    if (!opciones.includes(cantidad)) setCantidad(opciones[0]);
  }

  // Otra marca: su reparto de idiomas. Si no tiene avatar, el video no va.
  useEffect(() => {
    setEs(marca.idiomas.es);
    setIdiomaUno(marca.idiomas.es >= 50 ? "es" : "en");
    if (formato === "video" && !marca.avatar) setFormato("imagen");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marca]);

  // Las redes del formato que la marca tiene, todas encendidas.
  useEffect(() => {
    setRedes(disponibles.map((c) => c.red));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marca, formato]);

  // Lo que viene en la URL (desde la biblioteca, el calendario o videos).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get("texto");
    const f = q.get("foto");
    const fmt = q.get("formato");
    if (t) setTexto(t);
    if (esFormato(fmt)) {
      setFormato(fmt);
      setCantidad(CANTIDADES[fmt][0]);
    }
    if (f) {
      setFotos([f]);
      setFuente("obra");
      if (!esFormato(fmt)) {
        setFormato("imagen");
        setCantidad(1);
      }
    }
  }, []);

  const unaSola = cantidad === 1;
  const idiomas: Record<Idioma, number> = unaSola
    ? idiomaUno === "es"
      ? { es: 100, en: 0 }
      : { es: 0, en: 100 }
    : { es, en: 100 - es };

  // Las fotos que van con el encargo. Antes y después: siempre el antes primero.
  const conImagen = llevaImagen(formato);
  const esAntesDespues = conImagen && fuente === "antes_despues";
  const fotosEncargo: string[] | undefined =
    formato === "video"
      ? undefined
      : !conImagen
        ? fotos.slice(0, 1)
        : esAntesDespues
          ? antes && despues
            ? [antes, despues]
            : undefined
          : fuente === "obra"
            ? fotos
            : undefined;
  const origenImagen: OrigenImagen | undefined = conImagen ? (fuente === "ia" ? "ia" : "obra") : undefined;
  const laminas = laminasDeCarrusel(esAntesDespues ? 2 : fotosEncargo?.length ?? 0, esAntesDespues);
  const estimado = estimarCreditos(formato, cantidad, origenImagen, laminas);
  const porVideo = formato === "video" ? Math.round(estimado.alAprobar / cantidad) : 0;
  const usado = usadoEsteMes(uso, marca.id);
  const quedan = Math.max(0, marca.creditosPlan - usado);
  const alcanza = estimado.ahora <= quedan;
  const falta = esAntesDespues && !(antes && despues) ? (antes ? "Falta la foto del después." : despues ? "Falta la foto del antes." : "Sube el antes y el después.") : null;
  const ocupado = subiendo > 0 || subiendoLado.antes || subiendoLado.despues;

  /** Cada foto que se sube queda también en la biblioteca de la marca. */
  function aLaBiblioteca(url: string, archivo: File) {
    agregarMedio({
      id: `md-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      marcaId: marca.id,
      url,
      tipo: "obra",
      titulo: tituloDeArchivo(archivo.name),
      fecha: new Date().toISOString(),
      usos: 0,
    });
  }

  async function subirVarias(archivos: File[]) {
    const libres = MAX_FOTOS - fotos.length - subiendo;
    const van = archivos.filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, libres));
    if (archivos.length > van.length) avisar(`Van hasta ${MAX_FOTOS} fotos por encargo.`, "error");
    if (!van.length) return;
    setSubiendo((n) => n + van.length);
    const salieron = await Promise.allSettled(van.map((f) => subirFoto(f, marca.id)));
    setSubiendo((n) => n - van.length);
    const urls: string[] = [];
    salieron.forEach((r, k) => {
      if (r.status !== "fulfilled") return;
      urls.push(r.value);
      aLaBiblioteca(r.value, van[k]);
    });
    // En el orden en que se eligieron, después de las que ya estaban.
    setFotos((prev) => [...prev, ...urls].slice(0, MAX_FOTOS));
    const fallo = salieron.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (fallo) avisar(fallo.reason instanceof Error ? fallo.reason.message : "Una foto no se pudo subir.", "error");
  }

  async function subirLado(lado: Lado, archivo: File) {
    setSubiendoLado((s) => ({ ...s, [lado]: true }));
    try {
      const url = await subirFoto(archivo, marca.id);
      (lado === "antes" ? setAntes : setDespues)(url);
      aLaBiblioteca(url, archivo);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "La foto no se pudo subir.", "error");
    } finally {
      setSubiendoLado((s) => ({ ...s, [lado]: false }));
    }
  }

  function elegirFuente(f: Fuente) {
    setFuente(f);
    // Un antes y después suele ser uno: el lote grande repite las mismas dos fotos.
    if (f === "antes_despues") setCantidad(CANTIDADES[formato][0]);
  }

  async function lanzar() {
    if (!texto.trim() || generando || !alcanza || falta || ocupado) return;
    if (!redes.length) {
      avisar("Elige al menos una red.", "error");
      return;
    }
    setGenerando(true);
    try {
      const piezas = await generar({
        marca,
        texto: texto.trim(),
        formato,
        cantidad,
        idiomas,
        redes,
        fotos: fotosEncargo?.length ? fotosEncargo : undefined,
        origenImagen,
        antesDespues: esAntesDespues,
      });
      if (!piezas.length) {
        avisar(`${marca.nombre} todavía no tiene ${formato === "video" ? "avatar para video" : "ese formato"}.`, "error");
      } else {
        onListo(piezas);
        setFotos([]);
        setAntes(null);
        setDespues(null);
      }
    } catch (e) {
      avisar((e as Error).message, "error");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <Vidrio className="p-4 lg:p-6">
      {/* Marca */}
      <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {marcas.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMarcaId(m.id)}
            aria-pressed={m.id === marca.id}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[12.5px] font-semibold transition",
              m.id === marca.id ? "bg-white/[0.12] text-[var(--text)] ring-1 ring-white/15" : "text-[var(--text-3)] hover:bg-white/[0.05] hover:text-[var(--text)]",
            )}
          >
            <MarcaSello marca={m} size={24} />
            {m.nombre}
          </button>
        ))}
      </div>

      {/* Qué se crea */}
      <div role="group" aria-label="Formato" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:grid md:grid-cols-5 md:overflow-visible">
        {FORMATOS.map((f) => (
          <TarjetaFormato key={f} formato={f} marca={marca} activo={formato === f} laminas={laminas} onElegir={() => elegirFormato(f)} />
        ))}
      </div>

      {/* Cuántas y de dónde sale la imagen */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div role="group" aria-label="Cuántas" className="flex flex-wrap gap-1.5">
          {CANTIDADES[formato].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCantidad(n)}
              aria-pressed={cantidad === n}
              className={cn(
                "rounded-full px-4 py-2 text-[13px] font-semibold transition",
                cantidad === n ? "bg-[var(--es-acento)] text-[#0b1830]" : "es-hueco text-[var(--text-2)] hover:text-[var(--text)]",
              )}
            >
              {cuantasDe(formato, n)}
            </button>
          ))}
        </div>
        {conImagen && (
          <div role="group" aria-label="La imagen" className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] text-[var(--text-3)]">La imagen</span>
            <div className="flex flex-wrap rounded-[18px] bg-black/30 p-0.5">
              {(
                [
                  ["ia", "Generarla con IA", Sparkles],
                  ["obra", "Fotos de obra", ImageIcon],
                  ["antes_despues", "Antes y después", Columns2],
                ] as const
              ).map(([id, texto, Icono]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => elegirFuente(id)}
                  aria-pressed={fuente === id}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition",
                    fuente === id ? "bg-white/[0.14] text-[var(--text)]" : "text-[var(--text-3)] hover:text-[var(--text-2)]",
                  )}
                >
                  <Icono size={14} /> {texto}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Las fotos: las de obra en su orden, o las dos cajas del antes y después */}
      {conImagen && fuente === "obra" && (
        <FotosDeObra
          fotos={fotos}
          subiendo={subiendo}
          formato={formato}
          onArchivos={(fs) => void subirVarias(fs)}
          onQuitar={(k) => setFotos(fotos.filter((_, j) => j !== k))}
        />
      )}
      {esAntesDespues && (
        <div className="mt-3">
          <div className="relative grid grid-cols-2 gap-3">
            <CajaFoto
              etiqueta="Antes"
              url={antes}
              subiendo={subiendoLado.antes}
              onArchivo={(f) => void subirLado("antes", f)}
              onQuitar={() => setAntes(null)}
            />
            <CajaFoto
              etiqueta="Después"
              url={despues}
              subiendo={subiendoLado.despues}
              onArchivo={(f) => void subirLado("despues", f)}
              onQuitar={() => setDespues(null)}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#0f1a30] text-[var(--es-acento)] ring-1 ring-[var(--border-2)]"
            >
              <ArrowRight size={15} />
            </span>
          </div>
          <p className="mt-2 text-[12px] text-[var(--text-3)]">
            {formato === "carrusel"
              ? "Lámina 1 el antes, lámina 2 el después."
              : "Van en una sola imagen: el antes arriba y el después abajo."}
          </p>
        </div>
      )}

      {/* El encargo */}
      <div className="es-hueco mt-4 rounded-[20px] p-1.5 focus-within:border-[rgba(91,188,214,0.45)]">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void lanzar();
          }}
          rows={4}
          aria-label="Qué contenido necesitas"
          placeholder={ejemploDe(marca, formato)}
          className="block w-full resize-none bg-transparent px-3.5 pb-2 pt-3 text-[16px] leading-[1.5] text-[var(--text)] outline-none placeholder:text-[var(--text-3)] lg:text-[17px]"
        />
        <div className="flex flex-wrap items-center gap-2 px-2 pb-1.5">
          {formato === "texto" && fotos[0] ? (
            <span className="flex items-center gap-2 rounded-[12px] bg-white/[0.06] p-1 pr-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fotos[0]} alt="" className="h-10 w-10 rounded-[8px] object-cover" />
              <span className="text-[12px] text-[var(--text-2)]">Sobre esta foto</span>
              <button type="button" aria-label="Quitar la foto" onClick={() => setFotos([])} className="text-[var(--text-3)] hover:text-[var(--text)]">
                <X size={14} />
              </button>
            </span>
          ) : formato === "texto" ? (
            <Link
              href="/estudio/biblioteca"
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] text-[var(--text-3)] transition hover:bg-white/[0.05] hover:text-[var(--text-2)]"
            >
              <ImageIcon size={14} /> Usar una foto de obra
            </Link>
          ) : null}
          {!texto && (
            <button
              type="button"
              onClick={() => setTexto(ejemploDe(marca, formato))}
              className="ml-auto rounded-full px-2.5 py-1 text-[12px] text-[var(--text-3)] transition hover:bg-white/[0.05] hover:text-[var(--text-2)]"
            >
              Usar el ejemplo
            </button>
          )}
        </div>
      </div>

      {/* Idioma y dónde */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="es-hueco flex min-w-[260px] flex-1 flex-col justify-center rounded-[16px] px-4 py-2.5 sm:flex-none">
          {unaSola ? (
            <div className="flex items-center gap-3">
              <span className="text-[12.5px] text-[var(--text-3)]">Idioma</span>
              <div className="flex rounded-full bg-black/30 p-0.5">
                {(["es", "en"] as Idioma[]).map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIdiomaUno(i)}
                    aria-pressed={idiomaUno === i}
                    className={cn(
                      "rounded-full px-3.5 py-1 text-[12.5px] font-semibold transition",
                      idiomaUno === i ? "bg-white/[0.14] text-[var(--text)]" : "text-[var(--text-3)]",
                    )}
                  >
                    {i === "es" ? "Español" : "Inglés"}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <label className="block">
              <span className="flex items-baseline justify-between gap-4">
                <span className="es-rotulo text-[20px] font-semibold">
                  ES {es}
                  <span className="text-[var(--text-3)]"> / </span>
                  EN {100 - es}
                </span>
                <span className="text-[11.5px] text-[var(--text-3)]">
                  {enEspanol(cantidad, es)} en español y {cantidad - enEspanol(cantidad, es)} en inglés
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={10}
                value={es}
                onChange={(e) => setEs(Number(e.target.value))}
                aria-label="Porcentaje en español"
                className="mt-1.5 w-full accent-[var(--es-acento)]"
              />
            </label>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {disponibles.map((r) => {
            const on = redes.includes(r.red);
            return (
              <button
                key={r.red}
                type="button"
                onClick={() => setRedes(on ? redes.filter((x) => x !== r.red) : [...redes, r.red])}
                aria-pressed={on}
                title={r.estado === "vencida" ? `${NOMBRE_RED[r.red]}: la sesión venció` : NOMBRE_RED[r.red]}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[12px] font-semibold transition",
                  on ? "bg-white/[0.1] text-[var(--text)]" : "text-[var(--text-3)] hover:text-[var(--text-2)]",
                )}
              >
                <IconoRed red={r.red} size={22} apagado={!on} />
                <span className="hidden sm:inline">
                  {formato === "video" ? ({ instagram: "Reels", youtube: "Shorts" } as Partial<Record<Red, string>>)[r.red] ?? NOMBRE_RED[r.red] : NOMBRE_RED[r.red]}
                </span>
                {r.estado === "vencida" && <span className="h-1.5 w-1.5 rounded-full bg-[var(--es-rojo)]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lo que cuesta y generar */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[var(--border)] pt-4">
        <div className="min-w-0 flex-1 text-[13px] leading-snug">
          <p className="text-[var(--text)]">
            Usa <span className="es-rotulo text-[18px] font-semibold">{creditosTexto(estimado.ahora)}</span>
            {formato === "video" && (
              <span className="text-[var(--text-2)]"> y {creditosTexto(porVideo)} más al aprobar cada guion</span>
            )}
          </p>
          {alcanza ? (
            <p className="mt-0.5 text-[12px] text-[var(--text-3)]">
              A {marca.nombre} le quedan {creditos(quedan)} de {creditos(marca.creditosPlan)} este mes.
            </p>
          ) : (
            <p className="mt-0.5 text-[12px] font-semibold text-[var(--es-rojo)]">
              No alcanza: a {marca.nombre} le quedan {creditosTexto(quedan)} este mes.
            </p>
          )}
          {falta && (
            <p className={cn("mt-0.5 text-[12px]", antes || despues ? "font-semibold text-[var(--es-ambar)]" : "text-[var(--text-3)]")}>{falta}</p>
          )}
        </div>
        <Boton
          variante="primario"
          onClick={() => void lanzar()}
          disabled={!texto.trim() || generando || !alcanza || Boolean(falta) || ocupado}
          className="h-11 w-full px-6 text-[14px] sm:w-auto"
        >
          <WandSparkles size={17} />
          {generando ? "Generando" : ocupado ? "Subiendo fotos" : `Generar ${cuantasDe(formato, cantidad)}`}
        </Boton>
      </div>

      <AnimatePresence>{generando && <Escribiendo marca={marca} n={cantidad} formato={formato} conImagenes={origenImagen === "ia"} />}</AnimatePresence>
    </Vidrio>
  );
}

/** El momento de espera: los huecos de las piezas que vienen, con un barrido de luz. */
function Escribiendo({ marca, n, formato, conImagenes }: { marca: Marca; n: number; formato: TipoPieza; conImagenes: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <p className="mt-5 flex items-center gap-2 text-[13px] text-[var(--text-2)]">
        <Sparkles size={15} className="text-[var(--es-violeta)]" />
        {conImagenes ? `Escribiendo ${cuantasDe(formato, n)} y generando sus imágenes` : `Escribiendo ${cuantasDe(formato, n)} con el tono de ${marca.nombre}`}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {Array.from({ length: Math.min(n, 6) }, (_, i) => (
          <div key={i} className={cn("es-hueco relative overflow-hidden rounded-[14px]", formato === "video" ? "aspect-[9/16]" : "aspect-[4/5]")}>
            <motion.span
              className="absolute inset-y-0 w-1/2"
              style={{ background: "linear-gradient(90deg, transparent, rgba(127,208,228,0.14), transparent)" }}
              initial={{ x: "-100%" }}
              animate={{ x: "220%" }}
              transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.08 }}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function Resultado({ piezas, marca }: { piezas: Pieza[]; marca: Marca }) {
  const { piezas: todas, uso } = useEstudio();
  // Lo que el store tiene ahora (si ya se aprobó alguna desde otra pantalla).
  const vivas = piezas.map((p) => todas.find((x) => x.id === p.id) ?? p);
  const ids = new Set(piezas.map((p) => p.id));
  const gastado = creditosTotal(uso.filter((u) => u.piezaId && ids.has(u.piezaId)));
  const formato = vivas[0]?.tipo ?? "imagen";
  return (
    <Vidrio className="p-4 lg:p-5">
      <Cabecera
        titulo={`${cuantasDe(formato, vivas.length)} para revisar`}
        detalle={`${marca.nombre} · ${creditosTexto(gastado)}`}
        accion={
          <Link
            href={`/estudio/aprobacion?pieza=${vivas[0]?.id ?? ""}`}
            className="es-primario inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold"
          >
            Revisar y aprobar
            <ArrowRight size={15} />
          </Link>
        }
      />
      <motion.ul
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
        initial="oculto"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      >
        {vivas.map((p) => (
          <motion.li key={p.id} variants={{ oculto: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
            <Link href={`/estudio/aprobacion?pieza=${p.id}`} className="group block">
              <span className="relative block">
                {/* El sello del formato va en la esquina de la etiqueta del antes: en un antes y después la reemplaza. */}
                <Miniatura pieza={p} marca={marca} forma="post" sinEtiquetas={p.antesDespues} className="transition group-hover:-translate-y-0.5" />
                <span className="absolute left-2 top-2 rounded-full bg-[#0b1830]/80 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                  {p.tipo === "video" && p.fase === "guion" ? "Guion de video" : p.antesDespues ? "Antes y después" : TIPO[p.tipo]}
                </span>
              </span>
              <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug">{p.titulo}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <RedesFila redes={p.redes} size={16} />
                <span className="rounded-[5px] bg-white/[0.07] px-1 text-[10.5px] font-semibold uppercase text-[var(--text-2)]">{p.idioma}</span>
              </div>
              <EstadoPill estado={p.estado} className="mt-1.5" />
            </Link>
          </motion.li>
        ))}
      </motion.ul>
    </Vidrio>
  );
}

function Encargos({ marca }: { marca: Marca }) {
  const { encargos, piezas } = useEstudio();
  const lista = deMarca(encargos, marca.id).slice(0, 6);
  return (
    <Vidrio as="aside" className="p-4 lg:p-5">
      <Cabecera titulo="Encargos recientes" detalle={marca.nombre} />
      {lista.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--text-3)]">Todavía no hay encargos de esta marca.</p>
      ) : (
        <ul className="space-y-2">
          {lista.map((enc) => {
            const suyas = piezas.filter((p) => enc.piezas.includes(p.id));
            const pendientes = suyas.filter((p) => p.estado === "por_aprobar");
            const destino = pendientes[0] ?? suyas[0];
            return (
              <li key={enc.id}>
                <Link
                  href={destino ? `/estudio/aprobacion?pieza=${destino.id}` : "/estudio/aprobacion"}
                  className="es-hueco block rounded-[16px] p-3 transition hover:border-[var(--border-2)]"
                >
                  <p className="line-clamp-3 text-[13px] leading-snug text-[var(--text)]">{enc.texto}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-[var(--text-3)]">
                    <span className="font-semibold text-[var(--text-2)]">
                      {TIPO[enc.formato]} · {enc.cantidad}
                    </span>
                    <span>
                      {enc.actor} · {haceCuanto(enc.creado)}
                    </span>
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    {pendientes.length > 0 ? (
                      <span className="text-[11.5px] font-semibold text-[var(--es-ambar)]">{pendientes.length} por aprobar</span>
                    ) : (
                      <span className="text-[11.5px] text-[var(--es-verde)]">Revisado</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Vidrio>
  );
}

/** Cuántas del lote salen en español: la misma cuenta que hace el motor. */
function enEspanol(n: number, es: number): number {
  return Array.from({ length: n }, (_, i) => idiomaDe(i, es)).filter((x) => x === "es").length;
}

export function CrearEstudio() {
  const { marcas } = useEstudio();
  const activa = useMarcaActiva();
  const [aviso, avisar] = useAviso();
  const [marcaId, setMarcaId] = useState<string>(activa !== "todas" ? activa : marcas[0]?.id ?? "");
  const [resultado, setResultado] = useState<{ piezas: Pieza[]; marcaId: string } | null>(null);

  // La marca: la de la URL, o la del selector de arriba, o la primera.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("marca");
    if (q && marcas.some((m) => m.id === q)) setMarcaId(q);
    // Solo al entrar: después manda lo que se elija aquí o arriba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activa !== "todas") setMarcaId(activa);
  }, [activa]);

  const marca = useMemo(() => marcas.find((m) => m.id === marcaId) ?? marcas[0], [marcas, marcaId]);
  const marcaResultado = resultado ? marcas.find((m) => m.id === resultado.marcaId) : undefined;
  if (!marca) return null;

  return (
    <div className="mx-auto grid max-w-[1500px] gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        <Composer
          marcas={activa === "todas" ? marcas : marcas.filter((m) => m.id === activa)}
          marca={marca}
          setMarcaId={setMarcaId}
          onListo={(piezas) => setResultado({ piezas, marcaId: marca.id })}
          avisar={avisar}
        />
        {resultado && marcaResultado && <Resultado piezas={resultado.piezas} marca={marcaResultado} />}
      </div>
      <Encargos marca={marca} />
      {aviso}
    </div>
  );
}
