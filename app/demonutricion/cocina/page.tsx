"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check, CheckCircle2, ChefHat, ChevronRight, Clock, Flag, ListOrdered, MessageSquareText, PencilLine, Printer, Tag } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { ALERGENOS, COCINA_PLAN, conflictos, plato, platosDe, semanaTexto, TIEMPOS_COCINA } from "@/lib/nutricion/cocina";
import { descargarEtiquetas } from "@/lib/nutricion/etiquetasPdf";
import { etiquetaDia, minutosDe, PLAN_INFO } from "@/lib/nutricion/format";
import { cliente } from "@/lib/nutricion/seed";
import { ahora, useStore } from "@/lib/nutricion/store";
import type { EstadoOrden, Incidencia, Orden, PlanAlimentacion } from "@/lib/nutricion/types";
import { PageHeader } from "@/components/nutricion/ui";
import { Modal } from "@/components/nutricion/ResumenConsulta";
import { comidasDe, ESTADO_ORDEN, pendientesDeAlergia } from "@/components/nutricion/cocinaUi";

// Cola de órdenes de producción, en orden de llegada y por cliente. Cada orden
// trae los platos del menú que le tocan a ese cliente en la semana, con la
// cantidad de cada uno y los cambios que escribió la nutricionista. El detalle
// día por día del paquete está en el perfil del cliente.

const SIGUIENTE: Partial<Record<EstadoOrden, { a: EstadoOrden; label: string }>> = {
  confirmada: { a: "preparacion", label: "Empezar preparación" },
  lista: { a: "despachada", label: "Entregar a reparto" },
};

type Filtro = "activas" | EstadoOrden;

/** Minutos que lleva esperando desde que llegó (solo si llegó hoy). */
function espera(o: Orden) {
  if (o.diaLlegada !== 0) return null;
  const d = new Date();
  const m = d.getHours() * 60 + d.getMinutes() - minutosDe(o.llegada);
  return m >= 0 ? m : null;
}

const llegadaTexto = (o: Orden) => `${o.diaLlegada === 0 ? "Hoy" : o.diaLlegada === -1 ? "Ayer" : etiquetaDia(o.diaLlegada)} ${o.llegada}`;

export default function CocinaPage() {
  return (
    <Suspense>
      <Cola />
    </Suspense>
  );
}

