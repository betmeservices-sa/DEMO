"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, MapPin, Search, ThumbsDown, ThumbsUp, Truck } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { ALERGENOS, COCINA_PLAN, conPlan, enCocina, plato, semanaTexto } from "@/lib/nutricion/cocina";
import { etiquetaDia, PLAN_INFO } from "@/lib/nutricion/format";
import { finDelPlan } from "@/lib/nutricion/seed";
import { useStore } from "@/lib/nutricion/store";
import type { Alergeno } from "@/lib/nutricion/types";
import { PageHeader } from "@/components/nutricion/ui";
import { ESTADO_DIA, ESTADO_ORDEN } from "@/components/nutricion/cocinaUi";

// Perfiles de clientes para la cocina: lo que hay que saber para cocinarle a
// cada uno (plan, porción, alergias, gustos, opciones del menú con sus cambios
// escritos, entrega) y su paquete semanal día por día.
// No muestra datos de salud: eso queda con la nutricionista.

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function PerfilesPage() {
  const { planesAlim, ordenes, clientesVersion } = useStore();
  const [q, setQ] = useState("");
  const [alergia, setAlergia] = useState<"todas" | Alergeno>("todas");
  const filas = useMemo(
    () =>
      conPlan(planesAlim)
        .filter(({ c }) => finDelPlan(c) >= 0)
        .filter(({ c }) => !q.trim() || norm(c.nombre).includes(norm(q.trim())))
        .filter(({ p }) => alergia === "todas" || p.alergias.includes(alergia))
        .sort((a, b) => b.p.alergias.length - a.p.alergias.length || a.c.nombre.localeCompare(b.c.nombre)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [planesAlim, q, alergia, clientesVersion],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Link href="/demonutricion/cocina" aria-label="Volver a Órdenes" className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-[var(--text-2)] hover:bg-surface">
              <ChevronLeft size={16} />
            </Link>
            Perfiles de clientes
          </span>
        }
        sub="Plan, porción, alergias y gustos de cada cliente con comida a domicilio. Lo define la nutricionista." />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[220px] flex-1 items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 sm:max-w-xs">
            <Search size={14} className="text-[var(--text-3)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" />
          </div>
          <label className={cn("flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-[12.5px]", alergia === "todas" ? "border-line" : "border-rose-300 bg-rose-50")}>
            <span className="font-semibold text-[var(--text-3)]">Alergia:</span>
            <select value={alergia} onChange={(e) => setAlergia(e.target.value as typeof alergia)} className="bg-transparent font-semibold outline-none">
              <option value="todas">Todas</option>
              {(Object.keys(ALERGENOS) as Alergeno[]).map((a) => (
                <option key={a} value={a}>
                  {ALERGENOS[a]}
                </option>
              ))}
            </select>
          </label>
          <span className="ml-auto text-[12.5px] text-[var(--text-3)]">{filas.length} clientes con plan vigente</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {filas.map(({ c, p }) => {
            const proximas = ordenes.filter((o) => o.clienteId === c.id).sort((a, b) => a.semana - b.semana);
            return (
              <section key={c.id} id={c.id} className={cn("scroll-mt-4 rounded-2xl border bg-card p-4 shadow-sm", p.alergias.length ? "border-rose-200" : "border-line")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold">{c.nombre}</p>
                    <p className="text-[12px] text-[var(--text-3)]">
                      {PLAN_INFO[p.plan].label} · porción {p.porcion.toLowerCase()} · {p.kcal} kcal · {p.proteinaG} g proteína
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-surface px-1.5 py-0.5 text-[10.5px] font-semibold text-[var(--text-2)]">{PLAN_INFO[p.plan].label}</span>
                </div>

                {p.alergias.length > 0 ? (
                  <p className="mt-2 flex flex-wrap items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[12.5px] font-bold text-rose-700">
                    <AlertTriangle size={13} /> Alergia: {p.alergias.map((a) => ALERGENOS[a]).join(", ")}
                  </p>
                ) : (
                  <p className="mt-2 rounded-lg bg-surface px-2.5 py-1.5 text-[12.5px] text-[var(--text-3)]">Sin alergias registradas</p>
                )}

                <div className="mt-2 grid gap-1 text-[12.5px]">
                  {p.noLeGusta.length > 0 && (
                    <p className="flex items-start gap-1.5">
                      <ThumbsDown size={13} className="mt-0.5 shrink-0 text-[var(--text-3)]" /> No le gusta: <b>{p.noLeGusta.join(", ")}</b>
                    </p>
                  )}
                  {p.leGusta.length > 0 && (
                    <p className="flex items-start gap-1.5">
                      <ThumbsUp size={13} className="mt-0.5 shrink-0 text-[var(--text-3)]" /> Le gusta: <b>{p.leGusta.join(", ")}</b>
                    </p>
                  )}
                  {p.notasCocina && <p className="rounded-lg border border-line px-2.5 py-1.5 text-[var(--text-2)]">{p.notasCocina}</p>}
                </div>

                <div className="mt-3">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">Opciones del menú · cocina {COCINA_PLAN[p.plan]}</p>
                  <ul className="space-y-1 text-[12.5px]">
                    {p.tiempos.filter((t) => enCocina(t, p.plan)).map((t) => (
                      <li key={t} className="flex gap-2">
                        <span className="w-24 shrink-0 font-semibold text-[var(--text-3)]">{t}</span>
                        <span className="min-w-0 flex-1 text-[var(--text-2)]">
                          {(p.opciones[t] ?? []).map((id, i) => (
                            <span key={id}>
                              {i > 0 && " / "}
                              {plato(id).nombre}
                              {p.ajustes[id] && <span className="font-semibold text-violet-700"> (✎ {p.ajustes[id]})</span>}
                            </span>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {c.plan && (
                  <div className="mt-3 space-y-0.5 border-t border-line pt-2.5 text-[12.5px] text-[var(--text-2)]">
                    <p className="flex items-start gap-1.5">
                      <MapPin size={13} className="mt-0.5 shrink-0 text-[var(--text-3)]" /> {c.plan.zona} · {c.plan.direccion}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Truck size={13} className="shrink-0 text-[var(--text-3)]" /> Entrega cerca de las {c.plan.horaEntrega}
                    </p>
                  </div>
                )}

                {proximas.map((o) => (
                  <details key={o.id} className="mt-2.5 rounded-xl border border-line" open={o.semana === 0}>
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-3 py-2 text-[12.5px] font-bold">
                      Paquete · {semanaTexto(o.semana)}
                      <Link href={`/demonutricion/cocina?orden=${o.id}`} className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 hover:opacity-80", ESTADO_ORDEN[o.estado].className)}>
                        {ESTADO_ORDEN[o.estado].label}
                      </Link>
                    </summary>
                    <div className="divide-y divide-line border-t border-line">
                      {o.dias.map((d) => (
                        <div key={d.dia} className="px-3 py-1.5 text-[12px]">
                          <p className="flex items-center justify-between gap-2 font-semibold">
                            {etiquetaDia(d.dia)} · {d.hora}
                            <span className={cn("rounded-full px-1.5 py-0.5 text-[10.5px]", ESTADO_DIA[d.estado].className)}>{ESTADO_DIA[d.estado].label}</span>
                          </p>
                          <p className="text-[var(--text-2)]">
                            {d.items.filter((i) => enCocina(i.tiempo, o.plan)).map((i) => (
                              <span key={i.tiempo} className="mr-2 inline-block">
                                <b className="text-[var(--text-3)]">{i.tiempo}:</b> {plato(i.platoId).nombre}
                                {i.ajuste ? <span className="text-violet-700"> ✎</span> : null}
                              </span>
                            ))}
                          </p>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
                <p className="mt-2 text-[11px] text-[var(--text-3)]">
                  Plan de {p.autor} · actualizado {p.actualizado.toLowerCase() === "hoy" ? "hoy" : `el ${p.actualizado}`}
                </p>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
