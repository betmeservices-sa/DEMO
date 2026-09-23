"use client";

// Piezas chicas que comparten las pantallas de reclutamiento.

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { activeTenantId } from "@/lib/tenants/active";
import { staff } from "@/lib/data/seed";
import { ETAPAS, nombreSkill } from "@/lib/talento/catalogo";
import { nivelDeScore } from "@/lib/talento/matching";
import type { Etapa } from "@/lib/talento/tipos";

/** Las pantallas de /talento son solo de BetMe: cualquier otro cliente vuelve a la bandeja. */
export function useSoloBetme(): boolean {
  const router = useRouter();
  const es = activeTenantId() === "betme";
  useEffect(() => {
    if (!es) router.replace("/");
  }, [es, router]);
  return es;
}

export function nombreStaff(id: string): string {
  return staff.find((s) => s.id === id)?.nombre ?? id;
}

export function Encabezado({ titulo, detalle, children }: { titulo: string; detalle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-5 py-3">
      <div className="min-w-0">
        <h1 className="text-[17px] font-extrabold tracking-tight text-brand">{titulo}</h1>
        {detalle && <p className="text-[12.5px] text-[var(--text-3)]">{detalle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function Boton({
  children,
  onClick,
  primario = false,
  disabled,
  type = "button",
  className,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  primario?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  title?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        primario
          ? "bg-brand text-white shadow-sm shadow-brand/25 hover:bg-brand-dark"
          : "border border-line bg-card text-[var(--text-2)] hover:bg-surface",
        className,
      )}
    >
      {children}
    </button>
  );
}

const NIVEL_ESTILO = {
  fuerte: "bg-[var(--brand-green)] text-white",
  bueno: "bg-[var(--brand-accent)] text-white",
  parcial: "bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]",
  bajo: "bg-surface text-[var(--text-3)] border border-line",
} as const;

export function ScoreBadge({ score, grande = false }: { score: number; grande?: boolean }) {
  const nivel = nivelDeScore(score);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-extrabold tabular-nums",
        grande ? "h-11 w-11 text-[15px]" : "h-7 min-w-[34px] px-1.5 text-[11.5px]",
        NIVEL_ESTILO[nivel],
      )}
      title={`Match ${score} de 100`}
    >
      {score}
    </span>
  );
}

export function SkillChip({ id, tono = "neutro" }: { id: string; tono?: "neutro" | "si" | "no" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tono === "si" && "bg-[var(--brand-green)]/10 text-[var(--brand-green)]",
        tono === "no" && "bg-[var(--brand-red)]/10 text-[var(--brand-red)]",
        tono === "neutro" && "bg-surface text-[var(--text-2)] ring-1 ring-inset ring-[var(--border)]",
      )}
    >
      {nombreSkill(id)}
    </span>
  );
}

export function EtapaPill({ etapa }: { etapa: Etapa }) {
  const e = ETAPAS.find((x) => x.id === etapa)!;
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ backgroundColor: e.color }}>
      {e.nombre}
    </span>
  );
}

/** Panel lateral (ficha, formularios largos). */
export function Capa({
  abierta,
  onCerrar,
  titulo,
  ancho = "max-w-2xl",
  children,
}: {
  abierta: boolean;
  onCerrar: () => void;
  titulo: string;
  ancho?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!abierta) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [abierta, onCerrar]);
  if (!abierta) return null;
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/30" onClick={onCerrar} role="presentation">
      <aside
        role="dialog"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className={cn("flex h-full w-full flex-col border-l border-line bg-card shadow-2xl", ancho)}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="truncate text-[15px] font-extrabold text-[var(--text)]">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-surface"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}

export function Seccion({ titulo, children, className }: { titulo?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-card p-4", className)}>
      {titulo && <h3 className="mb-3 text-[13px] font-extrabold uppercase tracking-wide text-[var(--text-3)]">{titulo}</h3>}
      {children}
    </section>
  );
}

export function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] font-bold text-[var(--text-2)]">{label}</span>
      {children}
    </label>
  );
}

export const INPUT =
  "w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent)]/15";

/** Pastillas seleccionables (una o varias). Sin <select> nativo: se ve al compartir pantalla. */
export function Pastillas<T extends string>({
  opciones,
  valor,
  onChange,
  multiple = false,
}: {
  opciones: { id: T; nombre: string }[];
  valor: T[];
  onChange: (v: T[]) => void;
  multiple?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opciones.map((o) => {
        const on = valor.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => {
              if (multiple) onChange(on ? valor.filter((x) => x !== o.id) : [...valor, o.id]);
              else onChange([o.id]);
            }}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[12px] font-semibold transition",
              on
                ? "border-brand bg-brand text-white"
                : "border-line bg-card text-[var(--text-2)] hover:bg-surface",
            )}
          >
            {o.nombre}
          </button>
        );
      })}
    </div>
  );
}
