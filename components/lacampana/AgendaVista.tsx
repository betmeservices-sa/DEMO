"use client";

// Reservas y eventos de La Campana: la semana por sucursal.
//
// Aquí SOLO van reservaciones de mesa y eventos (cumpleaños, convivios,
// catering). Los pedidos se quedan en su cola de cocina (Pedidos): si cada
// pedido ocupara un espacio, la agenda se llenaría de cientos de bloques al
// día y dejaría de servir para lo que de verdad necesita fecha y hora.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarHeart, Check, ChevronLeft, ChevronRight, Clock, Plus, ShoppingBag, Users, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { SUCURSALES_CAMPANA, sucursalPorId } from "@/lib/lacampana/sucursales";
import {
  HORA_FIN_AGENDA,
  HORA_INICIO_AGENDA,
  capacidadSucursal,
  lunesDe,
  mismoDia,
  ocupacion,
  type Cita,
  type TipoCita,
} from "@/lib/lacampana/agenda";
import { agregarCita, cambiarEstadoCita, useCampana } from "@/lib/lacampana/store";
import { CanalChip, Pill, hora } from "./ui";

const ALTO_HORA = 52; // px por hora en la grilla
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function AgendaVista() {
  const { citas, pedidos } = useCampana();
  const [semana, setSemana] = useState(() => lunesDe(new Date()));
  const [sucursal, setSucursal] = useState("");
  const [tipo, setTipo] = useState<"" | TipoCita>("");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [hoy, setHoy] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setHoy(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const dias = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(semana);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [semana],
  );

  const visibles = useMemo(
    () => citas.filter((c) => (!sucursal || c.sucursalId === sucursal) && (!tipo || c.tipo === tipo)),
    [citas, sucursal, tipo],
  );
  const deLaSemana = visibles.filter((c) => {
    const t = Date.parse(c.inicio);
    return t >= semana.getTime() && t < semana.getTime() + 7 * 86_400_000;
  });
  const enCola = pedidos.filter((p) => p.etapa === "cola").length;
  const programados = pedidos.filter((p) => p.etapa === "cola" && p.programado).length;
  const citaAbierta = abierta ? citas.find((c) => c.id === abierta) ?? null : null;

  const rango = `${dias[0].toLocaleDateString("es-SV", { day: "numeric", month: "short" })} – ${dias[6].toLocaleDateString("es-SV", { day: "numeric", month: "short", year: "numeric" })}`;
  const horas = Array.from({ length: HORA_FIN_AGENDA - HORA_INICIO_AGENDA }, (_, i) => HORA_INICIO_AGENDA + i);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line bg-card px-5 py-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Reservas y eventos</h1>
            <p className="text-[12.5px] text-[var(--text-3)]">Reservaciones de mesa y eventos de las {SUCURSALES_CAMPANA.length} sucursales</p>
          </div>
          <button
            type="button"
            onClick={() => setCreando(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90"
          >
            <Plus size={13} />
            Nueva reservación o evento
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <Link
          href="/pedidos"
          className="flex items-center gap-3 rounded-xl border border-[var(--lc-cola)]/30 bg-[var(--lc-cola-fondo)] px-4 py-2.5 text-[12.5px] text-[var(--text)] transition hover:opacity-90"
        >
          <ShoppingBag size={16} className="shrink-0 text-[var(--lc-cola)]" />
          <span className="flex-1">
            <b>{enCola} pedidos en cola</b>
            {programados > 0 && <> ({programados} programados)</>} no aparecen aquí: esperan su turno en la cola de cocina para no saturar la agenda.
          </span>
          <span className="font-semibold text-[var(--lc-cola)]">Ver pedidos →</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-line bg-card p-1">
            <button type="button" aria-label="Semana anterior" onClick={() => setSemana((s) => new Date(s.getTime() - 7 * 86_400_000))} className="rounded-lg p-1.5 text-[var(--text-2)] hover:bg-surface">
              <ChevronLeft size={15} />
            </button>
            <button type="button" onClick={() => setSemana(lunesDe(new Date()))} className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-[var(--text-2)] hover:bg-surface">
              Esta semana
            </button>
            <button type="button" aria-label="Semana siguiente" onClick={() => setSemana((s) => new Date(s.getTime() + 7 * 86_400_000))} className="rounded-lg p-1.5 text-[var(--text-2)] hover:bg-surface">
              <ChevronRight size={15} />
            </button>
          </div>
          <span className="text-[13px] font-bold capitalize text-[var(--text)]">{rango}</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl border border-line bg-card p-1">
              {(
                [
                  ["", "Todo"],
                  ["reserva", "Reservaciones"],
                  ["evento", "Eventos"],
                ] as const
              ).map(([id, n]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTipo(id)}
                  aria-pressed={tipo === id}
                  className={cn("rounded-lg px-3 py-1 text-[12px] font-semibold transition", tipo === id ? "bg-brand text-white" : "text-[var(--text-2)] hover:bg-surface")}
                >
                  {n}
                </button>
              ))}
            </div>
            <select value={sucursal} onChange={(e) => setSucursal(e.target.value)} className="rounded-lg border border-line bg-card px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text)]">
              <option value="">Todas las sucursales</option>
              {SUCURSALES_CAMPANA.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-[12px] text-[var(--text-2)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--lc-reserva)]" /> Reservación de mesa
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--lc-evento)]" /> Evento
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-[var(--text-3)]" /> Pendiente de confirmar
          </span>
          <span className="ml-auto text-[var(--text-3)]">{deLaSemana.length} en esta semana</span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-line bg-card shadow-sm">
          <div className="grid min-w-[860px] grid-cols-[52px_repeat(7,minmax(0,1fr))]">
            <div className="border-b border-line" />
            {dias.map((d, i) => {
              const esHoy = mismoDia(d, hoy);
              return (
                <div key={i} className={cn("border-b border-l border-line px-2 py-2 text-center", esHoy && "bg-brand/[0.06]")}>
                  <p className="text-[11px] font-semibold uppercase text-[var(--text-3)]">{DIAS[i]}</p>
                  <p className={cn("text-[16px] font-extrabold", esHoy ? "text-brand" : "text-[var(--text)]")}>{d.getDate()}</p>
                </div>
              );
            })}

            <div className="relative" style={{ height: horas.length * ALTO_HORA }}>
              {horas.map((h, i) => (
                <span key={h} className="absolute right-1.5 -translate-y-1/2 text-[10.5px] text-[var(--text-3)]" style={{ top: i * ALTO_HORA }}>
                  {i === 0 ? "" : `${((h + 11) % 12) + 1} ${h < 12 ? "a" : "p"}`}
                </span>
              ))}
            </div>
            {dias.map((d, i) => (
              <Columna key={i} dia={d} citas={visibles.filter((c) => mismoDia(new Date(c.inicio), d))} horas={horas.length} hoy={hoy} onAbrir={setAbierta} />
            ))}
          </div>
        </div>
      </div>

      {citaAbierta && <FichaCita c={citaAbierta} citas={citas} onCerrar={() => setAbierta(null)} />}
      {creando && <NuevaCita citas={citas} onCerrar={() => setCreando(false)} />}
    </div>
  );
}

