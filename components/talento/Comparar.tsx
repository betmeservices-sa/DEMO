"use client";

import Link from "next/link";
import { Columns3, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { MAX_COMPARAR } from "@/lib/talento/comparar";
import { alternarComparar, limpiarComparar, useComparar } from "@/lib/talento/seleccion";
import { useTalento } from "@/lib/talento/store";

/** Casilla "Comparar" para tarjetas y filas. Se apaga cuando ya hay tres. */
export function BotonComparar({ id, vacanteId, className }: { id: string; vacanteId?: string | null; className?: string }) {
  const sel = useComparar();
  const on = sel.ids.includes(id);
  const lleno = !on && sel.ids.length >= MAX_COMPARAR;
  return (
    <button
      type="button"
      data-comparar={id}
      aria-pressed={on}
      disabled={lleno}
      title={lleno ? `Máximo ${MAX_COMPARAR}` : undefined}
      onClick={(e) => {
        e.stopPropagation();
        alternarComparar(id, vacanteId);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
        on ? "border-brand bg-brand text-white" : "border-line bg-card text-[var(--text-2)] hover:bg-surface",
        className,
      )}
    >
      <Columns3 size={11} /> Comparar
    </button>
  );
}

/** Barra flotante con los elegidos. Solo aparece si hay alguno. */
export function BarraComparar() {
  const sel = useComparar();
  const estado = useTalento();
  if (!estado || sel.ids.length === 0) return null;
  const nombres = sel.ids.map((id) => estado.candidatos.find((c) => c.id === id)).filter(Boolean);
  const href = `/talento/comparar${sel.vacanteId ? `?vacante=${sel.vacanteId}` : ""}`;
  return (
    <div
      data-barra-comparar
      className="fixed inset-x-3 bottom-3 z-[55] mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-line bg-card px-3 py-2.5 shadow-2xl lg:left-[272px]"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {nombres.map((c) => (
          <span key={c!.id} className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[12px] font-semibold text-[var(--text)] ring-1 ring-inset ring-[var(--border)]">
            {c!.nombre}
            <button type="button" aria-label={`Quitar a ${c!.nombre}`} onClick={() => alternarComparar(c!.id)} className="text-[var(--text-3)] hover:text-[var(--text)]">
              <X size={12} />
            </button>
          </span>
        ))}
        <span className="text-[11.5px] text-[var(--text-3)]">
          {sel.ids.length}/{MAX_COMPARAR}
        </span>
      </div>
      <button type="button" onClick={limpiarComparar} className="rounded-lg px-2 py-1.5 text-[12px] font-semibold text-[var(--text-3)] hover:bg-surface">
        Limpiar
      </button>
      <Link
        href={href}
        aria-disabled={sel.ids.length < 2}
        onClick={(e) => sel.ids.length < 2 && e.preventDefault()}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm",
          sel.ids.length < 2 && "pointer-events-none opacity-50",
        )}
      >
        <Columns3 size={14} /> Comparar {sel.ids.length}
      </Link>
    </div>
  );
}
