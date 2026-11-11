"use client";

// Costos de Sofía: cada conversación que atendió desde que arrancó con luna,
// con los mensajes que mandó, lo que costó y lo que costó en promedio cada
// mensaje suyo. Arriba el general, después cada canal, la línea de tiempo de
// los paquetes del plan (components/dashboard/LineaDelPlan) y abajo la lista.
//
// Solo para la agencia (lib/modulos: MODULOS_AGENCIA). Los datos salen de
// /api/agencia/costos, que devuelve 403 a cualquiera que no sea la agencia.
// Qué es una conversación y qué mensajes son suyos: lib/costos-conversacion.ts.

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Receipt } from "lucide-react";
import { cn } from "@/lib/cn";
import { fechaHora, miles } from "@/lib/formato-agencia";
import { LineaDelPlan } from "@/components/dashboard/LineaDelPlan";
import type { Canal, CostoDeConversacion, ResumenDeCanal, ResumenDeCostos } from "@/lib/costos-conversacion";

interface Respuesta {
  ok: boolean;
  error?: string;
  arranque: { desde: string; etiqueta: string } | null;
  resumen?: ResumenDeCostos;
  porCanal?: ResumenDeCanal[];
  conversaciones?: CostoDeConversacion[];
  truncado?: boolean;
}

type Orden = "recientes" | "caras" | "mensajes";
const ORDENES: { clave: Orden; etiqueta: string }[] = [
  { clave: "recientes", etiqueta: "Más recientes" },
  { clave: "caras", etiqueta: "Más caras" },
  { clave: "mensajes", etiqueta: "Más mensajes" },
];

const CANAL: Record<Canal, string> = {
  whatsapp: "WhatsApp",
  facebook: "Messenger",
  instagram: "Instagram",
};

const PASO = 200;

/** $5.70 para totales; $0.0123 para lo chico, que es casi todo. */
function dinero(n: number | null, decimales = 4): string {
  if (n === null) return "·";
  return "$" + n.toFixed(decimales);
}

/** El nombre del huésped, o el final de su número: el reporte no muestra teléfonos enteros. */
function huesped(c: CostoDeConversacion): string {
  if (c.nombre) return c.nombre;
  const id = c.chat.includes(":") ? c.chat.split(":").pop()! : c.chat;
  return `…${id.slice(-4)}`;
}

function csv(filas: readonly CostoDeConversacion[]): string {
  const celda = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cabecera = ["inicio", "huesped", "canal", "mensajes_de_sofia", "costo_usd", "costo_por_mensaje_usd"];
  const lineas = filas.map((c) =>
    [fechaHora(c.inicio), huesped(c), CANAL[c.canal], c.mensajes, c.costo.toFixed(6), c.porMensaje === null ? "" : c.porMensaje.toFixed(6)]
      .map(celda)
      .join(","),
  );
  return [cabecera.join(","), ...lineas].join("\n");
}

