"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, MessageCircle, Search, Sparkles, UserPlus } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { etiquetaDia, fechaLegible, PLAN_INFO } from "@/lib/nutricion/format";
import { CITAS, CLIENTES, planActivo } from "@/lib/nutricion/seed";
import { useStore } from "@/lib/nutricion/store";
import type { Canal, PlanId } from "@/lib/nutricion/types";
import { AgendaPill, Avatar, ChannelBadge } from "@/components/nutricion/ui";

// Lista de pacientes al estilo de "Contacts" de un CRM: vistas en pestañas,
// buscador, filtros y tabla. Cada fila abre la ficha del paciente.

type Vista = "todos" | "confirmar" | "plan" | "mia" | "revisar";
type Orden = { col: "nombre" | "ultima" | "proxima"; asc: boolean };

const sinEspacios = (t: string) => t.replace(/\s/g, "");
// Minúsculas y sin tildes: "maria jose" encuentra a "María José".
const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function PacientesPage() {
  const router = useRouter();
  const { visitas, conversacionDe, setConvSel, rol, clientesVersion } = useStore();
  const chat = rol === "secretaria";
  const [vista, setVista] = useState<Vista>("todos");
  const [q, setQ] = useState("");
  const [canal, setCanal] = useState<"todos" | Canal>("todos");
  const [plan, setPlan] = useState<"todos" | PlanId | "sin">("todos");
  const [orden, setOrden] = useState<Orden>({ col: "ultima", asc: false });
  // Perfiles creados por MIA que recepción ya revisó (en el demo vive solo en esta pantalla).
  const [revisados, setRevisados] = useState<Set<string>>(new Set());

  const abrirChat = (id: string) => {
    setConvSel(conversacionDe(id));
    router.push("/demonutricion");
  };

  // Datos derivados por paciente: última consulta, próxima cita y plan activo.
  const filas = useMemo(
    () =>
      CLIENTES.map((c) => {
        const ultima = visitas.filter((v) => v.clienteId === c.id && v.agenda === "consultas").sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora))[0];
        const proxima = CITAS.filter((x) => x.clienteId === c.id && x.agenda === "consultas" && x.dia >= 0 && !["completada", "cancelada", "reagendada"].includes(x.estado)).sort(
          (a, b) => a.dia - b.dia || a.hora.localeCompare(b.hora),
        )[0];
        const porConfirmar = CITAS.some((x) => x.clienteId === c.id && x.agenda === "consultas" && x.dia >= 0 && x.estado === "por_confirmar");
        const conPlan = planActivo(c);
        const deMia = !!c.creadoPorIA;
        return { c, ultima, proxima, porConfirmar, conPlan, deMia, porRevisar: deMia && !revisados.has(c.id) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visitas, revisados, clientesVersion],
  );

  const enVista = (f: (typeof filas)[number], v: Vista) =>
    v === "todos" || (v === "confirmar" && f.porConfirmar) || (v === "plan" && f.conPlan) || (v === "mia" && f.deMia) || (v === "revisar" && f.porRevisar);

  const VISTAS: { id: Vista; label: string }[] = [
    { id: "todos", label: "Todos los pacientes" },
    { id: "confirmar", label: "Cita por confirmar" },
    { id: "plan", label: "Con plan activo" },
    { id: "mia", label: "Creados por MIA" },
    { id: "revisar", label: "Por revisar" },
  ];

  const t = norm(q.trim());
  const lista = filas
    .filter((f) => enVista(f, vista))
    .filter((f) => canal === "todos" || f.c.canal === canal)
    .filter((f) => plan === "todos" || (plan === "sin" ? !f.conPlan : f.conPlan && f.c.plan?.plan === plan))
    .filter(
      ({ c }) =>
        !t ||
        norm(c.nombre).includes(t) ||
        norm(c.correo).includes(t) ||
        sinEspacios(c.telefono).includes(sinEspacios(t)) ||
        norm(c.objetivo).includes(t) ||
        (!!c.plan && norm(c.plan.zona).includes(t)),
    )
    .sort((a, b) => {
      const s = orden.asc ? 1 : -1;
      if (orden.col === "nombre") return s * a.c.nombre.localeCompare(b.c.nombre);
      if (orden.col === "ultima") return s * ((a.ultima?.fecha ?? "").localeCompare(b.ultima?.fecha ?? ""));
      const pa = a.proxima ? a.proxima.dia * 10000 + Number(a.proxima.hora.replace(":", "")) : Infinity;
      const pb = b.proxima ? b.proxima.dia * 10000 + Number(b.proxima.hora.replace(":", "")) : Infinity;
      return s * (pa === pb ? 0 : pa < pb ? -1 : 1);
    });

  const ordenar = (col: Orden["col"]) => setOrden((o) => (o.col === col ? { col, asc: !o.asc } : { col, asc: col !== "ultima" }));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line bg-card px-6 pt-4">
        <div className="w-full">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="text-[22px] font-extrabold tracking-tight">Pacientes</h1>
            <span className="text-[13px] text-[var(--text-3)]">{CLIENTES.length} registros</span>
            {rol === "nutricionista" && (
              <Link href="/demonutricion/herramientas/nuevo-paciente" className="ml-auto inline-flex items-center gap-1 rounded-lg bg-[var(--consultas)] px-3 py-1.5 text-[12.5px] font-bold text-white hover:opacity-90">
                <UserPlus size={14} /> Nuevo paciente
              </Link>
            )}
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto">
            {VISTAS.map((v) => {
              const n = filas.filter((f) => enVista(f, v.id)).length;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVista(v.id)}
                  className={cn(
                    "shrink-0 rounded-t-lg border border-b-0 px-3.5 py-2 text-[13px] font-semibold transition",
                    vista === v.id ? "border-line bg-surface text-[var(--text)]" : "border-transparent text-[var(--text-3)] hover:text-[var(--text)]",
                  )}
                >
                  {v.label} <span className="ml-0.5 text-[11.5px] opacity-60">{n}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <div className="rounded-2xl border border-line bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <div className="flex min-w-[220px] flex-1 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 sm:max-w-xs">
              <Search size={14} className="text-[var(--text-3)]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar paciente, teléfono, correo, objetivo o zona" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" />
            </div>
            <Filtro label="Canal" value={canal} onChange={(v) => setCanal(v as typeof canal)} opciones={[["todos", "Todos"], ["whatsapp", "WhatsApp"], ["instagram", "Instagram"], ["facebook", "Facebook"]]} />
            <Filtro
              label="Plan"
              value={plan}
              onChange={(v) => setPlan(v as typeof plan)}
              opciones={[["todos", "Todos"], ["premium", "Premium"], ["two_meals", "Two Meals"], ["the_lunch", "The Lunch"], ["sin", "Sin plan activo"]]}
            />
            <span className="ml-auto text-[12.5px] text-[var(--text-3)]">{lista.length} {lista.length === 1 ? "paciente" : "pacientes"}</span>
          </div>

          <div className="divide-y divide-line md:hidden">
            {lista.map(({ c, ultima, proxima, conPlan, deMia, porRevisar }) => (
              <div key={c.id} className={cn("px-3 py-3", porRevisar && "bg-violet-50/40")}>
                <div className="flex items-start gap-3">
                  <Link href={`/demonutricion/pacientes/${c.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                    <Avatar nombre={c.nombre} size={38} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-brand">{c.nombre}</span>
                      <span className="block truncate text-[12.5px] text-[var(--text-2)]">{c.objetivo}</span>
                      <span className="block truncate text-[12px] text-[var(--text-3)]">{c.telefono}</span>
                    </span>
                  </Link>
                  {chat && (
                    <button
                      type="button"
                      onClick={() => abrirChat(c.id)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-brand/40 bg-brand/5 px-2.5 py-1.5 text-[12px] font-semibold text-brand"
                    >
                      <MessageCircle size={13} /> Chat
                    </button>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-[50px] text-[11.5px]">
                  <ChannelBadge canal={c.canal} />
                  {ultima && <span className="text-[var(--text-3)]">Última: {fechaLegible(ultima.fecha)}</span>}
                  {proxima && (
                    <span className="text-[var(--text-3)]">
                      · Próxima: {etiquetaDia(proxima.dia)} {proxima.hora}
                    </span>
                  )}
                  {conPlan && c.plan && <span className="rounded bg-orange-50 px-1 font-semibold text-orange-700">{PLAN_INFO[c.plan.plan].label}</span>}
                  {deMia && <span className="rounded bg-violet-50 px-1 font-semibold text-violet-700">{porRevisar ? "Por revisar" : "MIA · revisado"}</span>}
                  {porRevisar && (
                    <button type="button" onClick={() => setRevisados((x) => new Set(x).add(c.id))} className="font-semibold text-violet-700 underline">
                      Marcar revisado
                    </button>
                  )}
                </div>
              </div>
            ))}
            {lista.length === 0 && <p className="p-8 text-center text-[13px] text-[var(--text-3)]">Ningún paciente coincide con la búsqueda.</p>}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-left text-[13px]">
              <thead className="bg-surface/70 text-[11px] uppercase tracking-wider text-[var(--text-3)]">
                <tr>
                  <Th onClick={() => ordenar("nombre")} activo={orden.col === "nombre"} asc={orden.asc}>Nombre</Th>
                  <th className="px-3 py-2.5 font-bold">Plan y objetivo</th>
                  <th className="px-3 py-2.5 font-bold">Correo</th>
                  <th className="px-3 py-2.5 font-bold">Teléfono</th>
                  <Th onClick={() => ordenar("ultima")} activo={orden.col === "ultima"} asc={orden.asc}>Última consulta</Th>
                  <Th onClick={() => ordenar("proxima")} activo={orden.col === "proxima"} asc={orden.asc}>Próxima cita</Th>
                  <th className="px-3 py-2.5 font-bold">Canal</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lista.map(({ c, ultima, proxima, conPlan, deMia, porRevisar }) => (
                  <tr key={c.id} onClick={() => router.push(`/demonutricion/pacientes/${c.id}`)} className={cn("group cursor-pointer align-top hover:bg-surface/70", porRevisar && "bg-violet-50/40")}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar nombre={c.nombre} size={32} />
                        <div className="min-w-0 leading-tight">
                          <Link href={`/demonutricion/pacientes/${c.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-brand hover:underline">
                            {c.nombre}
                          </Link>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {c.restricciones?.map((r) => (
                              <span key={r} className="rounded bg-amber-50 px-1 text-[10.5px] font-semibold text-amber-800">
                                {r}
                              </span>
                            ))}
                            {deMia && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-violet-50 px-1 text-[10.5px] font-semibold text-violet-700">
                                <Sparkles size={10} /> {porRevisar ? "Por revisar" : "MIA · revisado"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {conPlan && c.plan ? (
                        <span className="inline-flex rounded-md bg-orange-50 px-1.5 py-0.5 text-[11.5px] font-bold text-orange-700">{PLAN_INFO[c.plan.plan].label}</span>
                      ) : (
                        <span className="text-[12px] text-[var(--text-3)]">{c.plan ? "Plan vencido" : "Sin plan"}</span>
                      )}
                      <p className="mt-1 max-w-[220px] text-[12.5px] text-[var(--text-2)]">{c.objetivo}</p>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--text-2)]">{c.correo}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-2)]">{c.telefono}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {ultima ? (
                        <div className="flex flex-col items-start gap-1">
                          <span>{fechaLegible(ultima.fecha)}</span>
                          <AgendaPill agenda={ultima.agenda} />
                        </div>
                      ) : (
                        <span className="text-[var(--text-3)]">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {proxima ? (
                        <div className="flex flex-col items-start gap-1">
                          <span>{etiquetaDia(proxima.dia)} · {proxima.hora}</span>
                          <AgendaPill agenda={proxima.agenda} />
                        </div>
                      ) : (
                        <span className="text-[var(--text-3)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5"><ChannelBadge canal={c.canal} label /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col items-end gap-1.5">
                        {chat && <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirChat(c.id);
                          }}
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-brand/40 bg-brand/5 px-2 py-1 text-[11.5px] font-semibold text-brand hover:bg-brand/10"
                        >
                          <MessageCircle size={12} /> Chat
                        </button>}
                        {porRevisar && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRevisados((s) => new Set(s).add(c.id));
                            }}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-violet-300 bg-white px-2 py-1 text-[11.5px] font-semibold text-violet-700 hover:bg-violet-50"
                          >
                            <CheckCircle2 size={12} /> Marcar revisado
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lista.length === 0 && <p className="p-10 text-center text-[13px] text-[var(--text-3)]">Ningún paciente coincide con la búsqueda.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Th({ children, onClick, activo, asc }: { children: string; onClick: () => void; activo: boolean; asc: boolean }) {
  const Icon = !activo ? ArrowUpDown : asc ? ArrowUp : ArrowDown;
  return (
    <th className="px-3 py-2.5">
      <button type="button" onClick={onClick} className={cn("inline-flex items-center gap-1 font-bold uppercase tracking-wider", activo ? "text-[var(--text)]" : "hover:text-[var(--text)]")}>
        {children} <Icon size={12} />
      </button>
    </th>
  );
}

function Filtro({ label, value, onChange, opciones }: { label: string; value: string; onChange: (v: string) => void; opciones: [string, string][] }) {
  return (
    <label className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px]", value === opciones[0][0] ? "border-line" : "border-brand/50 bg-brand/5")}>
      <span className="font-semibold text-[var(--text-3)]">{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent font-semibold outline-none">
        {opciones.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