function Cola() {
  const params = useSearchParams();
  const { ordenes, planesAlim, moverOrden } = useStore();
  const [filtro, setFiltro] = useState<Filtro>("activas");
  const [semana, setSemana] = useState<"todas" | 0 | 1>("todas");
  const [abierta, setAbierta] = useState<string | null>(params.get("orden"));
  // Órdenes desplegadas para ver sus platos (por defecto, todas en una línea).
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const alternar = (id: string) =>
    setAbiertas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  useEffect(() => {
    const o = params.get("orden");
    if (o) setAbierta(o);
  }, [params]);

  const cola = useMemo(() => [...ordenes].sort((a, b) => a.diaLlegada - b.diaLlegada || a.llegada.localeCompare(b.llegada)), [ordenes]);
  const deSemana = cola.filter((o) => semana === "todas" || o.semana === semana);
  const lista = deSemana.filter((o) => (filtro === "activas" ? o.estado !== "despachada" : o.estado === filtro));
  const pendientes = cola.filter((o) => o.estado !== "despachada");
  const cuenta = (e: EstadoOrden) => deSemana.filter((o) => o.estado === e).length;
  const plan = (o: Orden) => planesAlim.find((p) => p.clienteId === o.clienteId);
  const orden = abierta ? ordenes.find((o) => o.id === abierta) : undefined;
  // Etiquetas: la próxima entrega por preparar de cada orden de la vista.
  const etiquetas = lista.flatMap((o) => {
    const d = o.dias.find((x) => x.estado !== "entregada");
    return d ? [{ o, d }] : [];
  });

  const FILTROS: [Filtro, string][] = [
    ["activas", "Por despachar"],
    ["nueva", "Nuevas"],
    ["confirmada", "Confirmadas"],
    ["preparacion", "En preparación"],
    ["lista", "Listas"],
    ["despachada", "Con el repartidor"],
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader
        title="Órdenes"
        sub="Paquetes por cliente en orden de llegada. Confírmalos y despáchalos."
        right={
          <button
            type="button"
            onClick={() => descargarEtiquetas(etiquetas, planesAlim)}
            disabled={!etiquetas.length}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2 text-[13px] font-semibold hover:bg-surface disabled:opacity-40"
          >
            <Printer size={15} /> Etiquetas de la próxima entrega ({etiquetas.length})
          </button>
        }
      />
      <div className="space-y-5 p-4 sm:p-6">
        {/* Una sola barra: cada estado con su número, y tocarlo filtra la cola. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-card p-1">
            {FILTROS.map(([id, label]) => {
              const n = id === "activas" ? deSemana.filter((o) => o.estado !== "despachada").length : cuenta(id);
              const Icon = id === "activas" ? ListOrdered : ESTADO_ORDEN[id].Icon;
              const alerta = id === "nueva" && n > 0 && filtro !== id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFiltro(id)}
                  aria-pressed={filtro === id}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold",
                    filtro === id ? "bg-[var(--entregas)] text-white" : alerta ? "text-rose-700 hover:bg-rose-50" : "text-[var(--text-2)] hover:bg-surface",
                  )}
                >
                  <Icon size={14} />
                  {label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[11.5px] font-bold tabular-nums",
                      filtro === id ? "bg-white/25" : alerta ? "bg-rose-600 text-white" : "bg-surface-2 text-[var(--text)]",
                    )}
                  >
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="inline-flex rounded-xl border border-line bg-card p-1">
            {(
              [
                ["todas", "Las dos semanas"],
                [0, "Esta semana"],
                [1, "Próxima semana"],
              ] as const
            ).map(([id, label]) => (
              <button key={String(id)} type="button" onClick={() => setSemana(id)} className={cn("rounded-lg px-3 py-1 text-[12.5px] font-semibold", semana === id ? "bg-[var(--text)] text-white" : "text-[var(--text-2)]")}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
          {lista.length === 0 && <p className="p-8 text-center text-[13px] text-[var(--text-3)]">No hay órdenes en esta vista.</p>}
          <div className="divide-y divide-line">
            {lista.map((o) => {
              const c = cliente(o.clienteId);
              const p = plan(o);
              const alergias = p?.alergias ?? c.alergias ?? [];
              const e = ESTADO_ORDEN[o.estado];
              const pos = pendientes.findIndex((x) => x.id === o.id);
              const sig = SIGUIENTE[o.estado];
              const min = espera(o);
              const proxima = o.dias.find((d) => d.estado !== "entregada");
              const platos = platosDe(o);
              const cambios = platos.filter((x) => x.ajuste).length;
              const desplegada = abiertas.has(o.id);
              return (
                <div key={o.id} className={cn(o.estado === "nueva" && "bg-amber-50/40")}>
                  {/* Una línea por orden: quién, qué tan grande, cuándo sale y lo que no se puede pasar por alto. */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => alternar(o.id)}
                      aria-expanded={desplegada}
                      aria-label={desplegada ? "Ocultar platos" : "Ver platos"}
                      className="flex min-w-0 flex-1 basis-full items-center gap-3 text-left sm:basis-0"
                    >
                      <ChevronRight size={16} className={cn("shrink-0 text-[var(--text-3)] transition-transform", desplegada && "rotate-90")} />
                      <span className="w-8 shrink-0 text-[15px] font-extrabold tabular-nums">{pos >= 0 ? `#${pos + 1}` : "—"}</span>
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[14px] font-bold">{c.nombre}</span>
                        <span className="text-[12.5px] font-semibold text-orange-700">{PLAN_INFO[o.plan].label}</span>
                        <span className="text-[12.5px] text-[var(--text-2)]">
                          · <b>{comidasDe(o)} platos</b>
                          {proxima ? ` · sale ${etiquetaDia(proxima.dia).toLowerCase()} ${proxima.hora}` : ""}
                        </span>
                        {alergias.map((a) => (
                          <span key={a} className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-bold text-rose-700">
                            <AlertTriangle size={10} /> {ALERGENOS[a]}
                          </span>
                        ))}
                        {cambios > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-bold text-violet-800">
                            <PencilLine size={10} /> {cambios} {cambios === 1 ? "cambio" : "cambios"}
                          </span>
                        )}
                        {o.nota && (
                          <span title={o.nota} className="inline-flex items-center gap-0.5 rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-bold text-sky-800">
                            <MessageSquareText size={10} /> Nota
                          </span>
                        )}
                        {o.estado === "nueva" && min !== null && (
                          <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--text-3)]">
                            <Clock size={11} /> espera {min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`}
                          </span>
                        )}
                      </span>
                    </button>
                    <div className="ml-auto flex shrink-0 items-center gap-1.5">
                      <span className={cn("hidden items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 sm:inline-flex", e.className)}>
                        <e.Icon size={11} /> {e.label}
                      </span>
                      {proxima && (
                        <button type="button" onClick={() => descargarEtiquetas([{ o, d: proxima }], planesAlim, `Etiqueta_${c.nombre.split(" ")[0]}.pdf`)} title="Etiqueta de la próxima entrega" aria-label="Etiqueta de la próxima entrega" className="rounded-lg border border-line p-1.5 text-[var(--text-2)] hover:bg-surface">
                          <Tag size={14} />
                        </button>
                      )}
                      {o.estado === "nueva" ? (
                        <button type="button" onClick={() => setAbierta(o.id)} className="rounded-lg bg-[var(--entregas)] px-2.5 py-1 text-[12px] font-bold text-white hover:opacity-90">
                          Revisar y confirmar
                        </button>
                      ) : (
                        <button type="button" onClick={() => setAbierta(o.id)} className="rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold hover:bg-surface">
                          Ver orden
                        </button>
                      )}
                      {sig && (
                        <button type="button" onClick={() => moverOrden(o.id, sig.a)} className="rounded-lg bg-[var(--text)] px-2.5 py-1 text-[12px] font-bold text-white hover:opacity-90">
                          {sig.label}
                        </button>
                      )}
                      {(o.estado === "confirmada" || o.estado === "preparacion") && (
                        <button type="button" onClick={() => moverOrden(o.id, "lista")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[12px] font-bold text-white hover:bg-emerald-700">
                          <Check size={13} /> Orden lista
                        </button>
                      )}
                    </div>
                  </div>
                  {desplegada && (
                    <div className="space-y-1.5 pb-3 pl-[60px] pr-4">
                      <p className="text-[12px] text-[var(--text-3)]">
                        {semanaTexto(o.semana)} · {o.dias.length} {o.dias.length === 1 ? "día" : "días"} · cocina {COCINA_PLAN[o.plan]} · llegó {llegadaTexto(o)}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {platos.map((x) => (
                          <span key={`${x.tiempo}${x.platoId}`} title={x.ajuste ?? x.tiempo} className={cn("rounded-md px-1.5 py-0.5 text-[11.5px]", x.ajuste ? "bg-violet-50 text-violet-800" : "bg-surface text-[var(--text-2)]")}>
                            <b>{x.cantidad}×</b> {plato(x.platoId).nombre}
                            {x.ajuste ? " ✎" : ""}
                          </span>
                        ))}
                      </div>
                      {o.nota && <p className="rounded-md bg-surface px-2 py-1 text-[12px] text-[var(--text-2)]">“{o.nota}”</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {orden && <Revision key={orden.id} o={orden} p={plan(orden)} cerrar={() => setAbierta(null)} />}
    </div>
  );
}

/**
 * Orden de producción de un cliente: los platos del menú con su cantidad y los
 * cambios escritos por la nutricionista. Al confirmar se verifica contra el
 * plan: que coincida, que cada día lleve todos sus tiempos y que ningún plato
 * con sus alergias vaya sin el cambio escrito.
 */
function Revision({ o, p, cerrar }: { o: Orden; p?: PlanAlimentacion; cerrar: () => void }) {
  const { confirmarOrden, moverOrden, reportarIncidencia, ordenes } = useStore();
  const vivo = ordenes.find((x) => x.id === o.id) ?? o;
  const c = cliente(o.clienteId);
  const alergias = p?.alergias ?? c.alergias ?? [];
  const [revisoGustos, setRevisoGustos] = useState(false);
  const [revisoPorcion, setRevisoPorcion] = useState(false);
  const [aviso, setAviso] = useState("");
  const [enviado, setEnviado] = useState(false);
  const editable = vivo.estado === "nueva";
  const platos = platosDe(vivo);

  const planOk = !!p && p.plan === vivo.plan;
  const tiemposOk = vivo.dias.every((d) => TIEMPOS_COCINA[vivo.plan].every((t) => d.items.some((i) => i.tiempo === t)));
  const riesgo = pendientesDeAlergia(vivo, p);
  const gustos = (p?.noLeGusta.length ?? 0) > 0;
  const puede = editable && planOk && tiemposOk && riesgo.length === 0 && (!gustos || revisoGustos) && revisoPorcion;

  const confirmar = (empezar: boolean) => {
    if (!puede) return;
    confirmarOrden(o.id, vivo.dias);
    if (empezar) moverOrden(o.id, "preparacion");
    cerrar();
  };

  const reportar = (tipo: Incidencia["tipo"]) => {
    if (!aviso.trim()) return;
    reportarIncidencia({ id: `inc${Date.now()}`, ordenId: o.id, clienteId: o.clienteId, tipo, texto: aviso.trim(), hora: ahora() });
    setAviso("");
    setEnviado(true);
  };

  return (
    <Modal titulo={editable ? "Revisar y confirmar orden" : "Orden de producción"} Icon={ChefHat} onClose={cerrar}>
      <div className="space-y-3 text-[13px]">
        <div className="rounded-xl bg-surface p-3">
          <p className="text-[15px] font-bold">
            {c.nombre} · Plan {PLAN_INFO[vivo.plan].label}
          </p>
          <p className="text-[12.5px] text-[var(--text-2)]">
            {semanaTexto(vivo.semana)} · {vivo.dias.length} días · cocina {COCINA_PLAN[vivo.plan]} · {comidasDe(vivo)} platos
            {p ? ` · ${p.kcal} kcal · ${p.proteinaG} g proteína · porción ${p.porcion.toLowerCase()}` : ""}
          </p>
          <p className={cn("mt-1.5 rounded-md px-2 py-1 text-[12.5px] font-semibold", alergias.length ? "bg-rose-50 text-rose-700" : "bg-card text-[var(--text-3)]")}>
            {alergias.length ? `Alergias: ${alergias.map((a) => ALERGENOS[a]).join(", ")}` : "Sin alergias registradas"}
            {p?.noLeGusta.length ? ` · No le gusta: ${p.noLeGusta.join(", ")}` : ""}
          </p>
          {vivo.nota && <p className="mt-1.5 rounded-md bg-card px-2 py-1 text-[12.5px]">“{vivo.nota}”</p>}
          {p?.notasCocina && (
            <p className="mt-1.5 text-[12.5px]">
              <b>Notas de la nutricionista:</b> {p.notasCocina}
            </p>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">Platos del menú y cantidad</p>
          <div className="divide-y divide-line rounded-xl border border-line">
            {platos.map((x) => {
              const pl = plato(x.platoId);
              const choca = conflictos(pl, alergias);
              return (
                <div key={`${x.tiempo}${x.platoId}`} className={cn("flex items-start gap-3 px-3 py-2", choca.length && !x.ajuste && "bg-rose-50")}>
                  <span className="w-9 shrink-0 text-[18px] font-extrabold tabular-nums">{x.cantidad}</span>
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="mr-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[var(--entregas)]">{x.tiempo}</span>
                      <b>{pl.nombre}</b>
                    </p>
                    {pl.componentes && (
                      <p className="text-[11.5px] text-[var(--text-3)]">
                        {pl.componentes.proteina} · {pl.componentes.carbohidrato} · {pl.componentes.vegetales} · {pl.componentes.grasa}
                      </p>
                    )}
                    {x.ajuste && <p className="mt-0.5 rounded-md bg-violet-50 px-2 py-1 text-[12px] font-semibold text-violet-800">✎ Cambio de la nutricionista: {x.ajuste}</p>}
                    {choca.length > 0 && !x.ajuste && (
                      <p className="mt-0.5 text-[12px] font-bold text-rose-700">Trae {choca.map((a) => ALERGENOS[a].toLowerCase()).join(", ")} y no tiene cambio escrito: avisa a la nutricionista.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Link href={`/demonutricion/cocina/perfiles#${c.id}`} className="mt-1.5 inline-block text-[12px] font-semibold text-brand hover:underline">
            Ver el paquete día por día en el perfil del cliente
          </Link>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">Verificación contra el plan</p>
          <ul className="space-y-1">
            <Chequeo ok={planOk} texto={p ? `Plan del cliente: ${PLAN_INFO[p.plan].label}` : "El cliente no tiene plan de alimentación asignado"} />
            <Chequeo ok={tiemposOk} texto={`Cada día lleva: ${TIEMPOS_COCINA[vivo.plan].join(", ")}${vivo.plan !== "the_lunch" ? " (las meriendas no las prepara cocina)" : ""}`} />
            <Chequeo ok={riesgo.length === 0} texto={alergias.length ? "Ningún plato con sus alergias va sin el cambio escrito" : "Sin alergias registradas"} />
          </ul>
        </div>

        {editable && (
          <div className="space-y-1.5 rounded-xl border border-line p-3">
            {gustos && (
              <label className="flex cursor-pointer items-start gap-2">
                <input type="checkbox" checked={revisoGustos} onChange={(e) => setRevisoGustos(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--entregas)]" />
                <span>
                  Quito lo que no le gusta: <b>{p!.noLeGusta.join(", ")}</b>
                </span>
              </label>
            )}
            <label className="flex cursor-pointer items-start gap-2">
              <input type="checkbox" checked={revisoPorcion} onChange={(e) => setRevisoPorcion(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--entregas)]" />
              <span>
                Porción <b>{p?.porcion.toLowerCase() ?? "regular"}</b>, los cambios escritos y el empaque para la ruta {vivo.zona}
              </span>
            </label>
          </div>
        )}

        <div className="rounded-xl border border-line p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold">
            <Flag size={13} /> Avisar a la nutricionista
          </p>
          <textarea
            value={aviso}
            onChange={(e) => {
              setAviso(e.target.value);
              setEnviado(false);
            }}
            rows={2}
            placeholder="Ej. No hay tilapia el jueves: ¿la cambio por pescado blanco?"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-[var(--entregas)]"
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => reportar("faltante")} disabled={!aviso.trim()} className="rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold hover:bg-surface disabled:opacity-40">
              Falta un insumo
            </button>
            <button type="button" onClick={() => reportar("duda")} disabled={!aviso.trim()} className="rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold hover:bg-surface disabled:opacity-40">
              Tengo una duda
            </button>
            {enviado && <span className="text-[12px] font-semibold text-emerald-700">✓ Enviado: le aparece en «Casos para ti».</span>}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <span className="text-[12px] text-[var(--text-3)]">
          Llegó {llegadaTexto(vivo).toLowerCase()} · {vivo.origen}
          {vivo.confirmada ? ` · confirmada ${vivo.confirmada.toLowerCase()}` : ""}
        </span>
        {editable ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => confirmar(false)} disabled={!puede} className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold hover:bg-surface disabled:opacity-40">
              Confirmar
            </button>
            <button type="button" onClick={() => confirmar(true)} disabled={!puede} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--entregas)] px-3 py-1.5 text-[13px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
              <CheckCircle2 size={14} /> Confirmar y empezar
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            {(vivo.estado === "confirmada" || vivo.estado === "preparacion") && (
              <button
                type="button"
                onClick={() => {
                  moverOrden(o.id, "lista");
                  cerrar();
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[13px] font-bold text-white hover:bg-emerald-700"
              >
                <Check size={14} /> Orden lista
              </button>
            )}
            {SIGUIENTE[vivo.estado] && (
              <button
                type="button"
                onClick={() => {
                  moverOrden(o.id, SIGUIENTE[vivo.estado]!.a);
                  cerrar();
                }}
                className="rounded-lg bg-[var(--text)] px-3 py-1.5 text-[13px] font-bold text-white"
              >
                {SIGUIENTE[vivo.estado]!.label}
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function Chequeo({ ok, texto }: { ok: boolean | "aviso"; texto: string }) {
  return (
    <li className={cn("flex items-center gap-2 text-[12.5px]", ok === true ? "text-emerald-700" : ok === "aviso" ? "text-amber-700" : "font-semibold text-rose-700")}>
      {ok === true ? <Check size={14} /> : <AlertTriangle size={14} />} {texto}
    </li>
  );
}
