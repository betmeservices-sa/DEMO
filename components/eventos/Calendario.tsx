"use client";

// Calendario mensual de eventos. Cada evento aparece en todos sus días, con el
// color de su etapa; los días con dos o más eventos confirmados se marcan,
// porque ahí hay que repartir equipo y hornos.

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { ETAPAS, etapaDef } from "@/lib/eventos/catalogo";
import { diaSemanaDeFecha, nombreMes, sumarDias } from "@/lib/eventos/fechas";
import type { Fila } from "./fila";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function diasDelEvento(f: Fila): string[] {
  const ini = f.p.datos.fecha_inicio;
  if (!ini) return [];
  const fin = f.p.datos.fecha_fin && f.p.datos.fecha_fin >= ini ? f.p.datos.fecha_fin : ini;
  const out: string[] = [];
  for (let d = ini; d <= fin && out.length < 31; d = sumarDias(d, 1)) out.push(d);
  return out;
}

export function Calendario({ filas, hoy, onAbrir }: { filas: Fila[]; hoy: string; onAbrir: (id: string) => void }) {
  const [mes, setMes] = useState(() => {
    // Arranca en el mes del próximo evento si este mes no tiene ninguno.
    const esteMes = hoy.slice(0, 7);
    const hay = filas.some((f) => diasDelEvento(f).some((d) => d.slice(0, 7) === esteMes));
    if (hay) return esteMes;
    const proximo = filas
      .map((f) => f.p.datos.fecha_inicio)
      .filter((d) => d && d >= hoy)
      .sort()[0];
    return (proximo ?? hoy).slice(0, 7);
  });

  const porDia = useMemo(() => {
    const m = new Map<string, Fila[]>();
    for (const f of filas) {
      for (const d of diasDelEvento(f)) {
        const xs = m.get(d) ?? [];
        xs.push(f);
        m.set(d, xs);
      }
    }
    for (const xs of m.values()) {
      xs.sort((a, b) => ETAPAS.findIndex((e) => e.id === a.p.etapa) - ETAPAS.findIndex((e) => e.id === b.p.etapa));
    }
    return m;
  }, [filas]);

  const primero = `${mes}-01`;
  // Lunes = 0.
  const desfase = (diaSemanaDeFecha(primero) + 6) % 7;
  const inicio = sumarDias(primero, -desfase);
  const celdas = Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i));
  const semanas = celdas[35].slice(0, 7) === mes ? 6 : 5;

  const cambiarMes = (n: number) => {
    const [y, m] = mes.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMes(d.toISOString().slice(0, 7));
  };

  const eventosDelMes = new Set(
    celdas.filter((d) => d.slice(0, 7) === mes).flatMap((d) => (porDia.get(d) ?? []).map((f) => f.p.id)),
  ).size;

  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => cambiarMes(-1)} aria-label="Mes anterior" className="flex h-8 w-8 items-center justify-center rounded-lg border border-line hover:bg-surface">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={() => cambiarMes(1)} aria-label="Mes siguiente" className="flex h-8 w-8 items-center justify-center rounded-lg border border-line hover:bg-surface">
            <ChevronRight size={16} />
          </button>
        </div>
        <h2 className="text-[16px] font-extrabold tracking-tight text-[var(--text)]">{nombreMes(primero)}</h2>
        <span className="text-[12px] text-[var(--text-3)]">
          {eventosDelMes} {eventosDelMes === 1 ? "evento" : "eventos"}
        </span>
        <button
          type="button"
          onClick={() => setMes(hoy.slice(0, 7))}
          className="rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold text-[var(--text-2)] hover:bg-surface"
        >
          Hoy
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {ETAPAS.map((e) => (
            <span key={e.id} className="flex items-center gap-1.5 text-[11px] text-[var(--text-2)]">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: e.color }} />
              {e.nombre}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 border-l border-t border-line">
        {DIAS.map((d) => (
          <div key={d} className="border-b border-r border-line bg-surface px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--text-3)]">
            {d}
          </div>
        ))}
        {celdas.slice(0, semanas * 7).map((dia) => {
          const xs = porDia.get(dia) ?? [];
          const confirmados = xs.filter((f) => f.p.etapa === "confirmada").length;
          const fuera = dia.slice(0, 7) !== mes;
          const esHoy = dia === hoy;
          return (
            <div
              key={dia}
              className={cn(
                "min-h-[104px] border-b border-r border-line p-1.5",
                fuera && "bg-surface/60",
                confirmados >= 2 && "bg-[var(--ph-alarma-fondo)]",
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <span
                  className={cn(
                    "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] font-semibold",
                    esHoy ? "bg-brand text-white" : fuera ? "text-[var(--text-3)]" : "text-[var(--text)]",
                  )}
                >
                  {Number(dia.slice(8))}
                </span>
                {confirmados >= 2 && (
                  <span className="rounded px-1 text-[10px] font-bold leading-4 text-[var(--brand-red)]" title="Dos o más eventos confirmados el mismo día">
                    {confirmados} confirmados
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {xs.slice(0, 3).map((f) => (
                  <button
                    key={f.p.id}
                    type="button"
                    onClick={() => onAbrir(f.p.id)}
                    title={`${f.p.datos.nombre_evento} · ${etapaDef(f.p.etapa).nombre}`}
                    className={cn(
                      "block w-full truncate rounded-md border-l-[3px] bg-card px-1.5 py-0.5 text-left text-[11px] font-semibold text-[var(--text)] shadow-sm transition hover:shadow",
                      f.p.etapa === "descartada" && "text-[var(--text-3)] line-through",
                    )}
                    style={{ borderLeftColor: etapaDef(f.p.etapa).color }}
                  >
                    {f.p.datos.nombre_evento || "Sin nombre"}
                  </button>
                ))}
                {xs.length > 3 && <p className="px-1 text-[10.5px] font-semibold text-[var(--text-3)]">y {xs.length - 3} más</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
