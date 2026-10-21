"use client";

// IA Performance de un hotel de muestra: cómo va la que atiende.
//
// Es la pantalla /ia de Porta Stays (que salió de la de Yali): cuánto entra por
// cada canal, cuánto contestó el agente y cuánto el equipo, de qué hablan y qué
// fechas piden. En Yali esas cifras salen de la base; acá, de la muestra del
// hotel (lib/hotel-muestra/ia.ts). Va aparte del Dashboard por lo mismo que en
// Yali: "¿cómo va el hotel?" y "¿cómo va la que atiende?" son dos preguntas.

import { useMemo, useState } from "react";
import { CalendarDays, Facebook, Inbox, Instagram, MessageCircle, MessageSquare, Bot, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";
import { activeTenantId } from "@/lib/tenants/active";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { OrigenCanales } from "@/components/dashboard/OrigenCanales";
import { DeptBreakdown } from "@/components/dashboard/DeptBreakdown";
import { RANGOS } from "@/components/hotel-muestra/HotelMuestraDashboard";
import { hotelMuestraDe } from "@/lib/hotel-muestra/registro";
import { useHotelMuestra } from "@/lib/hotel-muestra/store";
import { cifrasIa } from "@/lib/hotel-muestra/ia";
import { fechaLarga } from "@/lib/hotel-muestra/fechas";

const COLOR = { whatsapp: "#25d366", facebook: "#1877f2", instagram: "#e1306c" };
const BARRAS = ["bg-brand", "bg-brand/80", "bg-sky-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-400", "bg-teal-500", "bg-slate-400"];

export default function IaPerformancePage() {
  const { state } = useStore();
  const hotel = hotelMuestraDe(activeTenantId());
  const vista = useHotelMuestra();
  const [dias, setDias] = useState(7);

  const c = useMemo(() => {
    if (!hotel || !vista) return null;
    const hora = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/El_Salvador", hour: "numeric", hourCycle: "h23" }).format(new Date(vista.ahora)));
    return cifrasIa(hotel, vista.hoy, dias, hora, vista.libro);
  }, [hotel, vista, dias]);

  if (!hotel) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-[13px] text-[var(--text-3)]">
        Este módulo no está habilitado en este panel.
      </div>
    );
  }
  if (!c) return null;

  const maxDia = Math.max(1, ...c.serie.map((d) => d.whatsapp + d.facebook + d.instagram));
  const maxTema = Math.max(1, ...c.temas.map((t) => t.conversaciones));

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line bg-card px-5 py-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[17px] font-extrabold tracking-tight text-brand">IA Performance</h1>
            <p className="text-[12.5px] text-[var(--text-3)]">Cuánto entra por cada canal, de qué hablan y qué piden</p>
          </div>
          <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
            {RANGOS.map((r) => (
              <button
                key={r.dias}
                type="button"
                onClick={() => setDias(r.dias)}
                className={cn(
                  "rounded-lg px-3 py-1 text-[12px] font-semibold transition",
                  dias === r.dias ? "bg-brand text-white shadow-sm" : "text-[var(--text-2)] hover:bg-card",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label={`Conversaciones · ${dias === 1 ? "hoy" : `${dias} días`}`} valor={c.conversaciones} Icon={MessageSquare} />
          <MetricCard label={`Abiertas · ${c.sinAsignar} sin asignar`} valor={c.abiertas} Icon={Inbox} />
          <MetricCard label="Resueltas" valor={c.resueltas} Icon={Users} />
          <MetricCard label="Resueltas sobre el total" valor={`${c.resueltasPct}%`} Icon={Users} />
        </div>

        <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
          <h3 className="text-[15px] font-bold text-[var(--text)]">Mensajes que entran</h3>
          <p className="text-[12.5px] text-[var(--text-3)]">WhatsApp, Messenger e Instagram</p>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cifra Icon={MessageCircle} label="Mensajes recibidos" valor={c.mensajes} />
            <Cifra Icon={Users} label="Personas distintas" valor={c.personas} />
            <Cifra Icon={Bot} label="Respuestas enviadas" valor={c.respuestas} />
            <Cifra Icon={MessageSquare} label="Conversaciones sin responder" valor={c.sinResponder} alerta />
          </div>
          <p className="mt-2 text-[12px] text-[var(--text-3)]">
            De las respuestas, {c.delAgente.toLocaleString("en-US")} las dio {hotel.agente} y {c.delEquipo.toLocaleString("en-US")} el equipo.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-[var(--text-2)]">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle size={13} style={{ color: COLOR.whatsapp }} />
              WhatsApp · {c.porCanal.whatsapp.toLocaleString("en-US")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Facebook size={13} style={{ color: COLOR.facebook }} />
              Facebook · {c.porCanal.facebook.toLocaleString("en-US")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Instagram size={13} style={{ color: COLOR.instagram }} />
              Instagram · {c.porCanal.instagram.toLocaleString("en-US")}
            </span>
          </div>
          <div className="mt-3 flex h-40 items-end gap-1.5">
            {c.serie.map((d) => {
              const total = d.whatsapp + d.facebook + d.instagram;
              return (
                <div key={d.dia} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.etiqueta}: ${total} mensajes`}>
                  <div className="flex flex-col overflow-hidden rounded-t-md" style={{ height: `${(total / maxDia) * 100}%` }}>
                    <span style={{ flex: d.instagram, background: COLOR.instagram }} />
                    <span style={{ flex: d.facebook, background: COLOR.facebook }} />
                    <span style={{ flex: d.whatsapp, background: COLOR.whatsapp }} />
                  </div>
                  {c.serie.length <= 14 && <span className="mt-1 text-center text-[10px] text-[var(--text-3)]">{d.etiqueta}</span>}
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="inline-flex items-center gap-2 text-[15px] font-bold text-[var(--text)]">
                <TrendingUp size={15} className="text-brand" />
                Qué nos piden
              </h3>
              <span className="text-[12px] text-[var(--text-3)]">{c.conversaciones} conversaciones</span>
            </div>
            <p className="text-[12px] text-[var(--text-3)]">Una conversación cuenta en cada tema del que habló.</p>
            <div className="mt-4 space-y-2.5">
              {c.temas.map((t, i) => (
                <div key={t.tema} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-[12.5px] text-[var(--text-2)]">{t.tema}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                    <div className={cn("h-full rounded-full", BARRAS[i % BARRAS.length])} style={{ width: `${(t.conversaciones / maxTema) * 100}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right text-[12.5px] font-bold text-[var(--text)]">{t.conversaciones}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="inline-flex items-center gap-2 text-[15px] font-bold text-[var(--text)]">
                <CalendarDays size={15} className="text-brand" />
                Fechas que están pidiendo
              </h3>
              <span className="text-[12px] text-[var(--text-3)]">
                {c.conFechaPedida} conversaciones · {c.personasEnFechas} personas
              </span>
            </div>
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {c.fechas.map((f) => (
                <li key={f.dia} className="flex items-center justify-between py-2.5 text-[13px]">
                  <span className="inline-flex items-center gap-2 text-[var(--text-2)]">
                    <CalendarDays size={14} className="text-[var(--text-3)]" />
                    {fechaLarga(f.dia)}
                  </span>
                  <span className="font-bold text-[var(--text)]">{f.conversaciones}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <OrigenCanales conversations={state.conversations} />
        <DeptBreakdown conversations={state.conversations} />
      </div>
    </div>
  );
}

function Cifra({ Icon, label, valor, alerta = false }: { Icon: typeof Users; label: string; valor: number; alerta?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface/40 p-3.5">
      <p className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-3)]">
        <Icon size={13} />
        {label}
      </p>
      <p className={cn("mt-1 text-[22px] font-extrabold leading-none", alerta && valor > 0 ? "text-[#c2410c]" : "text-[var(--text)]")}>
        {valor.toLocaleString("en-US")}
      </p>
    </div>
  );
}