/**
 * Reparte en carriles las citas que se traslapan el mismo día. El ancho se
 * calcula por grupo de citas encimadas: una cita sola ocupa la columna entera
 * aunque más tarde ese día haya dos al mismo tiempo.
 */
function carriles(citas: Cita[]): Array<{ c: Cita; carril: number; total: number }> {
  const orden = [...citas].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const salida: Array<{ c: Cita; carril: number; total: number }> = [];
  let grupo: Array<{ c: Cita; carril: number }> = [];
  let finGrupo = 0;
  let finCarril: number[] = [];
  const cerrar = () => {
    const total = Math.max(1, finCarril.length);
    for (const g of grupo) salida.push({ ...g, total });
    grupo = [];
    finCarril = [];
  };
  for (const c of orden) {
    const ini = Date.parse(c.inicio);
    const fin = ini + c.duracion * 60_000;
    if (grupo.length && ini >= finGrupo) cerrar();
    let carril = finCarril.findIndex((f) => f <= ini);
    if (carril === -1) {
      carril = finCarril.length;
      finCarril.push(0);
    }
    finCarril[carril] = fin;
    finGrupo = grupo.length ? Math.max(finGrupo, fin) : fin;
    grupo.push({ c, carril });
  }
  cerrar();
  return salida;
}

