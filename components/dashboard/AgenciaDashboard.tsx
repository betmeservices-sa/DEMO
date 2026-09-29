"use client";

// El tablero de la agencia: un cliente a la vez.
//
// Arriba, una pestaña por cliente (solo los de verdad: los demos no se
// reportan). Primero va el PLAN DE CONVERSACIONES del ciclo de facturación
// (components/dashboard/PlanDelCiclo), que NO sigue al filtro de periodo: el
// ciclo lo marca la facturación. Después el filtro y, debajo, todo lo que sí
// se corta con él: cuánto consumió el agente de IA, las estadías (la plata),
// quién cerró cada una, y los tickets y la gente del cliente. El registro de
// accesos se mudó a su propia página (app/auditoria).
//
// DOS VISTAS. "Cliente" es lo que se le puede enseñar al cliente: SIN un solo
// costo nuestro (ni dólares del agente, ni tokens, ni caché, ni el modelo que
// se usa). "Agencia" es lo de adentro. Se entra SIEMPRE en "Cliente" y se pasa
// a "Agencia" a mano (lo pidió el usuario el 2026-09-28): así nada nuestro
// queda a la vista por haber sido lo último que se miró.
//
// Los periodos (hoy, ayer, 7 días, 30 días, rango) se cortan en hora de El
// Salvador en el servidor; acá solo se pintan.

import { useCallback, useEffect, useState } from "react";
import {
  BedDouble,
  Bot,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Coins,
  Database,
  Handshake,
  Loader2,
  MessageSquareText,
  MessagesSquare,
  Mic,
  RefreshCw,
  Wallet,
  TicketCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { CalendarioRango } from "@/components/dashboard/CalendarioRango";
import { ConversacionCierre } from "@/components/dashboard/ConversacionCierre";
import { PERIODOS, type Canal, type Periodo, type ReporteConsumo } from "@/lib/agencia-consumo";
import { PERIODOS_AGENCIA, type ReservasDelPeriodo, type TicketsDelPeriodo } from "@/lib/agencia-resumen";
import { ROL, TZ, fechaCorta, fechaHora, miles } from "@/lib/formato-agencia";
import { PlanDelCiclo } from "@/components/dashboard/PlanDelCiclo";

interface Cierre {
  inicio: string | null;
  pasoAPersona: string | null;
  persona: string | null;
  /** "sin_datos": no hay chat, o sus mensajes no dicen quién los mandó. */
  cerro: "sofia" | "persona" | "sin_datos";
  mensajesAgente: number;
  mensajesPersona: number;
  minutosTotales: number | null;
  minutosHastaPersona: number | null;
}

interface ReservaCerrada {
  id: string;
  huesped: string;
  sede: string;
  habitacion: string;
  total: number;
  noches: number;
  confirmadaTs: string | null;
  confirmadaPor: string | null;
  comprobanteTs: string | null;
  /** Quién creó la reserva: "sofia" si la apartó ella. */
  origen?: string;
  /** La clave del chat de Meta. null = entró por otra vía y no hay chat que abrir. */
  conversacion: string | null;
  cierre: Cierre;
}

interface Cierres {
  resumen: {
    total: number;
    sofia: { n: number; total: number };
    persona: { n: number; total: number };
    sinDatos: { n: number; total: number };
    porPersona: { nombre: string; n: number; total: number }[];
    medianaMinutos: number | null;
  };
  cierres: ReservaCerrada[];
}

interface Usuario {
  usuario: string;
  nombre: string;
  rol: string;
  ultimoLogin: string | null;
  ultimoVisto: string | null;
  activo: boolean;
  logins: number;
}

interface Cliente {
  id: string;
  nombre: string;
  tickets: TicketsDelPeriodo;
  reservas: ReservasDelPeriodo;
  usuarios: Usuario[];
  activosAhora: number;
}

interface Resumen {
  clientes: Cliente[];
}

type Reporte = ReporteConsumo & { cliente: { id: string; nombre: string }; filasLeidas: number };

/** Qué se está mirando: lo de adentro o lo que ve el cliente. */
type Vista = "agencia" | "cliente";

const CANAL: Record<Canal, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  otro: "Otro",
};

const CLIENTE_INICIAL = "yaly";

// Los filtros del tablero, con sus etiquetas de siempre.
const FILTROS = PERIODOS_AGENCIA.map((clave) => PERIODOS.find((p) => p.clave === clave)!);

