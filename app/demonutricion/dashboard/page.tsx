"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bot,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  Clock,
  Hourglass,
  Inbox,
  Moon,
  ClipboardCheck,
  Repeat,
  Timer,
  Truck,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { AGENDA_INFO, diaCorto, etiquetaDia, pct } from "@/lib/nutricion/format";
import { citasDe, ocupacion, proximosLibres } from "@/lib/nutricion/agenda";
import { CITAS, cliente, PLANTILLAS } from "@/lib/nutricion/seed";
import { DashboardResumen } from "@/components/nutricion/DashboardResumen";
import { ReactivacionResumen } from "@/components/nutricion/ReactivacionResumen";
import { UrgenciasEquipo } from "@/components/nutricion/UrgenciasEquipo";
import { pasaFiltro, useStore } from "@/lib/nutricion/store";
import type { Agenda } from "@/lib/nutricion/types";
import { Barra, Card, Embudo, EstadoCitaPill, FiltroAgendaToggle, MetricCard, PageHeader } from "@/components/nutricion/ui";

// Bandeja de la semana por agenda (demo). Las conversaciones sin agenda
// (preguntas generales) se cuentan dentro de "todas".
const BANDEJA: Record<Agenda, { canal: { whatsapp: number; instagram: number; facebook: number }; ia: number; transferidas: number; fueraHorario: number; motivos: Record<string, number> }> = {
  consultas: { canal: { whatsapp: 154, instagram: 52, facebook: 19 }, ia: 176, transferidas: 49, fueraHorario: 61, motivos: { "Para la nutricionista": 21, Urgencia: 2, "Cotización y pago": 17, "Pidió hablar con alguien": 9 } },
  entregas: { canal: { whatsapp: 188, instagram: 9, facebook: 4 }, ia: 178, transferidas: 23, fueraHorario: 34, motivos: { "Para la nutricionista": 4, Urgencia: 1, "Cotización y pago": 13, "Pidió hablar con alguien": 5 } },
};

type Vista = "resumen" | "secretaria" | "semana";

export default function DashboardPage() {
  const { filtro, conversaciones } = useStore();
  const [vista, setVista] = useState<Vista>("resumen");
  const agendas = (["consultas", "entregas"] as Agenda[]).filter((a) => pasaFiltro(filtro, a));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader
        title="Dashboard"
        sub={vista === "resumen" ? "Resumen del mes: consumo de IA, canales, publicaciones e intervenciones" : vista === "secretaria" ? "Operación del día · se actualiza en vivo" : "Resumen semanal · últimos 7 días"}
        right={
          <>
            <div className="inline-flex rounded-xl border border-line bg-card p-1 shadow-sm">
              {(["resumen", "secretaria", "semana"] as Vista[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVista(v)}
                  className={cn("rounded-lg px-3 py-1.5 text-[13px] font-semibold", vista === v ? "bg-[var(--text)] text-white" : "text-[var(--text-2)] hover:bg-surface")}
                >
                  {v === "resumen" ? "Resumen del mes" : v === "secretaria" ? "Hoy" : "Últimos 7 días"}
                </button>
              ))}
            </div>
            {vista !== "resumen" && <FiltroAgendaToggle />}
          </>
        }
      />
      <div className="space-y-5 p-6">
        {vista === "resumen" ? (
          <DashboardResumen />
        ) : (
          <>
            {vista === "semana" && agendas.includes("consultas") && <UrgenciasEquipo />}
            <CitasDelDia agendas={agendas} />
            {vista === "secretaria" ? <VistaDia agendas={agendas} transferidas={conversaciones.filter((c) => c.estado === "transferida" && (c.agenda === null || agendas.includes(c.agenda)))} /> : <VistaSemana agendas={agendas} />}
          </>
        )}
        <p className="text-center text-[11.5px] text-[var(--text-3)]">Sin montos de dinero ni cálculos de retorno: el dashboard mide operación y atención.</p>
      </div>
    </div>
  );
}

