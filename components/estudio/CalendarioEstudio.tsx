"use client";

// El calendario de publicación: el mes (o la semana) con cada pieza en su día
// y su hora, y a un lado lo aprobado que todavía no tiene fecha.
//
// Se mueve arrastrando: una pieza programada que cae en otro día conserva su
// hora; una de la bandeja toma la hora elegida arriba de la bandeja. En
// celular, donde no hay arrastre, se toca la pieza y después el día. Cada
// movimiento reprograma en el planificador (programarPieza), que devuelve el
// id del post de cada red o el error de la cuenta que no deja.
//
// Las horas son de El Salvador; el detalle dice además a qué hora la ve el
// público de la marca en su ciudad.

import Link from "next/link";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Hand, Plus, Shuffle, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { conectarRed, deMarca, desprogramar, reintentar, useEstudio, useMarcaActiva } from "@/lib/estudio/store";
import { programarPieza } from "@/lib/estudio/api";
import {
  diaDe,
  fechaCorta,
  haceCuanto,
  horaCorta,
  horaDe,
  horaEnZona,
  instanteDe,
  localSV,
  lunesDe,
  mesLargo,
  nombreDia,
  numeroDia,
  sumarDias,
} from "@/lib/estudio/fechas";
import { porHora, repartir } from "@/lib/estudio/generador";
import type { Marca, Pieza, Red } from "@/lib/estudio/tipos";
import { Boton, ESTADO, EstadoPill, IconoRed, MarcaSello, Miniatura, NOMBRE_RED, RedesFila, TIPO, Vidrio, useAviso } from "./ui";

type Vista = "mes" | "semana";

const LETRAS = ["L", "M", "M", "J", "V", "S", "D"];
const ACCIONES: Record<string, string> = {
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

/** Las 42 casillas (6 semanas) del mes de `dia`, empezando en lunes. */
function casillasDelMes(dia: string): string[] {
  const inicio = lunesDe(`${dia.slice(0, 7)}-01`);
  return Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i));
}

/** Se puede mover lo que todavía no salió. */
function movible(p: Pieza): boolean {
  return p.estado === "programada" || p.estado === "aprobada";
}

