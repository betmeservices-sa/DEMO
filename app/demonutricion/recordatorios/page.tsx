"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CalendarCheck, CalendarClock, CalendarDays, Check, ClipboardCheck, MessageCircle, MessageCircleQuestion, RefreshCw, Salad, Truck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { AGENDA_INFO, diasDesde, etiquetaDia, isoDeTexto, PLAN_INFO } from "@/lib/nutricion/format";
import { CALENDARIOS, CITAS, CLIENTES, cliente, finDelPlan } from "@/lib/nutricion/seed";
import { citasDe, horario } from "@/lib/nutricion/agenda";
import { useStore } from "@/lib/nutricion/store";
import type { Agenda, EstadoCita } from "@/lib/nutricion/types";
import { EstadoCitaPill, PageHeader } from "@/components/nutricion/ui";

// Recordatorios internos del equipo: lo que hay que hacer hoy, mañana y
// pasado, separado por calendario. En consultas: citas, confirmaciones,
// controles que dejó la nutricionista y dudas de menús. En entregas: la ruta
// del día, direcciones o menús por confirmar, primeras entregas y planes que vencen.

type Tipo = "cita" | "confirmar" | "control" | "menu" | "ruta" | "entrega" | "inicio" | "vence";

interface Pendiente {
  id: string;
  tipo: Tipo;
  dia: number;
  hora: string;
  agenda: Agenda;
  /** Vacío en la ruta del día (no es de un solo paciente). */
  clienteId?: string;
  titulo: string;
  detalle: string;
  estado?: EstadoCita;
}

const TIPO: Record<Tipo, { label: string; Icon: LucideIcon; className: string }> = {
  cita: { label: "Cita", Icon: CalendarCheck, className: "bg-surface text-[var(--text-2)]" },
  confirmar: { label: "Confirmar", Icon: CalendarClock, className: "bg-amber-50 text-amber-700" },
  control: { label: "Control", Icon: ClipboardCheck, className: "bg-[var(--consultas-soft)] text-[var(--consultas)]" },
  menu: { label: "Menú", Icon: MessageCircleQuestion, className: "bg-rose-50 text-rose-700" },
  ruta: { label: "Ruta", Icon: Truck, className: "bg-[var(--entregas-soft)] text-[var(--entregas)]" },
  entrega: { label: "Entrega", Icon: Truck, className: "bg-amber-50 text-amber-700" },
  inicio: { label: "Primera entrega", Icon: Salad, className: "bg-sky-50 text-sky-700" },
  vence: { label: "Renovación", Icon: RefreshCw, className: "bg-violet-50 text-violet-700" },
};

const DIAS = [0, 1, 2];

/** Qué hay que hacer con cada cita según su estado. */
function queHacer(estado: EstadoCita, modalidad?: "presencial" | "en_linea") {
  if (estado === "por_confirmar") return "Sin confirmar: llama al paciente o reenvía el recordatorio.";
  if (estado === "en_curso") return "En consulta.";
  return modalidad === "en_linea" ? "Confirmada: envía el enlace de la videollamada 15 min antes." : "Confirmada: ten lista la báscula de composición corporal.";
}