// Resumen de las consultas y entregas de hoy: cuáles ya se hicieron y cuáles
// faltan, por calendario, más lo que MIA agendó hoy en la bandeja.
function CitasDelDia({ agendas }: { agendas: Agenda[] }) {
  const { conversaciones } = useStore();
  const hoy = agendas.flatMap((a) => citasDe(a, 0)).sort((x, y) => x.hora.localeCompare(y.hora));
  const hechas = hoy.filter((c) => c.estado === "completada");
  const ausentes = hoy.filter((c) => c.estado === "ausente");
  const porCumplir = hoy.filter((c) => c.estado !== "completada" && c.estado !== "ausente");
  const agendadasHoy = conversaciones.filter((c) => c.resultado?.tipo === "cita" && c.hora !== "Ayer" && (c.agenda === null || agendas.includes(c.agenda)));
  const porReactivacion = agendadasHoy.filter((c) => c.objetivo === "reactivacion").length;

  const Fila = ({ c }: { c: (typeof hoy)[number] }) => (
    <div className="flex items-center gap-2.5 py-2">
      <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: AGENDA_INFO[c.agenda].color }} />
      <span className="w-11 shrink-0 text-[13px] font-bold tabular-nums">{c.hora}</span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13px] font-semibold">{cliente(c.clienteId).nombre}</p>
        <p className="truncate text-[11.5px] text-[var(--text-3)]">
          {c.servicio} · {c.agenda === "entregas" ? `Ruta ${c.zona}` : c.modalidad === "en_linea" ? "En línea" : AGENDA_INFO[c.agenda].recurso}
          {c.origen === "ia" ? (c.agenda === "entregas" ? " · movida por MIA" : " · agendó MIA") : ""}
        </p>
      </div>
      <EstadoCitaPill estado={c.estado} agenda={c.agenda} />
    </div>
  );

  return (
    <Card
      title="Consultas y entregas de hoy"
      sub={`${hoy.length} en total · ${hechas.length} hechas · ${porCumplir.length} por cumplir${ausentes.length ? ` · ${ausentes.length} sin cumplir` : ""}`}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {agendas.map((a) => {
          const h = hoy.filter((c) => c.agenda === a);
          const hh = h.filter((c) => c.estado === "completada").length;
          return (
            <div key={a} className="rounded-xl p-3" style={{ backgroundColor: AGENDA_INFO[a].soft }}>
              <p className="text-[12px] font-bold" style={{ color: AGENDA_INFO[a].color }}>{AGENDA_INFO[a].label}</p>
              <p className="mt-1 text-[24px] font-extrabold leading-none">{hh}<span className="text-[15px] font-bold text-[var(--text-3)]"> / {h.length}</span></p>
              <p className="mt-1 text-[11.5px] text-[var(--text-2)]">{a === "entregas" ? "entregadas" : "atendidas"} · {h.length - hh} por cumplir</p>
              <div className="mt-2 h-1.5 rounded-full bg-white/70">
                <div className="h-1.5 rounded-full" style={{ width: `${pct(hh, h.length)}%`, backgroundColor: AGENDA_INFO[a].color }} />
              </div>
            </div>
          );
        })}
        <div className="rounded-xl bg-violet-50 p-3">
          <p className="flex items-center gap-1 text-[12px] font-bold text-violet-700"><Bot size={13} /> Agendadas hoy por MIA</p>
          <p className="mt-1 text-[24px] font-extrabold leading-none">{agendadasHoy.length}</p>
          <p className="mt-1 text-[11.5px] text-[var(--text-2)]">{porReactivacion} por reactivación · {agendadasHoy.length - porReactivacion} por agendamiento</p>
        </div>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]"><CalendarClock size={12} /> Por cumplir ({porCumplir.length})</p>
          <div className="divide-y divide-line">
            {porCumplir.length === 0 && <p className="py-2 text-[13px] text-[var(--text-3)]">No quedan citas hoy.</p>}
            {porCumplir.map((c) => <Fila key={c.id} c={c} />)}
          </div>
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]"><CalendarCheck size={12} /> Hechas ({hechas.length + ausentes.length})</p>
          <div className="divide-y divide-line">
            {hechas.length + ausentes.length === 0 && <p className="py-2 text-[13px] text-[var(--text-3)]">Todavía ninguna.</p>}
            {[...hechas, ...ausentes].map((c) => <Fila key={c.id} c={c} />)}
          </div>
        </div>
      </div>
    </Card>
  );
}

