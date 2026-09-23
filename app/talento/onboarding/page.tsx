"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar, inicialesDe } from "@/components/ui/Avatar";
import { diaSv, diasEntre, fechaCortaSv } from "@/lib/talento/fechas";
import { despachar, useTalento } from "@/lib/talento/store";
import { Boton, Capa, Encabezado, useSoloBetme } from "@/components/talento/ui";
import { FichaCandidato } from "@/components/talento/FichaCandidato";

export default function OnboardingPage() {
  const es = useSoloBetme();
  const estado = useTalento();
  const [fichaId, setFichaId] = useState<string | null>(null);

  if (!es) return <div className="flex-1 bg-surface" />;
  if (!estado) return <div className="flex-1 animate-pulse bg-surface" />;

  const hoy = diaSv(new Date());
  const filas = estado.onboarding
    .map((o) => {
      const p = estado.postulaciones.find((x) => x.id === o.postulacionId)!;
      const c = estado.candidatos.find((x) => x.id === p.candidatoId)!;
      const v = estado.vacantes.find((x) => x.id === p.vacanteId)!;
      const hechas = o.tareas.filter((t) => t.hecha).length;
      return { o, c, v, hechas, total: o.tareas.length };
    })
    // Primero lo que falta, y dentro de eso lo que arranca antes.
    .sort((a, b) => Number(a.hechas === a.total) - Number(b.hechas === b.total) || a.o.inicio.localeCompare(b.o.inicio));

  const enCurso = filas.filter((f) => f.hechas < f.total).length;
  const ficha = fichaId ? estado.candidatos.find((c) => c.id === fichaId) : null;

  return (
    <div className="flex h-full flex-col">
      <Encabezado titulo="Onboarding" detalle={`${enCurso} en curso · ${filas.length - enCurso} completos`} />
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {filas.length === 0 && <p className="py-10 text-center text-[13px] text-[var(--text-3)]">Nadie contratado todavía.</p>}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filas.map(({ o, c, v, hechas, total }) => {
            const faltan = diasEntre(`${hoy}T00:00:00Z`, `${o.inicio}T00:00:00Z`);
            const cuando = faltan > 0 ? `Arranca en ${faltan} ${faltan === 1 ? "día" : "días"}` : faltan === 0 ? "Arranca hoy" : `Lleva ${-faltan} días`;
            const pct = Math.round((hechas / total) * 100);
            return (
              <div key={o.postulacionId} data-onboarding={o.postulacionId} className="rounded-2xl border border-line bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Avatar iniciales={inicialesDe(c.nombre)} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-[var(--text)]">{c.nombre}</p>
                    <p className="text-[12.5px] text-[var(--text-3)]">
                      {v.titulo} · {v.cliente}
                    </p>
                    <p className="mt-0.5 text-[12px] font-semibold text-[var(--brand-accent)]">
                      {fechaCortaSv(o.inicio)} · {cuando}
                    </p>
                  </div>
                  <Boton onClick={() => setFichaId(c.id)}>Perfil</Boton>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-surface">
                    <div className={cn("h-full rounded-full", pct === 100 ? "bg-[var(--brand-green)]" : "bg-brand")} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[12px] font-bold text-[var(--text-2)]">
                    {hechas}/{total}
                  </span>
                </div>
                <ul className="mt-3 space-y-1">
                  {o.tareas.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => despachar({ type: "TAREA_ONBOARDING", postulacionId: o.postulacionId, tareaId: t.id })}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition hover:bg-surface"
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                            t.hecha ? "border-[var(--brand-green)] bg-[var(--brand-green)] text-white" : "border-[var(--border-2)]",
                          )}
                        >
                          {t.hecha && <Check size={13} strokeWidth={3} />}
                        </span>
                        <span className={cn(t.hecha ? "text-[var(--text-3)] line-through" : "text-[var(--text)]")}>{t.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <Capa abierta={Boolean(ficha)} onCerrar={() => setFichaId(null)} titulo="Perfil del candidato">
        {ficha && <FichaCandidato candidato={ficha} estado={estado} />}
      </Capa>
    </div>
  );
}
