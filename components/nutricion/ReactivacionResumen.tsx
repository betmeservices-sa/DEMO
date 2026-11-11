"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AGENDA_INFO, pct } from "@/lib/nutricion/format";
import { RANGOS, rangoDe, REACTIVACION_TOTALES, REACTIVACIONES } from "@/lib/nutricion/seed";
import type { Agenda } from "@/lib/nutricion/types";
import { AgendaPill, Card, Embudo } from "./ui";

/**
 * Reactivación en el dashboard: cuántos pacientes sin control o con el plan
 * vencido hay en cada rango y cuántos faltan por contactar, más el embudo de la
 * campaña. En la vista semanal el embudo va por calendario.
 */
export function ReactivacionResumen({ agendas, vista }: { agendas: Agenda[]; vista: "dia" | "semana" }) {
  const lista = REACTIVACIONES.filter((r) => agendas.includes(r.agenda));
  const t = agendas.reduce(
    (acc, a) => ({
      d: acc.d + REACTIVACION_TOTALES[a].detectados,
      c: acc.c + REACTIVACION_TOTALES[a].contactados,
      r: acc.r + REACTIVACION_TOTALES[a].respondieron,
      ci: acc.ci + REACTIVACION_TOTALES[a].citas,
    }),
    { d: 0, c: 0, r: 0, ci: 0 },
  );

  return (
    <Card
      title="Reactivación"
      sub="Pacientes sin control y planes vencidos · consultas y entregas por separado"
      action={
        <Link href="/demonutricion/reactivacion" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand hover:underline">
          Enviar mensajes <ArrowRight size={13} />
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {RANGOS.map((r) => {
          const del = lista.filter((x) => rangoDe(x.diasInactivo) === r.id);
          const sinContactar = del.filter((x) => x.estado === "detectado").length;
          return (
            <div key={r.id} className="rounded-xl border border-line bg-surface p-3">
              <p className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-3)]">{r.label}</p>
              <p className="mt-1 text-[24px] font-extrabold leading-none">{del.length}</p>
              <p className="mt-1 text-[12px] text-[var(--text-2)]">
                {sinContactar} sin contactar · {del.length - sinContactar} contactados
              </p>
              <div className="mt-2 flex gap-1">
                {agendas.map((a) => (
                  <span key={a} className="rounded-md px-1.5 py-0.5 text-[10.5px] font-bold" style={{ backgroundColor: AGENDA_INFO[a].soft, color: AGENDA_INFO[a].color }}>
                    {AGENDA_INFO[a].label} {del.filter((x) => x.agenda === a).length}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-[var(--text-3)]">{r.detalle}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {vista === "dia" ? (
          <div className="lg:col-span-2">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">Embudo de la campaña</p>
            <Embudo color="var(--brand-blue)" pasos={[{ label: "Detectados", valor: t.d }, { label: "Contactados", valor: t.c }, { label: "Respondieron", valor: t.r }, { label: "Citas o renovaciones", valor: t.ci }]} />
          </div>
        ) : (
          agendas.map((a) => {
            const x = REACTIVACION_TOTALES[a];
            return (
              <div key={a}>
                <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">
                  <AgendaPill agenda={a} /> Embudo de la campaña
                </p>
                <Embudo color={AGENDA_INFO[a].color} pasos={[{ label: "Detectados", valor: x.detectados }, { label: "Contactados", valor: x.contactados }, { label: "Respondieron", valor: x.respondieron }, { label: a === "consultas" ? "Citas" : "Renovaron", valor: x.citas }]} />
                <p className="mt-2 text-[11.5px] text-[var(--text-3)]">
                  {pct(x.citas, x.contactados)}% de los contactados {a === "consultas" ? "agendó" : "renovó"} · {x.excluidos} pidieron no recibir más
                </p>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