function sumBandeja(agendas: Agenda[], escala = 1) {
  const r = { whatsapp: 0, instagram: 0, facebook: 0, ia: 0, transferidas: 0, fueraHorario: 0, motivos: {} as Record<string, number> };
  for (const a of agendas) {
    const b = BANDEJA[a];
    r.whatsapp += Math.round(b.canal.whatsapp * escala);
    r.instagram += Math.round(b.canal.instagram * escala);
    r.facebook += Math.round(b.canal.facebook * escala);
    r.ia += Math.round(b.ia * escala);
    r.transferidas += Math.round(b.transferidas * escala);
    r.fueraHorario += Math.round(b.fueraHorario * escala);
    for (const [k, v] of Object.entries(b.motivos)) r.motivos[k] = (r.motivos[k] ?? 0) + Math.round(v * escala);
  }
  return r;
}

function BandejaCards({ agendas, escala, titulo }: { agendas: Agenda[]; escala: number; titulo: string }) {
  const b = sumBandeja(agendas, escala);
  const total = b.ia + b.transferidas;
  const maxCanal = Math.max(b.whatsapp, b.instagram, b.facebook);
  const maxMot = Math.max(...Object.values(b.motivos), 1);
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card title={`Bandeja · ${titulo}`} sub={`${total} conversaciones`}>
        <div className="space-y-3">
          <Barra label="WhatsApp" valor={b.whatsapp} max={maxCanal} color="#1ba34d" />
          <Barra label="Instagram" valor={b.instagram} max={maxCanal} color="#c1275b" />
          <Barra label="Facebook" valor={b.facebook} max={maxCanal} color="#1877F2" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-surface p-2.5">
            <p className="flex items-center justify-center gap-1 text-[18px] font-extrabold"><Timer size={15} /> 9 s</p>
            <p className="text-[11px] text-[var(--text-3)]">1.ª respuesta (agente)</p>
          </div>
          <div className="rounded-xl bg-surface p-2.5">
            <p className="flex items-center justify-center gap-1 text-[18px] font-extrabold"><Hourglass size={15} /> {agendas.length === 1 && agendas[0] === "entregas" ? "4" : "7"} min</p>
            <p className="text-[11px] text-[var(--text-3)]">El equipo toma una transferida</p>
          </div>
        </div>
      </Card>
      <Card title="Resuelto por IA vs transferido" sub="De cada conversación, quién la cerró">
        <div className="flex h-8 overflow-hidden rounded-lg">
          <div className="flex items-center justify-center bg-violet-600 text-[12px] font-bold text-white" style={{ width: `${pct(b.ia, total)}%` }}>{pct(b.ia, total)}% IA</div>
          <div className="flex items-center justify-center bg-sky-600 text-[12px] font-bold text-white" style={{ width: `${pct(b.transferidas, total)}%` }}>{pct(b.transferidas, total)}%</div>
        </div>
        <div className="mt-2 flex justify-between text-[12px] text-[var(--text-3)]">
          <span><Bot size={12} className="inline" /> {b.ia} resueltas por MIA</span>
          <span>{b.transferidas} al equipo</span>
        </div>
        <p className="mt-4 mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">Motivo de transferencia</p>
        <div className="space-y-2">
          {Object.entries(b.motivos).map(([k, v]) => (
            <Barra key={k} label={k} valor={v} max={maxMot} color={k === "Urgencia" ? "#dc2626" : "#0284c7"} />
          ))}
        </div>
      </Card>
      <Card title="Fuera de horario" sub="Mensajes que llegaron con el negocio cerrado">
        <p className="flex items-center gap-2 text-[34px] font-extrabold"><Moon size={24} className="text-[var(--text-3)]" /> {b.fueraHorario}</p>
        <p className="text-[12.5px] text-[var(--text-3)]">{pct(b.fueraHorario, total)}% del total. Todos respondidos por el agente al instante; los temas de salud reciben el 132 si son urgentes y quedan para la nutricionista en la mañana.</p>
      </Card>
    </div>
  );
}

