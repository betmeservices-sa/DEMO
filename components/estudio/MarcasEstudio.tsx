"use client";

// Las marcas: el perfil que el motor lee antes de escribir (tono, servicios,
// ofertas, palabras que no se usan, colores, el botón de sus anuncios), las
// cuentas donde publica, el avatar y la voz con su consentimiento, y cuántos
// créditos de su plan del mes lleva usados.

import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { AlertTriangle, Copy, Plus, RefreshCw, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { actualizarMarca, conectarRed, useEstudio, useMarcaActiva } from "@/lib/estudio/store";
import { fechaCorta } from "@/lib/estudio/fechas";
import { creditosTotal } from "@/lib/estudio/generador";
import type { Marca, Red } from "@/lib/estudio/tipos";
import { Desplegable } from "@/components/ui/Desplegable";
import { Boton, Cabecera, IconoRed, MarcaSello, NOMBRE_RED, Vidrio, creditos, useAviso } from "./ui";
import { BarraPlan, usoDelMes } from "./CreditosEstudio";

const REDES: Red[] = ["instagram", "facebook", "tiktok", "linkedin", "google", "youtube"];

const ZONAS = [
  { valor: "America/New_York", etiqueta: "Miami / Nueva York" },
  { valor: "America/Chicago", etiqueta: "Chicago / Houston" },
  { valor: "America/Los_Angeles", etiqueta: "Los Ángeles" },
  { valor: "America/El_Salvador", etiqueta: "San Salvador" },
];

// Lo que se edita en el formulario. Las cuentas y el avatar se cambian aparte,
// en el momento, porque no dependen de "Guardar".
type Borrador = Pick<
  Marca,
  "rubro" | "ciudad" | "zonaHoraria" | "idiomas" | "tono" | "servicios" | "ofertas" | "palabrasProhibidas" | "colores" | "cta"
>;

function borradorDe(m: Marca): Borrador {
  return {
    rubro: m.rubro,
    ciudad: m.ciudad,
    zonaHoraria: m.zonaHoraria,
    idiomas: { ...m.idiomas },
    tono: m.tono,
    servicios: [...m.servicios],
    ofertas: [...m.ofertas],
    palabrasProhibidas: [...m.palabrasProhibidas],
    colores: [...m.colores],
    cta: { ...m.cta },
  };
}

const campo =
  "w-full rounded-[12px] border border-[var(--border)] bg-black/25 px-3 py-2 text-[13.5px] text-[var(--text)] outline-none transition placeholder:text-[var(--text-3)] focus:border-[var(--es-acento)]";

function Etiqueta({ texto, children }: { texto: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-[var(--text-3)]">{texto}</span>
      {children}
    </label>
  );
}

function Chips({
  valores,
  onCambio,
  agregar,
  rojo = false,
}: {
  valores: string[];
  onCambio: (v: string[]) => void;
  agregar: string;
  rojo?: boolean;
}) {
  const [nuevo, setNuevo] = useState("");
  function sumar() {
    const v = nuevo.trim();
    if (!v || valores.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    onCambio([...valores, v]);
    setNuevo("");
  }
  function tecla(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      sumar();
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {valores.map((v) => (
        <span
          key={v}
          className={cn(
            "inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-1 text-[12.5px] font-medium",
            rojo ? "bg-[rgba(255,107,107,0.12)] text-[#ff9b9b]" : "bg-white/[0.07] text-[var(--text)]",
          )}
        >
          {v}
          <button
            type="button"
            aria-label={`Quitar ${v}`}
            onClick={() => onCambio(valores.filter((x) => x !== v))}
            className="flex h-5 w-5 items-center justify-center rounded-full opacity-60 transition hover:bg-white/10 hover:opacity-100"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <span className="inline-flex items-center rounded-full border border-dashed border-[var(--border-2)] pl-3 pr-1">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={tecla}
          placeholder={agregar}
          aria-label={agregar}
          className="w-[150px] bg-transparent py-1 text-[12.5px] text-[var(--text)] outline-none placeholder:text-[var(--text-3)]"
        />
        <button
          type="button"
          onClick={sumar}
          aria-label={agregar}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-2)] transition hover:bg-white/10 hover:text-[var(--text)]"
        >
          <Plus size={13} />
        </button>
      </span>
    </div>
  );
}

function TarjetaMarca({ marca, usados, elegida, onElegir }: { marca: Marca; usados: number; elegida: boolean; onElegir: () => void }) {
  return (
    <button
      type="button"
      onClick={onElegir}
      aria-pressed={elegida}
      className={cn(
        "es-vidrio group w-[250px] shrink-0 overflow-hidden rounded-[22px] text-left transition lg:w-full",
        elegida ? "ring-2 ring-[var(--es-acento)]" : "hover:-translate-y-0.5",
      )}
    >
      <div className="relative h-[92px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={marca.portada} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        <span className="absolute inset-0 bg-gradient-to-t from-[#14223c] via-[#14223c]/30 to-transparent" />
        <MarcaSello marca={marca} size={34} className="absolute bottom-2 left-3" />
      </div>
      <div className="px-3.5 pb-3.5 pt-2">
        <p className="truncate text-[14px] font-semibold">{marca.nombre}</p>
        <p className="truncate text-[12px] text-[var(--text-3)]">
          {marca.rubro} · {marca.ciudad}
        </p>
        <div className="mt-2.5 flex items-center justify-between text-[12px]">
          <span className="rounded-full bg-white/[0.07] px-2 py-0.5 font-semibold text-[var(--text-2)]">{marca.plan}</span>
          <span className="es-rotulo text-[15px] font-semibold" title="Créditos usados este mes">
            {creditos(usados)}
            <span className="text-[var(--text-3)]">/{creditos(marca.creditosPlan)}</span>
          </span>
        </div>
      </div>
    </button>
  );
}

function Cuentas({ marca, avisar }: { marca: Marca; avisar: (t: string) => void }) {
  return (
    <ul className="divide-y divide-[var(--border)]">
      {REDES.map((r) => {
        const c = marca.redes.find((x) => x.red === r);
        const estado = c?.estado ?? "sin_conectar";
        return (
          <li key={r} className="flex items-center gap-3 py-2.5">
            <IconoRed red={r} size={30} apagado={estado === "sin_conectar"} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold">{NOMBRE_RED[r]}</p>
              <p className={cn("truncate text-[12px]", estado === "vencida" ? "text-[var(--es-rojo)]" : "text-[var(--text-3)]")}>
                {estado === "sin_conectar" ? "Sin conectar" : estado === "vencida" ? `${c?.cuenta}: la sesión venció` : c?.cuenta}
              </p>
            </div>
            {estado === "conectada" && <span className="h-2.5 w-2.5 rounded-full bg-[var(--es-verde)] shadow-[0_0_10px_rgba(61,214,140,0.6)]" />}
            {estado !== "conectada" && (
              <Boton
                variante={estado === "vencida" ? "peligro" : "vidrio"}
                className="h-8 px-3 text-[12px]"
                onClick={() => {
                  conectarRed(marca.id, r);
                  avisar(`${NOMBRE_RED[r]} ${estado === "vencida" ? "reconectado" : "conectado"}.`);
                }}
              >
                {estado === "vencida" && <RefreshCw size={12} />}
                {estado === "vencida" ? "Reconectar" : "Conectar"}
              </Boton>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function AvatarVoz({ marca }: { marca: Marca }) {
  const a = marca.avatar;
  if (!a) {
    return <p className="py-4 text-[13px] text-[var(--text-3)]">Esta marca no tiene avatar ni voz. Sus piezas salen sin video.</p>;
  }
  const sinFirma = a.tipo === "clon" && !a.consentimiento;
  return (
    <div className="flex gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a.foto} alt={a.nombre} className="h-[150px] w-[92px] shrink-0 rounded-[16px] object-cover" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div>
          <p className="text-[14px] font-semibold">{a.nombre}</p>
          <p className="text-[12.5px] text-[var(--text-3)]">{a.tipo === "clon" ? "Clon de la persona real" : "Presentador de marca, sin cara propia"}</p>
        </div>
        <dl className="grid grid-cols-[52px_1fr] gap-x-2 gap-y-1 text-[12px]">
          <dt className="text-[var(--text-3)]">Voz</dt>
          <dd className="truncate">{a.vozNombre}</dd>
          <dt className="text-[var(--text-3)]">Avatar</dt>
          <dd className="truncate text-[var(--text-2)]">{a.avatarId}</dd>
          <dt className="text-[var(--text-3)]">Voz id</dt>
          <dd className="truncate text-[var(--text-2)]">{a.vozId}</dd>
        </dl>
        {a.consentimiento && (
          <p className="flex items-start gap-1.5 rounded-[12px] bg-[rgba(61,214,140,0.1)] px-2.5 py-2 text-[12px] text-[#8ee8b8]">
            <ShieldCheck size={14} className="mt-px shrink-0" />
            Firmó {a.consentimiento.quien} el {fechaCorta(a.consentimiento.firmado)}
          </p>
        )}
        {sinFirma && (
          <p className="flex items-start gap-1.5 rounded-[12px] bg-[rgba(255,107,107,0.12)] px-2.5 py-2 text-[12px] text-[var(--es-rojo)]">
            <AlertTriangle size={14} className="mt-px shrink-0" />
            Falta el consentimiento firmado. Sin él no se arma ningún video con su cara ni su voz.
          </p>
        )}
      </div>
    </div>
  );
}

function Perfil({ marca, usados, avisar }: { marca: Marca; usados: number; avisar: (t: string) => void }) {
  // El borrador vive mientras se ve esta marca (el padre lo monta con key).
  // Conectar una cuenta cambia la marca pero no toca lo que se está editando.
  const [b, setB] = useState<Borrador>(() => borradorDe(marca));
  const cambiado = JSON.stringify(b) !== JSON.stringify(borradorDe(marca));
  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setB((x) => ({ ...x, [k]: v }));

  function guardar() {
    actualizarMarca({ ...marca, ...b });
    avisar(`Perfil de ${marca.nombre} guardado.`);
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(marca.ubicacionId);
      avisar("Subcuenta copiada.");
    } catch {
      avisar(marca.ubicacionId);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Vidrio className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={marca.portada} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <span className="absolute inset-0 bg-gradient-to-t from-[#162440] via-[#162440]/80 to-[#162440]/10" />
        <div className="relative flex flex-wrap items-end gap-x-4 gap-y-3 px-5 pb-5 pt-20">
          <MarcaSello marca={{ ...marca, colores: b.colores }} size={56} className="relative ring-4 ring-[#162440]" />
          <div className="min-w-0 flex-1">
            <p className="es-rotulo text-[26px] font-semibold leading-none sm:text-[30px]">{marca.nombre}</p>
            <button
              type="button"
              onClick={() => void copiar()}
              className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-[var(--text-3)] transition hover:text-[var(--text)]"
              title="Copiar"
            >
              Subcuenta {marca.ubicacionId}
              <Copy size={11} />
            </button>
          </div>
          <div className="flex basis-full justify-end gap-2 sm:basis-auto">
            {cambiado && (
              <Boton variante="fantasma" onClick={() => setB(borradorDe(marca))}>
                Descartar
              </Boton>
            )}
            <Boton variante="primario" disabled={!cambiado} onClick={guardar}>
              Guardar
            </Boton>
          </div>
        </div>
      </Vidrio>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Vidrio className="p-4 lg:p-5">
          <Cabecera titulo="Perfil" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Etiqueta texto="Rubro">
              <input className={campo} value={b.rubro} onChange={(e) => set("rubro", e.target.value)} />
            </Etiqueta>
            <Etiqueta texto="Ciudad">
              <input className={campo} value={b.ciudad} onChange={(e) => set("ciudad", e.target.value)} />
            </Etiqueta>
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-[12px] font-medium text-[var(--text-3)]">Hora de su público</span>
              <Desplegable
                valor={b.zonaHoraria}
                onChange={(v) => set("zonaHoraria", v)}
                etiquetaAria="Zona horaria"
                opciones={ZONAS}
              />
            </div>
            <div className="sm:col-span-2">
              <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
                <span className="font-medium text-[var(--text-3)]">Idiomas del contenido</span>
                <span className="es-rotulo text-[15px] font-semibold">
                  ES {b.idiomas.es}% <span className="text-[var(--text-3)]">/</span> EN {b.idiomas.en}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={b.idiomas.es}
                aria-label="Porcentaje en español"
                onChange={(e) => {
                  const es = Number(e.target.value);
                  set("idiomas", { es, en: 100 - es });
                }}
                className="w-full accent-[var(--es-acento)]"
              />
            </div>
          </div>
          <div className="mt-4">
            <Etiqueta texto="Tono">
              <textarea className={cn(campo, "min-h-[84px] resize-y leading-relaxed")} value={b.tono} onChange={(e) => set("tono", e.target.value)} />
            </Etiqueta>
          </div>
          <div className="mt-4">
            <span className="mb-1.5 block text-[12px] font-medium text-[var(--text-3)]">Colores</span>
            <div className="flex items-center gap-2">
              {b.colores.map((c, i) => (
                <label
                  key={i}
                  className="relative h-10 w-10 cursor-pointer overflow-hidden rounded-[12px] ring-1 ring-white/15 focus-within:ring-2 focus-within:ring-[var(--es-acento)]"
                  style={{ background: c }}
                  title={c}
                >
                  <input
                    type="color"
                    value={c}
                    aria-label={`Color ${i + 1}`}
                    onChange={(e) => set("colores", b.colores.map((x, j) => (j === i ? e.target.value : x)))}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
              ))}
              <span className="ml-1 text-[12px] uppercase text-[var(--text-3)]">{b.colores.join("  ")}</span>
            </div>
          </div>
        </Vidrio>

        <Vidrio className="p-4 lg:p-5">
          <Cabecera titulo="Lo que el motor sabe" />
          <div className="space-y-4">
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-[var(--text-3)]">Servicios</span>
              <Chips valores={b.servicios} onCambio={(v) => set("servicios", v)} agregar="Agregar servicio" />
            </div>
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-[var(--text-3)]">Ofertas vigentes</span>
              <Chips valores={b.ofertas} onCambio={(v) => set("ofertas", v)} agregar="Agregar oferta" />
            </div>
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-[var(--text-3)]">Nunca escribir</span>
              <Chips valores={b.palabrasProhibidas} onCambio={(v) => set("palabrasProhibidas", v)} agregar="Agregar frase" rojo />
            </div>
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-[var(--text-3)]">Botón de sus anuncios</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["es", "en"] as const).map((idioma) => (
                  <label key={idioma} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-[11px] font-semibold uppercase text-[var(--text-3)]">{idioma}</span>
                    <input
                      className={campo}
                      value={b.cta[idioma]}
                      maxLength={28}
                      aria-label={`Botón de anuncios en ${idioma === "es" ? "español" : "inglés"}`}
                      onChange={(e) => set("cta", { ...b.cta, [idioma]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Vidrio>

        <Vidrio className="p-4 lg:p-5">
          <Cabecera titulo="Cuentas" />
          <Cuentas marca={marca} avisar={avisar} />
        </Vidrio>

        <div className="flex flex-col gap-4">
          <Vidrio className="p-4 lg:p-5">
            <Cabecera titulo="Avatar y voz" />
            <AvatarVoz marca={marca} />
          </Vidrio>
          <Vidrio className="p-4 lg:p-5">
            <Cabecera titulo="Créditos del mes" detalle={`Plan ${marca.plan}: ${creditos(marca.creditosPlan)} al mes`} />
            <p className="es-rotulo text-[40px] font-semibold leading-none">
              {creditos(usados)}
              <span className="text-[24px] text-[var(--text-3)]"> / {creditos(marca.creditosPlan)}</span>
            </p>
            <BarraPlan usados={usados} plan={marca.creditosPlan} className="mt-3" />
            <p className="mt-2 text-[12px] text-[var(--text-3)]">
              {usados >= marca.creditosPlan
                ? `Se pasó del plan por ${creditos(usados - marca.creditosPlan)} créditos.`
                : `Le quedan ${creditos(marca.creditosPlan - usados)} créditos este mes.`}
            </p>
          </Vidrio>
        </div>
      </div>
    </div>
  );
}

export function MarcasEstudio() {
  const { marcas, uso } = useEstudio();
  const activa = useMarcaActiva();
  const [elegida, setElegida] = useState(activa !== "todas" ? activa : marcas[0]?.id);
  const [aviso, avisar] = useAviso();

  // El selector de marca de arriba manda: si se cambia allá, se abre esa.
  useEffect(() => {
    if (activa !== "todas") setElegida(activa);
  }, [activa]);

  const usados = useMemo(() => {
    const delMes = usoDelMes(uso);
    const n: Record<string, number> = {};
    for (const m of marcas) n[m.id] = creditosTotal(delMes.filter((u) => u.marcaId === m.id));
    return n;
  }, [uso, marcas]);

  const marca = marcas.find((m) => m.id === elegida) ?? marcas[0];
  if (!marca) return null;

  return (
    <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {marcas.map((m) => (
          <TarjetaMarca key={m.id} marca={m} usados={usados[m.id] ?? 0} elegida={m.id === marca.id} onElegir={() => setElegida(m.id)} />
        ))}
      </div>
      <Perfil key={marca.id} marca={marca} usados={usados[marca.id] ?? 0} avisar={avisar} />
      {aviso}
    </div>
  );
}
