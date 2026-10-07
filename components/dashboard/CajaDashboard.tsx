"use client";

// El tablero de la Caja de Credito de Chalatenango, para el shell flotante.
//
// Arriba lo urgente del dia (cuotas que vencen, promesas de pago, solicitudes
// de tarjeta sin contactar); debajo una tarjeta por area con su cifra, su
// tendencia de siete dias y lo que hay abierto ahora en la bandeja. Las
// pestanas de area de la barra de arriba filtran todo.

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, CreditCard, HandCoins, Inbox, MessagesSquare, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";
import { departments, staff } from "@/lib/data/seed";
import type { Conversation, DepartmentId } from "@/lib/data/types";
import { activeTenantId } from "@/lib/tenants/active";
import { enArea, fijarArea, useArea } from "@/lib/area-shell";
import { abrirConversacion, urgentesDe } from "@/lib/flotante";
import { PANEL_AREAS, type PanelArea, type TipoUrgente, type Urgente } from "@/lib/tenants/chalatenango-panel";
import { Avatar, inicialesDe } from "@/components/ui/Avatar";
import { OrigenCanales } from "./OrigenCanales";

const ICONO_AREA: Partial<Record<DepartmentId, typeof Inbox>> = {
  consultas: MessagesSquare,
  cobranza: HandCoins,
  tarjetas: CreditCard,
};

const ICONO_URGENTE: Record<TipoUrgente, typeof Inbox> = {
  cuota: HandCoins,
  promesa: CalendarDays,
  tarjeta: CreditCard,
  consulta: MessagesSquare,
};

function depto(id: DepartmentId) {
  return departments.find((d) => d.id === id);
}

function fechaSV(): string {
  const f = new Intl.DateTimeFormat("es-SV", {
    timeZone: "America/El_Salvador",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return f.charAt(0).toUpperCase() + f.slice(1);
}

export function CajaDashboard() {
  const { state } = useStore();
  const area = useArea();
  const router = useRouter();
  const pathname = usePathname();
  const tenant = activeTenantId();
  const [fecha, setFecha] = useState<string | null>(null);
  useEffect(() => setFecha(fechaSV()), []);

  const convs = useMemo(
    () => state.conversations.filter((c) => enArea(area, c.departamento)),
    [state.conversations, area],
  );
  const urgentes = urgentesDe(tenant).filter((u) => enArea(area, u.area));
  const areas = PANEL_AREAS.filter((a) => enArea(area, a.id));
  const sinAsignar = convs.filter((c) => !c.asignadoA && c.estado !== "resuelto").length;

  function abrirDe(u: Urgente) {
    const conv = state.conversations.find((c) => c.contactId === u.contactId);
    if (conv) abrirConversacion(tenant, conv.id, conv.departamento, pathname, (r) => router.push(r));
    else router.push("/contactos");
  }

  function abrirConv(c: Conversation) {
    abrirConversacion(tenant, c.id, c.departamento, pathname, (r) => router.push(r));
  }

  const titulo = area === "todos" ? "Toda la Caja" : depto(area)?.nombre ?? "";

  return (
    <div className="-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-2">
      <div className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3 px-1">
          <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--text)]">{titulo}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {fecha && (
              <span className="flex items-center gap-1.5 rounded-full bg-[var(--card)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-2)] ring-1 ring-[var(--border)]">
                <CalendarDays size={13} />
                {fecha}
              </span>
            )}
            <button
              type="button"
              onClick={() => router.push("/")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 transition",
                sinAsignar > 0
                  ? "bg-[var(--brand-accent-soft)] text-[var(--brand-accent)] ring-[color-mix(in_srgb,var(--brand-accent)_25%,transparent)] hover:brightness-95"
                  : "bg-[var(--card)] text-[var(--text-2)] ring-[var(--border)]",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", sinAsignar > 0 ? "bg-[var(--brand-accent)]" : "bg-[var(--brand-green)]")} />
              {sinAsignar > 0 ? `${sinAsignar} sin asignar` : "Todo asignado"}
            </button>
          </div>
        </header>

        {urgentes.length > 0 && (
          <section aria-labelledby="caja-urgente">
            <div className="mb-2 flex items-center gap-2 px-1">
              <h2 id="caja-urgente" className="text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--text-2)]">
                Lo urgente
              </h2>
              <span className="rounded-full bg-[var(--brand-red)] px-2 text-[11px] font-bold leading-[18px] text-white">
                {urgentes.length}
              </span>
            </div>
            <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible xl:grid-cols-4">
              {urgentes.map((u) => (
                <TarjetaUrgente key={u.id} u={u} onAbrir={() => abrirDe(u)} />
              ))}
            </div>
          </section>
        )}

        <section
          className={cn("grid gap-3", areas.length > 1 ? "md:grid-cols-2 xl:grid-cols-3" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]")}
        >
          {areas.map((a) => (
            <TarjetaArea
              key={a.id}
              a={a}
              abiertas={state.conversations.filter((c) => c.departamento === a.id && c.estado !== "resuelto").length}
              onIr={() => {
                fijarArea(a.id);
                router.push("/");
              }}
            />
          ))}
          {areas.length === 1 && (
            <AbiertasDelArea convs={convs} contactos={state.contacts} onAbrir={abrirConv} />
          )}
        </section>

        <section className="grid gap-3 lg:grid-cols-3">
          <EstadoBandeja convs={convs} />
          <Equipo convs={convs} area={area} />
          <div className="[&>section]:h-full [&>section]:rounded-[1.25rem] [&>section]:shadow-[var(--sombra-flotante)]">
            <OrigenCanales conversations={convs} />
          </div>
        </section>
      </div>
    </div>
  );
}

