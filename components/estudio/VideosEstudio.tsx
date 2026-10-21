"use client";

// Los videos con avatar: quién pone la cara (o la voz) de cada marca, los
// videos que se están armando ahora, los guiones que esperan un sí y los
// videos terminados con su reproductor.
//
// El reproductor es de la muestra: el póster del avatar con los subtítulos
// avanzando sobre el guion, al ritmo de la duración del video. Con "reducir
// movimiento" los subtítulos cambian por bloque, sin ir palabra por palabra.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, Mic, Pause, Play, PenLine, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { deMarca, useEstudio, useMarcaActiva } from "@/lib/estudio/store";
import { diaDe, fechaCorta, haceCuanto, horaCorta, localSV } from "@/lib/estudio/fechas";
import { avanceRender } from "@/lib/estudio/generador";
import type { EtapaRender, Marca, Pieza, TrabajoRender } from "@/lib/estudio/tipos";
import { Cabecera, EstadoPill, MarcaSello, RedesFila, Vidrio, useAhora } from "./ui";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function fechaFirma(dia: string): string {
  const [, m, d] = dia.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

function Avatares({ marcas, videos, trabajos }: { marcas: Marca[]; videos: Pieza[]; trabajos: TrabajoRender[] }) {
  const conAvatar = marcas.filter((m) => m.avatar);
  // El mes de El Salvador, igual que el resto del panel.
  const mes = localSV().slice(0, 7);
  return (
    <section>
      <Cabecera titulo="Avatares y voces" />
      <div className="grid gap-3 md:grid-cols-2">
        {conAvatar.map((m) => {
          const a = m.avatar!;
          const faltaFirma = a.tipo === "clon" && !a.consentimiento;
          const suyos = trabajos.filter((t) => t.marcaId === m.id && localSV(Date.parse(t.iniciado)).startsWith(mes));
          const minutos = suyos.reduce((s, t) => s + t.minutos, 0);
          const enCola = videos.filter((p) => p.marcaId === m.id && p.estado === "por_aprobar").length;
          return (
            <Vidrio key={m.id} className="flex gap-4 p-3" as="article">
              <div className="relative w-[112px] shrink-0 overflow-hidden rounded-[16px] sm:w-[150px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.foto} alt={a.nombre} className="aspect-[9/16] w-full object-cover" />
                <MarcaSello marca={m} size={24} className="absolute left-2 top-2" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col py-1">
                <p className="text-[12px] text-[var(--text-3)]">{m.nombre}</p>
                <h3 className="es-rotulo mt-0.5 text-[26px] font-semibold leading-none">{a.nombre}</h3>
                <p className="mt-1.5 text-[12.5px] text-[var(--text-2)]">
                  {a.tipo === "clon" ? "Clon de la persona, con su cara y su voz" : "Voz de marca sin cara, sobre tomas del negocio"}
                </p>
                <p className="mt-3 flex items-center gap-2 text-[13px]">
                  <Mic size={14} className="text-[var(--es-cian)]" />
                  {a.vozNombre}
                </p>
                {a.tipo === "clon" &&
                  (faltaFirma ? (
                    <p className="mt-1.5 flex items-center gap-2 text-[13px] font-semibold text-[var(--es-rojo)]">
                      <ShieldAlert size={14} />
                      Falta el consentimiento
                    </p>
                  ) : (
                    <p className="mt-1.5 flex items-center gap-2 text-[13px] text-[var(--text-2)]">
                      <ShieldCheck size={14} className="text-[var(--es-verde)]" />
                      Consentimiento firmado el {fechaFirma(a.consentimiento!.firmado)}
                    </p>
                  ))}
                <dl className="mt-4 grid max-w-[260px] grid-cols-3 gap-3">
                  <div>
                    <dt className="text-[11px] text-[var(--text-3)]">Este mes</dt>
                    <dd className="es-rotulo text-[22px] font-semibold leading-tight">{suyos.length}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-[var(--text-3)]">Minutos</dt>
                    <dd className="es-rotulo text-[22px] font-semibold leading-tight">{minutos.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-[var(--text-3)]">En revisión</dt>
                    <dd className="es-rotulo text-[22px] font-semibold leading-tight">{enCola}</dd>
                  </div>
                </dl>
                <div className="mt-auto pt-3">
                  <Link
                    href={`/estudio/crear?marca=${m.id}`}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold",
                      faltaFirma ? "pointer-events-none border border-[var(--border)] text-[var(--text-3)]" : "es-primario",
                    )}
                    aria-disabled={faltaFirma}
                  >
                    <PenLine size={14} />
                    Escribir guion
                  </Link>
                </div>
              </div>
            </Vidrio>
          );
        })}
      </div>
    </section>
  );
}

