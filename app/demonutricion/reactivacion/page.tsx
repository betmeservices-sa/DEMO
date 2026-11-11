"use client";

import { useState } from "react";
import { CalendarPlus, MessageCircleReply, Send, UserRoundSearch } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { AGENDA_INFO, pct } from "@/lib/nutricion/format";
import { cliente, RANGOS, rangoDe, REACTIVACION_TOTALES, REACTIVACIONES } from "@/lib/nutricion/seed";
import { pasaFiltro, useStore } from "@/lib/nutricion/store";
import type { Agenda, EstadoReactivacion, RangoInactividad, Reactivacion } from "@/lib/nutricion/types";
import { AgendaPill, Card, Embudo, FiltroAgendaToggle, MetricCard, PageHeader } from "@/components/nutricion/ui";

const ESTADO: Record<EstadoReactivacion, { label: string; className: string }> = {
  detectado: { label: "Sin contactar", className: "bg-slate-100 text-slate-700" },
  contactado: { label: "Contactado", className: "bg-sky-50 text-sky-700" },
  respondio: { label: "Respondió", className: "bg-violet-50 text-violet-700" },
  cita: { label: "Agendó o renovó", className: "bg-emerald-50 text-emerald-700" },
  no_interesado: { label: "Ahora no", className: "bg-rose-50 text-rose-700" },
};

/** Plantilla que recibe cada paciente según el calendario. */
const PLANTILLA: Record<Agenda, string> = { consultas: "reactivacion_consulta", entregas: "renovacion_plan" };

function tiempo(dias: number) {
  if (dias < 30) return `${dias} días`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "1 mes" : `${meses} meses`;
}