function TarjetaUrgente({ u, onAbrir }: { u: Urgente; onAbrir: () => void }) {
  const d = depto(u.area);
  const Icono = ICONO_URGENTE[u.tipo];
  return (
    <motion.button
      type="button"
      onClick={onAbrir}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="caja-tarjeta group relative w-[260px] shrink-0 snap-start overflow-hidden p-3.5 text-left transition-shadow duration-200 hover:shadow-[var(--sombra-levantada)] lg:w-auto"
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: d?.color }} aria-hidden />
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[12px] font-bold" style={{ color: d?.color }}>
          <Icono size={14} className="shrink-0" />
          <span className="truncate">{u.titulo}</span>
        </span>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-[var(--surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-2)]">
          {u.cuando}
        </span>
      </span>
      <span className="mt-2 block truncate text-[14px] font-bold text-[var(--text)]">{u.persona}</span>
      <span className="mt-0.5 block truncate text-[12.5px] text-[var(--text-2)]">{u.detalle}</span>
      <span className="mt-2.5 flex items-center gap-1 text-[12px] font-semibold text-[var(--brand-blue)]">
        Abrir
        <ArrowUpRight size={14} className="transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </motion.button>
  );
}

function Sparkline({ serie, color }: { serie: number[]; color: string }) {
  const w = 160;
  const h = 44;
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const rango = max - min || 1;
  const pts = serie.map((v, i) => [(i / (serie.length - 1)) * w, h - 4 - ((v - min) / rango) * (h - 10)] as const);
  const linea = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${linea} L${w},${h} L0,${h} Z`;
  const id = `sp-${color.replace("#", "")}`;
  const [ux, uy] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-11 w-full" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={linea} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={ux} cy={uy} r="3" fill={color} />
    </svg>
  );
}

function TarjetaArea({ a, abiertas, onIr }: { a: PanelArea; abiertas: number; onIr: () => void }) {
  const d = depto(a.id);
  const color = d?.color ?? "var(--brand-blue)";
  const Icono = ICONO_AREA[a.id] ?? Inbox;
  const sube = a.principal.delta >= 0;
  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="caja-tarjeta flex flex-col p-4 transition-shadow duration-200 hover:shadow-[var(--sombra-levantada)]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ backgroundColor: color }}>
            <Icono size={16} />
          </span>
          <span className="text-[14px] font-bold text-[var(--text)]">{d?.nombre}</span>
        </span>
        <button
          type="button"
          onClick={onIr}
          aria-label={`Abrir la bandeja de ${d?.nombre ?? ""}`}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-2)] ring-1 ring-[var(--border)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
        >
          <ArrowUpRight size={15} />
        </button>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[30px] font-extrabold leading-none tracking-tight text-[var(--text)]">{a.principal.valor}</p>
          <p className="mt-1 text-[12.5px] font-medium text-[var(--text-2)]">{a.principal.label}</p>
        </div>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold",
            sube ? "bg-[color-mix(in_srgb,var(--brand-green)_12%,transparent)] text-[var(--brand-green)]" : "bg-[color-mix(in_srgb,var(--brand-red)_10%,transparent)] text-[var(--brand-red)]",
          )}
          title="Contra el mismo día de la semana pasada"
        >
          {sube ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {sube ? "+" : ""}
          {a.principal.delta}%
        </span>
      </div>

      <div className="mt-3">
        <Sparkline serie={a.serie} color={color} />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-3">
        {a.secundarios.map((k) => (
          <div key={k.label} className="min-w-0">
            <dt className="truncate text-[11.5px] text-[var(--text-3)]">{k.label}</dt>
            <dd className="text-[15px] font-bold text-[var(--text)]">{k.valor}</dd>
          </div>
        ))}
        <div className="min-w-0">
          <dt className="truncate text-[11.5px] text-[var(--text-3)]">Abiertas ahora</dt>
          <dd className="text-[15px] font-bold text-[var(--text)]">{abiertas}</dd>
        </div>
      </dl>
    </motion.article>
  );
}

function AbiertasDelArea({
  convs,
  contactos,
  onAbrir,
}: {
  convs: Conversation[];
  contactos: { id: string; nombre: string }[];
  onAbrir: (c: Conversation) => void;
}) {
  const abiertas = convs
    .filter((c) => c.estado !== "resuelto")
    .sort((a, b) => b.ultimoMensajeTs.localeCompare(a.ultimoMensajeTs));
  return (
    <article className="caja-tarjeta flex flex-col p-4">
      <h2 className="mb-2 text-[14px] font-bold text-[var(--text)]">Esperando respuesta</h2>
      {abiertas.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] text-[var(--text-3)]">Nada pendiente en esta área.</p>
      ) : (
        <ul className="-mx-1.5 space-y-0.5">
          {abiertas.map((c) => {
            const nombre = contactos.find((x) => x.id === c.contactId)?.nombre ?? "";
            const asignado = staff.find((s) => s.id === c.asignadoA);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onAbrir(c)}
                  className="flex w-full items-center gap-3 rounded-xl px-1.5 py-2 text-left transition hover:bg-[var(--surface)]"
                >
                  <Avatar iniciales={inicialesDe(nombre)} size={32} color={depto(c.departamento)?.color} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-[var(--text)]">{nombre}</span>
                    <span className="block truncate text-[11.5px] text-[var(--text-3)]">
                      {asignado ? asignado.nombre : "Sin asignar"}
                    </span>
                  </span>
                  {c.noLeidos > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-accent)] px-1.5 text-[11px] font-bold text-white">
                      {c.noLeidos}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

const ESTADOS = [
  { id: "nuevo", label: "Nuevas", color: "var(--brand-accent)" },
  { id: "en_progreso", label: "En progreso", color: "var(--caja-ambar, #a14b00)" },
  { id: "resuelto", label: "Resueltas", color: "var(--brand-green)" },
] as const;

function EstadoBandeja({ convs }: { convs: Conversation[] }) {
  const total = convs.length;
  return (
    <article className="caja-tarjeta p-4">
      <h2 className="mb-3 text-[14px] font-bold text-[var(--text)]">La bandeja ahora</h2>
      <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-[var(--surface)]">
        {ESTADOS.map((e) => {
          const n = convs.filter((c) => c.estado === e.id).length;
          return total > 0 && n > 0 ? (
            <span key={e.id} style={{ width: `${(n / total) * 100}%`, backgroundColor: e.color }} />
          ) : null;
        })}
      </div>
      <ul className="space-y-2">
        {ESTADOS.map((e) => {
          const n = convs.filter((c) => c.estado === e.id).length;
          return (
            <li key={e.id} className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-2 text-[var(--text-2)]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                {e.label}
              </span>
              <span className="font-bold text-[var(--text)]">{n}</span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function Equipo({ convs, area }: { convs: Conversation[]; area: string }) {
  const filas = staff
    .filter((s) => area === "todos" || s.departamento === area)
    .map((s) => ({
      s,
      abiertas: convs.filter((c) => c.asignadoA === s.id && c.estado !== "resuelto").length,
      resueltas: convs.filter((c) => c.asignadoA === s.id && c.estado === "resuelto").length,
    }))
    .filter((f) => f.abiertas + f.resueltas > 0)
    .sort((a, b) => b.abiertas - a.abiertas);
  return (
    <article className="caja-tarjeta p-4">
      <h2 className="mb-3 text-[14px] font-bold text-[var(--text)]">Quién atiende</h2>
      {filas.length === 0 ? (
        <p className="py-4 text-center text-[12.5px] text-[var(--text-3)]">Sin conversaciones asignadas.</p>
      ) : (
        <ul className="space-y-2.5">
          {filas.map(({ s, abiertas, resueltas }) => (
            <li key={s.id} className="flex items-center gap-2.5">
              <Avatar iniciales={s.iniciales} size={30} color={depto(s.departamento)?.color} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-[var(--text)]">{s.nombre}</span>
                <span className="block truncate text-[11.5px] text-[var(--text-3)]">{depto(s.departamento)?.nombre}</span>
              </span>
              <span className="text-right text-[12px] leading-tight text-[var(--text-2)]">
                <span className="block font-bold text-[var(--text)]">
                  {abiertas} {abiertas === 1 ? "abierta" : "abiertas"}
                </span>
                {resueltas > 0 && <span className="block">{resueltas} {resueltas === 1 ? "resuelta" : "resueltas"}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
