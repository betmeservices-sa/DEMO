"use client";

import { useState } from "react";
import { Check, Undo2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { ME } from "@/lib/data/seed";
import { destinoAprobado, estadoRevision } from "@/lib/talento/decision";
import { nombreEtapa } from "@/lib/talento/catalogo";
import { fechaCortaSv, horaSv } from "@/lib/talento/fechas";
import { idNuevo } from "@/lib/talento/operaciones";
import { despachar } from "@/lib/talento/store";
import type { Candidato, EstadoTalento } from "@/lib/talento/tipos";
import { Boton, INPUT, nombreStaff } from "./ui";

/** Aprobado o Rechazado sobre el candidato, con quien, cuando y deshacer. */
export function DecisionCandidato({ c, estado }: { c: Candidato; estado: EstadoTalento }) {
  const est = estadoRevision(c);
  const [motivo, setMotivo] = useState(c.decision?.motivo ?? "");

  // Lo que va a pasar al aprobar, dicho antes de apretar.
  const destino = est === "pendiente" ? destinoAprobado(estado, c.id) : null;
  const vac = (vid: string) => estado.vacantes.find((v) => v.id === vid)?.titulo ?? "";
  const aviso =
    destino?.tipo === "mover"
      ? `${vac(destino.vacanteId)}: pasa a ${nombreEtapa(destino.etapa)}`
      : destino?.tipo === "crear"
        ? `Entra a ${vac(destino.vacanteId)} en ${nombreEtapa(destino.etapa)}`
        : null;

  const decidir = (resultado: "aprobado" | "rechazado") =>
    despachar({ type: "DECIDIR", candidatoId: c.id, resultado, por: ME, ts: new Date().toISOString(), idNueva: idNuevo("p") });

  if (!c.decision) {
    return (
      <div data-decision="pendiente">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => decidir("aprobado")}
            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-green)] py-3 text-[14px] font-extrabold text-white shadow-sm transition hover:brightness-110"
          >
            <Check size={18} strokeWidth={3} /> Aprobado
          </button>
          <button
            type="button"
            onClick={() => decidir("rechazado")}
            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-red)] py-3 text-[14px] font-extrabold text-white shadow-sm transition hover:brightness-110"
          >
            <X size={18} strokeWidth={3} /> Rechazado
          </button>
        </div>
        {aviso && <p className="mt-1.5 text-[11.5px] text-[var(--text-3)]">{aviso}</p>}
      </div>
    );
  }

  const aprobado = c.decision.resultado === "aprobado";
  return (
    <div
      data-decision={c.decision.resultado}
      className={cn(
        "space-y-2 rounded-xl border px-3 py-2.5",
        aprobado ? "border-[var(--brand-green)]/40 bg-[var(--brand-green)]/[0.06]" : "border-[var(--brand-red)]/40 bg-[var(--brand-red)]/[0.06]",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn("flex items-center gap-1.5 text-[13px] font-extrabold", aprobado ? "text-[var(--brand-green)]" : "text-[var(--brand-red)]")}>
          {aprobado ? <Check size={15} strokeWidth={3} /> : <X size={15} strokeWidth={3} />}
          {aprobado ? "Aprobado" : "Rechazado"}
          <span className="font-semibold text-[var(--text-3)]">
            · {nombreStaff(c.decision.por)} · {fechaCortaSv(c.decision.ts)} {horaSv(c.decision.ts)}
          </span>
        </p>
        <Boton onClick={() => despachar({ type: "DECISION_DESHACER", candidatoId: c.id })}>
          <Undo2 size={13} /> Deshacer
        </Boton>
      </div>
      {!aprobado && (
        <input
          className={INPUT}
          aria-label="Motivo del rechazo"
          placeholder="Motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          onBlur={() => despachar({ type: "DECISION_MOTIVO", candidatoId: c.id, motivo: motivo.trim() })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      )}
    </div>
  );
}