export default function ReactivacionPage() {
  const { filtro } = useStore();
  const [lista, setLista] = useState<Reactivacion[]>(REACTIVACIONES);
  const [rango, setRango] = useState<RangoInactividad>("15d");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState<string | null>(null);

  const agendas = (["consultas", "entregas"] as Agenda[]).filter((a) => pasaFiltro(filtro, a));
  const t = agendas.reduce(
    (acc, a) => ({
      detectados: acc.detectados + REACTIVACION_TOTALES[a].detectados,
      contactados: acc.contactados + REACTIVACION_TOTALES[a].contactados,
      respondieron: acc.respondieron + REACTIVACION_TOTALES[a].respondieron,
      citas: acc.citas + REACTIVACION_TOTALES[a].citas,
    }),
    { detectados: 0, contactados: 0, respondieron: 0, citas: 0 },
  );

  const enAgenda = lista.filter((r) => pasaFiltro(filtro, r.agenda));
  const delRango = enAgenda.filter((r) => rangoDe(r.diasInactivo) === rango).sort((a, b) => b.diasInactivo - a.diasInactivo);
  // Solo se puede enviar a quien no se ha contactado todavía.
  const enviables = delRango.filter((r) => r.estado === "detectado");
  const seleccionados = enviables.filter((r) => sel.has(r.id));
  const todos = enviables.length > 0 && seleccionados.length === enviables.length;

  const cambiarRango = (r: RangoInactividad) => {
    setRango(r);
    setSel(new Set());
    setAviso(null);
  };

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const enviar = () => {
    const ids = seleccionados.map((r) => r.id);
    setLista((l) => l.map((r) => (ids.includes(r.id) ? { ...r, estado: "contactado" } : r)));
    const porAgenda = (["consultas", "entregas"] as Agenda[])
      .map((a) => [a, seleccionados.filter((r) => r.agenda === a).length] as const)
      .filter(([, n]) => n > 0)
      .map(([a, n]) => `${n} con ${PLANTILLA[a]}`)
      .join(" y ");
    setAviso(`Mensaje enviado a ${ids.length} ${ids.length === 1 ? "cliente" : "clientes"} (${porAgenda}).`);
    setSel(new Set());
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader title="Reactivación de pacientes" sub="Pacientes sin control reciente y planes vencidos sin renovar · cada uno con su mensaje" right={<FiltroAgendaToggle />} />
      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard Icon={UserRoundSearch} valor={t.detectados} label="Inactivos detectados" />
          <MetricCard Icon={Send} valor={t.contactados} label="Contactados" hint={`${pct(t.contactados, t.detectados)}% de los detectados`} />
          <MetricCard Icon={MessageCircleReply} valor={t.respondieron} label="Respondieron" hint={`${pct(t.respondieron, t.contactados)}% de los contactados`} />
          <MetricCard Icon={CalendarPlus} valor={t.citas} label="Citas o renovaciones" hint={`${pct(t.citas, t.contactados)}% de los contactados`} />
        </div>

        <Card title="¿A quién le mandamos el mensaje?" sub="Escoge cuánto tiempo lleva el paciente sin control (consultas) o con el plan vencido (entregas)">
          <div className="grid gap-2 sm:grid-cols-3">
            {RANGOS.map((r) => {
              const n = enAgenda.filter((x) => rangoDe(x.diasInactivo) === r.id).length;
              const sinContactar = enAgenda.filter((x) => rangoDe(x.diasInactivo) === r.id && x.estado === "detectado").length;
              const activo = rango === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => cambiarRango(r.id)}
                  className={cn("rounded-xl border-2 p-3 text-left transition", activo ? "border-brand bg-brand/5" : "border-line hover:border-[var(--border-2)]")}
                >
                  <p className={cn("text-[16px] font-extrabold", activo && "text-brand")}>{r.label}</p>
                  <p className="text-[12px] text-[var(--text-3)]">{r.detalle}</p>
                  <p className="mt-1.5 text-[12.5px] font-semibold text-[var(--text-2)]">
                    {n} clientes · {sinContactar} sin contactar
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--brand-blue)]"
                checked={todos}
                disabled={enviables.length === 0}
                onChange={() => setSel(todos ? new Set() : new Set(enviables.map((r) => r.id)))}
              />
              Seleccionar todos los sin contactar ({enviables.length})
            </label>
            <button
              type="button"
              onClick={enviar}
              disabled={seleccionados.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[13px] font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={14} /> Enviar mensaje de reactivación{seleccionados.length > 0 ? ` (${seleccionados.length})` : ""}
            </button>
          </div>
          {aviso && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] font-semibold text-emerald-700">{aviso}</p>}

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="text-[11px] uppercase tracking-wider text-[var(--text-3)]">
                <tr>
                  <th className="w-8 py-2" />
                  <th className="py-2 pr-3">Cliente</th>
                  <th className="py-2 pr-3">Objetivo</th>
                  <th className="py-2 pr-3">Calendario</th>
                  <th className="py-2 pr-3">Último servicio</th>
                  <th className="py-2 pr-3">Hace</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {delRango.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-[var(--text-3)]">Nadie en este rango con el filtro actual.</td>
                  </tr>
                )}
                {delRango.map((r) => {
                  const puede = r.estado === "detectado";
                  return (
                    <tr key={r.id} className={cn(sel.has(r.id) && "bg-brand/5")}>
                      <td className="py-2.5">
                        <input type="checkbox" className="h-4 w-4 accent-[var(--brand-blue)]" checked={sel.has(r.id)} disabled={!puede} onChange={() => toggle(r.id)} aria-label={`Seleccionar ${cliente(r.clienteId).nombre}`} />
                      </td>
                      <td className="py-2.5 pr-3 font-semibold">{cliente(r.clienteId).nombre}</td>
                      <td className="max-w-[200px] truncate py-2.5 pr-3 text-[var(--text-2)]">{cliente(r.clienteId).objetivo}</td>
                      <td className="py-2.5 pr-3"><AgendaPill agenda={r.agenda} /></td>
                      <td className="py-2.5 pr-3 text-[var(--text-2)]">{r.ultimoServicio}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{tiempo(r.diasInactivo)}</td>
                      <td className="py-2.5">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", ESTADO[r.estado].className)}>{ESTADO[r.estado].label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11.5px] text-[var(--text-3)]">
            Consultas recibe reactivacion_consulta y Entregas recibe renovacion_plan. Se excluye a quien ya tiene cita o plan vigente, o pidió no recibir más mensajes. El precio y el enlace de pago los envía el equipo.
          </p>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          {agendas.map((a) => {
            const x = REACTIVACION_TOTALES[a];
            return (
              <Card key={a} title={<span className="flex items-center gap-2"><AgendaPill agenda={a} /> {a === "consultas" ? "Vuelta a control" : "Renovación de plan"}</span>} sub={`Plantilla ${PLANTILLA[a]}`}>
                <Embudo
                  color={AGENDA_INFO[a].color}
                  pasos={[
                    { label: "Detectados", valor: x.detectados },
                    { label: "Contactados", valor: x.contactados },
                    { label: "Respondieron", valor: x.respondieron },
                    { label: a === "consultas" ? "Citas" : "Renovaron", valor: x.citas },
                  ]}
                />
                <p className="mt-3 text-[11.5px] text-[var(--text-3)]">{x.excluidos} pidieron no recibir más.</p>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
