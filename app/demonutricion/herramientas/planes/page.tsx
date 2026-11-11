"use client";

import { Suspense, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check, ChefHat, Search, Send, X } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { ALERGENOS, incluido, lunesDe, NO_INCLUIDOS, paqueteDe, servible, TIEMPOS_PLAN } from "@/lib/nutricion/cocina";
import { OpcionesPlan } from "@/components/nutricion/OpcionesPlan";
import { CalendarioSemana } from "@/components/nutricion/CalendarioSemana";
import { diaCorto, PLAN_INFO, textoFecha } from "@/lib/nutricion/format";
import { CITAS, CLIENTES, finDelPlan, STAFF } from "@/lib/nutricion/seed";
import { ahora, useStore } from "@/lib/nutricion/store";
import type { Alergeno, Cita, Cliente, PlanAlimentacion, PlanId, Tiempo } from "@/lib/nutricion/types";
import { Card, PageHeader } from "@/components/nutricion/ui";

// Planes de alimentación: la nutricionista elige al paciente, le asigna un plan
// a domicilio con sus opciones de desayuno, almuerzo, cena y meriendas (con
// cambios escritos por alergia o gusto), porciones y gustos, y lo manda a la
// cocina. El chef lo ve en Perfiles de clientes y en las órdenes.

const ZONAS = ["Escalón", "San Benito", "Miramonte", "Colonia Médica", "San Francisco", "Antiguo Cuscatlán", "Santa Elena", "Santa Tecla"];
const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const lista = (t: string) =>
  t
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/** Ventanas de entrega: planes completos temprano, The Lunch al mediodía. */
function ventanas(p: PlanId): string[] {
  const [ini, fin] = p === "the_lunch" ? [11 * 60, 12 * 60 + 40] : [6 * 60, 8 * 60 + 40];
  const out: string[] = [];
  for (let t = ini; t <= fin; t += 20) out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  return out;
}

export default function PlanesPage() {
  return (
    <Suspense>
      <Planes />
    </Suspense>
  );
}

function Planes() {
  const params = useSearchParams();
  const { planesAlim, clientesVersion } = useStore();
  const [sel, setSel] = useState<string | null>(params.get("paciente"));
  const [q, setQ] = useState("");
  // Filtro por plan: todos, Premium o Two Meals.
  const [tipo, setTipo] = useState<"todos" | "premium" | "two_meals">("todos");
  const todas = useMemo(
    () =>
      CLIENTES.filter((c) => !q.trim() || norm(c.nombre).includes(norm(q.trim()))).map((c) => {
        const p = planesAlim.find((x) => x.clienteId === c.id);
        const vencido = !!c.plan && finDelPlan(c) < 0;
        return { c, p, estado: !c.plan || !p ? "Sin plan" : vencido ? "Vencido" : "Activo" };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, planesAlim, clientesVersion],
  );
  const filas = todas.filter((f) => tipo === "todos" || f.p?.plan === tipo);
  const c = sel ? CLIENTES.find((x) => x.id === sel) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader title="Planes de alimentación" sub="Elige al paciente y asígnale su plan. Lo que guardes pasa al perfil que ve la cocina." />
      <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card title="Pacientes" className={cn(c && "hidden lg:block")}>
          <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5">
            <Search size={14} className="text-[var(--text-3)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar paciente" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" />
          </div>
          <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface p-1">
            {(
              [
                ["todos", "Todos"],
                ["premium", "Premium"],
                ["two_meals", "Two Meals"],
              ] as const
            ).map(([id, label]) => {
              const n = id === "todos" ? todas.length : todas.filter((f) => f.p?.plan === id).length;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTipo(id)}
                  aria-pressed={tipo === id}
                  className={cn("rounded-lg px-2 py-1.5 text-[12.5px] font-semibold", tipo === id ? "bg-[var(--entregas)] text-white shadow-sm" : "text-[var(--text-2)] hover:bg-card")}
                >
                  {label} <span className="opacity-70">{n}</span>
                </button>
              );
            })}
          </div>
          {filas.length === 0 && <p className="py-6 text-center text-[12.5px] text-[var(--text-3)]">Nadie con este filtro.</p>}
          <div className="-mx-2 max-h-[65vh] space-y-0.5 overflow-y-auto">
            {filas.map(({ c: x, p, estado }) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setSel(x.id)}
                className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px]", sel === x.id ? "bg-brand/10" : "hover:bg-surface")}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{x.nombre}</span>
                  <span className="block truncate text-[11.5px] text-[var(--text-3)]">{p ? PLAN_INFO[p.plan].label : x.objetivo}</span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold",
                    estado === "Activo" ? "bg-emerald-50 text-emerald-700" : estado === "Vencido" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {estado}
                </span>
              </button>
            ))}
          </div>
        </Card>
        {c ? <Editor key={c.id} c={c} cerrar={() => setSel(null)} /> : <p className="hidden self-center text-center text-[13px] text-[var(--text-3)] lg:block">Elige un paciente de la lista para ver o asignar su plan.</p>}
      </div>
    </div>
  );
}

