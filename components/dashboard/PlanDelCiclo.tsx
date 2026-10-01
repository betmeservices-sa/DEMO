"use client";

// El plan de conversaciones del cliente en su CICLO DE FACTURACIÓN.
//
// Va arriba del filtro de periodo y no le hace caso: el ciclo lo marca la
// facturación, no lo que se esté mirando abajo. Por eso trae su propio
// selector (el ciclo en curso o el que ya cerró, que es el que se cobra; el
// anterior solo aparece cuando el plan ya cumplió un ciclo).
//
// Por PAQUETES que se llenan en orden (lo pidió el usuario el 2026-10-01):
// arriba, las conversaciones del ciclo y cuántos paquetes van consumidos; abajo,
// de qué paquete salen ahora las normales y de cuál el Day Pass (puede ser uno
// anterior que todavía tiene lugar), y cómo va cada paquete. Ver
// lib/plan-conversaciones.ts.

import { useEffect, useState } from "react";
import { Loader2, MessagesSquare, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { fechaHora, miles } from "@/lib/formato-agencia";
import type { Cubeta, Paquete, PlanConversaciones, TipoDeConversacion, UsoDelPlan } from "@/lib/plan-conversaciones";

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
              valor={miles(vigente.uso.consumidos)}
              texto={`${vigente.uso.consumidos === 1 ? "paquete consumido" : "paquetes consumidos"} · ${
                vigente.uso.paquetes.length === 1 ? "va en el plan del mes" : `va en el paquete ${vigente.uso.paquetes.length}`
              }`}
            />
          </div>

          <div className="mt-5 space-y-5">
            {(["generales", "dayPass"] as const).map((t) => {
              const n = vigente.uso.enUso[t];
              return (
                <Barra
                  key={t}
                  titulo={
                    t === "generales"
                      ? n === 1
                        ? "Conversaciones incluidas en el plan"
                        : `Conversaciones · paquete ${n}`
                      : n === 1
                        ? "Day Pass · incluidas en el plan"
                        : `Day Pass · paquete ${n}`
                  }
                  Icon={t === "generales" ? MessagesSquare : Sun}
                  c={vigente.uso.paquetes[n - 1]![t]}
                  adicional={n > 1}
                  nota={notaDeTipo(vigente.uso.paquetes, t, n)}
                />
              );
            })}
          </div>

          {vigente.uso.paquetes.length > 1 && (
            <ul className="mt-4 space-y-1 border-t border-line pt-3 text-[11.5px] text-[var(--text-3)]">
              {vigente.uso.paquetes.map((p) => (
                <li key={p.numero}>{resumenDePaquete(p)}</li>
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

/** "quedan 154 · después siguen 500 del paquete 3" */
function notaDeTipo(paquetes: readonly Paquete[], t: TipoDeConversacion, n: number): string {
  const c = paquetes[n - 1]![t];
  const quedan = c.incluidas - c.usadas;
  const resto = quedan < 0 ? `${miles(-quedan)} de más` : `quedan ${miles(quedan)}`;
  const despues = paquetes.filter((p) => p.numero > n && p[t].usadas < p[t].incluidas);
  return despues.length
    ? `${resto} · después siguen ${despues.map((p) => `${miles(p[t].incluidas - p[t].usadas)} del paquete ${p.numero}`).join(" y ")}`
    : resto;
}

/** "Paquete 2 (desde el 20 sept, 7:48 a. m.): normales llenas el 29 sept, 6:15 p. m. · Day Pass 346 de 500" */
function resumenDePaquete(p: Paquete): string {
  const nombre = p.numero === 1 ? "El plan" : `Paquete ${p.numero}`;
  const desde = p.abre ? ` (desde el ${fechaHora(p.abre)})` : "";
  const normales = p.generales.llenoEl
    ? `normales llenas el ${fechaHora(p.generales.llenoEl)}`
    : `normales ${miles(p.generales.usadas)} de ${miles(p.generales.incluidas)}`;
  const dayPass = p.dayPass.llenoEl
    ? `Day Pass lleno el ${fechaHora(p.dayPass.llenoEl)}`
    : `Day Pass ${miles(p.dayPass.usadas)} de ${miles(p.dayPass.incluidas)}`;
  return `${nombre}${desde}: ${normales} · ${dayPass}`;
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
  c: Cubeta;
  nota: string;
  /** Un paquete adicional va en otro color: no es lo incluido en el plan. */
  adicional?: boolean;
}) {
  const pasado = c.usadas > c.incluidas;
  const pct = c.incluidas === 0 ? (c.usadas > 0 ? 100 : 0) : Math.min(100, (c.usadas / c.incluidas) * 100);
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
