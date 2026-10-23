"use client";

// La cola de aprobación: nada sale sin que una persona diga que sí.
//
// A la izquierda lo que espera revisión; a la derecha la pieza como se vería
// en cada red, con su texto por red. Los videos pasan dos veces: primero el
// guion (y al aprobarlo se arma el video) y después el video ya armado. Los
// anuncios no van al calendario: al aprobarse quedan listos para la campaña.
// Lo que gasta créditos (regenerar, armar el video) dice cuánto en el botón.
//
// Atajos: A aprueba y R abre el rechazo, siempre que no se esté escribiendo.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarPlus,
  Check,
  CircleSlash,
  Clock3,
  ImageIcon,
  Layers,
  Megaphone,
  Mic,
  PenLine,
  Play,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { deMarca, editar, elegirLetra, rechazar, useEstudio, useMarcaActiva } from "@/lib/estudio/store";
import { aprobarPieza, regenerar } from "@/lib/estudio/api";
import { haceCuanto } from "@/lib/estudio/fechas";
import { CREDITOS, creditosVideo } from "@/lib/estudio/generador";
import { rotulosDe } from "@/lib/estudio/letras";
import type { AccionHistorial, Marca, Pieza, Red } from "@/lib/estudio/tipos";
import { Boton, EstadoPill, IconoRed, MarcaSello, NOMBRE_RED, TIPO, Vidrio, creditosTexto, useAviso } from "./ui";
import { ElegirLetra } from "./Rotulo";
import { VistaPrevia } from "./VistaPrevia";

type Filtro = "todas" | "por_aprobar" | "guiones" | "rechazadas";

const FILTROS: { id: Filtro; texto: string }[] = [
  { id: "todas", texto: "Todas" },
  { id: "por_aprobar", texto: "Por aprobar" },
  { id: "guiones", texto: "Guiones de video" },
  { id: "rechazadas", texto: "Rechazadas" },
];

const esGuion = (p: Pieza) => p.tipo === "video" && p.fase === "guion";

/** El formato como se lee en la cola: el video dice en qué paso va. */
function formatoDe(p: Pieza): string {
  if (p.tipo === "video") return esGuion(p) ? "Guion de video" : "Video armado";
  return TIPO[p.tipo];
}

/** Lo que cuesta pedir otra versión. */
function costoRegenerar(p: Pieza): number {
  return p.tipo === "anuncio" ? CREDITOS.textoAnuncio : CREDITOS.texto;
}

function pasaFiltro(p: Pieza, f: Filtro): boolean {
  if (f === "por_aprobar") return p.estado === "por_aprobar";
  if (f === "guiones") return esGuion(p) && p.estado === "por_aprobar";
  if (f === "rechazadas") return p.estado === "rechazada";
  // "Todas": lo que pasa por la cola. Lo aprobado que falta programar se queda
  // a la vista para no perderlo; lo programado ya vive en el calendario.
  return p.estado === "por_aprobar" || p.estado === "rechazada" || (p.estado === "aprobada" && !esGuion(p));
}

const ORDEN_ESTADO: Record<string, number> = { por_aprobar: 0, aprobada: 1, rechazada: 2 };

function ordenCola(a: Pieza, b: Pieza): number {
  return (ORDEN_ESTADO[a.estado] ?? 3) - (ORDEN_ESTADO[b.estado] ?? 3) || b.creada.localeCompare(a.creada);
}

const ACCION: Record<AccionHistorial, string> = {
  generada: "Generada",
  editada: "Editada",
  regenerada: "Regenerada",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  programada: "Programada",
  reprogramada: "Reprogramada",
  publicada: "Publicada",
  fallo: "Falló",
};

/** Las palabras prohibidas de la marca que aparecen en el texto. */
function prohibidasEn(p: Pieza, m: Marca): string[] {
  const t = `${p.texto} ${p.guion ?? ""} ${p.hashtags.join(" ")}`.toLowerCase();
  return m.palabrasProhibidas.filter((w) => t.includes(w.toLowerCase()));
}

