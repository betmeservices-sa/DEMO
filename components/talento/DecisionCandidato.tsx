"use client";

import { useState } from "react";
import { Check, Undo2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { ME } from "@/lib/data/seed";
import { estadoRevision } from "@/lib/talento/decision";
import { fechaCortaSv, horaSv } from "@/lib/talento/fechas";
import { idNuevo } from "@/lib/talento/operaciones";
import { despachar, marcarGhl } from "@/lib/talento/store";
import type { Candidato, EstadoTalento } from "@/lib/talento/tipos";
import { Boton, INPUT, nombreStaff } from "./ui";

/** Aprobado o Rechazado sobre el candidato, con quien, cuando y deshacer. */
export function DecisionCandidato({ c, estado }: { c: Candidato; estado: EstadoTalento }) {
  const est = estadoRevision(c);
  const [motivo, setMotivo] = useState(c.decision?.motivo ?? "");

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
        <MarcaGhl c={c} />
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
      <MarcaGhl c={c} />
    </div>
  );
}

/** Como salio la marca en GHL. Solo se ve si hubo algo que decir. */
function MarcaGhl({ c }: { c: Candidato }) {
  const g = c.ghl;
  if (!g) return null;
  if (g.estado === "ok") {
    // Solo si corresponde a la decision de ahora: un "ok" viejo no dice nada.
    const vigente = g.accion === "deshacer" ? !c.decision : c.decision?.resultado === g.accion;
    return vigente ? <p data-ghl="ok" className="mt-1.5 text-[11px] text-[var(--text-3)]">Marcado en GHL</p> : null;
  }
  return (
    <p data-ghl="error" className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-[var(--brand-red)]" title={g.detalle}>
      No se pudo marcar en GHL.
      <button type="button" onClick={() => void marcarGhl(c.id, g.accion, g.previo)} className="font-bold underline">
        Reintentar
      </button>
    </p>
  );
}
