"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarRange, Check, CheckCircle2, ChefHat, ChevronRight, Clock, CookingPot, Minus, PencilLine, Plus, Printer, RotateCcw, ShoppingBasket, Truck } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { ALERGENOS, COCINA_PLAN, enCocina, hechosDe, PARTES, partesDe, plato, RECETARIO } from "@/lib/nutricion/cocina";
import { descargarEtiquetas, type Entrega } from "@/lib/nutricion/etiquetasPdf";
import { etiquetaDia, PLAN_INFO } from "@/lib/nutricion/format";
import { cliente } from "@/lib/nutricion/seed";
import { useStore } from "@/lib/nutricion/store";
import type { PlanAlimentacion, Plato } from "@/lib/nutricion/types";
import { Card, PageHeader } from "@/components/nutricion/ui";

// Producción del día con todo el menú: cada desayuno, almuerzo y cena con las
// porciones a producir (de las órdenes del día) y el contador de preparados,
// que sube cuando el chef marca platos hechos o cuando una entrega queda lista
// o se entrega. Los ingredientes se calculan con lo que falta y con el total.

const TIPOS: Plato["tiempo"][] = ["Desayuno", "Almuerzo", "Cena"];
const FACTOR: Record<PlanAlimentacion["porcion"], number> = { Pequeña: 0.8, Regular: 1, Grande: 1.3 };

// Unidades enteras hacia arriba; gramos y mililitros de 5 en 5 si es poco y de 10 en 10 si es más.
const redondeo = (n: number, unidad: string) => (["u", "dientes", "hojas", "rebanadas"].includes(unidad) ? Math.ceil(n) : n < 50 ? Math.max(5, Math.ceil(n / 5) * 5) : Math.round(n / 10) * 10);
const formato = (n: number, unidad: string) => (unidad === "g" && n >= 1000 ? `${(n / 1000).toFixed(1)} kg` : unidad === "ml" && n >= 1000 ? `${(n / 1000).toFixed(1)} L` : `${n} ${unidad}`);

type Linea = { n: number; factor: number; clientes: string[]; ajustes: { quien: string; texto: string }[]; sinConfirmar: number };

