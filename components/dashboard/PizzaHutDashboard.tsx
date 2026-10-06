"use client";

// Cómo van los eventos de Pizza Hut, en una pantalla: lo que atendió Daniela,
// lo que entró, cuánta gente hay en cartera, qué se confirmó y qué tan rápido
// contacta el equipo. La muestra es determinista por día y lo real va encima.

import Link from "next/link";
import { useMemo } from "react";
import {
  CalendarCheck,
  Clock3,
  Moon,
  PartyPopper,
  PhoneIncoming,
  Percent,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useEventos } from "@/components/eventos/useEventos";
import { resumirTablero } from "@/lib/eventos/metricas";
import { TEXTO_HORARIO_OFICINA, nombreTipo } from "@/lib/eventos/catalogo";
import { diaSV, fechaCorta, haceCuanto, nombreMes } from "@/lib/eventos/fechas";
import { plazoPrimerContacto } from "@/lib/eventos/prioridad";
import { EtapaChip, RealBadge, miles } from "@/components/eventos/ui";

export function PizzaHutDashboard() {
  const { datos, error } = useEventos();
  const r = useMemo(() => (datos ? resumirTablero(datos.propuestas, datos.llamadas, datos.ahora) : null), [datos]);
  const vencidas = useMemo(
    () => (datos ? datos.propuestas.filter((p) => plazoPrimerContacto(p, datos.ahora).vencido).length : 0),
    [datos],
  );
  const hoy = diaSV(datos?.ahora ?? Date.now());

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line bg-card px-5 py-3">
        <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Cómo van los eventos</h1>
        <p className="text-[12.5px] text-[var(--text-3)]">Últimos 30 días</p>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {error && <p className="rounded-lg bg-[var(--ph-alarma-fondo)] px-3 py-2 text-[12.5px] font-semibold text-[var(--brand-red)]">{error}</p>}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Kpi Icon={PhoneIncoming} valor={r ? miles(r.llamadas) : "..."} label="Llamadas atendidas por Daniela" pie={r ? `${r.llamadasFuera} fuera de horario` : ""} />
          <Kpi Icon={PartyPopper} valor={r?.propuestasNuevas ?? "..."} label="Propuestas nuevas" pie="Llamada, chat y correo" />
          <Kpi Icon={Users} valor={r ? miles(r.aforoCartera) : "..."} label="Aforo en cartera" pie={r ? `Personas en ${r.eventosCartera} eventos` : ""} />
          <Kpi Icon={Percent} valor={r ? `${Math.round(r.tasaPropuesta * 100)}%` : "..."} label="Llamadas que fueron propuesta" pie={r ? `${r.llamadasPropuesta} de ${r.llamadas}` : ""} />
          <Kpi Icon={CalendarCheck} valor={r?.confirmadasMes ?? "..."} label="Confirmadas este mes" pie={nombreMes(hoy)} />
          <Kpi
            Icon={Clock3}
            valor={r?.horasPrimerContacto != null ? `${r.horasPrimerContacto} h` : "..."}
            label="Tiempo a primer contacto"
            pie={vencidas > 0 ? `${vencidas} sin contacto en 24 h` : "Plazo de 24 h"}
            alarma={vencidas > 0}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Tarjeta titulo="Llamadas por día" sub="Las que dejaron una propuesta, en rojo" className="xl:col-span-2">
            {r && <BarrasDia datos={r.porDia} hoy={hoy} />}
          </Tarjeta>
          <Tarjeta titulo="Embudo por etapa" sub="Propuestas de eventos que no han pasado">
            {r && (
              <div className="space-y-2.5">
                {r.embudo.map((e) => {
                  const max = Math.max(1, ...r.embudo.map((x) => x.n));
                  return (
                    <div key={e.etapa}>
                      <div className="mb-1 flex items-center justify-between text-[12.5px]">
                        <span className="flex items-center gap-2 font-medium text-[var(--text-2)]">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                          {e.nombre}
                        </span>
                        <span className="font-bold text-[var(--text)]">
                          {e.n} <span className="font-medium text-[var(--text-3)]">· {miles(e.aforo)} pers.</span>
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(e.n / max) * 100}%`, backgroundColor: e.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Tarjeta>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Tarjeta
            titulo="Llamadas por hora"
            sub={`Fuera del horario del equipo (${TEXTO_HORARIO_OFICINA}) solo atiende Daniela`}
            className="xl:col-span-2"
          >
            {r && <BarrasHora datos={r.porHora} total={r.llamadasFuera} />}
          </Tarjeta>
          <Tarjeta titulo="Propuestas por tipo" sub="Últimos 90 días">
            {r && (
              <div className="space-y-2.5">
                {r.porTipo.map((t) => {
                  const max = Math.max(1, ...r.porTipo.map((x) => x.n));
                  return (
                    <div key={t.tipo}>
                      <div className="mb-1 flex items-center justify-between text-[12.5px]">
                        <span className="font-medium text-[var(--text-2)]">{t.nombre}</span>
                        <span className="font-bold text-[var(--text)]">{t.n}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full bg-[var(--brand-accent)] transition-all duration-500" style={{ width: `${(t.n / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Tarjeta>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Tarjeta titulo="Próximos eventos" sub="Lo que viene en la cartera">
            <ul className="divide-y divide-[var(--border)]">
              {r?.proximos.map((p) => (
                <li key={p.id}>
                  <Link href={`/eventos?id=${encodeURIComponent(p.id)}`} className="flex items-center gap-3 py-2.5 transition hover:bg-surface/60">
                    <div className="w-14 shrink-0 text-center">
                      <p className="text-[11px] font-bold uppercase text-brand">{fechaCorta(p.datos.fecha_inicio).split(" ")[0]}</p>
                      <p className="text-[18px] font-extrabold leading-none text-[var(--text)]">{Number(p.datos.fecha_inicio.slice(8))}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-[13px] font-bold text-[var(--text)]">
                        {p.datos.nombre_evento || "Evento sin nombre"}
                        {p.origen === "real" && <RealBadge />}
                      </p>
                      <p className="truncate text-[11.5px] text-[var(--text-2)]">
                        {nombreTipo(p.datos.tipo_evento)} · {p.datos.recinto || "Lugar por definir"} · {miles(p.datos.aforo_esperado)} pers.
                      </p>
                    </div>
                    <EtapaChip etapa={p.etapa} />
                  </Link>
                </li>
              ))}
            </ul>
          </Tarjeta>

          <Tarjeta titulo="Actividad reciente" sub="Lo que entró y lo que se movió">
            <ul className="space-y-2.5">
              {r?.actividad.map((a, i) => (
                <li key={`${a.ts}-${i}`} className="flex gap-2.5">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: a.tipo === "propuesta" ? "var(--brand-blue)" : a.tipo === "llamada" ? "var(--ph-negro)" : "var(--ph-gris)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold text-[var(--text)]">
                      {a.propuestaId ? (
                        <Link href={`/eventos?id=${encodeURIComponent(a.propuestaId)}`} className="hover:underline">
                          {a.texto}
                        </Link>
                      ) : (
                        a.texto
                      )}
                      {a.real && <RealBadge />}
                    </p>
                    {a.detalle && <p className="truncate text-[11.5px] text-[var(--text-3)]">{a.detalle}</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-[var(--text-3)]">{haceCuanto(a.ts, datos?.ahora)}</span>
                </li>
              ))}
            </ul>
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  Icon,
  valor,
  label,
  pie,
  alarma,
}: {
  Icon: LucideIcon;
  valor: string | number;
  label: string;
  pie?: React.ReactNode;
  alarma?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ph-rojo-fondo)] text-brand">
        <Icon size={18} />
      </span>
      <p className="mt-3 text-[26px] font-extrabold leading-none tracking-tight text-[var(--text)]">{valor}</p>
      <p className="mt-1.5 text-[12.5px] font-semibold text-[var(--text-2)]">{label}</p>
      {pie && <p className={cn("mt-0.5 text-[11.5px]", alarma ? "font-bold text-[var(--brand-red)]" : "text-[var(--text-3)]")}>{pie}</p>}
    </div>
  );
}

function Tarjeta({ titulo, sub, children, className }: { titulo: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-card p-5 shadow-sm", className)}>
      <h2 className="text-sm font-bold text-[var(--text)]">{titulo}</h2>
      {sub && <p className="mb-4 text-[12px] text-[var(--text-3)]">{sub}</p>}
      {children}
    </section>
  );
}

function BarrasDia({ datos, hoy }: { datos: { dia: string; total: number; propuestas: number }[]; hoy: string }) {
  const max = Math.max(1, ...datos.map((d) => d.total));
  return (
    <div>
      <div className="flex h-40 items-end gap-[3px]">
        {datos.map((d) => (
          <div key={d.dia} className="group relative flex h-full flex-1 flex-col justify-end" title={`${fechaCorta(d.dia)}: ${d.total} llamadas, ${d.propuestas} propuestas`}>
            <div className="flex flex-col justify-end overflow-hidden rounded-t-[3px]" style={{ height: `${(d.total / max) * 100}%` }}>
              <div className="bg-[var(--ph-gris-claro)]" style={{ flex: d.total - d.propuestas }} />
              <div className="bg-brand" style={{ flex: d.propuestas }} />
            </div>
            <span
              className={cn(
                "pointer-events-none absolute -top-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[var(--brand-accent)] px-1.5 py-0.5 text-[10px] font-bold text-white group-hover:block",
              )}
            >
              {d.total}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10.5px] text-[var(--text-3)]">
        <span className="capitalize">{fechaCorta(datos[0]?.dia ?? hoy)}</span>
        <span className="capitalize">{fechaCorta(datos[Math.floor(datos.length / 2)]?.dia ?? hoy)}</span>
        <span>Hoy</span>
      </div>
    </div>
  );
}

function BarrasHora({ datos, total }: { datos: { hora: number; total: number; fuera: number }[]; total: number }) {
  const max = Math.max(1, ...datos.map((d) => d.total));
  return (
    <div>
      <div className="flex h-36 items-end gap-1">
        {datos.map((d) => (
          <div key={d.hora} className="flex h-full flex-1 flex-col justify-end" title={`${d.hora}:00: ${d.total} llamadas, ${d.fuera} fuera de horario`}>
            <div className="flex flex-col justify-end overflow-hidden rounded-t-[3px]" style={{ height: `${(d.total / max) * 100}%` }}>
              <div className="bg-brand" style={{ flex: d.fuera }} />
              <div className="bg-[var(--ph-gris-claro)]" style={{ flex: d.total - d.fuera }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10.5px] text-[var(--text-3)]">
        {[0, 6, 12, 18, 23].map((h) => (
          <span key={h}>{h}:00</span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11.5px] text-[var(--text-2)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Fuera de horario
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--ph-gris-claro)]" /> En horario
        </span>
        <span className="ml-auto flex items-center gap-1.5 font-semibold text-[var(--text)]">
          <Moon size={13} /> {total} atendidas fuera de horario
        </span>
      </div>
    </div>
  );
}

