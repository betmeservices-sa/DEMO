"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BedDouble,
  CalendarCheck,
  CircleDollarSign,
  LogIn,
  LogOut,
  Loader2,
  MessageSquare,
  RefreshCw,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";

// Espejo de los tipos de lib/yali-pms.ts. Se declaran acá porque el panel habla
// con /api/yali/panel y no importa nada del servidor.
interface FilaOcupacion {
  id: string;
  nombre: string;
  unidades: number;
  tarifaNoche: number;
  ocupadasPorNoche: number[];
}
interface PanelSede {
  id: string;
  nombre: string;
  ubicacion: string;
  unidades: number;
  ocupadasHoy: number;
  ocupacionHoyPct: number;
  llegadasHoy: number;
  salidasHoy: number;
  ingresoVentana: number;
  filas: FilaOcupacion[];
}
interface Reserva {
  id: string;
  sedeNombre: string;
  habitacionNombre: string;
  huesped: string;
  desde: string;
  hasta: string;
  huespedes: number;
  total: number;
  canal: string;
  origen: "demo" | "agente";
}
interface Panel {
  hoy: string;
  dias: number;
  fechas: string[];
  moneda: string;
  tarifasConfirmadas: boolean;
  sedes: PanelSede[];
  kpis: {
    unidades: number;
    ocupadasHoy: number;
    ocupacionHoyPct: number;
    llegadasHoy: number;
    salidasHoy: number;
    huespedesEnCasa: number;
    reservasVentana: number;
    reservasDelAgente: number;
    ingresoVentana: number;
    tarifaMedia: number;
    nochesVendidas: number;
    nochesVendibles: number;
  };
  porCanal: { canal: string; reservas: number; ingreso: number; pct: number }[];
  llegadas: Reserva[];
  consultado: string;
}

const DOW = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function partes(fecha: string): { dia: number; dow: string; finde: boolean } {
  const [a, m, d] = fecha.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d));
  const dow = t.getUTCDay();
  return { dia: d, dow: DOW[dow], finde: dow === 0 || dow === 6 };
}

function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(a, m - 1, d)));
}

function dinero(v: number): string {
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function YaliPanel() {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const r = await fetch("/api/yali/panel", { cache: "no-store" });
      const d = await r.json();
      if (d.ok) {
        setPanel(d.panel);
        setError(null);
      } else {
        setError(d.error ?? "No se pudo leer la ocupación.");
      }
    } catch {
      setError("No se pudo leer la ocupación.");
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando && !panel) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-card p-5 text-[13px] text-[var(--text-2)]">
        <Loader2 size={15} className="animate-spin text-brand" />
        Leyendo ocupación, reservas y tarifas
      </div>
    );
  }

  if (!panel) {
    return (
      <div className="flex items-start gap-2.5 rounded-2xl border border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/10 p-4 text-[12.5px] text-[var(--text-2)]">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <p>{error ?? "Sin datos de ocupación."}</p>
      </div>
    );
  }

  const hora = new Date(panel.consultado).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[var(--text)]">Operación de los tres hoteles</h2>
          <p className="text-[12px] text-[var(--text-3)]">
            Próximas {panel.dias} noches · {panel.kpis.unidades} habitaciones · leído a las {hora}
          </p>
        </div>
        <button
          type="button"
          onClick={() => cargar(true)}
          disabled={cargando}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-2)] transition hover:bg-surface disabled:opacity-60"
        >
          <RefreshCw size={13} className={cn(cargando && "animate-spin")} />
          Actualizar
        </button>
      </div>

      <Kpis panel={panel} />

      {!panel.tarifasConfirmadas && (
        <p className="flex items-start gap-2 rounded-xl border border-[var(--brand-accent)]/45 bg-[var(--brand-accent)]/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[var(--text-2)]">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-[var(--brand-accent)]" />
          Las tarifas y la ocupación son de demostración mientras se conecta el sistema de
          reservas del hotel. El agente cotiza con ellas y avisa que el equipo confirma el precio
          final.
        </p>
      )}

      <Sedes panel={panel} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Llegadas panel={panel} />
        <PorCanal panel={panel} />
      </div>
    </section>
  );
}

