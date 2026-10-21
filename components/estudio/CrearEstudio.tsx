"use client";

// Crear: el encargo en palabras, la marca, cuánto y en qué idioma. El motor
// escribe con el perfil de la marca (tono, servicios, ofertas, palabras que
// no usa) y lo que sale va directo a la cola de aprobación.
//
// Se puede llegar con todo puesto desde la biblioteca o el calendario:
// /estudio/crear?marca=<id>&foto=<url>&texto=<...>

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Clapperboard, ImageIcon, Layers, Sparkles, WandSparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { deMarca, useEstudio, useMarcaActiva } from "@/lib/estudio/store";
import { generar } from "@/lib/estudio/api";
import { haceCuanto } from "@/lib/estudio/fechas";
import { CUANTAS, idiomaDe } from "@/lib/estudio/generador";
import type { Idioma, Marca, Pieza, Plantilla, Red } from "@/lib/estudio/tipos";
import { Boton, Cabecera, EstadoPill, IconoRed, MarcaSello, Miniatura, NOMBRE_RED, RedesFila, TIPO, Vidrio, useAviso } from "./ui";

const PLANTILLAS: { id: Plantilla; texto: string; detalle: string }[] = [
  { id: "pieza", texto: "Una pieza", detalle: "Un post" },
  { id: "semana", texto: "Semana", detalle: `${CUANTAS.semana} piezas` },
  { id: "mes", texto: "Mes", detalle: `${CUANTAS.mes} piezas` },
  { id: "guion", texto: "Guion de video", detalle: "Con su avatar" },
];

// Un encargo de ejemplo por marca, como lo escribiría quien la lleva.
const EJEMPLO: Record<string, string> = {
  solano:
    "Semana de contenido: el antes y después de la fachada en Coral Gables, por qué se pela la pintura exterior y la oferta de 10% en exteriores. Mitad en inglés.",
  keystone:
    "Posts para después de la tormenta: qué revisar en el techo, la inspección gratis y el financiamiento a 18 meses. Tono tranquilo, sin asustar.",
  casanova:
    "Contenido de noviembre: la cocina terminada en Doral, el baño antes y después y la oferta de 15% en encimeras de cuarzo.",
  betme: "Posts para LinkedIn sobre asistentes virtuales bilingües y el cierre de mes sin perder el fin de semana.",
};

const ETIQUETA_PLANTILLA: Record<Plantilla, string> = {
  pieza: "Una pieza",
  semana: "Semana",
  mes: "Mes",
  guion: "Guion de video",
};