function escribiendo(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
}

/**
 * La miniatura de la cola: a 52 px un titular encima no se lee, así que va la
 * foto sola (o el avatar si es video) y una marca chica del formato.
 */
function MiniCola({ p, m }: { p: Pieza; m?: Marca }) {
  const foto = p.medios[0] ?? (p.tipo === "video" ? m?.avatar?.foto : undefined);
  const color = m?.colores[0] ?? "#5bbcd6";
  return (
    <span
      className="relative block aspect-square overflow-hidden rounded-[10px]"
      style={{ background: `linear-gradient(150deg, ${color}, color-mix(in srgb, ${color} 45%, #0f1a30))` }}
    >
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="es-rotulo absolute inset-0 flex items-center justify-center text-[16px] font-bold text-white">{m?.iniciales}</span>
      )}
      {p.tipo === "video" && (
        <span className="absolute bottom-1 right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black/65 text-white">
          {esGuion(p) ? <PenLine size={10} /> : <Play size={9} className="ml-px fill-white" />}
        </span>
      )}
      {p.tipo === "anuncio" && (
        <span className="absolute bottom-1 right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--es-acento)] text-[#0b1830]">
          <Megaphone size={10} />
        </span>
      )}
      {p.tipo === "carrusel" && p.medios.length > 1 && (
        <span className="absolute bottom-1 right-1 flex h-[18px] min-w-[18px] items-center justify-center gap-0.5 rounded-full bg-black/65 px-1 text-[9.5px] font-bold text-white">
          <Layers size={9} />
          {p.medios.length}
        </span>
      )}
    </span>
  );
}

function ItemCola({ p, m, activa, onClick }: { p: Pieza; m?: Marca; activa: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={activa ? "true" : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-[16px] p-2 text-left transition",
          activa ? "bg-[rgba(91,188,214,0.1)] ring-1 ring-[rgba(91,188,214,0.4)]" : "hover:bg-white/[0.04]",
        )}
      >
        <span className="w-[52px] shrink-0">
          <MiniCola p={p} m={m} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[13px] font-semibold", p.estado === "rechazada" && "text-[var(--text-2)] line-through decoration-white/30")}>
            {p.titulo}
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11.5px] text-[var(--text-3)]">
            {m && <MarcaSello marca={m} size={14} />}
            <span className="truncate">{m?.nombre}</span>
          </span>
          <span className="mt-1 flex items-center gap-2 text-[11px] text-[var(--text-3)]">
            <span className="shrink-0 font-semibold text-[var(--es-acento)]">{formatoDe(p)}</span>
            <span className="rounded-[5px] bg-white/[0.07] px-1 font-semibold uppercase text-[var(--text-2)]">{p.idioma}</span>
            <span className="truncate">{haceCuanto(p.creada)}</span>
            {p.estado !== "por_aprobar" && <EstadoPill estado={p.estado} className="ml-auto px-1.5 py-0 text-[10.5px]" />}
          </span>
        </span>
      </button>
    </li>
  );
}

