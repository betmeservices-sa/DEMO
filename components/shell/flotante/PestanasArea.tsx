"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";
import { activeTenant } from "@/lib/tenants/active";
import { departments } from "@/lib/data/seed";
import { fijarArea, useArea, type AreaShell } from "@/lib/area-shell";

/**
 * Las areas del cliente como pestanas. Filtran la bandeja y el tablero a la
 * vez. El numero es lo que espera respuesta en cada una (conversaciones sin
 * resolver), no el total: es lo que se mira al empezar el turno.
 */
export function PestanasArea({ className, grupo }: { className?: string; grupo: string }) {
  const area = useArea();
  const { state } = useStore();
  const ids = activeTenant().areas ?? [];

  const abiertas = (a: AreaShell) =>
    state.conversations.filter((c) => c.estado !== "resuelto" && (a === "todos" || c.departamento === a)).length;

  const pestanas: { id: AreaShell; label: string }[] = [
    { id: "todos", label: "Todo" },
    ...ids.map((id) => ({ id, label: departments.find((d) => d.id === id)?.nombre ?? id })),
  ];

  return (
    <div
      role="tablist"
      aria-label="Área"
      className={cn("flex items-center gap-1 rounded-full bg-[var(--surface)] p-1", className)}
    >
      {pestanas.map((p) => {
        const activa = area === p.id;
        const n = abiertas(p.id);
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => fijarArea(p.id)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors duration-150",
              activa ? "text-white" : "text-[var(--text-2)] hover:text-[var(--text)]",
            )}
          >
            {activa && (
              <motion.span
                // Una pastilla por instancia: la barra de escritorio y la fila de
                // celular conviven en el DOM (una oculta), y con el mismo id
                // framer movia la pastilla a la que no se ve.
                layoutId={`caja-area-activa-${grupo}`}
                className="absolute inset-0 rounded-full bg-[var(--brand-blue)] shadow-sm"
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
              />
            )}
            <span className="relative">{p.label}</span>
            {n > 0 && (
              <span
                className={cn(
                  "relative rounded-full px-1.5 text-[11px] font-bold leading-[18px]",
                  activa ? "bg-white/20 text-white" : "bg-[var(--card)] text-[var(--text-2)] ring-1 ring-[var(--border)]",
                )}
              >
                {n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
