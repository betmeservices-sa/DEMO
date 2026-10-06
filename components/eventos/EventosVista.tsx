"use client";

// Eventos: cada propuesta de un organizador con su fecha, lugar, aforo,
// condiciones, contacto, asesor y etapa. Tres vistas (lista, tablero por etapa
// y calendario) con los mismos filtros, y la ficha completa al abrir una.

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Columns3, LayoutList, RefreshCw, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CanalOrigen, Etapa, TipoEvento } from "@/lib/eventos/tipos";
import {
  ASESORES,
  DEPARTAMENTOS_SV,
  ETAPAS,
  ETAPAS_ABIERTAS,
  NOMBRE_CANAL,
  TIPOS_EVENTO,
  asesorDe,
  nombreTipo,
} from "@/lib/eventos/catalogo";
import { diaSV, fechaCorta, nombreMes } from "@/lib/eventos/fechas";
import type { NivelPrioridad } from "@/lib/eventos/prioridad";
import { armarFilas, yaPaso, type Fila } from "./fila";
import { useEventos } from "./useEventos";
import { FichaEvento } from "./FichaEvento";
import { Tablero } from "./Tablero";
import { Calendario } from "./Calendario";
import { AsesorAvatar, CanalChip, EtapaChip, PrioridadChip, RealBadge, VencidoBadge, miles } from "./ui";

type Vista = "lista" | "tablero" | "calendario";
type Cuando = "proximos" | "pasados" | "todos";
type Orden = "prioridad" | "fecha" | "recientes";

interface Filtros {
  cuando: Cuando;
  tipo: "" | TipoEvento;
  mes: string;
  departamento: string;
  etapa: "" | Etapa;
  prioridad: "" | NivelPrioridad;
  asesor: string;
  canal: "" | CanalOrigen;
  q: string;
}

const SIN_FILTROS: Filtros = {
  cuando: "proximos",
  tipo: "",
  mes: "",
  departamento: "",
  etapa: "",
  prioridad: "",
  asesor: "",
  canal: "",
  q: "",
};

const PESO_PRIORIDAD: Record<NivelPrioridad, number> = { alta: 3, media: 2, baja: 1 };