/** "45 min", "2 h 53", "1 d 3 h": el tiempo como lo diría una persona. */
function duracion(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ${String(min % 60).padStart(2, "0")}`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}

function dinero(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Para montos chicos (una respuesta cuesta centavos): más decimales. */
function dineroFino(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(5)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return dinero(n);
}

/** 1.234.567 tokens se leen mejor como "1.2M"; menos de 10k, tal cual. */
function tokensCortos(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  return miles(n);
}

function hace(iso: string | null): string {
  if (!iso) return "nunca";
  const ms = Date.now() - Date.parse(iso);
  const min = Math.round(ms / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}

/**
 * Cambio porcentual contra el periodo anterior. Sin base no hay comparación, y
 * arriba de 999% tampoco: arrancar de casi cero da "+17943%", que no dice nada
 * y se lee como un error. En esos casos no se pinta el globo y quedan los
 * números, que sí se entienden.
 */
function delta(actual: number, anterior: number): number | undefined {
  if (anterior <= 0) return undefined;
  const pct = Math.round(((actual - anterior) / anterior) * 100);
  return Math.abs(pct) > 999 ? undefined : pct;
}

/** "2026-09-02" del día de hoy en El Salvador, para el rango por defecto. */
function hoySV(corrimientoDias = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(Date.now() + corrimientoDias * 86_400_000),
  );
}

export function AgenciaDashboard() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cliente, setCliente] = useState(CLIENTE_INICIAL);
  // Como se cerro cada reserva. Va aparte del resumen porque lee el hilo de
  // cada una: meterlo ahi haria lento el panel entero.
  const [cierres, setCierres] = useState<Cierres | null>(null);
  const [verCierres, setVerCierres] = useState(false);
  const [chat, setChat] = useState<ReservaCerrada | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>("7d");
  const [desde, setDesde] = useState(() => hoySV(-6));
  const [hasta, setHasta] = useState(() => hoySV());
  const [calendario, setCalendario] = useState(false);
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrica, setMetrica] = useState<"respuestas" | "costo">("respuestas");
  // Se entra SIEMPRE en "cliente"; "agencia" se elige a mano y no se recuerda.
  const [vista, setVista] = useState<Vista>("cliente");

  // El mismo periodo para las tres consultas: si una se corta distinto, el
  // tablero vuelve a mostrar números de periodos diferentes lado a lado.
  const rangoInvalido = periodo === "rango" && (!desde || !hasta || hasta < desde);
  const filtro = periodo === "rango" ? `periodo=rango&desde=${desde}&hasta=${hasta}` : `periodo=${periodo}`;

  const cargarResumen = useCallback(async () => {
    if (rangoInvalido) return;
    try {
      const r = await fetch(`/api/agencia/resumen?${filtro}`, { cache: "no-store" });
      const d = (await r.json()) as Resumen & { ok: boolean; error?: string };
      if (d.ok) setResumen(d);
      else setError(d.error ?? "No se pudo leer.");
    } catch {
      setError("No se pudo leer.");
    }
  }, [filtro, rangoInvalido]);

  const cargarReporte = useCallback(async () => {
    if (rangoInvalido) return;
    setCargando(true);
    try {
      const r = await fetch(`/api/agencia/consumo?cliente=${encodeURIComponent(cliente)}&${filtro}`, { cache: "no-store" });
      const d = (await r.json()) as Reporte & { ok: boolean; error?: string };
      if (d.ok) {
        setReporte(d);
        setError(null);
      } else setError(d.error ?? "No se pudo leer.");
    } catch {
      setError("No se pudo leer.");
    } finally {
      setCargando(false);
    }
  }, [cliente, filtro, rangoInvalido]);

  useEffect(() => {
    void cargarResumen();
    const t = setInterval(() => void cargarResumen(), 60_000);
    return () => clearInterval(t);
  }, [cargarResumen]);

  useEffect(() => {
    void cargarReporte();
    const t = setInterval(() => void cargarReporte(), 60_000);
    return () => clearInterval(t);
  }, [cargarReporte]);

  useEffect(() => {
    if (rangoInvalido) return;
    let vivo = true;
    fetch(`/api/agencia/cierres?cliente=${encodeURIComponent(cliente)}&${filtro}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (vivo) setCierres(d.ok ? { resumen: d.resumen, cierres: d.cierres } : null);
      })
      .catch(() => {
        if (vivo) setCierres(null);
      });
    return () => {
      vivo = false;
    };
  }, [cliente, filtro, rangoInvalido]);

  const cerrarCalendario = useCallback(() => setCalendario(false), []);
  const cerrarChat = useCallback(() => setChat(null), []);

  const clientes = resumen?.clientes ?? [];
  const seleccionado = clientes.find((c) => c.id === cliente) ?? null;
  const paraCliente = vista === "cliente";

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-3">
          <div>
            <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Agencia</h1>
            <p className="text-[12.5px] text-[var(--text-3)]">
              {paraCliente ? "Lo que hizo el agente de IA" : "Plan, agente de IA, reservas y tickets, cliente por cliente"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg border border-line bg-surface p-0.5">
              {(["cliente", "agencia"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVista(v)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[12px] font-semibold capitalize transition",
                    vista === v ? "bg-brand text-white" : "text-[var(--text-2)] hover:bg-card",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                void cargarResumen();
                void cargarReporte();
              }}
              disabled={cargando}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-2)] transition hover:bg-surface disabled:opacity-60"
            >
              <RefreshCw size={13} className={cn(cargando && "animate-spin")} />
              Actualizar
            </button>
          </div>
        </div>

        <nav className="mt-2 flex gap-1 overflow-x-auto px-5" aria-label="Clientes">
          {(clientes.length ? clientes : [{ id: CLIENTE_INICIAL, nombre: "YALÍ" }]).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCliente(c.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-semibold transition",
                cliente === c.id ? "border-brand text-brand" : "border-transparent text-[var(--text-3)] hover:text-[var(--text)]",
              )}
            >
              {c.nombre}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {/* El plan va PRIMERO y fuera del filtro: lo marca el ciclo de
            facturación. La raya de abajo separa lo que el filtro sí mueve. */}
        <PlanDelCiclo cliente={cliente} />

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-5">
          <div className="relative flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
            {FILTROS.map((p) => (
              <button
                key={p.clave}
                type="button"
                onClick={() => {
                  setPeriodo(p.clave);
                  setCalendario(p.clave === "rango");
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition",
                  periodo === p.clave ? "bg-brand text-white shadow-sm" : "text-[var(--text-2)] hover:bg-card",
                )}
              >
                {p.clave === "rango" && <CalendarDays size={13} />}
                {p.etiqueta}
              </button>
            ))}
            {calendario && (
              <CalendarioRango
                desde={desde}
                hasta={hasta}
                max={hoySV()}
                onElegir={(a, b) => {
                  setDesde(a);
                  setHasta(b);
                }}
                onCerrar={cerrarCalendario}
              />
            )}
          </div>
          {reporte && (
            <span className="ml-auto text-[12px] text-[var(--text-3)]">
              {fechaCorta(reporte.periodo.desde)}
              {reporte.periodo.clave !== "hoy" && reporte.periodo.clave !== "ayer" && ` a ${fechaCorta(new Date(Date.parse(reporte.periodo.hasta) - 1).toISOString())}`}
              {" · comparado con "}
              {fechaCorta(reporte.periodo.anterior.desde)}
              {reporte.periodo.clave !== "hoy" && reporte.periodo.clave !== "ayer" && ` a ${fechaCorta(new Date(Date.parse(reporte.periodo.anterior.hasta) - 1).toISOString())}`}
            </span>
          )}
        </div>

        {error && <p className="rounded-xl border border-[var(--brand-red)]/40 bg-[var(--brand-red)]/10 px-3.5 py-2.5 text-[12.5px]">{error}</p>}
        {cargando && !reporte && (
          <p className="flex items-center gap-2 text-[13px] text-[var(--text-3)]">
            <Loader2 size={15} className="animate-spin text-brand" /> Leyendo el trabajo del agente
          </p>
        )}

        {/* Debajo del filtro, todo se corta con el mismo periodo: primero el
            trabajo del agente y, debajo, las reservas (así lo pidió el cliente). */}
        {reporte && reporte.cliente.id === cliente && (
          <Consumo r={reporte} metrica={metrica} setMetrica={setMetrica} paraCliente={paraCliente} />
        )}

        {seleccionado && <Reservas c={seleccionado} sofiaSola={cierres?.resumen.sofia.n} cierres={cierres?.cierres} />}
        {cierres && cierres.resumen.total > 0 && (
          <ComoSeCerraron d={cierres} abierto={verCierres} setAbierto={setVerCierres} onChat={setChat} />
        )}

        {seleccionado && <TicketsYGente c={seleccionado} />}

      </div>

      {chat?.conversacion && (
        <ConversacionCierre
          cliente={cliente}
          clave={chat.conversacion}
          hasta={chat.confirmadaTs}
          titulo={chat.huesped || "Sin nombre"}
          detalle={[chat.sede, chat.habitacion, dinero(chat.total)].filter(Boolean).join(" · ")}
          onCerrar={cerrarChat}
        />
      )}
    </div>
  );
}

