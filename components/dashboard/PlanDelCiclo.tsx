"use client";

// El plan de conversaciones del cliente en su CICLO DE FACTURACIÓN.
//
// Va arriba del filtro de periodo y no le hace caso: el ciclo lo marca la
// facturación, no lo que se esté mirando abajo. Por eso trae su propio
// selector (el ciclo en curso o el que ya cerró, que es el que se cobra; el
// anterior solo aparece cuando el plan ya cumplió un ciclo).
//
// Las filas, en el orden que pidió el usuario (2026-09-28):
//   - Conversaciones del ciclo en total, Day Pass incluido.
//   - Sin Day Pass: lo incluido en el plan (1.000) y, desde la 1.001, el
//     paquete adicional.
//   - Day Pass: lo incluido en la facturación (500) y, desde la 501, su
//     paquete adicional.
// Ver lib/plan-conversaciones.ts para qué cuenta como conversación.

import { useEffect, useState } from "react";
import { Loader2, MessagesSquare, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { fechaHora, miles } from "@/lib/formato-agencia";
import type { Contador, FilaDelPlan, PlanConversaciones, UsoDelPlan } from "@/lib/plan-conversaciones";

type Ciclo = "actual" | "anterior";

interface Leido {
  cliente: string;
  ciclo: Ciclo;
  plan: PlanConversaciones;
  etiqueta: string;
  uso: UsoDelPlan;
}

export function PlanDelCiclo({ cliente }: { cliente: string }) {
  const [ciclo, setCiclo] = useState<Ciclo>("actual");
  const [datos, setDatos] = useState<Leido | null>(null);
  const [hayAnterior, setHayAnterior] = useState(false);
  const [sinPlan, setSinPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setError(null);
    const leer = () =>
      fetch(`/api/agencia/plan?cliente=${encodeURIComponent(cliente)}&ciclo=${ciclo}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!vivo) return;
          if (!d.ok) {
            setError(d.error ?? "No se pudo leer el plan.");
            return;
          }
          setSinPlan(!d.plan);
          setHayAnterior(Boolean(d.hayAnterior));
          setError(null);
          if (d.plan && d.uso) setDatos({ cliente, ciclo, plan: d.plan, etiqueta: d.ciclo.etiqueta, uso: d.uso });
          // Pidió el anterior y no hay (el plan todavía no cumple un ciclo).
          if (d.plan && !d.uso) setCiclo("actual");
        })
        .catch(() => {
          // Un refresco que falla no borra lo que ya se estaba viendo.
          if (vivo) setError("No se pudo leer el plan.");
        });
    void leer();
    // El ciclo cerrado no cambia: solo el que corre se vuelve a leer.
    const t = ciclo === "actual" ? setInterval(leer, 60_000) : null;
    return () => {
      vivo = false;
      if (t) clearInterval(t);
    };
  }, [cliente, ciclo]);

  if (sinPlan) return null;
  // Lo que hay en pantalla tiene que ser del cliente y del ciclo elegidos: si
  // no, se muestran números de facturación de otro ciclo bajo este botón.
  const vigente = datos && datos.cliente === cliente && datos.ciclo === ciclo ? datos : null;

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text)]">Plan de conversaciones</h2>
          <p className="text-[12px] text-[var(--text-3)]">
            Ciclo de facturación{vigente ? ` · ${vigente.etiqueta}` : ""} · conversación = sesión de 24 h
          </p>
        </div>
        {hayAnterior && (
          <div className="flex gap-1 rounded-lg border border-line bg-surface p-0.5">
            {(["actual", "anterior"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCiclo(c)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[12px] font-semibold transition",
                  ciclo === c ? "bg-brand text-white shadow-sm" : "text-[var(--text-2)] hover:bg-card",
                )}
              >
                {c === "actual" ? "Ciclo en curso" : "Ciclo anterior"}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-[var(--brand-red)]/40 bg-[var(--brand-red)]/10 px-3 py-2 text-[12px]">
          {error}
          {vigente ? " Se muestra lo último que se leyó." : ""}
        </p>
      )}

      {!vigente ? (
        !error && (
          <p className="mt-4 flex items-center gap-2 text-[13px] text-[var(--text-3)]">
            <Loader2 size={15} className="animate-spin text-brand" /> Contando las conversaciones del ciclo
          </p>
        )
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-2">
            <span className="text-[30px] font-extrabold leading-none tracking-tight text-[var(--text)]">
              {miles(vigente.uso.total)}
            </span>
            <span className="text-[13px] text-[var(--text-2)]">conversaciones en total en el ciclo, Day Pass incluido</span>
          </div>

          <div className="mt-5 space-y-5">
            <Barra
              titulo="Conversaciones incluidas en el plan"
              Icon={MessagesSquare}
              c={vigente.uso.generales.plan}
              nota={notaIncluidas(vigente.uso.generales, "sin Day Pass")}
            />
            <Barra
              titulo="Day Pass · incluidas en el plan"
              Icon={Sun}
              c={vigente.uso.dayPass.plan}
              nota={notaIncluidas(vigente.uso.dayPass, "de Day Pass")}
            />
            <Barra
              titulo="Paquete adicional"
              Icon={MessagesSquare}
              c={vigente.uso.generales.adicional}
              adicional
              nota={notaAdicional(vigente.uso.generales)}
            />
            <Barra
              titulo="Day Pass · paquete adicional"
              Icon={Sun}
              c={vigente.uso.dayPass.adicional}
              adicional
              nota={notaAdicional(vigente.uso.dayPass)}
            />
          </div>
        </>
      )}
    </section>
  );
}

/** "se llenaron el 20 sept, 6:44 a. m. · 1,797 sin Day Pass en el ciclo" */
function notaIncluidas(f: FilaDelPlan, que: string): string {
  const estado = f.llenoEl ? `se llenaron el ${fechaHora(f.llenoEl)}` : `quedan ${miles(f.plan.incluidas - f.plan.usadas)}`;
  return `${estado} · ${miles(f.total)} ${que} en el ciclo`;
}

function notaAdicional(f: FilaDelPlan): string {
  const c = f.adicional;
  if (f.llenoEl === null) return "arranca cuando se llenen las incluidas";
  if (c.excedente > 0) return `${miles(c.excedente)} sobre el paquete adicional`;
  return `quedan ${miles(c.incluidas - c.usadas)}`;
}

function Barra({
  titulo,
  Icon,
  c,
  nota,
  adicional = false,
}: {
  titulo: string;
  Icon: LucideIcon;
  c: Contador;
  nota: string;
  /** Las del paquete adicional van en otro color: no son lo incluido. */
  adicional?: boolean;
}) {
  const pasado = c.excedente > 0;
  const pct = c.incluidas === 0 ? 0 : Math.min(100, (c.usadas / c.incluidas) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-2)]">
          <Icon size={14} className={adicional ? "text-[var(--text-3)]" : "text-brand"} /> {titulo}
        </p>
        <p className="shrink-0 text-[13px] tabular-nums text-[var(--text-3)]">
          <span className={cn("text-[20px] font-extrabold tracking-tight", pasado ? "text-[var(--brand-red)]" : "text-[var(--text)]")}>
            {miles(c.usadas)}
          </span>{" "}
          de {miles(c.incluidas)}
        </p>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface">
        <div
          className={cn("h-full rounded-full", pasado ? "bg-[var(--brand-red)]" : adicional ? "bg-[var(--brand-accent)]" : "bg-brand")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={cn("mt-1.5 text-[11.5px]", pasado ? "font-semibold text-[var(--brand-red)]" : "text-[var(--text-3)]")}>{nota}</p>
    </div>
  );
}
