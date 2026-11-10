"use client";

// El dashboard del laboratorio: su WhatsApp (2247-1141) con Valeria, con cifras
// reales. Lee /api/laboratorio/panel y se refresca solo cada minuto. El cálculo
// vive en lib/lab-panel.ts; acá solo se dibuja.
//
// Gráficos hechos a mano (sin librería), con las reglas de siempre: una serie
// por gráfico en el azul de la marca, barras finas que nacen de la base, el
// valor más alto rotulado y el resto en el tooltip y en "Ver los números".

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PanelLab } from "@/lib/lab-panel";
import { PERIODOS, type PeriodoLab } from "@/lib/lab-panel-periodos";

const CADA_MS = 60_000;
const DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
// Rampa secuencial de un solo azul, de casi nada a mucho (mapa de calor).
const RAMPA = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95"];

const num = (n: number) => n.toLocaleString("es-SV");
/** "1 resuelto", "9 resueltos". */
const pl = (n: number, uno: string, varios: string) => `${num(n)} ${n === 1 ? uno : varios}`;

function segundos(s: number | null): string {
  if (s === null) return "sin datos";
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}

function minutos(min: number | null): string {
  if (min === null) return "sin datos";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ${Math.round(min % 60)} min`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}

function hora(h: number): string {
  if (h === 0) return "12 a.m.";
  if (h === 12) return "12 m.";
  return h < 12 ? `${h} a.m.` : `${h - 12} p.m.`;
}

function fecha(clave: string): string {
  return new Date(`${clave}T12:00:00-06:00`).toLocaleDateString("es-SV", {
    timeZone: "America/El_Salvador",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ── Tooltip compartido ───────────────────────────────────────────────────────

interface Tip {
  x: number;
  y: number;
  titulo: string;
  filas: Array<[string, string]>;
}

function useTip() {
  const caja = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const mostrar = useCallback((el: Element, titulo: string, filas: Array<[string, string]>) => {
    const c = caja.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!c) return;
    setTip({ x: r.left - c.left + r.width / 2, y: r.top - c.top, titulo, filas });
  }, []);
  const ocultar = useCallback(() => setTip(null), []);
  const vista = tip ? (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 min-w-[150px] -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-card px-3 py-2 text-[12px] shadow-lg"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <p className="mb-1 font-semibold text-[var(--text-2)]">{tip.titulo}</p>
      {tip.filas.map(([k, v]) => (
        <p key={k} className="flex justify-between gap-4">
          <span className="text-[var(--text-3)]">{k}</span>
          <span className="font-bold tabular-nums text-[var(--text)]">{v}</span>
        </p>
      ))}
    </div>
  ) : null;
  return { caja, mostrar, ocultar, vista };
}

// ── Piezas ───────────────────────────────────────────────────────────────────

function Seccion({ titulo, ayuda, children, className }: { titulo: string; ayuda?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-card p-5 shadow-sm", className)}>
      <h2 className="text-[14px] font-bold text-[var(--text)]">{titulo}</h2>
      {ayuda && <p className="mt-0.5 text-[12px] text-[var(--text-3)]">{ayuda}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Cifra({ label, valor, detalle, delta }: { label: string; valor: string; detalle?: string; delta?: number | null }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-medium text-[var(--text-3)]">{label}</p>
        {delta !== undefined && delta !== null && delta !== 0 && (
          <span
            title="Contra el período anterior del mismo largo"
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
              delta > 0 ? "bg-emerald-50 text-[#1f7a1f]" : "bg-rose-50 text-rose-700",
            )}
          >
            {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="mt-2 text-[26px] font-extrabold leading-none tracking-tight tabular-nums text-[var(--text)]">{valor}</p>
      {detalle && <p className="mt-1.5 text-[12px] leading-snug text-[var(--text-3)]">{detalle}</p>}
    </div>
  );
}

/** Barras horizontales de una sola serie: etiqueta, barra y valor al final. */
function Barras({
  filas,
  unidad,
  vacio,
}: {
  filas: Array<{ id: string; label: string; n: number; extra?: string }>;
  unidad: string;
  vacio: string;
}) {
  if (filas.length === 0) return <p className="text-[12.5px] text-[var(--text-3)]">{vacio}</p>;
  const max = Math.max(...filas.map((f) => f.n), 1);
  return (
    <ul className="space-y-2.5">
      {filas.map((f) => (
        <li key={f.id} className="text-[12.5px]" title={`${f.label}: ${num(f.n)} ${unidad}${f.extra ? ` · ${f.extra}` : ""}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-[var(--text-2)]">{f.label}</span>
            <span className="shrink-0 font-bold tabular-nums text-[var(--text)]">
              {num(f.n)}
              {f.extra && <span className="ml-1 font-normal text-[var(--text-3)]">{f.extra}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-2,#f1f5f9)]">
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(2, (f.n / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Columnas de una sola serie, con tooltip por columna. */
function Columnas({
  datos,
  alto = 170,
  etiquetaCada = 1,
}: {
  datos: Array<{ id: string; corto: string; titulo: string; n: number; filas: Array<[string, string]> }>;
  alto?: number;
  etiquetaCada?: number;
}) {
  const { caja, mostrar, ocultar, vista } = useTip();
  const max = Math.max(...datos.map((d) => d.n), 1);
  // Marcas del eje: 0, la mitad y un tope redondo (50, no 45), para que la
  // mitad también sea un número limpio.
  const paso = max <= 4 ? 2 : max <= 20 ? 10 : max <= 100 ? 20 : max <= 400 ? 100 : 200;
  const tope = Math.ceil(max / paso) * paso;
  const iMax = datos.findIndex((d) => d.n === max);
  return (
    <div ref={caja} className="relative">
      <div className="flex gap-2">
        <div className="flex w-7 shrink-0 flex-col justify-between text-right text-[10.5px] tabular-nums text-[var(--text-3)]" style={{ height: alto }}>
          <span>{num(tope)}</span>
          <span>{num(Math.round(tope / 2))}</span>
          <span>0</span>
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 border-t border-[var(--border,#e5e7eb)]" />
          <div className="absolute inset-x-0 border-t border-[var(--border,#e5e7eb)]" style={{ top: alto / 2 }} />
          <div className="relative flex items-end gap-[2px] border-b border-[var(--border-2,#cbd5e1)]" style={{ height: alto }}>
            {datos.map((d, i) => (
              <button
                key={d.id}
                type="button"
                aria-label={`${d.titulo}: ${d.filas.map(([k, v]) => `${k} ${v}`).join(", ")}`}
                onPointerEnter={(e) => mostrar(e.currentTarget, d.titulo, d.filas)}
                onPointerLeave={ocultar}
                onFocus={(e) => mostrar(e.currentTarget, d.titulo, d.filas)}
                onBlur={ocultar}
                className="group relative flex h-full flex-1 items-end justify-center outline-none"
              >
                {i === iMax && d.n > 0 && (
                  <span className="absolute text-[10.5px] font-bold tabular-nums text-[var(--text-2)]" style={{ bottom: `${(d.n / tope) * 100}%`, marginBottom: 3 }}>
                    {num(d.n)}
                  </span>
                )}
                <span
                  className="w-full max-w-[24px] rounded-t-[4px] bg-brand transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80"
                  style={{ height: d.n ? `${Math.max(1.5, (d.n / tope) * 100)}%` : 0 }}
                />
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex gap-[2px]">
            {datos.map((d, i) => (
              <span key={d.id} className="flex flex-1 justify-center overflow-visible whitespace-nowrap text-[10.5px] text-[var(--text-3)]">
                {i % etiquetaCada === 0 ? d.corto : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      {vista}
    </div>
  );
}

/** Mapa de calor día de la semana × hora, una rampa de azul. */
function Calor({ calor }: { calor: number[][] }) {
  const { caja, mostrar, ocultar, vista } = useTip();
  const max = Math.max(...calor.flat(), 0);
  const color = (v: number) => (v === 0 ? "var(--bg-2,#f1f5f9)" : RAMPA[Math.min(RAMPA.length - 1, Math.floor((v / max) * RAMPA.length - 1e-9))]);
  return (
    <div ref={caja} className="relative overflow-x-auto">
      <div className="min-w-[560px]">
        {calor.map((fila, d) => (
          <div key={DIAS[d]} className="flex items-center gap-[2px] py-[1px]">
            <span className="w-9 shrink-0 text-[11px] text-[var(--text-3)]">{DIAS[d]}</span>
            {fila.map((v, h) => (
              <button
                key={h}
                type="button"
                aria-label={`${DIAS[d]}, ${hora(h)}: ${v} mensajes`}
                onPointerEnter={(e) => mostrar(e.currentTarget, `${DIAS[d]}, de ${hora(h)} a ${hora((h + 1) % 24)}`, [["Mensajes", num(v)]])}
                onPointerLeave={ocultar}
                onFocus={(e) => mostrar(e.currentTarget, `${DIAS[d]}, de ${hora(h)} a ${hora((h + 1) % 24)}`, [["Mensajes", num(v)]])}
                onBlur={ocultar}
                className="h-6 flex-1 rounded-[3px] outline-none ring-[var(--text-2)] hover:ring-1 focus-visible:ring-2"
                style={{ background: color(v) }}
              />
            ))}
          </div>
        ))}
        <div className="flex gap-[2px] pl-[38px] pt-1">
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="flex-1 text-center text-[10px] text-[var(--text-3)]">
              {h % 3 === 0 ? hora(h).replace(" ", " ") : ""}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--text-3)]">
          <span>Menos</span>
          {["var(--bg-2,#f1f5f9)", ...RAMPA].map((c) => (
            <span key={c} className="h-3 w-5 rounded-[3px]" style={{ background: c }} />
          ))}
          <span>Más</span>
        </div>
      </div>
      {vista}
    </div>
  );
}

// ── La pantalla ──────────────────────────────────────────────────────────────

export function LabDashboard() {
  const router = useRouter();
  const [periodo, setPeriodo] = useState<PeriodoLab>("7d");
  const [panel, setPanel] = useState<PanelLab | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setCargando(true);
      try {
        const r = await fetch(`/api/laboratorio/panel?periodo=${periodo}`, { cache: "no-store" });
        const d = (await r.json()) as { ok: boolean; panel?: PanelLab; error?: string };
        if (d.ok && d.panel) {
          setPanel(d.panel);
          setError(null);
        } else setError(d.error ?? "No se pudieron leer las cifras.");
      } catch {
        setError("No se pudieron leer las cifras.");
      } finally {
        setCargando(false);
      }
    },
    [periodo],
  );

  useEffect(() => {
    void cargar();
    const t = setInterval(() => void cargar(true), CADA_MS);
    return () => clearInterval(t);
  }, [cargar]);

  const abrirChat = (from: string) => {
    sessionStorage.setItem("ccg.abrirConv", `wac-${from}`);
    router.push("/");
  };

  // Hoy se mira por hora; los demás períodos, por día.
  const serie = useMemo(() => {
    if (!panel) return [];
    if (panel.periodo === "hoy") {
      const porHora = Array.from({ length: 24 }, (_, h) => panel.calor.reduce((s, fila) => s + fila[h], 0));
      return porHora.map((n, h) => ({
        id: String(h),
        corto: h % 3 === 0 ? hora(h) : "",
        titulo: `De ${hora(h)} a ${hora((h + 1) % 24)}`,
        n,
        filas: [["Mensajes recibidos", num(n)]] as Array<[string, string]>,
      }));
    }
    return panel.porDia.map((d) => ({
      id: d.dia,
      corto: d.etiqueta.replace(/^\S+\s/, ""),
      titulo: fecha(d.dia),
      n: d.recibidos,
      filas: [
        ["Mensajes recibidos", num(d.recibidos)],
        ["Conversaciones", num(d.conversaciones)],
        ["Respuestas de Valeria", num(d.valeria)],
        ["Respuestas del equipo", num(d.equipo)],
      ] as Array<[string, string]>,
    }));
  }, [panel]);

  const r = panel?.resumen;
  const etiquetaPeriodo = PERIODOS.find((p) => p.id === periodo)?.label.toLowerCase();

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-card px-5 py-3">
        <div className="mr-auto">
          <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Dashboard</h1>
          <p className="text-[12.5px] text-[var(--text-3)]">El WhatsApp del laboratorio (2247-1141) con Valeria</p>
        </div>
        <div className="flex rounded-lg border border-line bg-[var(--bg-2,#f8fafc)] p-0.5" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodo(p.id)}
              aria-pressed={periodo === p.id}
              className={cn(
                "rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition",
                periodo === p.id ? "bg-card text-brand shadow-sm" : "text-[var(--text-3)] hover:text-[var(--text-2)]",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void cargar()}
          title="Actualizar"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] text-[var(--text-3)] hover:text-[var(--text-2)]"
        >
          <RefreshCw size={13} className={cn(cargando && "animate-spin")} />
          {panel ? new Date(panel.generadoEn).toLocaleTimeString("es-SV", { timeZone: "America/El_Salvador", hour: "numeric", minute: "2-digit" }) : ""}
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {error && !panel && (
          <p className="rounded-xl border border-line bg-card px-4 py-3 text-[13px] text-[var(--text-2)]">{error}</p>
        )}
        {!panel && !error && <p className="text-[13px] text-[var(--text-3)]">Cargando las cifras…</p>}

        {panel && r && (
          <>
            {panel.desde && (
              <p className="text-[12px] text-[var(--text-3)]">
                {panel.periodo === "hoy" ? "Hoy, " : `Del ${fecha(panel.desde)} a hoy, `}
                sin el número de pruebas de la agencia. Las flechas comparan con el período anterior del mismo largo.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Cifra
                label="Conversaciones"
                valor={num(r.conversaciones)}
                detalle={`${pl(r.nuevas, "escribió", "escribieron")} por primera vez`}
                delta={r.deltaConversacionesPct}
              />
              <Cifra
                label="Mensajes recibidos"
                valor={num(r.mensajesRecibidos)}
                detalle={r.fotos || r.archivos ? `${pl(r.fotos, "foto", "fotos")} y ${pl(r.archivos, "archivo", "archivos")}` : "Sin fotos ni archivos"}
              />
              <Cifra
                label="Respuestas de Valeria"
                valor={num(r.respuestasValeria)}
                detalle={`${num(r.respuestasEquipo)} del equipo, en ${pl(r.conversacionesConEquipo, "conversación", "conversaciones")}`}
              />
              <Cifra
                label="Atendidas solo por Valeria"
                valor={r.pctSoloValeria === null ? "—" : `${r.pctSoloValeria}%`}
                detalle={`${num(r.resueltasSoloValeria)} de ${num(r.conversaciones)}, sin caso ni respuesta del equipo`}
              />
              <Cifra
                label="Tiempo de respuesta de Valeria"
                valor={segundos(r.respuestaMedianaSeg)}
                detalle={r.respuestaP90Seg === null ? "La mitad de las veces, en menos" : `La mitad, en menos; 9 de cada 10, en menos de ${segundos(r.respuestaP90Seg)}`}
              />
              <Cifra
                label="Fuera de horario"
                valor={r.pctFueraDeHorario === null ? "—" : `${r.pctFueraDeHorario}%`}
                detalle={`${pl(r.fueraDeHorario, "mensaje", "mensajes")} de noche o en domingo (hábil: lunes a sábado, 6:00 a.m. a 6:00 p.m.)`}
              />
              <Cifra
                label="Casos para el equipo"
                valor={num(panel.casos.creados)}
                detalle={
                  panel.casos.resueltos
                    ? `${pl(panel.casos.resueltos, "resuelto", "resueltos")}; se resuelven en ${minutos(panel.casos.resolucionMedianaMin)} (mediana)`
                    : "Ninguno resuelto todavía"
                }
              />
              <Cifra
                label="Esperando respuesta"
                valor={num(panel.esperan.length)}
                detalle="Ahora mismo, el último mensaje es de la persona"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <Seccion
                className="xl:col-span-2"
                titulo={panel.periodo === "hoy" ? "Mensajes recibidos por hora" : "Mensajes recibidos por día"}
                ayuda={panel.periodo === "hoy" ? "Pase el cursor sobre una barra para ver la cifra." : "Pase el cursor sobre una barra para ver conversaciones y respuestas."}
              >
                <Columnas datos={serie} etiquetaCada={panel.periodo === "30d" || panel.porDia.length > 16 ? 3 : 1} />
                {panel.periodo !== "hoy" && (
                  <details className="mt-4 text-[12px]">
                    <summary className="cursor-pointer text-[var(--text-3)] hover:text-[var(--text-2)]">Ver los números</summary>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                            <th className="py-1.5 font-semibold">Día</th>
                            <th className="py-1.5 text-right font-semibold">Recibidos</th>
                            <th className="py-1.5 text-right font-semibold">Conversaciones</th>
                            <th className="py-1.5 text-right font-semibold">Valeria</th>
                            <th className="py-1.5 text-right font-semibold">Equipo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...panel.porDia].reverse().map((d) => (
                            <tr key={d.dia} className="border-b border-line last:border-0">
                              <td className="py-1.5">{d.etiqueta}</td>
                              <td className="py-1.5 text-right tabular-nums">{d.recibidos}</td>
                              <td className="py-1.5 text-right tabular-nums">{d.conversaciones}</td>
                              <td className="py-1.5 text-right tabular-nums">{d.valeria}</td>
                              <td className="py-1.5 text-right tabular-nums">{d.equipo}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </Seccion>

              {panel.periodo === "hoy" ? (
                <Seccion titulo="Horas con más mensajes" ayuda="Hoy">
                  <Barras
                    filas={[...serie]
                      .filter((h) => h.n > 0)
                      .sort((a, b) => b.n - a.n)
                      .slice(0, 5)
                      .map((h) => ({ id: h.id, label: h.titulo, n: h.n }))}
                    unidad="mensajes"
                    vacio="Hoy todavía no entró ningún mensaje."
                  />
                </Seccion>
              ) : (
                <Seccion titulo="Días con más mensajes" ayuda={periodo === "todo" ? "En todo lo registrado" : `En los últimos ${etiquetaPeriodo}`}>
                  <Barras
                    filas={panel.topDias.map((d) => ({
                      id: d.dia,
                      label: d.etiqueta,
                      n: d.recibidos,
                      extra: `${d.conversaciones} conv.`,
                    }))}
                    unidad="mensajes"
                    vacio="Todavía no entró ningún mensaje."
                  />
                </Seccion>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              {panel.periodo !== "hoy" && (
                <Seccion titulo="Por día de la semana" ayuda="Mensajes recibidos en el período.">
                  <Barras
                    filas={panel.porDiaSemana.map((d) => ({ id: d.dia, label: d.dia, n: d.recibidos }))}
                    unidad="mensajes"
                    vacio="Sin mensajes."
                  />
                </Seccion>
              )}
              <Seccion
                className={panel.periodo === "hoy" ? "xl:col-span-3" : "xl:col-span-2"}
                titulo="Cuándo escriben"
                ayuda="Mensajes recibidos por día y hora, en hora de El Salvador."
              >
                <Calor calor={panel.calor} />
              </Seccion>
            </div>

            <Seccion
              titulo="De qué preguntan"
              ayuda={
                panel.temas.desde
                  ? `Lo que Valeria buscó en la base del laboratorio para contestar: ${num(panel.temas.busquedas)} búsquedas en ${num(panel.temas.conversaciones)} conversaciones. Se cuenta desde el ${fecha(panel.temas.desde.slice(0, 10))}.`
                  : "Se cuenta con lo que Valeria busca en la base del laboratorio para contestar. Empieza a llenarse con las próximas conversaciones."
              }
            >
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div>
                  <h3 className="mb-3 text-[12.5px] font-semibold text-[var(--text-2)]">Temas (conversaciones)</h3>
                  <Barras
                    filas={panel.temas.categorias.map((c) => ({ id: c.id, label: c.label, n: c.conversaciones }))}
                    unidad="conversaciones"
                    vacio="Todavía sin búsquedas en este período."
                  />
                </div>
                <div>
                  <h3 className="mb-3 text-[12.5px] font-semibold text-[var(--text-2)]">Exámenes más consultados</h3>
                  <Barras
                    filas={panel.temas.examenes.map((c) => ({ id: c.id, label: c.label, n: c.conversaciones }))}
                    unidad="conversaciones"
                    vacio="Todavía sin exámenes consultados en este período."
                  />
                </div>
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-3 text-[12.5px] font-semibold text-[var(--text-2)]">Seguros que mencionan</h3>
                    <Barras
                      filas={panel.temas.seguros.map((c) => ({ id: c.id, label: c.label, n: c.conversaciones }))}
                      unidad="conversaciones"
                      vacio="Ninguno en este período."
                    />
                  </div>
                  <div>
                    <h3 className="mb-1 text-[12.5px] font-semibold text-[var(--text-2)]">Preguntaron y no está en la base</h3>
                    <p className="mb-2 text-[11.5px] text-[var(--text-3)]">Lo que conviene agregar para que Valeria lo conteste.</p>
                    {panel.temas.sinResultado.length === 0 ? (
                      <p className="text-[12.5px] text-[var(--text-3)]">Nada en este período.</p>
                    ) : (
                      <ul className="space-y-1 text-[12.5px]">
                        {panel.temas.sinResultado.map((s) => (
                          <li key={s.consulta} className="flex justify-between gap-3">
                            <span className="truncate text-[var(--text-2)]">{s.consulta}</span>
                            <span className="shrink-0 tabular-nums text-[var(--text-3)]">{s.veces}×</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </Seccion>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <Seccion titulo="Casos por tipo" ayuda="Los que Valeria pasó a una compañera en el período.">
                <Barras
                  filas={panel.casos.porTipo.map((t) => ({ id: t.id, label: t.label, n: t.n }))}
                  unidad="casos"
                  vacio="Ningún caso en este período."
                />
                {panel.casos.porEstado.length > 0 && (
                  <p className="mt-4 text-[12px] text-[var(--text-3)]">
                    Cómo están: {panel.casos.porEstado.map((e) => `${e.label.toLowerCase()} ${e.n}`).join(", ")}. Abiertos hoy en total: {num(panel.casos.abiertosHoy)}.
                  </p>
                )}
              </Seccion>

              <Seccion titulo="El equipo" ayuda="Casos asignados y respuestas escritas desde el panel.">
                {panel.casos.porPersona.length === 0 && panel.equipo.length === 0 ? (
                  <p className="text-[12.5px] text-[var(--text-3)]">Sin actividad del equipo en este período.</p>
                ) : (
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                        <th className="py-1.5 font-semibold">Quién</th>
                        <th className="py-1.5 text-right font-semibold">Casos</th>
                        <th className="py-1.5 text-right font-semibold">Resueltos</th>
                        <th className="py-1.5 text-right font-semibold">Respuestas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...new Set([...panel.casos.porPersona.map((p) => p.nombre), ...panel.equipo.map((e) => e.nombre)])].map((nombre) => {
                        const c = panel.casos.porPersona.find((p) => p.nombre === nombre);
                        const e = panel.equipo.find((x) => x.nombre === nombre);
                        return (
                          <tr key={nombre} className="border-b border-line last:border-0">
                            <td className="py-1.5">{nombre}</td>
                            <td className="py-1.5 text-right tabular-nums">{c?.asignados ?? 0}</td>
                            <td className="py-1.5 text-right tabular-nums">{c?.resueltos ?? 0}</td>
                            <td className="py-1.5 text-right tabular-nums">{e?.respuestas ?? 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <p className="mt-3 text-[11.5px] text-[var(--text-3)]">
                  Las respuestas escritas antes del 10 de noviembre salen como &quot;Equipo&quot;: hasta ese día no se guardaba quién escribió.
                </p>
              </Seccion>

              <Seccion titulo="Esperando respuesta" ayuda="El último mensaje es de la persona y nadie le contestó.">
                {panel.esperan.length === 0 ? (
                  <p className="text-[12.5px] text-[var(--text-3)]">Nadie está esperando.</p>
                ) : (
                  <ul className="space-y-2">
                    {panel.esperan.map((e) => (
                      <li key={e.from} className="flex items-start gap-3 rounded-lg bg-[var(--bg-2,#f8fafc)] px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-semibold text-[var(--text)]">{e.nombre}</p>
                          <p className="truncate text-[12px] text-[var(--text-3)]">{e.texto || "(sin texto)"}</p>
                          <p className="text-[11px] text-[var(--text-3)]">hace {minutos(e.minutos)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => abrirChat(e.from)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11.5px] font-semibold text-brand hover:bg-card"
                        >
                          <MessageCircle size={13} />
                          Chat
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Seccion>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