function Columna({ dia, citas, horas, hoy, onAbrir }: { dia: Date; citas: Cita[]; horas: number; hoy: Date; onAbrir: (id: string) => void }) {
  const esHoy = mismoDia(dia, hoy);
  const ahoraTop = ((hoy.getHours() + hoy.getMinutes() / 60) - HORA_INICIO_AGENDA) * ALTO_HORA;
  return (
    <div className={cn("relative border-l border-line", esHoy && "bg-brand/[0.03]")} style={{ height: horas * ALTO_HORA }}>
      {Array.from({ length: horas }, (_, i) => (
        <div key={i} className="absolute inset-x-0 border-t border-line/70" style={{ top: i * ALTO_HORA }} />
      ))}
      {esHoy && ahoraTop > 0 && ahoraTop < horas * ALTO_HORA && (
        <div className="absolute inset-x-0 z-10 border-t-2 border-[var(--brand-red)]" style={{ top: ahoraTop }}>
          <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-[var(--brand-red)]" />
        </div>
      )}
      {carriles(citas).map(({ c, carril, total }) => {
        const ini = new Date(c.inicio);
        const top = (ini.getHours() + ini.getMinutes() / 60 - HORA_INICIO_AGENDA) * ALTO_HORA;
        const alto = Math.max(26, (c.duracion / 60) * ALTO_HORA - 3);
        const color = c.tipo === "evento" ? "var(--lc-evento)" : "var(--lc-reserva)";
        const pendiente = c.estado === "pendiente";
        const cancelada = c.estado === "cancelada";
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onAbrir(c.id)}
            className={cn(
              "absolute z-[5] overflow-hidden rounded-lg px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition hover:brightness-95",
              pendiente ? "border border-dashed bg-card" : "text-white",
              cancelada && "opacity-45 line-through",
            )}
            style={{
              top: top + 1,
              height: alto,
              left: `calc(${(carril / total) * 100}% + 2px)`,
              width: `calc(${100 / total}% - 4px)`,
              background: pendiente ? undefined : color,
              borderColor: pendiente ? color : undefined,
              color: pendiente ? color : undefined,
            }}
            title={`${c.titulo} · ${hora(c.inicio)} · ${c.personas} personas · ${sucursalPorId(c.sucursalId)?.nombre}`}
          >
            <p className="truncate font-bold">{c.titulo}</p>
            <p className="truncate opacity-90">
              {hora(c.inicio)} · {c.personas} pers.
            </p>
            {alto > 50 && <p className="truncate opacity-80">{sucursalPorId(c.sucursalId)?.nombre}</p>}
          </button>
        );
      })}
    </div>
  );
}

