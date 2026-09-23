"use client";

// Tablero de BetMe: como va el reclutamiento, no la actividad de la bandeja.

import Link from "next/link";
import {
  Briefcase,
  CalendarCheck,
  Handshake,
  Inbox,
  Timer,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ETAPAS, nombreEtapa, nombreTipoEntrevista } from "@/lib/talento/catalogo";
import {
  aceptacionDeOfertas,
  diasEnEtapa,
  diasParaContratar,
  embudo,
  porFuente,
  tiempoPromedioContratacion,
} from "@/lib/talento/metricas";
import { diaSv, diasEntre, fechaCortaSv, horaSv, lunesDe, sumarDias } from "@/lib/talento/fechas";
import { useTalento } from "@/lib/talento/store";
import { Encabezado, Seccion, nombreStaff } from "@/components/talento/ui";

export function BetmeDashboard() {
  const estado = useTalento();
  const { state } = useStore();
  if (!estado) return <div className="flex-1 animate-pulse bg-surface" />;

  const ahora = new Date();
  const hoy = diaSv(ahora);
  const lunes = lunesDe(hoy);
  const viernes = sumarDias(lunes, 4);
  const abiertas = estado.vacantes.filter((v) => v.estado === "abierta");
  const idsAbiertas = new Set(abiertas.map((v) => v.id));
  const activas = estado.postulaciones.filter((p) => p.etapa !== "descartado" && p.etapa !== "contratado");
  const enAbiertas = activas.filter((p) => idsAbiertas.has(p.vacanteId));
  const semana = estado.entrevistas.filter((e) => {
    const d = diaSv(e.inicio);
    return d >= lunes && d <= viernes && e.estado !== "cancelada";
  });
  const ofertas = estado.postulaciones.filter((p) => p.etapa === "oferta");
  const tth = tiempoPromedioContratacion(estado.postulaciones);
  const aceptacion = aceptacionDeOfertas(estado.postulaciones);
  const contratados60 = estado.postulaciones.filter((p) => {
    const h = p.historial.find((x) => x.etapa === "contratado");
    return h && diasEntre(h.ts, ahora.toISOString()) <= 60;
  }).length;
  const sinAsignar = state.conversations.filter((c) => !c.asignadoA && c.estado !== "resuelto").length;

  const pasos = embudo(estado.postulaciones);
  const max = Math.max(1, ...pasos.map((p) => p.cuantos));
  const fuentes = porFuente(estado);
  const cand = new Map(estado.candidatos.map((c) => [c.id, c]));
  const vac = new Map(estado.vacantes.map((v) => [v.id, v]));
  const post = new Map(estado.postulaciones.map((p) => [p.id, p]));

  const proximas = estado.entrevistas
    .filter((e) => e.estado === "programada" && e.inicio >= ahora.toISOString())
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .slice(0, 6);
  const frios = enAbiertas
    .map((p) => ({ p, dias: diasEnEtapa(p, ahora) }))
    .filter((x) => x.dias >= 5)
    .sort((a, b) => b.dias - a.dias);

  const contratacionesCerradas = estado.postulaciones
    .map((p) => ({ p, dias: diasParaContratar(p) }))
    .filter((x): x is { p: (typeof estado.postulaciones)[number]; dias: number } => x.dias !== null);

  return (
    <div className="flex h-full flex-col">
      <Encabezado titulo="Dashboard" detalle="Reclutamiento de BetMe Services" />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Vacantes abiertas" valor={abiertas.length} Icon={Briefcase} />
          <MetricCard label="Candidatos en proceso" valor={enAbiertas.length} Icon={Users} />
          <MetricCard label="Entrevistas esta semana" valor={semana.length} Icon={CalendarCheck} />
          <MetricCard label="Ofertas por resolver" valor={ofertas.length} Icon={Handshake} />
          <MetricCard label="Días para contratar (promedio)" valor={tth ?? "Sin datos"} Icon={Timer} />
          <MetricCard label="Ofertas aceptadas" valor={aceptacion === null ? "Sin datos" : `${aceptacion}%`} Icon={TrendingUp} />
          <MetricCard label="Contratados en 60 días" valor={contratados60} Icon={UserCheck} />
          <MetricCard label="Chats sin asignar" valor={sinAsignar} Icon={Inbox} />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Seccion titulo="Conversión por etapa">
            <div className="space-y-2.5">
              {pasos.map((p) => {
                const e = ETAPAS.find((x) => x.id === p.etapa)!;
                return (
                  <div key={p.etapa} className="flex items-center gap-3">
                    <span className="w-24 text-[12.5px] font-semibold text-[var(--text-2)]">{e.nombre}</span>
                    <div className="h-6 flex-1 rounded-lg bg-surface">
                      <div
                        className="flex h-full items-center justify-end rounded-lg px-2 text-[11.5px] font-bold text-white"
                        style={{ width: `${Math.max(8, (p.cuantos / max) * 100)}%`, backgroundColor: e.color }}
                      >
                        {p.cuantos}
                      </div>
                    </div>
                    <span className="w-12 text-right text-[12px] font-bold text-[var(--text-3)]">
                      {p.conversion === null ? "" : `${p.conversion}%`}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11.5px] text-[var(--text-3)]">
              Cuenta hasta dónde llegó cada postulación, aunque después la descartaran. El porcentaje es el paso desde la etapa anterior.
            </p>
          </Seccion>

          <Seccion titulo="De dónde vienen">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[11.5px] text-[var(--text-3)]">
                  <th className="pb-2 font-bold">Fuente</th>
                  <th className="pb-2 text-right font-bold">Candidatos</th>
                  <th className="pb-2 text-right font-bold">Entrevistados</th>
                  <th className="pb-2 text-right font-bold">Contratados</th>
                  <th className="pb-2 text-right font-bold">Tasa</th>
                </tr>
              </thead>
              <tbody>
                {fuentes.map((f) => (
                  <tr key={f.fuente} className="border-t border-line">
                    <td className="py-2 font-semibold text-[var(--text)]">{f.nombre}</td>
                    <td className="py-2 text-right text-[var(--text-2)]">{f.candidatos}</td>
                    <td className="py-2 text-right text-[var(--text-2)]">{f.entrevistados}</td>
                    <td className="py-2 text-right text-[var(--text-2)]">{f.contratados}</td>
                    <td className="py-2 text-right font-bold text-[var(--text)]">{Math.round((f.contratados / f.candidatos) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Seccion>

          <Seccion titulo="Vacantes abiertas">
            <ul className="space-y-3">
              {abiertas.map((v) => {
                const ps = enAbiertas.filter((p) => p.vacanteId === v.id);
                const dias = diasEntre(v.creada, ahora.toISOString());
                return (
                  <li key={v.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <Link href={`/talento?vacante=${v.id}`} className="truncate text-[13px] font-bold text-[var(--text)] hover:underline">
                        {v.titulo}
                      </Link>
                      <span className="shrink-0 text-[11.5px] text-[var(--text-3)]">
                        {ps.length} en proceso · abierta hace {dias} días
                      </span>
                    </div>
                    <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-surface">
                      {ETAPAS.filter((e) => e.id !== "descartado" && e.id !== "contratado").map((e) => {
                        const n = ps.filter((p) => p.etapa === e.id).length;
                        return n ? <div key={e.id} title={`${e.nombre}: ${n}`} style={{ flex: n, backgroundColor: e.color }} /> : null;
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Seccion>

          <Seccion titulo="Próximas entrevistas">
            {proximas.length === 0 && <p className="text-[13px] text-[var(--text-3)]">Nada agendado.</p>}
            <ul className="space-y-2">
              {proximas.map((e) => {
                const p = post.get(e.postulacionId)!;
                return (
                  <li key={e.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[var(--text)]">{cand.get(p.candidatoId)?.nombre}</p>
                      <p className="truncate text-[var(--text-3)]">
                        {nombreTipoEntrevista(e.tipo)} · {vac.get(p.vacanteId)?.titulo} · {nombreStaff(e.entrevistador)}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-[var(--brand-accent)]">
                      {fechaCortaSv(e.inicio)} {horaSv(e.inicio)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Seccion>

          <Seccion titulo="Sin moverse hace 5 días o más">
            {frios.length === 0 && <p className="text-[13px] text-[var(--text-3)]">Todo el pipeline se está moviendo.</p>}
            <ul className="space-y-2">
              {frios.map(({ p, dias }) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <span className="min-w-0 truncate">
                    <b className="text-[var(--text)]">{cand.get(p.candidatoId)?.nombre}</b>{" "}
                    <span className="text-[var(--text-3)]">· {vac.get(p.vacanteId)?.titulo}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-[var(--brand-red)]">
                    {dias} días en {nombreEtapa(p.etapa).toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          </Seccion>

          <Seccion titulo="Contrataciones cerradas">
            <ul className="space-y-2">
              {contratacionesCerradas.map(({ p, dias }) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <span className="min-w-0 truncate">
                    <b className="text-[var(--text)]">{cand.get(p.candidatoId)?.nombre}</b>{" "}
                    <span className="text-[var(--text-3)]">· {vac.get(p.vacanteId)?.titulo} · {vac.get(p.vacanteId)?.cliente}</span>
                  </span>
                  <span className="shrink-0 font-bold text-[var(--text)]">{dias} días</span>
                </li>
              ))}
            </ul>
          </Seccion>
        </div>
      </div>
    </div>
  );
}