function Editor({ c, cerrar }: { c: Cliente; cerrar: () => void }) {
  const { planesAlim, guardarPlanAlim, agregarCita, rol, ordenes } = useStore();
  // Paquetes del paciente (esta semana y la próxima), para ver su calendario de comidas.
  const paquetes = ordenes.filter((o) => o.clienteId === c.id).sort((a, b) => a.semana - b.semana);
  const previo = planesAlim.find((x) => x.clienteId === c.id);
  const vigente = !!c.plan && finDelPlan(c) >= 0;
  const [plan, setPlan] = useState<PlanId>(previo?.plan ?? c.plan?.plan ?? "premium");
  const [zona, setZona] = useState(c.plan?.zona ?? "Escalón");
  const [direccion, setDireccion] = useState(c.plan?.direccion ?? "");
  const [hora, setHora] = useState(c.plan?.horaEntrega ?? "");
  const [kcal, setKcal] = useState(String(previo?.kcal ?? 1800));
  const [proteina, setProteina] = useState(String(previo?.proteinaG ?? 110));
  const [porcion, setPorcion] = useState<PlanAlimentacion["porcion"]>(previo?.porcion ?? "Regular");
  const [alergias, setAlergias] = useState<Alergeno[]>(previo?.alergias ?? c.alergias ?? []);
  const [noLeGusta, setNoLeGusta] = useState((previo?.noLeGusta ?? []).join(", "));
  const [leGusta, setLeGusta] = useState((previo?.leGusta ?? []).join(", "));
  const [notas, setNotas] = useState(previo?.notasCocina ?? (c.restricciones ?? []).filter((r) => !r.startsWith("Alergia")).join(". "));
  const [opciones, setOpciones] = useState<Partial<Record<Tiempo, string[]>>>(previo?.opciones ?? {});
  const [ajustes, setAjustes] = useState<Record<string, string>>(previo?.ajustes ?? {});
  const [listo, setListo] = useState<string | null>(null);

  const tiempos = TIEMPOS_PLAN[plan];
  // Ventanas ocupadas mañana por otros pacientes.
  const ocupadas = new Set(CITAS.filter((x) => x.agenda === "entregas" && x.dia === 1 && x.clienteId !== c.id).map((x) => x.hora));
  const horaValida = ventanas(plan).includes(hora) ? hora : "";
  const choques = tiempos.flatMap((t) => (opciones[t] ?? []).filter((id) => !servible(id, alergias, ajustes)));
  const faltan = tiempos.filter((t) => incluido(t, plan) && !(opciones[t] ?? []).length);
  const puede = !faltan.length && !choques.length && (vigente || (direccion.trim() && horaValida));

  const guardar = () => {
    if (!puede) return;
    const p: PlanAlimentacion = {
      clienteId: c.id,
      plan,
      tiempos,
      opciones: Object.fromEntries(tiempos.map((t) => [t, opciones[t] ?? []])),
      ajustes,
      kcal: Number(kcal) || 0,
      proteinaG: Number(proteina) || 0,
      porcion,
      alergias,
      noLeGusta: lista(noLeGusta),
      leGusta: lista(leGusta),
      notasCocina: notas.trim(),
      autor: STAFF.nutricionista.nombre,
      actualizado: "Hoy",
    };
    c.alergias = alergias;
    let orden;
    if (vigente && c.plan) {
      c.plan.plan = plan;
    } else {
      // Plan nuevo: arranca mañana, con una entrega por día hasta el fin de semana que viene.
      c.plan = { plan, inicio: 1, semanas: plan === "the_lunch" ? 1 : 4, zona, direccion: direccion.trim(), horaEntrega: horaValida };
      const servicio = `${PLAN_INFO[plan].label} · ${plan === "the_lunch" ? "almuerzo" : "día completo"}`;
      for (let dia = 1; dia <= 6; dia++) {
        if (diaCorto(dia).domingo) continue;
        const cita: Cita = { id: `e${c.id}${dia}`, agenda: "entregas", clienteId: c.id, servicio, zona, dia, hora: horaValida, duracionMin: 20, estado: "confirmada", origen: "manual" };
        agregarCita(cita);
      }
      // Paquete de la semana en que cae la primera entrega (mañana).
      const semana = lunesDe(0) + 5 >= 1 ? 0 : 1;
      orden = paqueteDe(c, p, semana, { diaLlegada: 0, llegada: ahora(), origen: "Plan nuevo · Lda. Morales", nota: "Primera semana del plan.", estado: "nueva", confirmada: undefined }) ?? undefined;
    }
    guardarPlanAlim(p, orden);
    setListo(vigente ? "Plan actualizado. La cocina ya ve los cambios en el perfil del paciente." : `Plan asignado. La primera entrega sale ${textoFecha(1)} a las ${horaValida} y la orden ya está en la cola de cocina.`);
  };

  const campo = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-[var(--consultas)]";

  return (
    <div className="min-w-0 space-y-5">
      <Card
        title={
          <span className="flex flex-wrap items-center gap-2">
            {c.nombre}
            <span className="rounded-full bg-surface px-2 py-0.5 text-[11.5px] font-semibold text-[var(--text-2)]">
              {c.edad} años · {c.objetivo}
            </span>
          </span>
        }
        sub={previo ? `Plan actual: ${PLAN_INFO[previo.plan].label} · actualizado ${previo.actualizado.toLowerCase() === "hoy" ? "hoy" : `el ${previo.actualizado}`} por ${previo.autor}` : "Todavía no tiene plan de alimentación."}
        action={
          <button type="button" onClick={cerrar} aria-label="Cerrar" className="rounded-lg p-1 text-[var(--text-3)] hover:bg-surface lg:hidden">
            <X size={18} />
          </button>
        }
      >
        <Campo label="Plan">
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(PLAN_INFO) as PlanId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setPlan(id);
                  setHora("");
                }}
                className={cn("rounded-xl border p-3 text-left", plan === id ? "border-[var(--entregas)] bg-[var(--entregas-soft)] ring-1 ring-[var(--entregas)]" : "border-line hover:bg-surface")}
              >
                <p className="text-[14px] font-bold">{PLAN_INFO[id].label}</p>
                <p className="text-[11.5px] text-[var(--text-3)]">{PLAN_INFO[id].detalle}</p>
              </button>
            ))}
          </div>
        </Campo>

        {vigente && c.plan ? (
          <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-[12.5px] text-[var(--text-2)]">
            Entrega en <b>{c.plan.zona}</b> · {c.plan.direccion} · cerca de las {c.plan.horaEntrega}. Los cambios de dirección los coordina MIA con el paciente.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
            <Campo label="Zona *">
              <select value={zona} onChange={(e) => setZona(e.target.value)} className={campo}>
                {ZONAS.map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Dirección de entrega *">
              <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Colonia, calle, casa o edificio" className={campo} />
            </Campo>
            <div className="sm:col-span-2">
              <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">Hora de entrega * · empieza {textoFecha(1)}</span>
              <div className="flex flex-wrap gap-1.5">
                {ventanas(plan).map((h) => {
                  const ocupada = ocupadas.has(h);
                  return (
                    <button
                      key={h}
                      type="button"
                      disabled={ocupada}
                      onClick={() => setHora(h)}
                      title={ocupada ? "Ventana ocupada en la ruta" : undefined}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-[12.5px] font-semibold tabular-nums",
                        horaValida === h ? "border-transparent bg-[var(--entregas)] text-white" : "border-line bg-card text-[var(--text-2)] hover:bg-surface",
                        ocupada && "cursor-not-allowed line-through opacity-40",
                      )}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>

      {previo && paquetes.length > 0 ? (
        <div className="space-y-3 rounded-2xl border border-line bg-card p-4 shadow-sm">
          <div>
            <p className="text-[15px] font-bold">Calendario de comidas</p>
            <p className="text-[12.5px] text-[var(--text-3)]">Lo que lleva cada día según su plan guardado. Al guardar cambios abajo, se actualizan las semanas que la cocina todavía no confirma.</p>
          </div>
          {paquetes.map((o) => (
            <CalendarioSemana key={o.id} o={o} p={previo} />
          ))}
        </div>
      ) : (
        previo && <p className="rounded-xl border border-dashed border-line p-4 text-center text-[12.5px] text-[var(--text-3)]">Todavía no tiene semanas programadas: aparecen aquí cuando su plan esté activo.</p>
      )}

      <Card title="Requerimientos" sub="La cocina arma cada porción con esto">
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo label="Calorías por día">
            <input value={kcal} onChange={(e) => setKcal(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={campo} />
          </Campo>
          <Campo label="Proteína por día (g)">
            <input value={proteina} onChange={(e) => setProteina(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={campo} />
          </Campo>
          <Campo label="Porción">
            <select value={porcion} onChange={(e) => setPorcion(e.target.value as PlanAlimentacion["porcion"])} className={campo}>
              {["Pequeña", "Regular", "Grande"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Campo>
        </div>
        <div className="mt-3">
          <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">Alergias e intolerancias</span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ALERGENOS) as Alergeno[]).map((a) => {
              const on = alergias.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAlergias((xs) => (on ? xs.filter((x) => x !== a) : [...xs, a]))}
                  aria-pressed={on}
                  className={cn("rounded-full border px-3 py-1 text-[12.5px] font-semibold", on ? "border-rose-500 bg-rose-500 text-white" : "border-line text-[var(--text-2)] hover:bg-surface")}
                >
                  {ALERGENOS[a]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Campo label="No le gusta (separado por coma)">
            <input value={noLeGusta} onChange={(e) => setNoLeGusta(e.target.value)} placeholder="Cebolla cruda, picante…" className={campo} />
          </Campo>
          <Campo label="Le gusta (separado por coma)">
            <input value={leGusta} onChange={(e) => setLeGusta(e.target.value)} placeholder="Pollo, aguacate…" className={campo} />
          </Campo>
        </div>
        <div className="mt-3">
          <Campo label="Notas para cocina">
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} placeholder="Sin azúcar añadida, empaque para oficina…" className={campo} />
          </Campo>
        </div>
      </Card>

      <Card
        title="Opciones del menú por tiempo"
        sub={`Elige qué desayunos, almuerzos, cenas y meriendas puede recibir (${tiempos.join(", ")}): la cocina los rota de lunes a sábado. Si un plato trae una de sus alergias, escribe el cambio para poder usarlo.`}
      >
        <OpcionesPlan
          tiempos={tiempos}
          noIncluidos={NO_INCLUIDOS[plan]}
          alergias={alergias}
          opciones={opciones}
          ajustes={ajustes}
          onChange={(o, a) => {
            setOpciones(o);
            setAjustes(a);
          }}
        />
        {choques.length > 0 && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] font-semibold text-rose-700">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> Hay platos con sus alergias sin el cambio escrito: escríbelo o quítalos para poder guardar.
          </p>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {listo ? (
          <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] font-semibold text-emerald-700">
            <ChefHat size={14} /> {listo}
          </p>
        ) : (
          <p className="text-[12px] text-[var(--text-3)]">{faltan.length ? `Falta elegir opciones para: ${faltan.join(", ")}.` : "Al guardar, el plan pasa al perfil del paciente que ve la cocina."}</p>
        )}
        <div className="flex gap-2">
          <Link href={`/demonutricion/pacientes/${c.id}`} className="rounded-xl border border-line bg-card px-4 py-2.5 text-[13.5px] font-bold hover:bg-surface">
            Ver ficha
          </Link>
          <button
            type="button"
            onClick={guardar}
            disabled={!puede || rol !== "nutricionista"}
            title={rol !== "nutricionista" ? "Solo la nutricionista asigna planes" : undefined}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--consultas)] px-4 py-2.5 text-[13.5px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={15} /> {previo ? "Guardar y avisar a cocina" : "Asignar plan y enviar a cocina"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">{label}</span>
      {children}
    </label>
  );
}
