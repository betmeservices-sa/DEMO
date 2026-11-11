"use client";

import type { ReactNode } from "react";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { AGENDA_INFO, ESTADO_CITA } from "@/lib/nutricion/format";
import { useStore, type FiltroAgenda } from "@/lib/nutricion/store";
import type { Agenda, Canal, EstadoCita } from "@/lib/nutricion/types";
import { FacebookIcon, InstagramIcon, WhatsappIcon } from "./glifos";

export function Avatar({ nombre, color, size = 36 }: { nombre: string; color?: string; size?: number }) {
  const partes = nombre.replace(/^(Dr\.|Dra\.|Lda\.|Ldo\.|Chef)\s*/, "").split(/\s+/).filter(Boolean);
  const ini = partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : partes[0].slice(0, 2);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38, backgroundColor: color ?? "var(--brand-blue)" }}
      aria-hidden
    >
      {ini.toUpperCase()}
    </span>
  );
}

const CANAL = {
  whatsapp: { label: "WhatsApp", Icon: WhatsappIcon, className: "bg-[#25D366]/12 text-[#1ba34d]" },
  instagram: { label: "Instagram", Icon: InstagramIcon, className: "bg-[#E1306C]/12 text-[#c1275b]" },
  facebook: { label: "Facebook", Icon: FacebookIcon, className: "bg-[#1877F2]/12 text-[#1877F2]" },
} as const;

export function ChannelBadge({ canal, label = false }: { canal: Canal; label?: boolean }) {
  const { Icon, className, label: l } = CANAL[canal];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", className)} title={l}>
      <Icon size={13} />
      {label && <span>{l}</span>}
    </span>
  );
}

export function AgendaPill({ agenda, className }: { agenda: Agenda; className?: string }) {
  const a = AGENDA_INFO[agenda];
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide", className)}
      style={{ backgroundColor: a.soft, color: a.color }}
    >
      {a.label}
    </span>
  );
}

/** Estado de una cita; en el calendario de entregas usa las palabras de reparto. */
export function EstadoCitaPill({ estado, agenda }: { estado: EstadoCita; agenda?: Agenda }) {
  const e = ESTADO_CITA[estado];
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", e.className)}>{agenda === "entregas" ? e.entrega : e.label}</span>;
}

export function Card({ title, sub, action, children, className }: { title?: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-card p-5 shadow-sm", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-[15px] font-bold text-[var(--text)]">{title}</h2>}
            {sub && <p className="mt-0.5 text-[12.5px] text-[var(--text-3)]">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  valor,
  hint,
  delta,
  Icon,
  tono,
}: {
  label: string;
  valor: string | number;
  hint?: string;
  delta?: number;
  Icon: LucideIcon;
  tono?: "alerta" | "ok";
}) {
  const subiendo = (delta ?? 0) >= 0;
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-sm", tono === "alerta" ? "border-rose-300" : "border-line")}>
      <div className="flex items-center justify-between">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tono === "alerta" ? "bg-rose-50 text-rose-600" : "bg-brand/10 text-brand")}>
          <Icon size={18} />
        </span>
        {delta !== undefined && delta !== 0 && (
          <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-bold", subiendo ? "bg-emerald-50 text-[#146c43]" : "bg-rose-50 text-rose-600")}>
            {subiendo ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-[26px] font-extrabold leading-none tracking-tight text-[var(--text)]">{valor}</p>
      <p className="mt-1.5 text-[12.5px] font-medium text-[var(--text-3)]">{label}</p>
      {hint && <p className="mt-1 text-[11.5px] text-[var(--text-3)]">{hint}</p>}
    </div>
  );
}

export function FiltroAgendaToggle({ permitir = true }: { permitir?: boolean }) {
  const { filtro, setFiltro } = useStore();
  const opciones: { id: FiltroAgenda; label: string }[] = [
    { id: "todas", label: "Todo" },
    { id: "consultas", label: "Consultas" },
    { id: "entregas", label: "Entregas" },
  ];
  const fijo = !permitir;
  return (
    <div className="inline-flex rounded-xl border border-line bg-card p-1 shadow-sm">
      {opciones.map((o) => {
        const activo = filtro === o.id;
        const color = o.id === "consultas" ? "var(--consultas)" : o.id === "entregas" ? "var(--entregas)" : "var(--brand-blue)";
        const deshabilitado = fijo && !activo;
        return (
          <button
            key={o.id}
            type="button"
            disabled={deshabilitado}
            onClick={() => setFiltro(o.id)}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition",
              activo ? "text-white shadow-sm" : "text-[var(--text-2)] hover:bg-surface",
              deshabilitado && "cursor-not-allowed opacity-40 hover:bg-transparent",
            )}
            style={activo ? { backgroundColor: color } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function PageHeader({ title, sub, right }: { title: ReactNode; sub?: string; right?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line bg-card px-6 py-4">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--text)]">{title}</h1>
        {sub && <p className="mt-0.5 text-[13px] text-[var(--text-3)]">{sub}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </header>
  );
}

/** Barra horizontal simple con etiqueta y valor. */
export function Barra({ label, valor, max, color, sufijo = "" }: { label: ReactNode; valor: number; max: number; color?: string; sufijo?: string }) {
  const w = max === 0 ? 0 : Math.max(2, Math.round((valor / max) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12.5px]">
        <span className="font-medium text-[var(--text-2)]">{label}</span>
        <span className="font-bold tabular-nums text-[var(--text)]">
          {valor}
          {sufijo}
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-2">
        <div className="h-2 rounded-full" style={{ width: `${w}%`, backgroundColor: color ?? "var(--brand-blue)" }} />
      </div>
    </div>
  );
}

/** Embudo horizontal: cada paso como % del primero. */
export function Embudo({ pasos, color }: { pasos: { label: string; valor: number }[]; color: string }) {
  const base = pasos[0]?.valor || 1;
  return (
    <div className="space-y-2">
      {pasos.map((p, i) => {
        const w = Math.max(4, Math.round((p.valor / base) * 100));
        const conv = i === 0 ? null : Math.round((p.valor / (pasos[i - 1].valor || 1)) * 100);
        return (
          <div key={p.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-[12.5px] font-medium text-[var(--text-2)]">{p.label}</span>
            <div className="relative h-7 flex-1 rounded-lg bg-surface">
              <div className="flex h-7 items-center rounded-lg px-2 text-[12px] font-bold text-white" style={{ width: `${w}%`, backgroundColor: color, opacity: 1 - i * 0.14 }}>
                {p.valor}
              </div>
            </div>
            <span className="w-12 shrink-0 text-right text-[11.5px] tabular-nums text-[var(--text-3)]">{conv === null ? "" : `${conv}%`}</span>
          </div>
        );
      })}
    </div>
  );
}
