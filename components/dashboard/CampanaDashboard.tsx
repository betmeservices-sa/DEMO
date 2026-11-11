"use client";

// El tablero de La Campana: pedidos, ventas por sucursal, platos más pedidos y
// lo que entra por los chats que atiende Sofía.
//
// Las cifras de pedidos y ventas son de demostración (lib/lacampana/panel-demo.ts);
// las conversaciones por área sí salen de la bandeja.
//
// Todas las gráficas son de UNA serie, en el rojo de la marca: magnitud, no
// identidad. Por eso no llevan leyenda; el título dice qué se mide y cada barra
// trae su valor al pasar el cursor (y escrito, en las listas).

import Image from "next/image";
import { useMemo, useState } from "react";
import { Bike, Bot, Clock, DollarSign, Receipt, ShoppingBag, Store, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/cn";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DeptBreakdown } from "@/components/dashboard/DeptBreakdown";
import { PERIODOS_CAMPANA, dinero, panelCampana, type PeriodoCampana } from "@/lib/lacampana/panel-demo";
import { precio } from "@/lib/lacampana/menu";
import { AhoraCampana } from "@/components/lacampana/AhoraCampana";

export function CampanaDashboard() {
  const { state } = useStore();
  const [dias, setDias] = useState<PeriodoCampana>(1);
  const p = useMemo(() => panelCampana(dias), [dias]);
  const periodo = PERIODOS_CAMPANA.find((x) => x.dias === dias)?.nombre.toLowerCase() ?? "";

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line bg-card px-5 py-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Dashboard</h1>
            <p className="text-[12.5px] text-[var(--text-3)]">
              Pedidos, ventas y conversaciones de las {p.porSucursal.length} sucursales · cifras de demostración
            </p>
          </div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
            {PERIODOS_CAMPANA.map((x) => (
              <button
                key={x.dias}
                type="button"
                onClick={() => setDias(x.dias)}
                aria-pressed={dias === x.dias}
                className={cn(
                  "rounded-lg px-3 py-1 text-[12px] font-semibold transition",
                  dias === x.dias ? "bg-brand text-white shadow-sm" : "text-[var(--text-2)] hover:bg-card",
                )}
              >
                {x.nombre}
              </button>
            ))}
          </div>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <MetricCard label={`Pedidos · ${periodo}`} valor={p.pedidos.toLocaleString("en-US")} delta={p.deltaPedidos} Icon={ShoppingBag} />
          <MetricCard label={`Ventas · ${periodo}`} valor={dinero(p.ventas)} delta={p.deltaVentas} Icon={DollarSign} />
          <MetricCard label="Ticket promedio" valor={precio(p.ticketPromedio)} Icon={Receipt} />
          <MetricCard label="Chats resueltos por Sofía" valor={`${p.resueltasPorIa}%`} Icon={Bot} />
          <MetricCard label="Primera respuesta" valor={`${p.respuestaSeg} s`} Icon={Clock} />
        </div>

        <AhoraCampana />

        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Panel titulo="Pedidos por hora" bajada={dias === 1 ? "Hoy, de 11:00 a 21:00" : `Promedio diario, ${periodo}`}>
            <Columnas datos={p.porHora.map((h) => ({ etiqueta: h.hora, valor: h.pedidos, texto: `${h.pedidos} pedidos` }))} />
          </Panel>

          <Panel titulo="Cómo reciben su pedido" bajada="Porcentaje de pedidos">
            <div className="space-y-4 pt-2">
              <Proporcion Icono={Bike} rotulo="Entrega a domicilio" pct={p.entrega.domicilio} />
              <Proporcion Icono={Store} rotulo="Retiro en sucursal" pct={p.entrega.retiro} />
            </div>
            <div className="mt-6">
              <p className="mb-2 text-[12px] font-semibold text-[var(--text-3)]">Pedidos por canal</p>
              <Barras
                datos={p.porCanal.map((c) => ({ etiqueta: c.canal, valor: c.pedidos, texto: c.pedidos.toLocaleString("en-US") }))}
              />
            </div>
          </Panel>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel titulo="Ventas por sucursal" bajada={`De mayor a menor, ${periodo}`}>
            <Barras
              datos={p.porSucursal.map((s) => ({
                etiqueta: s.nombre,
                valor: s.ventas,
                texto: dinero(s.ventas),
                detalle: `${s.pedidos.toLocaleString("en-US")} pedidos`,
              }))}
            />
          </Panel>

          <Panel titulo="Platos más pedidos" bajada={`Unidades vendidas, ${periodo}`}>
            <ol className="space-y-2.5">
              {p.topPlatos.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3">
                  <span className="w-5 text-right text-[12px] font-bold text-[var(--text-3)]">{i + 1}</span>
                  {t.foto ? (
                    <Image src={t.foto} alt="" width={44} height={44} className="h-11 w-11 rounded-lg object-cover" />
                  ) : (
                    <span className="h-11 w-11 rounded-lg bg-surface" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[var(--text)]">{t.nombre}</p>
                    <p className="text-[12px] text-[var(--text-3)]">{dinero(t.ventas)} en ventas</p>
                  </div>
                  <span className="text-[14px] font-bold tabular-nums text-[var(--text)]">{t.unidades.toLocaleString("en-US")}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel titulo="Por qué escriben" bajada={`Conversaciones clasificadas por Sofía, ${periodo}`}>
            <Barras
              datos={p.motivos.map((m) => ({ etiqueta: m.motivo, valor: m.conversaciones, texto: m.conversaciones.toLocaleString("en-US") }))}
            />
          </Panel>
          <DeptBreakdown conversations={state.conversations} />
        </div>

        <p className="flex items-center gap-2 text-[12px] text-[var(--text-3)]">
          <TrendingUp size={13} />
          Pedidos y ventas son de demostración: el panel se conecta al sistema de pedidos del restaurante en la implementación.
        </p>
      </div>
    </div>
  );
}

function Panel({ titulo, bajada, children }: { titulo: string; bajada?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h2 className="text-sm font-bold text-[var(--text)]">{titulo}</h2>
      {bajada ? <p className="mb-4 mt-0.5 text-[12px] text-[var(--text-3)]">{bajada}</p> : <div className="mb-4" />}
      {children}
    </section>
  );
}

interface Dato {
  etiqueta: string;
  valor: number;
  texto: string;
  detalle?: string;
}

/** Barras horizontales con el valor escrito a la derecha. */
function Barras({ datos }: { datos: Dato[] }) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <ul className="space-y-2">
      {datos.map((d) => (
        <li key={d.etiqueta} className="group grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-3" title={d.detalle ? `${d.texto} · ${d.detalle}` : d.texto}>
          <span className="truncate text-[12.5px] text-[var(--text-2)]">{d.etiqueta}</span>
          <span className="h-2.5 rounded-full bg-surface">
            <span
              className="block h-full rounded-full bg-brand transition-opacity group-hover:opacity-80"
              style={{ width: `${Math.max(2, (d.valor / max) * 100)}%` }}
            />
          </span>
          <span className="text-right text-[12.5px] font-semibold tabular-nums text-[var(--text)]">{d.texto}</span>
        </li>
      ))}
    </ul>
  );
}

/** Columnas verticales con tooltip al pasar el cursor o enfocar. */
function Columnas({ datos }: { datos: Dato[] }) {
  const [activa, setActiva] = useState<number | null>(null);
  const max = Math.max(1, ...datos.map((d) => d.valor));
  const pico = datos.reduce((m, d, i) => (d.valor > datos[m].valor ? i : m), 0);
  return (
    <div>
      <div className="relative flex h-48 items-end gap-[2px]" onMouseLeave={() => setActiva(null)}>
        {datos.map((d, i) => (
          <button
            key={d.etiqueta}
            type="button"
            onMouseEnter={() => setActiva(i)}
            onFocus={() => setActiva(i)}
            onBlur={() => setActiva(null)}
            aria-label={`${d.etiqueta}: ${d.texto}`}
            className="relative flex h-full flex-1 items-end justify-center"
          >
            <span
              className={cn("block w-full max-w-[34px] rounded-t-[4px] bg-brand transition-opacity", activa !== null && activa !== i && "opacity-45")}
              style={{ height: `${(d.valor / max) * 100}%` }}
            />
            {activa === i || (activa === null && i === pico) ? (
              <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-line bg-card px-2 py-1 text-[11.5px] font-semibold text-[var(--text)] shadow-sm">
                {d.etiqueta} · {d.texto}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-[2px] border-t border-line pt-1.5">
        {datos.map((d) => (
          <span key={d.etiqueta} className="flex-1 text-center text-[10.5px] text-[var(--text-3)]">
            {d.etiqueta.replace(":00", "")}
          </span>
        ))}
      </div>
    </div>
  );
}

function Proporcion({ Icono, rotulo, pct }: { Icono: typeof Bike; rotulo: string; pct: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="flex items-center gap-2 font-semibold text-[var(--text)]">
          <Icono size={15} className="text-brand" /> {rotulo}
        </span>
        <span className="font-bold tabular-nums text-[var(--text)]">{Math.round(pct * 100)}%</span>
      </div>
      <span className="block h-2.5 rounded-full bg-surface">
        <span className="block h-full rounded-full bg-brand" style={{ width: `${pct * 100}%` }} />
      </span>
    </div>
  );
}