function VistaDia({ agendas, transferidas }: { agendas: Agenda[]; transferidas: { esperaMin?: number }[] }) {
  const hoy = agendas.flatMap((a) => citasDe(a, 0));
  const porConfirmar = CITAS.filter((c) => (c.dia === 0 || c.dia === 1) && c.estado === "por_confirmar" && agendas.includes(c.agenda));
  const consultas = agendas.includes("consultas");
  const maxEspera = Math.max(0, ...transferidas.map((t) => t.esperaMin ?? 0));
  const manana = CITAS.filter((c) => c.dia === 1 && c.agenda === "consultas" && c.estado !== "reagendada");
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {agendas.map((a) => (
          <MetricCard
            key={a}
            Icon={a === "consultas" ? ClipboardCheck : Truck}
            valor={citasDe(a, 0).length}
            label={a === "consultas" ? "Consultas hoy" : "Entregas hoy"}
            hint={a === "consultas" ? `Ocupación ${ocupacion(a, 0)}%` : `${citasDe(a, 0).filter((c) => c.estado === "completada").length} ya entregadas`}
          />
        ))}
        <MetricCard Icon={AlertTriangle} valor={transferidas.length} label="Transferidas pendientes" hint={transferidas.length ? `La más antigua espera ${maxEspera} min` : "Nada en espera"} tono={transferidas.length ? "alerta" : undefined} />
        <MetricCard Icon={CalendarClock} valor={porConfirmar.length} label="Por confirmar" hint="Citas y entregas, hoy y mañana" />
        <MetricCard Icon={CalendarCheck} valor={hoy.filter((c) => c.estado === "completada").length} label="Hechas hasta ahora" hint={`de ${hoy.length} del día`} />
      </div>

      <BandejaCards agendas={agendas} escala={1 / 6} titulo="hoy" />

      <ReactivacionResumen agendas={agendas} vista="dia" />

      {consultas && (
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Recordatorios para mañana" sub={`${manana.length} consultas`}>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Enviados", manana.length],
              ["Confirmados", manana.filter((c) => c.estado === "confirmada").length],
              ["Sin respuesta", manana.filter((c) => c.estado === "por_confirmar").length],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-surface p-2.5">
                <p className="text-[20px] font-extrabold">{v}</p>
                <p className="text-[11px] text-[var(--text-3)]">{l}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Próximos espacios libres" sub="Consultas para ofrecer por teléfono o en recepción" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {(["consultas"] as Agenda[]).map((a) => (
              <div key={a}>
                <p className="mb-1.5 text-[12px] font-bold" style={{ color: AGENDA_INFO[a].color }}>{AGENDA_INFO[a].label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {proximosLibres(a, 6).map((l) => (
                    <span key={`${l.dia}${l.hora}`} className="rounded-lg px-2 py-1 text-[11.5px] font-semibold" style={{ backgroundColor: AGENDA_INFO[a].soft, color: AGENDA_INFO[a].color }}>
                      {etiquetaDia(l.dia)} {l.hora}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      )}
    </>
  );
}

function VistaSemana({ agendas }: { agendas: Agenda[] }) {
  // Las métricas de agendamiento son de consultas: las entregas salen del plan.
  const semana = CITAS.filter((c) => c.dia >= -6 && c.dia <= 0 && c.agenda === "consultas");
  const entregadas = CITAS.filter((c) => c.dia >= -6 && c.dia <= 0 && c.agenda === "entregas");
  const porIA = semana.filter((c) => c.origen === "ia").length;
  const canc = semana.filter((c) => c.estado === "cancelada").length;
  const reag = semana.filter((c) => c.estado === "reagendada").length;
  const aus = semana.filter((c) => c.estado === "ausente").length;
  const conf = semana.filter((c) => c.estado === "completada" || c.estado === "confirmada").length;
  const dias = Array.from({ length: 7 }, (_, i) => i - 6).filter((d) => !diaCorto(d).domingo);
  const seg = { programados: 95, enviados: 88, respondidos: 61, citas: 23 };
  const plantillas = PLANTILLAS.filter((p) => p.agenda === "ambas" || agendas.includes(p.agenda));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard Icon={CalendarPlus} valor={semana.length} label="Consultas en la semana" hint={`${pct(porIA, semana.length)}% agendadas por IA`} delta={8} />
        <MetricCard Icon={CalendarCheck} valor={`${pct(conf, semana.length)}%`} label="Confirmadas / atendidas" />
        <MetricCard Icon={Truck} valor={entregadas.filter((c) => c.estado === "completada").length} label="Entregas hechas" hint={`${entregadas.filter((c) => c.estado === "ausente").length} no recibidas`} />
        <MetricCard Icon={Repeat} valor={reag + canc} label="Reagendadas o canceladas" hint={`${canc} canceladas`} />
        <MetricCard Icon={UserX} valor={`${pct(aus, semana.length)}%`} label="Ausencias a consulta" hint={`${aus} no se presentaron`} delta={-12} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Ocupación por día" sub="% del horario con consulta o entrega">
          <div className="flex h-44 items-end gap-3">
            {dias.map((d) => (
              <div key={d} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-36 w-full items-end justify-center gap-1">
                  {agendas.map((a) => {
                    const o = ocupacion(a, d) ?? 0;
                    return <div key={a} className="w-full max-w-[22px] rounded-t-md" style={{ height: `${o}%`, backgroundColor: AGENDA_INFO[a].color }} title={`${AGENDA_INFO[a].label} ${o}%`} />;
                  })}
                </div>
                <span className="text-[11px] font-semibold text-[var(--text-3)]">{diaCorto(d).nombre}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-3 text-[11.5px]">
            {agendas.map((a) => {
              const vals = dias.map((d) => ocupacion(a, d) ?? 0);
              return (
                <span key={a} className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: AGENDA_INFO[a].color }} /> {AGENDA_INFO[a].label}: promedio {Math.round(vals.reduce((x, y) => x + y, 0) / vals.length)}%
                </span>
              );
            })}
          </div>
        </Card>
        <Card title="Consultas agendadas por IA vs manuales">
          <div className="space-y-4">
            {(["consultas"] as Agenda[]).map((a) => {
              const s = semana.filter((c) => c.agenda === a);
              const ia = s.filter((c) => c.origen === "ia").length;
              return (
                <div key={a}>
                  <p className="mb-1 text-[12.5px] font-bold" style={{ color: AGENDA_INFO[a].color }}>{AGENDA_INFO[a].label} · {s.length} citas</p>
                  <div className="flex h-7 overflow-hidden rounded-lg text-[11.5px] font-bold text-white">
                    <div className="flex items-center justify-center bg-violet-600" style={{ width: `${pct(ia, s.length)}%` }}>IA {ia}</div>
                    <div className="flex items-center justify-center bg-slate-500" style={{ width: `${100 - pct(ia, s.length)}%` }}>Manual {s.length - ia}</div>
                  </div>
                </div>
              );
            })}
            <p className="text-[12px] text-[var(--text-3)]">
              <Clock size={12} className="inline" /> El 41% de las consultas por IA se agendaron fuera de horario. Además, MIA movió 9 entregas esta semana a pedido de los pacientes.
            </p>
          </div>
        </Card>
      </div>

      <BandejaCards agendas={agendas} escala={1} titulo="semana" />

      <div className="grid gap-5 lg:grid-cols-2">
        {agendas.includes("consultas") && (
          <Card title="Seguimiento de pacientes" sub="Después de la consulta · 30 días">
            <Embudo color="var(--consultas)" pasos={[{ label: "Programados", valor: seg.programados }, { label: "Enviados", valor: seg.enviados }, { label: "Respondidos", valor: seg.respondidos }, { label: "Nueva cita", valor: seg.citas }]} />
          </Card>
        )}
      </div>

      <ReactivacionResumen agendas={agendas} vista="semana" />

      <Card title="Plantillas de WhatsApp" sub="Envíos, entregados, leídos y respondidos por plantilla">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wider text-[var(--text-3)]">
              <tr>
                <th className="py-2 pr-3">Plantilla</th>
                <th className="py-2 pr-3 text-right">Envíos</th>
                <th className="py-2 pr-3 text-right">Entregados</th>
                <th className="py-2 pr-3 text-right">Leídos</th>
                <th className="py-2 pr-3 text-right">Respondidos</th>
                <th className="py-2">Tasa de respuesta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {plantillas.map((p) => (
                <tr key={p.nombre}>
                  <td className="py-2.5 pr-3"><code className="text-[12.5px]">{p.nombre}</code></td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{p.stats.enviados}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{p.stats.entregados}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{p.stats.leidos}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{p.stats.respondidos}</td>
                  <td className="w-40 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-surface-2"><div className="h-2 rounded-full bg-brand" style={{ width: `${pct(p.stats.respondidos, p.stats.enviados)}%` }} /></div>
                      <span className="w-9 text-right text-[12px] tabular-nums">{pct(p.stats.respondidos, p.stats.enviados)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 flex items-center gap-1 text-[11.5px] text-[var(--text-3)]"><Inbox size={12} /> Datos de 30 días. Fuente: webhooks de estado de WhatsApp Cloud API.</p>
      </Card>
    </>
  );
}
