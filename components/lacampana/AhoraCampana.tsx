"use client";

// La franja "ahora mismo" del tablero de La Campana: la cola de cocina y lo
// próximo de la agenda, leídos del mismo store que Pedidos y Reservas.

import Link from "next/link";
import { CalendarHeart, ChefHat, Clock } from "lucide-react";
import { CAPACIDAD_COCINA, colaDe, enCocina } from "@/lib/lacampana/pedidos";
import { SUCURSALES_CAMPANA, sucursalPorId } from "@/lib/lacampana/sucursales";
import { useCampana } from "@/lib/lacampana/store";
import { hora } from "./ui";

export function AhoraCampana() {
  const { pedidos, citas } = useCampana();
  const ahora = Date.now();
  const enCola = pedidos.filter((p) => p.etapa === "cola").length;
  const cocinando = pedidos.filter((p) => p.etapa === "cocina").length;
  const llenas = SUCURSALES_CAMPANA.filter((s) => enCocina(pedidos, s.id) >= CAPACIDAD_COCINA && colaDe(pedidos, s.id, ahora).length > 0);
  const proximas = citas
    .filter((c) => c.estado !== "cancelada" && Date.parse(c.inicio) + c.duracion * 60_000 > ahora)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .slice(0, 3);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Link href="/pedidos" className="rounded-2xl border border-line bg-card p-5 shadow-sm transition hover:bg-surface">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
          <ChefHat size={16} className="text-brand" /> Cola de cocina, ahora
        </h2>
        <p className="mt-2 text-[13px] text-[var(--text-2)]">
          <b className="text-[22px] font-extrabold text-[var(--text)]">{enCola}</b> en cola · <b>{cocinando}</b> en cocina
        </p>
        <p className="mt-1 text-[12px] text-[var(--text-3)]">
          {llenas.length === 0
            ? "Ninguna cocina saturada."
            : `Cocina llena con cola en ${llenas.map((s) => s.nombre).join(", ")}.`}
        </p>
      </Link>
      <Link href="/agenda" className="rounded-2xl border border-line bg-card p-5 shadow-sm transition hover:bg-surface">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
          <CalendarHeart size={16} className="text-brand" /> Próximas reservas y eventos
        </h2>
        <ul className="mt-2 space-y-1.5">
          {proximas.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-[12.5px]">
              <Clock size={12} className="shrink-0 text-[var(--text-3)]" />
              <span className="w-[92px] shrink-0 capitalize text-[var(--text-3)]">
                {new Date(c.inicio).toLocaleDateString("es-SV", { weekday: "short" })} {hora(c.inicio)}
              </span>
              <span className="truncate font-semibold text-[var(--text)]">{c.titulo}</span>
              <span className="ml-auto shrink-0 text-[var(--text-3)]">
                {c.personas} pers. · {sucursalPorId(c.sucursalId)?.nombre}
              </span>
            </li>
          ))}
          {proximas.length === 0 && <li className="text-[12.5px] text-[var(--text-3)]">Nada agendado.</li>}
        </ul>
      </Link>
    </div>
  );
}
