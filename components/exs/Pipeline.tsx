"use client";

// La línea de paquetes por etapa. Se arrastra una tarjeta a otra columna para
// moverla, o se avanza con la flecha; cada movimiento le manda su aviso de
// WhatsApp al cliente.

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Etapa, Paquete } from "@/lib/exs/tipos";
import { ETAPAS, siguienteEtapa } from "@/lib/exs/catalogo";
import { alertasDelPaquete } from "@/lib/exs/alertas";
import { cobroDe, dinero, libras } from "@/lib/exs/cobro";
import { totalDelVuelo } from "@/lib/exs/estado";
import { clienteDe, type VistaExs } from "@/lib/exs/vista";
import { AlertaChip, IaChip, trackingCorto } from "./ui";

/** Lo que resume cada columna debajo de su nombre. */
function resumenDeColumna(e: Etapa, xs: Paquete[], vista: VistaExs): string {
  if (xs.length === 0) return "";
  if (e === "prealertado") return `${dinero(xs.reduce((n, p) => n + p.valor, 0))} declarados`;
  if (e === "listo") {
    const porCobrar = xs
      .filter((p) => !p.pagado)
      .reduce((n, p) => n + cobroDe(p, totalDelVuelo(vista.paquetes, p.clienteId, p.vueloId)).total, 0);
    return porCobrar > 0 ? `${dinero(porCobrar)} por cobrar` : "Todo cobrado";
  }
  const lb = xs.reduce((n, p) => n + (p.pesoLb ?? 0), 0);
  return lb > 0 ? libras(lb) : "";
}

export function Pipeline({
  vista,
  paquetes,
  onAbrir,
  onMover,
}: {
  vista: VistaExs;
  paquetes: Paquete[];
  onAbrir: (id: string) => void;
  onMover: (id: string, a: Etapa) => void;
}) {
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [encima, setEncima] = useState<Etapa | null>(null);

  function soltar(a: Etapa) {
    const id = arrastrando;
    setArrastrando(null);
    setEncima(null);
    if (!id) return;
    const p = paquetes.find((x) => x.id === id);
    if (p && p.etapa !== a) onMover(id, a);
  }

  return (
    <div className="flex h-full gap-3 overflow-x-auto pb-2">
      {ETAPAS.map((e) => {
        const xs = paquetes
          .filter((p) => p.etapa === e.id)
          .sort((a, b) => (b.historial.at(-1)?.ts ?? b.creado).localeCompare(a.historial.at(-1)?.ts ?? a.creado));
        return (
          <div
            key={e.id}
            onDragOver={(ev) => {
              ev.preventDefault();
              setEncima(e.id);
            }}
            onDragLeave={() => setEncima((x) => (x === e.id ? null : x))}
            onDrop={() => soltar(e.id)}
            className={cn(
              "flex w-[256px] shrink-0 flex-col rounded-2xl border border-line bg-[var(--surface-2)]/60 transition",
              encima === e.id && "border-brand bg-[var(--brand-accent-soft)]",
            )}
          >
            <div className="border-b border-line px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                <span className="text-[13px] font-bold text-[var(--text)]">{e.nombre}</span>
                <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-[11px] font-bold text-[var(--text-2)]">{xs.length}</span>
              </div>
              <p className="mt-0.5 h-4 text-[11px] text-[var(--text-3)]">{resumenDeColumna(e.id, xs, vista)}</p>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
              {xs.map((p) => {
                const c = clienteDe(vista, p.clienteId);
                const alertas = alertasDelPaquete(p, vista.alertas);
                const sigue = siguienteEtapa(p.etapa);
                const bloqueado = p.etapa === "aduana" && Boolean(p.retenido);
                return (
                  <article
                    key={p.id}
                    draggable
                    onDragStart={() => setArrastrando(p.id)}
                    onDragEnd={() => setArrastrando(null)}
                    onClick={() => onAbrir(p.id)}
                    className={cn(
                      "group cursor-pointer rounded-xl border border-line bg-card p-3 shadow-sm transition hover:border-[var(--border-2)] hover:shadow",
                      arrastrando === p.id && "opacity-50",
                      alertas.some((a) => a.tipo === "retenido") && "border-l-4 border-l-[var(--brand-red)]",
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[var(--text-3)]">
                      <span>{p.tienda}</span>
                      <span>·</span>
                      <span className="font-mono">{trackingCorto(p.tracking)}</span>
                      {p.prealerta?.origen === "captura" && (
                        <span className="ml-auto">
                          <IaChip compacto />
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] font-bold leading-snug text-[var(--text)]">{p.contenido}</p>
                    <p className="mt-0.5 truncate text-[11.5px] text-[var(--text-2)]">
                      {c?.nombre} · {c?.casillero}
                    </p>
                    {alertas.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {alertas.map((a) => (
                          <AlertaChip key={a.tipo} tipo={a.tipo}>
                            {a.texto}
                          </AlertaChip>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-[11.5px] font-semibold text-[var(--text-2)]">
                      <span>{p.valor ? dinero(p.valor) : "Valor por confirmar"}</span>
                      {p.pesoLb !== undefined && <span className="text-[var(--text-3)]">{libras(p.pesoLb)}</span>}
                      {sigue && !bloqueado && (
                        <button
                          type="button"
                          title={`Mover a ${ETAPAS.find((x) => x.id === sigue)?.nombre}`}
                          aria-label={`Mover a ${ETAPAS.find((x) => x.id === sigue)?.nombre}`}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onMover(p.id, sigue);
                          }}
                          className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-3)] opacity-60 transition hover:bg-brand hover:text-white group-hover:opacity-100"
                        >
                          <ArrowRight size={15} />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
              {xs.length === 0 && <p className="px-1 py-6 text-center text-[11.5px] text-[var(--text-3)]">Sin paquetes</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
