"use client";

// El plan de conversaciones del cliente en su CICLO DE FACTURACIÓN.
//
// Va arriba del filtro de periodo y no le hace caso: el ciclo lo marca la
// facturación, no lo que se esté mirando abajo. Por eso trae su propio
// selector (el ciclo en curso o el que ya cerró, que es el que se cobra; el
// anterior solo aparece cuando el plan ya cumplió un ciclo).
//
// Por PAQUETES (lo pidió el usuario el 2026-10-01): arriba, las conversaciones
// del ciclo y cuántos paquetes van consumidos; abajo, el paquete que corre, con
// sus normales y su Day Pass (que suma lo que le sobró del paquete anterior); y
// cuándo se acabó cada paquete. Ver lib/plan-conversaciones.ts.

import { useEffect, useState } from "react";
import { Loader2, MessagesSquare, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { fechaHora, miles } from "@/lib/formato-agencia";
import type { Bolsa, PlanConversaciones, UsoDelPlan } from "@/lib/plan-conversaciones";

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
          <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
            <Dato valor={miles(vigente.uso.total)} texto="conversaciones en total en el ciclo, Day Pass incluido" />
            <Dato
              valor={miles(vigente.uso.consumidos.length)}
              texto={`${vigente.uso.consumidos.length === 1 ? "paquete consumido" : "paquetes consumidos"} · ${
                vigente.uso.paquete === 1 ? "va en el plan del mes" : `va en el paquete ${vigente.uso.paquete}`
              }`}
            />
          </div>

          <div className="mt-5 space-y-5">
            <Barra
              titulo={vigente.uso.paquete === 1 ? "Conversaciones incluidas en el plan" : `Conversaciones · paquete ${vigente.uso.paquete}`}
              Icon={MessagesSquare}
              b={vigente.uso.actual.generales}
              adicional={vigente.uso.paquete > 1}
            />
            <Barra
              titulo={vigente.uso.paquete === 1 ? "Day Pass · incluidas en el plan" : `Day Pass · paquete ${vigente.uso.paquete}`}
              Icon={Sun}
              b={vigente.uso.actual.dayPass}
              adicional={vigente.uso.paquete > 1}
            />
          </div>

          {vigente.uso.consumidos.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-line pt-3 text-[11.5px] text-[var(--text-3)]">
              {vigente.uso.consumidos.map((p) => (
                <li key={p.numero}>
                  {p.numero === 1 ? "El plan" : `El paquete ${p.numero}`} se acabó el {fechaHora(p.llenoEl)}, por{" "}
                  {p.porque === "generales" ? "las conversaciones" : "el Day Pass"}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function Dato({ valor, texto }: { valor: string; texto: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="text-[30px] font-extrabold leading-none tracking-tight text-[var(--text)]">{valor}</span>
      <span className="text-[13px] text-[var(--text-2)]">{texto}</span>
    </div>
  );
}

/** "198 que sobraron del paquete anterior + 500 del nuevo · quedan 667" */
function notaDeBolsa(b: Bolsa): string {
  const quedan = b.disponibles - b.usadas;
  const resto = quedan < 0 ? `${miles(-quedan)} de más` : `quedan ${miles(quedan)}`;
  return b.arrastre > 0
    ? `${miles(b.arrastre)} que sobraron del paquete anterior + ${miles(b.disponibles - b.arrastre)} del nuevo · ${resto}`
    : resto;
}

function Barra({
  titulo,
  Icon,
  b,
  adicional = false,
}: {
  titulo: string;
  Icon: LucideIcon;
  b: Bolsa;
  /** Un paquete adicional va en otro color: no es lo incluido en el plan. */
  adicional?: boolean;
}) {
  const pasado = b.usadas > b.disponibles;
  const pct = b.disponibles === 0 ? (b.usadas > 0 ? 100 : 0) : Math.min(100, (b.usadas / b.disponibles) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-2)]">
          <Icon size={14} className={adicional ? "text-[var(--text-3)]" : "text-brand"} /> {titulo}
        </p>
        <p className="shrink-0 text-[13px] tabular-nums text-[var(--text-3)]">
          <span className={cn("text-[20px] font-extrabold tracking-tight", pasado ? "text-[var(--brand-red)]" : "text-[var(--text)]")}>
            {miles(b.usadas)}
          </span>{" "}
          de {miles(b.disponibles)}
        </p>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface">
        <div
          className={cn("h-full rounded-full", pasado ? "bg-[var(--brand-red)]" : adicional ? "bg-[var(--brand-accent)]" : "bg-brand")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={cn("mt-1.5 text-[11.5px]", pasado ? "font-semibold text-[var(--brand-red)]" : "text-[var(--text-3)]")}>
        {notaDeBolsa(b)}
      </p>
    </div>
  );
}