function Kpis({ panel }: { panel: Panel }) {
  const k = panel.kpis;
  const tarjetas = [
    { Icon: BedDouble, valor: `${k.ocupacionHoyPct}%`, label: `Ocupación hoy · ${k.ocupadasHoy} de ${k.unidades}` },
    { Icon: Users, valor: `${k.huespedesEnCasa}`, label: "Huéspedes en casa" },
    { Icon: LogIn, valor: `${k.llegadasHoy}`, label: `Llegadas hoy · ${k.salidasHoy} salidas` },
    { Icon: CircleDollarSign, valor: dinero(k.ingresoVentana), label: `Reservado a ${panel.dias} días · ${k.reservasVentana} reservas` },
    { Icon: CalendarCheck, valor: dinero(k.tarifaMedia), label: "Tarifa media por noche vendida" },
    { Icon: MessageSquare, valor: `${k.reservasDelAgente}`, label: "Reservas entradas por WhatsApp" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {tarjetas.map((t) => (
        <div key={t.label} className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <t.Icon size={18} />
          </span>
          <p className="mt-3 text-[24px] font-extrabold leading-none tracking-tight text-[var(--text)]">
            {t.valor}
          </p>
          <p className="mt-1.5 text-[12px] font-medium leading-snug text-[var(--text-3)]">{t.label}</p>
        </div>
      ))}
    </div>
  );
}

function Sedes({ panel }: { panel: Panel }) {
  const cabeceras = useMemo(() => panel.fechas.map(partes), [panel.fechas]);
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {panel.sedes.map((sede) => (
        <div key={sede.id} className="rounded-2xl border border-line bg-card p-5 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-[var(--text)]">{sede.nombre}</h3>
              <p className="truncate text-[11.5px] text-[var(--text-3)]">{sede.ubicacion}</p>
            </div>
            <p className="shrink-0 text-[22px] font-extrabold leading-none text-brand">
              {sede.ocupacionHoyPct}%
            </p>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${sede.ocupacionHoyPct}%` }}
            />
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[var(--text-2)]">
            <span className="inline-flex items-center gap-1">
              <LogIn size={12} className="text-brand" />
              {sede.llegadasHoy} llegan
            </span>
            <span className="inline-flex items-center gap-1">
              <LogOut size={12} className="text-[var(--brand-accent)]" />
              {sede.salidasHoy} salen
            </span>
            <span className="ml-auto font-semibold text-[var(--text)]">
              {dinero(sede.ingresoVentana)}
            </span>
          </p>

          {/* Franja noche a noche: cada columna es un día, cada fila un tipo de
              habitación. Sirve para ver de un vistazo dónde están los huecos. */}
          <div className="mt-4 space-y-1.5">
            <div className="flex gap-[3px] pl-[92px] text-[9px] text-[var(--text-3)]">
              {cabeceras.map((c, i) => (
                <span
                  key={panel.fechas[i]}
                  className={cn("flex-1 text-center", c.finde && "font-bold text-brand")}
                >
                  {c.dia}
                </span>
              ))}
            </div>
            {sede.filas.map((f) => (
              <div key={f.id} className="flex items-center gap-[3px]">
                <span
                  title={`${f.nombre} · ${f.unidades} unidades · ${dinero(f.tarifaNoche)} la noche`}
                  className="w-[89px] shrink-0 truncate text-[11px] font-medium text-[var(--text-2)]"
                >
                  {f.nombre}
                </span>
                {f.ocupadasPorNoche.map((ocupadas, i) => {
                  const pct = f.unidades === 0 ? 0 : ocupadas / f.unidades;
                  return (
                    <span
                      key={panel.fechas[i]}
                      title={`${f.nombre} · ${fechaCorta(panel.fechas[i])}: ${ocupadas} de ${f.unidades} ocupadas`}
                      className="h-5 flex-1 rounded-[3px] bg-brand ring-1 ring-inset ring-[var(--border-2)]"
                      style={{ opacity: pct === 0 ? 0.08 : 0.25 + pct * 0.75 }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Llegadas({ panel }: { panel: Panel }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h3 className="text-sm font-bold text-[var(--text)]">Próximas llegadas</h3>
      <p className="mb-3 text-[12px] text-[var(--text-3)]">
        Quién entra, a qué hotel y por dónde reservó.
      </p>
      {panel.llegadas.length === 0 ? (
        <p className="text-[12.5px] text-[var(--text-2)]">No hay llegadas en la ventana.</p>
      ) : (
        <ul className="space-y-2">
          {panel.llegadas.map((r) => (
            <li
              key={r.id}
              className={cn(
                "rounded-xl border p-3",
                r.origen === "agente"
                  ? "border-brand/45 bg-brand/[0.06]"
                  : "border-line bg-surface/60",
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13px] font-bold text-[var(--text)]">{r.huesped}</p>
                <span className="text-[11px] font-semibold text-[var(--text-3)]">{r.id}</span>
              </div>
              <p className="mt-0.5 text-[12px] text-[var(--text-2)]">
                {r.sedeNombre.split(",")[0]} · {r.habitacionNombre} · {fechaCorta(r.desde)} al{" "}
                {fechaCorta(r.hasta)} · {r.huespedes}{" "}
                {r.huespedes === 1 ? "huésped" : "huéspedes"}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-2)]">
                  {r.canal}
                </span>
                <span className="text-[12px] font-bold text-[var(--text)]">{dinero(r.total)}</span>
                {r.origen === "agente" && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-brand">
                    <MessageSquare size={11} />
                    la cerró Sofía
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

function PorCanal({ panel }: { panel: Panel }) {
  const max = Math.max(1, ...panel.porCanal.map((c) => c.reservas));
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h3 className="text-sm font-bold text-[var(--text)]">Por dónde entran las reservas</h3>
      <p className="mb-4 text-[12px] text-[var(--text-3)]">
        Reservas e ingreso de las próximas {panel.dias} noches.
      </p>
      <div className="space-y-3">
        {panel.porCanal.map((c) => (
          <div key={c.canal} className="flex items-center gap-3">
            <span className="w-20 shrink-0 truncate text-[12.5px] font-medium text-[var(--text-2)]">
              {c.canal}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
              <div
                className={cn(
                  "h-full rounded-full",
                  c.canal === "WhatsApp" ? "bg-brand" : "bg-[var(--brand-accent)]/70",
                )}
                style={{ width: `${(c.reservas / max) * 100}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-[12.5px] font-bold text-[var(--text)]">
              {c.reservas}
            </span>
            <span className="w-16 shrink-0 text-right text-[12px] text-[var(--text-3)]">
              {dinero(c.ingreso)}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-xl bg-surface/70 px-3 py-2.5 text-[12px] leading-relaxed text-[var(--text-2)]">
        WhatsApp incluye lo que cierra Sofía sola. Es el número que crece cuando el agente
        contesta rápido de noche y en fin de semana.
      </p>
    </div>
  );
}
