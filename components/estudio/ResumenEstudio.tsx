"use client";

// El resumen: lo que sale esta semana (la tira de piezas reales es lo primero
// que se ve), lo que espera un sí, cómo va cada marca contra su plan, los
// videos que se están armando, lo gastado y el estado de las cuentas.

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { conectarRed, deMarca, reintentar, useEstudio, useMarcaActiva } from "@/lib/estudio/store";
import { aprobarPieza } from "@/lib/estudio/api";
import { diaDe, fechaCorta, horaDe, localSV, lunesDe, nombreDia, numeroDia, sumarDias } from "@/lib/estudio/fechas";
import { avanceRender, costoPorServicio, costoTotal, porHora } from "@/lib/estudio/generador";
import type { EtapaRender, Marca, Pieza, Red, Servicio } from "@/lib/estudio/tipos";
import {
  Boton,
  Cabecera,
  IconoRed,
  MarcaSello,
  Miniatura,
  NOMBRE_RED,
  Vidrio,
  dinero,
  useAhora,
  useAviso,
} from "./ui";

const REDES_ORDEN: Red[] = ["instagram", "facebook", "tiktok", "linkedin", "google", "youtube"];

function Semana({ piezas, marcas, hoy }: { piezas: Pieza[]; marcas: Marca[]; hoy: string }) {
  const lunes = lunesDe(hoy);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const marcaDe = (id: string) => marcas.find((m) => m.id === id);
  const total = piezas.filter((p) => p.programadaPara && dias.includes(diaDe(p.programadaPara))).length;

  return (
    <Vidrio className="p-4 lg:p-5">
      <Cabecera
        titulo="Esta semana"
        detalle={`${total} publicaciones del ${numeroDia(lunes)} al ${fechaCorta(dias[6]).replace(/^\S+ /, "")}`}
        accion={
          <Link href="/estudio/calendario" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--text-2)] hover:text-[var(--text)]">
            Calendario
            <ArrowUpRight size={14} />
          </Link>
        }
      />
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="grid min-w-[760px] grid-cols-7 gap-2">
          {dias.map((dia) => {
            const esHoy = dia === hoy;
            const pasado = dia < hoy;
            const delDia = piezas.filter((p) => p.programadaPara && diaDe(p.programadaPara) === dia).sort(porHora);
            return (
              <div
                key={dia}
                className={cn(
                  "flex min-h-[260px] flex-col gap-2 rounded-[18px] p-1.5",
                  esHoy ? "bg-[rgba(255,122,26,0.09)] ring-1 ring-[rgba(255,122,26,0.35)]" : "es-hueco",
                )}
              >
                <div className="flex items-baseline justify-between px-1.5 pt-1">
                  <span className={cn("text-[12px] font-medium capitalize", esHoy ? "text-[var(--es-naranja)]" : "text-[var(--text-3)]")}>
                    {esHoy ? "Hoy" : nombreDia(dia)}
                  </span>
                  <span className={cn("es-rotulo text-[22px] font-semibold leading-none", pasado ? "text-[var(--text-3)]" : "text-[var(--text)]")}>
                    {numeroDia(dia)}
                  </span>
                </div>
                {delDia.map((p) => {
                  const m = marcaDe(p.marcaId);
                  return (
                    <Link
                      key={p.id}
                      href={`/estudio/calendario?pieza=${p.id}`}
                      className={cn(
                        "group relative block overflow-hidden rounded-[14px] transition hover:-translate-y-0.5",
                        p.estado === "fallida" && "ring-2 ring-[var(--es-rojo)]",
                      )}
                    >
                      <Miniatura pieza={p} marca={m} sinTexto className="aspect-[16/11] rounded-[14px]" />
                      <span className="absolute inset-0 rounded-[14px] bg-gradient-to-b from-black/55 via-transparent to-black/60" />
                      <span className="es-rotulo absolute left-2 top-1.5 text-[15px] font-semibold text-white">
                        {horaDe(p.programadaPara!)}
                      </span>
                      {m && <MarcaSello marca={m} size={20} className="absolute right-1.5 top-1.5" />}
                      <span className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-0.5">
                          {p.redes.slice(0, 4).map((r) => (
                            <IconoRed key={r} red={r} size={15} />
                          ))}
                        </span>
                        {p.estado === "publicada" && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--es-verde)]">
                            <Check size={11} strokeWidth={3} className="text-[#062814]" />
                          </span>
                        )}
                        {p.estado === "fallida" && <AlertTriangle size={15} className="text-[var(--es-rojo)]" />}
                      </span>
                    </Link>
                  );
                })}
                {!delDia.length && !pasado && (
                  <Link
                    href="/estudio/calendario"
                    className="mt-auto flex h-16 items-center justify-center rounded-[14px] border border-dashed border-[var(--border)] text-[12px] text-[var(--text-3)] transition hover:border-[var(--border-2)] hover:text-[var(--text-2)]"
                  >
                    Libre
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Vidrio>
  );
}

function PorAprobar({ piezas, marcas, avisar }: { piezas: Pieza[]; marcas: Marca[]; avisar: (t: string, tono?: "ok" | "error") => void }) {
  const cola = piezas.filter((p) => p.estado === "por_aprobar").sort((a, b) => b.creada.localeCompare(a.creada));
  const [ocupada, setOcupada] = useState<string | null>(null);

  async function aprobarYa(p: Pieza) {
    const m = marcas.find((x) => x.id === p.marcaId);
    if (!m) return;
    setOcupada(p.id);
    try {
      await aprobarPieza(p, m);
      avisar(p.tipo === "video" && p.fase === "guion" ? "Guion aprobado. El video se está armando." : "Aprobada.");
    } catch (e) {
      avisar((e as Error).message, "error");
    } finally {
      setOcupada(null);
    }
  }

  return (
    <Vidrio className="flex flex-col p-4 lg:p-5">
      <Cabecera
        titulo="Esperan tu sí"
        detalle={cola.length ? `${cola.length} en la cola` : undefined}
        accion={
          cola.length > 3 ? (
            <Link href="/estudio/aprobacion" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--text-2)] hover:text-[var(--text)]">
              Ver todas
              <ArrowUpRight size={14} />
            </Link>
          ) : undefined
        }
      />
      {cola.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
          <p className="text-[13px] text-[var(--text-2)]">La cola está vacía.</p>
          <Link href="/estudio/crear" className="es-primario rounded-full px-4 py-2 text-[13px] font-semibold">
            Crear contenido
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {cola.slice(0, 4).map((p) => {
            const m = marcas.find((x) => x.id === p.marcaId);
            return (
              <li key={p.id} className="es-hueco flex items-center gap-3 rounded-[16px] p-2">
                <Link href={`/estudio/aprobacion?pieza=${p.id}`} className="w-14 shrink-0">
                  <Miniatura pieza={p} marca={m} sinTexto className="rounded-[10px]" />
                </Link>
                <Link href={`/estudio/aprobacion?pieza=${p.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{p.titulo}</span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11.5px] text-[var(--text-3)]">
                    {m && <MarcaSello marca={m} size={14} />}
                    <span className="min-w-0 truncate">
                      {p.tipo === "video" ? (p.fase === "guion" ? "Guion de video" : "Video listo") : m?.nombre}
                    </span>
                    <span className="shrink-0 rounded-full border border-[var(--border)] px-1.5 text-[10px] font-semibold uppercase leading-[16px]">
                      {p.idioma}
                    </span>
                  </span>
                </Link>
                <Boton
                  variante="vidrio"
                  className="h-8 shrink-0 px-3 text-[12px]"
                  disabled={ocupada === p.id}
                  onClick={() => void aprobarYa(p)}
                >
                  {ocupada === p.id ? "…" : "Aprobar"}
                </Boton>
              </li>
            );
          })}
        </ul>
      )}
    </Vidrio>
  );
}

function Cifras({ piezas, gasto, generadasMes }: { piezas: Pieza[]; gasto: number; generadasMes: number }) {
  const ahora = localSV();
  const hoy = diaDe(ahora);
  const mes = hoy.slice(0, 7);
  const en7 = sumarDias(hoy, 7);
  const publicadas = piezas.filter((p) => (p.estado === "publicada" || p.estado === "fallida") && p.programadaPara?.startsWith(mes)).length;
  const proximas = piezas.filter(
    (p) => p.estado === "programada" && p.programadaPara && p.programadaPara >= ahora && diaDe(p.programadaPara) < en7,
  ).length;
  const sinFecha = piezas.filter((p) => p.estado === "aprobada" && !(p.tipo === "video" && p.fase === "guion")).length;
  const items = [
    { cifra: String(publicadas), texto: "publicadas este mes" },
    { cifra: String(proximas), texto: "programadas en 7 días" },
    { cifra: String(sinFecha), texto: "aprobadas sin fecha" },
    { cifra: dinero(generadasMes ? gasto / generadasMes : 0), texto: "por pieza este mes" },
  ];
  return (
    <Vidrio className="grid grid-cols-2 lg:grid-cols-4">
      {items.map((it, i) => (
        <div
          key={it.texto}
          className={cn(
            "px-5 py-4",
            i % 2 === 1 && "border-l border-[var(--border)]",
            i >= 2 && "border-t border-[var(--border)] lg:border-t-0",
            i === 2 && "lg:border-l",
          )}
        >
          <p className="es-rotulo text-[40px] font-semibold leading-none tracking-[-0.01em]">{it.cifra}</p>
          <p className="mt-1.5 text-[12.5px] text-[var(--text-3)]">{it.texto}</p>
        </div>
      ))}
    </Vidrio>
  );
}

function RitmoPlan({ piezas, marcas }: { piezas: Pieza[]; marcas: Marca[] }) {
  const mes = diaDe(localSV()).slice(0, 7);
  return (
    <Vidrio className="p-4 lg:p-5">
      <Cabecera titulo="Plan del mes" detalle="Piezas en el calendario contra lo contratado" />
      <ul className="space-y-3.5">
        {marcas.map((m) => {
          const n = piezas.filter(
            (p) => p.marcaId === m.id && p.programadaPara?.startsWith(mes) && p.estado !== "rechazada",
          ).length;
          const pct = Math.min(100, Math.round((n / m.piezasPlan) * 100));
          return (
            <li key={m.id}>
              <div className="mb-1.5 flex items-center gap-2">
                <MarcaSello marca={m} size={20} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{m.nombre}</span>
                <span className="es-rotulo text-[16px] font-semibold">
                  {n}
                  <span className="text-[var(--text-3)]">/{m.piezasPlan}</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: m.colores[0] }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Vidrio>
  );
}

const ETAPAS: { id: Exclude<EtapaRender, "listo" | "fallo">; texto: string }[] = [
  { id: "voz", texto: "Voz" },
  { id: "avatar", texto: "Avatar" },
  { id: "edicion", texto: "Subtítulos y logo" },
];

function VideosEnCurso({ marcas }: { marcas: Marca[] }) {
  const { trabajos, piezas } = useEstudio();
  const activa = useMarcaActiva();
  const ahora = useAhora(1000);
  const enCurso = deMarca(trabajos, activa).filter((t) => avanceRender(t, ahora).etapa !== "listo" && t.etapa !== "fallo");

  return (
    <Vidrio className="p-4 lg:p-5">
      <Cabecera
        titulo="Videos armándose"
        accion={
          <Link href="/estudio/videos" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--text-2)] hover:text-[var(--text)]">
            Videos
            <ArrowUpRight size={14} />
          </Link>
        }
      />
      {enCurso.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--text-3)]">Ninguno en este momento.</p>
      ) : (
        <ul className="space-y-4">
          {enCurso.map((t) => {
            const p = piezas.find((x) => x.id === t.piezaId);
            const m = marcas.find((x) => x.id === t.marcaId);
            const a = avanceRender(t, ahora);
            const restanSeg = Math.max(0, Math.round((1 - a.total) * t.duracionSeg));
            return (
              <li key={t.id} className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m?.avatar?.foto} alt="" className="h-[68px] w-[44px] shrink-0 rounded-[10px] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{p?.titulo}</p>
                  <p className="text-[11.5px] text-[var(--text-3)]">
                    {m?.avatar?.nombre} · faltan {restanSeg >= 60 ? `${Math.ceil(restanSeg / 60)} min` : `${restanSeg} s`}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    {ETAPAS.map((e, i) => {
                      const idx = ETAPAS.findIndex((x) => x.id === a.etapa);
                      const lleno = i < idx ? 100 : i === idx ? a.progreso : 0;
                      return (
                        <div key={e.id}>
                          <div className="h-1 overflow-hidden rounded-full bg-white/[0.07]">
                            <div className="h-full rounded-full bg-[var(--es-violeta)] transition-[width] duration-700" style={{ width: `${lleno}%` }} />
                          </div>
                          <p className={cn("mt-1 truncate text-[10.5px]", i === idx ? "text-[var(--text-2)]" : "text-[var(--text-3)]")}>{e.texto}</p>
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

const SERVICIO: Record<Servicio, { texto: string; color: string }> = {
  avatar: { texto: "Avatar", color: "var(--es-violeta)" },
  voz: { texto: "Voz", color: "var(--es-cian)" },
  edicion: { texto: "Edición", color: "var(--es-ambar)" },
  imagen: { texto: "Imágenes", color: "#f28fb1" },
  texto: { texto: "Texto", color: "var(--es-naranja)" },
  publicacion: { texto: "Publicación", color: "var(--es-verde)" },
};

function Gasto({ total, porServicio }: { total: number; porServicio: Record<Servicio, number> }) {
  const filas = (Object.keys(SERVICIO) as Servicio[])
    .map((s) => ({ s, v: porServicio[s] }))
    .filter((f) => f.v > 0)
    .sort((a, b) => b.v - a.v);
  const max = Math.max(...filas.map((f) => f.v), 0.01);
  return (
    <Vidrio className="p-4 lg:p-5">
      <Cabecera
        titulo="Gasto del mes"
        accion={
          <Link href="/estudio/costos" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--text-2)] hover:text-[var(--text)]">
            Costos
            <ArrowUpRight size={14} />
          </Link>
        }
      />
      <p className="es-rotulo mb-4 text-[44px] font-semibold leading-none">{dinero(total)}</p>
      <ul className="space-y-2.5">
        {filas.map(({ s, v }) => (
          <li key={s} className="grid grid-cols-[84px_1fr_56px] items-center gap-3 text-[12.5px]">
            <span className="text-[var(--text-2)]">{SERVICIO[s].texto}</span>
            <span className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
              <span className="block h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: SERVICIO[s].color }} />
            </span>
            <span className="es-rotulo text-right text-[15px] font-semibold">{dinero(v)}</span>
          </li>
        ))}
      </ul>
    </Vidrio>
  );
}

function Cuentas({ marcas, avisar }: { marcas: Marca[]; avisar: (t: string) => void }) {
  return (
    <Vidrio className="p-4 lg:p-5">
      <Cabecera titulo="Cuentas conectadas" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-y-1.5 text-[13px]">
          <thead>
            <tr className="text-left text-[11.5px] text-[var(--text-3)]">
              <th className="pb-1 font-medium">Marca</th>
              {REDES_ORDEN.map((r) => (
                <th key={r} className="pb-1 text-center font-medium">
                  <span className="inline-flex justify-center">
                    <IconoRed red={r} size={20} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {marcas.map((m) => (
              <tr key={m.id}>
                <td className="py-1">
                  <span className="flex items-center gap-2">
                    <MarcaSello marca={m} size={22} />
                    <span className="truncate font-medium">{m.nombre}</span>
                  </span>
                </td>
                {REDES_ORDEN.map((r) => {
                  const c = m.redes.find((x) => x.red === r);
                  const estado = c?.estado ?? "sin_conectar";
                  return (
                    <td key={r} className="text-center">
                      {estado === "conectada" && (
                        <span title={c?.cuenta} className="mx-auto block h-2.5 w-2.5 rounded-full bg-[var(--es-verde)] shadow-[0_0_10px_rgba(61,214,140,0.6)]" />
                      )}
                      {estado === "vencida" && (
                        <button
                          type="button"
                          onClick={() => {
                            conectarRed(m.id, r);
                            avisar(`${NOMBRE_RED[r]} de ${m.nombre} reconectado.`);
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,107,107,0.14)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--es-rojo)] hover:bg-[rgba(255,107,107,0.22)]"
                        >
                          <RefreshCw size={11} />
                          Reconectar
                        </button>
                      )}
                      {estado === "sin_conectar" && <span className="mx-auto block h-px w-3 bg-white/15" />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Vidrio>
  );
}

function Fallas({ piezas, marcas, avisar }: { piezas: Pieza[]; marcas: Marca[]; avisar: (t: string) => void }) {
  const fallidas = piezas.filter((p) => p.estado === "fallida");
  if (!fallidas.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {fallidas.map((p) => {
        const m = marcas.find((x) => x.id === p.marcaId);
        const v = p.variantes.find((x) => x.estado === "fallida");
        const cuentaVencida = m?.redes.find((r) => r.red === v?.red)?.estado === "vencida";
        return (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-3 rounded-[18px] border border-[rgba(255,107,107,0.3)] bg-[rgba(255,107,107,0.08)] px-4 py-3"
          >
            <AlertTriangle size={18} className="shrink-0 text-[var(--es-rojo)]" />
            <p className="min-w-0 flex-1 text-[13px]">
              <span className="font-semibold">{p.titulo}</span>
              <span className="text-[var(--text-2)]">
                {" "}
                no salió en {v ? NOMBRE_RED[v.red] : "una red"} ({m?.nombre}). {v?.error}
              </span>
            </p>
            {cuentaVencida && v && m ? (
              <Boton
                variante="peligro"
                className="h-8 px-3 text-[12px]"
                onClick={() => {
                  conectarRed(m.id, v.red);
                  reintentar(p.id);
                  avisar(`${NOMBRE_RED[v.red]} reconectado. Publicada.`);
                }}
              >
                Reconectar y publicar
              </Boton>
            ) : (
              <Boton
                variante="peligro"
                className="h-8 px-3 text-[12px]"
                onClick={() => {
                  reintentar(p.id);
                  avisar("Publicada.");
                }}
              >
                Reintentar
              </Boton>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ResumenEstudio() {
  const e = useEstudio();
  const activa = useMarcaActiva();
  const [aviso, avisar] = useAviso();
  const hoy = diaDe(localSV());
  const mes = hoy.slice(0, 7);

  const piezas = useMemo(() => deMarca(e.piezas, activa), [e.piezas, activa]);
  const marcas = useMemo(() => (activa === "todas" ? e.marcas : e.marcas.filter((m) => m.id === activa)), [e.marcas, activa]);
  const usoMes = useMemo(() => deMarca(e.uso, activa).filter((u) => localSV(Date.parse(u.fecha)).startsWith(mes)), [e.uso, activa, mes]);
  const generadasMes = piezas.filter((p) => localSV(Date.parse(p.creada)).startsWith(mes)).length;

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <Fallas piezas={piezas} marcas={e.marcas} avisar={avisar} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Semana piezas={piezas} marcas={e.marcas} hoy={hoy} />
        <PorAprobar piezas={piezas} marcas={e.marcas} avisar={avisar} />
      </div>
      <Cifras piezas={piezas} gasto={costoTotal(usoMes)} generadasMes={generadasMes} />
      <div className="grid gap-4 lg:grid-cols-3">
        <RitmoPlan piezas={piezas} marcas={marcas} />
        <VideosEnCurso marcas={e.marcas} />
        <Gasto total={costoTotal(usoMes)} porServicio={costoPorServicio(usoMes)} />
      </div>
      <Cuentas marcas={marcas} avisar={avisar} />
      {aviso}
    </div>
  );
}
