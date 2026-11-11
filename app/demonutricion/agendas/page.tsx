"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, CalendarDays, ChevronLeft, ChevronRight, MapPin, RefreshCw, UserRound, Video } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { AGENDA_INFO, diaCorto, ESTADO_CITA, minutosDe } from "@/lib/nutricion/format";
import { citasDe, horario, ocupacion } from "@/lib/nutricion/agenda";
import { CALENDARIOS, CLINICA, cliente } from "@/lib/nutricion/seed";
import { useStore } from "@/lib/nutricion/store";
import { PageHeader } from "@/components/nutricion/ui";
import { useEsMovil } from "@/lib/nutricion/useEsMovil";

// Rango visible y escala de cada calendario (px por minuto en computadora).
// Las entregas son ventanas de 20 min: van más altas para que se lean.
// Consultas: presencial en verde (la marca de consultas) y en línea en azul.
const MODALIDAD = {
  presencial: { label: "En clínica", Icon: MapPin, color: "var(--consultas)", soft: "var(--consultas-soft)" },
  en_linea: { label: "En línea", Icon: Video, color: "#0369a1", soft: "#e0f2fe" },
} as const;
type FiltroModalidad = "todas" | keyof typeof MODALIDAD;

const VISTA = {
  consultas: { ini: 7 * 60, fin: 19 * 60, px: 1.1, minimo: 26 },
  entregas: { ini: 6 * 60, fin: 13 * 60, px: 1.9, minimo: 20 },
} as const;