export default function RecordatoriosPage() {
  const router = useRouter();
  const { visitas, resumenes, menus, conversacionDe, setConvSel, citasVersion, rol } = useStore();
  // La nutricionista solo ve su calendario y abre la ficha en lugar del chat.
  const calendarios: Agenda[] = rol === "nutricionista" ? ["consultas"] : ["consultas", "entregas"];
  const [hechos, setHechos] = useState<Set<string>>(new Set());
  const [cat, setCat] = useState<Agenda>("consultas");

  const todos = useMemo(() => {
    const out: Pendiente[] = [];
    // Consultas de hoy a pasado mañana.
    for (const c of CITAS) {
      if (c.agenda !== "consultas" || c.dia < 0 || c.dia > 2 || ["completada", "cancelada", "reagendada"].includes(c.estado)) continue;
      out.push({
        id: `c-${c.id}`,
        tipo: c.estado === "por_confirmar" ? "confirmar" : "cita",
        dia: c.dia,
        hora: c.hora,
        agenda: "consultas",
        clienteId: c.clienteId,
        titulo: `${c.servicio}${c.modalidad === "en_linea" ? " en línea" : ""} · ${cliente(c.clienteId).nombre}`,
        detalle: queHacer(c.estado, c.modalidad),
        estado: c.estado,
      });
    }
    // Controles que dejó la nutricionista en el resumen de consulta.
    for (const v of visitas) {
      const r = resumenes[v.id];
      const n = Number(r?.proximoControl.match(/^En (\d+) días/)?.[1]);
      if (!r || !n) continue;
      // Si el control cae en un día sin atención, pasa al siguiente que sí atiende.
      let dia = n - diasDesde(v.fecha);
      if (dia < 0) continue;
      while (dia <= 2 && !horario("consultas", dia)) dia++;
      if (dia > 2) continue;
      const tieneCita = CITAS.some((c) => c.clienteId === v.clienteId && c.agenda === "consultas" && c.dia >= 0 && c.dia <= dia + 1 && c.estado !== "cancelada" && c.estado !== "reagendada");
      if (tieneCita) continue;
      out.push({
        id: `k-${v.id}`,
        tipo: "control",
        dia,
        hora: "",
        agenda: "consultas",
        clienteId: v.clienteId,
        titulo: `Control de ${cliente(v.clienteId).nombre}`,
        detalle: `${r.objetivo}. La nutricionista pidió control ${r.proximoControl.toLowerCase()} y aún no tiene cita: agéndalo.`,
      });
    }
    // Pacientes con dudas sobre su menú.
    for (const m of menus) {
      if (m.estado !== "duda") continue;
      out.push({
        id: `m-${m.id}`,
        tipo: "menu",
        dia: Math.max(0, -diasDesde(isoDeTexto(m.fecha))),
        hora: "",
        agenda: "consultas",
        clienteId: m.clienteId,
        titulo: `Duda sobre el menú de ${cliente(m.clienteId).nombre}`,
        detalle: "MIA no cambia ni explica menús: la nutricionista debe responder.",
      });
    }

    // Entregas: la ruta de cada día como una sola tarea, más lo que necesita atención.
    for (const d of DIAS) {
      const del = citasDe("entregas", d);
      if (!del.length) continue;
      const lunch = del.filter((c) => c.servicio.startsWith("The Lunch")).length;
      out.push({
        id: `ruta-${d}`,
        tipo: "ruta",
        dia: d,
        hora: del[0].hora,
        agenda: "entregas",
        titulo: `Ruta del día · ${del.length} entregas`,
        detalle: `${del.length - lunch} de planes completos (6:00–9:00) y ${lunch} de The Lunch (11:00–13:00).`,
      });
      for (const c of del) {
        if (c.estado !== "por_confirmar" && c.estado !== "en_curso" && c.origen !== "ia") continue;
        out.push({
          id: `e-${c.id}`,
          tipo: "entrega",
          dia: d,
          hora: c.hora,
          agenda: "entregas",
          clienteId: c.clienteId,
          titulo: `${c.servicio} · ${cliente(c.clienteId).nombre}`,
          detalle:
            c.estado === "por_confirmar"
              ? "Falta que elija su almuerzo o confirme la dirección: MIA ya le escribió."
              : c.estado === "en_curso"
                ? "En ruta: avisa al paciente si hay atraso."
                : `MIA movió la entrega a ${c.zona} a pedido del paciente: avisa al repartidor.`,
          estado: c.estado,
        });
      }
    }
    // Primeras entregas y planes que vencen en los próximos días.
    for (const c of CLIENTES) {
      if (!c.plan) continue;
      if (c.plan.inicio >= 0 && c.plan.inicio <= 2)
        out.push({
          id: `i-${c.id}`,
          tipo: "inicio",
          dia: c.plan.inicio,
          hora: c.plan.horaEntrega,
          agenda: "entregas",
          clienteId: c.id,
          titulo: `Primera entrega de ${c.nombre} · ${PLAN_INFO[c.plan.plan].label}`,
          detalle: `Revisa restricciones con cocina y la dirección (${c.plan.zona}) antes de la ruta.`,
        });
      const fin = finDelPlan(c);
      if (fin >= 0 && fin <= 2)
        out.push({
          id: `v-${c.id}`,
          tipo: "vence",
          dia: fin,
          hora: "",
          agenda: "entregas",
          clienteId: c.id,
          titulo: `Vence el plan ${PLAN_INFO[c.plan.plan].label} de ${c.nombre}`,
          detalle: "MIA le envía la plantilla de renovación; el precio y el enlace de pago los manda el equipo.",
        });
    }
    // Primero lo sin hora (tareas del día), luego por hora.
    return out.sort((a, b) => a.dia - b.dia || (a.hora || "00:00").localeCompare(b.hora || "00:00"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitas, resumenes, menus, citasVersion]);
  const pendientes = todos.filter((p) => p.agenda === cat);
  const cal = CALENDARIOS[cat];
  const faltanDe = (a: Agenda) => todos.filter((p) => p.agenda === a && !hechos.has(p.id)).length;

  const alternar = (id: string) =>
    setHechos((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const abrirChat = (clienteId: string) => {
    if (rol !== "secretaria") return router.push(`/demonutricion/pacientes/${clienteId}`);
    setConvSel(conversacionDe(clienteId));
    router.push("/demonutricion");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader
        title="Recordatorios"
        sub="Pendientes del equipo por calendario: citas, entregas y lo que hay que hacer con ellas."
        right={
          <div className="inline-flex rounded-xl border border-line bg-card p-1 shadow-sm">
            {calendarios.map((a) => {
              const n = faltanDe(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setCat(a)}
                  aria-pressed={cat === a}
                  className={cn("inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition", cat === a ? "text-white shadow-sm" : "text-[var(--text-2)] hover:bg-surface")}
                  style={cat === a ? { backgroundColor: AGENDA_INFO[a].color } : undefined}
                >
                  {a === "consultas" ? <ClipboardCheck size={14} /> : <Truck size={14} />}
                  {AGENDA_INFO[a].label}
                  {n > 0 && <span className={cn("rounded-full px-1.5 text-[11px] font-bold", cat === a ? "bg-white/25" : "bg-surface-2")}>{n}</span>}
                </button>
              );
            })}
          </div>
        }
      />
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-sm" style={{ borderLeft: `4px solid ${AGENDA_INFO[cat].color}` }}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: AGENDA_INFO[cat].color }}>
            <CalendarDays size={18} />
          </span>
          <div className="min-w-0 text-[12.5px] leading-tight">
            <p className="text-[14px] font-bold">{cal.nombre}</p>
            <p className="text-[var(--text-3)]">
              {cal.cuenta} · {cal.horario}
            </p>
          </div>
        </div>
        {DIAS.map((d) => {
          const delDia = pendientes.filter((p) => p.dia === d);
          const abierto = !!horario(cat, d);
          const faltan = delDia.filter((p) => !hechos.has(p.id)).length;
          return (
            <section key={d}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-[16px] font-extrabold tracking-tight">
                  {etiquetaDia(d)}
                  {d > 1 && <span className="ml-1.5 text-[13px] font-semibold text-[var(--text-3)]">pasado mañana</span>}
                </h2>
                <span className="text-[12.5px] text-[var(--text-3)]">{faltan === 0 ? "Todo listo" : `${faltan} pendiente${faltan === 1 ? "" : "s"}`}</span>
              </div>
              {delDia.length === 0 && (
                <p className="rounded-xl border border-dashed border-line p-4 text-center text-[13px] text-[var(--text-3)]">
                  {abierto ? "Nada agendado." : `Sin atención este día en el calendario de ${AGENDA_INFO[cat].label.toLowerCase()}.`}
                </p>
              )}
              <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
                {delDia.map((p) => {
                  const hecho = hechos.has(p.id);
                  const t = TIPO[p.tipo];
                  return (
                    <div key={p.id} className={cn("flex items-start gap-3 px-4 py-3", hecho && "bg-surface/60")}>
                      <button
                        type="button"
                        onClick={() => alternar(p.id)}
                        aria-pressed={hecho}
                        aria-label={hecho ? "Marcar como pendiente" : "Marcar como hecho"}
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition",
                          hecho ? "border-emerald-600 bg-emerald-600 text-white" : "border-[var(--border-2)] hover:border-emerald-600",
                        )}
                      >
                        {hecho && <Check size={13} strokeWidth={3} />}
                      </button>
                      <span className="w-12 shrink-0 pt-0.5 text-[13px] font-bold tabular-nums">{p.hora || "—"}</span>
                      <div className={cn("min-w-0 flex-1", hecho && "opacity-50")}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold", t.className)}>
                            <t.Icon size={11} /> {t.label}
                          </span>
                          {p.estado && (p.tipo === "cita" || p.tipo === "entrega") && <EstadoCitaPill estado={p.estado} agenda={p.agenda} />}
                        </div>
                        <p className={cn("mt-1 text-[13.5px] font-semibold", hecho && "line-through")}>{p.titulo}</p>
                        <p className="text-[12.5px] text-[var(--text-2)]">{p.detalle}</p>
                      </div>
                      {p.clienteId && (
                        <button
                          type="button"
                          onClick={() => abrirChat(p.clienteId!)}
                          className="hidden shrink-0 items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11.5px] font-semibold text-[var(--text-2)] hover:bg-surface sm:inline-flex"
                          title="Abrir la conversación con el paciente"
                        >
                          <MessageCircle size={12} /> {rol === "secretaria" ? "Chat" : "Ficha"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
        <p className="flex items-center justify-center gap-1.5 text-center text-[11.5px] text-[var(--text-3)]">
          <BellRing size={12} /> Los recordatorios que recibe el paciente los manda MIA 24 h antes de cada consulta.
        </p>
      </div>
    </div>
  );
}
