"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { CalendarPlus, ChevronDown, ClipboardPen, Download, Eye, Mail, NotebookPen, Plus, Salad, ShieldCheck, Trash2, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { espaciosLibres, horario } from "@/lib/nutricion/agenda";
import { etiquetaDia, fechaDe, fechaLegible, iso } from "@/lib/nutricion/format";
import { STAFF } from "@/lib/nutricion/seed";
import { ahora, useStore } from "@/lib/nutricion/store";
import { descargarMenu, nombreArchivo, verMenu } from "@/lib/nutricion/menuPdf";
import type { Cita, Cliente, ItemMenu, Menu as MenuT, ResumenConsulta, Visita } from "@/lib/nutricion/types";
import { WhatsappIcon } from "./glifos";

/** Resumen de consulta en solo lectura. */
export function ResumenBloque({ r, className }: { r: ResumenConsulta; className?: string }) {
  const filas: [string, string | undefined][] = [
    ["Motivo de consulta", r.motivo],
    ["Observaciones", r.observaciones],
    ["Objetivo", r.objetivo],
    ["Plan e indicaciones", r.indicaciones],
    ["Próximo control", r.proximoControl],
  ];
  const medidas = [r.pesoKg && `Peso ${r.pesoKg} kg`, r.grasaPct && `Grasa ${r.grasaPct}%`, r.musculoKg && `Músculo ${r.musculoKg} kg`].filter((m): m is string => !!m);
  return (
    <div className={cn("rounded-lg border-l-[3px] border-[var(--consultas)] bg-[var(--consultas-soft)]/60 px-3 py-2.5 text-[12.5px]", className)}>
      {medidas.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {medidas.map((m) => (
            <span key={m} className="rounded-md bg-card px-2 py-0.5 font-semibold">
              {m}
            </span>
          ))}
        </div>
      )}
      <dl className="space-y-1.5">
        {filas.map(([k, v]) =>
          v ? (
            <div key={k} className="grid gap-0.5 sm:grid-cols-[170px_1fr]">
              <dt className="font-semibold text-[var(--consultas)]">{k}</dt>
              <dd className="text-[var(--text)]">{v}</dd>
            </div>
          ) : null,
        )}
      </dl>
      <p className="mt-2 text-[11px] text-[var(--text-3)]">
        {r.autor} · {r.escrito}
      </p>
    </div>
  );
}

const CONTROLES = ["No requiere", "En 7 días", "En 15 días", "En 30 días"];
const NUEVA = "__nueva__";

// Servicios que se pueden agendar desde el resumen, con su duración en minutos.
const SERVICIOS: [string, number][] = [
  ["Control de seguimiento", 30],
  ["Composición corporal", 30],
  ["Consulta nutricional", 60],
];

/** Primer día con atención a partir de `desde` días (salta domingos). */
function diaHabil(desde: number) {
  let d = Math.max(1, desde);
  while (!horario("consultas", d)) d++;
  return d;
}

/** Días que se ofrecen para agendar: las próximas 5 semanas con atención. */
function diasDisponibles() {
  return Array.from({ length: 35 }, (_, i) => i + 1).filter((d) => horario("consultas", d));
}

/**
 * Formulario de la nutricionista para resumir una consulta. Se puede resumir
 * una consulta ya atendida o registrar una de hoy sin cita. Las medidas quedan
 * en el progreso del paciente.
 */
