"use client";

// Llamadas de un hotel de muestra: lo que atendió la recepcionista de voz en
// su línea. La muestra se arma con la hora de cada carga y las reales (las que
// llegan a la línea de verdad) van encima con su insignia. Lo que cada llamada
// deja en el panel (el apartado y el ticket) lo arma la vista; acá se enlaza.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Clock, Headset, PhoneCall, PhoneIncoming, RefreshCw, Search, Ticket as TicketIcon, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { recargarLlamadas, useHotelMuestra } from "@/lib/hotel-muestra/store";
import { hotelMuestraDe } from "@/lib/hotel-muestra/registro";
import { activeTenantId } from "@/lib/tenants/active";
import { dinero, fechaCorta } from "@/lib/hotel-muestra/fechas";
import { habitacionDe } from "@/lib/hotel-muestra/libro";
import {
  NOMBRE_MOTIVO,
  NOMBRE_PAGO,
  NOMBRE_TEMA,
  type LlamadaHotel,
  type MotivoLlamada,
} from "@/lib/hotel-muestra/llamadas";
import type { HotelMuestra } from "@/lib/hotel-muestra/tipos";

const TZ = "America/El_Salvador";
const FMT_HORA = new Intl.DateTimeFormat("es-SV", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const FMT_DIA = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** "Hoy, 3:42 p. m.", "Ayer, 9:10 a. m." o "lun 20 oct, 11:05 a. m.", en hora de El Salvador. */
function cuando(iso: string, hoy: string): string {
  const d = new Date(iso);
  const dia = FMT_DIA.format(d);
  const hora = FMT_HORA.format(d);
  if (dia === hoy) return `Hoy, ${hora}`;
  const ayer = FMT_DIA.format(new Date(Date.parse(`${hoy}T12:00:00-06:00`) - 86_400_000));
  if (dia === ayer) return `Ayer, ${hora}`;
  return `${fechaCorta(dia)}, ${hora}`;
}

function duracion(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return m ? `${m} min ${String(s).padStart(2, "0")} s` : `${s} s`;
}

/** +50391234518 → 9123-4518. Lo que no es de aquí va tal cual. */
function telefono(n: string): string {
  const d = n.replace(/\D/g, "");
  const local = d.length === 11 && d.startsWith("503") ? d.slice(3) : d.length === 8 ? d : null;
  return local ? `${local.slice(0, 4)}-${local.slice(4)}` : n || "Número oculto";
}

function quien(l: LlamadaHotel): string {
  return l.datos.nombre ?? telefono(l.numero);
}

export function LlamadasHotel() {
  const vista = useHotelMuestra();
  const hotel = hotelMuestraDe(activeTenantId());
  const [motivo, setMotivo] = useState<"" | MotivoLlamada>("");
  const [soloReales, setSoloReales] = useState(false);
  const [q, setQ] = useState("");
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [actualizando, setActualizando] = useState(false);

  // /llamadas?llamada=<id> abre esa llamada (lo usa "Escuchar la llamada" del tablero).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("llamada");
    if (id) setAbiertaId(id);
  }, []);

  const llamadas = useMemo(() => vista?.llamadas ?? [], [vista]);
  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    const dig = t.replace(/\D/g, "");
    return llamadas.filter(
      (l) =>
        (!motivo || l.datos.motivo === motivo) &&
        (!soloReales || l.origen === "real") &&
        (!t || (l.datos.nombre ?? "").toLowerCase().includes(t) || (dig !== "" && l.numero.replace(/\D/g, "").includes(dig))),
    );
  }, [llamadas, motivo, soloReales, q]);

  if (!vista || !hotel?.voz) return null;

  const hoy = vista.hoy;
  const deHoy = llamadas.filter((l) => FMT_DIA.format(new Date(l.inicio)) === hoy);
  const apartadas = llamadas.filter((l) => l.datos.reserva_apartada).length;
  const esperan = vista.tickets.filter((t) => t.id.startsWith(`${hotel.tenant}-ll-`) && t.estado !== "resuelto").length;
  const promedio = llamadas.length ? llamadas.reduce((n, l) => n + l.duracionSeg, 0) / llamadas.length : 0;
  const reales = llamadas.filter((l) => l.origen === "real").length;
  const abierta = abiertaId ? llamadas.find((l) => l.id === abiertaId) : undefined;

  async function actualizar() {
    setActualizando(true);
    try {
      await recargarLlamadas();
    } finally {
      setActualizando(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-card px-5 py-3">
        <div>
          <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Llamadas</h1>
          <p className="text-[12.5px] text-[var(--text-3)]">
            Lo que atendió {hotel.agente} en la línea de recepción {hotel.voz.linea}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void actualizar()}
          disabled={actualizando}
          className="ml-auto flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-xs font-medium text-[var(--text)] hover:bg-surface disabled:opacity-50"
        >
          <RefreshCw size={14} className={actualizando ? "animate-spin" : ""} />
          Actualizar
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand/25 bg-brand/5 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
            <PhoneCall size={17} />
          </span>
          <p className="min-w-0 flex-1 text-[13px] text-[var(--text)]">
            <strong>{hotel.agente} contesta el {hotel.voz.linea} las 24 horas.</strong>{" "}
            <span className="text-[var(--text-2)]">
              Cotiza, aparta habitaciones y deja el pendiente al equipo. Cada llamada aparece aquí al colgar.
            </span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Cifra Icon={PhoneIncoming} valor={deHoy.length} label="Atendidas hoy" pie={reales ? `${reales} reales en total` : `${llamadas.length} en los últimos días`} />
          <Cifra Icon={CalendarCheck} valor={apartadas} label="Reservas apartadas" pie="Por teléfono, esperando el pago" />
          <Cifra Icon={TicketIcon} valor={esperan} label="Pendientes del equipo" pie="Link de pago, eventos, avisos" />
          <Cifra Icon={Clock} valor={duracion(Math.round(promedio))} label="Duración promedio" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar nombre o número"
              className="w-52 rounded-lg border border-line bg-card py-1.5 pl-8 pr-2 text-[12.5px]"
            />
          </label>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as "" | MotivoLlamada)}
            aria-label="Motivo"
            className="rounded-lg border border-line bg-card px-2 py-1.5 text-[12.5px] font-medium"
          >
            <option value="">Todos los motivos</option>
            {Object.entries(NOMBRE_MOTIVO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSoloReales((x) => !x)}
            aria-pressed={soloReales}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold transition",
              soloReales ? "border-brand bg-brand text-white" : "border-line bg-card text-[var(--text-2)] hover:bg-surface",
            )}
          >
            Solo reales
          </button>
          <span className="ml-auto text-[12px] text-[var(--text-3)]">
            {filtradas.length} {filtradas.length === 1 ? "llamada" : "llamadas"}
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
          {filtradas.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-[var(--text-3)]">
              {soloReales ? `Todavía no hay llamadas reales. Llame al ${hotel.voz.linea} y toque Actualizar.` : "Ninguna llamada con ese filtro."}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {filtradas.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => setAbiertaId(l.id)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface/70"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-brand">
                      <PhoneIncoming size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[13.5px] font-bold text-[var(--text)]">{quien(l)}</span>
                        <MotivoBadge l={l} />
                        {l.origen === "real" && <RealBadge />}
                        <span className="text-[11.5px] text-[var(--text-3)]">
                          {cuando(l.inicio, hoy)} · {l.enCurso ? "en curso" : duracion(l.duracionSeg)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-[var(--text-2)] sm:truncate">{l.resumen}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {abierta && <DetalleLlamada l={abierta} hotel={hotel} hoy={hoy} onCerrar={() => setAbiertaId(null)} />}
    </div>
  );
}

function MotivoBadge({ l }: { l: LlamadaHotel }) {
  const m = l.datos.motivo;
  if (!m) return null;
  const fuerte = l.datos.reserva_apartada || m === "reserva";
  return (
    <span
      className={cn(
        "whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-bold",
        fuerte ? "bg-brand/10 text-brand" : "bg-[var(--surface-2)] text-[var(--text-2)]",
      )}
    >
      {l.datos.reserva_apartada ? "Reserva apartada" : NOMBRE_MOTIVO[m]}
    </span>
  );
}

function RealBadge() {
  return (
    <span className="inline-flex items-center rounded-md bg-[var(--brand-accent)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
      Real
    </span>
  );
}

function Cifra({ Icon, valor, label, pie }: { Icon: typeof Clock; valor: string | number; label: string; pie?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon size={18} />
      </span>
      <p className="mt-3 text-[24px] font-extrabold leading-none tracking-tight text-[var(--text)]">{valor}</p>
      <p className="mt-1.5 text-[12.5px] font-semibold text-[var(--text-2)]">{label}</p>
      {pie && <p className="text-[11.5px] text-[var(--text-3)]">{pie}</p>}
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor?: string }) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">{label}</dt>
      <dd className="text-[13px] text-[var(--text)]">{valor}</dd>
    </div>
  );
}

