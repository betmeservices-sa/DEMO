"use client";

// Tablero por etapa. Se arrastra una tarjeta a otra columna para moverla; a
// "Descartada" se pide el motivo antes.

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Etapa } from "@/lib/eventos/tipos";
import { ETAPAS, MOTIVOS_DESCARTE } from "@/lib/eventos/catalogo";
import { fechaCorta } from "@/lib/eventos/fechas";
import type { Fila } from "./fila";
import { AsesorAvatar, CanalChip, PrioridadChip, RealBadge, VencidoBadge, miles } from "./ui";

export function Tablero({
  filas,
  onAbrir,
  onMover,
}: {
  filas: Fila[];
  onAbrir: (id: string) => void;
  onMover: (id: string, a: Etapa, motivo?: string) => void;
}) {
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [encima, setEncima] = useState<Etapa | null>(null);
  const [porDescartar, setPorDescartar] = useState<string | null>(null);
  const [motivo, setMotivo] = useState(MOTIVOS_DESCARTE[0]);

  function soltar(a: Etapa) {
    const id = arrastrando;
    setArrastrando(null);
    setEncima(null);
    if (!id) return;
    const f = filas.find((x) => x.p.id === id);
    if (!f || f.p.etapa === a) return;
    if (a === "descartada") {
      setPorDescartar(id);
      return;
    }
    onMover(id, a);
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {ETAPAS.map((e) => {
          const xs = filas.filter((f) => f.p.etapa === e.id);
          const aforo = xs.reduce((n, f) => n + f.p.datos.aforo_esperado, 0);
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
                "flex w-[264px] shrink-0 flex-col rounded-2xl border border-line bg-surface/70 transition",
                encima === e.id && "border-[var(--text)] bg-surface",
              )}
            >
              <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                <span className="text-[13px] font-bold text-[var(--text)]">{e.nombre}</span>
                <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-[11px] font-bold text-[var(--text-2)]">{xs.length}</span>
              </div>
              <p className="px-3 pt-1.5 text-[11px] text-[var(--text-3)]">{miles(aforo)} personas</p>
              <div className="flex-1 space-y-2 p-2">
                {xs.map((f) => (
                  <article
                    key={f.p.id}
                    draggable
                    onDragStart={() => setArrastrando(f.p.id)}
                    onDragEnd={() => setArrastrando(null)}
                    onClick={() => onAbrir(f.p.id)}
                    className={cn(
                      "cursor-pointer rounded-xl border border-line bg-card p-3 shadow-sm transition hover:border-[var(--border-2)] hover:shadow",
                      arrastrando === f.p.id && "opacity-50",
                    )}
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      <PrioridadChip nivel={f.prioridad.nivel} />
                      {f.p.origen === "real" && <RealBadge />}
                      <span className="ml-auto">
                        <CanalChip canal={f.p.canal} soloIcono />
                      </span>
                    </div>
                    <p className="text-[13px] font-bold leading-snug text-[var(--text)]">{f.p.datos.nombre_evento || "Evento sin nombre"}</p>
                    <p className="mt-0.5 truncate text-[11.5px] text-[var(--text-2)]">
                      {[f.p.datos.fecha_inicio ? fechaCorta(f.p.datos.fecha_inicio) : "Sin fecha", f.p.datos.municipio].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <AsesorAvatar id={f.p.asesorId} size={22} />
                      <span className="text-[11.5px] font-semibold text-[var(--text-2)]">
                        {f.p.datos.aforo_esperado ? `${miles(f.p.datos.aforo_esperado)} pers.` : "Aforo por definir"}
                      </span>
                      {f.plazo.vencido && (
                        <span className="ml-auto">
                          <VencidoBadge horas={f.plazo.horas} />
                        </span>
                      )}
                    </div>
                  </article>
                ))}
                {xs.length === 0 && <p className="px-1 py-4 text-center text-[11.5px] text-[var(--text-3)]">Sin propuestas</p>}
              </div>
            </div>
          );
        })}
      </div>

      {porDescartar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setPorDescartar(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-bold text-[var(--text)]">¿Por qué se descarta?</h3>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="mt-3 w-full rounded-lg border border-line bg-card px-2 py-2 text-[13px]"
            >
              {MOTIVOS_DESCARTE.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setPorDescartar(null)} className="rounded-lg border border-line px-3 py-2 text-[12.5px] font-semibold text-[var(--text-2)]">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onMover(porDescartar, "descartada", motivo);
                  setPorDescartar(null);
                }}
                className="rounded-lg bg-[var(--brand-accent)] px-3 py-2 text-[12.5px] font-bold text-white"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