export function ResumenModal({
  c,
  visita,
  onClose,
  onAgendada,
}: {
  c: Cliente;
  visita?: Visita;
  onClose: () => void;
  /** Avisa qué cita se agendó para mostrarlo en la ficha. */
  onAgendada?: (cita: Cita) => void;
}) {
  const { visitas, resumenes, guardarResumen, agregarCita } = useStore();
  const pendientes = visitas
    .filter((v) => v.clienteId === c.id && v.agenda === "consultas" && !resumenes[v.id])
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const [visitaId, setVisitaId] = useState<string>(visita?.id ?? pendientes[0]?.id ?? NUEVA);
  const previo = visita ? resumenes[visita.id] : undefined;

  const [f, setF] = useState({
    motivo: previo?.motivo ?? "",
    pesoKg: previo?.pesoKg ?? "",
    grasaPct: previo?.grasaPct ?? "",
    musculoKg: previo?.musculoKg ?? "",
    observaciones: previo?.observaciones ?? "",
    objetivo: previo?.objetivo ?? c.objetivo,
    indicaciones: previo?.indicaciones ?? "",
    proximoControl: previo?.proximoControl ?? "No requiere",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  // Agendar el próximo control desde el resumen: queda en el calendario de consultas.
  const [agendar, setAgendar] = useState(false);
  const [servicio, setServicio] = useState(SERVICIOS[0][0]);
  const [modalidad, setModalidad] = useState<Cita["modalidad"]>(c.modalidad);
  const [dia, setDia] = useState(() => diaHabil(1));
  const libres = agendar ? espaciosLibres("consultas", dia) : [];
  const [hora, setHora] = useState("");
  const horaValida = libres.includes(hora) ? hora : "";

  const elegirControl = (x: string) => {
    setF((y) => ({ ...y, proximoControl: x }));
    const n = Number(x.match(/\d+/)?.[0]);
    if (!n) return;
    // Al elegir un control se propone agendarlo ese día.
    setAgendar(true);
    setServicio("Control de seguimiento");
    setDia(diaHabil(n));
    setHora("");
  };

  const completo = f.motivo.trim() && f.observaciones.trim() && f.objetivo.trim() && f.indicaciones.trim() && (!agendar || horaValida);

  const guardar = () => {
    if (!completo) return;
    const hora = ahora();
    const v: Visita =
      visita ??
      visitas.find((x) => x.id === visitaId) ?? {
        id: `vis${Date.now()}`,
        clienteId: c.id,
        agenda: "consultas",
        fecha: iso(fechaDe(0)),
        hora,
        servicio: "Consulta nutricional",
        atendio: STAFF.nutricionista.nombre,
      };
    guardarResumen(v, {
      motivo: f.motivo.trim(),
      pesoKg: f.pesoKg.trim() || undefined,
      grasaPct: f.grasaPct.trim() || undefined,
      musculoKg: f.musculoKg.trim() || undefined,
      observaciones: f.observaciones.trim(),
      objetivo: f.objetivo.trim(),
      indicaciones: f.indicaciones.trim(),
      proximoControl: f.proximoControl,
      autor: STAFF.nutricionista.nombre,
      escrito: `Hoy · ${hora}`,
    });
    if (agendar && horaValida) {
      const cita: Cita = {
        id: `m${Date.now()}`,
        agenda: "consultas",
        clienteId: c.id,
        servicio,
        modalidad,
        dia,
        hora: horaValida,
        duracionMin: SERVICIOS.find(([s]) => s === servicio)?.[1] ?? 30,
        estado: "confirmada",
        origen: "manual",
      };
      agregarCita(cita);
      onAgendada?.(cita);
    }
    onClose();
  };

  const campo = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-[var(--consultas)]";

  return (
    <Modal titulo={previo ? "Editar resumen de consulta" : "Resumir consulta"} Icon={ClipboardPen} onClose={onClose}>
      <div className="space-y-3">
        {visita ? (
          <p className="rounded-lg bg-surface px-3 py-2 text-[13px]">
            <b>{c.nombre}</b> · {visita.servicio} · {fechaLegible(visita.fecha)} {visita.hora}
          </p>
        ) : (
          <Etiqueta texto="Consulta">
            <select value={visitaId} onChange={(e) => setVisitaId(e.target.value)} className={campo}>
              <option value={NUEVA}>Consulta de hoy (sin cita registrada)</option>
              {pendientes.map((v) => (
                <option key={v.id} value={v.id}>
                  {fechaLegible(v.fecha)} {v.hora} · {v.servicio}
                </option>
              ))}
            </select>
          </Etiqueta>
        )}

        <Etiqueta texto="Motivo de consulta *">
          <input value={f.motivo} onChange={set("motivo")} placeholder="Lo que cuenta el paciente" className={campo} />
        </Etiqueta>
        <div>
          <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">Composición corporal</span>
          <div className="grid grid-cols-3 gap-2">
            <input value={f.pesoKg} onChange={set("pesoKg")} inputMode="decimal" placeholder="Peso (kg)" aria-label="Peso en kilos" className={campo} />
            <input value={f.grasaPct} onChange={set("grasaPct")} inputMode="decimal" placeholder="Grasa (%)" aria-label="Porcentaje de grasa" className={campo} />
            <input value={f.musculoKg} onChange={set("musculoKg")} inputMode="decimal" placeholder="Músculo (kg)" aria-label="Masa muscular en kilos" className={campo} />
          </div>
        </div>
        <Etiqueta texto="Observaciones *">
          <textarea value={f.observaciones} onChange={set("observaciones")} rows={2} placeholder="Hábitos, horarios, actividad física, sueño…" className={campo} />
        </Etiqueta>
        <Etiqueta texto="Objetivo *">
          <input value={f.objetivo} onChange={set("objetivo")} className={campo} />
        </Etiqueta>
        <Etiqueta texto="Plan e indicaciones *">
          <textarea value={f.indicaciones} onChange={set("indicaciones")} rows={2} placeholder="Plan de comidas, rutina con Diego, agua…" className={campo} />
        </Etiqueta>
        <Etiqueta texto="Próximo control">
          <div className="flex flex-wrap gap-1.5">
            {CONTROLES.map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => elegirControl(x)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[12.5px] font-semibold",
                  f.proximoControl === x ? "border-[var(--consultas)] bg-[var(--consultas)] text-white" : "border-line text-[var(--text-2)] hover:bg-surface",
                )}
              >
                {x}
              </button>
            ))}
          </div>
        </Etiqueta>

        <div className={cn("rounded-xl border p-3", agendar ? "border-[var(--consultas)]/50 bg-[var(--consultas-soft)]/40" : "border-line")}>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] font-bold">
            <input type="checkbox" checked={agendar} onChange={(e) => setAgendar(e.target.checked)} className="h-4 w-4 accent-[var(--consultas)]" />
            <CalendarPlus size={15} /> Agendar próxima cita para {c.nombre.split(" ")[0]}
          </label>
          {agendar && (
            <div className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Etiqueta texto="Servicio">
                  <select value={servicio} onChange={(e) => setServicio(e.target.value)} className={campo}>
                    {SERVICIOS.map(([s]) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Etiqueta>
                <Etiqueta texto="Modalidad">
                  <div className="inline-flex w-full rounded-lg border border-line bg-surface p-0.5">
                    {(["presencial", "en_linea"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModalidad(m)}
                        className={cn("flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-semibold", modalidad === m ? "bg-[var(--consultas)] text-white" : "text-[var(--text-2)]")}
                      >
                        {m === "presencial" ? "Presencial" : "En línea"}
                      </button>
                    ))}
                  </div>
                </Etiqueta>
              </div>
              <Etiqueta texto="Día">
                <select
                  value={dia}
                  onChange={(e) => {
                    setDia(Number(e.target.value));
                    setHora("");
                  }}
                  className={campo}
                >
                  {diasDisponibles().map((d) => (
                    <option key={d} value={d}>
                      {etiquetaDia(d)}
                      {d > 1 ? ` · en ${d} días` : ""}
                    </option>
                  ))}
                </select>
              </Etiqueta>
              <div>
                <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">Hora disponible *</span>
                {libres.length === 0 ? (
                  <p className="text-[12.5px] text-amber-700">No hay espacios libres ese día. Elige otro día.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {libres.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHora(h)}
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-[12.5px] font-semibold tabular-nums",
                          horaValida === h ? "border-transparent bg-[var(--consultas)] text-white" : "border-line bg-card text-[var(--text-2)] hover:bg-surface",
                        )}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[11.5px] text-[var(--text-3)]">Queda confirmada en el calendario de consultas. MIA le envía el recordatorio al paciente 24 h antes.</p>
            </div>
          )}
        </div>

        <p className="flex items-start gap-1.5 rounded-lg bg-surface px-3 py-2 text-[11.5px] text-[var(--text-3)]">
          <ShieldCheck size={13} className="mt-0.5 shrink-0" />
          Uso interno del equipo. MIA no envía ni explica este resumen al paciente; si hay control, solo le recuerda agendarlo.
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-[12px] text-[var(--text-3)]">{STAFF.nutricionista.nombre}</span>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold hover:bg-surface">
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={!completo}
            className="rounded-lg bg-[var(--consultas)] px-3 py-1.5 text-[13px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {agendar ? "Guardar y agendar" : "Guardar resumen"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const TIEMPOS = ["Desayuno", "Merienda AM", "Almuerzo", "Merienda PM", "Cena"];
const VIGENCIAS = ["2 semanas", "4 semanas", "6 semanas"];
const vacio = (tiempo = ""): ItemMenu => ({ tiempo, comida: "", porcion: "", nota: "" });

/**
 * Menú personalizado desde la ficha del paciente: la nutricionista lo escribe,
 * revisa el PDF y lo envía por WhatsApp o por correo. Queda en Menús.
 */
export function MenuModal({ c, onClose, onEnviado }: { c: Cliente; onClose: () => void; onEnviado?: (m: MenuT) => void }) {
  const { agregarMenu } = useStore();
  const [items, setItems] = useState<ItemMenu[]>(() => TIEMPOS.map((t) => vacio(t)));
  const [vigencia, setVigencia] = useState("4 semanas");
  const [indicaciones, setIndicaciones] = useState("");
  const [compras, setCompras] = useState("");
  const validos = items.filter((i) => i.comida.trim());
  const editar = (i: number, cambio: Partial<ItemMenu>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...cambio } : x)));
  const campo = "w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--consultas)]";

  const menu = (canal?: MenuT["canal"]): MenuT => ({
    id: `mn${Date.now()}`,
    clienteId: c.id,
    hora: ahora(),
    fecha: "Hoy",
    vigencia,
    items: validos.map((i) => ({ tiempo: i.tiempo.trim() || "Comida", comida: i.comida.trim(), porcion: i.porcion.trim(), nota: i.nota.trim() })),
    compras: compras.trim() || undefined,
    indicaciones: indicaciones.trim() || undefined,
    estado: "enviado",
    canal,
  });

  const enviar = (canal: "whatsapp" | "correo") => {
    if (!validos.length) return;
    const m = menu(canal);
    agregarMenu(m);
    onEnviado?.(m);
    onClose();
  };

  return (
    <Modal titulo="Nuevo menú personalizado" Icon={Salad} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-[13px]">
          <span>
            <b>{c.nombre}</b> · {c.edad} años · {c.objetivo}
          </span>
          {c.restricciones?.length ? <span className="rounded bg-amber-100 px-1.5 text-[11.5px] font-semibold text-amber-800">{c.restricciones.join(" · ")}</span> : null}
        </div>

        <div>
          <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">Tiempos de comida *</span>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="rounded-xl border border-line p-2.5">
                <div className="flex items-center gap-2">
                  <input
                    value={it.tiempo}
                    onChange={(e) => editar(i, { tiempo: e.target.value })}
                    placeholder="Tiempo"
                    aria-label="Tiempo de comida"
                    className={cn(campo, "w-28 shrink-0 font-bold text-[var(--consultas)] sm:w-32")}
                  />
                  <input
                    value={it.comida}
                    onChange={(e) => editar(i, { comida: e.target.value })}
                    placeholder="Qué come (ej. omelette de claras)"
                    className={cn(campo, "min-w-0 flex-1 font-semibold")}
                    autoFocus={i === 0}
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}
                      aria-label="Quitar tiempo de comida"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input value={it.porcion} onChange={(e) => editar(i, { porcion: e.target.value })} placeholder="Porción" className={campo} />
                  <input value={it.nota} onChange={(e) => editar(i, { nota: e.target.value })} placeholder="Nota o alternativa" className={campo} />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItems((xs) => [...xs, vacio()])}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[var(--consultas)]/50 bg-[var(--consultas-soft)]/50 px-3 py-2 text-[13px] font-bold text-[var(--consultas)] hover:bg-[var(--consultas-soft)]"
            >
              <Plus size={16} /> Agregar otro tiempo de comida
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
          <Etiqueta texto="Indicaciones">
            <textarea value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} rows={2} placeholder="Agua, horarios, rutina con Diego…" className={campo} />
          </Etiqueta>
          <Etiqueta texto="Vigencia">
            <select value={vigencia} onChange={(e) => setVigencia(e.target.value)} className={campo}>
              {VIGENCIAS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Etiqueta>
        </div>
        <Etiqueta texto="Lista de compras (un producto por línea)">
          <textarea value={compras} onChange={(e) => setCompras(e.target.value)} rows={3} placeholder={"Claras de huevo\nEspinaca\nArroz integral"} className={campo} />
        </Etiqueta>

        <div className="rounded-xl border border-line p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-2 text-[13px] font-semibold">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[10px] font-extrabold text-rose-600">PDF</span>
              <span className="truncate">{validos.length ? nombreArchivo(menu()) : "El PDF se arma al escribir los tiempos de comida"}</span>
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => verMenu(menu())}
                disabled={!validos.length}
                className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] font-semibold hover:bg-surface disabled:opacity-40"
              >
                <Eye size={14} /> Ver
              </button>
              <button
                type="button"
                onClick={() => descargarMenu(menu())}
                disabled={!validos.length}
                className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] font-semibold hover:bg-surface disabled:opacity-40"
              >
                <Download size={14} /> Descargar
              </button>
            </div>
          </div>
        </div>

        <p className="flex items-start gap-1.5 rounded-lg bg-surface px-3 py-2 text-[11.5px] text-[var(--text-3)]">
          <ShieldCheck size={13} className="mt-0.5 shrink-0" />
          Si el paciente tiene dudas o quiere cambiar algo del menú, MIA lo pasa a la nutricionista: no cambia ni explica menús.
        </p>
      </div>
      <div className="mt-4 border-t border-line pt-4">
        <p className="mb-2 text-[12px] font-semibold text-[var(--text-2)]">
          Enviar el PDF a {c.nombre} · {STAFF.nutricionista.nombre}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => enviar("whatsapp")}
            disabled={!validos.length}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#1ba34d] px-3 py-2.5 text-[13px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <WhatsappIcon size={16} />
            <span className="truncate">WhatsApp · {c.telefono}</span>
          </button>
          <button
            type="button"
            onClick={() => enviar("correo")}
            disabled={!validos.length}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-[13px] font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Mail size={16} />
            <span className="truncate">Correo · {c.correo}</span>
          </button>
        </div>
        <button type="button" onClick={onClose} className="mt-2 w-full rounded-lg py-1.5 text-[12.5px] font-semibold text-[var(--text-3)] hover:bg-surface">
          Cancelar
        </button>
      </div>
    </Modal>
  );
}