/** El guion de un video, para leerlo antes de gastar en armarlo. */
function Guion({ p, m, editando, borrador, setBorrador }: {
  p: Pieza;
  m: Marca;
  editando: boolean;
  borrador: string;
  setBorrador: (s: string) => void;
}) {
  const av = m.avatar;
  const palabras = (p.guion ?? "").split(/\s+/).filter(Boolean).length;
  return (
    <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
      <div className="es-hueco rounded-[20px] p-5">
        <div className="mb-3 flex items-center gap-3 text-[12px] text-[var(--text-3)]">
          <span className="es-rotulo text-[22px] font-semibold text-[var(--text)]">{p.duracion ?? Math.round(palabras / 2.6)} s</span>
          <span>{palabras} palabras</span>
          <span className="rounded-[5px] bg-white/[0.07] px-1 font-semibold uppercase text-[var(--text-2)]">{p.idioma}</span>
        </div>
        {editando ? (
          <textarea
            value={borrador}
            onChange={(e) => setBorrador(e.target.value)}
            rows={8}
            aria-label="Guion"
            className="w-full resize-y rounded-[14px] border border-[var(--border-2)] bg-black/30 p-3 text-[18px] leading-[1.55] text-[var(--text)] outline-none focus:border-[var(--es-acento)]"
          />
        ) : (
          <p className="text-[19px] leading-[1.6] text-[var(--text)] [text-wrap:pretty]">{p.guion}</p>
        )}
      </div>
      {av && (
        <div className="es-hueco flex flex-row gap-3 rounded-[20px] p-3 md:flex-col">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={av.foto} alt={av.nombre} className="aspect-[4/5] w-24 rounded-[14px] object-cover object-top md:w-full" />
          <div className="min-w-0 space-y-1.5 text-[12.5px]">
            <p className="font-semibold">{av.nombre}</p>
            <p className="flex items-center gap-1.5 text-[var(--text-2)]">
              <Mic size={13} /> {av.vozNombre}
            </p>
            {av.tipo === "clon" &&
              (av.consentimiento ? (
                <p className="flex items-center gap-1.5 text-[var(--es-verde)]">
                  <ShieldCheck size={13} /> Consentimiento firmado
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-[var(--es-rojo)]">
                  <AlertTriangle size={13} /> Sin consentimiento
                </p>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

type Modo = null | "editar" | "regenerar" | "rechazar";

function Detalle({
  p,
  m,
  siguiente,
  onVolver,
  avisar,
}: {
  p: Pieza;
  m: Marca;
  siguiente: (desde: Pieza) => void;
  onVolver: () => void;
  avisar: (t: string, tono?: "ok" | "error") => void;
}) {
  const [red, setRed] = useState<Red>(p.redes[0] ?? "instagram");
  const [modo, setModo] = useState<Modo>(null);
  const [texto, setTexto] = useState(p.texto);
  const [hashtags, setHashtags] = useState(p.hashtags.join(" "));
  const [guion, setGuion] = useState(p.guion ?? "");
  const [titular, setTitular] = useState(p.anuncio?.titular ?? p.titulo);
  const [descripcion, setDescripcion] = useState(p.anuncio?.descripcion ?? "");
  const [cta, setCta] = useState(p.anuncio?.cta ?? m.cta[p.idioma]);
  const [rotulos, setRotulos] = useState(rotulosDe(p));
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState<null | "aprobar" | "regenerar">(null);
  const motivoRef = useRef<HTMLInputElement>(null);

  // Otra pieza: todo vuelve a cero.
  useEffect(() => {
    setRed(p.redes[0] ?? "instagram");
    setModo(null);
    setTexto(p.texto);
    setHashtags(p.hashtags.join(" "));
    setGuion(p.guion ?? "");
    setTitular(p.anuncio?.titular ?? p.titulo);
    setDescripcion(p.anuncio?.descripcion ?? "");
    setCta(p.anuncio?.cta ?? m.cta[p.idioma]);
    setRotulos(rotulosDe(p));
    setMotivo("");
  }, [p.id, p.texto, p.hashtags, p.guion, p.redes, p.anuncio, p.titulo, p.idioma, p.rotulos, m.cta]);

  useEffect(() => {
    if (modo === "rechazar" || modo === "regenerar") motivoRef.current?.focus();
  }, [modo]);

  const puedeDecidir = p.estado === "por_aprobar";
  const guionPendiente = esGuion(p);
  const esAnuncio = p.tipo === "anuncio";
  const prohibidas = prohibidasEn(p, m);
  const costoVideo = guionPendiente ? creditosVideo(p.guion ?? "", p.duracion ?? 30).total : 0;

  const aprobarYa = useCallback(async () => {
    if (!puedeDecidir || ocupado) return;
    setOcupado("aprobar");
    try {
      await aprobarPieza(p, m);
      avisar(
        guionPendiente
          ? `Guion aprobado. El video se está armando (${creditosTexto(costoVideo)}).`
          : esAnuncio
            ? "Anuncio aprobado. Queda listo para la campaña."
            : "Aprobada. Ya se puede programar.",
      );
      siguiente(p);
    } catch (e) {
      avisar((e as Error).message, "error");
    } finally {
      setOcupado(null);
    }
  }, [puedeDecidir, ocupado, p, m, avisar, guionPendiente, esAnuncio, costoVideo, siguiente]);

  async function regenerarYa() {
    setOcupado("regenerar");
    try {
      await regenerar(p, m, motivo.trim());
      setModo(null);
      setMotivo("");
      avisar("Nueva versión lista.");
    } catch (e) {
      avisar((e as Error).message, "error");
    } finally {
      setOcupado(null);
    }
  }

  function rechazarYa() {
    rechazar(p.id, motivo);
    avisar("Rechazada.");
    setModo(null);
    siguiente(p);
  }

  function guardar() {
    if (guionPendiente) editar(p.id, { guion: guion.trim() });
    else if (esAnuncio)
      editar(p.id, {
        texto: texto.trim(),
        titulo: titular.trim() || p.titulo,
        anuncio: { titular: titular.trim() || p.titulo, descripcion: descripcion.trim(), cta: cta.trim() || m.cta[p.idioma] },
      });
    else
      editar(p.id, {
        texto: texto.trim(),
        hashtags: hashtags
          .split(/\s+/)
          .filter(Boolean)
          .map((h) => (h.startsWith("#") ? h : `#${h}`)),
        ...(rotulos.length ? { rotulos: rotulos.map((r) => r.trim()) } : {}),
      });
    setModo(null);
    avisar("Cambios guardados.");
  }

  // Atajos de teclado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (escribiendo(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!puedeDecidir) return;
      const k = e.key.toLowerCase();
      if (k === "a") {
        e.preventDefault();
        void aprobarYa();
      } else if (k === "r") {
        e.preventDefault();
        setModo("rechazar");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [puedeDecidir, aprobarYa]);

  const cuentaVencida = m.redes.find((r) => r.red === red)?.estado === "vencida";

  return (
    <div className="flex flex-col gap-4">
      <Vidrio className="p-4 lg:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <button
            type="button"
            onClick={onVolver}
            aria-label="Volver a la cola"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-2)] lg:hidden"
          >
            <ArrowLeft size={16} />
          </button>
          <MarcaSello marca={m} size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] text-[var(--text-3)]">{m.nombre}</p>
            <h2 className="text-[19px] font-semibold leading-tight tracking-[-0.01em]">{p.titulo}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-2)]">
              <EstadoPill estado={p.estado} />
              <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(91,188,214,0.12)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--es-acento)]">
                {esAnuncio && <Megaphone size={12} />}
                {formatoDe(p)}
              </span>
              <span className="rounded-[5px] bg-white/[0.07] px-1 font-semibold uppercase">{p.idioma}</span>
              <span className="flex items-center gap-1 text-[var(--text-3)]">
                <Clock3 size={12} /> {haceCuanto(p.creada)}
              </span>
            </div>
          </div>
        </div>

        {prohibidas.length > 0 && (
          <p className="mt-4 flex items-start gap-2 rounded-[14px] border border-[rgba(240,168,48,0.3)] bg-[rgba(240,168,48,0.08)] px-3 py-2 text-[12.5px] text-[var(--es-ambar)]">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              El texto usa {prohibidas.map((w) => `"${w}"`).join(", ")}, que {m.nombre} no quiere en su contenido.
            </span>
          </p>
        )}

        {/* La pieza */}
        <div className="mt-5">
          {guionPendiente ? (
            <Guion p={p} m={m} editando={modo === "editar"} borrador={guion} setBorrador={setGuion} />
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
              <div>
                <div role="tablist" aria-label="Red" className="mb-3 flex flex-wrap gap-1.5">
                  {p.redes.map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="tab"
                      aria-selected={red === r}
                      onClick={() => setRed(r)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[12px] font-semibold transition",
                        red === r ? "bg-white/[0.12] text-[var(--text)]" : "text-[var(--text-3)] hover:text-[var(--text)]",
                      )}
                    >
                      <IconoRed red={r} size={20} apagado={red !== r} />
                      {p.tipo === "video" ? ({ instagram: "Reels", tiktok: "TikTok", youtube: "Shorts" } as Partial<Record<Red, string>>)[r] ?? NOMBRE_RED[r] : NOMBRE_RED[r]}
                    </button>
                  ))}
                </div>
                <div className={cn("relative flex justify-center", ocupado === "regenerar" && "pointer-events-none")}>
                  <VistaPrevia pieza={p} marca={m} red={red} />
                  <AnimatePresence>
                    {ocupado === "regenerar" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center rounded-[22px] bg-black/55 backdrop-blur-sm"
                      >
                        <span className="flex items-center gap-2 text-[13px] font-semibold text-white">
                          <Sparkles size={15} className="text-[var(--es-violeta)]" /> Escribiendo otra versión
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {cuentaVencida && (
                  <p className="mt-2 text-center text-[12px] text-[var(--es-rojo)]">
                    La sesión de {NOMBRE_RED[red]} venció. Reconéctala antes de programar.
                  </p>
                )}
              </div>

              {/* Texto y edición */}
              <div className="min-w-0 space-y-4">
                {modo === "editar" ? (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1.5 block text-[12px] text-[var(--text-3)]">Texto</span>
                      <textarea
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        rows={7}
                        className="w-full resize-y rounded-[14px] border border-[var(--border-2)] bg-black/30 p-3 text-[14px] leading-[1.55] text-[var(--text)] outline-none focus:border-[var(--es-acento)]"
                      />
                    </label>
                    {esAnuncio ? (
                      <>
                        <label className="block">
                          <span className="mb-1.5 block text-[12px] text-[var(--text-3)]">Titular</span>
                          <input
                            value={titular}
                            onChange={(e) => setTitular(e.target.value)}
                            className="w-full rounded-[12px] border border-[var(--border-2)] bg-black/30 px-3 py-2 text-[13.5px] text-[var(--text)] outline-none focus:border-[var(--es-acento)]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-[12px] text-[var(--text-3)]">Descripción</span>
                          <input
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            className="w-full rounded-[12px] border border-[var(--border-2)] bg-black/30 px-3 py-2 text-[13.5px] text-[var(--text)] outline-none focus:border-[var(--es-acento)]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-[12px] text-[var(--text-3)]">Botón</span>
                          <input
                            value={cta}
                            onChange={(e) => setCta(e.target.value)}
                            className="w-full rounded-[12px] border border-[var(--border-2)] bg-black/30 px-3 py-2 text-[13.5px] text-[var(--text)] outline-none focus:border-[var(--es-acento)]"
                          />
                        </label>
                      </>
                    ) : (
                      <label className="block">
                        <span className="mb-1.5 block text-[12px] text-[var(--text-3)]">Hashtags</span>
                        <input
                          value={hashtags}
                          onChange={(e) => setHashtags(e.target.value)}
                          className="w-full rounded-[12px] border border-[var(--border-2)] bg-black/30 px-3 py-2 text-[13.5px] text-[var(--text)] outline-none focus:border-[var(--es-acento)]"
                        />
                      </label>
                    )}
                    {rotulos.map((r, i) => (
                      <label key={i} className="block">
                        <span className="mb-1.5 block text-[12px] text-[var(--text-3)]">
                          {rotulos.length > 1 ? `Texto en la foto ${i + 1}` : "Texto en la foto"}
                        </span>
                        <input
                          value={r}
                          onChange={(e) => setRotulos(rotulos.map((x, k) => (k === i ? e.target.value : x)))}
                          placeholder="Sin texto, solo la foto"
                          className="w-full rounded-[12px] border border-[var(--border-2)] bg-black/30 px-3 py-2 text-[13.5px] text-[var(--text)] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--es-acento)]"
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="es-hueco rounded-[18px] p-4">
                    <p className="whitespace-pre-line text-[14.5px] leading-[1.6] text-[var(--text)]">{p.texto}</p>
                    {esAnuncio && p.anuncio && (
                      <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t border-[var(--border)] pt-3 text-[13px]">
                        <dt className="text-[var(--text-3)]">Titular</dt>
                        <dd className="font-semibold text-[var(--text)]">{p.anuncio.titular}</dd>
                        <dt className="text-[var(--text-3)]">Descripción</dt>
                        <dd className="text-[var(--text-2)]">{p.anuncio.descripcion || "Sin descripción"}</dd>
                        <dt className="text-[var(--text-3)]">Botón</dt>
                        <dd>
                          <span className="rounded-[6px] bg-[var(--es-acento)] px-2 py-0.5 text-[12px] font-bold text-[#0b1830]">{p.anuncio.cta}</span>
                        </dd>
                      </dl>
                    )}
                    {p.hashtags.length > 0 && (
                      <p className="mt-3 flex flex-wrap gap-1.5">
                        {p.hashtags.map((h) => (
                          <span key={h} className="rounded-full bg-[rgba(91,188,214,0.12)] px-2 py-0.5 text-[12px] font-medium text-[var(--es-cian)]">
                            {h}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                )}
                {modo !== "editar" && (
                  <ElegirLetra
                    pieza={p}
                    marca={m}
                    editable={p.estado === "por_aprobar" || p.estado === "aprobada"}
                    onElegir={(id) => elegirLetra(p.id, id)}
                  />
                )}
                {p.ideaImagen && p.tipo !== "video" && (
                  <p className="flex items-start gap-2 text-[12.5px] text-[var(--text-2)]">
                    <ImageIcon size={14} className="mt-0.5 shrink-0 text-[var(--text-3)]" />
                    {p.ideaImagen}
                  </p>
                )}
                <Historial p={p} />
              </div>
            </div>
          )}
        </div>
        {guionPendiente && (
          <div className="mt-4">
            <Historial p={p} />
          </div>
        )}
      </Vidrio>

      {/* Acciones */}
      <Vidrio className="sticky bottom-24 z-10 p-3 lg:bottom-0">
        {/* Opaca: va fija encima del texto de la pieza y no se puede leer a través. */}
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 rounded-[24px] bg-[#16233d]/95" />
        <AnimatePresence initial={false} mode="wait">
          {modo === "rechazar" || modo === "regenerar" ? (
            <motion.form
              key={modo}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (modo === "rechazar") rechazarYa();
                else void regenerarYa();
              }}
              className="flex flex-wrap items-center gap-2"
            >
              <input
                ref={motivoRef}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setModo(null)}
                placeholder={modo === "rechazar" ? "Por qué no va (lo lee quien la generó)" : "Qué cambiar: más corto, otro ángulo, sin la oferta..."}
                className="min-w-0 flex-1 rounded-full border border-[var(--border-2)] bg-black/30 px-4 py-2 text-[13.5px] text-[var(--text)] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--es-acento)]"
              />
              <Boton type="button" variante="fantasma" onClick={() => setModo(null)}>
                Cancelar
              </Boton>
              {modo === "rechazar" ? (
                <Boton type="submit" variante="peligro">
                  <CircleSlash size={15} /> Rechazar
                </Boton>
              ) : (
                <Boton type="submit" variante="primario" disabled={ocupado === "regenerar"}>
                  <RefreshCcw size={15} className={cn(ocupado === "regenerar" && "animate-spin")} />
                  {ocupado === "regenerar" ? "Regenerando" : `Regenerar · ${creditosTexto(costoRegenerar(p))}`}
                </Boton>
              )}
            </motion.form>
          ) : modo === "editar" ? (
            <motion.div key="editar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center justify-end gap-2">
              <Boton variante="fantasma" onClick={() => setModo(null)}>
                <X size={15} /> Descartar
              </Boton>
              <Boton variante="primario" onClick={guardar}>
                <Check size={15} /> Guardar cambios
              </Boton>
            </motion.div>
          ) : puedeDecidir ? (
            <motion.div key="decidir" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center gap-2">
              <Boton variante="primario" onClick={() => void aprobarYa()} disabled={ocupado === "aprobar"} className="px-5">
                <Check size={16} strokeWidth={2.6} />
                {ocupado === "aprobar" ? "Aprobando" : guionPendiente ? "Aprobar guion" : esAnuncio ? "Aprobar anuncio" : "Aprobar"}
                {guionPendiente && ocupado !== "aprobar" && (
                  <span className="rounded-full bg-black/15 px-2 py-0.5 text-[11.5px] font-semibold">{creditosTexto(costoVideo)}</span>
                )}
                <kbd className="ml-1 hidden rounded-[5px] bg-black/15 px-1.5 text-[11px] font-bold sm:inline">A</kbd>
              </Boton>
              <Boton onClick={() => setModo("editar")}>
                <PenLine size={15} /> Editar
              </Boton>
              <Boton onClick={() => setModo("regenerar")}>
                <RefreshCcw size={15} /> Regenerar
                <span className="text-[11.5px] font-medium text-[var(--text-3)]">{creditosTexto(costoRegenerar(p))}</span>
              </Boton>
              <Boton variante="peligro" onClick={() => setModo("rechazar")} className="sm:ml-auto">
                <CircleSlash size={15} /> Rechazar
                <kbd className="ml-1 hidden rounded-[5px] bg-white/10 px-1.5 text-[11px] font-bold sm:inline">R</kbd>
              </Boton>
            </motion.div>
          ) : p.estado === "rechazada" ? (
            <motion.div key="rechazada" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center gap-3">
              <p className="min-w-0 flex-1 text-[13px] text-[var(--text-2)]">
                {p.historial.filter((h) => h.accion === "rechazada").at(-1)?.nota ?? "Rechazada sin motivo."}
              </p>
              <Boton onClick={() => setModo("regenerar")}>
                <Undo2 size={15} /> Regenerar
              </Boton>
            </motion.div>
          ) : (
            <motion.div key="aprobada" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center gap-3">
              <p className="min-w-0 flex-1 text-[13px] text-[var(--text-2)]">
                {p.estado === "aprobada" && p.tipo === "video" && p.fase === "guion"
                  ? "Guion aprobado. El video se está armando."
                  : esAnuncio
                    ? "Anuncio aprobado. Queda listo para la campaña."
                    : p.programadaPara
                    ? "Ya está en el calendario."
                    : "Aprobada y lista para el calendario."}
              </p>
              {!p.programadaPara && !esAnuncio && !(p.tipo === "video" && p.fase === "guion") && (
                <Link href={`/estudio/calendario?pieza=${p.id}`} className="es-primario inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold">
                  <CalendarPlus size={15} /> Programar
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Vidrio>
    </div>
  );
}

function Historial({ p }: { p: Pieza }) {
  return (
    <ol className="relative space-y-2.5 border-l border-[var(--border)] pl-4">
      {[...p.historial].reverse().map((h, i) => (
        <li key={`${h.ts}-${i}`} className="relative text-[12.5px]">
          <span
            className="absolute -left-[21px] top-1 h-2 w-2 rounded-full ring-4 ring-[#14223c]"
            style={{
              background:
                h.accion === "aprobada" || h.accion === "publicada"
                  ? "var(--es-verde)"
                  : h.accion === "rechazada" || h.accion === "fallo"
                    ? "var(--es-rojo)"
                    : "var(--text-3)",
            }}
          />
          <span className="font-semibold text-[var(--text)]">{ACCION[h.accion]}</span>
          <span className="text-[var(--text-3)]">
            {" "}
            por {h.actor} · {haceCuanto(h.ts)}
          </span>
          {h.nota && <p className="text-[var(--text-2)]">{h.nota}</p>}
        </li>
      ))}
    </ol>
  );
}

export function AprobacionEstudio() {
  const e = useEstudio();
  const activa = useMarcaActiva();
  const [aviso, avisar] = useAviso();
  const [filtro, setFiltro] = useState<Filtro>("por_aprobar");
  const [selId, setSelId] = useState<string | null>(null);
  const [verDetalle, setVerDetalle] = useState(false);
  const leidoUrl = useRef(false);

  const piezas = useMemo(() => deMarca(e.piezas, activa), [e.piezas, activa]);
  const cola = useMemo(() => piezas.filter((p) => pasaFiltro(p, filtro)).sort(ordenCola), [piezas, filtro]);
  const cuenta = (f: Filtro) => piezas.filter((p) => pasaFiltro(p, f)).length;

  // ?pieza=<id> abre esa pieza; sin parámetro, la primera por aprobar.
  useEffect(() => {
    if (leidoUrl.current) return;
    leidoUrl.current = true;
    const id = new URLSearchParams(window.location.search).get("pieza");
    const p = id ? e.piezas.find((x) => x.id === id) : null;
    if (p) {
      setSelId(p.id);
      setVerDetalle(true);
      if (!pasaFiltro(p, "por_aprobar")) setFiltro("todas");
    }
  }, [e.piezas]);

  const sel = piezas.find((p) => p.id === selId) ?? cola[0] ?? null;
  const marcaSel = sel ? e.marcas.find((m) => m.id === sel.marcaId) : undefined;

  // Al decidir una, la siguiente de la cola (la de abajo, o la de arriba si era la última).
  const siguiente = useCallback(
    (desde: Pieza) => {
      const pendientes = piezas.filter((p) => p.estado === "por_aprobar").sort(ordenCola);
      const i = pendientes.findIndex((p) => p.id === desde.id);
      const prox = pendientes[i + 1] ?? pendientes[i - 1] ?? pendientes.find((p) => p.id !== desde.id);
      setSelId(prox && prox.id !== desde.id ? prox.id : desde.id);
    },
    [piezas],
  );

  return (
    <div className="mx-auto grid max-w-[1500px] gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Vidrio as="aside" className={cn("flex min-h-0 flex-col p-3 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-120px)]", verDetalle && "hidden lg:flex")}>
        <div className="mb-2 flex flex-wrap gap-1 pb-1">
          {FILTROS.map((f) => {
            const n = cuenta(f.id);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                aria-pressed={filtro === f.id}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition",
                  filtro === f.id ? "bg-white/[0.12] text-[var(--text)]" : "text-[var(--text-3)] hover:text-[var(--text)]",
                )}
              >
                {f.texto}
                <span className="es-rotulo text-[14px] text-[var(--text-3)]">{n}</span>
              </button>
            );
          })}
        </div>
        {cola.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
            <p className="text-[13.5px] text-[var(--text-2)]">
              {filtro === "rechazadas" ? "Nada rechazado." : "No queda nada por revisar."}
            </p>
            <Link href="/estudio/crear" className="es-primario rounded-full px-4 py-2 text-[13px] font-semibold">
              Crear contenido
            </Link>
          </div>
        ) : (
          <ul className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1">
            {cola.map((p) => (
              <ItemCola
                key={p.id}
                p={p}
                m={e.marcas.find((m) => m.id === p.marcaId)}
                activa={sel?.id === p.id}
                onClick={() => {
                  setSelId(p.id);
                  setVerDetalle(true);
                }}
              />
            ))}
          </ul>
        )}
      </Vidrio>

      <div className={cn("min-w-0", !verDetalle && "hidden lg:block")}>
        {sel && marcaSel ? (
          <Detalle key={sel.id} p={sel} m={marcaSel} siguiente={siguiente} onVolver={() => setVerDetalle(false)} avisar={avisar} />
        ) : (
          <Vidrio className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-[15px] font-semibold">Todo revisado.</p>
            <p className="max-w-xs text-[13px] text-[var(--text-2)]">Lo nuevo que generes llega aquí antes de ir al calendario.</p>
            <Link href="/estudio/crear" className="es-primario mt-1 rounded-full px-4 py-2 text-[13px] font-semibold">
              Crear contenido
            </Link>
          </Vidrio>
        )}
      </div>
      {aviso}
    </div>
  );
}