/** Solo la primera letra: "capitalize" de CSS sube también "oct" y "p. m.". */
function inicial(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function ciudadDe(m: Marca): string {
  return m.ciudad.split(",")[0];
}

export function CalendarioEstudio() {
  const e = useEstudio();
  const activa = useMarcaActiva();
  const [aviso, avisar] = useAviso();
  const ahora = localSV();
  const hoy = diaDe(ahora);

  const [vista, setVista] = useState<Vista>("mes");
  const [cursor, setCursor] = useState(hoy);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [enMano, setEnMano] = useState<string | null>(null);
  const [horaBandeja, setHoraBandeja] = useState("07:00");
  const [repartiendo, setRepartiendo] = useState(false);
  const [sobre, setSobre] = useState<string | null>(null);

  const piezas = useMemo(() => deMarca(e.piezas, activa), [e.piezas, activa]);
  const marcaDe = (id: string) => e.marcas.find((m) => m.id === id);
  const enCalendario = useMemo(() => piezas.filter((p) => p.programadaPara && p.estado !== "rechazada"), [piezas]);
  const bandeja = useMemo(
    () =>
      piezas
        .filter((p) => p.estado === "aprobada" && !p.programadaPara && !(p.tipo === "video" && p.fase === "guion"))
        .sort((a, b) => a.marcaId.localeCompare(b.marcaId) || b.creada.localeCompare(a.creada)),
    [piezas],
  );
  const porDia = useMemo(() => {
    const m = new Map<string, Pieza[]>();
    for (const p of enCalendario) {
      const d = diaDe(p.programadaPara!);
      m.set(d, [...(m.get(d) ?? []), p]);
    }
    for (const xs of m.values()) xs.sort(porHora);
    return m;
  }, [enCalendario]);

  // ?pieza=<id> abre esa pieza y salta a su fecha (desde el resumen).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("pieza");
    if (!id) return;
    const p = e.piezas.find((x) => x.id === id);
    if (!p) return;
    setAbierta(id);
    if (p.programadaPara) setCursor(diaDe(p.programadaPara));
    // Solo al entrar: después la URL ya no manda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function mover(p: Pieza, dia: string, hora?: string) {
    const m = marcaDe(p.marcaId);
    if (!m) return;
    if (!movible(p)) {
      avisar("Esa pieza ya salió; no se mueve.", "error");
      return;
    }
    const cuando = `${dia}T${hora ?? (p.programadaPara ? horaDe(p.programadaPara) : horaBandeja)}`;
    if (cuando === p.programadaPara) return;
    if (instanteDe(cuando) <= Date.now()) {
      avisar("Esa hora ya pasó. Elige otra.", "error");
      return;
    }
    try {
      const { errores } = await programarPieza(p, m, cuando);
      const fallan = Object.keys(errores) as Red[];
      if (fallan.length) {
        avisar(`Programada, pero no en ${fallan.map((r) => NOMBRE_RED[r]).join(" ni ")}: la cuenta venció.`, "error");
      } else {
        avisar(`Programada para el ${fechaCorta(dia)}, ${horaCorta(cuando)}`);
      }
    } catch (err) {
      avisar((err as Error).message, "error");
    }
  }

  function soltar(ev: DragEvent, dia: string, hora?: string) {
    ev.preventDefault();
    setSobre(null);
    const id = ev.dataTransfer.getData("text/pieza");
    const p = e.piezas.find((x) => x.id === id);
    if (p) void mover(p, dia, hora);
  }

  function tocarDia(dia: string, hora?: string) {
    if (!enMano) return;
    const p = e.piezas.find((x) => x.id === enMano);
    setEnMano(null);
    if (p) void mover(p, dia, hora);
  }

  const arrastrable = (p: Pieza) => ({
    draggable: movible(p),
    onDragStart: (ev: DragEvent) => {
      ev.dataTransfer.setData("text/pieza", p.id);
      ev.dataTransfer.effectAllowed = "move";
    },
  });

  const zona = (clave: string, dia: string, hora?: string) => ({
    onDragOver: (ev: DragEvent) => {
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "move";
      if (sobre !== clave) setSobre(clave);
    },
    onDragLeave: () => setSobre((s) => (s === clave ? null : s)),
    onDrop: (ev: DragEvent) => soltar(ev, dia, hora),
  });

  const lunes = lunesDe(cursor);
  const titulo =
    vista === "mes"
      ? mesLargo(cursor)
      : `${numeroDia(lunes)} al ${fechaCorta(sumarDias(lunes, 6)).replace(/^\S+ /, "")}`;

  function paso(n: number) {
    if (vista === "semana") {
      setCursor(sumarDias(cursor, 7 * n));
      return;
    }
    const [y, m] = cursor.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1 + n, 1));
    setCursor(`${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-01`);
  }

  const piezaAbierta = abierta ? e.piezas.find((p) => p.id === abierta) : undefined;
  const piezaEnMano = enMano ? e.piezas.find((p) => p.id === enMano) : undefined;

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <Vidrio className="flex flex-wrap items-center gap-2 p-2 pl-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => paso(-1)}
            aria-label="Anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-2)] transition hover:bg-white/[0.07] hover:text-[var(--text)]"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => paso(1)}
            aria-label="Siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-2)] transition hover:bg-white/[0.07] hover:text-[var(--text)]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <h2 className="es-rotulo min-w-0 truncate text-[26px] font-semibold leading-none">{inicial(titulo)}</h2>
        <Boton variante="fantasma" className="h-8 px-3 text-[12.5px]" onClick={() => setCursor(hoy)}>
          Hoy
        </Boton>
        <div className="ml-auto flex items-center gap-2">
          <div className="es-hueco flex rounded-full p-0.5" role="tablist" aria-label="Vista">
            {(["mes", "semana"] as Vista[]).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={vista === v}
                onClick={() => setVista(v)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition",
                  vista === v ? "bg-white/[0.12] text-[var(--text)]" : "text-[var(--text-3)] hover:text-[var(--text-2)]",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Boton variante="primario" className="h-9" disabled={!bandeja.length} onClick={() => setRepartiendo(true)}>
            <Shuffle size={15} />
            Repartir
          </Boton>
        </div>
      </Vidrio>

      {piezaEnMano && (
        <div className="flex items-center gap-3 rounded-full border border-[rgba(255,122,26,0.35)] bg-[rgba(255,122,26,0.1)] py-1.5 pl-4 pr-1.5 text-[13px]">
          <Hand size={15} className="shrink-0 text-[var(--es-naranja)]" />
          <span className="min-w-0 flex-1 truncate">
            Toca un día para programar <span className="font-semibold">{piezaEnMano.titulo}</span>
          </span>
          <Boton variante="fantasma" className="h-7 px-3 text-[12px]" onClick={() => setEnMano(null)}>
            Soltar
          </Boton>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="order-2 min-w-0 xl:order-1">
          {vista === "mes" ? (
            <Mes
              cursor={cursor}
              hoy={hoy}
              porDia={porDia}
              marcaDe={marcaDe}
              sobre={sobre}
              enMano={Boolean(enMano)}
              zona={zona}
              arrastrable={arrastrable}
              abrir={setAbierta}
              tocarDia={tocarDia}
              verSemana={(d) => {
                setCursor(d);
                setVista("semana");
              }}
            />
          ) : (
            <Semana
              lunes={lunes}
              hoy={hoy}
              porDia={porDia}
              marcaDe={marcaDe}
              sobre={sobre}
              enMano={Boolean(enMano)}
              zona={zona}
              arrastrable={arrastrable}
              abrir={setAbierta}
              tocarDia={tocarDia}
            />
          )}
        </div>

        <Bandeja
          piezas={bandeja}
          marcaDe={marcaDe}
          hora={horaBandeja}
          setHora={setHoraBandeja}
          enMano={enMano}
          tomar={(id) => setEnMano((x) => (x === id ? null : id))}
          arrastrable={arrastrable}
          abrir={setAbierta}
        />
      </div>

      <AnimatePresence>
        {piezaAbierta && (
          <Detalle
            key={piezaAbierta.id}
            pieza={piezaAbierta}
            marca={marcaDe(piezaAbierta.marcaId)}
            cerrar={() => setAbierta(null)}
            mover={mover}
            avisar={avisar}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {repartiendo && (
          <Repartir
            bandeja={bandeja}
            todas={e.piezas}
            marcaDe={marcaDe}
            hoy={hoy}
            cerrar={() => setRepartiendo(false)}
            avisar={avisar}
          />
        )}
      </AnimatePresence>

      {aviso}
    </div>
  );
}

type Zona = (clave: string, dia: string, hora?: string) => {
  onDragOver: (ev: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (ev: DragEvent) => void;
};
type Arrastrable = (p: Pieza) => { draggable: boolean; onDragStart: (ev: DragEvent) => void };

interface PropsVista {
  hoy: string;
  porDia: Map<string, Pieza[]>;
  marcaDe: (id: string) => Marca | undefined;
  sobre: string | null;
  enMano: boolean;
  zona: Zona;
  arrastrable: Arrastrable;
  abrir: (id: string) => void;
  tocarDia: (dia: string, hora?: string) => void;
}

/**
 * La foto de la pieza en chico, sin las marcas de carrusel ni de duración que
 * a este tamaño solo ensucian. Sin foto, el color de la marca.
 */
function Mini({ p, marca, className }: { p: Pieza; marca?: Marca; className?: string }) {
  const foto = p.medios[0];
  const color = marca?.colores[0] ?? "#ff7a1a";
  if (!foto) {
    return (
      <span
        aria-hidden
        className={cn("block aspect-square", className)}
        style={{ background: `linear-gradient(150deg, ${color}, color-mix(in srgb, ${color} 45%, #120e0b))` }}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={foto} alt="" className={cn("block aspect-square object-cover", className)} />;
}

/** La pieza como chip del mes: miniatura, hora, sello y el color de su estado. */
function Chip({ p, marca, arrastrable, abrir }: { p: Pieza; marca?: Marca; arrastrable: Arrastrable; abrir: (id: string) => void }) {
  const est = ESTADO[p.estado];
  return (
    <button
      type="button"
      {...arrastrable(p)}
      onClick={(ev) => {
        ev.stopPropagation();
        abrir(p.id);
      }}
      title={`${p.titulo} (${est.texto})`}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-[10px] p-1 pr-1.5 text-left transition hover:bg-white/[0.08]",
        movible(p) && "cursor-grab active:cursor-grabbing",
        p.estado === "fallida" && "ring-1 ring-[var(--es-rojo)]",
      )}
      style={{ background: `color-mix(in srgb, ${est.color} 11%, rgba(255,250,244,0.03))` }}
    >
      <Mini p={p} marca={marca} className="w-7 shrink-0 rounded-[7px]" />
      <span className="es-rotulo text-[14px] font-semibold leading-none">{horaDe(p.programadaPara!)}</span>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: est.color }} />
      {marca && <MarcaSello marca={marca} size={16} className="ml-auto" />}
    </button>
  );
}

function Mes({ cursor, verSemana, ...v }: PropsVista & { cursor: string; verSemana: (dia: string) => void }) {
  const mes = cursor.slice(0, 7);
  const casillas = casillasDelMes(cursor);
  // La sexta semana sobra cuando el mes ya terminó en la quinta.
  const semanas = casillas.slice(35).some((d) => d.startsWith(mes)) ? 6 : 5;
  const visibles = casillas.slice(0, semanas * 7);
  const conPiezas = visibles.filter((d) => d.startsWith(mes) && ((v.porDia.get(d)?.length ?? 0) > 0 || d === v.hoy));

  return (
    <>
      <Vidrio className="hidden p-3 md:block">
        <div className="mb-2 grid grid-cols-7 gap-1.5 px-1">
          {["lun", "mar", "mié", "jue", "vie", "sáb", "dom"].map((d) => (
            <span key={d} className="text-[12px] font-medium text-[var(--text-3)]">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {visibles.map((dia) => {
            const delMes = dia.startsWith(mes);
            const esHoy = dia === v.hoy;
            const pasado = dia < v.hoy;
            const lista = v.porDia.get(dia) ?? [];
            const clave = `m-${dia}`;
            return (
              <div
                key={dia}
                data-dia={dia}
                {...v.zona(clave, dia)}
                onClick={() => v.tocarDia(dia)}
                className={cn(
                  "flex min-h-[124px] flex-col gap-1 rounded-[14px] p-1.5 transition",
                  esHoy ? "bg-[rgba(255,122,26,0.09)] ring-1 ring-[rgba(255,122,26,0.35)]" : "es-hueco",
                  !delMes && "opacity-45",
                  v.sobre === clave && "ring-2 ring-[var(--es-naranja)]",
                  v.enMano && !pasado && "cursor-copy hover:ring-1 hover:ring-[var(--es-naranja)]",
                )}
              >
                <span
                  className={cn(
                    "es-rotulo px-1 text-[18px] font-semibold leading-none",
                    esHoy ? "text-[var(--es-naranja)]" : pasado ? "text-[var(--text-3)]" : "text-[var(--text)]",
                  )}
                >
                  {numeroDia(dia)}
                </span>
                {lista.slice(0, 3).map((p) => (
                  <Chip key={p.id} p={p} marca={v.marcaDe(p.marcaId)} arrastrable={v.arrastrable} abrir={v.abrir} />
                ))}
                {lista.length > 3 && (
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      verSemana(dia);
                    }}
                    className="rounded-[8px] px-1.5 py-0.5 text-left text-[11.5px] font-semibold text-[var(--text-2)] hover:bg-white/[0.06] hover:text-[var(--text)]"
                  >
                    {lista.length - 3} más
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Vidrio>

      {/* En celular el mes es una lista por día: siete columnas no caben. */}
      <div className="flex flex-col gap-3 md:hidden">
        {conPiezas.length === 0 && <Vidrio className="p-6 text-center text-[13px] text-[var(--text-3)]">Nada programado este mes.</Vidrio>}
        {conPiezas.map((dia) => (
          <Vidrio key={dia} className="p-3">
            <button
              type="button"
              onClick={() => v.tocarDia(dia)}
              className={cn("mb-2 flex w-full items-baseline gap-2 text-left", dia === v.hoy && "text-[var(--es-naranja)]")}
            >
              <span className="es-rotulo text-[22px] font-semibold leading-none">{numeroDia(dia)}</span>
              <span className="text-[12.5px] capitalize text-[var(--text-3)]">{dia === v.hoy ? "hoy" : nombreDia(dia, true)}</span>
            </button>
            <div className="flex flex-col gap-1.5">
              {(v.porDia.get(dia) ?? []).map((p) => (
                <FilaPieza key={p.id} p={p} marca={v.marcaDe(p.marcaId)} abrir={v.abrir} />
              ))}
            </div>
          </Vidrio>
        ))}
      </div>
    </>
  );
}

function FilaPieza({ p, marca, abrir }: { p: Pieza; marca?: Marca; abrir: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => abrir(p.id)}
      className={cn("es-hueco flex w-full min-w-0 items-center gap-3 rounded-[14px] p-1.5 pr-3 text-left", p.estado === "fallida" && "ring-1 ring-[var(--es-rojo)]")}
    >
      <Mini p={p} marca={marca} className="w-12 shrink-0 rounded-[10px]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{p.titulo}</span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className="es-rotulo text-[15px] font-semibold">{horaDe(p.programadaPara!)}</span>
          <RedesFila redes={p.redes} size={14} />
        </span>
      </span>
      <EstadoPill estado={p.estado} />
    </button>
  );
}

const HORAS_SEMANA = Array.from({ length: 14 }, (_, i) => `${String(i + 6).padStart(2, "0")}:00`);

function Semana({ lunes, ...v }: PropsVista & { lunes: string }) {
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  // Lo que cae fuera de 6:00 a 19:59 se cuelga de la franja más cercana.
  const franja = (p: Pieza) => {
    const h = Number(horaDe(p.programadaPara!).slice(0, 2));
    return `${String(Math.min(19, Math.max(6, h))).padStart(2, "0")}:00`;
  };

  return (
    <Vidrio className="p-3">
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] gap-1.5 pb-2">
            <span />
            {dias.map((d) => (
              <div key={d} className={cn("flex items-baseline justify-between px-1.5", d === v.hoy && "text-[var(--es-naranja)]")}>
                <span className="text-[12px] font-medium capitalize text-[inherit] opacity-80">{d === v.hoy ? "Hoy" : nombreDia(d)}</span>
                <span className="es-rotulo text-[22px] font-semibold leading-none">{numeroDia(d)}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            {HORAS_SEMANA.map((h) => (
              <div key={h} className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] gap-1.5">
                <span className="es-rotulo pt-1.5 text-right text-[14px] font-medium text-[var(--text-3)]">{h}</span>
                {dias.map((d) => {
                  const clave = `s-${d}-${h}`;
                  const lista = (v.porDia.get(d) ?? []).filter((p) => franja(p) === h);
                  const pasado = instanteDe(`${d}T${h.slice(0, 2)}:59`) < Date.now();
                  return (
                    <div
                      key={clave}
                      {...v.zona(clave, d, h)}
                      onClick={() => v.tocarDia(d, h)}
                      className={cn(
                        "flex min-h-[44px] flex-col gap-1 rounded-[12px] p-1 transition",
                        d === v.hoy ? "bg-[rgba(255,122,26,0.06)]" : "bg-[rgba(10,8,7,0.28)]",
                        pasado && "opacity-70",
                        v.sobre === clave && "ring-2 ring-[var(--es-naranja)]",
                        v.enMano && !pasado && "cursor-copy hover:ring-1 hover:ring-[var(--es-naranja)]",
                      )}
                    >
                      {lista.map((p) => {
                        const m = v.marcaDe(p.marcaId);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            {...v.arrastrable(p)}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              v.abrir(p.id);
                            }}
                            className={cn(
                              "group relative block overflow-hidden rounded-[10px] text-left",
                              movible(p) && "cursor-grab active:cursor-grabbing",
                              p.estado === "fallida" && "ring-2 ring-[var(--es-rojo)]",
                            )}
                          >
                            <Mini p={p} marca={m} className="aspect-[16/10] w-full rounded-[10px]" />
                            <span className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/65" />
                            <span className="es-rotulo absolute left-1.5 top-1 text-[14px] font-semibold text-white">{horaDe(p.programadaPara!)}</span>
                            {m && <MarcaSello marca={m} size={18} className="absolute right-1 top-1" />}
                            <span className="absolute bottom-1 left-1 right-1 flex items-center justify-between gap-1">
                              <RedesFila redes={p.redes} size={13} />
                              <span className="h-2 w-2 rounded-full" style={{ background: ESTADO[p.estado].color }} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Vidrio>
  );
}

function Bandeja({
  piezas,
  marcaDe,
  hora,
  setHora,
  enMano,
  tomar,
  arrastrable,
  abrir,
}: {
  piezas: Pieza[];
  marcaDe: (id: string) => Marca | undefined;
  hora: string;
  setHora: (h: string) => void;
  enMano: string | null;
  tomar: (id: string) => void;
  arrastrable: Arrastrable;
  abrir: (id: string) => void;
}) {
  return (
    <Vidrio as="aside" className="order-1 flex min-w-0 flex-col p-3 xl:order-2 xl:max-h-[calc(100dvh-210px)] xl:self-start">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1 pt-1">
        <div>
          <h2 className="text-[15px] font-semibold">Aprobadas sin fecha</h2>
          <p className="text-[12px] text-[var(--text-3)]">{piezas.length ? `${piezas.length} para acomodar` : "Todo tiene fecha"}</p>
        </div>
        <label className="flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-[var(--text-3)]">
          Al soltar, a las
          <input
            type="time"
            value={hora}
            step={1800}
            onChange={(ev) => ev.target.value && setHora(ev.target.value)}
            className="es-hueco rounded-full px-2 py-1 text-[12.5px] text-[var(--text)] [color-scheme:dark]"
          />
        </label>
      </div>
      {piezas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
          <CalendarDays size={22} className="text-[var(--text-3)]" />
          <Link href="/estudio/aprobacion" className="text-[12.5px] font-semibold text-[var(--text-2)] hover:text-[var(--text)]">
            Ir a la cola de aprobación
          </Link>
        </div>
      ) : (
        <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 xl:flex-col xl:overflow-y-auto xl:overflow-x-visible">
          {piezas.map((p) => {
            const m = marcaDe(p.marcaId);
            const tomada = enMano === p.id;
            return (
              <li key={p.id} className="w-[220px] shrink-0 xl:w-auto">
                <div
                  {...arrastrable(p)}
                  data-bandeja={p.id}
                  className={cn(
                    "es-hueco flex cursor-grab items-center gap-2.5 rounded-[14px] p-1.5 pr-2 transition active:cursor-grabbing",
                    tomada && "ring-2 ring-[var(--es-naranja)]",
                  )}
                >
                  <button type="button" onClick={() => abrir(p.id)} className="w-12 shrink-0" aria-label={`Ver ${p.titulo}`}>
                    <Mini p={p} marca={m} className="w-12 rounded-[10px]" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold">{p.titulo}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--text-3)]">
                      {m && <MarcaSello marca={m} size={14} />}
                      <span>{TIPO[p.tipo]}</span>
                      <span className="uppercase">{p.idioma}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => tomar(p.id)}
                    aria-pressed={tomada}
                    aria-label={tomada ? "Soltar" : "Elegir día"}
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition",
                      tomada ? "bg-[var(--es-naranja)] text-[#1a0d03]" : "text-[var(--text-3)] hover:bg-white/[0.08] hover:text-[var(--text)]",
                    )}
                  >
                    <CalendarDays size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Vidrio>
  );
}

function Panel({ children, cerrar, titulo, ancho = "md" }: { children: React.ReactNode; cerrar: () => void; titulo: string; ancho?: "md" | "lg" }) {
  useEffect(() => {
    const esc = (ev: KeyboardEvent) => ev.key === "Escape" && cerrar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [cerrar]);
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px]"
        onClick={cerrar}
        aria-hidden
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className={cn(
          "es-vidrio fixed inset-y-2 right-2 z-[61] flex w-[calc(100vw-16px)] flex-col overflow-hidden rounded-[26px]",
          ancho === "md" ? "sm:w-[440px]" : "sm:w-[520px]",
        )}
        style={{ background: "rgba(26,21,17,0.96)" }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3.5">
          <h2 className="truncate text-[15px] font-semibold">{titulo}</h2>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-white/[0.08] hover:text-[var(--text)]"
          >
            <X size={17} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </motion.aside>
    </>
  );
}

function Detalle({
  pieza: p,
  marca,
  cerrar,
  mover,
  avisar,
}: {
  pieza: Pieza;
  marca?: Marca;
  cerrar: () => void;
  mover: (p: Pieza, dia: string, hora?: string) => Promise<void>;
  avisar: (t: string, tono?: "ok" | "error") => void;
}) {
  const [dia, setDia] = useState(p.programadaPara ? diaDe(p.programadaPara) : diaDe(localSV(Date.now() + 86_400_000)));
  const [hora, setHora] = useState(p.programadaPara ? horaDe(p.programadaPara) : "07:00");
  const [ocupada, setOcupada] = useState(false);
  const fallidas = p.variantes.filter((v) => v.estado === "fallida");
  const vencidas = fallidas.filter((v) => marca?.redes.find((r) => r.red === v.red)?.estado === "vencida");

  return (
    <Panel titulo={p.titulo} cerrar={cerrar}>
      <div className="flex gap-4">
        <Miniatura pieza={p} marca={marca} forma={p.tipo === "video" ? "vertical" : "post"} className="w-[150px] shrink-0" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <EstadoPill estado={p.estado} />
          {marca && (
            <p className="flex items-center gap-2 text-[13px] font-medium">
              <MarcaSello marca={marca} size={22} />
              <span className="truncate">{marca.nombre}</span>
            </p>
          )}
          <p className="text-[12.5px] text-[var(--text-3)]">
            {TIPO[p.tipo]}, en {p.idioma === "es" ? "español" : "inglés"}
          </p>
          {p.programadaPara && (
            <div>
              <p className="es-rotulo text-[22px] font-semibold leading-tight">
                <span className="whitespace-nowrap">{inicial(fechaCorta(diaDe(p.programadaPara)))},</span>{" "}
                <span className="whitespace-nowrap">{horaCorta(p.programadaPara)}</span>
              </p>
              {marca && (
                <p className="text-[12.5px] text-[var(--text-2)]">
                  {horaEnZona(p.programadaPara, marca.zonaHoraria)} en {ciudadDe(marca)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 whitespace-pre-line text-[13.5px] leading-relaxed text-[var(--text-2)]">{p.texto}</p>
      {p.hashtags.length > 0 && <p className="mt-2 text-[12.5px] text-[var(--es-cian)]">{p.hashtags.join(" ")}</p>}

      <h3 className="mb-2 mt-5 text-[13px] font-semibold">Redes</h3>
      <ul className="space-y-1.5">
        {p.variantes.map((v) => {
          const cuenta = marca?.redes.find((r) => r.red === v.red);
          const sinId = v.estado === "programada" && !v.postId;
          return (
            <li key={v.red} className="es-hueco flex items-start gap-3 rounded-[14px] px-3 py-2">
              <IconoRed red={v.red} size={24} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="truncate font-medium">{cuenta?.cuenta || NOMBRE_RED[v.red]}</span>
                  <span className="shrink-0 text-[12px] font-semibold" style={{ color: sinId ? "var(--es-rojo)" : ESTADO[v.estado].color }}>
                    {sinId ? "No programada" : ESTADO[v.estado].texto}
                  </span>
                </p>
                {v.postId && <p className="text-[11.5px] text-[var(--text-3)]">Post {v.postId}</p>}
                {v.error && <p className="mt-0.5 text-[12px] text-[var(--es-rojo)]">{v.error}</p>}
                {sinId && cuenta?.estado === "vencida" && (
                  <p className="mt-0.5 text-[12px] text-[var(--es-rojo)]">La sesión de la cuenta venció.</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {fallidas.length > 0 && marca && (
        <div className="mt-4 flex items-center gap-3 rounded-[16px] border border-[rgba(255,107,107,0.3)] bg-[rgba(255,107,107,0.08)] p-3">
          <AlertTriangle size={17} className="shrink-0 text-[var(--es-rojo)]" />
          <p className="min-w-0 flex-1 text-[12.5px]">
            No salió en {fallidas.map((v) => NOMBRE_RED[v.red]).join(" ni ")}.
          </p>
          <Boton
            variante="peligro"
            className="h-8 shrink-0 px-3 text-[12px]"
            onClick={() => {
              for (const v of vencidas) conectarRed(marca.id, v.red);
              reintentar(p.id);
              avisar("Publicada.");
            }}
          >
            {vencidas.length ? "Reconectar y publicar" : "Reintentar"}
          </Boton>
        </div>
      )}

      {p.estado === "por_aprobar" && (
        <Link
          href={`/estudio/aprobacion?pieza=${p.id}`}
          className="es-primario mt-5 flex h-10 items-center justify-center rounded-full text-[13px] font-semibold"
        >
          Revisar y aprobar
        </Link>
      )}

      {movible(p) && (
        <div className="mt-5">
          <h3 className="mb-2 text-[13px] font-semibold">{p.programadaPara ? "Cambiar fecha" : "Programar"}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dia}
              min={diaDe(localSV())}
              onChange={(ev) => setDia(ev.target.value)}
              className="es-hueco h-9 rounded-full px-3 text-[13px] text-[var(--text)] [color-scheme:dark]"
            />
            <input
              type="time"
              value={hora}
              step={900}
              onChange={(ev) => setHora(ev.target.value)}
              className="es-hueco h-9 rounded-full px-3 text-[13px] text-[var(--text)] [color-scheme:dark]"
            />
            <Boton
              variante="primario"
              className="h-9"
              disabled={ocupada || !dia || !hora || `${dia}T${hora}` === p.programadaPara}
              onClick={async () => {
                setOcupada(true);
                await mover(p, dia, hora);
                setOcupada(false);
              }}
            >
              {ocupada ? "Guardando" : p.programadaPara ? "Cambiar" : "Programar"}
            </Boton>
          </div>
          {marca && dia && hora && (
            <p className="mt-1.5 text-[12px] text-[var(--text-3)]">
              {horaEnZona(`${dia}T${hora}`, marca.zonaHoraria)} en {ciudadDe(marca)}
            </p>
          )}
          {p.programadaPara && (
            <Boton
              variante="fantasma"
              className="mt-3 h-8 px-3 text-[12.5px]"
              onClick={() => {
                desprogramar(p.id);
                avisar("Quitada del calendario.");
                cerrar();
              }}
            >
              Quitar del calendario
            </Boton>
          )}
        </div>
      )}

      <h3 className="mb-2 mt-6 text-[13px] font-semibold">Historial</h3>
      <ol className="space-y-2 border-l border-[var(--border)] pl-4">
        {[...p.historial].reverse().map((h, i) => (
          <li key={`${h.ts}-${i}`} className="relative text-[12.5px]">
            <span
              className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full"
              style={{ background: h.accion === "fallo" ? "var(--es-rojo)" : h.accion === "aprobada" ? "var(--es-violeta)" : "var(--text-3)" }}
            />
            <span className="font-medium">{ACCIONES[h.accion] ?? h.accion}</span>
            <span className="text-[var(--text-3)]">
              {" "}
              por {h.actor}, {haceCuanto(h.ts)}
            </span>
            {h.nota && <p className="text-[12px] text-[var(--text-3)]">{h.nota}</p>}
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function Repartir({
  bandeja,
  todas,
  marcaDe,
  hoy,
  cerrar,
  avisar,
}: {
  bandeja: Pieza[];
  todas: Pieza[];
  marcaDe: (id: string) => Marca | undefined;
  hoy: string;
  cerrar: () => void;
  avisar: (t: string, tono?: "ok" | "error") => void;
}) {
  const [dias, setDias] = useState<number[]>([0, 1, 2, 3, 4]);
  const [horas, setHoras] = useState<string[]>(["07:00", "16:00"]);
  const [nueva, setNueva] = useState("10:30");
  const [desde, setDesde] = useState(hoy);
  const [ocupado, setOcupado] = useState(false);

  // Lo que va a pasar, marca por marca, antes de tocar nada.
  const plan = useMemo(() => {
    const ahora = localSV();
    const fuera: { pieza: Pieza; cuando: string }[] = [];
    const marcas = [...new Set(bandeja.map((p) => p.marcaId))];
    for (const id of marcas) {
      const ocupadas = todas.filter((p) => p.marcaId === id && p.programadaPara && p.estado !== "rechazada").map((p) => p.programadaPara!);
      // Las horas de hoy que ya pasaron cuentan como tomadas.
      for (const h of horas) if (`${desde}T${h}` <= ahora) ocupadas.push(`${desde}T${h}`);
      const suyas = bandeja.filter((p) => p.marcaId === id);
      const asignado = repartir(
        suyas.map((p) => p.id),
        { desde, dias, horas, ocupadas },
      );
      for (const p of suyas) if (asignado[p.id]) fuera.push({ pieza: p, cuando: asignado[p.id] });
    }
    return fuera.sort((a, b) => a.cuando.localeCompare(b.cuando));
  }, [bandeja, todas, dias, horas, desde]);

  async function confirmar() {
    setOcupado(true);
    const conError = new Set<string>();
    for (const { pieza, cuando } of plan) {
      const m = marcaDe(pieza.marcaId);
      if (!m) continue;
      try {
        const { errores } = await programarPieza(pieza, m, cuando);
        for (const r of Object.keys(errores) as Red[]) conError.add(NOMBRE_RED[r]);
      } catch (err) {
        avisar((err as Error).message, "error");
        setOcupado(false);
        return;
      }
    }
    setOcupado(false);
    cerrar();
    avisar(
      conError.size
        ? `${plan.length} programadas. Sin ${[...conError].join(" ni ")}: la cuenta venció.`
        : `${plan.length} ${plan.length === 1 ? "programada" : "programadas"}.`,
      conError.size ? "error" : "ok",
    );
  }

  return (
    <Panel titulo="Repartir en el calendario" cerrar={cerrar} ancho="lg">
      <h3 className="mb-2 text-[13px] font-semibold">Días</h3>
      <div className="flex gap-1.5">
        {LETRAS.map((l, i) => {
          const on = dias.includes(i);
          return (
            <button
              key={i}
              type="button"
              aria-pressed={on}
              aria-label={nombreDia(sumarDias(lunesDe(hoy), i), true)}
              onClick={() => setDias((d) => (on ? d.filter((x) => x !== i) : [...d, i].sort()))}
              className={cn(
                "es-rotulo flex h-10 w-10 items-center justify-center rounded-full text-[17px] font-semibold transition",
                on ? "es-primario" : "es-hueco text-[var(--text-3)] hover:text-[var(--text)]",
              )}
            >
              {l}
            </button>
          );
        })}
      </div>

      <h3 className="mb-2 mt-5 text-[13px] font-semibold">Horas</h3>
      <div className="flex flex-wrap items-center gap-1.5">
        {horas.map((h) => (
          <span key={h} className="es-hueco inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-1 text-[13px]">
            <span className="es-rotulo text-[16px] font-semibold">{h}</span>
            <button
              type="button"
              aria-label={`Quitar ${h}`}
              onClick={() => setHoras((xs) => xs.filter((x) => x !== h))}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-3)] hover:bg-white/[0.08] hover:text-[var(--text)]"
            >
              <X size={13} />
            </button>
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <input
            type="time"
            value={nueva}
            step={900}
            onChange={(ev) => setNueva(ev.target.value)}
            className="es-hueco h-8 rounded-full px-2.5 text-[12.5px] text-[var(--text)] [color-scheme:dark]"
          />
          <button
            type="button"
            aria-label="Agregar hora"
            disabled={!nueva || horas.includes(nueva)}
            onClick={() => setHoras((xs) => [...xs, nueva].sort())}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-white/[0.08] hover:text-[var(--text)] disabled:opacity-40"
          >
            <Plus size={15} />
          </button>
        </span>
      </div>

      <h3 className="mb-2 mt-5 text-[13px] font-semibold">Desde</h3>
      <input
        type="date"
        value={desde}
        min={hoy}
        onChange={(ev) => ev.target.value && setDesde(ev.target.value)}
        className="es-hueco h-9 rounded-full px-3 text-[13px] text-[var(--text)] [color-scheme:dark]"
      />
      <p className="mt-2 text-[12px] text-[var(--text-3)]">Una pieza por día y marca, sin pisar lo que ya está programado.</p>

      <h3 className="mb-2 mt-5 text-[13px] font-semibold">
        {plan.length} de {bandeja.length} {bandeja.length === 1 ? "pieza" : "piezas"}
      </h3>
      <ul className="space-y-1.5">
        {plan.map(({ pieza, cuando }) => {
          const m = marcaDe(pieza.marcaId);
          return (
            <li key={pieza.id} className="es-hueco flex items-center gap-3 rounded-[14px] p-1.5 pr-3">
              <Mini p={pieza} marca={m} className="w-10 shrink-0 rounded-[9px]" />
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{pieza.titulo}</span>
              <span className="shrink-0 text-right">
                <span className="es-rotulo block text-[15px] font-semibold leading-none">{inicial(fechaCorta(diaDe(cuando)))}</span>
                <span className="text-[11.5px] text-[var(--text-3)]">{horaDe(cuando)}</span>
              </span>
            </li>
          );
        })}
        {plan.length < bandeja.length && (
          <li className="px-1 text-[12px] text-[var(--es-ambar)]">
            {dias.length === 0 || horas.length === 0 ? "Elige al menos un día y una hora." : "Las demás no caben en las fechas elegidas."}
          </li>
        )}
      </ul>

      <div className="sticky bottom-0 -mx-5 mt-5 border-t border-[var(--border)] bg-[rgba(26,21,17,0.96)] px-5 pb-1 pt-3">
        <Boton variante="primario" className="h-10 w-full" disabled={ocupado || plan.length === 0} onClick={() => void confirmar()}>
          {ocupado ? "Programando" : `Programar ${plan.length}`}
        </Boton>
      </div>
    </Panel>
  );
}
