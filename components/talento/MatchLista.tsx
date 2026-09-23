"use client";

import { useState } from "react";
import { ChevronDown, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar, inicialesDe } from "@/components/ui/Avatar";
import { nombrePais } from "@/lib/talento/catalogo";
import { PESOS, type CriterioMatch, type ResultadoMatch } from "@/lib/talento/matching";
import type { Candidato } from "@/lib/talento/tipos";
import { Boton, ScoreBadge } from "./ui";

const NOMBRE_CRITERIO: Record<CriterioMatch, string> = {
  skills: "Skills requeridas",
  deseables: "Deseables",
  ingles: "Inglés",
  experiencia: "Experiencia",
  salario: "Salario",
  ubicacion: "Ubicación",
  disponibilidad: "Jornada y horario",
  disc: "DISC",
};

/**
 * El top del banco contra una vacante, con el porque de cada puntaje.
 * `onEnviar` manda al pipeline; sin el, la lista es solo de lectura (vista previa).
 */
export function MatchLista({
  resultados,
  candidatos,
  onEnviar,
  onAbrir,
}: {
  resultados: ResultadoMatch[];
  candidatos: Map<string, Candidato>;
  onEnviar?: (ids: string[]) => void;
  onAbrir?: (id: string) => void;
}) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [abierto, setAbierto] = useState<string | null>(null);

  const vivos = [...marcados].filter((id) => resultados.some((r) => r.candidatoId === id));

  if (resultados.length === 0) {
    return <p className="py-6 text-center text-[13px] text-[var(--text-3)]">Nadie más del banco se acerca a esta vacante.</p>;
  }

  return (
    <div className="space-y-2">
      {onEnviar && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-2)]">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--brand-blue)]"
              checked={vivos.length === resultados.length}
              onChange={(e) => setMarcados(e.target.checked ? new Set(resultados.map((r) => r.candidatoId)) : new Set())}
            />
            Todos
          </label>
          <Boton
            primario
            disabled={vivos.length === 0}
            onClick={() => {
              onEnviar(vivos);
              setMarcados(new Set());
            }}
          >
            <Send size={13} /> Mandar {vivos.length || ""} al pipeline
          </Boton>
        </div>
      )}
      {resultados.map((r) => {
        const c = candidatos.get(r.candidatoId);
        if (!c) return null;
        const expandido = abierto === r.candidatoId;
        return (
          <div key={r.candidatoId} data-match={r.candidatoId} className="rounded-xl border border-line bg-card">
            <div className="flex items-start gap-3 p-3">
              {onEnviar && (
                <input
                  type="checkbox"
                  aria-label={`Seleccionar a ${c.nombre}`}
                  className="mt-2.5 h-4 w-4 accent-[var(--brand-blue)]"
                  checked={marcados.has(c.id)}
                  onChange={(e) => {
                    const n = new Set(marcados);
                    if (e.target.checked) n.add(c.id);
                    else n.delete(c.id);
                    setMarcados(n);
                  }}
                />
              )}
              <ScoreBadge score={r.score} grande />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2">
                  <button
                    type="button"
                    onClick={() => onAbrir?.(c.id)}
                    className="text-left text-[13.5px] font-bold text-[var(--text)] hover:underline"
                  >
                    {c.nombre}
                  </button>
                  <span className="text-[12px] text-[var(--text-3)]">
                    {c.titular} · {c.ubicacion.departamento ?? nombrePais(c.ubicacion.pais)} · ${c.pretension}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {r.cumple.map((t) => (
                    <span key={t} className="rounded-full bg-[var(--brand-green)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-green)]">
                      {t}
                    </span>
                  ))}
                  {r.falta.map((t) => (
                    <span key={t} className="rounded-full bg-[var(--brand-red)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-red)]">
                      Falta: {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {onEnviar && (
                  <Boton onClick={() => onEnviar([c.id])} title="Mandar al pipeline de esta vacante">
                    <Send size={13} />
                  </Boton>
                )}
                <button
                  type="button"
                  aria-label="Ver el puntaje por criterio"
                  onClick={() => setAbierto(expandido ? null : c.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-surface"
                >
                  <ChevronDown size={16} className={cn("transition", expandido && "rotate-180")} />
                </button>
              </div>
            </div>
            {expandido && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-line px-4 py-3 sm:grid-cols-4">
                {r.detalle.map((d) => (
                  <div key={d.criterio}>
                    <div className="flex justify-between text-[11px] text-[var(--text-3)]">
                      <span>{NOMBRE_CRITERIO[d.criterio]}</span>
                      <b className="text-[var(--text)]">
                        {d.puntos}/{PESOS[d.criterio]}
                      </b>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-surface">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(d.puntos / d.maximo) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
