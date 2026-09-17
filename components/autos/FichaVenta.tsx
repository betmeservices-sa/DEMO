"use client";

// La ficha de la venta: los pasos y lo que se puede hacer con ellos.
//
// Es donde de verdad se trabaja el caso. Cada paso se agenda, se marca hecho o
// se marca trabado (con el motivo, que es lo que despues se reporta), y en
// cuanto la entrega queda hecha la venta se cierra sola: por eso aca no hay
// boton de "mover de etapa". La etapa es consecuencia, no una decision suelta.

import { useState } from "react";
import { CalendarClock, Check, Clock, RotateCcw, TriangleAlert, Trophy, UserCheck, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { telefonoBonito } from "@/lib/phone";
import { MODELOS, MOTIVOS_TRABA, nombreDeModelo, nombreDeTraba, type MotivoTraba } from "@/lib/autos-catalogo";
import { CANALES, ETAPA, type EstadoPaso, type Vendedor } from "@/lib/autos-pipeline";
import type { EventoVenta, Venta } from "./tipos";

const NOMBRE_EVENTO: Record<string, string> = {
  creado: "Entró el lead",
  contactado: "Se le contactó",
  asignado: "Asignado",
  reasignado: "Reasignado",
  tomado: "El vendedor lo tomó",
  paso_agendado: "Se agendó",
  paso_hecho: "Se hizo",
  paso_trabado: "Se trabó",
  modelo: "Cambió de modelo",
  monto: "Precio",
  canal: "Se marcó de dónde vino",
  cerrado: "Cerrado",
  aviso_gerente: "Aviso al gerente",
  vencido: "Vencido",
};

const COLOR_PASO: Record<EstadoPaso, string> = {
  pendiente: "border-line bg-surface text-[var(--text-3)]",
  agendado: "border-[var(--brand-accent)]/40 bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]",
  hecho: "border-emerald-300/60 bg-emerald-50 text-[#2f9e2f]",
  trabado: "border-[var(--brand-red)]/40 bg-[var(--brand-red)]/10 text-[var(--brand-red)]",
};

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function fecha(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-SV", {
    timeZone: "America/El_Salvador",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Lo que pide un <input type="datetime-local">: hora local, sin zona. */
function paraInput(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + 24 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function FichaVenta({
  caso,
  eventos,
  vendedores,
  ocupado,
  onAccion,
  onCerrar,
}: {
  caso: Venta;
  eventos: EventoVenta[];
  vendedores: Vendedor[];
  ocupado: boolean;
  onAccion: (cuerpo: Record<string, unknown>) => void;
  onCerrar: () => void;
}) {
  const [trabando, setTrabando] = useState<string | null>(null);
  const [agendando, setAgendando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<MotivoTraba>("precio");
  const [nota, setNota] = useState("");
  const [cuando, setCuando] = useState("");
  const [precio, setPrecio] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const [motivoCierre, setMotivoCierre] = useState("");

  const vendedor = vendedores.find((v) => v.id === caso.vendedor);
  const nombre = caso.nombre || telefonoBonito(caso.telefono);

  return (
    <aside className="flex h-full w-full flex-col border-l border-line bg-card md:w-[26rem]">
      <header className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text)]">{nombre}</h2>
          <p className="text-[12px] text-[var(--text-3)]">
            {telefonoBonito(caso.telefono)}
            {caso.monto ? ` · ${usd(caso.monto)}` : ""}
          </p>
          <p className="mt-1 inline-flex rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
            {ETAPA[caso.etapa].nombre}
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-lg border border-line p-1.5 text-[var(--text-3)] transition hover:bg-surface"
          aria-label="Cerrar ficha"
        >
          <X size={15} />
        </button>
      </header>

      <div className={cn("flex-1 space-y-4 overflow-y-auto p-4", ocupado && "opacity-60")}>
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">Qué anda viendo</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MODELOS.map((m) => (
              <Boton
                key={m.id}
                activo={nombreDeModelo(caso.modelo) === m.nombre}
                onClick={() => onAccion({ accion: "modelo", modelo: m.id })}
              >
                {m.nombre}
              </Boton>
            ))}
          </div>
          {/* El precio es el de la operación, no el de lista: es lo que el
              gerente suma en el embudo, así que se edita donde se negocia. */}
          <div className="mt-2 flex items-center gap-1.5">
            <input
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder={caso.monto ? usd(caso.monto) : "precio negociado"}
              inputMode="numeric"
              className="w-32 rounded-lg border border-line bg-card px-2 py-1.5 text-[12px] text-[var(--text)] outline-none"
            />
            <Boton
              onClick={() => {
                onAccion({ accion: "monto", monto: precio.trim() === "" ? null : precio });
                setPrecio("");
              }}
            >
              Guardar precio
            </Boton>
          </div>
        </section>

        <section>
          <div className="flex items-baseline justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">Pasos de la venta</h3>
            <span className="text-[12px] font-semibold text-[var(--text-2)]">
              {caso.avance.hechos} de {caso.avance.total}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-[var(--text-3)]">{caso.avance.resumen}</p>

          <ul className="mt-2 space-y-2">
            {caso.detalle.map((p) => (
              <li key={p.id} className={cn("rounded-xl border p-2.5", COLOR_PASO[p.estado])}>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold">
                    {p.nombre}
                    {p.opcional && <span className="ml-1 text-[10.5px] font-normal opacity-70">si aplica</span>}
                  </p>
                  <p className="text-[11px] opacity-80">
                    {p.estado === "pendiente" && p.ayuda}
                    {p.estado === "agendado" && `Para el ${fecha(p.fecha)}`}
                    {p.estado === "hecho" && `Hecho${p.ts ? ` el ${fecha(p.ts)}` : ""}`}
                    {p.estado === "trabado" && nombreDeTraba(p.motivo)}
                  </p>
                  {p.nota && <p className="mt-0.5 text-[11px] italic opacity-80">{p.nota}</p>}
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.agendable && p.estado !== "hecho" && (
                    <Boton
                      onClick={() => {
                        setAgendando(agendando === p.id ? null : p.id);
                        setCuando(paraInput(p.fecha));
                      }}
                    >
                      <CalendarClock size={12} /> {p.estado === "agendado" ? "Cambiar cita" : "Agendar"}
                    </Boton>
                  )}
                  {p.estado !== "hecho" && (
                    <Boton onClick={() => onAccion({ accion: "paso", paso: p.id, estado: "hecho" })}>
                      <Check size={12} /> Hecho
                    </Boton>
                  )}
                  {p.estado !== "trabado" && (
                    <Boton onClick={() => setTrabando(trabando === p.id ? null : p.id)}>
                      <TriangleAlert size={12} /> Se trabó
                    </Boton>
                  )}
                  {p.estado !== "pendiente" && (
                    <Boton onClick={() => onAccion({ accion: "paso", paso: p.id, estado: "pendiente" })}>Quitar</Boton>
                  )}
                </div>

                {agendando === p.id && (
                  <div className="mt-2 space-y-1.5 rounded-lg bg-card p-2">
                    <input
                      type="datetime-local"
                      value={cuando}
                      onChange={(e) => setCuando(e.target.value)}
                      className="w-full rounded-lg border border-line bg-card px-2 py-1.5 text-[12px] text-[var(--text)]"
                    />
                    <input
                      value={nota}
                      onChange={(e) => setNota(e.target.value)}
                      placeholder="Sucursal, color, con quién viene"
                      className="w-full rounded-lg border border-line bg-card px-2 py-1.5 text-[12px] text-[var(--text)] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!cuando) return;
                        onAccion({
                          accion: "paso",
                          paso: p.id,
                          estado: "agendado",
                          fecha: new Date(cuando).toISOString(),
                          nota: nota.trim() || null,
                        });
                        setAgendando(null);
                        setNota("");
                      }}
                      className="w-full rounded-lg bg-brand px-2 py-1.5 text-[12px] font-semibold text-white"
                    >
                      Dejar la cita puesta
                    </button>
                  </div>
                )}

                {trabando === p.id && (
                  <div className="mt-2 space-y-1.5 rounded-lg bg-card p-2">
                    <select
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value as MotivoTraba)}
                      className="w-full rounded-lg border border-line bg-card px-2 py-1.5 text-[12px] text-[var(--text)]"
                    >
                      {MOTIVOS_TRABA.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}
                        </option>
                      ))}
                    </select>
                    <input
                      value={nota}
                      onChange={(e) => setNota(e.target.value)}
                      placeholder="Qué habría que resolver (opcional)"
                      className="w-full rounded-lg border border-line bg-card px-2 py-1.5 text-[12px] text-[var(--text)] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onAccion({
                          accion: "paso",
                          paso: p.id,
                          estado: "trabado",
                          motivo,
                          nota: nota.trim() || null,
                        });
                        setTrabando(null);
                        setNota("");
                      }}
                      className="w-full rounded-lg bg-[var(--brand-red)] px-2 py-1.5 text-[12px] font-semibold text-white"
                    >
                      Marcar trabado
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">Vendedor</h3>
          <p className="mt-0.5 text-[13px] text-[var(--text-2)]">
            {vendedor ? vendedor.nombre : "sin asignar"}
            {caso.asignado && vendedor ? ` · desde ${fecha(caso.asignado)}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {vendedores.map((v) => (
              <Boton key={v.id} activo={v.id === caso.vendedor} onClick={() => onAccion({ accion: "asignar", vendedor: v.id })}>
                {v.id === caso.vendedor ? <UserCheck size={12} /> : <UserPlus size={12} />}
                {v.nombre.split(" ")[0]}
              </Boton>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">De dónde vino</h3>
          {/* El sistema sabe por dónde ENTRÓ el mensaje, pero no de dónde venía
              la persona: un WhatsApp puede nacer de un anuncio de Instagram y
              eso solo lo sabe quien habló con ella. Por eso se marca a mano, y
              se puede desmarcar: marcar mal sin poder corregir es peor. */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CANALES.map((c) => (
              <Boton
                key={c.id}
                activo={c.id === caso.canal}
                onClick={() => onAccion({ accion: "canal", canal: c.id === caso.canal ? null : c.id })}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                {c.nombre}
              </Boton>
            ))}
          </div>
        </section>

        <section className="space-y-1.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">Movimientos</h3>
          <div className="flex flex-wrap gap-1.5">
            {!caso.contactado && <Boton onClick={() => onAccion({ accion: "contactado" })}>Ya se le contactó</Boton>}
            {caso.asignado && !caso.tomado && (
              <Boton onClick={() => onAccion({ accion: "tomar" })}>
                <UserCheck size={12} /> Ya lo contacté
              </Boton>
            )}
            {!caso.cerrado && (
              <>
                <Boton onClick={() => onAccion({ accion: "cerrar", resultado: "venta" })}>
                  <Trophy size={12} /> Vendido
                </Boton>
                <Boton onClick={() => setCerrando(!cerrando)}>Perdido</Boton>
              </>
            )}
            {caso.cerrado && (
              <Boton onClick={() => onAccion({ accion: "reabrir" })}>
                <RotateCcw size={12} /> Reabrir
              </Boton>
            )}
          </div>
          {cerrando && !caso.cerrado && (
            <div className="space-y-1.5 rounded-lg border border-line bg-surface p-2">
              <input
                value={motivoCierre}
                onChange={(e) => setMotivoCierre(e.target.value)}
                placeholder="Por qué se perdió"
                className="w-full rounded-lg border border-line bg-card px-2 py-1.5 text-[12px] text-[var(--text)] outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  onAccion({ accion: "cerrar", resultado: "perdido", motivoCierre: motivoCierre.trim() || null });
                  setCerrando(false);
                  setMotivoCierre("");
                }}
                className="w-full rounded-lg border border-line bg-card px-2 py-1.5 text-[12px] font-semibold text-[var(--text-2)]"
              >
                Marcar perdido
              </button>
            </div>
          )}
          {caso.cerrado && (
            <p className="text-[12px] text-[var(--text-3)]">
              {caso.resultado === "venta" ? "Entregado" : "Perdido"} el {fecha(caso.cerrado)}
              {caso.motivoCierre ? ` · ${caso.motivoCierre}` : ""}
            </p>
          )}
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">Historia</h3>
          <ul className="mt-1.5 space-y-1.5">
            {eventos.length === 0 && <li className="text-[12px] text-[var(--text-3)]">Todavía no hay movimientos.</li>}
            {eventos.map((e, i) => (
              <li key={`${e.ts}-${i}`} className="flex gap-2 text-[12px]">
                <Clock size={12} className="mt-0.5 shrink-0 text-[var(--text-3)]" />
                <span>
                  <span className="font-semibold text-[var(--text-2)]">{NOMBRE_EVENTO[e.tipo] ?? e.tipo}</span>
                  {e.detalle ? ` · ${e.detalle}` : ""}
                  <span className="block text-[11px] text-[var(--text-3)]">{fecha(e.ts)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}

function Boton({
  children,
  onClick,
  activo,
}: {
  children: React.ReactNode;
  onClick: () => void;
  activo?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11.5px] font-semibold transition",
        activo ? "border-brand bg-brand text-white" : "border-line bg-card text-[var(--text-2)] hover:bg-surface",
      )}
    >
      {children}
    </button>
  );
}