export default function CostosPage() {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [canal, setCanal] = useState<Canal | "todos">("todos");
  const [orden, setOrden] = useState<Orden>("recientes");
  const [visibles, setVisibles] = useState(PASO);

  useEffect(() => {
    let vivo = true;
    fetch("/api/agencia/costos?cliente=yaly", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Respuesta) => {
        if (vivo) setDatos(d);
      })
      .catch(() => {
        if (vivo) setDatos({ ok: false, error: "No se pudieron leer los costos.", arranque: null });
      });
    return () => {
      vivo = false;
    };
  }, []);

  const filas = useMemo(() => {
    const lista = (datos?.conversaciones ?? []).filter((c) => canal === "todos" || c.canal === canal);
    if (orden === "caras") lista.sort((a, b) => b.costo - a.costo);
    else if (orden === "mensajes") lista.sort((a, b) => b.mensajes - a.mensajes);
    return lista;
  }, [datos, canal, orden]);

  const r = datos?.resumen;
  const porCanal = datos?.porCanal ?? [];

  const elegirCanal = (c: Canal | "todos") => {
    setCanal(c);
    setVisibles(PASO);
  };

  const descargar = () => {
    const blob = new Blob(["﻿" + csv(filas)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = canal === "todos" ? "costos-sofia.csv" : `costos-sofia-${CANAL[canal].toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-5 py-3">
        <div>
          <h1 className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-brand">
            <Receipt size={17} /> Costos de Sofía
          </h1>
          <p className="text-[12.5px] text-[var(--text-3)]">
            Cada conversación de Yalí desde el {datos?.arranque?.etiqueta ?? "arranque con luna"}
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {datos && !datos.ok && (
          <p className="rounded-xl border border-[var(--brand-red)]/40 bg-[var(--brand-red)]/10 px-3.5 py-2.5 text-[12.5px]">
            {datos.error ?? "No se pudieron leer los costos."}
          </p>
        )}

        {!datos ? (
          <p className="flex items-center gap-2 text-[13px] text-[var(--text-3)]">
            <Loader2 size={15} className="animate-spin text-brand" /> Sumando el costo de cada conversación
          </p>
        ) : (
          r && (
            <>
              <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <Dato titulo="Conversaciones" valor={miles(r.conversaciones)} />
                <Dato titulo="Mensajes de Sofía" valor={miles(r.mensajes)} />
                <Dato titulo="Costo total" valor={dinero(r.costo, 2)} />
                <Dato titulo="Por conversación" valor={dinero(r.porConversacion)} />
                <Dato titulo="Por mensaje" valor={dinero(r.porMensaje)} />
              </section>

              {porCanal.length > 0 && (
                <section>
                  <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-[var(--text-3)]">Por canal</h2>
                  <div className="grid gap-3 md:grid-cols-3">
                    {porCanal.map((c, i) => (
                      <TarjetaDeCanal key={c.canal} c={c} consumeMas={i === 0 && porCanal.length > 1} />
                    ))}
                  </div>
                </section>
              )}

              <LineaDelPlan cliente="yaly" />

              <section className="rounded-2xl border border-line bg-card p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
                    {(["todos", ...porCanal.map((c) => c.canal)] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => elegirCanal(c)}
                        className={cn(
                          "rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition",
                          canal === c ? "bg-brand text-white shadow-sm" : "text-[var(--text-2)] hover:bg-card",
                        )}
                      >
                        {c === "todos" ? "Todas" : CANAL[c]}{" "}
                        <span className={cn("tabular-nums", canal === c ? "text-white/80" : "text-[var(--text-3)]")}>
                          {miles(c === "todos" ? r.conversaciones : (porCanal.find((x) => x.canal === c)?.conversaciones ?? 0))}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
                    {ORDENES.map((o) => (
                      <button
                        key={o.clave}
                        type="button"
                        onClick={() => setOrden(o.clave)}
                        className={cn(
                          "rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition",
                          orden === o.clave ? "bg-brand text-white shadow-sm" : "text-[var(--text-2)] hover:bg-card",
                        )}
                      >
                        {o.etiqueta}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={descargar}
                    className="ml-auto flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text-2)] hover:bg-card"
                  >
                    <Download size={14} /> Descargar CSV
                  </button>
                </div>

                {filas.length === 0 ? (
                  <p className="text-[12.5px] text-[var(--text-3)]">Todavía no hay conversaciones.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12.5px]">
                      <thead className="text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                        <tr className="text-left">
                          <th className="py-1.5 pr-3 font-semibold">Inicio</th>
                          <th className="py-1.5 pr-3 font-semibold">Huésped</th>
                          <th className="py-1.5 pr-3 text-right font-semibold">Mensajes de Sofía</th>
                          <th className="py-1.5 pr-3 text-right font-semibold">Costo</th>
                          <th className="py-1.5 text-right font-semibold">Por mensaje</th>
                        </tr>
                      </thead>
                      <tbody className="tabular-nums">
                        {filas.slice(0, visibles).map((c) => (
                          <tr key={`${c.chat}-${c.inicio}`} className="border-t border-line">
                            <td className="whitespace-nowrap py-2 pr-3 text-[var(--text-2)]">{fechaHora(c.inicio)}</td>
                            <td className="py-2 pr-3">
                              <span className="font-semibold text-[var(--text)]">{huesped(c)}</span>
                              {canal === "todos" && <span className="block text-[11px] text-[var(--text-3)]">{CANAL[c.canal]}</span>}
                            </td>
                            <td className="py-2 pr-3 text-right text-[var(--text-2)]">{miles(c.mensajes)}</td>
                            <td className="py-2 pr-3 text-right font-semibold text-[var(--text)]">{dinero(c.costo)}</td>
                            <td className="py-2 text-right text-[var(--text-2)]">{dinero(c.porMensaje)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {filas.length > visibles && (
                  <button
                    type="button"
                    onClick={() => setVisibles((v) => v + PASO)}
                    className="mt-3 rounded-xl border border-line bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text-2)] hover:bg-card"
                  >
                    Mostrar {miles(Math.min(PASO, filas.length - visibles))} más de {miles(filas.length - visibles)}
                  </button>
                )}

                <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-relaxed text-[var(--text-3)]">
                  Conversación: sesión de 24 h desde la primera respuesta de Sofía, la misma que cuenta el plan. Mensajes: los que
                  mandó Sofía. Costo: lo que cobra OpenAI por las respuestas de Sofía, con todas sus llamadas al modelo
                  (herramientas, revisión y reescritura). No entra el análisis diario de conversaciones ni las pruebas.
                  {datos.truncado ? " Se leyó hasta el tope de filas: puede faltar lo más viejo." : ""}
                </p>
              </section>
            </>
          )
        )}
      </div>
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-3)]">{titulo}</p>
      <p className="mt-1 text-[22px] font-extrabold leading-none tracking-tight tabular-nums text-[var(--text)]">{valor}</p>
    </div>
  );
}

function TarjetaDeCanal({ c, consumeMas }: { c: ResumenDeCanal; consumeMas: boolean }) {
  const pct = Math.round(c.parteDelCosto * 100);
  return (
    <div className={cn("rounded-2xl border bg-card p-4", consumeMas ? "border-brand" : "border-line")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[14px] font-bold text-[var(--text)]">{CANAL[c.canal]}</p>
        {consumeMas && (
          <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">Consume más</span>
        )}
      </div>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-[24px] font-extrabold leading-none tracking-tight tabular-nums text-[var(--text)]">{dinero(c.costo, 2)}</span>
        <span className="text-[12px] text-[var(--text-3)]">{pct}% del costo</span>
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px] tabular-nums">
        <dt className="text-[var(--text-3)]">Conversaciones</dt>
        <dd className="text-right font-semibold text-[var(--text)]">{miles(c.conversaciones)}</dd>
        <dt className="text-[var(--text-3)]">Mensajes de Sofía</dt>
        <dd className="text-right font-semibold text-[var(--text)]">{miles(c.mensajes)}</dd>
        <dt className="text-[var(--text-3)]">Por conversación</dt>
        <dd className="text-right font-semibold text-[var(--text)]">{dinero(c.porConversacion)}</dd>
        <dt className="text-[var(--text-3)]">Por mensaje</dt>
        <dd className="text-right font-semibold text-[var(--text)]">{dinero(c.porMensaje)}</dd>
      </dl>
    </div>
  );
}
