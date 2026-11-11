"use client";

// Piezas chicas que comparten Pedidos y la Agenda de La Campana.

import type { ReactNode } from "react";
import { Globe, Phone } from "lucide-react";
import { ChannelBadge } from "@/components/ui/ChannelBadge";
import { activeTenantId } from "@/lib/tenants/active";
import { cn } from "@/lib/cn";

/** Por dónde llega algo: los pedidos son siempre WhatsApp; las reservas, de cualquier canal. */
export type Canal = "whatsapp" | "instagram" | "facebook" | "web" | "llamada";

const CANAL_NOMBRE: Record<Canal, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  web: "Sitio web",
  llamada: "Llamada",
};

/** Pedidos y Agenda viven en el navegador: la frontera con otros paneles va aquí. */
export function SoloCampana({ children }: { children: ReactNode }) {
  if (activeTenantId() !== "lacampana") {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-[13px] text-[var(--text-3)]">
        Este módulo no está habilitado en este panel.
      </div>
    );
  }
  return <>{children}</>;
}

export function CanalChip({ canal, conNombre = false }: { canal: Canal; conNombre?: boolean }) {
  if (canal === "whatsapp" || canal === "instagram" || canal === "facebook") {
    return <ChannelBadge channel={canal} showLabel={conNombre} />;
  }
  const Icono = canal === "web" ? Globe : Phone;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-[var(--text-2)]" title={CANAL_NOMBRE[canal]}>
      <Icono size={13} />
      {conNombre && <span>{CANAL_NOMBRE[canal]}</span>}
    </span>
  );
}

export function Pill({ children, tono = "neutro" }: { children: ReactNode; tono?: "neutro" | "cola" | "cocina" | "listo" | "camino" | "alerta" }) {
  const tonos = {
    neutro: "bg-surface-2 text-[var(--text-2)]",
    cola: "bg-[var(--lc-cola-fondo)] text-[var(--lc-cola)]",
    cocina: "bg-[var(--lc-cocina-fondo)] text-[var(--lc-cocina)]",
    listo: "bg-[var(--lc-listo-fondo)] text-[var(--lc-listo)]",
    camino: "bg-[var(--lc-camino-fondo)] text-[var(--lc-camino)]",
    alerta: "bg-[var(--brand-red)]/10 text-[var(--brand-red)]",
  } as const;
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", tonos[tono])}>{children}</span>;
}

export function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-SV", { hour: "numeric", minute: "2-digit" });
}

export function haceMin(iso: string, ahora: number): string {
  const m = Math.max(0, Math.round((ahora - Date.parse(iso)) / 60_000));
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  return `hace ${h} h ${m % 60} min`;
}