const ETAPAS: { id: Exclude<EtapaRender, "fallo">; texto: string }[] = [
  { id: "voz", texto: "Voz" },
  { id: "avatar", texto: "Avatar" },
  { id: "edicion", texto: "Subtítulos y logo" },
  { id: "listo", texto: "Listo" },
];

function Linea({ trabajos, piezas, marcas }: { trabajos: TrabajoRender[]; piezas: Pieza[]; marcas: Marca[] }) {
  const ahora = useAhora(1000);
  const enCurso = trabajos
    .filter((t) => t.etapa !== "fallo" && avanceRender(t, ahora).etapa !== "listo")
    .sort((a, b) => a.iniciado.localeCompare(b.iniciado));

  return (
    <Vidrio className="p-4 lg:p-5">
      <Cabecera titulo="Armándose ahora" detalle={enCurso.length ? undefined : "Ningún video en producción"} />
      {enCurso.length > 0 && (
        <ul className="space-y-3">
          {enCurso.map((t) => {
            const p = piezas.find((x) => x.id === t.piezaId);
            const m = marcas.find((x) => x.id === t.marcaId);
            const a = avanceRender(t, ahora);
            const idx = ETAPAS.findIndex((e) => e.id === a.etapa);
            const restan = Math.max(0, Math.round((1 - a.total) * t.duracionSeg));
            return (
              <li key={t.id} className="es-hueco flex gap-4 rounded-[18px] p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m?.avatar?.foto ?? p?.medios[0]} alt="" className="h-[96px] w-[54px] shrink-0 rounded-[10px] object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="truncate text-[14px] font-semibold">{p?.titulo}</p>
                    <p className="es-rotulo text-[18px] font-semibold">
                      {restan >= 60 ? `${Math.ceil(restan / 60)} min` : `${restan} s`}
                      <span className="ml-1 font-sans text-[11.5px] font-normal text-[var(--text-3)]">para terminar</span>
                    </p>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--text-3)]">
                    {m && <MarcaSello marca={m} size={14} />}
                    {m?.avatar?.nombre}, {t.minutos.toFixed(2)} min facturables
                  </p>
                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    {ETAPAS.map((e, i) => {
                      const lleno = i < idx ? 100 : i === idx ? a.progreso : 0;
                      return (
                        <div key={e.id}>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                            <div
                              className="h-full rounded-full bg-[var(--es-violeta)] transition-[width] duration-700"
                              style={{ width: `${lleno}%` }}
                            />
                          </div>
                          <p className={cn("mt-1 flex items-center gap-1 truncate text-[11px]", i === idx ? "text-[var(--text)]" : "text-[var(--text-3)]")}>
                            {i < idx && <Check size={11} className="text-[var(--es-verde)]" />}
                            {e.texto}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Vidrio>
  );
}

function Guiones({ piezas, marcas }: { piezas: Pieza[]; marcas: Marca[] }) {
  if (!piezas.length) return null;
  return (
    <section>
      <Cabecera titulo="Guiones por aprobar" detalle="El video se arma cuando el guion tiene el sí" />
      <div className="grid gap-3 md:grid-cols-2">
        {piezas.map((p) => {
          const m = marcas.find((x) => x.id === p.marcaId);
          return (
            <Vidrio key={p.id} as="article" className="flex flex-col p-4">
              <div className="mb-2 flex items-center gap-2">
                {m && <MarcaSello marca={m} size={22} />}
                <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{p.titulo}</p>
                <span className="es-rotulo text-[15px] font-semibold text-[var(--text-2)]">0:{String(p.duracion ?? 30).padStart(2, "0")}</span>
              </div>
              <blockquote className="flex-1 border-l-2 border-[var(--es-ambar)] pl-3 text-[13.5px] leading-relaxed text-[var(--text-2)]">
                {p.guion}
              </blockquote>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] text-[var(--text-3)]">
                  {m?.avatar?.nombre}, en {p.idioma === "es" ? "español" : "inglés"}
                </span>
                <Link
                  href={`/estudio/aprobacion?pieza=${p.id}`}
                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--es-naranja)] hover:underline"
                >
                  Revisar
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </Vidrio>
          );
        })}
      </div>
    </section>
  );
}

/** Bloques de subtítulo: hasta cinco palabras, cortando también donde termina una frase. */
function bloquesDe(guion: string): string[][] {
  const palabras = guion.split(/\s+/).filter(Boolean);
  const bloques: string[][] = [];
  let actual: string[] = [];
  for (const w of palabras) {
    actual.push(w);
    if (actual.length === 5 || /[.?!:]$/.test(w)) {
      bloques.push(actual);
      actual = [];
    }
  }
  if (actual.length) bloques.push(actual);
  return bloques;
}

function Reproductor({ pieza, marca }: { pieza: Pieza; marca?: Marca }) {
  const reducir = useReducedMotion();
  const duracion = pieza.duracion ?? 30;
  const [t, setT] = useState(0);
  const [andando, setAndando] = useState(false);
  const inicio = useRef(0);
  const bloques = useMemo(() => bloquesDe(pieza.guion ?? pieza.texto), [pieza.guion, pieza.texto]);
  const total = bloques.reduce((s, b) => s + b.length, 0);

  useEffect(() => {
    if (!andando) return;
    inicio.current = performance.now() - t * 1000;
    let raf = 0;
    const paso = (ahora: number) => {
      const seg = (ahora - inicio.current) / 1000;
      if (seg >= duracion) {
        setT(duracion);
        setAndando(false);
        return;
      }
      setT(seg);
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
    // `t` solo se lee al arrancar, para retomar donde se pausó.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [andando, duracion]);

  // Qué palabra suena: las palabras se reparten parejo en la duración.
  const palabra = Math.min(total - 1, Math.floor((t / duracion) * total));
  let resto = palabra;
  let bloque = 0;
  while (bloque < bloques.length - 1 && resto >= bloques[bloque].length) {
    resto -= bloques[bloque].length;
    bloque++;
  }
  const visible = t > 0 || andando;
  const poster = pieza.medios[0] ?? marca?.avatar?.foto;

  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-[18px] bg-[#1d1814]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {poster && <img src={poster} alt={pieza.titulo} className="absolute inset-0 h-full w-full object-cover" />}
      <span className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/70" />
      <div className="absolute inset-x-2.5 top-2.5 h-[3px] overflow-hidden rounded-full bg-white/25">
        <div className="h-full bg-white" style={{ width: `${(t / duracion) * 100}%` }} />
      </div>
      {marca && <MarcaSello marca={marca} size={22} className="absolute left-2.5 top-5" />}
      {visible && bloques[bloque] && (
        <p className="absolute inset-x-3 bottom-[18%] text-center text-[19px] font-extrabold leading-[1.15] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.85),0_0_2px_rgba(0,0,0,0.9)]">
          {bloques[bloque].map((w, i) => (
            <span
              key={`${bloque}-${i}`}
              className={cn(!reducir && i > resto && "opacity-40", !reducir && i === resto && "text-[var(--es-ambar)]")}
            >
              {w}{" "}
            </span>
          ))}
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          if (t >= duracion) setT(0);
          setAndando((a) => !a);
        }}
        aria-label={andando ? "Pausar" : "Reproducir"}
        className={cn(
          "absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition hover:bg-white/30",
          andando && "opacity-0 hover:opacity-100 focus-visible:opacity-100",
        )}
      >
        {andando ? <Pause size={20} className="fill-white text-white" /> : <Play size={20} className="ml-0.5 fill-white text-white" />}
      </button>
      <span className="es-rotulo absolute bottom-2 right-2.5 text-[14px] font-semibold text-white">
        0:{String(Math.floor(t)).padStart(2, "0")} / 0:{String(duracion).padStart(2, "0")}
      </span>
    </div>
  );
}

function Terminados({ piezas, marcas, trabajos }: { piezas: Pieza[]; marcas: Marca[]; trabajos: TrabajoRender[] }) {
  return (
    <section>
      <Cabecera titulo="Videos terminados" detalle={piezas.length ? undefined : "Todavía no hay videos armados"} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {piezas.map((p) => {
          const m = marcas.find((x) => x.id === p.marcaId);
          const t = trabajos.find((x) => x.piezaId === p.id);
          return (
            <Vidrio key={p.id} as="article" className="flex flex-col p-2">
              <Reproductor pieza={p} marca={m} />
              <div className="px-1.5 pb-1 pt-2.5">
                <p className="line-clamp-2 text-[13px] font-semibold leading-snug">{p.titulo}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <EstadoPill estado={p.estado} />
                  <RedesFila redes={p.redes} size={15} />
                </div>
                <p className="mt-1.5 text-[11.5px] text-[var(--text-3)]">
                  {p.programadaPara
                    ? `${fechaCorta(diaDe(p.programadaPara))}, ${horaCorta(p.programadaPara)}`
                    : t
                      ? `armado ${haceCuanto(t.iniciado)}`
                      : "sin fecha"}
                  {t ? `, ${t.minutos.toFixed(2)} min` : ""}
                </p>
                {p.estado === "por_aprobar" && (
                  <Link
                    href={`/estudio/aprobacion?pieza=${p.id}`}
                    className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--es-naranja)] hover:underline"
                  >
                    Revisar el video
                    <ArrowUpRight size={14} />
                  </Link>
                )}
              </div>
            </Vidrio>
          );
        })}
      </div>
    </section>
  );
}

export function VideosEstudio() {
  const e = useEstudio();
  const activa = useMarcaActiva();
  const marcas = useMemo(() => (activa === "todas" ? e.marcas : e.marcas.filter((m) => m.id === activa)), [e.marcas, activa]);
  const videos = useMemo(() => deMarca(e.piezas, activa).filter((p) => p.tipo === "video"), [e.piezas, activa]);
  const trabajos = useMemo(() => deMarca(e.trabajos, activa), [e.trabajos, activa]);
  const guiones = videos.filter((p) => p.fase === "guion" && p.estado === "por_aprobar");
  const orden = { por_aprobar: 0, aprobada: 1, programada: 2, fallida: 3, publicada: 4, rechazada: 5 };
  const terminados = videos
    .filter((p) => p.fase === "video" && p.estado !== "rechazada")
    .sort((a, b) => orden[a.estado] - orden[b.estado] || (b.programadaPara ?? "").localeCompare(a.programadaPara ?? ""));

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
      <Avatares marcas={marcas} videos={videos} trabajos={trabajos} />
      <Linea trabajos={trabajos} piezas={e.piezas} marcas={e.marcas} />
      <Guiones piezas={guiones} marcas={e.marcas} />
      <Terminados piezas={terminados} marcas={e.marcas} trabajos={trabajos} />
    </div>
  );
}
