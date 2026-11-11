"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, Bot, Info, MessagesSquare, RefreshCw, UserRound } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { fechaDe, pct } from "@/lib/nutricion/format";
import { useStore } from "@/lib/nutricion/store";
import { Card } from "./ui";

// Resumen del mes para el dashboard: consumo de IA contra el plan, métricas por
// canal, publicaciones y campañas, e intervenciones del equipo. Solo
// conteos: sin montos ni cálculos de retorno.

/** Límites del plan de MIA. */
export const PLAN = { conversaciones: 1000, mensajesPorConversacion: 15 };

// Colores por canal (validados juntos: CVD y contraste pasan).
const CANAL = [
  { id: "whatsapp", nombre: "WhatsApp", color: "#1ba34d" },
  { id: "instagram", nombre: "Instagram", color: "#c1275b" },
  { id: "facebook", nombre: "Facebook", color: "#1877F2" },
];

/**
 * Datos de demo del mes en curso. Todo sale del total de conversaciones del
 * consumo diario, para que las cifras cuadren entre gráficas.
 */
function datosDelMes(total: number) {
  const reparte = (n: number, partes: number[]) => {
    const r = partes.map((x) => Math.round(n * x));
    r[0] += n - r.reduce((a, b) => a + b, 0);
    return r;
  };
  const conv = reparte(total, [0.675, 0.204, 0.121]);
  const resueltas = conv.map((c, i) => Math.round(c * [0.853, 0.869, 0.84][i]));
  const pasadas = conv.map((c, i) => c - resueltas[i]);
  const citas = conv.map((c, i) => Math.round(c * [0.435, 0.369, 0.34][i]));
  const totalPasadas = pasadas.reduce((a, b) => a + b, 0);
  const motivos = reparte(totalPasadas, [0.4, 0.25, 0.23, 0.12]);
  const tramos = reparte(total, [0.233, 0.318, 0.359, 0.09]);
  return {
    porCanal: { Conversaciones: conv, "Resueltas por MIA": resueltas, "Citas y entregas resueltas": citas, "Pasadas al equipo": pasadas },
    motivos: ["Para la nutricionista", "Cotización y pago", "Pidió hablar con alguien", "Urgencia"].map((label, i) => ({ label, valor: motivos[i] })),
    // Mensajes de MIA por conversación: cuántas conversaciones caen en cada tramo.
    tramos: ["1–5", "6–10", "11–15", "Más de 15"].map((label, i) => ({ label, valor: tramos[i] })),
    mensajes: Math.round(total * 11.8),
  };
}

/** Conversaciones con MIA por día, del 1 del mes a hoy (determinista). */
function consumoDiario() {
  const hoy = fechaDe(0);
  const n = hoy.getDate();
  let s = 7;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), i + 1);
    const domingo = d.getDay() === 0;
    const base = domingo ? 12 : d.getDay() === 6 ? 22 : 30;
    // Hoy va a medias: el día no ha terminado.
    const valor = Math.round((base + r() * 10) * (i === n - 1 ? 0.55 : 1));
    return { label: String(i + 1), valor, detalle: d.toLocaleDateString("es-SV", { weekday: "long", day: "numeric", month: "long" }) };
  });
}

