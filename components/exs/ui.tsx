"use client";

// Piezas chicas de Express Shopping. Colores por token del tema (--exs-*,
// --brand-*): nada de hex de marca escrito acá.

import { useEffect, type ReactNode } from "react";
import { AlertTriangle, Clock, FileWarning, Sparkles, Scale } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Etapa } from "@/lib/exs/tipos";
import { etapaDef } from "@/lib/exs/catalogo";
import type { TipoAlerta } from "@/lib/exs/alertas";

export { categoriaCorta, trackingLegible } from "@/lib/exs/formato";

export function EtapaChip({ etapa, className }: { etapa: Etapa; className?: string }) {
  const e = etapaDef(etapa);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-card px-2 py-0.5 text-[11px] font-semibold text-[var(--text)]",
        className,
      )}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
      {e.nombre}
    </span>
  );
}

export function PuntoEtapa({ etapa, size = 10 }: { etapa: Etapa; size?: number }) {
  return <span className="shrink-0 rounded-full" style={{ width: size, height: size, backgroundColor: etapaDef(etapa).color }} />;
}

const ESTILO_ALERTA: Record<TipoAlerta, string> = {
  retenido: "bg-[var(--exs-rojo-fondo)] text-[var(--brand-red)]",
  sin_prealerta: "bg-[var(--exs-ambar-fondo)] text-[var(--exs-ambar)]",
  vence: "bg-[var(--exs-ambar-fondo)] text-[var(--exs-ambar)]",
  limite: "bg-[var(--exs-ambar-fondo)] text-[var(--exs-ambar)]",
};

const ICONO_ALERTA: Record<TipoAlerta, typeof AlertTriangle> = {
  retenido: FileWarning,
  sin_prealerta: AlertTriangle,
  vence: Clock,
  limite: Scale,
};

export function AlertaChip({ tipo, children }: { tipo: TipoAlerta; children: ReactNode }) {
  const Icono = ICONO_ALERTA[tipo];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10.5px] font-bold", ESTILO_ALERTA[tipo])}>
      <Icono size={11} strokeWidth={2.4} className="shrink-0" />
      {children}
    </span>
  );
}

/** La prealerta la leyó la IA de una captura del chat. */
export function IaChip({ compacto = false }: { compacto?: boolean }) {
  return (
    <span
      title="Prealerta leída por la IA de la captura que mandó el cliente"
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-[var(--brand-accent-soft)] px-1.5 py-0.5 text-[10.5px] font-bold text-[var(--brand-accent)]"
    >
      <Sparkles size={11} strokeWidth={2.4} className="shrink-0" />
      {compacto ? "IA" : "Leída por IA"}
    </span>
  );
}

export function Seccion({ titulo, children, accion, className }: { titulo: string; children: ReactNode; accion?: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-line bg-card p-4", className)}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-3)]">{titulo}</h3>
        {accion}
      </div>
      {children}
    </section>
  );
}

export function Dato({ label, valor, ancho = false }: { label: string; valor: ReactNode; ancho?: boolean }) {
  const vacio = valor === "" || valor === null || valor === undefined;
  return (
    <div className={cn("min-w-0", ancho && "sm:col-span-2")}>
      <dt className="text-[11px] font-medium text-[var(--text-3)]">{label}</dt>
      <dd className={cn("text-[13px] font-semibold", vacio ? "italic text-[var(--text-3)]" : "text-[var(--text)]")}>{vacio ? "Sin dato" : valor}</dd>
    </div>
  );
}

/** Los últimos dígitos, para la tarjeta del tablero. */
export function trackingCorto(t: string): string {
  return t.length > 10 ? `…${t.slice(-6)}` : t;
}

/** Las fichas laterales se cierran con Escape, como cualquier panel que se superpone. */
export function useCerrarConEscape(onClose: () => void) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onClose]);
}

/** Abre una conversación de la bandeja desde otra pantalla. */
export function abrirEnBandeja(conversationId: string, navegar: (href: string) => void) {
  try {
    sessionStorage.setItem("ccg.abrirConv", conversationId);
  } catch {
    // Sin sessionStorage se abre la bandeja igual, sin el chat elegido.
  }
  navegar("/");
}
