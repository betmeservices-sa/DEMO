"use client";

// Costos de Sofía: cada conversación que atendió desde que arrancó con luna,
// con sus mensajes, lo que costó y lo que costó en promedio cada mensaje.
//
// Solo para la agencia (lib/modulos: MODULOS_AGENCIA). Los datos salen de
// /api/agencia/costos, que devuelve 403 a cualquiera que no sea la agencia.
// Qué es una conversación y qué mensajes son suyos: lib/costos-conversacion.ts.

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Receipt } from "lucide-react";
import { cn } from "@/lib/cn";
import { fechaHora, miles } from "@/lib/formato-agencia";
import type { CostoDeConversacion, ResumenDeCostos } from "@/lib/costos-conversacion";

interface Respuesta {
  ok: boolean;
  error?: string;
  arranque: { desde: string; etiqueta: string } | null;
  resumen?: ResumenDeCostos;
  conversaciones?: CostoDeConversacion[];
  truncado?: boolean;
}

type Orden = "recientes" | "caras" | "mensajes";
const ORDENES: { clave: Orden; etiqueta: string }[] = [
  { clave: "recientes", etiqueta: "Más recientes" },
  { clave: "caras", etiqueta: "Más caras" },
  { clave: "mensajes", etiqueta: "Más mensajes" },
];

const CANAL: Record<CostoDeConversacion["canal"], string> = {
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
  const cabecera = [
    "inicio",
    "huesped",
    "canal",
    "mensajes_huesped",
    "mensajes_sofia",
    "mensajes_equipo",
    "mensajes_total",
    "costo_usd",
    "costo_por_mensaje_de_sofia",
    "costo_por_mensaje",
  ];
  const lineas = filas.map((c) =>
    [
      fechaHora(c.inicio),
      huesped(c),
      CANAL[c.canal],
      c.mensajes.huesped,
      c.mensajes.agente,
      c.mensajes.equipo,
      c.mensajes.total,
      c.costo.toFixed(6),
      c.porMensajeAgente === null ? "" : c.porMensajeAgente.toFixed(6),
      c.porMensaje === null ? "" : c.porMensaje.toFixed(6),
    ]
      .map(celda)
      .join(","),
  );
  return [cabecera.join(","), ...lineas].join("\n");
}

export default function CostosPage() {
  const [datos, setDatos] = useState<Respuesta | null>(null);
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
    const lista = [...(datos?.conversaciones ?? [])];
    if (orden === "caras") lista.sort((a, b) => b.costo - a.costo);
    else if (orden === "mensajes") lista.sort((a, b) => b.mensajes.total - a.mensajes.total);
    return lista;
  }, [datos, orden]);

  const r = datos?.resumen;

  const descargar = () => {
    const blob = new Blob(["﻿" + csv(filas)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "costos-sofia.csv";
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
            Cada conversación de Yalí desde el {datos?.arranque?.etiqueta ?? "arranque con luna"}: mensajes, costo y costo por mensaje
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
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
              <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <Dato titulo="Conversaciones" valor={miles(r.conversaciones)} />
                <Dato titulo="Mensajes de Sofía" valor={miles(r.mensajes.agente)} nota={`de ${miles(r.mensajes.total)} en total`} />
                <Dato titulo="Costo total" valor={dinero(r.costo, 2)} />
                <Dato titulo="Por conversación" valor={dinero(r.porConversacion)} />
                <Dato titulo="Por mensaje de Sofía" valor={dinero(r.porMensajeAgente)} />
                <Dato titulo="Por mensaje, contando todos" valor={dinero(r.porMensaje)} />
              </section>

              <section className="rounded-2xl border border-line bg-card p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
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
                          <th className="py-1.5 pr-3 text-right font-semibold">Del huésped</th>
                          <th className="py-1.5 pr-3 text-right font-semibold">De Sofía</th>
                          <th className="py-1.5 pr-3 text-right font-semibold">Del equipo</th>
                          <th className="py-1.5 pr-3 text-right font-semibold">Costo</th>
                          <th className="py-1.5 pr-3 text-right font-semibold">Por mensaje de Sofía</th>
                          <th className="py-1.5 text-right font-semibold">Por mensaje</th>
                        </tr>
                      </thead>
                      <tbody className="tabular-nums">
                        {filas.slice(0, visibles).map((c) => (
                          <tr key={`${c.chat}-${c.inicio}`} className="border-t border-line">
                            <td className="whitespace-nowrap py-2 pr-3 text-[var(--text-2)]">{fechaHora(c.inicio)}</td>
                            <td className="py-2 pr-3">
                              <span className="font-semibold text-[var(--text)]">{huesped(c)}</span>
                              <span className="block text-[11px] text-[var(--text-3)]">{CANAL[c.canal]}</span>
                            </td>
                            <td className="py-2 pr-3 text-right text-[var(--text-2)]">{miles(c.mensajes.huesped)}</td>
                            <td className="py-2 pr-3 text-right text-[var(--text-2)]">{miles(c.mensajes.agente)}</td>
                            <td className="py-2 pr-3 text-right text-[var(--text-2)]">{miles(c.mensajes.equipo)}</td>
                            <td className="py-2 pr-3 text-right font-semibold text-[var(--text)]">{dinero(c.costo)}</td>
                            <td className="py-2 pr-3 text-right text-[var(--text-2)]">{dinero(c.porMensajeAgente)}</td>
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
                  Conversación: sesión de 24 h desde la primera respuesta de Sofía, la misma que cuenta el plan. Sus mensajes
                  incluyen el que la disparó. Costo: lo que cobra OpenAI por las respuestas de Sofía, con todas sus llamadas al
                  modelo (herramientas, revisión y reescritura); OpenAI factura la entrada de luna como escritura de caché. No
                  entra el análisis diario de conversaciones ni las pruebas.
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

function Dato({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-3)]">{titulo}</p>
      <p className="mt-1 text-[22px] font-extrabold leading-none tracking-tight tabular-nums text-[var(--text)]">{valor}</p>
      {nota && <p className="mt-1 text-[11.5px] text-[var(--text-3)]">{nota}</p>}
    </div>
  );
}
