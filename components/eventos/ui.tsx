"use client";

// Piezas chicas del tablero de eventos. Colores por token del tema
// (--ph-*, --brand-*): nada de hex de marca escrito acá.

import type { ReactNode } from "react";
import { Mail, MessageCircle, Phone, Instagram, Facebook } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CanalOrigen, Etapa } from "@/lib/eventos/tipos";
import { asesorDe, etapaDef, NOMBRE_CANAL } from "@/lib/eventos/catalogo";
import { NOMBRE_PRIORIDAD, type NivelPrioridad } from "@/lib/eventos/prioridad";

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

const ESTILO_PRIORIDAD: Record<NivelPrioridad, string> = {
  alta: "bg-[var(--ph-rojo-fondo)] text-[var(--brand-blue-dark)]",
  media: "bg-[var(--surface-2)] text-[var(--text)]",
  baja: "bg-surface text-[var(--text-2)]",
};

export function PrioridadChip({ nivel, className }: { nivel: NivelPrioridad; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide",
        ESTILO_PRIORIDAD[nivel],
        className,
      )}
    >
      {NOMBRE_PRIORIDAD[nivel]}
    </span>
  );
}

const ICONO_CANAL: Record<CanalOrigen, typeof Phone> = {
  llamada: Phone,
  whatsapp: MessageCircle,
  instagram: Instagram,
  facebook: Facebook,
  correo: Mail,
};

export function CanalChip({ canal, soloIcono = false }: { canal: CanalOrigen; soloIcono?: boolean }) {
  const Icono = ICONO_CANAL[canal];
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11.5px] font-medium text-[var(--text-2)]" title={NOMBRE_CANAL[canal]}>
      <Icono size={13} className="shrink-0" />
      {!soloIcono && NOMBRE_CANAL[canal]}
    </span>
  );
}

/** Lo que vino de una llamada o un chat de verdad, no de la muestra. */
export function RealBadge() {
  return (
    <span className="inline-flex items-center rounded-md bg-[var(--brand-accent)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
      Real
    </span>
  );
}

export function VencidoBadge({ horas }: { horas: number }) {
  const h = Math.abs(Math.round(horas));
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-md bg-[var(--ph-alarma-fondo)] px-1.5 py-0.5 text-[10.5px] font-bold text-[var(--brand-red)]">
      {h > 0 ? `Vencido hace ${h} h` : "Vencido"}
    </span>
  );
}

export function AsesorAvatar({ id, size = 24 }: { id: string; size?: number }) {
  const a = asesorDe(id);
  return (
    <span
      title={a?.nombre ?? "Sin asesor"}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--brand-accent)] font-bold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {a?.iniciales ?? "?"}
    </span>
  );
}

export function Seccion({ titulo, children, accion }: { titulo: string; children: ReactNode; accion?: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-card p-4">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-3)]">{titulo}</h3>
        {accion}
      </div>
      {children}
    </section>
  );
}

/** Un dato de la ficha. Vacío o "por definir" se ve atenuado, no desaparece. */
export function Dato({ label, valor, ancho = false }: { label: string; valor: ReactNode; ancho?: boolean }) {
  const vacio = valor === "" || valor === null || valor === undefined || valor === "Por definir";
  return (
    <div className={cn("min-w-0", ancho && "sm:col-span-2")}>
      <dt className="text-[11px] font-medium text-[var(--text-3)]">{label}</dt>
      <dd className={cn("text-[13px] font-semibold", vacio ? "italic text-[var(--text-3)]" : "text-[var(--text)]")}>
        {vacio ? "Por definir" : valor}
      </dd>
    </div>
  );
}

export const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
export const miles = (n: number) => n.toLocaleString("en-US");
