"use client";

// El embudo de la sala: donde esta la gente y, sobre todo, donde esta la plata.
//
// Es un embudo de verdad y no una lista de barras: cada tramo es mas angosto
// que el de arriba, asi se ve de un vistazo por donde se esta cayendo el
// dinero. El ancho lo da la POSICION, no la cantidad; si lo diera la cantidad,
// un tramo con mas gente que el anterior rompería la forma y el gerente veria
// un acordeon en vez de un embudo.
//
// Al tocar un tramo salen los leads de esa etapa: nombre, vendedor, modelo y
// cuanto vale la operacion. Ahi la pantalla deja de ser un resumen y se vuelve
// una lista de a quien llamar.

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { nombreDeModelo } from "@/lib/autos-catalogo";
import type { LeadEnEtapa, ReporteAutos } from "@/lib/autos-pipeline";

type Tramo = ReporteAutos["embudo"][number];

/** El de arriba ocupa todo; el de abajo, poco mas de un tercio. */
const ANCHO_ARRIBA = 100;
const ANCHO_ABAJO = 38;

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** $28,700 no cabe en el tramo angosto; $29k si. */
function usdCorto(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${Math.round(n / 1000)}k`;
  return usd(n);
}

function anchoEn(i: number, total: number): number {
  return ANCHO_ARRIBA - ((ANCHO_ARRIBA - ANCHO_ABAJO) * i) / Math.max(1, total);
}

export function Embudo({
  etapas,
  nombreVendedor,
}: {
  etapas: Tramo[];
  nombreVendedor: (id: string | null) => string;
}) {
  const [abierta, setAbierta] = useState<string | null>(null);
  // Lo cerrado no es parte del embudo: entregado y perdido son el resultado, no
  // un lugar donde alguien este esperando algo.
  const vivas = etapas.filter((e) => e.etapa !== "entregados" && e.etapa !== "perdidos");
  const cerradas = etapas.filter((e) => e.etapa === "entregados" || e.etapa === "perdidos");
  const tramo = etapas.find((e) => e.etapa === abierta) ?? null;
  const vivos = vivas.reduce((n, e) => n + e.n, 0);
  const sinPrecio = vivas.reduce((n, e) => n + e.leads.filter((l) => !l.monto).length, 0);

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-bold text-[var(--text)]">Dónde está la venta</h3>
        <p className="text-[12px] text-[var(--text-3)]">
          {vivas.reduce((n, e) => n + e.n, 0)} vivos por {usd(vivas.reduce((m, e) => m + e.monto, 0))}
        </p>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-[3px]">
          {vivas.map((e, i) => {
            const activo = abierta === e.etapa;
            // El tramo se dibuja recortando un trapecio: ancho de arriba el de
            // esta etapa, ancho de abajo el de la siguiente. Eso es lo que hace
            // que la figura sea un embudo y no una escalera de barras, que era
            // lo que habia aunque el comentario de arriba dijera otra cosa.
            const arriba = anchoEn(i, vivas.length);
            const abajo = anchoEn(i + 1, vivas.length);
            return (
              <button
                key={e.etapa}
                type="button"
                onClick={() => setAbierta(activo ? null : e.etapa)}
                aria-pressed={activo}
                className="group block w-full text-left transition-transform duration-200 hover:scale-[1.01]"
              >
                <div
                  className={cn(
                    "ccg-barra ccg-barra-centro flex h-[58px] items-center justify-center px-3 text-white transition-all duration-200",
                    activo ? "brightness-110 saturate-125" : "brightness-100 group-hover:brightness-105",
                  )}
                  style={{
                    background: e.color,
                    clipPath: `polygon(${(100 - arriba) / 2}% 0%, ${(100 + arriba) / 2}% 0%, ${(100 + abajo) / 2}% 100%, ${(100 - abajo) / 2}% 100%)`,
                    opacity: e.n === 0 ? 0.45 : 1,
                    // Se abre de arriba hacia abajo, en el orden del embudo.
                    animationDelay: `${i * 70}ms`,
                  }}
                >
                  <div className="min-w-0 text-center leading-tight">
                    <p className="truncate text-[12px] font-bold">{e.nombre}</p>
                    <p className="truncate text-[11px] font-medium tabular-nums opacity-90">
                      {e.n} {e.n === 1 ? "prospecto" : "prospectos"}
                      {e.monto > 0 ? ` · ${usdCorto(e.monto)}` : ""}
                    </p>
                  </div>
                  <ChevronRight
                    size={13}
                    className={cn(
                      "ml-1 shrink-0 transition-transform duration-200",
                      activo ? "rotate-90 opacity-100" : "opacity-0 group-hover:opacity-70",
                    )}
                  />
                </div>
              </button>
            );
          })}

          <div className="mt-2 flex flex-wrap gap-2 border-t border-line pt-2">
            {cerradas.map((e) => (
              <button
                key={e.etapa}
                type="button"
                onClick={() => setAbierta(abierta === e.etapa ? null : e.etapa)}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition",
                  abierta === e.etapa ? "border-brand text-brand" : "border-line text-[var(--text-2)] hover:bg-surface",
                )}
              >
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: e.color }} />
                {e.nombre} · {e.n}
                {e.etapa === "entregados" && e.monto > 0 ? ` · ${usd(e.monto)}` : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-line bg-surface/50 p-3">
          {tramo === null ? (
            /* Antes acá había una frase pidiendo un clic y nada más: media
               pantalla en blanco justo donde el gerente mira primero. Sin tocar
               nada, ahora dice cuánta plata hay viva y en qué tres etapas está
               parada. */
            <div className="flex h-full flex-col justify-center gap-3">
              <div>
                <p className="text-[26px] font-black leading-none tracking-tight text-[var(--text)]">
                  {usd(vivas.reduce((m, e) => m + e.monto, 0))}
                </p>
                <p className="mt-1 text-[12px] text-[var(--text-2)]">
                  en {vivos} {vivos === 1 ? "prospecto" : "prospectos"}
                  {sinPrecio > 0 ? `, ${sinPrecio} sin precio` : ""}
                </p>
              </div>
              <div className="space-y-1">
                {[...vivas]
                  .filter((e) => e.n > 0)
                  .sort((a, b) => b.monto - a.monto)
                  .slice(0, 3)
                  .map((e) => (
                    <div key={e.etapa} className="flex items-center gap-2 text-[11.5px]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.color }} />
                      <span className="min-w-0 flex-1 truncate text-[var(--text-2)]">{e.nombre}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-[var(--text)]">
                        {usdCorto(e.monto)}
                      </span>
                    </div>
                  ))}
              </div>
              <p className="text-[11.5px] text-[var(--text-3)]">
                Toque un tramo para ver quiénes están ahí y a quién hay que llamar.
              </p>
            </div>
          ) : (
            <>
              <h4 className="text-[12.5px] font-bold text-[var(--text)]">{tramo.nombre}</h4>
              <p className="text-[11.5px] text-[var(--text-3)]">{tramo.ayuda}</p>
              <ul className="mt-2 max-h-72 overflow-y-auto">
                {tramo.leads.length === 0 && <li className="py-2 text-[12px] text-[var(--text-3)]">Sin nadie acá.</li>}
                {tramo.leads.map((l, i) => (
                  <Lead key={l.telefono} lead={l} vendedor={nombreVendedor(l.vendedor)} i={i} />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Lead({ lead, vendedor, i }: { lead: LeadEnEtapa; vendedor: string; i: number }) {
  return (
    <li
      className="ccg-pop flex items-baseline justify-between gap-3 border-b border-line/60 py-2 last:border-0"
      style={{ animationDelay: `${Math.min(i, 12) * 22}ms` }}
    >
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-semibold text-[var(--text)]">{lead.nombre}</span>
        <span className="block truncate text-[11px] text-[var(--text-3)]">
          {nombreDeModelo(lead.modelo)} · {vendedor}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 text-[12.5px] font-bold tabular-nums",
          lead.monto ? "text-[var(--text)]" : "text-[var(--text-3)]",
        )}
      >
        {lead.monto ? usd(lead.monto) : "sin precio"}
      </span>
    </li>
  );
}