/**
 * El trabajo del agente en el periodo.
 *
 * Con `paraCliente` no se pinta NINGÚN costo nuestro: ni el del agente, ni el
 * costo por respuesta, ni tokens, ni caché, ni el modelo, ni la columna de
 * costo por canal o por conversación. Eso es de adentro.
 */
function Consumo({
  r,
  metrica,
  setMetrica,
  paraCliente,
}: {
  r: Reporte;
  metrica: "respuestas" | "costo";
  setMetrica: (m: "respuestas" | "costo") => void;
  paraCliente: boolean;
}) {
  // La lista de conversaciones es larga y casi nunca se mira: cerrada hasta
  // que alguien la abra.
  const [verConversaciones, setVerConversaciones] = useState(false);
  const a = r.actual;
  const ant = r.anterior;
  const vacio = a.respuestas === 0 && a.transcripciones.cantidad === 0;
  // En la vista de cliente el gráfico es de respuestas y no hay de qué elegir.
  const serieDe = paraCliente ? "respuestas" : metrica;
  const maxSerie = Math.max(0.0001, ...r.serie.map((p) => (serieDe === "costo" ? p.costo : p.respuestas)));
  const cadaN = Math.max(1, Math.ceil(r.serie.length / (r.periodo.granularidad === "hora" ? 6 : 10)));

  return (
    <>
      {paraCliente ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <MetricCard label="Respuestas enviadas" valor={miles(a.respuestas)} delta={delta(a.respuestas, ant.respuestas)} Icon={Bot} />
          <MetricCard label="Chats atendidos" valor={miles(a.conversaciones)} delta={delta(a.conversaciones, ant.conversaciones)} Icon={MessageSquareText} />
          <MetricCard
            label="Respuestas por chat"
            valor={a.respuestasPorConversacion.toFixed(1)}
            delta={delta(a.respuestasPorConversacion, ant.respuestasPorConversacion)}
            Icon={MessagesSquare}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label={`Costo del agente · ${r.periodo.etiqueta.toLowerCase()}`} valor={dinero(a.costo)} delta={delta(a.costo, ant.costo)} Icon={CircleDollarSign} />
          <MetricCard label="Respuestas enviadas" valor={miles(a.respuestas)} delta={delta(a.respuestas, ant.respuestas)} Icon={Bot} />
          <MetricCard label="Chats atendidos" valor={miles(a.conversaciones)} delta={delta(a.conversaciones, ant.conversaciones)} Icon={MessageSquareText} />
          <MetricCard label="Costo por respuesta" valor={dineroFino(a.costoPorRespuesta)} delta={delta(a.costoPorRespuesta, ant.costoPorRespuesta)} Icon={Coins} />
        </div>
      )}

      {vacio ? (
        <section className="rounded-2xl border border-line bg-card p-5 text-[13px] text-[var(--text-3)]">
          El agente no respondió nada de {r.cliente.nombre} en este periodo.
        </section>
      ) : (
        <>
          {paraCliente ? (
            (a.imagenes > 0 || a.transcripciones.cantidad > 0) && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Tarjeta titulo="Fotos y notas de voz" Icon={Mic}>
                  {a.imagenes > 0 && (
                    <p className="text-[13px] text-[var(--text-2)]">
                      {a.imagenes} {a.imagenes === 1 ? "imagen leída" : "imágenes leídas"}
                    </p>
                  )}
                  {a.transcripciones.cantidad > 0 && (
                    <p className="text-[13px] text-[var(--text-2)]">
                      {a.transcripciones.cantidad} {a.transcripciones.cantidad === 1 ? "nota de voz escuchada" : "notas de voz escuchadas"}
                    </p>
                  )}
                </Tarjeta>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SaldoLuna />

              <Tarjeta titulo="Respuestas por chat" Icon={MessageSquareText}>
                <p className="text-[24px] font-extrabold tracking-tight text-[var(--text)]">{a.respuestasPorConversacion.toFixed(1)}</p>
                <p className="text-[12px] text-[var(--text-2)]">
                  antes {ant.respuestasPorConversacion.toFixed(1)}
                  {a.imagenes > 0 && ` · ${a.imagenes} ${a.imagenes === 1 ? "imagen leída" : "imágenes leídas"}`}
                </p>
                {a.transcripciones.cantidad > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-[12px] text-[var(--text-3)]">
                    <Mic size={12} /> {a.transcripciones.cantidad} {a.transcripciones.cantidad === 1 ? "nota de voz transcrita" : "notas de voz transcritas"} · {dineroFino(a.transcripciones.costo)}
                  </p>
                )}
              </Tarjeta>

              <Tarjeta titulo="Caché de prompt" Icon={Database}>
                <p className="flex items-center gap-2 text-[24px] font-extrabold tracking-tight text-[var(--text)]">
                  {r.cache.encendida === null ? "Sin datos" : r.cache.encendida ? "Encendida" : "Apagada"}
                  {r.cache.encendida !== null && (
                    <span className={cn("h-2.5 w-2.5 rounded-full", r.cache.encendida ? "bg-[#2f9e2f]" : "bg-[var(--brand-red)]")} />
                  )}
                </p>
                {r.cache.encendida !== null && (
                  <>
                    <p className="text-[12px] text-[var(--text-2)]">
                      {r.cache.pctEntradaDesdeCache}% de la entrada vino de caché · ahorró {dineroFino(r.cache.ahorro)}
                    </p>
                    <p className="text-[11.5px] text-[var(--text-3)]">
                      {r.cache.respuestasConCache} de {r.cache.respuestas} respuestas la usaron · últimas {r.cache.ultimas.total}: {r.cache.ultimas.conCache} con caché
                    </p>
                  </>
                )}
              </Tarjeta>
            </div>
          )}

          <section className="rounded-2xl border border-line bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] font-bold text-[var(--text)]">{r.periodo.granularidad === "hora" ? "Por hora" : "Por día"}</h2>
              {!paraCliente && (
                <div className="flex gap-1 rounded-lg border border-line bg-surface p-0.5">
                  {(["respuestas", "costo"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMetrica(m)}
                      className={cn("rounded-md px-2.5 py-1 text-[12px] font-semibold transition", metrica === m ? "bg-brand text-white" : "text-[var(--text-2)] hover:bg-card")}
                    >
                      {m === "respuestas" ? "Respuestas" : "Costo"}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 flex h-36 items-end gap-[3px]">
              {r.serie.map((p) => {
                const v = serieDe === "costo" ? p.costo : p.respuestas;
                const detalle = paraCliente
                  ? `${p.etiqueta}: ${p.respuestas} respuestas · ${p.conversaciones} conversaciones`
                  : `${p.etiqueta}: ${p.respuestas} respuestas · ${p.conversaciones} conversaciones · ${dineroFino(p.costo)} · ${tokensCortos(p.tokens)} tokens`;
                return (
                  <div
                    key={p.clave}
                    title={detalle}
                    className={cn("min-w-[3px] flex-1 rounded-t transition-all", v > 0 ? "bg-brand/75 hover:bg-brand" : "bg-line/60")}
                    style={{ height: `${v > 0 ? Math.max(4, (v / maxSerie) * 100) : 2}%` }}
                  />
                );
              })}
            </div>
            <div className="mt-1 flex gap-[3px] text-[10.5px] text-[var(--text-3)]">
              {r.serie.map((p, i) => (
                <span key={p.clave} className="min-w-[3px] flex-1 truncate text-center">
                  {i % cadaN === 0 ? p.etiqueta : ""}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-card p-5">
            <h2 className="text-[15px] font-bold text-[var(--text)]">Por canal</h2>
            <table className="mt-3 w-full text-[12.5px]">
              <thead className="text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                <tr className="text-left">
                  <th className="py-1.5 pr-3 font-semibold">Canal</th>
                  <th className="py-1.5 pr-3 text-right font-semibold">Chats</th>
                  <th className="py-1.5 pr-3 text-right font-semibold">Resp.</th>
                  {!paraCliente && <th className="py-1.5 text-right font-semibold">Costo</th>}
                </tr>
              </thead>
              <tbody>
                {r.canales.map((c) => (
                  <tr key={c.canal} className="border-t border-line">
                    <td className="py-2 pr-3 font-semibold text-[var(--text)]">{CANAL[c.canal]}</td>
                    <td className="py-2 pr-3 text-right text-[var(--text-2)]">{miles(c.conversaciones)}</td>
                    <td className="py-2 pr-3 text-right text-[var(--text-2)]">{miles(c.respuestas)}</td>
                    {!paraCliente && <td className="py-2 text-right text-[var(--text-2)]">{dineroFino(c.costo)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-2xl border border-line bg-card">
            <Desplegable abierto={verConversaciones} setAbierto={setVerConversaciones}>
              <h2 className="text-[15px] font-bold text-[var(--text)]">Chats · {r.conversaciones.length}</h2>
            </Desplegable>
            {verConversaciones && (
              <div className="max-h-80 overflow-auto px-5 pb-5">
                <table className="w-full text-[12.5px]">
                  <thead className="sticky top-0 bg-card text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                    <tr className="text-left">
                      <th className="py-1.5 pr-3 font-semibold">Contacto</th>
                      <th className="py-1.5 pr-3 font-semibold">Canal</th>
                      <th className="py-1.5 pr-3 text-right font-semibold">Resp.</th>
                      {!paraCliente && <th className="py-1.5 pr-3 text-right font-semibold">Tokens</th>}
                      {!paraCliente && <th className="py-1.5 pr-3 text-right font-semibold">Costo</th>}
                      <th className="py-1.5 font-semibold">Última</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.conversaciones.map((c) => (
                      <tr key={`${c.canal}-${c.id}`} className="border-t border-line">
                        <td className="whitespace-nowrap py-2 pr-3 font-semibold text-[var(--text)]">{c.id}</td>
                        <td className="py-2 pr-3 text-[var(--text-2)]">{CANAL[c.canal]}</td>
                        <td className="py-2 pr-3 text-right text-[var(--text-2)]">{c.respuestas}</td>
                        {!paraCliente && <td className="py-2 pr-3 text-right text-[var(--text-2)]">{tokensCortos(c.tokens)}</td>}
                        {!paraCliente && <td className="py-2 pr-3 text-right text-[var(--text-2)]">{dineroFino(c.costo)}</td>}
                        <td className="whitespace-nowrap py-2 text-[var(--text-3)]">{fechaHora(c.ultimo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

/**
 * Lo que el agente APARTÓ, en dinero. Es el resultado de todo lo demás: había
 * respuestas, costo y tickets, pero no cuántas estadías se cerraron ni cuánta
 * plata está esperando comprobante.
 *
 * Esta plata es del cliente, no nuestra, así que también se le enseña a él.
 */
/**
 * Las reservas del periodo, por cómo terminaron (ver lib/agencia-resumen).
 *
 * Antes decía "Estadías apartadas por el agente" y no era cierto: la tabla
 * tiene también las que la detección encontró en chats del equipo y las que
 * alguien tomó a mano. Y "rechazadas" mezclaba huéspedes que no pagaron con
 * estadías que sí se hicieron por otro camino. Ahora cada número dice qué es.
 */
/** La plata de las confirmadas repartida con los mismos chats que "Quién cerró". */
function repartoDeLaPlata(cierres: ReservaCerrada[]) {
  const suma = (rs: ReservaCerrada[]) => ({ n: rs.length, total: Math.round(rs.reduce((s, r) => s + (r.total ?? 0), 0)) });
  const sola = cierres.filter((c) => c.cierre.cerro === "sofia");
  const conEquipo = cierres.filter((c) => c.cierre.cerro !== "sofia" && c.origen === "sofia");
  const equipo = cierres.filter((c) => c.cierre.cerro !== "sofia" && c.origen !== "sofia");
  return { sola: suma(sola), conEquipo: suma(conEquipo), equipo: suma(equipo) };
}

function Reservas({
  c,
  sofiaSola,
  cierres,
}: {
  c: Cliente;
  sofiaSola?: number;
  cierres?: ReservaCerrada[];
}) {
  const r = c.reservas;
  const o = r.confirmadas.porOrigen;
  // "Las apartó" es que Sofía usó su herramienta y mandó la cuenta; cuántas
  // cerró SOLA (sin que el equipo escribiera antes del pago) sale de "Quién
  // cerró", que lee los chats. Se pone al lado para que los dos bloques digan
  // lo mismo.
  const origen = [
    o.sofia > 0
      ? `${o.sofia} ${o.sofia === 1 ? "la apartó" : "las apartó"} Sofía${sofiaSola !== undefined ? ` (${sofiaSola} las cerró sola)` : ""}`
      : null,
    o.detectada > 0 ? `${o.detectada} sin apartado de Sofía: las cobró el equipo` : null,
    o.manual > 0 ? `${o.manual} tomada${o.manual === 1 ? "" : "s"} a mano` : null,
    o.otro > 0 ? `${o.otro} sin origen` : null,
  ].filter(Boolean);
  const aparte = [
    r.otraVia > 0 ? `${r.otraVia} se hicieron por otra vía (pagó en hotel, se ingresó a mano)` : null,
    r.rechazadas > 0
      ? `${r.rechazadas} rechazadas por el equipo por otros motivos, como cambio de fecha o cancelación${r.sinMotivo > 0 ? ` (${r.sinMotivo} sin motivo escrito)` : ""}`
      : null,
    r.reemplazadas > 0 ? `${r.reemplazadas} cambiadas por un apartado nuevo de Sofía en el mismo chat, que no cuentan` : null,
  ].filter(Boolean);

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
        <BedDouble size={12} /> Reservas
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <p className="text-[24px] font-extrabold leading-none tracking-tight text-[#2f9e2f]">{dinero(r.confirmadas.total)}</p>
          <p className="mt-1 text-[12px] font-semibold text-[var(--text-2)]">
            {r.confirmadas.n} pagada{r.confirmadas.n === 1 ? "" : "s"} y confirmada{r.confirmadas.n === 1 ? "" : "s"}
          </p>
          {cierres && cierres.length > 0 ? (
            (() => {
              const p = repartoDeLaPlata(cierres);
              return (
                <ul className="mt-1 space-y-0.5 text-[11.5px] text-[var(--text-3)]">
                  <li>
                    <span className="font-semibold text-[#2f9e2f]">{dinero(p.sola.total)}</span> las cerró Sofía sola ({p.sola.n})
                  </li>
                  <li>
                    <span className="font-semibold text-[var(--text-2)]">{dinero(p.conEquipo.total)}</span> las apartó Sofía y el
                    equipo escribió antes del pago ({p.conEquipo.n})
                  </li>
                  <li>
                    <span className="font-semibold text-[var(--text-2)]">{dinero(p.equipo.total)}</span> las cobró el equipo ({p.equipo.n})
                  </li>
                </ul>
              );
            })()
          ) : (
            origen.length > 0 && <p className="text-[11.5px] text-[var(--text-3)]">{origen.join(" · ")}</p>
          )}
        </div>
        <div>
          <p className="text-[24px] font-extrabold leading-none tracking-tight text-[var(--brand-accent)]">{dinero(r.abiertas.total)}</p>
          <p className="mt-1 text-[12px] font-semibold text-[var(--text-2)]">
            {r.abiertas.n} abierta{r.abiertas.n === 1 ? "" : "s"}
          </p>
          <p className="text-[11.5px] text-[var(--text-3)]">
            {r.abiertas.enSuHora} esperando pago, dentro de su apartado de 1 hora · {r.abiertas.porVerificar} ya
            pagó y falta verificar el comprobante
          </p>
        </div>
        <div>
          <p className="text-[24px] font-extrabold leading-none tracking-tight text-[var(--text-3)]">{dinero(r.vencidas.total)}</p>
          <p className="mt-1 text-[12px] font-semibold text-[var(--text-2)]">
            {r.vencidas.n} vencida{r.vencidas.n === 1 ? "" : "s"}: no pagaron a tiempo
          </p>
          <p className="text-[11.5px] text-[var(--text-3)]">
            {r.vencidas.sinCerrar} se les venció el apartado de 1 hora y nadie las cerró · {r.vencidas.cerradas} cerradas por
            el equipo (no pagó, no contestó)
          </p>
        </div>
      </div>
      {aparte.length > 0 && <p className="mt-3 text-[11.5px] text-[var(--text-3)]">Aparte: {aparte.join(" · ")}.</p>}
    </section>
  );
}

/**
 * Quién cerró cada reserva, con la hora de cada paso.
 *
 * POR QUÉ ESTO Y NO "Sofía contestó el 85% de los chats". Ese número se ve
 * bien y no dice nada: si al final siempre tiene que entrar una persona a
 * cerrar, el agente está atendiendo, no vendiendo. Acá se ve la plata partida
 * entre los dos, y cuánto tarda cada trato en cerrarse.
 *
 * Cerrado por defecto: se abre cuando alguien lo quiere mirar. Cada fila con
 * chat abre la conversación en una ventana.
 */
function ComoSeCerraron({
  d,
  abierto,
  setAbierto,
  onChat,
}: {
  d: Cierres;
  abierto: boolean;
  setAbierto: (v: boolean) => void;
  onChat: (c: ReservaCerrada) => void;
}) {
  const { resumen, cierres } = d;
  const sinHilo = cierres.filter((c) => !c.cierre.inicio).length;

  return (
    <section className="rounded-2xl border border-line bg-card">
      <Desplegable abierto={abierto} setAbierto={setAbierto}>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
          <Handshake size={12} /> Quién cerró · {resumen.total} confirmada{resumen.total === 1 ? "" : "s"}
        </p>
      </Desplegable>

      {abierto && (
        <div className="px-5 pb-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-[24px] font-extrabold leading-none tracking-tight text-brand">
                {dinero(resumen.sofia.total)}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[12px] text-[var(--text-2)]">
                <Bot size={12} className="text-brand" />
                {resumen.sofia.n} las cerró Sofía sola: mandó la cuenta y el huésped pagó; el equipo solo confirmó
              </p>
            </div>
            <div>
              <p className="text-[24px] font-extrabold leading-none tracking-tight text-[var(--text)]">
                {dinero(resumen.persona.total)}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[12px] text-[var(--text-2)]">
                <Users size={12} />
                {resumen.persona.n} con el equipo: alguien del equipo escribió antes del pago
              </p>
            </div>
            <div>
              <p className="text-[24px] font-extrabold leading-none tracking-tight text-[var(--text)]">
                {resumen.medianaMinutos === null ? "·" : duracion(resumen.medianaMinutos)}
              </p>
              <p className="mt-1 text-[12px] text-[var(--text-2)]">tarda un trato, mediana</p>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[var(--text-2)]">Quién del equipo</p>
              {resumen.porPersona.length === 0 ? (
                <p className="text-[12px] text-[var(--text-3)]">nadie tuvo que entrar</p>
              ) : (
                <ul className="mt-0.5 space-y-0.5">
                  {resumen.porPersona.map((p) => (
                    <li key={p.nombre} className="text-[12px] text-[var(--text-2)]">
                      <span className="font-semibold text-[var(--text)]">{p.nombre}</span> · {p.n} ·{" "}
                      {dinero(p.total)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {resumen.sinDatos.n > 0 && (
            <p className="mt-3 text-[12px] text-[var(--text-3)]">
              {resumen.sinDatos.n} ({dinero(resumen.sinDatos.total)}) no se le pueden atribuir a nadie: nadie del equipo escribió, pero
              Sofía tampoco cobró (reservas que el huésped ya tenía, o sin chat).
            </p>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                <tr className="text-left">
                  <th className="py-1.5 pr-3 font-semibold">Huésped</th>
                  <th className="py-1.5 pr-3 font-semibold">Monto</th>
                  <th className="py-1.5 pr-3 font-semibold">Empezó</th>
                  <th className="py-1.5 pr-3 font-semibold">Pasó a una persona</th>
                  <th className="py-1.5 pr-3 font-semibold">Se cerró</th>
                  <th className="py-1.5 pr-3 font-semibold">Tardó</th>
                  <th className="py-1.5 font-semibold">Mensajes</th>
                </tr>
              </thead>
              <tbody>
                {cierres.map((c) => (
                  <tr
                    key={c.id}
                    onClick={c.conversacion ? () => onChat(c) : undefined}
                    className={cn("border-t border-line/60 align-top", c.conversacion && "cursor-pointer transition hover:bg-surface")}
                  >
                    <td className="py-2 pr-3">
                      <span className="font-semibold text-[var(--text)]">{c.huesped || "Sin nombre"}</span>
                      <span className="block text-[11.5px] text-[var(--text-3)]">
                        {c.sede}
                        {c.habitacion ? ` · ${c.habitacion}` : ""}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-bold tabular-nums text-[var(--text)]">{dinero(c.total)}</td>
                    <td className="py-2 pr-3 tabular-nums text-[var(--text-2)]">
                      {c.cierre.inicio ? fechaHora(c.cierre.inicio) : "sin chat"}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-[var(--text-2)]">
                      {c.cierre.pasoAPersona ? (
                        <>
                          {fechaHora(c.cierre.pasoAPersona)}
                          <span className="block text-[11.5px] text-[var(--text-3)]">
                            {c.cierre.persona ?? "el equipo"}
                            {c.cierre.minutosHastaPersona !== null &&
                              ` · a los ${duracion(c.cierre.minutosHastaPersona)}`}
                          </span>
                        </>
                      ) : c.cierre.cerro === "sin_datos" ? (
                        <span className="text-[var(--text-3)]">sin datos</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-brand">
                          <Bot size={12} /> nunca
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-[var(--text-2)]">
                      {c.confirmadaTs ? fechaHora(c.confirmadaTs) : "·"}
                      {c.confirmadaPor && (
                        <span className="block text-[11.5px] text-[var(--text-3)]">{c.confirmadaPor}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-[var(--text-2)]">
                      {c.cierre.minutosTotales === null ? "·" : duracion(c.cierre.minutosTotales)}
                    </td>
                    <td className="py-2 tabular-nums text-[var(--text-3)]">
                      {c.conversacion ? (
                        <button type="button" className="inline-flex items-center gap-1.5 rounded-md hover:text-[var(--text)]">
                          <span>
                            <span className="text-brand">{c.cierre.mensajesAgente}</span> / {c.cierre.mensajesPersona}
                          </span>
                          <MessageSquareText size={12} />
                        </button>
                      ) : (
                        <>
                          <span className="text-brand">{c.cierre.mensajesAgente}</span> / {c.cierre.mensajesPersona}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-[11.5px] text-[var(--text-3)]">
            Mensajes: <span className="text-brand">del agente</span> / de una persona. Clic en una fila para leer el
            chat. &quot;Empezó&quot; es el arranque de la última tanda de la conversación, no el primer mensaje de
            siempre: quien escribió hace meses y volvió ayer cerró en un día, no en cinco meses.
            {sinHilo > 0 && ` ${sinHilo} sin chat que mirar (entró por otra vía).`}
          </p>
        </div>
      )}
    </section>
  );
}

function TicketsYGente({ c }: { c: Cliente }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
            <TicketCheck size={12} /> Tickets
          </p>
          <p className="text-[24px] font-extrabold tracking-tight text-[var(--text)]">
            {c.tickets.abiertos} <span className="text-[13px] font-semibold text-[var(--text-3)]">abiertos</span>
          </p>
          <p className="text-[12px] text-[var(--text-2)]">
            {c.tickets.periodo} nuevos · {c.tickets.resueltos} resueltos · {c.tickets.porSofia} abiertos por la IA
          </p>
          {c.tickets.medianaMinutos !== null && (
            <p className="text-[12px] text-[var(--text-3)]">
              {duracion(c.tickets.medianaMinutos)} en resolverse
            </p>
          )}
          {c.tickets.porTipo.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[11.5px] text-[var(--text-3)]">
              {c.tickets.porTipo.slice(0, 4).map((t) => (
                <li key={t.tipo}>
                  {t.tipo.replace(/_/g, " ")} · {t.n}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
            <Users size={12} /> Personas con acceso
            {c.activosAhora > 0 && <Pastilla verde>{c.activosAhora} ahora</Pastilla>}
          </p>
          {c.usuarios.length === 0 ? (
            <p className="text-[12.5px] text-[var(--text-3)]">Sin cuentas propias (entra con la clave del cliente).</p>
          ) : (
            <ul className="space-y-1.5">
              {c.usuarios.map((u) => (
                <li key={u.usuario} className="flex items-center gap-2 text-[12.5px]">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", u.activo ? "bg-[#2f9e2f]" : u.ultimoLogin ? "bg-[var(--brand-accent)]" : "bg-line")} />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-[var(--text)]">{u.nombre}</span>
                    <span className="text-[var(--text-3)]"> · {ROL[u.rol] ?? u.rol}</span>
                    <span className="block truncate text-[11px] text-[var(--text-3)]">
                      {u.activo ? "activo ahora" : u.ultimoVisto ? `visto ${hace(u.ultimoVisto)}` : "nunca ha entrado"}
                      {u.ultimoLogin ? ` · último login ${hace(u.ultimoLogin)} · ${u.logins} ${u.logins === 1 ? "acceso" : "accesos"}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/** La cabecera de un bloque que se abre y se cierra con un clic. */
function Desplegable({
  abierto,
  setAbierto,
  children,
}: {
  abierto: boolean;
  setAbierto: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => setAbierto(!abierto)}
      aria-expanded={abierto}
      className="flex w-full items-center justify-between gap-2 rounded-2xl px-5 py-4 text-left transition hover:bg-surface/60"
    >
      {children}
      <ChevronDown size={16} className={cn("shrink-0 text-[var(--text-3)] transition", abierto && "rotate-180")} />
    </button>
  );
}

interface SaldoOpenai {
  gastoMes: number;
  gastoDesdeCarga: number | null;
  cargado: number | null;
  cargadoDesde: string | null;
  saldo: number | null;
  promedioDiario: number;
}

/**
 * El saldo de la cuenta de OpenAI con la que corre luna. Solo en la vista
 * Agencia: es plata nuestra. OpenAI no da el saldo por API, así que es lo
 * cargado menos lo gastado desde esa carga (ver lib/saldo-openai.ts).
 */
function SaldoLuna() {
  const [s, setS] = useState<SaldoOpenai | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    const leer = () =>
      fetch("/api/agencia/saldo-ia", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!vivo) return;
          if (d.ok) {
            setS(d.saldo);
            setError(d.saldo ? null : "Falta la llave de admin de OpenAI.");
          } else setError(d.error ?? "No se pudo leer.");
        })
        .catch(() => vivo && setError("No se pudo leer."));
    void leer();
    const t = setInterval(leer, 10 * 60_000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  const alcanza = s && s.saldo !== null && s.promedioDiario > 0 ? Math.floor(s.saldo / s.promedioDiario) : null;
  return (
    <Tarjeta titulo="Saldo de luna (OpenAI)" Icon={Wallet}>
      {!s ? (
        <p className="text-[12.5px] text-[var(--text-3)]">{error ?? "Leyendo..."}</p>
      ) : s.saldo !== null ? (
        <>
          <p className={cn("text-[24px] font-extrabold tracking-tight", s.saldo < 5 ? "text-[var(--brand-red)]" : "text-[var(--text)]")}>
            {dineroFino(s.saldo)}
          </p>
          <p className="text-[12px] text-[var(--text-2)]">
            de {dinero(s.cargado!)} cargados el {s.cargadoDesde} · gastado {dineroFino(s.gastoDesdeCarga!)}
          </p>
          <p className="text-[11.5px] text-[var(--text-3)]">
            este mes {dineroFino(s.gastoMes)} · {dineroFino(s.promedioDiario)} por día
            {alcanza !== null && ` · alcanza para ~${alcanza} días`}
          </p>
        </>
      ) : (
        <>
          <p className="text-[24px] font-extrabold tracking-tight text-[var(--text)]">{dineroFino(s.gastoMes)}</p>
          <p className="text-[12px] text-[var(--text-2)]">gastado este mes · {dineroFino(s.promedioDiario)} por día</p>
          <p className="text-[11.5px] text-[var(--text-3)]">Para ver el saldo falta cargar el monto y la fecha de la última recarga.</p>
        </>
      )}
    </Tarjeta>
  );
}

function Tarjeta({ titulo, Icon, children }: { titulo: string; Icon: typeof Coins; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
        <Icon size={12} /> {titulo}
      </p>
      {children}
    </section>
  );
}

function Pastilla({ children, verde }: { children: React.ReactNode; verde?: boolean }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal", verde ? "bg-emerald-50 text-[#2f9e2f]" : "bg-surface text-[var(--text-3)]")}>
      {children}
    </span>
  );
}
