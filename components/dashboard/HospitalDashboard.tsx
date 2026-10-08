"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Clock,
  Inbox,
  MessageSquare,
  RefreshCw,
  TicketCheck,
  UserRound,
  Users,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { activeTenant } from "@/lib/tenants/active";
import { RESPONSABLE_HOSPITAL } from "@/lib/tickets-tenant";
import type { PanelHospital } from "@/lib/hospital-panel";
import { cn } from "@/lib/cn";

// El tablero del hospital: lo que de verdad está pasando en su WhatsApp. Lee
// /api/hospital/panel y se refresca solo cada minuto. No importa nada del
// servidor: el cálculo vive en lib/hospital-panel.ts.

const CADA_MS = 60_000;

function segundos(s: number | null): string {
  if (s === null) return "sin datos";
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}

function hace(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ${min % 60} min`;
  const d = Math.floor(h / 24);
  return `${d} d ${h % 24} h`;
}

export function HospitalDashboard() {
  const [panel, setPanel] = useState<PanelHospital | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const r = await fetch("/api/hospital/panel", { cache: "no-store" });
      const d = await r.json();
      if (d.ok) {
        setPanel(d.panel);
        setError(null);
      } else {
        setError(d.error ?? "No se pudieron leer las cifras.");
      }
    } catch {
      setError("No se pudieron leer las cifras.");
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(() => cargar(true), CADA_MS);
    return () => clearInterval(id);
  }, [cargar]);

  const agente = activeTenant().ai.nombre ?? "la asistente";
  const responsable =
    activeTenant().seed.staff.find((s) => s.id === RESPONSABLE_HOSPITAL)?.nombre ?? "la encargada";

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line bg-card px-5 py-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Dashboard</h1>
            <p className="text-[12.5px] text-[var(--text-3)]">
              El WhatsApp del hospital hoy, en hora de El Salvador
            </p>
          </div>
          <button
            type="button"
            onClick={() => cargar()}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-2)] hover:bg-[var(--brand-accent-soft)]"
          >
            <RefreshCw size={13} className={cn(cargando && "animate-spin")} />
            Actualizar
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {error && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">
            {error}
          </p>
        )}

        {!panel && !error && (
          <p className="rounded-2xl border border-line bg-card px-4 py-6 text-center text-[12.5px] text-[var(--text-3)]">
            Leyendo las conversaciones...
          </p>
        )}

        {panel && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard
                label="Conversaciones hoy"
                valor={panel.hoy.conversaciones}
                delta={panel.hoy.deltaPct ?? undefined}
                Icon={MessageSquare}
              />
              <MetricCard label="Mensajes recibidos hoy" valor={panel.hoy.mensajesEntrantes} Icon={Inbox} />
              <MetricCard label={`Respondidas por ${agente} hoy`} valor={panel.hoy.respondidasPorIA} Icon={Bot} />
              <MetricCard label="Atendidas por una persona hoy" valor={panel.hoy.atendidasPorPersona} Icon={UserRound} />
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard
                label="Conversaciones esta semana"
                valor={panel.semana.conversaciones}
                delta={panel.semana.deltaPct ?? undefined}
                Icon={Users}
              />
              <MetricCard
                label={`Cubiertas por ${agente} (semana)`}
                valor={panel.semana.pctIA === null ? "sin datos" : `${panel.semana.pctIA}%`}
                Icon={Bot}
              />
              <MetricCard
                label={`Tiempo de respuesta de ${agente}`}
                valor={segundos(panel.semana.respuestaMedianaSeg)}
                Icon={Clock}
              />
              <MetricCard label={`Tickets de ${responsable} abiertos`} valor={panel.tickets.deResponsable} Icon={TicketCheck} />
            </div>

            <Esperan panel={panel} />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <PorDia panel={panel} />
              <PorHora panel={panel} />
            </div>

            <Tickets panel={panel} responsable={responsable} />
          </>
        )}
      </div>
    </div>
  );
}

function Esperan({ panel }: { panel: PanelHospital }) {
  const n = panel.esperan.length;
  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-sm",
        n > 0 ? "border-amber-300" : "border-line",
      )}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-[var(--text)]">
          Esperan respuesta
          {n > 0 && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11.5px] font-bold text-amber-800">
              {n}
            </span>
          )}
        </h2>
        <Link href="/" className="text-[12px] font-semibold text-brand hover:underline">
          Ir a la bandeja
        </Link>
      </div>
      {n === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-[12.5px] text-[var(--text-3)]">
          Nadie está esperando: todos los chats tienen respuesta.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {panel.esperan.map((e) => (
            <li key={e.from} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[var(--text)]">
                  {e.nombre}
                  <span className="ml-2 text-[11.5px] font-normal text-[var(--text-3)]">{e.from}</span>
                </p>
                <p className="truncate text-[12.5px] text-[var(--text-2)]">{e.texto || "(archivo)"}</p>
              </div>
              <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11.5px] font-bold text-amber-800">
                hace {hace(e.minutos)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PorDia({ panel }: { panel: PanelHospital }) {
  const max = Math.max(1, ...panel.porDia.map((d) => d.entrantes));
  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-[var(--text)]">Últimos 14 días</h2>
        <span className="text-[11.5px] text-[var(--text-3)]">barra = mensajes recibidos, número = conversaciones</span>
      </div>
      <div className="flex h-36 items-end gap-1.5">
        {panel.porDia.map((d) => (
          <div key={d.dia} className="flex flex-1 flex-col items-center gap-1" title={`${d.etiqueta}: ${d.conversaciones} conversaciones, ${d.entrantes} mensajes`}>
            <span className="text-[10.5px] font-bold text-[var(--text-2)]">{d.conversaciones || ""}</span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-md bg-brand/80"
                style={{ height: `${Math.max(d.entrantes ? 6 : 2, (d.entrantes / max) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-[var(--text-3)]">{d.etiqueta}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PorHora({ panel }: { panel: PanelHospital }) {
  const max = Math.max(1, ...panel.porHora);
  const pico = panel.porHora.indexOf(max);
  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-[var(--text)]">A qué hora escriben</h2>
        <span className="text-[11.5px] text-[var(--text-3)]">
          {panel.semana.mensajesEntrantes > 0 ? `pico a las ${pico}:00, últimos 7 días` : "últimos 7 días"}
        </span>
      </div>
      <div className="flex h-36 items-end gap-[3px]">
        {panel.porHora.map((n, h) => (
          <div key={h} className="flex flex-1 flex-col items-center gap-1" title={`${h}:00, ${n} mensajes`}>
            <div className="flex w-full flex-1 items-end">
              <div
                className={cn("w-full rounded-t-sm", h === pico && n > 0 ? "bg-brand" : "bg-brand/40")}
                style={{ height: `${Math.max(n ? 6 : 2, (n / max) * 100)}%` }}
              />
            </div>
            <span className="text-[9.5px] text-[var(--text-3)]">{h % 3 === 0 ? h : ""}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Tickets({ panel, responsable }: { panel: PanelHospital; responsable: string }) {
  const t = panel.tickets;
  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-[var(--text)]">Tickets</h2>
        <Link href="/tickets" className="text-[12px] font-semibold text-brand hover:underline">
          Ver el tablero
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato label="Sin tomar" valor={t.sinTomar} />
        <Dato label={`De ${responsable}`} valor={t.deResponsable} />
        <Dato label="En proceso" valor={t.enProceso} />
        <Dato label="Resueltos hoy" valor={t.resueltosHoy} />
      </div>
      {t.abiertosPorTipo.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {t.abiertosPorTipo.map((x) => (
            <span key={x.tipo} className="rounded-full bg-[var(--brand-accent-soft)] px-2.5 py-1 text-[12px] font-semibold text-brand">
              {x.label} · {x.n}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function Dato({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-xl border border-line px-3 py-2.5">
      <p className="text-[22px] font-extrabold leading-none text-[var(--text)]">{valor}</p>
      <p className="mt-1 text-[12px] text-[var(--text-3)]">{label}</p>
    </div>
  );
}