export function NotaModal({ c, onClose }: { c: Cliente; onClose: () => void }) {
  const { agregarNota } = useStore();
  const [texto, setTexto] = useState("");
  const guardar = () => {
    if (!texto.trim()) return;
    agregarNota({ id: `n${Date.now()}`, clienteId: c.id, texto: texto.trim(), fecha: iso(fechaDe(0)), hora: ahora(), autor: "Usuario general" });
    onClose();
  };
  return (
    <Modal titulo={`Nota sobre ${c.nombre}`} Icon={NotebookPen} onClose={onClose}>
      <textarea
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={4}
        placeholder="Preferencias, horarios de entrega, datos útiles para la próxima consulta…"
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-brand"
      />
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold hover:bg-surface">Cancelar</button>
        <button type="button" onClick={guardar} disabled={!texto.trim()} className="rounded-lg bg-brand px-3 py-1.5 text-[13px] font-bold text-white hover:bg-brand-dark disabled:opacity-40">
          Guardar nota
        </button>
      </div>
    </Modal>
  );
}

function Etiqueta({ texto, children }: { texto: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">{texto}</span>
      {children}
    </label>
  );
}

export function Modal({ titulo, Icon, onClose, children }: { titulo: string; Icon: LucideIcon; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-t-2xl bg-card p-5 shadow-2xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="flex items-center gap-2 text-[16px] font-bold">
            <Icon size={18} /> {titulo}
          </p>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1 text-[var(--text-3)] hover:bg-surface">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Menú desplegable simple (botón + lista de acciones). */
export function Menu({
  label,
  items,
  Icon,
  compacto,
}: {
  label: string;
  items: { label: string; onClick?: () => void; href?: string }[];
  Icon?: LucideIcon;
  compacto?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setAbierto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);
  const item = "block w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-surface";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className={cn("inline-flex items-center gap-1 rounded-lg font-semibold text-brand hover:bg-brand/5", compacto ? "px-1.5 py-1 text-[12.5px]" : "px-2 py-1 text-[13px]")}
      >
        {Icon && <Icon size={14} />}
        {label}
        {!Icon && <ChevronDown size={14} />}
      </button>
      {abierto && (
        <div className="absolute right-0 z-30 mt-1 w-52 rounded-xl border border-line bg-card p-1.5 shadow-lg">
          {items.map((i) =>
            i.href ? (
              <Link key={i.label} href={i.href} className={item} onClick={() => setAbierto(false)}>
                {i.label}
              </Link>
            ) : (
              <button
                key={i.label}
                type="button"
                className={item}
                onClick={() => {
                  setAbierto(false);
                  i.onClick?.();
                }}
              >
                {i.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
