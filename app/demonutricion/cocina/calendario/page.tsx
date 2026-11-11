"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarRange, Check, ChevronLeft, ChevronRight, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { ALERGENOS, enCocina, lunesDe, PARTES, partesDe, plato } from "@/lib/nutricion/cocina";
import { diaCorto, etiquetaDia, PLAN_INFO } from "@/lib/nutricion/format";
import { cliente } from "@/lib/nutricion/seed";
import { useStore } from "@/lib/nutricion/store";
import type { DiaOrden, ItemOrden, Orden, Tanda } from "@/lib/nutricion/types";
import { Card, PageHeader } from "@/components/nutricion/ui";
import { Modal } from "@/components/nutricion/ResumenConsulta";

// Calendario de producción del chef: para cada día planifica producciones
// (por ejemplo «Carnes y arroz») eligiendo qué partes de los platos va a sacar.
// Cada producción junta, de las órdenes de ese día, las partes que coinciden
// para irlas marcando; marcar aquí es lo mismo que marcar en la cola.

type Parte = (typeof PARTES)[number]["id"];
const etiqueta = (p: string) => PARTES.find((x) => x.id === p)?.label ?? p;
const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Una parte de un plato de una orden, lista para marcar. */
interface Fila {
  o: Orden;
  d: DiaOrden;
  i: ItemOrden;
  parte: Parte;
  texto: string;
  hecha: boolean;
}

/** Todas las partes de cocina de las órdenes de un día, en orden de llegada. */
function partesDelDia(ordenes: Orden[], dia: number): Fila[] {
  const out: Fila[] = [];
  const cola = ordenes
    .flatMap((o) => o.dias.filter((d) => d.dia === dia).map((d) => ({ o, d })))
    .sort((a, b) => a.o.diaLlegada - b.o.diaLlegada || a.o.llegada.localeCompare(b.o.llegada) || a.d.hora.localeCompare(b.d.hora));
  for (const { o, d } of cola)
    for (const i of d.items.filter((x) => enCocina(x.tiempo, o.plan)))
      for (const parte of partesDe(i.platoId) as Parte[]) {
        const texto = plato(i.platoId).componentes?.[parte] ?? "";
        out.push({ o, d, i, parte, texto, hecha: !!i.hecho || d.estado !== "pendiente" || (i.partes ?? []).includes(parte) });
      }
  return out;
}

const clave = (f: { parte: string; texto: string }) => `${f.parte}|${f.texto}`;

