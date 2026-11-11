"use client";

import Link from "next/link";
import { AlertTriangle, CalendarPlus, Check, Clock, MessageSquare, Siren, X } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { espaciosLibres } from "@/lib/nutricion/agenda";
import { PLAN_INFO } from "@/lib/nutricion/format";
import { cliente } from "@/lib/nutricion/seed";
import { ahora, useStore, type UrgenciaDecision } from "@/lib/nutricion/store";
import type { Conversacion } from "@/lib/nutricion/types";
import { Card } from "./ui";

export interface Urgencia {
  conv: Conversacion;
  nombre: string;
  /** Plan o modalidad del paciente, para ubicarlo rápido. */
  detalle: string;
  /** Primer mensaje del cliente: lo que hizo que MIA la marcara como urgencia. */
  texto: string;
  marcada: string;
  decision?: UrgenciaDecision;
}

/** Conversaciones que el agente marcó como urgencia y siguen abiertas para la nutricionista. */
export function useUrgencias(): Urgencia[] {
  const { conversaciones, urgencias } = useStore();
  return conversaciones
    .filter((c) => c.motivo === "urgencia" && (c.estado !== "resuelta" || urgencias[c.id]))
    .map((c) => {
      const cli = cliente(c.clienteId);
      const primero = c.mensajes.find((m) => m.autor === "cliente");
      return {
        conv: c,
        nombre: cli.nombre,
        detalle: cli.plan ? `Plan ${PLAN_INFO[cli.plan.plan].label}` : cli.modalidad === "en_linea" ? "Consulta en línea" : "Consulta presencial",
        texto: primero?.texto ?? "",
        marcada: primero?.hora ?? c.hora,
        decision: urgencias[c.id],
      };
    })
    .filter((u) => u.decision?.estado !== "atendida" && u.decision?.estado !== "sin_cita");
}

/**
 * Urgencias que marcó MIA, para la nutricionista. MIA no evalúa: solo detecta
 * señales (reacciones a una comida, malestar con un plan) y transfiere. La
 * nutricionista decide si llama o atiende hoy; al elegir la hora queda en su
 * agenda y el equipo lo ve en la conversación.
 */
export function UrgenciasEquipo() {
  const { agendarUrgencia, cerrarUrgencia } = useStore();
  const lista = useUrgencias();
  const libres = espaciosLibres("consultas", 0).slice(0, 3);

  return (
    <div id="urgencias" className="scroll-mt-4">
      <Card
        className={cn(lista.length > 0 && "border-rose-300")}
        title={
          <span className="flex items-center gap-2">
            <Siren size={16} className="text-rose-600" /> Urgencias que marcó MIA
            {lista.length > 0 && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">{lista.length}</span>}
          </span>
        }
        sub="MIA no evalúa síntomas: detecta señales de urgencia y transfiere al equipo. Tú decides si llamas o atiendes hoy y a qué hora."
      >
        {lista.length === 0 && <p className="text-[13px] text-[var(--text-3)]">No hay urgencias abiertas.</p>}
        <div className="space-y-3">
          {lista.map((u) => {
            const enAgenda = u.decision?.estado === "en_agenda";
            return (
              <div key={u.conv.id} className={cn("rounded-xl border-l-4 p-3", enAgenda ? "border-emerald-500 bg-emerald-50/60" : "border-rose-600 bg-rose-50")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold">
                      {u.nombre} <span className="font-normal text-[var(--text-3)]">· {u.detalle}</span>
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--text-3)]">Marcada por MIA a las {u.marcada}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      u.conv.estado === "transferida" ? "bg-rose-600 text-white" : "bg-violet-100 text-violet-700",
                    )}
                  >
                    {u.conv.estado === "transferida" ? (
                      <>
                        <Clock size={11} /> Esperando al equipo · {u.conv.esperaMin ?? 0} min
                      </>
                    ) : (
                      "El equipo la está atendiendo"
                    )}
                  </span>
                </div>
                <p className="mt-2 rounded-lg bg-white/80 px-2.5 py-1.5 text-[12.5px] text-[var(--text-2)]">“{u.texto}”</p>

                {enAgenda ? (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[12px] font-bold text-white">
                      <CalendarPlus size={13} /> En tu agenda hoy · {u.decision?.hora}
                    </span>
                    <button onClick={() => cerrarUrgencia(u.conv.id, "atendida")} className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-[12px] font-semibold text-[var(--text-2)] hover:bg-surface">
                      <Check size={13} /> Marcar atendida
                    </button>
                  </div>
                ) : (
                  <div className="mt-2.5">
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-700">Agregar a mi agenda de hoy</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => agendarUrgencia(u.conv.id, ahora())} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-[12px] font-bold text-white hover:bg-rose-700">
                        <AlertTriangle size={12} /> Llamar ahora
                      </button>
                      {libres.map((h) => (
                        <button key={h} onClick={() => agendarUrgencia(u.conv.id, h)} className="rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-[12px] font-semibold text-rose-700 hover:bg-rose-100">
                          {h}
                        </button>
                      ))}
                      <button onClick={() => cerrarUrgencia(u.conv.id, "sin_cita")} className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-[12px] font-semibold text-[var(--text-3)] hover:bg-surface">
                        <X size={12} /> No necesita consulta
                      </button>
                    </div>
                  </div>
                )}
                <Link href="/demonutricion" className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline">
                  <MessageSquare size={12} /> Ver conversación
                </Link>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