function ejemploDe(m: Marca): string {
  return EJEMPLO[m.id] ?? `Posts sobre ${m.servicios.slice(0, 2).join(" y ").toLowerCase()} con la oferta del mes.`;
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
  const [texto, setTexto] = useState("");
  const [plantilla, setPlantilla] = useState<Plantilla>("semana");
  const [es, setEs] = useState(marca.idiomas.es);
  const [idiomaUno, setIdiomaUno] = useState<Idioma>(marca.idiomas.es >= 50 ? "es" : "en");
  const [redes, setRedes] = useState<Red[]>([]);
  const [foto, setFoto] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  const disponibles = marca.redes.filter((r) => r.estado !== "sin_conectar");

  // Otra marca: su reparto de idiomas y todas sus redes encendidas.
  useEffect(() => {
    setEs(marca.idiomas.es);
    setIdiomaUno(marca.idiomas.es >= 50 ? "es" : "en");
    setRedes(marca.redes.filter((r) => r.estado !== "sin_conectar").map((r) => r.red));
  }, [marca]);

  // Lo que viene en la URL (desde la biblioteca o el calendario).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get("texto");
    const f = q.get("foto");
    if (t) setTexto(t);
    if (f) {
      setFoto(f);
      setPlantilla("pieza");
    }
  }, []);

  const unaSola = plantilla === "pieza" || plantilla === "guion";
  const idiomas: Record<Idioma, number> = unaSola
    ? idiomaUno === "es"
      ? { es: 100, en: 0 }
      : { es: 0, en: 100 }
    : { es, en: 100 - es };

  async function lanzar() {
    if (!texto.trim() || generando) return;
    if (!redes.length) {
      avisar("Elige al menos una red.", "error");
      return;
    }
    setGenerando(true);
    try {
      const piezas = await generar({
        marca,
        texto: texto.trim(),
        plantilla,
        idiomas,
        redes,
        fotos: foto ? [foto] : undefined,
      });
      if (!piezas.length) {
        avisar(`${marca.nombre} todavía no tiene ${plantilla === "guion" ? "avatar para video" : "ese formato"}.`, "error");
      } else {
        onListo(piezas);
        setFoto(null);
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

      {/* El encargo */}
      <div className="es-hueco rounded-[20px] p-1.5 focus-within:border-[rgba(255,122,26,0.45)]">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void lanzar();
          }}
          rows={5}
          aria-label="Qué contenido necesitas"
          placeholder={ejemploDe(marca)}
          className="block w-full resize-none bg-transparent px-3.5 pb-2 pt-3 text-[16px] leading-[1.5] lg:text-[17px] text-[var(--text)] outline-none placeholder:text-[var(--text-3)]"
        />
        <div className="flex flex-wrap items-center gap-2 px-2 pb-1.5">
          {foto ? (
            <span className="flex items-center gap-2 rounded-[12px] bg-white/[0.06] p-1 pr-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto} alt="" className="h-10 w-10 rounded-[8px] object-cover" />
              <span className="text-[12px] text-[var(--text-2)]">Sobre esta foto</span>
              <button type="button" aria-label="Quitar la foto" onClick={() => setFoto(null)} className="text-[var(--text-3)] hover:text-[var(--text)]">
                <X size={14} />
              </button>
            </span>
          ) : (
            <Link
              href="/estudio/biblioteca"
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] text-[var(--text-3)] transition hover:bg-white/[0.05] hover:text-[var(--text-2)]"
            >
              <ImageIcon size={14} /> Usar una foto de obra
            </Link>
          )}
          {!texto && (
            <button
              type="button"
              onClick={() => setTexto(ejemploDe(marca))}
              className="ml-auto rounded-full px-2.5 py-1 text-[12px] text-[var(--text-3)] transition hover:bg-white/[0.05] hover:text-[var(--text-2)]"
            >
              Usar el ejemplo
            </button>
          )}
        </div>
      </div>

      {/* Cuánto, idioma y dónde */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {PLANTILLAS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlantilla(p.id)}
              aria-pressed={plantilla === p.id}
              disabled={p.id === "guion" && !marca.avatar}
              className={cn(
                "rounded-[16px] px-3 py-2.5 text-left transition disabled:opacity-40",
                plantilla === p.id ? "bg-[rgba(255,122,26,0.12)] ring-1 ring-[rgba(255,122,26,0.5)]" : "es-hueco hover:border-[var(--border-2)]",
              )}
            >
              <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold">
                {p.id === "guion" ? <Clapperboard size={14} /> : p.id !== "pieza" ? <Layers size={14} /> : null}
                {p.texto}
              </span>
              <span className="mt-0.5 block text-[11.5px] text-[var(--text-3)]">{p.detalle}</span>
            </button>
          ))}
        </div>

        <div className="es-hueco flex flex-col justify-center rounded-[16px] px-4 py-2.5">
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
              <span className="flex items-baseline justify-between">
                <span className="es-rotulo text-[20px] font-semibold">
                  ES {es}
                  <span className="text-[var(--text-3)]"> / </span>
                  EN {100 - es}
                </span>
                <span className="text-[11.5px] text-[var(--text-3)]">
                  {/* El mismo reparto que hace el motor: las de español se redondean hacia abajo. */}
                  {enEspanol(CUANTAS[plantilla], es)} en español y {CUANTAS[plantilla] - enEspanol(CUANTAS[plantilla], es)} en inglés
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
                className="mt-1.5 w-full accent-[var(--es-naranja)]"
              />
            </label>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
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
                <span className="hidden sm:inline">{NOMBRE_RED[r.red]}</span>
                {r.estado === "vencida" && <span className="h-1.5 w-1.5 rounded-full bg-[var(--es-rojo)]" />}
              </button>
            );
          })}
        </div>
        <Boton variante="primario" onClick={() => void lanzar()} disabled={!texto.trim() || generando} className="ml-auto h-11 px-6 text-[14px]">
          <WandSparkles size={17} />
          {generando ? "Generando" : "Generar"}
        </Boton>
      </div>

      <AnimatePresence>{generando && <Escribiendo marca={marca} n={CUANTAS[plantilla]} guion={plantilla === "guion"} />}</AnimatePresence>
    </Vidrio>
  );
}

/** El momento de espera: los huecos de las piezas que vienen, con un barrido de luz. */
function Escribiendo({ marca, n, guion }: { marca: Marca; n: number; guion: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <p className="mt-5 flex items-center gap-2 text-[13px] text-[var(--text-2)]">
        <Sparkles size={15} className="text-[var(--es-violeta)]" />
        {guion ? "Escribiendo el guion" : `Escribiendo ${n === 1 ? "la pieza" : `${n} piezas`}`} con el tono de {marca.nombre}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {Array.from({ length: Math.min(n, 6) }, (_, i) => (
          <div key={i} className="es-hueco relative aspect-[4/5] overflow-hidden rounded-[14px]">
            <motion.span
              className="absolute inset-y-0 w-1/2"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,160,90,0.14), transparent)" }}
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
  const { piezas: todas } = useEstudio();
  // Lo que el store tiene ahora (si ya se aprobó alguna desde otra pantalla).
  const vivas = piezas.map((p) => todas.find((x) => x.id === p.id) ?? p);
  return (
    <Vidrio className="p-4 lg:p-5">
      <Cabecera
        titulo={`${vivas.length} ${vivas.length === 1 ? "pieza lista" : "piezas listas"} para revisar`}
        detalle={marca.nombre}
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
              <Miniatura pieza={p} marca={marca} forma="post" className="transition group-hover:-translate-y-0.5" />
              <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug">{p.titulo}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <RedesFila redes={p.redes} size={16} />
                <span className="rounded-[5px] bg-white/[0.07] px-1 text-[10.5px] font-semibold uppercase text-[var(--text-2)]">{p.idioma}</span>
                <span className="text-[11px] text-[var(--text-3)]">{TIPO[p.tipo]}</span>
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
                    <span className="font-semibold text-[var(--text-2)]">{ETIQUETA_PLANTILLA[enc.plantilla]}</span>
                    <span>
                      {enc.actor} · {haceCuanto(enc.creado)}
                    </span>
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="es-rotulo text-[18px] font-semibold leading-none">
                      {suyas.length}
                      <span className="ml-1 font-sans text-[11.5px] font-normal text-[var(--text-3)]">{suyas.length === 1 ? "pieza" : "piezas"}</span>
                    </span>
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
    <div className="mx-auto grid max-w-[1500px] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
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
