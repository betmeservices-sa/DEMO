"use client";

import { useState } from "react";
import { AlertTriangle, Check, PencilLine } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { ALERGENOS, conflictos, opcionesDe } from "@/lib/nutricion/cocina";
import type { Alergeno, Plato, Tiempo } from "@/lib/nutricion/types";

/**
 * Opciones del plan por tiempo de comida: la nutricionista elige qué
 * desayunos, almuerzos, cenas y meriendas puede recibir el paciente (la cocina
 * los rota de lunes a sábado) y escribe el cambio de un plato cuando hace
 * falta. Un plato que trae una de sus alergias solo se puede usar con el
 * cambio escrito.
 */
export function OpcionesPlan({
  tiempos,
  noIncluidos = [],
  alergias,
  opciones,
  ajustes,
  onChange,
}: {
  tiempos: Tiempo[];
  /** Tiempos que se sugieren pero no van incluidos en el plan (se marcan con *). */
  noIncluidos?: Tiempo[];
  alergias: Alergeno[];
  opciones: Partial<Record<Tiempo, string[]>>;
  ajustes: Record<string, string>;
  onChange: (opciones: Partial<Record<Tiempo, string[]>>, ajustes: Record<string, string>) => void;
}) {
  // Plato con el cuadro de cambio abierto (tiempo|id).
  const [editando, setEditando] = useState<string | null>(null);
  const alternar = (t: Tiempo, id: string) => {
    const actual = opciones[t] ?? [];
    const quita = actual.includes(id);
    onChange({ ...opciones, [t]: quita ? actual.filter((x) => x !== id) : [...actual, id] }, ajustes);
    // Si trae una alergia, abre el cuadro para escribir el cambio.
    if (!quita && conflictos(opcionesDe(t).find((x) => x.id === id)!, alergias).length) setEditando(`${t}|${id}`);
  };
  const escribir = (id: string, texto: string) => {
    const n = { ...ajustes };
    if (texto) n[id] = texto;
    else delete n[id];
    onChange(opciones, n);
  };

  return (
    <div className="space-y-5">
      {tiempos.map((t) => {
        const elegidos = opciones[t] ?? [];
        const fuera = noIncluidos.includes(t);
        return (
          <div key={t} className={cn(fuera && "rounded-xl border border-dashed border-line p-3")}>
            <p className={cn("mb-2 flex flex-wrap items-baseline gap-2 text-[12px] font-bold uppercase tracking-wider", fuera ? "text-[var(--text-3)]" : "text-[var(--consultas)]")}>
              {t}
              {fuera && "*"}
              <span className="font-semibold normal-case tracking-normal text-[var(--text-3)]">
                {fuera
                  ? "No incluido en el plan: sugerencia para que el cliente lo prepare en casa"
                  : elegidos.length
                    ? `${elegidos.length} opción${elegidos.length === 1 ? "" : "es"} elegida${elegidos.length === 1 ? "" : "s"}`
                    : "Elige al menos una"}
              </span>
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {opcionesDe(t).map((pl) => (
                <Opcion
                  key={pl.id}
                  pl={pl}
                  on={elegidos.includes(pl.id)}
                  malo={conflictos(pl, alergias)}
                  ajuste={ajustes[pl.id] ?? ""}
                  abierto={editando === `${t}|${pl.id}`}
                  alternar={() => alternar(t, pl.id)}
                  abrir={() => setEditando(editando === `${t}|${pl.id}` ? null : `${t}|${pl.id}`)}
                  escribir={(x) => escribir(pl.id, x)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Opcion({
  pl,
  on,
  malo,
  ajuste,
  abierto,
  alternar,
  abrir,
  escribir,
}: {
  pl: Plato;
  on: boolean;
  malo: Alergeno[];
  ajuste: string;
  abierto: boolean;
  alternar: () => void;
  abrir: () => void;
  escribir: (t: string) => void;
}) {
  // Elegido con alergia y sin cambio escrito: no se puede servir.
  const falta = on && malo.length > 0 && !ajuste.trim();
  return (
    <div className={cn("rounded-xl border p-2.5", falta ? "border-rose-400 bg-rose-50" : on ? "border-[var(--consultas)] bg-[var(--consultas-soft)]/60" : "border-line")}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={alternar}
          aria-pressed={on}
          aria-label={on ? `Quitar ${pl.nombre}` : `Elegir ${pl.nombre}`}
          className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2", on ? "border-[var(--consultas)] bg-[var(--consultas)] text-white" : "border-[var(--border-2)] hover:border-[var(--consultas)]")}
        >
          {on && <Check size={13} strokeWidth={3} />}
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={alternar} className="text-left text-[13px] font-bold leading-snug">
            {pl.numero ? `${pl.numero}. ` : ""}
            {pl.nombre}
          </button>
          {pl.componentes && (
            <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--text-3)]">
              {pl.componentes.proteina} · {pl.componentes.carbohidrato} · {pl.componentes.vegetales} · {pl.componentes.grasa}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {malo.length > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded bg-rose-100 px-1.5 py-0.5 text-[10.5px] font-bold text-rose-700">
                <AlertTriangle size={10} /> Trae {malo.map((a) => ALERGENOS[a].toLowerCase()).join(", ")}
              </span>
            )}
            {on && (
              <button type="button" onClick={abrir} className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand hover:underline">
                <PencilLine size={11} /> {ajuste ? "Editar cambio" : malo.length ? "Escribir el cambio (obligatorio)" : "Escribir un cambio"}
              </button>
            )}
          </div>
          {on && ajuste && !abierto && <p className="mt-1 rounded-md bg-card px-2 py-1 text-[12px] font-semibold text-[var(--text)]">✎ {ajuste}</p>}
          {on && abierto && (
            <textarea
              autoFocus
              value={ajuste}
              onChange={(e) => escribir(e.target.value)}
              rows={2}
              placeholder={malo.length ? `Ej. sin ${ALERGENOS[malo[0]].toLowerCase()}: cambiar por…` : "Ej. sin cebolla, doble porción de vegetales…"}
              className="mt-1.5 w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[var(--consultas)]"
            />
          )}
          {falta && <p className="mt-1 text-[11.5px] font-semibold text-rose-700">Escribe qué cambiar para que sea seguro, o quítalo.</p>}
        </div>
      </div>
    </div>
  );
}
