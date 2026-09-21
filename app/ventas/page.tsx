"use client";

// El tablero de la sala de ventas de Nissan.
//
// Dos vistas de lo mismo: el TABLERO, donde el vendedor trabaja venta por
// venta, y la REPORTERIA del gerente, que es la que dice a quien hay que ir a
// mover hoy.
//
// La columna en la que cae cada quien NO se elige a mano: sale de los pasos de
// la venta (si ya se le mando la cotizacion, si vino a manejar la unidad, si
// dejo el deposito) y de las marcas de tiempo. Por eso las tarjetas no se
// arrastran: se marca el paso en la ficha y el caso se mueve solo. Cuando la
// entrega queda hecha, la venta se cierra sola.

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CalendarClock, GitBranch, Loader2, RefreshCw, Search, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { useRole } from "@/lib/roles";
import { telefonoBonito } from "@/lib/phone";
import { PERIODOS, type Periodo } from "@/lib/periodos";
import { nombreDeModelo } from "@/lib/autos-catalogo";
import { ETAPAS, HORAS_AVISO } from "@/lib/autos-pipeline";
import { FichaVenta } from "@/components/autos/FichaVenta";
import { ReporteGerente } from "@/components/autos/ReporteGerente";
import type { EventoVenta, RespuestaReporte, RespuestaTablero, Venta } from "@/components/autos/tipos";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function iniciales(nombre: string): string {
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?";
}

