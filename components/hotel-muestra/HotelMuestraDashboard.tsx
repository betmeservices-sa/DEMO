"use client";

// El tablero de un hotel de muestra: el mismo de Porta Stays (que salió del de
// Yali), con pestañas por zona, el rango de días, la ocupación noche por noche,
// lo que el agente apartó y por dónde entran las reservas. Lee la muestra del
// navegador (lib/hotel-muestra), nunca Cloudbeds.

import { useMemo, useState } from "react";
import { BedDouble, CalendarCheck, CircleDollarSign, LogIn, LogOut, MessageSquare, RefreshCw, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { activeTenantId } from "@/lib/tenants/active";
import { staff, ME } from "@/lib/data/seed";
import { useYo, useYoNombre } from "@/lib/yo";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { useHotelMuestra } from "@/lib/hotel-muestra/store";
import { hotelMuestraDe } from "@/lib/hotel-muestra/registro";
import { fotoHotel, type FilaOcupacion, type LlegadaPanel, type RepartoCanal } from "@/lib/hotel-muestra/libro";
import { dinero, fechaCorta } from "@/lib/hotel-muestra/fechas";
import { ReservasEnPausa, ReservasPorConfirmar } from "./Reservas";
import { NuevaReservaMuestra } from "./NuevaReservaMuestra";

export const RANGOS = [
  { dias: 1, label: "Hoy" },
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
] as const;

/** El nombre de quien está usando el panel, para firmar lo que confirma. */
export function useActor(): string {
  const yoId = useYo();
  const nombreSesion = useYoNombre();
  const ficha = staff.find((s) => s.id === yoId) ?? staff.find((s) => s.id === ME);
  return nombreSesion ?? ficha?.nombre ?? "Equipo";
}

export function HotelMuestraDashboard() {
  const hotel = hotelMuestraDe(activeTenantId());
  const vista = useHotelMuestra();
  const actor = useActor();
  const [tab, setTab] = useState("general");
  const [dias, setDias] = useState(7);
  const [reservando, setReservando] = useState(false);
  const [girando, setGirando] = useState(false);

  const foto = useMemo(() => (hotel && vista ? fotoHotel(hotel, vista.libro, vista.hoy, dias) : null), [hotel, vista, dias]);
  if (!hotel || !vista || !foto) return null;

  const zona = foto.zonas.find((z) => z.id === tab) ?? null;
  const ventana = dias === 1 ? "para hoy" : `a ${dias} días`;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line bg-card px-5 pt-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Dashboard</h1>
            <p className="text-[12.5px] text-[var(--text-3)]">{zona ? `${zona.nombre} · ${zona.ubicacion}` : hotel.resumenGeneral}</p>
          </div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-line bg-surface/60 p-0.5">
              {RANGOS.map((r) => (
                <button
                  key={r.dias}
                  type="button"
                  onClick={() => setDias(r.dias)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[12px] font-semibold transition",
                    dias === r.dias ? "bg-brand text-white" : "text-[var(--text-2)] hover:text-[var(--text)]",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setReservando(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90"
            >
              <BedDouble size={13} />
              Nueva reserva
            </button>
            <button
              type="button"
              onClick={() => {
                setGirando(true);
                setTimeout(() => setGirando(false), 700);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-2)] transition hover:bg-surface"
            >
              <RefreshCw size={13} className={cn(girando && "animate-spin")} />
              Actualizar
            </button>
          </div>
        </div>

        <nav className="-mb-px mt-3 flex gap-1 overflow-x-auto">
          <Tab activa={tab === "general"} onClick={() => setTab("general")}>
            Vista general
          </Tab>
          {foto.zonas.map((z) => (
            <Tab key={z.id} activa={tab === z.id} onClick={() => setTab(z.id)}>
              {z.nombre}
            </Tab>
          ))}
        </nav>
      </header>

      {reservando && (
        <NuevaReservaMuestra hotel={hotel} vista={vista} zonaInicial={zona?.id} actor={actor} onCerrar={() => setReservando(false)} />
      )}

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {!zona ? (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
              <MetricCard label={`Ocupación hoy · ${foto.total.ocupadasHoy} de ${foto.total.unidades}`} valor={`${foto.total.ocupacionHoyPct}%`} Icon={BedDouble} />
              <MetricCard label="Huéspedes en casa" valor={foto.total.huespedesEnCasa} Icon={Users} />
              <MetricCard label={`Llegadas hoy · ${foto.total.salidasHoy} salidas`} valor={foto.total.llegadasHoy} Icon={LogIn} />
              <MetricCard label={`Reservado ${ventana} · ${foto.total.reservasVentana} reservas`} valor={dinero(foto.total.ingresoVentana)} Icon={CircleDollarSign} />
              <MetricCard label="Tarifa media por noche vendida" valor={dinero(foto.total.tarifaMedia)} Icon={CalendarCheck} />
              <MetricCard label={`Reservas que cerró ${hotel.agente}`} valor={foto.total.reservasDelAgente} Icon={MessageSquare} />
            </div>

            <ReservasPorConfirmar vista={vista} actor={actor} />
            <ReservasEnPausa vista={vista} />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {foto.zonas.map((z) => (
                <div key={z.id} className="rounded-2xl border border-line bg-card p-5 shadow-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-[var(--text)]">{z.nombre}</h3>
                      <p className="truncate text-[11.5px] text-[var(--text-3)]">{z.ubicacion}</p>
                    </div>
                    <p className="shrink-0 text-[22px] font-extrabold leading-none text-brand">{z.ocupacionHoyPct}%</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${z.ocupacionHoyPct}%` }} />
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[var(--text-2)]">
                    <span className="inline-flex items-center gap-1">
                      <LogIn size={12} className="text-brand" />
                      {z.llegadasHoy} llegan
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <LogOut size={12} className="text-[var(--brand-accent)]" />
                      {z.salidasHoy} salen
                    </span>
                    <span className="ml-auto font-semibold text-[var(--text)]">{dinero(z.ingresoVentana)}</span>
                  </p>
                  <Franja fechas={foto.fechas} filas={z.filas} />
                  <p className="mt-2 text-[10.5px] leading-snug text-[var(--text-3)]">
                    Próximas {foto.fechas.length} noches por tipo de habitación: cada cuadro es una noche y el número, cuántas
                    de esas habitaciones están ocupadas. Más oscuro, más lleno.
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <Llegadas titulo="Próximas llegadas" reservas={foto.total.llegadas} conZona agente={hotel.agente} />
              <PorCanal reparto={foto.total.porCanal} ventana={ventana} />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
              <MetricCard label={`Ocupación hoy · ${zona.ocupadasHoy} de ${zona.unidades}`} valor={`${zona.ocupacionHoyPct}%`} Icon={BedDouble} />
              <MetricCard label="Huéspedes en casa" valor={zona.huespedesEnCasa} Icon={Users} />
              <MetricCard label={`Llegadas hoy · ${zona.salidasHoy} salidas`} valor={zona.llegadasHoy} Icon={LogIn} />
              <MetricCard label={`Reservado ${ventana} · ${zona.reservasVentana} reservas`} valor={dinero(zona.ingresoVentana)} Icon={CircleDollarSign} />
              <MetricCard label="Tarifa media por noche vendida" valor={dinero(zona.tarifaMedia)} Icon={CalendarCheck} />
              <MetricCard label={`Reservas que cerró ${hotel.agente}`} valor={zona.reservasDelAgente} Icon={MessageSquare} />
            </div>

            <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[var(--text)]">Ocupación por habitación</h3>
              <p className="mb-1 text-[12px] text-[var(--text-3)]">Próximas {foto.fechas.length} noches. Cuanto más oscuro, más lleno.</p>
              <Franja fechas={foto.fechas} filas={zona.filas} ancho />
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <Llegadas titulo={`Próximas llegadas a ${zona.nombre}`} reservas={zona.llegadas} agente={hotel.agente} />
              <PorCanal reparto={zona.porCanal} ventana={ventana} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Tab({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 border-b-2 px-3.5 py-2.5 text-[13px] font-bold transition",
        activa ? "border-brand text-brand" : "border-transparent text-[var(--text-3)] hover:text-[var(--text-2)]",
      )}
    >
      {children}
    </button>
  );
}

function Franja({ fechas, filas, ancho = false }: { fechas: string[]; filas: FilaOcupacion[]; ancho?: boolean }) {
  const etiqueta = ancho ? "w-[170px]" : "w-[96px]";
  return (
    <div className="mt-4 space-y-1.5">
      <div className="flex gap-[3px] text-[9px] text-[var(--text-3)]">
        <span className={cn("shrink-0", etiqueta)} />
        {fechas.map((f) => {
          const [a, m, d] = f.split("-").map(Number);
          const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
          return (
            <span key={f} className={cn("flex-1 text-center", (dow === 5 || dow === 6) && "font-bold text-brand")}>
              {d}
            </span>
          );
        })}
      </div>
      {filas.map((f) => (
        <div key={f.id} className="flex items-center gap-[3px]">
          <span
            title={`${f.nombre} · ${f.unidades} unidades · ${dinero(f.tarifaNoche)} la noche`}
            className={cn("shrink-0 truncate pr-1 text-[11px] font-medium text-[var(--text-2)]", etiqueta)}
          >
            {f.nombre}
          </span>
          {f.ocupadasPorNoche.map((ocupadas, i) => {
            const pct = f.unidades === 0 ? 0 : ocupadas / f.unidades;
            return (
              <span
                key={fechas[i]}
                title={`${f.nombre} · ${fechaCorta(fechas[i])}: ${ocupadas} de ${f.unidades} ocupadas`}
                className="relative h-5 flex-1 rounded-[3px] ring-1 ring-inset ring-[var(--border-2)]"
              >
                <span className="absolute inset-0 rounded-[3px] bg-brand" style={{ opacity: pct === 0 ? 0.08 : 0.25 + pct * 0.75 }} />
                {ocupadas > 0 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold leading-none text-white">
                    {ocupadas}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Llegadas({ titulo, reservas, conZona = false, agente }: { titulo: string; reservas: LlegadaPanel[]; conZona?: boolean; agente: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h3 className="text-sm font-bold text-[var(--text)]">{titulo}</h3>
      <p className="mb-3 text-[12px] text-[var(--text-3)]">Quién llega, a qué habitación y por dónde reservó.</p>
      {reservas.length === 0 ? (
        <p className="text-[12.5px] text-[var(--text-2)]">No hay llegadas en la ventana.</p>
      ) : (
        <ul className="space-y-2">
          {reservas.slice(0, 12).map((r) => (
            <li
              key={r.id}
              className={cn("rounded-xl border p-3", r.origen === "agente" ? "border-brand/45 bg-brand/[0.06]" : "border-line bg-surface/60")}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13px] font-bold text-[var(--text)]">{r.huesped}</p>
                <span className="font-mono text-[11px] font-semibold text-[var(--text-3)]">{r.id}</span>
              </div>
              <p className="mt-0.5 text-[12px] text-[var(--text-2)]">
                {conZona ? `${r.zonaNombre} · ` : ""}
                {r.habitacionNombre} · {fechaCorta(r.desde)} al {fechaCorta(r.hasta)} · {r.huespedes}{" "}
                {r.huespedes === 1 ? "huésped" : "huéspedes"}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-2)]">{r.canal}</span>
                <span className="text-[12px] font-bold text-[var(--text)]">{dinero(r.total)}</span>
                {r.origen === "agente" && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-brand">
                    <MessageSquare size={11} />
                    la cerró {agente}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PorCanal({ reparto, ventana }: { reparto: RepartoCanal[]; ventana: string }) {
  const max = Math.max(1, ...reparto.map((c) => c.reservas));
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h3 className="text-sm font-bold text-[var(--text)]">Por dónde entran las reservas</h3>
      <p className="mb-4 text-[12px] text-[var(--text-3)]">Reservas e ingreso {ventana}.</p>
      <div className="space-y-3">
        {reparto.map((c) => (
          <div key={c.canal} className="flex items-center gap-3">
            <span className="w-20 shrink-0 truncate text-[12.5px] font-medium text-[var(--text-2)]">{c.canal}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
              <div
                className={cn("h-full rounded-full", c.canal === "WhatsApp" ? "bg-brand" : "bg-[var(--brand-accent)]/70")}
                style={{ width: `${(c.reservas / max) * 100}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-[12.5px] font-bold text-[var(--text)]">{c.reservas}</span>
            <span className="w-16 shrink-0 text-right text-[12px] text-[var(--text-3)]">{dinero(c.ingreso)}</span>
          </div>
        ))}
        {reparto.length === 0 && <p className="text-[12.5px] text-[var(--text-2)]">Sin reservas en la ventana.</p>}
      </div>
    </div>
  );
}
