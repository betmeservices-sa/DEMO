"use client";

// La biblioteca: las fotos de obra que manda cada marca, los gráficos que
// salen de su plantilla (la foto con el titular y el sello encima) y los
// videos ya armados. De aquí se escribe un post sobre una foto real, que es
// lo que evita que el contenido suene genérico.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ImagePlus, PenLine, Play, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { agregarMedio, deMarca, useEstudio, useMarcaActiva } from "@/lib/estudio/store";
import { diaDe, fechaCorta, localSV } from "@/lib/estudio/fechas";
import type { Marca, Medio, TipoMedio } from "@/lib/estudio/tipos";
import { Desplegable } from "@/components/ui/Desplegable";
import { MarcaSello, Vidrio, useAviso } from "./ui";

type Filtro = "todas" | TipoMedio;

const FILTROS: { id: Filtro; texto: string }[] = [
  { id: "todas", texto: "Todo" },
  { id: "obra", texto: "Fotos de obra" },
  { id: "generada", texto: "Gráficos" },
  { id: "video", texto: "Videos" },
];

// Las fotos vienen todas en el mismo recorte; alternarlo arma la mampostería.
const RECORTES = ["aspect-[4/5]", "aspect-square", "aspect-[3/4]"];

// Columnas de la mampostería según el ancho. Se reparten en orden (una por
// columna, en vuelta) para que lo más nuevo quede arriba de todas, no solo de
// la primera como pasa con las columnas de CSS.
const ANCHOS: [number, number][] = [
  [1536, 6],
  [1024, 5],
  [640, 3],
  [0, 2],
];

function useColumnas(): number {
  const [n, setN] = useState(5);
  useEffect(() => {
    const medir = () => setN(ANCHOS.find(([w]) => window.innerWidth >= w)?.[1] ?? 2);
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);
  return n;
}

function fechaDe(iso: string): string {
  return fechaCorta(diaDe(localSV(Date.parse(iso))));
}

function usosTexto(n: number): string {
  if (n === 0) return "Sin usar todavía";
  return n === 1 ? "En 1 pieza" : `En ${n} piezas`;
}

function Tarjeta({
  medio,
  marca,
  indice,
  conSello,
  abierta,
  onTocar,
}: {
  medio: Medio;
  marca?: Marca;
  indice: number;
  conSello: boolean;
  abierta: boolean;
  onTocar: () => void;
}) {
  const esVideo = medio.tipo === "video";
  const esGrafico = medio.tipo === "generada";
  const recorte = esVideo ? "aspect-[9/16]" : esGrafico ? "aspect-[4/5]" : RECORTES[indice % RECORTES.length];
  const color = marca?.colores[0] ?? "#ff7a1a";

  return (
    <article
      className={cn("group relative overflow-hidden rounded-[18px] bg-[#1d1814]", recorte)}
      onClick={onTocar}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={medio.url} alt={medio.titulo} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />

      {esGrafico && (
        <div
          className="absolute inset-0 flex flex-col justify-end p-4"
          style={{ background: `linear-gradient(180deg, transparent 25%, color-mix(in srgb, ${color} 55%, rgba(0,0,0,0.6)) 72%, ${color})` }}
        >
          <p className="es-rotulo text-[26px] font-bold uppercase leading-[0.92] text-white drop-shadow">{medio.titular}</p>
          {marca && (
            <span className="mt-3 flex items-center gap-2 text-[11.5px] font-semibold text-white/90">
              <MarcaSello marca={marca} size={22} />
              {marca.nombre}
            </span>
          )}
        </div>
      )}

      {esVideo && (
        <>
          <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
            <Play size={18} className="ml-0.5 fill-white text-white" />
          </span>
        </>
      )}

      {conSello && marca && !esGrafico && <MarcaSello marca={marca} size={24} className="absolute left-2.5 top-2.5" />}

      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-end gap-2 p-3 transition",
          // El gráfico ya trae su titular: encima va un velo parejo para que no se mezclen.
          esGrafico ? "bg-black/70 backdrop-blur-[2px]" : "bg-gradient-to-t from-black/90 via-black/45 to-transparent",
          abierta ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
        )}
      >
        <div className="min-w-0">
          <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-white">{medio.titulo}</p>
          <p className="mt-0.5 text-[11.5px] text-white/65">
            {usosTexto(medio.usos)} · {fechaDe(medio.fecha)}
          </p>
        </div>
        {esVideo ? (
          <Link
            href="/estudio/videos"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur hover:bg-white/20"
          >
            <Play size={13} />
            Ver en Videos
          </Link>
        ) : (
          <Link
            href={`/estudio/crear?marca=${medio.marcaId}&foto=${encodeURIComponent(medio.url)}`}
            onClick={(e) => e.stopPropagation()}
            className="es-primario inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold"
          >
            <PenLine size={13} />
            Escribir post con esta foto
          </Link>
        )}
      </div>
    </article>
  );
}