function hace(iso: string | null): string {
  if (!iso) return "";
  const h = (Date.now() - Date.parse(iso)) / 3_600_000;
  if (h < 1) return `hace ${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `hace ${Math.round(h)} h`;
  return `hace ${Math.round(h / 24)} días`;
}

function cuando(iso: string): string {
  const d = new Date(iso);
  const falta = (d.getTime() - Date.now()) / 3_600_000;
  const txt = d.toLocaleString("es-SV", {
    timeZone: "America/El_Salvador",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return falta < 0 ? `${txt}, ya pasó` : txt;
}

export default function VentasPage() {
  // Quien ve los numeros del equipo y quien no.
  //
  // El gerente entra a la REPORTERIA: su trabajo es decidir a quien mover, y
  // para eso necesita el conjunto. El vendedor entra al TABLERO y ni siquiera
  // ve la pestana: la facturacion del equipo no le sirve para trabajar, y
  // tenerla a la vista invita a compararse en vez de llamar.
  const { def } = useRole();
  const veReporte = ["jefe", "gerente_marketing", "admin", "marketing"].includes(def.id);
  const [vista, setVista] = useState<"tablero" | "reporte">(veReporte ? "reporte" : "tablero");
  const [datos, setDatos] = useState<RespuestaTablero | null>(null);
  const [reporte, setReporte] = useState<RespuestaReporte | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>("7d");
  const [busqueda, setBusqueda] = useState("");
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [eventos, setEventos] = useState<EventoVenta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!veReporte) setVista("tablero");
  }, [veReporte]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await fetch("/api/autos/oportunidades", { cache: "no-store" });
      const d = (await r.json()) as RespuestaTablero;
      if (d.ok) {
        setDatos(d);
        setError(null);
      } else setError(d.error ?? "No se pudo leer el embudo.");
    } catch {
      setError("No se pudo leer el embudo.");
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarReporte = useCallback(async () => {
    const r = await fetch(`/api/autos/reporte?periodo=${periodo}`, { cache: "no-store" });
    const d = (await r.json()) as RespuestaReporte;
    if (d.ok) setReporte(d);
  }, [periodo]);

  const cargarCaso = useCallback(async (telefono: string) => {
    const r = await fetch(`/api/autos/oportunidades?telefono=${telefono}`, { cache: "no-store" });
    const d = (await r.json()) as { ok: boolean; caso?: Venta; eventos?: EventoVenta[] };
    if (d.ok && d.caso) {
      setEventos(d.eventos ?? []);
      setDatos((prev) =>
        prev
          ? { ...prev, oportunidades: prev.oportunidades.map((o) => (o.telefono === telefono ? d.caso! : o)) }
          : prev,
      );
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (vista === "reporte") void cargarReporte();
  }, [vista, cargarReporte]);

  useEffect(() => {
    if (seleccion) void cargarCaso(seleccion);
  }, [seleccion, cargarCaso]);

  async function accion(cuerpo: Record<string, unknown>) {
    if (!seleccion) return;
    setOcupado(true);
    try {
      const r = await fetch("/api/autos/oportunidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cuerpo, telefono: seleccion }),
      });
      const d = (await r.json()) as { ok: boolean; caso?: Venta; error?: string };
      if (!d.ok) {
        setError(d.error ?? "No se pudo mover la venta.");
        return;
      }
      setError(null);
      if (d.caso) {
        setDatos((prev) =>
          prev
            ? { ...prev, oportunidades: prev.oportunidades.map((o) => (o.telefono === seleccion ? d.caso! : o)) }
            : prev,
        );
      }
      await cargarCaso(seleccion);
      if (vista === "reporte") await cargarReporte();
    } finally {
      setOcupado(false);
    }
  }

  const oportunidades = datos?.oportunidades ?? [];
  const alertaPor = useMemo(() => new Map((datos?.alertas ?? []).map((a) => [a.telefono, a])), [datos?.alertas]);

  const columnas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    const filtradas = oportunidades.filter(
      (o) =>
        !term ||
        [o.nombre, o.telefono, nombreDeModelo(o.modelo)].join(" ").toLowerCase().includes(term),
    );
    return ETAPAS.map((e) => ({
      etapa: e,
      casos: filtradas
        .filter((o) => o.etapa === e.id)
        .sort((a, b) => b.actualizado.localeCompare(a.actualizado)),
    }));
  }, [oportunidades, busqueda]);

  const caso = oportunidades.find((o) => o.telefono === seleccion) ?? null;
  const enEmbudo = oportunidades.filter((o) => !o.cerrado).length;
  const enJuego = oportunidades.filter((o) => !o.cerrado).reduce((m, o) => m + (o.monto ?? 0), 0);
  const alertas = datos?.alertas.length ?? 0;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line bg-card px-4 pt-3 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-[var(--text)]">
              <GitBranch size={18} className="text-brand" />
              Sala de ventas
            </h1>
            <p className="text-[12.5px] text-[var(--text-3)]">
              {cargando && !datos
                ? "Cargando el embudo"
                : `${enEmbudo} en el embudo${enJuego > 0 ? ` por ${usd(enJuego)}` : ""}${
                    alertas > 0 ? ` · ${alertas} sin llamar` : ""
                  }`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {vista === "tablero" && (
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar nombre, teléfono o modelo"
                  className="w-64 rounded-lg border border-line bg-card py-1.5 pl-7 pr-2 text-[12.5px] text-[var(--text)] outline-none"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                void cargar();
                if (vista === "reporte") void cargarReporte();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-2)] transition hover:bg-surface"
            >
              <RefreshCw size={13} className={cn(cargando && "animate-spin")} />
              Actualizar
            </button>
          </div>
        </div>

        <nav className="mt-2 flex gap-1">
          {(
            [
              // La reporteria va primero: el gerente entra a decidir a quien
              // mover, no a mirar tarjetas una por una.
              ...(veReporte ? [["reporte", "Reportería", BarChart3] as const] : []),
              ["tablero", "Tablero", GitBranch] as const,
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setVista(id)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-semibold transition",
                vista === id
                  ? "border-brand text-brand"
                  : "border-transparent text-[var(--text-3)] hover:text-[var(--text)]",
              )}
            >
              <Icon size={14} />
              {label}
              {id === "reporte" && alertas > 0 && (
                <span className="rounded-full bg-[var(--brand-red)] px-1.5 text-[10.5px] font-bold text-white">
                  {alertas}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {error && (
        <p className="mx-4 mt-3 rounded-xl border border-[var(--brand-red)]/40 bg-[var(--brand-red)]/10 px-3 py-2 text-[12.5px] md:mx-6">
          {error}
        </p>
      )}

      {vista === "tablero" ? (
        <div className="flex min-h-0 flex-1">
          <div className="flex flex-1 gap-3 overflow-x-auto p-4 md:p-6">
            {cargando && !datos && (
              <p className="flex items-center gap-2 text-[13px] text-[var(--text-3)]">
                <Loader2 size={15} className="animate-spin text-brand" /> Cargando prospectos
              </p>
            )}
            {columnas.map(({ etapa, casos }) => (
              <section key={etapa.id} className="flex w-64 shrink-0 flex-col rounded-xl border border-line bg-surface/60">
                <header className="border-b border-line px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--text)]">
                      <span className="h-2 w-2 rounded-full" style={{ background: etapa.color }} />
                      {etapa.nombre}
                    </h2>
                    <span className="rounded-full bg-card px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-3)]">
                      {casos.length}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] leading-tight text-[var(--text-3)]">{etapa.ayuda}</p>
                </header>

                <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                  {casos.length === 0 && (
                    <p className="px-1 py-3 text-center text-[10px] text-[var(--text-3)]">Sin nadie</p>
                  )}
                  {casos.map((o) => (
                    <Tarjeta
                      key={o.telefono}
                      caso={o}
                      alerta={alertaPor.get(o.telefono)?.nivel ?? null}
                      vendedor={datos?.vendedores.find((v) => v.id === o.vendedor)?.nombre ?? null}
                      activo={o.telefono === seleccion}
                      onClick={() => setSeleccion(o.telefono === seleccion ? null : o.telefono)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {caso && (
            <FichaVenta
              caso={caso}
              eventos={eventos}
              vendedores={datos?.vendedores ?? []}
              ocupado={ocupado}
              onAccion={(cuerpo) => void accion(cuerpo)}
              onCerrar={() => setSeleccion(null)}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
              {PERIODOS.filter((p) => p.clave !== "rango").map((p) => (
                <button
                  key={p.clave}
                  type="button"
                  onClick={() => setPeriodo(p.clave)}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition",
                    periodo === p.clave ? "bg-brand text-white shadow-sm" : "text-[var(--text-2)] hover:bg-card",
                  )}
                >
                  {p.etiqueta}
                </button>
              ))}
            </div>
            {reporte?.gerente && (
              <span className="ml-auto text-[12px] text-[var(--text-3)]">
                Gerente de ventas: {reporte.gerente.nombre} · el aviso sale a las {HORAS_AVISO} h sin llamar
              </span>
            )}
          </div>
          {reporte ? (
            <ReporteGerente r={reporte} casos={oportunidades} />
          ) : (
            <p className="flex items-center gap-2 text-[13px] text-[var(--text-3)]">
              <Loader2 size={15} className="animate-spin text-brand" /> Armando el reporte
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Tarjeta({
  caso,
  alerta,
  vendedor,
  activo,
  onClick,
}: {
  caso: Venta;
  alerta: "aviso" | "vencido" | null;
  vendedor: string | null;
  activo: boolean;
  onClick: () => void;
}) {
  const nombre = caso.nombre || telefonoBonito(caso.telefono);
  const citaPasada = caso.avance.cita != null && Date.parse(caso.avance.cita) < Date.now();
  return (
    <article
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-lg border bg-card p-2.5 transition",
        activo ? "border-brand ring-1 ring-brand/30" : "border-line hover:border-brand/40",
        (alerta === "vencido" || citaPasada) && "border-[var(--brand-red)]/60",
      )}
    >
      <div className="flex items-start gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
          {iniciales(nombre)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-[var(--text)]">{nombre}</p>
          <p className="truncate text-[11px] text-[var(--text-3)]">
            {nombreDeModelo(caso.modelo)} · {hace(caso.actualizado)}
          </p>
        </div>
        {caso.monto != null && (
          <span className="shrink-0 text-[11.5px] font-bold tabular-nums text-[var(--text-2)]">{usd(caso.monto)}</span>
        )}
      </div>

      {!caso.cerrado && (
        <>
          {/* Con una cita puesta, el resumen diria la misma fecha que la
              pastilla de abajo. Se calla y deja hablar a la pastilla, salvo
              cuando ademas hay algo trabado, que es otra cosa. */}
          {(!caso.avance.cita || caso.avance.trabado) && (
            <p className="mt-1.5 text-[10.5px] leading-tight text-[var(--text-3)]">{caso.avance.resumen}</p>
          )}
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
              <span
                className={cn("block h-full rounded-full", caso.avance.trabado ? "bg-[var(--brand-red)]/70" : "bg-brand/70")}
                style={{ width: `${(caso.avance.hechos / caso.avance.total) * 100}%` }}
              />
            </span>
            <span className="text-[10px] font-semibold text-[var(--text-3)]">
              {caso.avance.hechos}/{caso.avance.total}
            </span>
          </div>
        </>
      )}

      {caso.avance.cita && !caso.cerrado && (
        <p
          className={cn(
            "mt-1.5 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
            citaPasada
              ? "bg-[var(--brand-red)]/15 text-[var(--brand-red)]"
              : "bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]",
          )}
        >
          <CalendarClock size={10} />
          {cuando(caso.avance.cita)}
        </p>
      )}

      {caso.avance.trabado && !caso.cerrado && (
        <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-[var(--brand-red)]">
          <TriangleAlert size={10} />
          Hay que desatorarlo
        </p>
      )}

      {vendedor && <p className="mt-1.5 text-[10.5px] text-[var(--text-2)]">{vendedor}</p>}

      {alerta && (
        <p
          className={cn(
            "mt-1.5 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
            alerta === "vencido" ? "bg-[var(--brand-red)]/15 text-[var(--brand-red)]" : "bg-amber-50 text-amber-700",
          )}
        >
          <AlertTriangle size={10} />
          {alerta === "vencido" ? "Vencido, hay que reasignar" : `Sin llamar en ${HORAS_AVISO} h`}
        </p>
      )}

      {caso.cerrado && (
        <p className="mt-1.5 text-[10.5px] font-semibold text-[var(--text-2)]">
          {caso.resultado === "venta"
            ? "Entregado"
            : `Perdido${caso.motivoCierre ? ` · ${caso.motivoCierre}` : ""}`}
        </p>
      )}
    </article>
  );
}