export default function ProduccionPage() {
  const { ordenes, planesAlim, incidencias, produccion, setProduccion, recetarioVersion, marcarPlatoHecho, extras } = useStore();
  const [dia, setDia] = useState<0 | 1>(0);
  // Filtro por cliente: "" = todos.
  const [cli, setCli] = useState("");
  // Por plato del menú (como piensa la cocina), por cliente (cola por llegada)
  // o la lista de insumos del día con los avisos a la nutricionista.
  const [vista, setVista] = useState<"platos" | "cola" | "insumos">("platos");
  // Platos con la línea de ingredientes abierta.
  const [conIng, setConIng] = useState<Set<string>>(new Set());
  // Plato y porciones para agregar a la producción del día.
  const [nuevo, setNuevo] = useState("");
  const [cuantas, setCuantas] = useState(1);
  const porcion = (clienteId: string) => planesAlim.find((p) => p.clienteId === clienteId)?.porcion ?? "Regular";

  // Entregas del día: un día de cada paquete (todas, y las del cliente elegido).
  const todas: Entrega[] = ordenes.flatMap((o) => o.dias.filter((d) => d.dia === dia).map((d) => ({ o, d })));
  const clientesDia = [...new Map(todas.map(({ o }) => [o.clienteId, o])).values()].sort((a, b) => cliente(a.clienteId).nombre.localeCompare(cliente(b.clienteId).nombre));
  const filtro = clientesDia.some((o) => o.clienteId === cli) ? cli : "";
  const entregas = filtro ? todas.filter(({ o }) => o.clienteId === filtro) : todas;
  const elegido = filtro ? clientesDia.find((o) => o.clienteId === filtro) : undefined;

  // Lo que piden las órdenes, por plato: porciones, quiénes, tamaño promedio y cambios escritos.
  const segun = useMemo(() => {
    const m = new Map<string, Linea>();
    for (const { o, d } of entregas) {
      const quien = cliente(o.clienteId).nombre.split(" ").slice(0, 2).join(" ");
      const f = FACTOR[porcion(o.clienteId)];
      for (const i of d.items.filter((x) => enCocina(x.tiempo, o.plan))) {
        const x = m.get(i.platoId) ?? { n: 0, factor: 0, clientes: [], ajustes: [], sinConfirmar: 0 };
        x.factor = (x.factor * x.n + f) / (x.n + 1);
        x.n++;
        if (o.estado === "nueva") x.sinConfirmar++;
        if (!x.clientes.includes(quien)) x.clientes.push(quien);
        if (i.ajuste && !x.ajustes.some((a) => a.quien === quien)) x.ajustes.push({ quien, texto: i.ajuste });
        m.set(i.platoId, x);
      }
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenes, planesAlim, dia, filtro]);

  // A producir: lo de las órdenes, salvo que el chef lo haya cambiado (por cliente, siempre lo de sus órdenes).
  const guardado = filtro ? undefined : produccion[dia];
  const aProducir = (id: string) => guardado?.[id] ?? segun.get(id)?.n ?? 0;
  const cambiar = (id: string, n: number) => {
    const base = Object.fromEntries(RECETARIO.map((x) => [x.id, aProducir(x.id)]));
    setProduccion(dia, { ...base, [id]: Math.max(0, Math.round(n || 0)) });
  };
  const preparados = (id: string) => (filtro ? hechosDe(ordenes, dia, id, filtro) : hechosDe(ordenes, dia, id) + (extras[dia]?.[id] ?? 0));

  const platos = RECETARIO.filter((x) => TIPOS.includes(x.tiempo));
  const { total, faltaTotal, sumaPlan, sumaHechos } = useMemo(() => {
    const total = new Map<string, { cant: number; unidad: string }>();
    const falta = new Map<string, { cant: number; unidad: string }>();
    let sumaPlan = 0;
    let sumaHechos = 0;
    for (const x of platos) {
      const n = aProducir(x.id);
      const h = Math.min(preparados(x.id), n);
      sumaPlan += n;
      sumaHechos += h;
      const f = segun.get(x.id)?.factor ?? 1;
      for (const [nombre, cant, unidad] of x.insumos) {
        const y = total.get(nombre) ?? { cant: 0, unidad };
        y.cant += cant * n * f;
        total.set(nombre, y);
        const z = falta.get(nombre) ?? { cant: 0, unidad };
        z.cant += cant * Math.max(0, n - h) * f;
        falta.set(nombre, z);
      }
    }
    const orden = (m: Map<string, { cant: number; unidad: string }>) => [...m.entries()].filter(([, v]) => v.cant > 0).sort((a, b) => a[0].localeCompare(b[0]));
    return { total: orden(total), faltaTotal: new Map(orden(falta)), sumaPlan, sumaHechos };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segun, guardado, ordenes, extras, recetarioVersion, dia, filtro]);

  const listas = entregas.filter(({ d }) => d.estado !== "pendiente").length;
  const conCambio = [...segun.values()].reduce((n, x) => n + x.ajustes.length, 0);
  const avance = sumaPlan ? Math.round((Math.min(sumaHechos, sumaPlan) / sumaPlan) * 100) : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader
        title={dia === 0 ? "Producción de hoy" : "Producción de mañana"}
        sub="Marca lo que vas terminando y el avance se actualiza."
        right={
          <>
            <Link
              href="/demonutricion/cocina/calendario"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2 text-[13px] font-semibold hover:bg-surface"
            >
              <CalendarRange size={15} /> Planificar por tandas
            </Link>
            <label className={cn("flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-[13px] shadow-sm", filtro ? "border-[var(--entregas)]" : "border-line")}>
              <span className="font-semibold text-[var(--text-3)]">Cliente</span>
              <select value={filtro} onChange={(e) => setCli(e.target.value)} className="max-w-[220px] bg-transparent font-bold outline-none">
                <option value="">Todos ({clientesDia.length})</option>
                {clientesDia.map((o) => (
                  <option key={o.clienteId} value={o.clienteId}>
                    {cliente(o.clienteId).nombre} · {PLAN_INFO[o.plan].label}
                  </option>
                ))}
              </select>
            </label>
            <div className="inline-flex rounded-xl border border-line bg-card p-1 shadow-sm">
              {([0, 1] as const).map((d) => (
                <button key={d} type="button" onClick={() => setDia(d)} className={cn("rounded-lg px-3.5 py-1.5 text-[13px] font-semibold", dia === d ? "bg-[var(--entregas)] text-white" : "text-[var(--text-2)] hover:bg-surface")}>
                  {d === 0 ? "Hoy" : "Mañana"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => descargarEtiquetas(entregas, planesAlim, `Etiquetas_${etiquetaDia(dia)}.pdf`)}
              disabled={!entregas.length}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2 text-[13px] font-semibold hover:bg-surface disabled:opacity-40"
            >
              <Printer size={15} /> Etiquetas del día
            </button>
          </>
        }
      />
      <div className="space-y-5 p-4 sm:p-6">
        {/* Resumen del día en una sola franja: el avance manda, lo demás acompaña. */}
        <div className="rounded-2xl border border-line bg-card px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
            <span className="inline-flex items-baseline gap-1.5">
              <CheckCircle2 size={15} className="self-center text-emerald-600" />
              <b className="text-[18px] font-extrabold tabular-nums text-[var(--text)]">
                {Math.min(sumaHechos, sumaPlan)}/{sumaPlan}
              </b>
              <span className="text-[var(--text-3)]">platos preparados · {avance}%</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[var(--text-2)]">
              <ChefHat size={15} className="text-[var(--text-3)]" />
              <b className="tabular-nums text-[var(--text)]">
                {listas}/{entregas.length}
              </b>
              entregas listas
            </span>
            {conCambio > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-0.5 font-semibold text-violet-800">
                <PencilLine size={13} />
                {conCambio} {conCambio === 1 ? "porción con cambio" : "porciones con cambio"}
              </span>
            )}
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuemin={0} aria-valuemax={sumaPlan} aria-valuenow={Math.min(sumaHechos, sumaPlan)} aria-label="Avance de la producción del día">
            <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${avance}%` }} />
          </div>
        </div>
        {elegido && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--entregas)] bg-[var(--entregas-soft)] px-4 py-2.5 text-[13px]">
            <span>
              Viendo la producción de <b>{cliente(elegido.clienteId).nombre}</b> · Plan {PLAN_INFO[elegido.plan].label}
              {(() => {
                const p = planesAlim.find((x) => x.clienteId === elegido.clienteId);
                return p ? ` · porción ${p.porcion.toLowerCase()}${p.alergias.length ? ` · alergia: ${p.alergias.map((a) => ALERGENOS[a].toLowerCase()).join(", ")}` : ""}` : "";
              })()}
            </span>
            <button type="button" onClick={() => setCli("")} className="font-semibold text-brand hover:underline">
              Ver todos los clientes
            </button>
          </div>
        )}
        <div className="inline-flex rounded-xl border border-line bg-card p-1 shadow-sm">
          {(
            [
              ["platos", "Por plato"],
              ["cola", "Por cliente"],
              ["insumos", "Insumos"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setVista(id)}
              aria-pressed={vista === id}
              className={cn("rounded-lg px-3.5 py-1.5 text-[13px] font-semibold", vista === id ? "bg-[var(--text)] text-white" : "text-[var(--text-2)] hover:bg-surface")}
            >
              {label}
            </button>
          ))}
        </div>

        {vista === "insumos" ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card title={<span className="flex items-center gap-1.5"><ShoppingBasket size={16} /> Ingredientes necesarios</span>} sub={`Total del día · ${sumaPlan} platos · «falta» descuenta lo ya preparado`}>
              {total.length === 0 && <p className="text-[13px] text-[var(--text-3)]">Sin ingredientes.</p>}
              <table className="w-full text-[13px]">
                <thead className="text-[10.5px] uppercase tracking-wider text-[var(--text-3)]">
                  <tr>
                    <th className="py-1 text-left font-bold">Ingrediente</th>
                    <th className="py-1 text-right font-bold">Total</th>
                    <th className="py-1 text-right font-bold">Falta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {total.map(([nombre, { cant, unidad }]) => {
                    const f = faltaTotal.get(nombre);
                    return (
                      <tr key={nombre}>
                        <td className="py-1.5">{nombre}</td>
                        <td className="py-1.5 text-right tabular-nums text-[var(--text-2)]">{formato(redondeo(cant, unidad), unidad)}</td>
                        <td className="py-1.5 text-right font-semibold tabular-nums">{f ? formato(redondeo(f.cant, unidad), unidad) : "✓"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-[var(--text-3)]">Porción pequeña rinde 80 % y grande 130 % de la regular, según el plan de cada cliente. Los cambios escritos pueden pedir otros ingredientes: revísalos en cada plato.</p>
            </Card>

            <Card title={<span className="flex items-center gap-1.5"><CookingPot size={16} /> Avisos a la nutricionista</span>} sub="Faltantes y dudas que envió la cocina">
              {incidencias.length === 0 && <p className="text-[13px] text-[var(--text-3)]">Todavía no hay avisos. Se envían desde cada orden.</p>}
              <div className="space-y-2">
                {incidencias.map((i) => (
                  <div key={i.id} className="rounded-lg bg-surface px-3 py-2 text-[12.5px]">
                    <p className="flex items-center justify-between gap-2 font-semibold">
                      {cliente(i.clienteId).nombre}
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10.5px]", i.resuelta ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>{i.resuelta ? "Vista" : { sustitucion: "Cambio", faltante: "Faltante", duda: "Duda" }[i.tipo]}</span>
                    </p>
                    <p className="mt-0.5 text-[var(--text-2)]">{i.texto}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--text-3)]">Hoy {i.hora}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {vista === "cola" ? (
              <ColaDelDia entregas={entregas} dia={dia} />
            ) : (
              <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12.5px] text-[var(--text-3)]">
                {guardado ? "Cantidades editadas por cocina." : "Cantidades según las órdenes."} Las meriendas no las prepara la cocina.
              </p>
              {guardado && (
                <button type="button" onClick={() => setProduccion(dia, null)} className="inline-flex items-center gap-1 rounded-lg border border-line bg-card px-2.5 py-1 text-[12px] font-semibold hover:bg-surface">
                  <RotateCcw size={13} /> Volver a las órdenes
                </button>
              )}
            </div>
            {TIPOS.map((t) => {
              // Solo los platos que se hacen ese día (de las órdenes o agregados por cocina).
              const del = platos.filter((x) => x.tiempo === t && (aProducir(x.id) > 0 || preparados(x.id) > 0)).sort((a, b) => (a.numero ?? 99) - (b.numero ?? 99));
              if (!del.length) return null;
              const plan = del.reduce((n, x) => n + aProducir(x.id), 0);
              const hechos = del.reduce((n, x) => n + Math.min(preparados(x.id), aProducir(x.id)), 0);
              return (
                <Card key={t} title={`${t}s · ${hechos}/${plan} preparados`}>
                  <div className="divide-y divide-line">
                    {del.map((pl) => {
                      const n = aProducir(pl.id);
                      const h = preparados(pl.id);
                      const o = segun.get(pl.id);
                      const listo = n > 0 && h >= n;
                      const porcentaje = n ? Math.min(100, Math.round((h / n) * 100)) : 0;
                      const ing = pl.insumos.map(([nombre, cant, unidad]) => `${nombre} ${formato(redondeo(cant * n * (o?.factor ?? 1), unidad), unidad)}`);
                      return (
                        <div key={pl.id} className={cn("py-3 first:pt-0 last:pb-0", !n && !h && "opacity-55")}>
                          <div className="flex flex-wrap items-start gap-3">
                            <div className="w-[108px] shrink-0">
                              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-3)]">A producir</p>
                              <div className="mt-0.5 flex items-center rounded-lg border border-line">
                                <button type="button" onClick={() => cambiar(pl.id, n - 1)} disabled={!!filtro} aria-label="Una porción menos" className="px-1.5 py-1 text-[var(--text-3)] hover:text-[var(--text)] disabled:opacity-30">
                                  <Minus size={13} />
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  value={n}
                                  onChange={(e) => cambiar(pl.id, Number(e.target.value))}
                                  disabled={!!filtro}
                                  aria-label={`Porciones a producir de ${pl.nombre}`}
                                  className="w-10 bg-transparent text-center text-[16px] font-extrabold tabular-nums outline-none"
                                />
                                <button type="button" onClick={() => cambiar(pl.id, n + 1)} disabled={!!filtro} aria-label="Una porción más" className="px-1.5 py-1 text-[var(--text-3)] hover:text-[var(--text)] disabled:opacity-30">
                                  <Plus size={13} />
                                </button>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="flex flex-wrap items-center gap-2 text-[14px] font-bold">
                                {pl.numero ? `${pl.numero}. ` : ""}
                                {pl.nombre}
                                {listo && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-700">
                                    <Check size={10} /> Completo
                                  </span>
                                )}
                              </p>
                              <p className="text-[11.5px] text-[var(--text-3)]">
                                {o ? `Para: ${o.clientes.join(", ")}` : n ? "Agregado por cocina" : "Sin porciones pendientes"}
                                {o?.sinConfirmar ? ` · ${o.sinConfirmar} de órdenes sin confirmar` : ""}
                                {pl.contiene.length ? ` · contiene ${pl.contiene.map((a) => ALERGENOS[a].toLowerCase()).join(", ")}` : ""}
                              </p>
                              <div className="mt-1.5 flex items-center gap-2">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                                  <div className={cn("h-full rounded-full", listo ? "bg-emerald-600" : "bg-[var(--entregas)]")} style={{ width: `${porcentaje}%` }} />
                                </div>
                                <span className="w-24 shrink-0 text-right text-[12.5px] font-bold tabular-nums">
                                  {h} / {n} hechos
                                </span>
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-1.5 self-center">
                              <button
                                type="button"
                                onClick={() => marcarPlatoHecho(dia, pl.id, 1, filtro || undefined)}
                                disabled={!n || h >= n}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-600 px-2.5 py-1 text-[12px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <Plus size={12} /> 1 hecho
                              </button>
                              <button
                                type="button"
                                onClick={() => marcarPlatoHecho(dia, pl.id, n - h, filtro || undefined)}
                                disabled={!n || h >= n}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[12px] font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <Check size={12} /> Completar
                              </button>
                            </div>
                          </div>
                          {o?.ajustes.map((a) => (
                            <p key={a.quien} className="ml-[120px] mt-1 rounded-md bg-violet-50 px-2 py-1 text-[12px] text-violet-800">
                              <b>1 porción para {a.quien}:</b> {a.texto}
                            </p>
                          ))}
                          {n > 0 && (
                            <div className="ml-[120px] mt-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setConIng((s) => {
                                    const x = new Set(s);
                                    if (x.has(pl.id)) x.delete(pl.id);
                                    else x.add(pl.id);
                                    return x;
                                  })
                                }
                                aria-expanded={conIng.has(pl.id)}
                                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--text-3)] hover:text-[var(--text)]"
                              >
                                <ChevronRight size={12} className={cn("transition-transform", conIng.has(pl.id) && "rotate-90")} /> Ingredientes
                              </button>
                              {conIng.has(pl.id) && <p className="mt-1 rounded-lg border border-line px-2.5 py-1.5 text-[12px] text-[var(--text-2)]">{ing.join(" · ") || "—"}</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
            {!platos.some((x) => aProducir(x.id) > 0 || preparados(x.id) > 0) && (
              <p className="rounded-2xl border border-dashed border-line p-6 text-center text-[13px] text-[var(--text-3)]">No hay platos para producir ese día. Agrega uno del menú abajo.</p>
            )}
            {!filtro && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-card p-3 shadow-sm">
                <span className="text-[13px] font-bold">Agregar plato del menú</span>
                <select value={nuevo} onChange={(e) => setNuevo(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] sm:max-w-sm">
                  <option value="">Elige un plato…</option>
                  {TIPOS.map((t) => (
                    <optgroup key={t} label={`${t}s`}>
                      {platos
                        .filter((x) => x.tiempo === t && aProducir(x.id) === 0 && preparados(x.id) === 0)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.numero ? `${x.numero}. ` : ""}
                            {x.nombre}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
                <input type="number" min={1} value={cuantas} onChange={(e) => setCuantas(Math.max(1, Number(e.target.value) || 1))} aria-label="Porciones a agregar" className="w-20 rounded-lg border border-line bg-surface px-2 py-2 text-center text-[13px] font-bold" />
                <button
                  type="button"
                  disabled={!nuevo}
                  onClick={() => {
                    cambiar(nuevo, cuantas);
                    setNuevo("");
                    setCuantas(1);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--entregas)] px-3 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-40"
                >
                  <Plus size={14} /> Agregar
                </button>
              </div>
            )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Cola de órdenes del día en orden cronológico: la que llegó primero se
 * produce y se despacha primero. Cada plato se va marcando por partes
 * (proteína, carbohidrato, vegetales, grasa); con todo hecho, la orden queda
 * lista. «Orden lista» está siempre disponible para darla por terminada.
 */
function ColaDelDia({ entregas }: { entregas: Entrega[]; dia: number }) {
  const { marcarParte, despacharDia, completarEntrega, planesAlim } = useStore();
  // Platos con las partes a la vista (por defecto se marca el plato entero).
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const alternar = (k: string) =>
    setAbiertos((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  // Más antigua primero; a igual llegada, la que sale antes en la ruta.
  const cola = [...entregas].sort((a, b) => a.o.diaLlegada - b.o.diaLlegada || a.o.llegada.localeCompare(b.o.llegada) || a.d.hora.localeCompare(b.d.hora));
  const pendientes = cola.filter(({ d }) => d.estado !== "entregada");
  const siguiente = pendientes.find(({ d }) => d.estado === "pendiente");
  const llegada = (diaLlegada: number, hora: string) => `${diaLlegada === 0 ? "Hoy" : diaLlegada === -1 ? "Ayer" : etiquetaDia(diaLlegada)} ${hora}`;

  if (!cola.length) return <p className="rounded-2xl border border-dashed border-line p-6 text-center text-[13px] text-[var(--text-3)]">No hay órdenes para producir ese día.</p>;

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-[var(--text-3)]">
        En orden de llegada. Marca cada plato cuando esté hecho. {pendientes.length} por despachar de {cola.length}.
      </p>
      {cola.map(({ o, d }, i) => {
        const c = cliente(o.clienteId);
        const p = planesAlim.find((x) => x.clienteId === o.clienteId);
        const items = d.items.filter((x) => enCocina(x.tiempo, o.plan));
        const listaDia = d.estado !== "pendiente";
        const hechos = items.filter((x) => x.hecho || listaDia).length;
        const sinConfirmar = o.estado === "nueva";
        const entregada = d.estado === "entregada";
        const lista = d.estado === "lista";
        const esSiguiente = siguiente?.o.id === o.id && siguiente.d.dia === d.dia;
        return (
          <section
            key={o.id + d.dia}
            className={cn("rounded-2xl border bg-card p-4 shadow-sm", esSiguiente ? "border-[var(--entregas)] ring-1 ring-[var(--entregas)]" : "border-line", entregada && "opacity-60")}
          >
            <div className="flex flex-wrap items-start gap-3">
              <div className="w-14 shrink-0 text-center">
                <p className="text-[20px] font-extrabold leading-none tabular-nums">#{i + 1}</p>
                <p className="mt-1 text-[10.5px] leading-tight text-[var(--text-3)]">{llegada(o.diaLlegada, o.llegada)}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-[14.5px] font-bold">
                  {c.nombre}
                  <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[11px] font-bold text-orange-700">Plan {PLAN_INFO[o.plan].label}</span>
                  {p?.alergias.map((a) => (
                    <span key={a} className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-bold text-rose-700">
                      <AlertTriangle size={10} /> {ALERGENOS[a]}
                    </span>
                  ))}
                  {esSiguiente && <span className="rounded-full bg-[var(--entregas)] px-2 py-0.5 text-[10.5px] font-bold text-white">Siguiente</span>}
                </p>
                <p className="text-[12px] text-[var(--text-3)]">
                  <Clock size={11} className="-mt-0.5 mr-0.5 inline" /> Sale {d.hora} · ruta {o.zona} · cocina {COCINA_PLAN[o.plan]}
                  {p ? ` · porción ${p.porcion.toLowerCase()}` : ""}
                  {sinConfirmar && (
                    <>
                      {" · "}
                      <Link href={`/demonutricion/cocina?orden=${o.id}`} className="font-semibold text-amber-700 hover:underline">
                        sin confirmar: revisar en la cola
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", entregada ? "bg-slate-100 text-slate-600" : lista ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700")}>
                  {entregada ? "Entregada" : lista ? "Lista para reparto" : `${hechos}/${items.length} platos hechos`}
                </span>
                <div className="flex gap-1.5">
                  {!entregada && (
                    <button
                      type="button"
                      onClick={() => completarEntrega(o.id, d.dia)}
                      disabled={lista}
                      title={lista ? "Ya está lista" : "Dar la orden completa por lista"}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[12px] font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                    >
                      <Check size={13} /> {lista ? "Lista" : "Orden lista"}
                    </button>
                  )}
                  {lista && (
                    <button type="button" onClick={() => despacharDia(o.id, d.dia)} className="inline-flex items-center gap-1 rounded-lg bg-[var(--text)] px-2.5 py-1 text-[12px] font-bold text-white hover:opacity-90">
                      <Truck size={13} /> Entregar a reparto
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {items.map((x) => {
                const pl = plato(x.platoId);
                const hecho = x.hecho || listaDia;
                const partes = partesDe(x.platoId);
                const clave = `${o.id}|${d.dia}|${x.tiempo}`;
                const abierto = abiertos.has(clave);
                return (
                  <div key={x.tiempo} className={cn("rounded-xl border p-2.5", hecho ? "border-emerald-300 bg-emerald-50/60" : "border-line")}>
                    <button
                      type="button"
                      disabled={entregada}
                      onClick={() => marcarParte(o.id, d.dia, x.tiempo)}
                      className="flex w-full items-start gap-2 text-left"
                      title={hecho ? "Desmarcar el plato" : "Marcar el plato completo"}
                    >
                      <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2", hecho ? "border-emerald-600 bg-emerald-600 text-white" : "border-[var(--border-2)]")}>
                        {hecho && <Check size={13} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 text-[12.5px] leading-snug">
                        <span className="block text-[10.5px] font-bold uppercase tracking-wide text-[var(--entregas)]">{x.tiempo}</span>
                        <span className={cn("font-bold", hecho && "line-through decoration-emerald-600/60")}>{pl.nombre}</span>
                      </span>
                    </button>
                    {x.ajuste && <p className="ml-7 mt-1 text-[11px] font-semibold text-violet-700">✎ {x.ajuste}</p>}
                    {partes.length > 0 && !entregada && (
                      <button
                        type="button"
                        onClick={() => alternar(clave)}
                        aria-expanded={abierto}
                        className="ml-7 mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-3)] hover:text-[var(--text)]"
                      >
                        <ChevronRight size={11} className={cn("transition-transform", abierto && "rotate-90")} />
                        Por partes · {hecho ? partes.length : (x.partes ?? []).filter((k) => partes.includes(k)).length}/{partes.length}
                      </button>
                    )}
                    {partes.length > 0 && abierto && !entregada && (
                      <div className="ml-7 mt-1.5 space-y-1">
                        {PARTES.filter((k) => partes.includes(k.id)).map((k) => {
                          const on = hecho || (x.partes ?? []).includes(k.id);
                          return (
                            <label key={k.id} className={cn("flex cursor-pointer items-start gap-1.5 text-[11.5px] leading-snug", entregada && "cursor-default")}>
                              <input
                                type="checkbox"
                                checked={on}
                                disabled={entregada}
                                onChange={() => marcarParte(o.id, d.dia, x.tiempo, k.id)}
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-emerald-600"
                              />
                              <span className={cn(on && "text-[var(--text-3)] line-through")}>
                                <b className="font-semibold">{k.label}:</b> {pl.componentes?.[k.id]}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
