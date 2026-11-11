"use client";

import { CalendarDays, Download, Printer } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { COMIDAS_PLAN, incluido, NO_INCLUIDOS, plato, semanaTexto } from "@/lib/nutricion/cocina";
import { diaCorto, PLAN_INFO } from "@/lib/nutricion/format";
import { descargarPlan, imprimirPlan, TIEMPOS as TIEMPOS_SEMANA } from "@/lib/nutricion/planSemanalPdf";
import type { Orden, PlanAlimentacion } from "@/lib/nutricion/types";

/**
 * Plan alimenticio de la semana en formato calendario, para la nutricionista:
 * los días en columnas y los tiempos de comida en filas (con las meriendas),
 * con los cambios escritos. Se puede imprimir o descargar en PDF.
 */
export function CalendarioSemana({ o, p }: { o: Orden; p: PlanAlimentacion }) {
  const tiempos = TIEMPOS_SEMANA.filter((t) => o.dias.some((d) => d.items.some((i) => i.tiempo === t)));
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[14px] font-bold">
            <CalendarDays size={15} /> Plan alimenticio · {semanaTexto(o.semana)}
          </p>
          <p className="text-[12px] text-[var(--text-3)]">
            {PLAN_INFO[o.plan].label} · {COMIDAS_PLAN[o.plan]} · {o.dias.length} días
          </p>
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => imprimirPlan(o, p)} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] font-semibold hover:bg-surface">
            <Printer size={14} /> Imprimir
          </button>
          <button type="button" onClick={() => descargarPlan(o, p)} className="inline-flex items-center gap-1 rounded-lg bg-[var(--consultas)] px-2.5 py-1.5 text-[12.5px] font-bold text-white hover:opacity-90">
            <Download size={14} /> Descargar PDF
          </button>
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-[12px]">
          <thead>
            <tr>
              <th className="w-[92px] p-1.5" />
              {o.dias.map((d) => {
                const dc = diaCorto(d.dia);
                return (
                  <th key={d.dia} className={cn("rounded-t-lg p-1.5 text-center text-[11.5px] font-bold", d.dia === 0 ? "bg-[var(--consultas)] text-white" : "bg-[var(--consultas-soft)] text-[var(--consultas)]")}>
                    {dc.nombre} {dc.num}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {tiempos.map((t) => {
              const merienda = t.startsWith("Merienda");
              const fuera = !incluido(t, o.plan);
              return (
                <tr key={t} className={cn("border-t border-line align-top", (merienda || fuera) && "bg-surface/70", fuera && "text-[var(--text-3)]")}>
                  <th className={cn("p-1.5 text-[10.5px] font-bold uppercase tracking-wide", merienda || fuera ? "text-[var(--text-3)]" : "text-[var(--consultas)]")}>
                    {t}
                    {fuera && "*"}
                  </th>
                  {o.dias.map((d) => {
                    const it = d.items.find((i) => i.tiempo === t);
                    return (
                      <td key={d.dia} className="border-l border-line p-1.5 leading-snug">
                        {it ? (
                          <>
                            <span className={cn(fuera ? "italic" : "font-semibold")}>{plato(it.platoId).nombre}</span>
                            {it.ajuste && <span className="mt-0.5 block text-[11px] font-semibold text-violet-700">✎ {it.ajuste}</span>}
                          </>
                        ) : (
                          <span className="text-[var(--text-3)]">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11.5px] text-[var(--text-3)]">
        {NO_INCLUIDOS[o.plan].length ? `* ${NO_INCLUIDOS[o.plan].join(", ")}: no incluido en el plan ${PLAN_INFO[o.plan].label}, es una sugerencia para que el cliente lo prepare en casa. ` : ""}
        Las meriendas las ve el cliente por aparte; lo demás lo prepara la cocina. ✎ = cambio escrito por la nutricionista.
      </p>
    </div>
  );
}
