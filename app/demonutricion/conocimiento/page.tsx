"use client";

import { Ban, CheckCircle2, ShieldCheck } from "lucide-react";
import { CALENDARIOS, CLINICA, CONOCIMIENTO } from "@/lib/nutricion/seed";
import type { Agenda } from "@/lib/nutricion/types";
import { AgendaPill, Card, PageHeader } from "@/components/nutricion/ui";

const PUEDE = [
  "Responder horarios, ubicación, zonas de entrega, formas de pago y políticas aprobadas.",
  "Explicar qué incluye cada plan, reto o consulta, tal cual está escrito aquí.",
  "Agendar, reagendar y cancelar consultas, y mover entregas a pedido del paciente.",
  "Pedir a los pacientes de The Lunch que elijan su almuerzo de la semana.",
  "Enviar recordatorios, seguimientos y mensajes de renovación con plantillas aprobadas.",
];

const NO_PUEDE = [
  "Dar dietas, calorías, porciones, suplementos o indicaciones de salud.",
  "Cambiar o explicar un menú: eso lo hace la nutricionista.",
  "Dar montos, descuentos o enlaces de pago: los envía el equipo.",
  "Decidir si algo es urgente: ante cualquier señal (reacción a una comida, malestar) transfiere y da el 132.",
  "Seguir respondiendo una conversación que el equipo tomó.",
];

export default function ConocimientoPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader title="Información aprobada" sub={`Lo único que ${CLINICA.agente} puede decir. Si no está aquí, lo pasa al equipo.`} />
      <div className="space-y-5 p-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title={<span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-600" /> El agente puede</span>}>
            <ul className="space-y-1.5 text-[13px] text-[var(--text-2)]">{PUEDE.map((p) => <li key={p}>• {p}</li>)}</ul>
          </Card>
          <Card title={<span className="flex items-center gap-1.5"><Ban size={16} className="text-rose-600" /> El agente nunca</span>}>
            <ul className="space-y-1.5 text-[13px] text-[var(--text-2)]">{NO_PUEDE.map((p) => <li key={p}>• {p}</li>)}</ul>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {(["consultas", "entregas"] as Agenda[]).map((a) => (
            <Card key={a} title={<span className="flex items-center gap-2"><AgendaPill agenda={a} /> {a === "consultas" ? "Consultas" : "Planes a domicilio"}</span>} sub={`${CALENDARIOS[a].nombre} · ${CALENDARIOS[a].horario}`}>
              <table className="w-full text-left text-[13px]">
                <thead className="text-[11px] uppercase tracking-wider text-[var(--text-3)]">
                  <tr><th className="py-1.5">Servicio</th><th className="py-1.5">Duración</th><th className="py-1.5 text-right">Precio (USD)</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {CONOCIMIENTO[a].map((s) => (
                    <tr key={s.servicio}>
                      <td className="py-2 font-semibold">{s.servicio}</td>
                      <td className="py-2 text-[var(--text-2)]">{s.duracion}</td>
                      <td className={`py-2 text-right ${s.precio.startsWith("Por definir") || s.precio === "Incluido" ? "text-[var(--text-3)] italic" : ""}`}>{s.precio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[11.5px] text-[var(--text-3)]">Los precios se cargarán en dólares (USD) cuando el equipo los apruebe. Mientras tanto, el agente no da montos.</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Productos digitales" sub="Se pagan con enlace Wompi que envía el equipo">
            <table className="w-full text-left text-[13px]">
              <tbody className="divide-y divide-line">
                {CONOCIMIENTO.digitales.map((s) => (
                  <tr key={s.servicio}>
                    <td className="py-2 font-semibold">{s.servicio}</td>
                    <td className="py-2 text-[var(--text-2)]">{s.duracion}</td>
                    <td className="py-2 text-right italic text-[var(--text-3)]">{s.precio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Zonas de entrega">
            <ul className="space-y-1.5 text-[13px] text-[var(--text-2)]">{CONOCIMIENTO.zonas.map((z) => <li key={z}>• {z}</li>)}</ul>
            <p className="mt-3 text-[11.5px] text-[var(--text-3)]">Fuera de estas zonas, MIA ofrece consulta en línea y menú en casa.</p>
          </Card>
        </div>

        <Card title="Políticas">
          <ul className="space-y-1.5 text-[13px] text-[var(--text-2)]">{CONOCIMIENTO.politicas.map((p) => <li key={p}>• {p}</li>)}</ul>
          <p className="mt-4 flex items-center gap-1.5 text-[12px] text-[var(--text-3)]">
            <ShieldCheck size={13} /> Cada cambio queda registrado con quién lo hizo. El equipo aprueba la información antes de que el agente la use.
          </p>
        </Card>
      </div>
    </div>
  );
}