export default function CalendarioProduccion() {
  const { ordenes, tandas, guardarTanda, eliminarTanda, marcarParte } = useStore();
  const [semana, setSemana] = useState(0);
  const lunes = lunesDe(semana);
  const dias = Array.from({ length: 6 }, (_, i) => lunes + i);
  const [sel, setSel] = useState<string | null>(() => tandas.find((t) => t.dia === 0)?.id ?? null);
  const [creando, setCreando] = useState<{ dia: number; tanda?: Tanda } | null>(null);

  const porDia = useMemo(() => Object.fromEntries(dias.map((d) => [d, partesDelDia(ordenes, d)])), [ordenes, lunes]); // eslint-disable-line react-hooks/exhaustive-deps
  const filasDe = (t: Tanda) => (porDia[t.dia] ?? partesDelDia(ordenes, t.dia)).filter((f) => t.claves.includes(clave(f)));
  const tanda = tandas.find((t) => t.id === sel);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Link href="/demonutricion/cocina/produccion" aria-label="Volver a Hoy" className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-[var(--text-2)] hover:bg-surface">
              <ChevronLeft size={16} />
            </Link>
            Planificar por tandas
          </span>
        }
        sub="Planifica qué vas a sacar cada día (por ejemplo, todo lo que lleva carne y arroz) y marca las partes de las órdenes conforme las terminas."
        right={
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setSemana((s) => Math.max(0, s - 1))} disabled={semana === 0} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-card hover:bg-surface disabled:opacity-40" aria-label="Semana anterior">
              <ChevronLeft size={16} />
            </button>
            <span className="rounded-lg border border-line bg-card px-3 py-1.5 text-[12.5px] font-semibold">{semana === 0 ? "Esta semana" : "Próxima semana"}</span>
            <button type="button" onClick={() => setSemana((s) => Math.min(1, s + 1))} disabled={semana === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-card hover:bg-surface disabled:opacity-40" aria-label="Semana siguiente">
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {dias.map((d) => {
            const todas = porDia[d] ?? [];
            const hechas = todas.filter((f) => f.hecha).length;
            const suyas = tandas.filter((t) => t.dia === d);
            const planificadas = new Set(suyas.flatMap((t) => filasDe(t).map((f) => `${f.o.id}|${f.i.tiempo}|${f.parte}`)));
            const dc = diaCorto(d);
            return (
              <section key={d} className={cn("flex flex-col rounded-2xl border bg-card p-3 shadow-sm", d === 0 ? "border-[var(--entregas)]" : "border-line")}>
                <div className="flex items-baseline justify-between">
                  <p className={cn("text-[14px] font-extrabold", d === 0 && "text-[var(--entregas)]")}>
                    {dc.nombre} {dc.num}
                  </p>
                  <span className="text-[11px] text-[var(--text-3)]">{d === 0 ? "Hoy" : d === 1 ? "Mañana" : d < 0 ? "Pasado" : ""}</span>
                </div>
                <p className="text-[11.5px] text-[var(--text-3)]">
                  {hechas}/{todas.length} partes hechas · {todas.length - planificadas.size > 0 ? `${todas.length - planificadas.size} sin planificar` : "todo planificado"}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${todas.length ? Math.round((hechas / todas.length) * 100) : 0}%` }} />
                </div>
                <div className="mt-3 flex-1 space-y-1.5">
                  {suyas.map((t) => {
                    const f = filasDe(t);
                    const h = f.filter((x) => x.hecha).length;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSel(t.id)}
                        className={cn("w-full rounded-xl border px-2.5 py-2 text-left", sel === t.id ? "border-[var(--entregas)] bg-[var(--entregas-soft)]" : "border-line hover:bg-surface")}
                      >
                        <p className="truncate text-[12.5px] font-bold">{t.nombre}</p>
                        <p className={cn("text-[11px] font-semibold", f.length && h === f.length ? "text-emerald-700" : "text-[var(--text-3)]")}>
                          {f.length && h === f.length ? "✓ Completa" : `${h}/${f.length} partes`}
                        </p>
                      </button>
                    );
                  })}
                  {!suyas.length && <p className="text-[11.5px] text-[var(--text-3)]">Sin producciones planificadas.</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setCreando({ dia: d })}
                  disabled={!todas.length || d < 0}
                  className="mt-3 inline-flex items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--entregas)] px-2 py-1.5 text-[12px] font-bold text-[var(--entregas)] hover:bg-[var(--entregas-soft)] disabled:cursor-not-allowed disabled:border-line disabled:text-[var(--text-3)]"
                >
                  <Plus size={13} /> Producción
                </button>
              </section>
            );
          })}
        </div>

        {tanda ? (
          <DetalleTanda
            tanda={tanda}
            filas={filasDe(tanda)}
            editar={() => setCreando({ dia: tanda.dia, tanda })}
            eliminar={() => {
              eliminarTanda(tanda.id);
              setSel(null);
            }}
            marcar={(f) => marcarParte(f.o.id, f.d.dia, f.i.tiempo, f.parte)}
          />
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-[13px] text-[var(--text-3)]">
            <CalendarRange size={24} className="mx-auto mb-2 opacity-50" />
            Elige una producción del calendario o crea una con «+ Producción».
          </p>
        )}
      </div>

      {creando && (
        <NuevaTanda
          dia={creando.dia}
          previa={creando.tanda}
          filas={porDia[creando.dia] ?? partesDelDia(ordenes, creando.dia)}
          cerrar={() => setCreando(null)}
          guardar={(t) => {
            guardarTanda(t);
            setSel(t.id);
            setCreando(null);
          }}
        />
      )}
    </div>
  );
}

/** Lo que hay que sacar en una producción, por orden de llegada, para ir marcando. */
function DetalleTanda({ tanda, filas, editar, eliminar, marcar }: { tanda: Tanda; filas: Fila[]; editar: () => void; eliminar: () => void; marcar: (f: Fila) => void }) {
  const { planesAlim } = useStore();
  const hechas = filas.filter((f) => f.hecha).length;
  // Agrupado por orden (cliente), en el orden de llegada.
  const grupos = filas.reduce<{ o: Orden; d: DiaOrden; filas: Fila[] }[]>((acc, f) => {
    const g = acc.find((x) => x.o.id === f.o.id);
    if (g) g.filas.push(f);
    else acc.push({ o: f.o, d: f.d, filas: [f] });
    return acc;
  }, []);
  // Resumen por componente: cuántas porciones de cada cosa.
  const resumen = [...filas.reduce((m, f) => m.set(clave(f), { ...f, n: (m.get(clave(f))?.n ?? 0) + 1, h: (m.get(clave(f))?.h ?? 0) + (f.hecha ? 1 : 0) }), new Map<string, Fila & { n: number; h: number }>()).values()];

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          {tanda.nombre}
          <span className="rounded-full bg-surface px-2 py-0.5 text-[11.5px] font-semibold text-[var(--text-2)]">{etiquetaDia(tanda.dia)}</span>
        </span>
      }
      sub={`${hechas}/${filas.length} partes hechas · ${grupos.length} órdenes · en orden de llegada`}
      action={
        <div className="flex gap-1.5">
          <button type="button" onClick={editar} className="rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold hover:bg-surface">
            Editar
          </button>
          <button type="button" onClick={eliminar} aria-label="Eliminar producción" className="rounded-lg border border-line p-1.5 text-[var(--text-3)] hover:bg-rose-50 hover:text-rose-600">
            <Trash2 size={14} />
          </button>
        </div>
      }
    >
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${filas.length ? Math.round((hechas / filas.length) * 100) : 0}%` }} />
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {resumen.map((r) => (
          <span key={clave(r)} className={cn("rounded-lg px-2 py-1 text-[12px]", r.h === r.n ? "bg-emerald-50 text-emerald-800" : "bg-surface text-[var(--text-2)]")}>
            <b>
              {r.h}/{r.n}
            </b>{" "}
            {etiqueta(r.parte)}: {r.texto}
          </span>
        ))}
      </div>
      {!filas.length && <p className="text-[13px] text-[var(--text-3)]">Ninguna orden de ese día lleva estas partes.</p>}
      <div className="space-y-2">
        {grupos.map((g, k) => {
          const p = planesAlim.find((x) => x.clienteId === g.o.clienteId);
          const todas = g.filas.every((f) => f.hecha);
          return (
            <div key={g.o.id} className={cn("rounded-xl border p-3", todas ? "border-emerald-300 bg-emerald-50/50" : "border-line")}>
              <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-bold">
                <span className="tabular-nums text-[var(--text-3)]">#{k + 1}</span>
                {cliente(g.o.clienteId).nombre}
                <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[10.5px] font-bold text-orange-700">{PLAN_INFO[g.o.plan].label}</span>
                {p?.alergias.map((a) => (
                  <span key={a} className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10.5px] font-bold text-rose-700">
                    <AlertTriangle size={9} /> {ALERGENOS[a]}
                  </span>
                ))}
                <span className="text-[11.5px] font-normal text-[var(--text-3)]">· sale {g.d.hora}</span>
              </p>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {g.filas.map((f) => (
                  <label key={`${f.i.tiempo}${f.parte}`} className={cn("flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-1.5 text-[12.5px]", f.hecha ? "border-emerald-200 bg-emerald-50" : "border-line hover:bg-surface")}>
                    <input type="checkbox" checked={f.hecha} disabled={f.d.estado === "entregada"} onChange={() => marcar(f)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
                    <span className={cn("leading-snug", f.hecha && "text-[var(--text-3)] line-through")}>
                      <b>{etiqueta(f.parte)}:</b> {f.texto}
                      <span className="block text-[11px] text-[var(--text-3)]">
                        {f.i.tiempo} · {plato(f.i.platoId).nombre}
                      </span>
                      {f.i.ajuste && <span className="block text-[11px] font-semibold text-violet-700 no-underline">✎ {f.i.ajuste}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-[var(--text-3)]">
        <Check size={12} /> Marcar aquí también marca en la cola de Producción del día: con todas las partes de un plato, el plato queda hecho.
      </p>
    </Card>
  );
}

/** Crear o editar una producción: qué partes de las órdenes del día se van a sacar. */
function NuevaTanda({ dia, previa, filas, cerrar, guardar }: { dia: number; previa?: Tanda; filas: Fila[]; cerrar: () => void; guardar: (t: Tanda) => void }) {
  const [nombre, setNombre] = useState(previa?.nombre ?? "");
  const [claves, setClaves] = useState<string[]>(previa?.claves ?? []);
  const [q, setQ] = useState("");
  // Componentes del día con cuántas porciones hay de cada uno.
  const opciones = [...filas.reduce((m, f) => m.set(clave(f), { parte: f.parte, texto: f.texto, n: (m.get(clave(f))?.n ?? 0) + 1 }), new Map<string, { parte: Parte; texto: string; n: number }>()).values()];
  // Coincide al inicio de una palabra: «pollo» no trae «repollo», «res» no trae «fresas».
  const buscado = norm(q.trim()).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const coinciden = buscado ? opciones.filter((o) => new RegExp(`(^|[^a-z0-9])${buscado}`).test(norm(o.texto))) : [];
  const alternar = (k: string) => setClaves((xs) => (xs.includes(k) ? xs.filter((x) => x !== k) : [...xs, k]));
  const total = filas.filter((f) => claves.includes(clave(f))).length;

  return (
    <Modal titulo={previa ? "Editar producción" : `Nueva producción · ${etiquetaDia(dia)}`} Icon={CalendarRange} onClose={cerrar}>
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">Nombre de la producción</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Carnes y arroz" autoFocus className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-[var(--entregas)]" />
        </label>
        <div>
          <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">Buscar y agregar (por ejemplo «res», «arroz», «pollo»)</span>
          <div className="flex gap-1.5">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5">
              <Search size={14} className="text-[var(--text-3)]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ingrediente o parte" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" />
            </div>
            <button
              type="button"
              disabled={!coinciden.length}
              onClick={() => {
                setClaves((xs) => [...new Set([...xs, ...coinciden.map(clave)])]);
                if (!nombre.trim()) setNombre(q.trim()[0].toUpperCase() + q.trim().slice(1));
                setQ("");
              }}
              className="rounded-lg bg-[var(--entregas)] px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-40"
            >
              Agregar {coinciden.length || ""}
            </button>
          </div>
        </div>
        {PARTES.map((pt) => {
          const del = opciones.filter((o) => o.parte === pt.id).sort((a, b) => b.n - a.n);
          if (!del.length) return null;
          return (
            <div key={pt.id}>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--entregas)]">{pt.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {del.map((o) => {
                  const on = claves.includes(clave(o));
                  return (
                    <button
                      key={clave(o)}
                      type="button"
                      onClick={() => alternar(clave(o))}
                      aria-pressed={on}
                      className={cn("rounded-lg border px-2.5 py-1 text-[12px] font-semibold", on ? "border-[var(--entregas)] bg-[var(--entregas)] text-white" : "border-line text-[var(--text-2)] hover:bg-surface")}
                    >
                      {o.texto} <span className="opacity-70">· {o.n}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-4">
        <span className="text-[12px] text-[var(--text-3)]">{total} partes de órdenes en esta producción</span>
        <div className="flex gap-2">
          <button type="button" onClick={cerrar} className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold hover:bg-surface">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!nombre.trim() || !claves.length}
            onClick={() => guardar({ id: previa?.id ?? `t${Date.now()}`, dia, nombre: nombre.trim(), claves })}
            className="rounded-lg bg-[var(--entregas)] px-3 py-1.5 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-40"
          >
            {previa ? "Guardar" : "Crear producción"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