function FichaCita({ c, citas, onCerrar }: { c: Cita; citas: Cita[]; onCerrar: () => void }) {
  const suc = sucursalPorId(c.sucursalId)?.nombre ?? c.sucursalId;
  const ocupadas = ocupacion(citas, c.sucursalId, new Date(c.inicio), c.duracion);
  const fin = new Date(Date.parse(c.inicio) + c.duracion * 60_000).toISOString();
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onCerrar}>
      <aside className="flex h-full w-full max-w-md flex-col bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-3)]">{c.tipo === "evento" ? "Evento" : "Reservación de mesa"}</p>
            <h2 className="text-[19px] font-extrabold text-[var(--text)]">{c.titulo}</h2>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Pill tono={c.estado === "confirmada" ? "listo" : c.estado === "pendiente" ? "cola" : "alerta"}>
                {c.estado === "confirmada" ? "Confirmada" : c.estado === "pendiente" ? "Pendiente de confirmar" : "Cancelada"}
              </Pill>
              <CanalChip canal={c.canal} conNombre />
            </div>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-[var(--text-3)] hover:bg-surface">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-[13px]">
          <dl className="grid grid-cols-[110px_1fr] gap-y-1.5">
            <dt className="text-[var(--text-3)]">Cliente</dt>
            <dd className="font-semibold text-[var(--text)]">{c.cliente}</dd>
            <dt className="text-[var(--text-3)]">Teléfono</dt>
            <dd className="text-[var(--text)]">{c.telefono}</dd>
            <dt className="text-[var(--text-3)]">Sucursal</dt>
            <dd className="text-[var(--text)]">{suc}</dd>
            <dt className="text-[var(--text-3)]">Cuándo</dt>
            <dd className="capitalize text-[var(--text)]">
              {new Date(c.inicio).toLocaleDateString("es-SV", { weekday: "long", day: "numeric", month: "long" })}, {hora(c.inicio)} a {hora(fin)}
            </dd>
            <dt className="text-[var(--text-3)]">Personas</dt>
            <dd className="text-[var(--text)]">{c.personas}</dd>
            {c.paquete && (
              <>
                <dt className="text-[var(--text-3)]">Paquete</dt>
                <dd className="text-[var(--text)]">{c.paquete}</dd>
              </>
            )}
            {c.anticipo !== undefined && (
              <>
                <dt className="text-[var(--text-3)]">Anticipo</dt>
                <dd className="text-[var(--text)]">${c.anticipo.toFixed(2)}</dd>
              </>
            )}
            {c.nota && (
              <>
                <dt className="text-[var(--text-3)]">Nota</dt>
                <dd className="text-[var(--text)]">{c.nota}</dd>
              </>
            )}
          </dl>
          <p className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-[12.5px] text-[var(--text-2)]">
            <Users size={14} />
            {ocupadas} de {capacidadSucursal()} lugares reservados en {suc} a esa hora.
          </p>
        </div>
        {c.estado !== "cancelada" && (
          <footer className="flex gap-2 border-t border-line p-4">
            {c.estado === "pendiente" && (
              <button
                type="button"
                onClick={() => cambiarEstadoCita(c.id, "confirmada")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand py-2.5 text-[13px] font-bold text-white hover:opacity-90"
              >
                <Check size={15} /> Confirmar
              </button>
            )}
            <button
              type="button"
              onClick={() => cambiarEstadoCita(c.id, "cancelada")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2.5 text-[13px] font-semibold text-[var(--text-2)] hover:bg-surface"
            >
              Cancelar
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}

function NuevaCita({ citas, onCerrar }: { citas: Cita[]; onCerrar: () => void }) {
  const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const [tipo, setTipo] = useState<TipoCita>("reserva");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [sucursalId, setSucursalId] = useState(SUCURSALES_CAMPANA[0].id);
  const [fecha, setFecha] = useState(manana);
  const [horaTxt, setHoraTxt] = useState("13:00");
  const [personas, setPersonas] = useState(4);
  const [nota, setNota] = useState("");

  const inicio = new Date(`${fecha}T${horaTxt}:00`);
  const duracion = tipo === "evento" ? 180 : 90;
  const ocupadas = Number.isNaN(inicio.getTime()) ? 0 : ocupacion(citas, sucursalId, inicio, duracion);
  const cap = capacidadSucursal();
  const noCabe = ocupadas + personas > cap;
  const fueraDeHorario = inicio.getHours() < HORA_INICIO_AGENDA || inicio.getHours() >= HORA_FIN_AGENDA - 1;
  const listo = cliente.trim() && personas > 0 && !Number.isNaN(inicio.getTime()) && !fueraDeHorario;

  const campo = "w-full rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-[var(--text)] outline-none focus:border-brand";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onCerrar}>
      <div className="w-full max-w-lg rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-[var(--text)]">
            <CalendarHeart size={18} className="text-brand" /> Nueva reservación o evento
          </h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-[var(--text-3)] hover:bg-surface">
            <X size={18} />
          </button>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {(
            [
              ["reserva", "Reservación de mesa"],
              ["evento", "Evento"],
            ] as const
          ).map(([id, n]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTipo(id)}
              aria-pressed={tipo === id}
              className={cn("rounded-xl border px-3 py-2 text-[13px] font-semibold", tipo === id ? "border-brand bg-brand/[0.07] text-brand" : "border-line text-[var(--text-2)]")}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 block">
            <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">{tipo === "evento" ? "Cliente u organización" : "A nombre de"}</span>
            <input value={cliente} onChange={(e) => setCliente(e.target.value)} className={campo} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">Teléfono</span>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={campo} placeholder="+503" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">Personas</span>
            <input type="number" min={1} value={personas} onChange={(e) => setPersonas(Math.max(1, Number(e.target.value) || 1))} className={campo} />
          </label>
          <label className="col-span-2 block">
            <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">Sucursal</span>
            <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} className={campo}>
              {SUCURSALES_CAMPANA.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">Fecha</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">Hora</span>
            <input type="time" value={horaTxt} onChange={(e) => setHoraTxt(e.target.value)} className={campo} />
          </label>
          <label className="col-span-2 block">
            <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">Nota</span>
            <input value={nota} onChange={(e) => setNota(e.target.value)} className={campo} placeholder={tipo === "evento" ? "Paquete, decoración, pastel…" : "Silla para bebé, terraza…"} />
          </label>
        </div>
        <div className="mt-3 space-y-1.5 text-[12px]">
          <p className="flex items-center gap-1.5 text-[var(--text-2)]">
            <Clock size={13} /> {tipo === "evento" ? "Los eventos se bloquean 3 horas." : "Las reservaciones se bloquean 1 h 30 min."}
          </p>
          {fueraDeHorario && (
            <p className="flex items-center gap-1.5 font-semibold text-[var(--brand-red)]">
              <AlertTriangle size={13} /> Fuera del horario de la agenda ({HORA_INICIO_AGENDA}:00 a {HORA_FIN_AGENDA}:00).
            </p>
          )}
          {noCabe && !fueraDeHorario && (
            <p className="flex items-center gap-1.5 font-semibold text-[var(--lc-cola)]">
              <AlertTriangle size={13} /> A esa hora ya hay {ocupadas} de {cap} lugares reservados en esta sucursal: {personas} no caben.
            </p>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="rounded-xl border border-line px-4 py-2 text-[13px] font-semibold text-[var(--text-2)] hover:bg-surface">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!listo || noCabe}
            onClick={() => {
              agregarCita({
                tipo,
                titulo: tipo === "evento" ? `Evento de ${cliente.trim()}` : `Mesa para ${personas}`,
                cliente: cliente.trim(),
                telefono: telefono.trim() || "—",
                sucursalId,
                inicio: inicio.toISOString(),
                duracion,
                personas,
                estado: "confirmada",
                canal: "llamada",
                nota: nota.trim() || undefined,
              });
              onCerrar();
            }}
            className="rounded-xl bg-brand px-4 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-[var(--text-3)]"
          >
            Agendar
          </button>
        </div>
      </div>
    </div>
  );
}
