"use client";

// Como va la sala de ventas, en una pantalla.
//
// Nissan tiene su propio panel por la misma razon que lo tienen Yali y la
// agencia: la pregunta es otra. Aca no se mide la actividad de comunicacion, se
// mide si los carros salen del piso: cuantos se entregaron, cuanto se facturo,
// cuanta gente vino a manejar una unidad y donde esta parada la venta. El
// detalle caso por caso vive en la Sala de ventas; esto es la foto.

import { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, CalendarCheck, Car, KeySquare } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import type { RespuestaReporte } from "@/components/autos/tipos";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function NissanDashboard() {
  const [r, setReporte] = useState<RespuestaReporte | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/autos/reporte?periodo=30d", { cache: "no-store" })
      .then((res) => res.json())
      .then((d: RespuestaReporte) => {
        if (vivo && d.ok) setReporte(d);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  const pruebas = useMemo(() => (r?.vendedores ?? []).reduce((n, v) => n + v.pruebas, 0), [r]);
  const ticket = r && r.movimiento.ventas > 0 ? r.movimiento.monto / r.movimiento.ventas : null;
  const abiertas = (r?.embudo ?? []).filter((e) => e.etapa !== "entregados" && e.etapa !== "perdidos");
  const totalAbiertas = abiertas.reduce((n, e) => n + e.n, 0);
  const separados = r?.embudo.find((e) => e.etapa === "separados");
  const negociacion = r?.embudo.find((e) => e.etapa === "negociacion");
  const modelos = (r?.modelos ?? []).filter((m) => m.interesados > 0).slice(0, 6);
  const topModelo = Math.max(1, ...modelos.map((m) => m.interesados));

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line bg-card px-5 py-3">
        <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Cómo va la sala</h1>
        <p className="text-[12.5px] text-[var(--text-3)]">Los últimos 30 días</p>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Unidades entregadas" valor={r?.movimiento.ventas ?? 0} Icon={KeySquare} />
          <MetricCard label="Facturado" valor={usd(r?.movimiento.monto ?? 0)} Icon={BadgeDollarSign} />
          <MetricCard
            label="Precio promedio por unidad"
            valor={ticket === null ? "sin entregas" : usd(ticket)}
            Icon={Car}
          />
          <MetricCard label="Pruebas de manejo" valor={pruebas} Icon={CalendarCheck} />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
            <h2 className="text-sm font-bold text-[var(--text)]">Dónde está la venta</h2>
            <p className="mb-4 text-[12px] text-[var(--text-3)]">
              {totalAbiertas} prospectos vivos por {usd(abiertas.reduce((m, e) => m + e.monto, 0))}
            </p>
            <div className="space-y-3">
              {abiertas.map((e) => {
                const pct = totalAbiertas === 0 ? 0 : Math.round((e.n / totalAbiertas) * 100);
                return (
                  <div key={e.etapa}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-[12.5px]">
                      <span className="flex min-w-0 items-center gap-2 font-medium text-[var(--text-2)]">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
                        <span className="truncate">{e.nombre}</span>
                      </span>
                      <span className="shrink-0 font-bold text-[var(--text)]">
                        {e.n} <span className="text-[var(--text-3)]">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: e.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
            <h2 className="text-sm font-bold text-[var(--text)]">Qué se está pidiendo</h2>
            <p className="mb-4 text-[12px] text-[var(--text-3)]">Modelos que están viendo los prospectos vivos</p>
            <div className="space-y-3">
              {modelos.length === 0 && <p className="text-[12.5px] text-[var(--text-3)]">Todavía no hay prospectos.</p>}
              {modelos.map((m) => (
                <div key={m.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="min-w-0 truncate font-medium text-[var(--text-2)]">{m.nombre}</span>
                    <span className="shrink-0 font-bold text-[var(--text)]">
                      {m.interesados}
                      {m.vendidos > 0 && (
                        <span className="ml-1.5 text-[11.5px] font-semibold text-[var(--text-3)]">
                          {m.vendidos} entregados
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-[var(--brand-accent)] transition-all duration-500"
                      style={{ width: `${Math.round((m.interesados / topModelo) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-[var(--text)]">Lo que hay que atender hoy</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Dato
              valor={r?.alertas.length ?? 0}
              label="Leads sin llamar"
              alarma={(r?.alertas.length ?? 0) > 0}
            />
            <Dato
              valor={r?.pasos.citasVencidas.length ?? 0}
              label="Citas que ya pasaron"
              alarma={(r?.pasos.citasVencidas.length ?? 0) > 0}
            />
            <Dato valor={negociacion?.n ?? 0} label="Con propuesta en firme" />
            <Dato
              valor={separados?.n ?? 0}
              label="Unidades separadas"
              pie={separados && separados.monto > 0 ? `${usd(separados.monto)} por entregar` : undefined}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function Dato({ valor, label, pie, alarma }: { valor: number; label: string; pie?: string; alarma?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface/60 p-3">
      <p
        className={`text-[22px] font-extrabold leading-none tracking-tight ${
          alarma ? "text-[var(--brand-red)]" : "text-[var(--text)]"
        }`}
      >
        {valor}
      </p>
      <p className="mt-1 text-[12px] font-medium text-[var(--text-2)]">{label}</p>
      {pie && <p className="text-[11.5px] text-[var(--text-3)]">{pie}</p>}
    </div>
  );
}
