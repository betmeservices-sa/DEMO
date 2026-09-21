"use client";

// Los que llevan dias quietos, partidos por lo que hay que hacerles.
//
// Van separados a proposito. Al de COTIZACION hay que buscarlo para que venga a
// manejar el carro: todavia no se compromete con nada. Al de NEGOCIACION ya se
// le hizo una oferta en firme y nadie volvio a llamarlo, y esa es la peor de
// las dos: es una venta que estaba a un si de distancia.

import { MessageSquare, PhoneCall, Snowflake } from "lucide-react";
import { cn } from "@/lib/cn";
import { nombreDeModelo } from "@/lib/autos-catalogo";
import type { LeadFrio } from "@/lib/autos-pipeline";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const dias = (n: number) => (n === 0 ? "hoy" : n === 1 ? "1 día" : `${n} días`);

export function Enfriandose({
  conCotizacion,
  enNegociacion,
  nombreVendedor,
}: {
  conCotizacion: LeadFrio[];
  enNegociacion: LeadFrio[];
  nombreVendedor: (id: string | null) => string;
}) {
  if (conCotizacion.length === 0 && enNegociacion.length === 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h3 className="flex items-center gap-2 text-[14px] font-bold text-[var(--text)]">
        <Snowflake size={15} className="text-brand" />
        Se están enfriando
      </h3>
      <div className="mt-2 grid gap-4 lg:grid-cols-2">
        <Grupo
          titulo="Con cotización en la mano"
          pie="Ya saben el precio y nadie los volvió a buscar"
          leads={conCotizacion}
          nombreVendedor={nombreVendedor}
        />
        <Grupo
          titulo="Con propuesta en firme"
          pie="Estaban a un sí de comprar"
          leads={enNegociacion}
          nombreVendedor={nombreVendedor}
        />
      </div>
    </section>
  );
}

function Grupo({
  titulo,
  pie,
  leads,
  nombreVendedor,
}: {
  titulo: string;
  pie: string;
  leads: LeadFrio[];
  nombreVendedor: (id: string | null) => string;
}) {
  return (
    <div className="min-w-0">
      <h4 className="text-[12.5px] font-bold text-[var(--text-2)]">
        {titulo} <span className="font-semibold text-[var(--text-3)]">· {leads.length}</span>
      </h4>
      <p className="text-[11.5px] text-[var(--text-3)]">{pie}</p>
      <ul className="mt-1.5">
        {leads.length === 0 && <li className="py-2 text-[12px] text-[var(--text-3)]">Nadie quieto acá.</li>}
        {leads.map((l) => (
          <li key={l.telefono} className="border-b border-line/60 py-2 last:border-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[12.5px] font-semibold text-[var(--text)]">{l.nombre}</span>
              <span
                className={cn(
                  "shrink-0 text-[12.5px] font-bold tabular-nums",
                  l.monto ? "text-[var(--text)]" : "text-[var(--text-3)]",
                )}
              >
                {l.monto ? usd(l.monto) : "sin precio"}
              </span>
            </div>
            <p className="truncate text-[11.5px] text-[var(--text-3)]">
              {nombreDeModelo(l.modelo)} · {nombreVendedor(l.vendedor)} · {l.resumen}
            </p>
            {/* Cuántas veces ya se le buscó y hace cuánto que nadie lo toca.
                El dato existía en el caso y no se estaba mostrando: sin esto,
                "3 días" no distingue al que ya recibió cuatro llamadas del que
                nunca recibió ninguna, que son dos decisiones distintas. */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--text-2)]">
              <span className="inline-flex items-center gap-1">
                <PhoneCall size={11} className="text-[var(--text-3)]" />
                {l.llamadas} {l.llamadas === 1 ? "llamada" : "llamadas"}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare size={11} className="text-[var(--text-3)]" />
                {l.mensajes} {l.mensajes === 1 ? "mensaje" : "mensajes"}
              </span>
              <span className={cn(l.diasSinContacto >= 7 && "font-semibold text-[var(--brand-red)]")}>
                {l.diasSinContacto === 0 ? "contactado hoy" : `${dias(l.diasSinContacto)} sin contacto`}
              </span>
              <span className="text-[var(--text-3)]">{dias(l.diasDesdeInfo)} desde que llegó</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