function Subir({ marcas, activa, avisar }: { marcas: Marca[]; activa: string; avisar: (t: string) => void }) {
  const [destino, setDestino] = useState("");
  const [encima, setEncima] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const marcaId = activa !== "todas" ? activa : destino;
  const marca = marcas.find((m) => m.id === marcaId);

  function recibir(archivos: FileList | null) {
    if (!archivos || !marca) return;
    const fotos = Array.from(archivos).filter((f) => f.type.startsWith("image/"));
    for (const f of fotos) {
      agregarMedio({
        id: `md-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        marcaId: marca.id,
        url: URL.createObjectURL(f),
        tipo: "obra",
        titulo: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
        fecha: new Date().toISOString(),
        usos: 0,
      });
    }
    if (fotos.length) avisar(`${fotos.length === 1 ? "1 foto" : `${fotos.length} fotos`} en la biblioteca de ${marca.nombre}.`);
  }

  function soltar(e: DragEvent) {
    e.preventDefault();
    setEncima(false);
    recibir(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (marca) setEncima(true);
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={soltar}
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-[20px] border border-dashed px-4 py-3 transition",
        encima ? "border-[var(--es-naranja)] bg-[rgba(255,122,26,0.08)]" : "border-[var(--border-2)] bg-white/[0.02]",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[var(--text-2)]">
        <ImagePlus size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">Fotos de obra</p>
        <p className="text-[12px] text-[var(--text-3)]">
          {marca ? `Suéltalas aquí y quedan en la biblioteca de ${marca.nombre}.` : "Elige de qué marca son y suéltalas aquí."}
        </p>
      </div>
      {activa === "todas" && (
        <Desplegable
          className="w-full sm:w-[230px]"
          valor={destino}
          onChange={setDestino}
          etiquetaAria="Marca de las fotos"
          opciones={[{ valor: "", etiqueta: "Elige la marca" }, ...marcas.map((m) => ({ valor: m.id, etiqueta: m.nombre }))]}
        />
      )}
      <button
        type="button"
        disabled={!marca}
        onClick={() => input.current?.click()}
        className="es-primario inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Upload size={14} />
        Elegir fotos
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          recibir(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function BibliotecaEstudio() {
  const { medios, marcas } = useEstudio();
  const activa = useMarcaActiva();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [aviso, avisar] = useAviso();
  const columnas = useColumnas();

  const deLaMarca = useMemo(
    () => deMarca(medios, activa).slice().sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [medios, activa],
  );
  const visibles = filtro === "todas" ? deLaMarca : deLaMarca.filter((m) => m.tipo === filtro);
  const cuenta = (f: Filtro) => (f === "todas" ? deLaMarca.length : deLaMarca.filter((m) => m.tipo === f).length);

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <Subir marcas={marcas} activa={activa} avisar={avisar} />

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {FILTROS.map((f) => {
          const on = filtro === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              aria-pressed={on}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition",
                on ? "bg-[var(--text)] text-[#16120f]" : "es-vidrio text-[var(--text-2)] hover:text-[var(--text)]",
              )}
            >
              {f.texto}
              <span className={cn("es-rotulo text-[14px]", on ? "text-[#16120f]/60" : "text-[var(--text-3)]")}>{cuenta(f.id)}</span>
            </button>
          );
        })}
      </div>

      {visibles.length === 0 ? (
        <Vidrio className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <p className="text-[14px] font-semibold">Nada aquí todavía.</p>
          <p className="max-w-sm text-[13px] text-[var(--text-3)]">
            {filtro === "video"
              ? "Los videos aparecen cuando se aprueba un guion y termina de armarse."
              : "Sube fotos de obra reales: los posts escritos sobre ellas son los que mejor funcionan."}
          </p>
        </Vidrio>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
          {Array.from({ length: columnas }, (_, c) => (
            <div key={c} className="flex min-w-0 flex-col gap-3">
              {visibles.map((m, i) =>
                i % columnas === c ? (
                  <Tarjeta
                    key={m.id}
                    medio={m}
                    marca={marcas.find((x) => x.id === m.marcaId)}
                    indice={i + c}
                    conSello={activa === "todas"}
                    abierta={abierta === m.id}
                    onTocar={() => setAbierta(abierta === m.id ? null : m.id)}
                  />
                ) : null,
              )}
            </div>
          ))}
        </div>
      )}
      {aviso}
    </div>
  );
}