export default function AgendasPage() {
  // El calendario se elige con los botones Consultas / Entregas de la barra de arriba.
  const { calendario: agenda, diaCalendario, setDiaCalendario, rol } = useStore();
  const [modalidad, setModalidad] = useState<FiltroModalidad>("todas");
  const hoy = new Date().getDay();
  const lunesActual = hoy === 0 ? -6 : 1 - hoy;
  // Abre en la semana del día pedido (por ejemplo, una cita recién agendada).
  const [semana, setSemana] = useState(() => Math.floor((diaCalendario - lunesActual) / 7));
  useEffect(() => setDiaCalendario(0), [setDiaCalendario]);

  // Lunes de la semana actual como offset en días.
  const lunes = lunesActual + semana * 7;
  const dias = Array.from({ length: 6 }, (_, i) => lunes + i);
  // En el teléfono se ve un día a la vez; en computadora, la semana completa.
  const movil = useEsMovil();
  const [diaMovil, setDiaMovil] = useState<number | null>(null);
  const diaSel = diaMovil !== null && dias.includes(diaMovil) ? diaMovil : dias.includes(diaCalendario) ? diaCalendario : dias.includes(0) ? 0 : lunes;
  const visibles = movil ? [diaSel] : dias;
  const columnas = `56px repeat(${visibles.length}, 1fr)`;
  // En el teléfono hay un solo día: más alto para que las citas cortas se lean.
  const { ini: INI, fin: FIN, px, minimo } = VISTA[agenda];
  const PX = movil ? px * 1.45 : px;
  const entregas = agenda === "entregas";
  const info = AGENDA_INFO[agenda];
  const cal = CALENDARIOS[agenda];
  // Citas de consulta de la semana por modalidad (para el resumen y el filtro).
  const semanaCitas = entregas ? [] : dias.flatMap((d) => citasDe("consultas", d));
  const cuenta = (m: keyof typeof MODALIDAD) => semanaCitas.filter((c) => (c.modalidad ?? "presencial") === m).length;
  const visiblesDe = (d: number) => citasDe(agenda, d).filter((c) => entregas || modalidad === "todas" || (c.modalidad ?? "presencial") === modalidad);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={entregas ? "Calendario de entregas" : rol === "nutricionista" ? "Mi agenda de la semana" : "Calendario de consultas"}
        sub={
          entregas
            ? "Una entrega por paciente con plan, lunes a sábado. MIA mueve horarios y direcciones cuando el paciente lo pide."
            : "Citas de consulta de la semana. MIA le ofrece al paciente presencial o en línea y agenda con la modalidad que elige."
        }
        right={
          !entregas && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-line bg-card p-1 shadow-sm">
                {(
                  [
                    ["todas", `Todas ${semanaCitas.length}`],
                    ["presencial", `Presencial ${cuenta("presencial")}`],
                    ["en_linea", `En línea ${cuenta("en_linea")}`],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setModalidad(id)}
                    aria-pressed={modalidad === id}
                    className={cn("inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold", modalidad === id ? "text-white shadow-sm" : "text-[var(--text-2)] hover:bg-surface")}
                    style={modalidad === id ? { backgroundColor: id === "todas" ? "var(--text)" : MODALIDAD[id].color } : undefined}
                  >
                    {id !== "todas" && (id === "presencial" ? <MapPin size={13} /> : <Video size={13} />)}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-6 py-2.5">
        <div className="flex items-center gap-2 text-[12.5px]">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ backgroundColor: info.color }}>
            <CalendarDays size={14} />
          </span>
          <div className="leading-tight">
            <p className="font-bold">{cal.nombre}</p>
            <p className="text-[var(--text-3)]">
              {cal.cuenta} · {cal.horario}
            </p>
          </div>
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <RefreshCw size={10} /> Sincronizado
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setSemana((s) => s - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line hover:bg-surface" aria-label="Semana anterior">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setSemana(0)} className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-semibold hover:bg-surface">
            Esta semana
          </button>
          <button onClick={() => setSemana((s) => s + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line hover:bg-surface" aria-label="Semana siguiente">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {movil && (
        <div className="flex gap-1 border-b border-line bg-card px-3 py-2">
          {dias.map((d) => {
            const c = diaCorto(d);
            const on = d === diaSel;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDiaMovil(d)}
                aria-pressed={on}
                className={cn("flex flex-1 flex-col items-center rounded-lg py-1.5 text-[11px] font-semibold", on ? "text-white" : d === 0 ? "text-brand" : "text-[var(--text-2)]")}
                style={on ? { backgroundColor: info.color } : undefined}
              >
                <span className="uppercase">{c.nombre}</span>
                <span className="text-[16px] font-extrabold">{c.num}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className={cn("rounded-2xl border border-line bg-card shadow-sm", !movil && "min-w-[900px]")}>
          <div className="grid border-b border-line" style={{ gridTemplateColumns: columnas }}>
            <div />
            {visibles.map((d) => {
              const c = diaCorto(d);
              const oc = ocupacion(agenda, d);
              return (
                <div key={d} className={cn("border-l border-line px-2 py-2 text-center", d === 0 && "bg-brand/5")}>
                  <p className="text-[11px] font-semibold uppercase text-[var(--text-3)]">{c.nombre}</p>
                  <p className={cn("text-[18px] font-extrabold", d === 0 && "text-brand")}>{c.num}</p>
                  {oc !== null && (
                    <div className="mx-auto mt-1 h-1.5 w-20 rounded-full bg-surface-2" title={`Ocupación ${oc}%`}>
                      <div className="h-1.5 rounded-full" style={{ width: `${oc}%`, backgroundColor: info.color }} />
                    </div>
                  )}
                  <p className="mt-0.5 text-[10.5px] text-[var(--text-3)]">{entregas ? `${citasDe(agenda, d).length} entregas` : `${oc}% ocupado`}</p>
                </div>
              );
            })}
          </div>
          <div className="relative grid" style={{ gridTemplateColumns: columnas, height: (FIN - INI) * PX }}>
            <div className="relative">
              {Array.from({ length: (FIN - INI) / 60 }, (_, i) => (
                <span key={i} className="absolute right-2 -translate-y-1/2 text-[10.5px] text-[var(--text-3)]" style={{ top: i * 60 * PX }}>
                  {String(INI / 60 + i).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            {visibles.map((d) => {
              const h = horario(agenda, d);
              return (
                <div key={d} className="relative border-l border-line">
                  {Array.from({ length: (FIN - INI) / 60 }, (_, i) => (
                    <div key={i} className="absolute inset-x-0 border-t border-line/60" style={{ top: i * 60 * PX }} />
                  ))}
                  {h && h.fin < FIN && <div className="absolute inset-x-0 bg-[repeating-linear-gradient(45deg,var(--surface),var(--surface)_6px,transparent_6px,transparent_12px)]" style={{ top: (h.fin - INI) * PX, bottom: 0 }} />}
                  {h && h.ini > INI && <div className="absolute inset-x-0 top-0 bg-[repeating-linear-gradient(45deg,var(--surface),var(--surface)_6px,transparent_6px,transparent_12px)]" style={{ height: (h.ini - INI) * PX }} />}
                  {!entregas && h && h.fin > 14 * 60 && (
                    <div className="absolute inset-x-0 flex items-center justify-center bg-surface/70 text-[10px] font-semibold text-[var(--text-3)]" style={{ top: (12 * 60 - INI) * PX, height: 60 * PX }}>
                      Almuerzo
                    </div>
                  )}
                  {visiblesDe(d).map((c) => {
                    const top = (minutosDe(c.hora) - INI) * PX;
                    const alto = Math.max(c.duracionMin, minimo) * PX;
                    const nombre = cliente(c.clienteId).nombre;
                    const mod = entregas ? null : MODALIDAD[c.modalidad ?? "presencial"];
                    const color = mod?.color ?? info.color;
                    // Las citas de consulta abren la ficha del paciente; las entregas no llevan enlace.
                    const Contenedor = (entregas ? "div" : Link) as typeof Link;
                    return (
                      <Contenedor
                        key={c.id}
                        href={entregas ? "" : `/demonutricion/pacientes/${c.clienteId}`}
                        className={cn("absolute inset-x-1 block overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 text-[11px] leading-tight", !entregas && "hover:brightness-95", c.estado === "ausente" && "opacity-60 line-through")}
                        style={{ top, height: alto - 2, backgroundColor: mod?.soft ?? info.soft, borderColor: color }}
                        title={`${c.hora} ${nombre} · ${c.servicio}${mod ? ` · ${mod.label}` : ""}${c.zona ? ` · ${c.zona}` : ""} · ${entregas ? ESTADO_CITA[c.estado].entrega : ESTADO_CITA[c.estado].label}`}
                      >
                        <p className="flex items-center gap-1 font-bold" style={{ color }}>
                          {c.hora} {mod ? <mod.Icon size={10} /> : c.origen === "ia" ? <Bot size={10} /> : <UserRound size={10} />}
                          {mod && <span className="truncate text-[10px] font-semibold">{mod.label}</span>}
                          {mod && c.origen === "ia" && <Bot size={10} className="shrink-0" />}
                          {entregas && <span className="truncate font-semibold text-[var(--text)]">{nombre.split(" ").slice(0, 2).join(" ")}</span>}
                          {c.estado === "por_confirmar" && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title={entregas ? "Confirmar dirección o menú" : "Por confirmar"} />}
                          {c.estado === "en_curso" && entregas && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" title="En ruta" />}
                        </p>
                        {entregas ? (
                          alto > 34 && <p className="truncate text-[var(--text-3)]">{c.zona} · {c.servicio.split(" · ")[0]}</p>
                        ) : (
                          <>
                            <p className="truncate font-semibold text-[var(--text)]">{nombre}</p>
                            {alto > 50 && <p className="truncate text-[var(--text-3)]">{c.servicio}</p>}
                          </>
                        )}
                      </Contenedor>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-[11.5px] text-[var(--text-3)]">
          {entregas ? (
            <>
              <span className="flex items-center gap-1"><UserRound size={12} /> Del plan del paciente</span>
              <span className="flex items-center gap-1"><Bot size={12} /> Movida por MIA (IA)</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Confirmar dirección o menú</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" /> En ruta</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1" style={{ color: MODALIDAD.presencial.color }}><MapPin size={12} /> Presencial en la clínica ({CLINICA.direccion})</span>
              <span className="flex items-center gap-1" style={{ color: MODALIDAD.en_linea.color }}><Video size={12} /> En línea (videollamada)</span>
              <span className="flex items-center gap-1"><Bot size={12} /> Agendada por MIA (IA)</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Por confirmar</span>
            </>
          )}
          <span>Los dos calendarios nunca se mezclan: una entrega no puede caer en la agenda de la nutricionista.</span>
        </div>
      </div>
    </div>
  );
}
