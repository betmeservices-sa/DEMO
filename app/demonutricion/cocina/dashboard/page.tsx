"use client";

import { useMemo, useState } from "react";
import { ChefHat, Info, Truck, Users, Utensils } from "lucide-react";
import { enCocina, lunesDe, plato, RECETARIO } from "@/lib/nutricion/cocina";
import { diaCorto, PLAN_INFO } from "@/lib/nutricion/format";
import { useStore } from "@/lib/nutricion/store";
import type { PlanId, Plato } from "@/lib/nutricion/types";
import { Card, PageHeader } from "@/components/nutricion/ui";
import { Columnas, Dato, Horizontales } from "@/components/nutricion/DashboardResumen";

// Dashboard de cocina: platos preparados por plato del menú y clientes
// atendidos con meal prep, por semana, mes o año. La semana sale de las
// órdenes reales del demo; el mes y el año, de un histórico de ejemplo
// armado a partir de esa semana.

type Periodo = "semanal" | "mensual" | "anual";
const TIPOS: Plato["tiempo"][] = ["Desayuno", "Almuerzo", "Cena"];
const PLANES: PlanId[] = ["premium", "two_meals", "the_lunch"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const COLOR = "var(--entregas)";

/** Generador determinista para el histórico de ejemplo. */
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

export default function DashboardCocina() {
  const { ordenes, extras } = useStore();
  const [periodo, setPeriodo] = useState<Periodo>("semanal");

  const datos = useMemo(() => {
    // Semana actual, con lo que ya está preparado (hecho, listo o entregado).
    const lunes = lunesDe(0);
    const porPlato = new Map<string, number>();
    const porDia = Array.from({ length: 6 }, (_, i) => ({ dia: lunes + i, valor: 0 }));
    const clientes = new Map<string, PlanId>();
    let entregas = 0;
    // Volumen programado de la semana completa, para el histórico de ejemplo.
    const programado = new Map<string, number>();
    for (const o of ordenes.filter((x) => x.semana === 0))
      for (const d of o.dias) {
        const listo = d.estado !== "pendiente";
        if (d.estado === "entregada") entregas++;
        let alguno = false;
        for (const i of d.items.filter((x) => enCocina(x.tiempo, o.plan))) {
          programado.set(i.platoId, (programado.get(i.platoId) ?? 0) + 1);
          if (listo || i.hecho) {
            porPlato.set(i.platoId, (porPlato.get(i.platoId) ?? 0) + 1);
            const k = porDia.find((x) => x.dia === d.dia);
            if (k) k.valor++;
            alguno = true;
          }
        }
        if (alguno) clientes.set(o.clienteId, o.plan);
      }
    for (const [dia, m] of Object.entries(extras))
      for (const [id, n] of Object.entries(m)) {
        porPlato.set(id, (porPlato.get(id) ?? 0) + n);
        const k = porDia.find((x) => x.dia === Number(dia));
        if (k) k.valor += n;
      }

    const r = rng(17);
    const semanaTotal = [...programado.values()].reduce((a, b) => a + b, 0);
    const clientesPlan = (k: number) => Object.fromEntries(PLANES.map((p) => [p, Math.round(([...clientes.values()].filter((x) => x === p).length || 1) * k)])) as Record<PlanId, number>;

    if (periodo === "semanal") {
      return {
        porPlato,
        serie: porDia.map((x) => ({ label: `${diaCorto(x.dia).nombre} ${diaCorto(x.dia).num}`, valor: x.valor, detalle: x.dia > 0 ? "por preparar" : "preparados" })),
        serieTitulo: "Platos preparados por día",
        clientes: clientes.size,
        porPlan: Object.fromEntries(PLANES.map((p) => [p, [...clientes.values()].filter((x) => x === p).length])) as Record<PlanId, number>,
        entregas,
        ejemplo: false,
      };
    }
    // Mensual: 4 semanas cerradas con el volumen de una semana completa y algo de variación.
    if (periodo === "mensual") {
      const semanas = [0.86, 0.94, 1.02, 0.97].map((k, i) => ({ label: `Semana ${i + 1}`, valor: Math.round(semanaTotal * k * (0.95 + r() * 0.1)) }));
      const total = semanas.reduce((a, b) => a + b.valor, 0);
      const m = new Map([...programado.entries()].map(([id, n]) => [id, Math.round((n / semanaTotal) * total)]));
      return { porPlato: m, serie: semanas, serieTitulo: "Platos preparados por semana", clientes: clientes.size + 4, porPlan: clientesPlan(1.4), entregas: Math.round(entregas * 4.3 * 1.6), ejemplo: true };
    }
    // Anual: 12 meses con crecimiento hasta el mes actual.
    const mesActual = new Date().getMonth();
    const meses = MESES.map((label, i) => ({ label, valor: i > mesActual ? 0 : Math.round(semanaTotal * 4.3 * (0.55 + (0.45 * i) / Math.max(1, mesActual)) * (0.92 + r() * 0.16)), detalle: i > mesActual ? "sin datos todavía" : undefined }));
    const total = meses.reduce((a, b) => a + b.valor, 0);
    const m = new Map([...programado.entries()].map(([id, n]) => [id, Math.round((n / semanaTotal) * total)]));
    return { porPlato: m, serie: meses, serieTitulo: "Platos preparados por mes", clientes: 58, porPlan: { premium: 21, two_meals: 19, the_lunch: 18 }, entregas: Math.round(total / 3.2), ejemplo: true };
  }, [ordenes, extras, periodo]);

  const totalPlatos = [...datos.porPlato.values()].reduce((a, b) => a + b, 0);
  const top = [...datos.porPlato.entries()].sort((a, b) => b[1] - a[1])[0];
  const nombre = periodo === "semanal" ? "esta semana" : periodo === "mensual" ? "este mes" : "este año";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader
        title="Dashboard de cocina"
        sub="Platos preparados por plato del menú y clientes atendidos con meal prep."
        right={
          <label className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-[13px] shadow-sm">
            <span className="font-semibold text-[var(--text-3)]">Periodo</span>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} className="bg-transparent font-bold outline-none">
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>
          </label>
        }
      />
      <div className="space-y-5 p-4 sm:p-6">
        {datos.ejemplo && (
          <p className="flex items-start gap-1.5 rounded-xl bg-surface px-3 py-2 text-[12px] text-[var(--text-2)]">
            <Info size={14} className="mt-0.5 shrink-0 text-[var(--text-3)]" /> Vista {periodo}: histórico de ejemplo del demo, calculado con el volumen de la semana actual. La vista semanal usa las órdenes reales.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Dato Icon={Utensils} valor={totalPlatos.toLocaleString("es-SV")} label={`Platos preparados ${nombre}`} hint="Desayunos, almuerzos y cenas" />
          <Dato Icon={Users} valor={datos.clientes} label="Clientes atendidos (meal prep)" hint="Con al menos una entrega preparada" />
          <Dato Icon={Truck} valor={datos.entregas.toLocaleString("es-SV")} label="Entregas hechas" />
          <Dato Icon={ChefHat} valor={top ? plato(top[0]).nombre : "—"} label="Plato más preparado" hint={top ? `${top[1]} porciones` : undefined} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card title={datos.serieTitulo} sub={periodo === "semanal" ? "Lunes a sábado · los días que vienen se llenan al marcar platos hechos" : undefined}>
            <Columnas datos={datos.serie} color={COLOR} unidad="platos" etiquetas alto={170} />
          </Card>
          <Card title="Clientes atendidos por plan" sub={`${datos.clientes} clientes ${nombre}`}>
            <Horizontales datos={PLANES.map((p) => ({ label: PLAN_INFO[p].label, valor: datos.porPlan[p] }))} color={COLOR} unidad="clientes" />
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {TIPOS.map((t) => {
            const filas = RECETARIO.filter((x) => x.tiempo === t)
              .map((x) => ({ label: `${x.numero ? `${x.numero}. ` : ""}${x.nombre}`, valor: datos.porPlato.get(x.id) ?? 0 }))
              .sort((a, b) => b.valor - a.valor);
            const suma = filas.reduce((a, b) => a + b.valor, 0);
            return (
              <Card key={t} title={`${t}s preparados`} sub={`${suma.toLocaleString("es-SV")} platos ${nombre} · por plato del menú`}>
                <Horizontales datos={filas} color={COLOR} unidad="platos" />
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