export function DashboardResumen() {
  const dias = consumoDiario();
  const usadas = dias.reduce((n, d) => n + d.valor, 0);
  const hoy = fechaDe(0);
  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const proyeccion = Math.round((usadas / dias.length) * diasMes);
  const { porCanal: POR_CANAL, motivos: MOTIVOS, tramos: TRAMOS, mensajes } = datosDelMes(usadas);
  const renovadas = TRAMOS[3].valor;
  const totalConv = usadas;
  const resueltas = POR_CANAL["Resueltas por MIA"].reduce((a, b) => a + b, 0);
  const pasadas = POR_CANAL["Pasadas al equipo"].reduce((a, b) => a + b, 0);
  const mes = hoy.toLocaleDateString("es-SV", { month: "long" });

  return (
    <div className="space-y-5">
      {/* Consumo de IA */}
      <Card
        title="Consumo de IA · MIA"
        sub={`Ciclo de ${mes}: del 1 al ${diasMes}. Plan: ${PLAN.conversaciones.toLocaleString("es-SV")} conversaciones al mes, hasta ${PLAN.mensajesPorConversacion} mensajes de MIA por conversación.`}
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Medidor usadas={usadas} limite={PLAN.conversaciones} proyeccion={proyeccion} />
            <div className="grid grid-cols-2 gap-3">
              <Dato Icon={MessagesSquare} valor={mensajes.toLocaleString("es-SV")} label="Mensajes de MIA" hint={`${(mensajes / totalConv).toFixed(1)} por conversación en promedio`} />
              <Dato Icon={RefreshCw} valor={renovadas} label="Pasaron de 15 mensajes" hint="Se renovaron: cuentan como conversación nueva" />
            </div>
            <p className="flex items-start gap-1.5 rounded-xl bg-surface p-3 text-[12px] leading-snug text-[var(--text-2)]">
              <Info size={14} className="mt-0.5 shrink-0 text-[var(--text-3)]" />
              Cuando una conversación llega a {PLAN.mensajesPorConversacion} mensajes de MIA, se abre una nueva que retoma desde donde se quedó: el cliente no nota el corte, pero suma una conversación más al consumo del mes.
            </p>
          </div>
          <div className="min-w-0 space-y-5">
            <div>
              <p className="text-[13px] font-bold">Conversaciones por día</p>
              <p className="text-[12px] text-[var(--text-3)]">Días del mes · hoy va en curso</p>
              <Columnas datos={dias} color="var(--brand-blue)" unidad="conversaciones" resaltarUltimo alto={150} />
            </div>
            <div>
              <p className="text-[13px] font-bold">Mensajes de MIA por conversación</p>
              <p className="text-[12px] text-[var(--text-3)]">Las de más de {PLAN.mensajesPorConversacion} se renovaron y contaron doble</p>
              <Columnas datos={TRAMOS} color="var(--brand-blue)" unidad="conversaciones" etiquetas alto={120} marcar={3} />
            </div>
          </div>
        </div>
      </Card>

      {/* Canales */}
      <Card title="Métricas por canal" sub={`Del 1 de ${mes} a hoy · ${totalConv} conversaciones`}>
        <Agrupadas grupos={Object.entries(POR_CANAL).map(([label, valores]) => ({ label, valores }))} series={CANAL} />
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Publicaciones />
        {/* Intervenciones */}
        <Card title="Intervenciones del equipo" sub="Conversaciones que MIA resolvió sola y las que pasó a una persona">
          <div className="grid grid-cols-2 gap-3">
            <Dato Icon={Bot} valor={`${pct(resueltas, totalConv)}%`} label="Resueltas por MIA" hint={`${resueltas} de ${totalConv} conversaciones`} />
            <Dato Icon={UserRound} valor={`${pct(pasadas, totalConv)}%`} label="Pasadas al equipo" hint={`${pasadas} conversaciones`} />
          </div>
          <Proporcion a={{ label: "MIA sola", valor: resueltas, color: "#7c3aed" }} b={{ label: "Equipo", valor: pasadas, color: "#d97706" }} />
          <p className="mt-5 text-[13px] font-bold">Por qué pasó al equipo</p>
          <Horizontales datos={MOTIVOS} color="#d97706" unidad="conversaciones" />
          <p className="mt-3 flex items-start gap-1.5 text-[11.5px] text-[var(--text-3)]">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" /> MIA nunca da dietas ni orientación de salud, ni da precios: esos casos siempre pasan al equipo.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Publicaciones ---------------- */

const CAMPANA_SERIES = [
  { nombre: "Leídos", color: "#2a78d6" },
  { nombre: "Respondieron", color: "#eb6834" },
  { nombre: "Citas", color: "#1baf7a" },
];

function Publicaciones() {
  const { posts, campanas } = useStore();
  const publicadas = posts.filter((p) => p.stats).sort((a, b) => (b.stats!.alcance ?? 0) - (a.stats!.alcance ?? 0));
  const enviadas = campanas.filter((k) => k.stats);
  return (
    <Card title="Publicaciones" sub="Alcance de los posts y resultado de las campañas por WhatsApp">
      <p className="text-[13px] font-bold">Alcance por post</p>
      <Horizontales
        datos={publicadas.map((p) => ({
          label: p.diseno?.titulo ?? p.texto.slice(0, 28),
          valor: p.stats!.alcance,
          detalle: `${p.stats!.meGusta} me gusta · ${p.stats!.mensajes} mensajes`,
        }))}
        color="var(--brand-blue)"
        unidad="personas"
      />
      <p className="mt-5 text-[13px] font-bold">Campañas</p>
      <Agrupadas
        grupos={enviadas.map((k) => ({ label: k.nombre, valores: [k.stats!.leidos, k.stats!.respondieron, k.stats!.citas] }))}
        series={CAMPANA_SERIES.map((s, i) => ({ id: String(i), ...s }))}
        alto={150}
      />
    </Card>
  );
}

/* ---------------- Piezas ---------------- */

export function Dato({ Icon, valor, label, hint }: { Icon: typeof Bot; valor: ReactNode; label: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <Icon size={16} className="text-brand" />
      <p className="mt-2 text-[22px] font-extrabold leading-none">{valor}</p>
      <p className="mt-1 text-[12.5px] font-medium text-[var(--text-2)]">{label}</p>
      {hint && <p className="mt-0.5 text-[11.5px] text-[var(--text-3)]">{hint}</p>}
    </div>
  );
}

/** Medidor del plan: usadas contra el límite y la proyección a fin de mes. */
function Medidor({ usadas, limite, proyeccion }: { usadas: number; limite: number; proyeccion: number }) {
  const p = Math.min(100, (usadas / limite) * 100);
  const pp = Math.min(100, (proyeccion / limite) * 100);
  const excede = proyeccion > limite;
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="text-[12.5px] font-medium text-[var(--text-2)]">Conversaciones con MIA este mes</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[34px] font-extrabold leading-none tracking-tight">{usadas.toLocaleString("es-SV")}</span>
        <span className="text-[14px] font-semibold text-[var(--text-3)]">/ {limite.toLocaleString("es-SV")}</span>
      </p>
      <div className="relative mt-3 h-3 rounded-full bg-surface-2" role="meter" aria-valuemin={0} aria-valuemax={limite} aria-valuenow={usadas} aria-label="Conversaciones usadas del plan">
        <div className="absolute inset-y-0 left-0 rounded-full bg-brand/25" style={{ width: `${pp}%` }} title={`Proyección: ${proyeccion}`} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${p}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11.5px] text-[var(--text-3)]">
        <span>{Math.round(p)}% usado</span>
        <span>Quedan {(limite - usadas).toLocaleString("es-SV")}</span>
      </div>
      <p className={cn("mt-3 flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-[12px] font-semibold", excede ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800")}>
        {excede ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> : <Info size={14} className="mt-0.5 shrink-0" />}
        {excede
          ? `Al ritmo actual el mes cierra en ~${proyeccion.toLocaleString("es-SV")}: pasaría el límite del plan.`
          : `Al ritmo actual el mes cierra en ~${proyeccion.toLocaleString("es-SV")} de ${limite.toLocaleString("es-SV")}.`}
      </p>
    </div>
  );
}

/** Ticks redondos para el eje: 0, paso, 2·paso… hasta cubrir el máximo. */
function ticks(max: number, n = 4) {
  const bruto = max / n;
  const mag = 10 ** Math.floor(Math.log10(bruto || 1));
  const paso = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((x) => x >= bruto) ?? bruto;
  const tope = Math.ceil(max / paso) * paso || paso;
  return { tope, valores: Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso) };
}

const compacto = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K` : String(v));

/** Tooltip flotante que sigue a la barra en hover o foco. */
function Tip({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--text)] px-2.5 py-1.5 text-[11.5px] font-medium text-white shadow-lg">
      {children}
    </span>
  );
}

/** Columnas de una sola serie (días, tramos). */
export function Columnas({
  datos,
  color,
  unidad,
  alto = 140,
  etiquetas,
  resaltarUltimo,
  marcar,
}: {
  datos: { label: string; valor: number; detalle?: string }[];
  color: string;
  unidad: string;
  alto?: number;
  etiquetas?: boolean;
  resaltarUltimo?: boolean;
  marcar?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const { tope, valores } = ticks(Math.max(...datos.map((d) => d.valor), 1));
  const max = datos.reduce((m, d, i) => (d.valor > datos[m].valor ? i : m), 0);
  return (
    <div className="mt-3">
      <div className="relative flex" style={{ height: alto }}>
        <div className="relative w-8 shrink-0 text-right text-[10.5px] text-[var(--text-3)]">
          {valores.map((v) => (
            <span key={v} className="absolute right-1.5 -translate-y-1/2" style={{ bottom: `${(v / tope) * 100}%`, transform: "translateY(50%)" }}>
              {compacto(v)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {valores.map((v) => (
            <div key={v} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${(v / tope) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {datos.map((d, i) => {
              const ultimo = resaltarUltimo && i === datos.length - 1;
              const label = etiquetas || i === max || ultimo;
              return (
                <div
                  key={d.label}
                  className="relative flex h-full flex-1 items-end justify-center outline-none"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${d.detalle ?? d.label}: ${d.valor} ${unidad}`}
                >
                  <div
                    className="relative w-full max-w-[24px] rounded-t-[4px] transition-opacity"
                    style={{
                      height: `${(d.valor / tope) * 100}%`,
                      backgroundColor: color,
                      opacity: hover !== null && hover !== i ? 0.45 : ultimo ? 0.55 : 1,
                      backgroundImage: marcar === i ? "repeating-linear-gradient(45deg,rgba(255,255,255,.35) 0 3px,transparent 3px 7px)" : undefined,
                    }}
                  >
                    {label && hover === null && (
                      <span className="absolute bottom-full left-1/2 mb-0.5 -translate-x-1/2 text-[10.5px] font-bold tabular-nums text-[var(--text-2)]">{d.valor}</span>
                    )}
                  </div>
                  {hover === i && (
                    <Tip>
                      <b>{d.valor}</b> {unidad} · {d.detalle ?? d.label}
                    </Tip>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="ml-8 flex gap-[2px] pt-1">
        {datos.map((d, i) => (
          <span key={d.label} className={cn("flex-1 truncate text-center text-[10.5px] text-[var(--text-3)]", datos.length > 16 && i % 2 === 1 && "invisible")}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Barras agrupadas: un grupo por categoría, una barra por serie. */
function Agrupadas({
  grupos,
  series,
  alto = 190,
}: {
  grupos: { label: string; valores: number[] }[];
  series: { id: string; nombre: string; color: string }[];
  alto?: number;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const { tope, valores } = ticks(Math.max(...grupos.flatMap((g) => g.valores), 1));
  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--text-2)]">
        {series.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} /> {s.nombre}
          </span>
        ))}
      </div>
      <div className="mt-3 flex" style={{ height: alto }}>
        <div className="relative w-8 shrink-0 text-right text-[10.5px] text-[var(--text-3)]">
          {valores.map((v) => (
            <span key={v} className="absolute right-1.5" style={{ bottom: `${(v / tope) * 100}%`, transform: "translateY(50%)" }}>
              {compacto(v)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {valores.map((v) => (
            <div key={v} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${(v / tope) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end justify-around gap-3">
            {grupos.map((g) => (
              <div key={g.label} className="flex h-full flex-1 items-end justify-center gap-[2px]">
                {g.valores.map((v, i) => {
                  const k = `${g.label}|${i}`;
                  return (
                    <div
                      key={k}
                      className="relative flex h-full w-full max-w-[24px] items-end outline-none"
                      onMouseEnter={() => setHover(k)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(k)}
                      onBlur={() => setHover(null)}
                      tabIndex={0}
                      aria-label={`${g.label} · ${series[i].nombre}: ${v}`}
                    >
                      <div
                        className="relative w-full rounded-t-[4px] transition-opacity"
                        style={{ height: `${(v / tope) * 100}%`, backgroundColor: series[i].color, opacity: hover && hover !== k ? 0.45 : 1 }}
                      >
                        <span className="absolute bottom-full left-1/2 mb-0.5 -translate-x-1/2 text-[10.5px] font-bold tabular-nums text-[var(--text-2)]">{v}</span>
                      </div>
                      {hover === k && (
                        <Tip>
                          {series[i].nombre} · {g.label}: <b>{v}</b>
                        </Tip>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-8 flex justify-around gap-3 pt-1.5">
        {grupos.map((g) => (
          <span key={g.label} className="flex-1 text-center text-[11.5px] font-medium leading-tight text-[var(--text-2)]">
            {g.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Barras horizontales de una sola serie, con el valor en la punta. */
export function Horizontales({ datos, color, unidad }: { datos: { label: string; valor: number; detalle?: string }[]; color: string; unidad: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <div className="mt-2 space-y-2.5">
      {datos.map((d, i) => (
        <div
          key={d.label}
          className="relative outline-none"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(null)}
          tabIndex={0}
          aria-label={`${d.label}: ${d.valor} ${unidad}`}
        >
          <p className="mb-1 truncate text-[12.5px] text-[var(--text-2)]">{d.label}</p>
          <div className="flex items-center gap-2">
            <div className="h-3.5 flex-1">
              <div className="h-full rounded-r-[4px] transition-opacity" style={{ width: `${Math.max(2, (d.valor / max) * 100)}%`, backgroundColor: color, opacity: hover !== null && hover !== i ? 0.45 : 1 }} />
            </div>
            <span className="w-12 shrink-0 text-right text-[12px] font-bold tabular-nums">{d.valor.toLocaleString("es-SV")}</span>
          </div>
          {hover === i && d.detalle && (
            <Tip>
              <b>{d.valor.toLocaleString("es-SV")}</b> {unidad} · {d.detalle}
            </Tip>
          )}
        </div>
      ))}
    </div>
  );
}

/** Barra 100% de dos partes con su leyenda. */
function Proporcion({ a, b }: { a: { label: string; valor: number; color: string }; b: { label: string; valor: number; color: string } }) {
  const total = a.valor + b.valor || 1;
  return (
    <div className="mt-4">
      <div className="flex h-3.5 gap-[2px] overflow-hidden rounded-[4px]">
        <div style={{ width: `${(a.valor / total) * 100}%`, backgroundColor: a.color }} title={`${a.label}: ${a.valor}`} />
        <div style={{ width: `${(b.valor / total) * 100}%`, backgroundColor: b.color }} title={`${b.label}: ${b.valor}`} />
      </div>
      <div className="mt-1.5 flex justify-between text-[12px] text-[var(--text-2)]">
        {[a, b].map((x) => (
          <span key={x.label} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: x.color }} /> {x.label} · {x.valor}
          </span>
        ))}
      </div>
    </div>
  );
}