export function EventosVista() {
  const { datos, error, cargando, cargar, mover } = useEventos();
  const [vista, setVista] = useState<Vista>("lista");
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [orden, setOrden] = useState<Orden>("prioridad");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // /eventos?id=s01 abre esa ficha (lo usan el dashboard y Contactos).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) setAbierta(id);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4500);
    return () => clearTimeout(t);
  }, [aviso]);

  const ahora = datos?.ahora ?? Date.now();
  const hoy = diaSV(ahora);
  const filas = useMemo(() => (datos ? armarFilas(datos.propuestas, datos.ahora) : []), [datos]);

  // En el calendario el "cuándo" lo decide el mes que se mira.
  const filtradas = useMemo(() => {
    const q = filtros.q.trim().toLowerCase();
    return filas.filter(({ p, prioridad }) => {
      const d = p.datos;
      if (vista !== "calendario") {
        if (filtros.cuando === "proximos" && yaPaso(p, hoy)) return false;
        if (filtros.cuando === "pasados" && !yaPaso(p, hoy)) return false;
      }
      if (filtros.tipo && d.tipo_evento !== filtros.tipo) return false;
      if (filtros.mes && d.fecha_inicio.slice(0, 7) !== filtros.mes) return false;
      if (filtros.departamento && d.departamento !== filtros.departamento) return false;
      if (filtros.etapa && p.etapa !== filtros.etapa) return false;
      if (filtros.prioridad && prioridad.nivel !== filtros.prioridad) return false;
      if (filtros.asesor && p.asesorId !== filtros.asesor) return false;
      if (filtros.canal && p.canal !== filtros.canal) return false;
      if (q) {
        const texto = [d.nombre_evento, d.recinto, d.municipio, d.contacto_nombre, d.contacto_empresa].join(" ").toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [filas, filtros, hoy, vista]);

  const ordenadas = useMemo(() => {
    const xs = [...filtradas];
    if (orden === "fecha") xs.sort((a, b) => (a.p.datos.fecha_inicio || "9999").localeCompare(b.p.datos.fecha_inicio || "9999"));
    else if (orden === "recientes") xs.sort((a, b) => b.p.creada.localeCompare(a.p.creada));
    else
      xs.sort(
        (a, b) =>
          Number(b.plazo.vencido) - Number(a.plazo.vencido) ||
          Number(ETAPAS_ABIERTAS.includes(b.p.etapa)) - Number(ETAPAS_ABIERTAS.includes(a.p.etapa)) ||
          PESO_PRIORIDAD[b.prioridad.nivel] - PESO_PRIORIDAD[a.prioridad.nivel] ||
          b.prioridad.puntos - a.prioridad.puntos,
      );
    return xs;
  }, [filtradas, orden]);

  const meses = useMemo(() => {
    const set = new Set(filas.map((f) => f.p.datos.fecha_inicio.slice(0, 7)).filter(Boolean));
    return [...set].sort();
  }, [filas]);

  const abiertas = filas.filter((f) => ETAPAS_ABIERTAS.includes(f.p.etapa));
  const vencidas = filas.filter((f) => f.plazo.vencido).length;
  const nuevasHoy = filas.filter((f) => diaSV(f.p.creada) === hoy).length;
  const filaAbierta = abierta ? filas.find((f) => f.p.id === abierta) : undefined;
  const llamadaAbierta = filaAbierta?.p.llamadaId ? datos?.llamadas.find((l) => l.id === filaAbierta.p.llamadaId) : undefined;
  const hayFiltros = JSON.stringify({ ...filtros, cuando: "" }) !== JSON.stringify({ ...SIN_FILTROS, cuando: "" });

  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) => setFiltros((f) => ({ ...f, [k]: v }));

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-card px-5 py-3">
        <div className="min-w-0">
          <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Eventos</h1>
          <p className="text-[12.5px] text-[var(--text-3)]">
            {datos
              ? `${abiertas.length} propuestas abiertas · ${miles(abiertas.reduce((n, f) => n + f.p.datos.aforo_esperado, 0))} personas en juego${
                  nuevasHoy ? ` · ${nuevasHoy} ${nuevasHoy === 1 ? "nueva" : "nuevas"} hoy` : ""
                }`
              : "Cargando..."}
          </p>
        </div>
        {vencidas > 0 && (
          <button
            type="button"
            onClick={() => {
              setFiltros({ ...SIN_FILTROS, cuando: "todos" });
              setOrden("prioridad");
              setVista("lista");
            }}
            className="rounded-lg bg-[var(--ph-alarma-fondo)] px-2.5 py-1.5 text-[12px] font-bold text-[var(--brand-red)]"
          >
            {vencidas} sin contacto en 24 h
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-xl border border-line bg-surface p-0.5">
            {(
              [
                { id: "lista", label: "Lista", Icon: LayoutList },
                { id: "tablero", label: "Tablero", Icon: Columns3 },
                { id: "calendario", label: "Calendario", Icon: CalendarDays },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setVista(id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition",
                  vista === id ? "bg-card text-[var(--text)] shadow-sm" : "text-[var(--text-2)] hover:text-[var(--text)]",
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void cargar()}
            disabled={cargando}
            aria-label="Actualizar"
            title="Actualizar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-card text-[var(--text-2)] hover:bg-surface disabled:opacity-50"
          >
            <RefreshCw size={15} className={cargando ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-card px-5 py-2.5">
        <label className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            value={filtros.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Buscar evento, lugar u organizador"
            className="w-64 rounded-lg border border-line bg-surface py-1.5 pl-8 pr-2 text-[12.5px]"
          />
        </label>
        {vista !== "calendario" && (
          <Selector valor={filtros.cuando} onCambio={(v) => set("cuando", v as Cuando)} opciones={[["proximos", "Próximos"], ["pasados", "Ya pasaron"], ["todos", "Todas las fechas"]]} />
        )}
        <Selector valor={filtros.tipo} onCambio={(v) => set("tipo", v as Filtros["tipo"])} vacio="Tipo" opciones={TIPOS_EVENTO.map((t) => [t.id, t.nombre])} />
        <Selector valor={filtros.mes} onCambio={(v) => set("mes", v)} vacio="Mes" opciones={meses.map((m) => [m, nombreMes(`${m}-01`)])} />
        <Selector valor={filtros.departamento} onCambio={(v) => set("departamento", v)} vacio="Departamento" opciones={DEPARTAMENTOS_SV.map((d) => [d, d])} />
        <Selector valor={filtros.etapa} onCambio={(v) => set("etapa", v as Filtros["etapa"])} vacio="Etapa" opciones={ETAPAS.map((e) => [e.id, e.nombre])} />
        <Selector valor={filtros.prioridad} onCambio={(v) => set("prioridad", v as Filtros["prioridad"])} vacio="Prioridad" opciones={[["alta", "Alta"], ["media", "Media"], ["baja", "Baja"]]} />
        <Selector valor={filtros.asesor} onCambio={(v) => set("asesor", v)} vacio="Asesor" opciones={ASESORES.map((a) => [a.id, a.nombre])} />
        <Selector valor={filtros.canal} onCambio={(v) => set("canal", v as Filtros["canal"])} vacio="Canal" opciones={Object.entries(NOMBRE_CANAL)} />
        {hayFiltros && (
          <button
            type="button"
            onClick={() => setFiltros((f) => ({ ...SIN_FILTROS, cuando: f.cuando }))}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-[var(--text-2)] hover:bg-surface"
          >
            <X size={13} /> Limpiar
          </button>
        )}
        {vista === "lista" && (
          <div className="ml-auto">
            <Selector valor={orden} onCambio={(v) => setOrden(v as Orden)} opciones={[["prioridad", "Ordenar por prioridad"], ["fecha", "Ordenar por fecha del evento"], ["recientes", "Más recientes primero"]]} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {error && <p className="mb-3 rounded-lg bg-[var(--ph-alarma-fondo)] px-3 py-2 text-[12.5px] font-semibold text-[var(--brand-red)]">{error}</p>}
        {!datos ? (
          <p className="text-[13px] text-[var(--text-3)]">Cargando propuestas...</p>
        ) : vista === "lista" ? (
          <Lista filas={ordenadas} hoy={hoy} onAbrir={setAbierta} />
        ) : vista === "tablero" ? (
          <Tablero filas={ordenadas} onAbrir={setAbierta} onMover={(id, a, motivo) => mover(id, "etapa", motivo ? { a, motivo } : { a })} />
        ) : (
          <Calendario filas={filtradas} hoy={hoy} onAbrir={setAbierta} />
        )}
      </div>

      {filaAbierta && (
        <FichaEvento
          fila={filaAbierta}
          llamada={llamadaAbierta}
          ahora={ahora}
          onCerrar={() => {
            setAbierta(null);
            if (window.location.search) window.history.replaceState(null, "", "/eventos");
          }}
          mover={(id, tipo, valor) => void mover(id, tipo, valor)}
          onSimulada={setAviso}
        />
      )}

      {aviso && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-[var(--brand-accent)] px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-xl">
          {aviso}
        </div>
      )}
    </div>
  );
}

function Selector({
  valor,
  onCambio,
  opciones,
  vacio,
}: {
  valor: string;
  onCambio: (v: string) => void;
  opciones: [string, string][];
  vacio?: string;
}) {
  return (
    <select
      value={valor}
      onChange={(e) => onCambio(e.target.value)}
      className={cn(
        "rounded-lg border border-line bg-surface px-2 py-1.5 text-[12.5px] font-medium",
        valor ? "text-[var(--text)]" : "text-[var(--text-2)]",
      )}
    >
      {vacio && <option value="">{vacio}</option>}
      {opciones.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

function Lista({ filas, hoy, onAbrir }: { filas: Fila[]; hoy: string; onAbrir: (id: string) => void }) {
  if (filas.length === 0) {
    return <p className="rounded-2xl border border-line bg-card p-8 text-center text-[13px] text-[var(--text-3)]">Ninguna propuesta con esos filtros.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card shadow-sm">
      <table className="w-full min-w-[980px] text-left">
        <thead>
          <tr className="border-b border-line text-[11px] font-bold uppercase tracking-wide text-[var(--text-3)]">
            <th className="px-4 py-2.5">Evento</th>
            <th className="px-3 py-2.5">Fecha</th>
            <th className="px-3 py-2.5 text-right">Aforo</th>
            <th className="px-3 py-2.5">Etapa</th>
            <th className="px-3 py-2.5">Prioridad</th>
            <th className="px-3 py-2.5">Asesor</th>
            <th className="px-3 py-2.5">Entró por</th>
            <th className="px-3 py-2.5">Pendiente</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const d = f.p.datos;
            const faltan = d.fecha_inicio ? Math.round((Date.parse(`${d.fecha_inicio}T12:00:00Z`) - Date.parse(`${hoy}T12:00:00Z`)) / 86_400_000) : null;
            return (
              <tr key={f.p.id} onClick={() => onAbrir(f.p.id)} className="cursor-pointer border-b border-line transition last:border-0 hover:bg-surface/70">
                <td className="max-w-[320px] px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[13px] font-bold text-[var(--text)]">{d.nombre_evento || "Evento sin nombre"}</p>
                    {f.p.origen === "real" && <RealBadge />}
                  </div>
                  <p className="truncate text-[11.5px] text-[var(--text-2)]">
                    {nombreTipo(d.tipo_evento)} · {[d.recinto, d.municipio].filter(Boolean).join(", ") || "Lugar por definir"}
                  </p>
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <p className="text-[12.5px] font-semibold capitalize text-[var(--text)]">{d.fecha_inicio ? fechaCorta(d.fecha_inicio) : "Sin fecha"}</p>
                  <p className="text-[11px] text-[var(--text-3)]">
                    {faltan === null ? "" : faltan < 0 ? "Ya pasó" : faltan === 0 ? "Hoy" : `En ${faltan} ${faltan === 1 ? "día" : "días"}`}
                    {d.fecha_fin ? ` · ${Math.round((Date.parse(`${d.fecha_fin}T12:00:00Z`) - Date.parse(`${d.fecha_inicio}T12:00:00Z`)) / 86_400_000) + 1} días` : ""}
                  </p>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-[12.5px] font-semibold text-[var(--text)]">
                  {d.aforo_esperado ? miles(d.aforo_esperado) : <span className="font-normal italic text-[var(--text-3)]">Por definir</span>}
                </td>
                <td className="px-3 py-3">
                  <EtapaChip etapa={f.p.etapa} />
                </td>
                <td className="px-3 py-3">
                  <PrioridadChip nivel={f.prioridad.nivel} />
                </td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2 whitespace-nowrap text-[12px] text-[var(--text-2)]">
                    <AsesorAvatar id={f.p.asesorId} size={22} />
                    {asesorDe(f.p.asesorId)?.nombre.split(" ")[0]}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <CanalChip canal={f.p.canal} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col items-start gap-1">
                    {f.plazo.vencido && <VencidoBadge horas={f.plazo.horas} />}
                    {f.plazo.pendiente && !f.plazo.vencido && (
                      <span className="whitespace-nowrap text-[11px] font-semibold text-[var(--text-2)]">Contactar en {Math.max(0, Math.round(f.plazo.horas))} h</span>
                    )}
                    {f.faltantes.length > 0 && ETAPAS_ABIERTAS.includes(f.p.etapa) && (
                      <span className="whitespace-nowrap text-[11px] text-[var(--text-3)]">
                        {f.faltantes.length} {f.faltantes.length === 1 ? "dato faltante" : "datos faltantes"}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