function DetalleLlamada({ l, hotel, hoy, onCerrar }: { l: LlamadaHotel; hotel: HotelMuestra; hoy: string; onCerrar: () => void }) {
  const vista = useHotelMuestra();
  const d = l.datos;
  const hab = d.habitacion ? habitacionDe(hotel, d.habitacion)?.hab.nombre : undefined;
  const personas = [d.adultos ? `${d.adultos} ${d.adultos === 1 ? "adulto" : "adultos"}` : "", d.ninos ? `${d.ninos} ${d.ninos === 1 ? "niño" : "niños"}` : ""]
    .filter(Boolean)
    .join(" y ");
  const fechas = d.fecha_llegada ? `${fechaCorta(d.fecha_llegada)}${d.fecha_salida ? ` al ${fechaCorta(d.fecha_salida)}` : ""}` : undefined;
  const apartado = vista?.apartados.find((a) => a.llamadaId === l.id);
  const ticket = vista?.tickets.find((t) => t.id === `${hotel.tenant}-ll-${l.id}`);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onCerrar}>
      <aside
        className="flex h-full w-full max-w-[560px] flex-col bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Llamada de ${quien(l)}`}
      >
        <header className="flex items-start gap-3 border-b border-line bg-card px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-wide text-brand">
              {d.motivo ? NOMBRE_MOTIVO[d.motivo] : "Llamada"}
              {l.origen === "real" && <RealBadge />}
            </p>
            <h2 className="text-[17px] font-extrabold text-[var(--text)]">{quien(l)}</h2>
            <p className="text-[12.5px] text-[var(--text-2)]">
              {d.nombre ? `${telefono(l.numero)} · ` : ""}
              {cuando(l.inicio, hoy)} · {l.enCurso ? "en curso" : duracion(l.duracionSeg)}
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-surface">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <p className="rounded-xl border border-line bg-card px-3.5 py-3 text-[13px] leading-relaxed text-[var(--text)]">{l.resumen}</p>

          {(apartado || ticket) && (
            <div className="space-y-2">
              {apartado && (
                <Link
                  href="/dashboard"
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-3.5 py-2.5 text-[12.5px] text-[var(--text)] hover:border-brand"
                >
                  <span>
                    <strong>Apartado {apartado.id}</strong> en Reservas por confirmar · {apartado.habitacionNombre}, {dinero(apartado.total)}
                  </span>
                  <CalendarCheck size={15} className="shrink-0 text-brand" />
                </Link>
              )}
              {ticket && (
                <Link
                  href="/tickets"
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-3.5 py-2.5 text-[12.5px] text-[var(--text)] hover:border-brand"
                >
                  <span>
                    <strong>Ticket #{ticket.numero}</strong> · {ticket.titulo}
                  </span>
                  <TicketIcon size={15} className="shrink-0 text-brand" />
                </Link>
              )}
            </div>
          )}

          <section className="rounded-xl border border-line bg-card px-3.5 py-3">
            <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-[var(--text-2)]">
              <Headset size={14} className="text-brand" />
              Lo que anotó {hotel.agente}
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <Dato label="Habitación" valor={hab} />
              <Dato label="Fechas" valor={fechas} />
              <Dato label="Personas" valor={personas || undefined} />
              <Dato label="Total cotizado" valor={d.total_estimado ? dinero(d.total_estimado) : undefined} />
              <Dato label="Cómo paga" valor={d.forma_pago ? NOMBRE_PAGO[d.forma_pago] : undefined} />
              <Dato label="Teléfono" valor={d.telefono ? telefono(d.telefono) : l.numero ? `${telefono(l.numero)} (el de la llamada)` : undefined} />
              <Dato label="Correo" valor={d.correo} />
              <Dato label="Mascota" valor={d.mascota ? "Preguntó por llevar mascota" : undefined} />
            </dl>
            {d.siguiente_paso && (
              <p className="mt-3 rounded-lg bg-brand/5 px-3 py-2 text-[12.5px] text-[var(--text)]">
                <strong className="text-brand">Siguiente paso:</strong> {d.siguiente_paso}
              </p>
            )}
            {d.notas && <p className="mt-2 text-[12.5px] text-[var(--text-2)]">{d.notas}</p>}
            {d.temas && d.temas.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {d.temas.map((t) => (
                  <span key={t} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-2)]">
                    {NOMBRE_TEMA[t]}
                  </span>
                ))}
              </div>
            )}
          </section>

          {l.origen === "real" ? (
            l.grabacion ? (
              <audio controls preload="none" className="h-9 w-full" src={`/api/calls/${encodeURIComponent(l.id)}/grabacion`} />
            ) : null
          ) : (
            <p className="rounded-lg bg-card px-3 py-2 text-[12px] text-[var(--text-3)]">Llamada de muestra: sin audio.</p>
          )}

          {l.turnos.length > 0 ? (
            <div className="space-y-2 rounded-xl bg-card p-3">
              {l.turnos.map((t, i) => (
                <div key={i} className={cn("flex", t.quien === "agente" ? "justify-start" : "justify-end")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed",
                      t.quien === "agente" ? "rounded-tl-sm bg-surface text-[var(--text)]" : "rounded-tr-sm bg-brand text-white",
                    )}
                  >
                    <p className={cn("mb-0.5 text-[10.5px] font-bold", t.quien === "agente" ? "text-brand" : "text-white/75")}>
                      {t.quien === "agente" ? hotel.agente : (d.nombre ?? "Cliente")}
                    </p>
                    {t.texto}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-[var(--text-3)]">{l.enCurso ? "La conversación aparece al colgar." : "Esta llamada no dejó transcripción."}</p>
          )}
        </div>
      </aside>
    </div>
  );
}
