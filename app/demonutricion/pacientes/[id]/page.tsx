"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarClock,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardPen,
  Copy,
  Download,
  FileText,
  MapPin,
  MessageCircle,
  Plus,
  Salad,
  Sparkles,
  Truck,
  X,
  Check,
  ChefHat,
  ClipboardList,
  CalendarDays,
  Printer,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { AGENDA_INFO, diaCorto, etiquetaDia, fechaLegible, isoDeTexto, menuVigente, PLAN_INFO, textoFecha } from "@/lib/nutricion/format";
import { ALERGENOS, COCINA_PLAN, COMIDAS_PLAN, enCocina, incluido, NO_INCLUIDOS, plato, semanaTexto, servible } from "@/lib/nutricion/cocina";
import { OpcionesPlan } from "@/components/nutricion/OpcionesPlan";
import { ESTADO_DIA, ESTADO_ORDEN } from "@/components/nutricion/cocinaUi";
import { CITAS, CLIENTES, finDelPlan, STAFF } from "@/lib/nutricion/seed";
import { useStore } from "@/lib/nutricion/store";
import type { Agenda, Cita, Cliente, Conversacion, Menu as MenuT, Orden, PlanAlimentacion, Tiempo, Visita } from "@/lib/nutricion/types";
import { AgendaPill, Avatar, ChannelBadge, EstadoCitaPill } from "@/components/nutricion/ui";
import { Menu, MenuModal, NotaModal, ResumenBloque, ResumenModal } from "@/components/nutricion/ResumenConsulta";
import { descargarMenu, nombreArchivo } from "@/lib/nutricion/menuPdf";
import { CalendarioSemana } from "@/components/nutricion/CalendarioSemana";

// Ficha del paciente: a la izquierda sus datos (con el menú de acciones) y su
// plan de comidas; al centro su seguimiento (Overview, Menús, Entregas); a la
// derecha las próximas citas y la conversación.

export default function PacientePage() {
  const { id } = useParams<{ id: string }>();
  const c = CLIENTES.find((x) => x.id === id);
  if (!c) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="font-bold">No encontramos ese paciente.</p>
        <Link href="/demonutricion/pacientes" className="rounded-lg bg-brand px-3 py-1.5 text-[13px] font-bold text-white">
          Volver a Pacientes
        </Link>
      </div>
    );
  }
  return <Ficha key={c.id} c={c} />;
}

type Modal = { tipo: "resumen"; visita?: Visita } | { tipo: "nota" } | { tipo: "menu" } | null;
type Tab = "overview" | "alimentacion" | "menus" | "entregas";

interface Acciones {
  abrirConversacion: () => void;
  agendar: (a: Agenda, dia?: number) => void;
  resumir: (v?: Visita) => void;
  nota: () => void;
  menu: () => void;
}

function Ficha({ c }: { c: Cliente }) {
  const router = useRouter();
  const { conversacionDe, setConvSel, setCalendario, setDiaCalendario, visitas, conversaciones, rol } = useStore();
  const [modal, setModal] = useState<Modal>(null);
  const [tab, setTab] = useState<Tab>("overview");
  // Aviso al pie: cita agendada desde un resumen o menú enviado.
  const [aviso, setAviso] = useState<{ tipo: "cita"; cita: Cita } | { tipo: "menu"; menu: MenuT } | null>(null);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 8000);
    return () => clearTimeout(t);
  }, [aviso]);

  const suyas = useMemo(() => visitas.filter((v) => v.clienteId === c.id), [visitas, c.id]);
  const conv = conversaciones.find((x) => x.clienteId === c.id);

  const abrirConversacion = () => {
    setConvSel(conversacionDe(c.id));
    router.push("/demonutricion");
  };
  const agendar = (a: Agenda, dia = 0) => {
    setCalendario(a);
    setDiaCalendario(dia);
    router.push("/demonutricion/agendas");
  };
  const acciones: Acciones = {
    abrirConversacion,
    agendar,
    resumir: (v?: Visita) => setModal({ tipo: "resumen", visita: v }),
    nota: () => setModal({ tipo: "nota" }),
    menu: () => setModal({ tipo: "menu" }),
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3 outline-none sm:p-4">
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <Paciente c={c} acciones={acciones} />
          <PlanCard c={c} verEntregas={() => setTab("entregas")} />
        </div>
        <div className="min-w-0 lg:row-span-2 2xl:row-span-1">
          <Centro c={c} tab={tab} setTab={setTab} visitas={suyas} acciones={acciones} />
        </div>
        <div className="space-y-4 lg:col-start-1 2xl:col-start-3 2xl:row-start-1">
          <ProximasCitas c={c} />
          <ConversacionCard conv={conv} abrir={rol === "secretaria" ? abrirConversacion : undefined} />
        </div>
      </div>

      {modal?.tipo === "resumen" && <ResumenModal c={c} visita={modal.visita} onClose={() => setModal(null)} onAgendada={(cita) => setAviso({ tipo: "cita", cita })} />}
      {modal?.tipo === "nota" && <NotaModal c={c} onClose={() => setModal(null)} />}
      {modal?.tipo === "menu" && (
        <MenuModal
          c={c}
          onClose={() => setModal(null)}
          onEnviado={(menu) => {
            setTab("menus");
            setAviso({ tipo: "menu", menu });
          }}
        />
      )}
      {aviso && (
        <div role="status" className="fixed bottom-4 left-1/2 z-[70] flex w-[min(520px,calc(100vw-32px))] -translate-x-1/2 items-center gap-3 rounded-xl bg-[var(--text)] px-4 py-3 text-[13px] text-white shadow-2xl">
          {aviso.tipo === "cita" ? <CalendarPlus size={18} className="shrink-0" /> : <Salad size={18} className="shrink-0" />}
          <span className="min-w-0 flex-1">
            {aviso.tipo === "cita" ? (
              <>
                Cita agendada: <b>{aviso.cita.servicio}</b>, {etiquetaDia(aviso.cita.dia).toLowerCase()} a las {aviso.cita.hora}.
              </>
            ) : (
              <>Menú enviado por {aviso.menu.canal === "correo" ? `correo a ${c.correo}` : `WhatsApp al ${c.telefono}`}.</>
            )}
          </span>
          {aviso.tipo === "cita" ? (
            <button type="button" onClick={() => agendar(aviso.cita.agenda, aviso.cita.dia)} className="shrink-0 font-bold text-violet-300 hover:underline">
              Ver en calendario
            </button>
          ) : (
            <button type="button" onClick={() => descargarMenu(aviso.menu)} className="shrink-0 font-bold text-violet-300 hover:underline">
              Descargar PDF
            </button>
          )}
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso" className="shrink-0 text-white/60 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Columna izquierda: paciente y plan ---------- */

function Paciente({ c, acciones }: { c: Cliente; acciones: Acciones }) {
  const tel = c.telefono.replace(/\s/g, "");
  const { rol } = useStore();
  const router = useRouter();
  return (
    <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Link href="/demonutricion/pacientes" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--text-2)] hover:text-brand">
          <ChevronLeft size={16} /> Pacientes
        </Link>
        <Menu
          label="Acciones"
          items={[
            ...(rol === "secretaria" ? [{ label: "Abrir conversación", onClick: acciones.abrirConversacion }] : []),
            ...(rol === "nutricionista" ? [{ label: "Asignar plan de alimentación", onClick: () => router.push(`/demonutricion/herramientas/planes?paciente=${c.id}`) }] : []),
            { label: "Escribir menú", onClick: acciones.menu },
            { label: "Resumir consulta", onClick: () => acciones.resumir() },
            { label: "Agendar consulta", onClick: () => acciones.agendar("consultas") },
            { label: "Ver entregas en calendario", onClick: () => acciones.agendar("entregas") },
            { label: "Enviar correo", href: `mailto:${c.correo}` },
            { label: "Agregar nota", onClick: acciones.nota },
          ]}
        />
      </div>

      <div className="mt-4 flex items-start gap-3">
        <Avatar nombre={c.nombre} size={48} />
        <div className="min-w-0">
          <h1 className="text-[19px] font-extrabold leading-tight tracking-tight">{c.nombre}</h1>
          <p className="mt-0.5 text-[12.5px] text-[var(--text-3)]">
            {c.edad} años · {c.modalidad === "en_linea" ? "Consulta en línea" : "Consulta presencial"}
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-1 text-[13px]">
        <Copiable valor={c.correo} href={`mailto:${c.correo}`} />
        <Copiable valor={c.telefono} href={`tel:${tel}`} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <ChannelBadge canal={c.canal} label />
        {c.creadoPorIA && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11.5px] font-semibold text-violet-700">
            <Sparkles size={11} /> Creado por MIA
          </span>
        )}
        {c.etiquetas?.map((e) => (
          <span key={e} className="rounded-full bg-surface px-2 py-0.5 text-[11.5px] font-semibold text-[var(--text-2)]">
            {e}
          </span>
        ))}
      </div>
      <dl className="mt-3 space-y-2 border-t border-line pt-3 text-[12.5px]">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">Objetivo</dt>
          <dd className="mt-0.5 font-semibold">{c.objetivo}</dd>
        </div>
        {c.alergias?.length ? (
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">Alergias</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {c.alergias.map((a) => (
                <span key={a} className="rounded-md bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-700">
                  {ALERGENOS[a]}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
        {(c.fechaNacimiento || c.alturaCm) && (
          <div className="flex gap-4">
            {c.fechaNacimiento && (
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">Nacimiento</dt>
                <dd className="mt-0.5 font-semibold">{fechaLegible(c.fechaNacimiento)}</dd>
              </div>
            )}
            {c.alturaCm && (
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">Altura</dt>
                <dd className="mt-0.5 font-semibold">{c.alturaCm} cm</dd>
              </div>
            )}
          </div>
        )}
        {c.restricciones?.filter((r) => !r.startsWith("Alergia")).length ? (
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">Restricciones</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {c.restricciones.filter((r) => !r.startsWith("Alergia")).map((r) => (
                <span key={r} className="rounded-md bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800">
                  {r}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
        {c.productos?.length ? (
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">Productos digitales</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {c.productos.map((p) => (
                <span key={p} className="rounded-md bg-violet-50 px-1.5 py-0.5 font-semibold text-violet-700">
                  {p}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

function Copiable({ valor, href }: { valor: string; href: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <p className="flex items-center gap-1.5">
      <a href={href} className="min-w-0 truncate font-semibold text-brand hover:underline">
        {valor}
      </a>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard
            ?.writeText(valor)
            .then(() => {
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1200);
            })
            .catch(() => {});
        }}
        title="Copiar"
        aria-label={`Copiar ${valor}`}
        className="shrink-0 rounded p-0.5 text-[var(--text-3)] hover:bg-surface"
      >
        <Copy size={13} />
      </button>
      {copiado && <span className="text-[11px] font-semibold text-emerald-700">Copiado</span>}
    </p>
  );
}

/** Plan de comidas a domicilio: cuál es, en qué semana va y a dónde se entrega. */
function PlanCard({ c, verEntregas }: { c: Cliente; verEntregas: () => void }) {
  const p = c.plan;
  if (!p) {
    return (
      <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <p className="text-[14px] font-bold">Plan de comidas</p>
        <p className="mt-1 text-[12.5px] text-[var(--text-3)]">Sin plan a domicilio: sigue su menú en casa. Puede contratar Premium, Two Meals o The Lunch.</p>
      </section>
    );
  }
  const info = PLAN_INFO[p.plan];
  const fin = finDelPlan(c);
  const vencido = fin < 0;
  const semanal = p.plan === "the_lunch";
  const porEmpezar = p.inicio > 0;
  const semana = Math.min(p.semanas, Math.floor(-p.inicio / 7) + 1);
  return (
    <section className={cn("rounded-2xl border bg-card p-4 shadow-sm", vencido ? "border-amber-300" : "border-line")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--entregas)" }}>
            Plan de comidas
          </p>
          <p className="mt-0.5 text-[17px] font-extrabold leading-tight">{info.label}</p>
          <p className="text-[12px] text-[var(--text-3)]">{info.detalle}</p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", vencido ? "bg-amber-100 text-amber-800" : porEmpezar ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-700")}>
          {vencido ? "Vencido" : porEmpezar ? "Empieza mañana" : "Activo"}
        </span>
      </div>
      {vencido ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-2 text-[12.5px] text-amber-900">Terminó el {textoFecha(fin)}. MIA le ofreció renovarlo; el precio y el enlace de pago los envía el equipo.</p>
      ) : semanal ? (
        <p className="mt-3 text-[12.5px] text-[var(--text-2)]">Suscripción semanal · elige su almuerzo cada sábado por WhatsApp.</p>
      ) : (
        !porEmpezar && (
          <div className="mt-3">
            <div className="flex justify-between text-[12px]">
              <span className="font-semibold">
                Semana {semana} de {p.semanas}
              </span>
              <span className="text-[var(--text-3)]">Termina el {textoFecha(fin)}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-surface-2">
              <div className="h-2 rounded-full" style={{ width: `${Math.min(100, Math.round(((-p.inicio + 1) / (p.semanas * 7)) * 100))}%`, backgroundColor: "var(--entregas)" }} />
            </div>
          </div>
        )
      )}
      {!vencido && (
        <>
          <div className="mt-3 space-y-1 text-[12.5px]">
            <p className="flex items-start gap-1.5">
              <MapPin size={13} className="mt-0.5 shrink-0 text-[var(--text-3)]" />
              <span>
                <b>{p.zona}</b> · {p.direccion}
              </span>
            </p>
            <p className="flex items-center gap-1.5">
              <Truck size={13} className="shrink-0 text-[var(--text-3)]" /> Entrega cerca de las {p.horaEntrega}, lunes a sábado
            </p>
          </div>
          <button type="button" onClick={verEntregas} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand hover:underline">
            Ver entregas <ChevronRight size={14} />
          </button>
        </>
      )}
    </section>
  );
}

/* ---------- Columna central: seguimiento ---------- */

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "alimentacion", label: "Plan alimenticio" },
  { id: "menus", label: "Menús" },
  { id: "entregas", label: "Entregas" },
];

function Centro({ c, tab, setTab, visitas, acciones }: { c: Cliente; tab: Tab; setTab: (t: Tab) => void; visitas: Visita[]; acciones: Acciones }) {
  return (
    <section className="rounded-2xl border border-line bg-card shadow-sm">
      <div className="grid grid-cols-2 border-b border-line sm:grid-cols-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "border-b-2 px-2 py-3 text-[13px] font-semibold transition sm:px-3 sm:text-[14px] sm:first:rounded-tl-2xl sm:last:rounded-tr-2xl",
              tab === t.id ? "border-brand text-[var(--text)]" : "border-transparent bg-surface/60 text-[var(--text-3)] hover:text-[var(--text)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === "overview" && <TabOverview c={c} visitas={visitas} acciones={acciones} irA={setTab} />}
        {tab === "alimentacion" && <TabAlimentacion c={c} />}
        {tab === "menus" && <TabMenus c={c} nuevo={acciones.menu} />}
        {tab === "entregas" && <TabEntregas c={c} acciones={acciones} />}
      </div>
    </section>
  );
}

const proximasDe = (c: Cliente, agenda?: Agenda) =>
  CITAS.filter((x) => x.clienteId === c.id && (!agenda || x.agenda === agenda) && x.dia >= 0 && !["completada", "cancelada", "reagendada"].includes(x.estado)).sort(
    (a, b) => a.dia - b.dia || a.hora.localeCompare(b.hora),
  );

/* Overview */

type Punto = { fecha: string; valor: number };

/** Medidas de cada consulta resumida, de la más antigua a la más reciente. */
function useProgreso(visitas: Visita[]) {
  const { resumenes } = useStore();
  const orden = [...visitas].filter((v) => resumenes[v.id]).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));
  const serie = (k: "pesoKg" | "grasaPct" | "musculoKg"): Punto[] =>
    orden.flatMap((v) => {
      const n = Number(resumenes[v.id][k]);
      return Number.isFinite(n) && n > 0 ? [{ fecha: v.fecha, valor: n }] : [];
    });
  return { peso: serie("pesoKg"), grasa: serie("grasaPct"), musculo: serie("musculoKg") };
}

function TabOverview({ c, visitas, acciones, irA }: { c: Cliente; visitas: Visita[]; acciones: Acciones; irA: (t: Tab) => void }) {
  const { menus, notas } = useStore();
  const vigente = menus.filter((m) => m.clienteId === c.id && menuVigente(m)).sort((a, b) => isoDeTexto(b.fecha).localeCompare(isoDeTexto(a.fecha)))[0];
  const susNotas = notas.filter((n) => n.clienteId === c.id);
  const prog = useProgreso(visitas);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[14px] font-bold">Composición corporal</p>
          <p className="text-[12px] text-[var(--text-3)]">
            {prog.peso.length > 1 ? `Desde la primera consulta (${fechaLegible(prog.peso[0].fecha)})` : prog.peso.length === 1 ? "Primera medición" : "Sin mediciones todavía"}
          </p>
        </div>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <Medida titulo="Peso" unidad="kg" puntos={prog.peso} mejor="baja" color="var(--brand-blue)" />
          <Medida titulo="Grasa corporal" unidad="%" puntos={prog.grasa} mejor="baja" color="var(--entregas)" />
          <Medida titulo="Masa muscular" unidad="kg" puntos={prog.musculo} mejor="sube" color="var(--consultas)" />
        </div>
        <p className="mt-2 text-[11.5px] text-[var(--text-3)]">Lo importante no es solo el peso: también la grasa corporal y la masa muscular.</p>
      </div>

      <Historial
        visitas={visitas.filter((v) => v.agenda === "consultas")}
        accion={
          <button type="button" onClick={() => acciones.resumir()} className="inline-flex items-center gap-1 rounded-lg bg-[var(--consultas)] px-3 py-1.5 text-[12.5px] font-bold text-white hover:opacity-90">
            <ClipboardPen size={14} /> Resumir consulta
          </button>
        }
        acciones={acciones}
        vacio={`${c.nombre.split(" ")[0]} todavía no tiene consultas.`}
      />

      {vigente && (
        <div className="rounded-xl border border-line p-4">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold">Menú vigente</p>
            <button type="button" onClick={() => irA("menus")} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand hover:underline">
              Ver menús <ChevronRight size={14} />
            </button>
          </div>
          <ul className="mt-2 space-y-1.5 text-[13px]">
            {vigente.items.map((i) => (
              <li key={i.tiempo} className="flex flex-wrap items-baseline gap-x-2">
                <span className="w-24 shrink-0 text-[11.5px] font-bold uppercase tracking-wide text-[var(--consultas)]">{i.tiempo}</span>
                <span className="min-w-0 flex-1">{i.comida}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-line p-4">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-bold">Notas del paciente</p>
          <button type="button" onClick={acciones.nota} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand">
            <Plus size={14} /> Agregar
          </button>
        </div>
        {susNotas.length === 0 && <p className="mt-2 text-[13px] text-[var(--text-3)]">Sin notas.</p>}
        <div className="mt-2 space-y-2">
          {susNotas.slice(0, 3).map((n) => (
            <div key={n.id} className="rounded-lg bg-surface px-3 py-2 text-[13px]">
              <p>{n.texto}</p>
              <p className="mt-1 text-[11.5px] text-[var(--text-3)]">
                {n.autor} · {fechaLegible(n.fecha)} {n.hora}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Una medida con su valor actual, el cambio desde la primera consulta y una línea de progreso. */
function Medida({ titulo, unidad, puntos, mejor, color }: { titulo: string; unidad: string; puntos: Punto[]; mejor: "sube" | "baja"; color: string }) {
  const ultimo = puntos[puntos.length - 1];
  const delta = puntos.length > 1 ? ultimo.valor - puntos[0].valor : 0;
  const bien = mejor === "sube" ? delta > 0 : delta < 0;
  const W = 120;
  const H = 34;
  const min = Math.min(...puntos.map((p) => p.valor));
  const max = Math.max(...puntos.map((p) => p.valor));
  const xy = puntos.map((p, i) => [puntos.length === 1 ? W / 2 : (i / (puntos.length - 1)) * (W - 8) + 4, max === min ? H / 2 : H - 4 - ((p.valor - min) / (max - min)) * (H - 8)]);
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="text-[12px] text-[var(--text-3)]">{titulo}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-[22px] font-extrabold leading-none tabular-nums">
          {ultimo ? ultimo.valor.toFixed(1) : "—"}
          <span className="ml-0.5 text-[13px] font-bold text-[var(--text-3)]">{ultimo ? unidad : ""}</span>
        </p>
        {puntos.length > 1 && (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0" aria-hidden>
            <polyline points={xy.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {xy.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i === xy.length - 1 ? 3 : 2} fill={color} />
            ))}
          </svg>
        )}
      </div>
      <p className={cn("mt-1.5 text-[11.5px] font-semibold", puntos.length < 2 ? "text-[var(--text-3)]" : bien ? "text-emerald-700" : delta === 0 ? "text-[var(--text-3)]" : "text-amber-700")}>
        {puntos.length < 2 ? (puntos.length ? "Primera medición" : "Sin medición") : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} ${unidad} · ${puntos.length} mediciones`}
      </p>
    </div>
  );
}

/** Línea de tiempo de consultas, con el resumen de la nutricionista. */
function Historial({ visitas, accion, acciones, vacio }: { visitas: Visita[]; accion?: ReactNode; acciones: Acciones; vacio: string }) {
  const { resumenes } = useStore();
  const [todas, setTodas] = useState(false);
  const orden = [...visitas].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));
  // La consulta resumida más reciente abre desplegada.
  const [abierta, setAbierta] = useState<string | null>(() => orden.find((v) => resumenes[v.id])?.id ?? null);
  const lista = todas ? orden : orden.slice(0, 5);

  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[14px] font-bold">Historial de consultas</p>
          <p className="text-[12.5px] text-[var(--text-3)]">Cada consulta con el resumen de la nutricionista (uso interno).</p>
        </div>
        {accion}
      </div>

      {orden.length === 0 && <p className="py-8 text-center text-[13px] text-[var(--text-3)]">{vacio}</p>}
      <ol className="relative mt-4 space-y-3 border-l-2 border-line pl-5">
        {lista.map((v) => {
          const r = resumenes[v.id];
          const ver = abierta === v.id;
          return (
            <li key={v.id} className="relative">
              <span className="absolute -left-[27px] top-3.5 h-3 w-3 rounded-full border-2 border-card" style={{ backgroundColor: AGENDA_INFO[v.agenda].color }} />
              <div className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-bold">
                      {fechaLegible(v.fecha)} · {v.hora}
                      <span className="font-normal text-[var(--text-2)]">· {v.servicio}</span>
                    </p>
                    {r ? (
                      <p className="mt-1 text-[12.5px] text-[var(--text-2)]">
                        {r.pesoKg && (
                          <>
                            <b>{r.pesoKg} kg</b>
                            {r.grasaPct ? ` · ${r.grasaPct}% grasa` : ""} ·{" "}
                          </>
                        )}
                        <b>Control:</b> {r.proximoControl}
                      </p>
                    ) : (
                      <p className="mt-1 text-[12.5px] text-amber-700">Sin resumen de consulta</p>
                    )}
                  </div>
                  {r ? (
                    <button type="button" onClick={() => setAbierta(ver ? null : v.id)} className="text-[12.5px] font-semibold text-brand hover:underline">
                      {ver ? "Ocultar" : "Ver resumen"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => acciones.resumir(v)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--consultas)] px-2 py-1 text-[12px] font-semibold text-[var(--consultas)] hover:bg-[var(--consultas-soft)]"
                    >
                      <ClipboardPen size={13} /> Resumir
                    </button>
                  )}
                </div>
                {ver && r && (
                  <>
                    <ResumenBloque r={r} className="mt-3" />
                    <button type="button" onClick={() => acciones.resumir(v)} className="mt-2 text-[12px] font-semibold text-brand hover:underline">
                      Editar resumen
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {orden.length > 5 && (
        <button type="button" onClick={() => setTodas((x) => !x)} className="mt-3 text-[12.5px] font-semibold text-brand hover:underline">
          {todas ? "Ver menos" : `Ver todas las consultas (${orden.length})`}
        </button>
      )}
    </div>
  );
}

/* Plan alimenticio: lo que la nutricionista asignó, el paquete semanal y lo que ve la cocina */

function TabAlimentacion({ c }: { c: Cliente }) {
  const { planesAlim, ordenes, incidencias, resolverIncidencia, rol } = useStore();
  const p = planesAlim.find((x) => x.clienteId === c.id);
  const paquetes = ordenes.filter((o) => o.clienteId === c.id).sort((a, b) => a.semana - b.semana);
  const avisos = incidencias.filter((i) => i.clienteId === c.id);
  if (!p) {
    return (
      <div className="py-10 text-center text-[13px] text-[var(--text-3)]">
        <ClipboardList size={26} className="mx-auto mb-2 opacity-50" />
        {c.nombre.split(" ")[0]} todavía no tiene plan de alimentación.
        {rol === "nutricionista" && (
          <div className="mt-3">
            <Link href={`/demonutricion/herramientas/planes?paciente=${c.id}`} className="inline-flex items-center gap-1 rounded-lg bg-[var(--consultas)] px-3 py-1.5 text-[12.5px] font-bold text-white">
              <Plus size={14} /> Asignar plan
            </Link>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[15px] font-bold">
            {PLAN_INFO[p.plan].label} · {COMIDAS_PLAN[p.plan]} · {p.kcal} kcal · {p.proteinaG} g de proteína · porción {p.porcion.toLowerCase()}
          </p>
          <p className="text-[12.5px] text-[var(--text-3)]">
            Asignado por {p.autor} · actualizado {p.actualizado.toLowerCase() === "hoy" ? "hoy" : `el ${p.actualizado}`} · la cocina lo ve en Perfiles de clientes
          </p>
        </div>
        {rol === "nutricionista" && (
          <Link href={`/demonutricion/herramientas/planes?paciente=${c.id}`} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-bold hover:bg-surface">
            <ClipboardList size={14} /> Editar plan completo
          </Link>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={cn("rounded-xl p-3 text-[12.5px]", p.alergias.length ? "bg-rose-50" : "bg-surface")}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">Alergias</p>
          <p className={cn("mt-1 font-semibold", p.alergias.length && "text-rose-700")}>{p.alergias.map((a) => ALERGENOS[a]).join(", ") || "Ninguna"}</p>
        </div>
        <div className="rounded-xl bg-surface p-3 text-[12.5px]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">No le gusta</p>
          <p className="mt-1 font-semibold">{p.noLeGusta.join(", ") || "—"}</p>
        </div>
        <div className="rounded-xl bg-surface p-3 text-[12.5px]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">Le gusta</p>
          <p className="mt-1 font-semibold">{p.leGusta.join(", ") || "—"}</p>
        </div>
      </div>
      {p.notasCocina && (
        <p className="rounded-lg border border-line px-3 py-2 text-[12.5px] text-[var(--text-2)]">
          <b>Notas para cocina:</b> {p.notasCocina}
        </p>
      )}

      {rol === "nutricionista" ? (
        <ArmarMenu p={p} />
      ) : (
        <div className="rounded-xl border border-line p-4">
          <p className="mb-2 text-[14px] font-bold">Opciones del menú</p>
          <ul className="space-y-1.5 text-[13px]">
            {p.tiempos.map((t) => (
              <li key={t} className="flex gap-2">
                <span className={cn("w-28 shrink-0 text-[11.5px] font-bold uppercase tracking-wide", incluido(t, p.plan) ? "text-[var(--consultas)]" : "text-[var(--text-3)]")}>
                  {t}
                  {!incluido(t, p.plan) && "*"}
                </span>
                <span className={cn("min-w-0 flex-1", !incluido(t, p.plan) && "text-[var(--text-3)]")}>
                  {(p.opciones[t] ?? []).map((id) => (
                    <span key={id} className="mr-2 inline-block">
                      {plato(id).nombre}
                      {p.ajustes[id] && <span className="font-semibold text-brand"> (✎ {p.ajustes[id]})</span>}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {paquetes.map((o) =>
        rol === "nutricionista" ? (
          <CalendarioSemana key={o.id} o={o} p={p} />
        ) : (
        <div key={o.id} className="rounded-xl border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[14px] font-bold">
              <ChefHat size={15} /> Paquete semanal · {semanaTexto(o.semana)}
            </p>
            <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1", ESTADO_ORDEN[o.estado].className)}>{ESTADO_ORDEN[o.estado].label}</span>
          </div>
          <p className="text-[12px] text-[var(--text-3)]">
            {o.dias.length} días · cocina prepara {COCINA_PLAN[o.plan]} · {o.dias.reduce((n, d) => n + d.items.filter((i) => enCocina(i.tiempo, o.plan)).length, 0)} platos · ruta {o.zona}
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[12px]">
              <thead className="text-[10.5px] uppercase tracking-wider text-[var(--text-3)]">
                <tr>
                  <th className="py-1 pr-2">Día</th>
                  {o.dias[0]?.items
                    .filter((i) => enCocina(i.tiempo, o.plan))
                    .map((i) => (
                      <th key={i.tiempo} className="py-1 pr-2">
                        {i.tiempo}
                      </th>
                    ))}
                  <th className="py-1">Estado</th>
                </tr>
              </thead>
              <tbody className="align-top">
                {o.dias.map((d) => (
                  <tr key={d.dia} className="border-t border-line">
                    <td className="whitespace-nowrap py-1.5 pr-2 font-semibold">
                      {etiquetaDia(d.dia)} <span className="font-normal text-[var(--text-3)]">{d.hora}</span>
                    </td>
                    {d.items
                      .filter((i) => enCocina(i.tiempo, o.plan))
                      .map((i) => (
                        <td key={i.tiempo} className="py-1.5 pr-2">
                          {plato(i.platoId).nombre}
                          {i.ajuste && <span className="block text-[11px] font-semibold text-brand">✎ {i.ajuste}</span>}
                        </td>
                      ))}
                    <td className="py-1.5">
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold", ESTADO_DIA[d.estado].className)}>{ESTADO_DIA[d.estado].label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {o.dias.some((d) => d.items.some((i) => !enCocina(i.tiempo, o.plan))) && (
            <div className="mt-3 rounded-lg bg-surface p-3">
              <p className="text-[12.5px] font-bold">Lo que el cliente ve por aparte</p>
              <p className="mb-1.5 text-[11.5px] text-[var(--text-3)]">No lo prepara la cocina: las meriendas del plan{NO_INCLUIDOS[o.plan].length ? " y el desayuno sugerido (* no incluido en el plan)" : ""}.</p>
              <ul className="space-y-0.5 text-[12px]">
                {o.dias.map((d) => (
                  <li key={d.dia}>
                    <b>{etiquetaDia(d.dia)}:</b>{" "}
                    {d.items
                      .filter((i) => !enCocina(i.tiempo, o.plan))
                      .map((i) => `${i.tiempo}${incluido(i.tiempo, o.plan) ? "" : "*"}: ${plato(i.platoId).nombre}${i.ajuste ? ` (✎ ${i.ajuste})` : ""}`)
                      .join(" · ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        ),
      )}

      {avisos.length > 0 && (
        <div className="rounded-xl border border-line p-4">
          <p className="mb-1 text-[14px] font-bold">Avisos de cocina</p>
          {avisos.map((i) => (
            <div key={i.id} className={cn("mt-2 flex flex-wrap items-start justify-between gap-2 rounded-lg px-3 py-2 text-[12.5px]", i.resuelta ? "bg-surface" : "bg-amber-50")}>
              <span className="min-w-0 flex-1">
                <b>Hoy {i.hora}:</b> {i.texto}
              </span>
              {rol === "nutricionista" && !i.resuelta && (
                <button type="button" onClick={() => resolverIncidencia(i.id)} className="shrink-0 font-semibold text-brand hover:underline">
                  Marcar visto
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Armar el menú del paciente desde su ficha: las opciones de cada tiempo del
 * menú de la casa, con el cambio escrito cuando hace falta (por alergias o
 * gustos). Cada cambio se guarda en su plan y la cocina lo ve al instante.
 */
function ArmarMenu({ p }: { p: PlanAlimentacion }) {
  const { guardarPlanAlim } = useStore();
  const [guardado, setGuardado] = useState(false);
  const pendientes = p.tiempos.flatMap((t) => (p.opciones[t] ?? []).filter((id) => !servible(id, p.alergias, p.ajustes)));
  const vacios = p.tiempos.filter((t) => incluido(t, p.plan) && !(p.opciones[t] ?? []).length);
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[14px] font-bold">Armar el menú del paciente</p>
        <Link href="/demonutricion/cocina/menus" className="text-[12.5px] font-semibold text-brand hover:underline">
          Ver el menú completo
        </Link>
      </div>
      <p className="mb-3 text-[12.5px] text-[var(--text-3)]">
        Marca las opciones que puede recibir en cada tiempo. Si un plato trae una de sus alergias, escribe el cambio (por ejemplo «sin queso, con aguacate»): la cocina lo prepara así.
      </p>
      <OpcionesPlan
        tiempos={p.tiempos}
        noIncluidos={NO_INCLUIDOS[p.plan]}
        alergias={p.alergias}
        opciones={p.opciones}
        ajustes={p.ajustes}
        onChange={(opciones, ajustes) => {
          guardarPlanAlim({ ...p, opciones, ajustes, actualizado: "Hoy" });
          setGuardado(true);
        }}
      />
      <p
        className={cn(
          "mt-3 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold",
          pendientes.length || vacios.length ? "bg-rose-50 text-rose-700" : guardado ? "bg-emerald-50 text-emerald-700" : "bg-surface text-[var(--text-3)]",
        )}
      >
        {pendientes.length
          ? "Hay platos con sus alergias sin el cambio escrito: la cocina no los usará hasta que lo escribas."
          : vacios.length
            ? `Falta elegir opciones para: ${vacios.join(", ")}.`
            : guardado
              ? "✓ Guardado. La cocina ya ve el menú con tus cambios."
              : "Los cambios se guardan solos y pasan a la cocina."}
      </p>
    </div>
  );
}

/* Menús */

const ESTADO_MENU: Record<MenuT["estado"], { label: string; className: string }> = {
  enviado: { label: "Enviado", className: "bg-slate-100 text-slate-700" },
  leido: { label: "Leído por el paciente", className: "bg-sky-50 text-sky-700" },
  duda: { label: "Paciente con duda", className: "bg-rose-50 text-rose-700" },
};

const esHora = (h: string) => /^\d{2}:\d{2}$/.test(h);

function TabMenus({ c, nuevo }: { c: Cliente; nuevo: () => void }) {
  const { menus } = useStore();
  const [estado, setEstado] = useState<"todos" | "vigente" | "fin">("todos");
  const suyos = menus
    .filter((m) => m.clienteId === c.id)
    .map((m) => ({ m, fecha: isoDeTexto(m.fecha), vigente: menuVigente(m) }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const lista = suyos.filter((x) => estado === "todos" || (estado === "vigente") === x.vigente);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[15px] font-bold">Menús personalizados</p>
          <p className="text-[12.5px] text-[var(--text-3)]">Menús, rutinas y listas de compras que la nutricionista le ha enviado.</p>
        </div>
        <button type="button" onClick={nuevo} className="inline-flex items-center gap-1 rounded-lg bg-[var(--consultas)] px-3 py-1.5 text-[12.5px] font-bold text-white hover:opacity-90">
          <Plus size={14} /> Nuevo menú
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(
          [
            ["todos", "Todos"],
            ["vigente", "Vigentes"],
            ["fin", "Anteriores"],
          ] as const
        ).map(([id, label]) => (
          <Chip key={id} on={estado === id} onClick={() => setEstado(id)}>
            {label} <span className="opacity-60">{id === "todos" ? suyos.length : suyos.filter((x) => (id === "vigente") === x.vigente).length}</span>
          </Chip>
        ))}
      </div>

      {lista.length === 0 && (
        <div className="py-10 text-center text-[13px] text-[var(--text-3)]">
          <Salad size={26} className="mx-auto mb-2 opacity-50" />
          {suyos.length === 0 ? `${c.nombre.split(" ")[0]} todavía no tiene menús.` : "Sin menús con este filtro."}
        </div>
      )}
      <div className="mt-4 space-y-3">
        {lista.map(({ m, fecha, vigente }) => (
          <div key={m.id} className="rounded-xl border border-line p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-[13.5px] font-bold">
                <FileText size={15} className="text-[var(--consultas)]" /> {fechaLegible(fecha)}
                {esHora(m.hora) && <span className="font-normal text-[var(--text-3)]">· {m.hora}</span>}
                <span className="font-normal text-[var(--text-3)]">· {m.vigencia}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", vigente ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{vigente ? "Vigente" : "Anterior"}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", ESTADO_MENU[m.estado].className)}>
                  {m.estado === "enviado" ? `Enviado por ${m.canal === "correo" ? "correo" : "WhatsApp"}` : ESTADO_MENU[m.estado].label}
                </span>
                <button
                  type="button"
                  onClick={() => descargarMenu(m)}
                  title={`Descargar ${nombreArchivo(m)}`}
                  className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-[var(--text-2)] hover:bg-surface"
                >
                  <Download size={11} /> PDF
                </button>
              </div>
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[460px] text-left text-[12.5px]">
                <thead className="text-[10.5px] uppercase tracking-wider text-[var(--text-3)]">
                  <tr>
                    <th className="pb-1 pr-2">Tiempo</th>
                    <th className="pb-1 pr-2">Comida</th>
                    <th className="pb-1 pr-2">Porción</th>
                    <th className="pb-1">Nota</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {m.items.map((i) => (
                    <tr key={i.tiempo + i.comida} className="border-t border-line">
                      <td className="py-1.5 pr-2 font-semibold text-[var(--consultas)]">{i.tiempo}</td>
                      <td className="py-1.5 pr-2 font-semibold">{i.comida}</td>
                      <td className="py-1.5 pr-2">{i.porcion || "—"}</td>
                      <td className="py-1.5">{i.nota || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {m.indicaciones && (
              <p className="mt-2 rounded-lg bg-surface px-2.5 py-1.5 text-[12.5px] text-[var(--text-2)]">
                <b>Indicaciones:</b> {m.indicaciones}
              </p>
            )}
            {m.compras && (
              <p className="mt-1.5 text-[12px] text-[var(--text-3)]">
                <b className="text-[var(--text-2)]">Lista de compras:</b> {m.compras.split("\n").join(" · ")}
              </p>
            )}
            <p className="mt-1.5 text-[11px] text-[var(--text-3)]">Escrito por {STAFF.nutricionista.nombre}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-full border px-3 py-1 text-[12.5px] font-semibold", on ? "border-[var(--text)] bg-[var(--text)] text-white" : "border-line text-[var(--text-2)] hover:bg-surface")}
    >
      {children}
    </button>
  );
}

/* Entregas */

function TabEntregas({ c, acciones }: { c: Cliente; acciones: Acciones }) {
  const todas = CITAS.filter((x) => x.clienteId === c.id && x.agenda === "entregas").sort((a, b) => b.dia - a.dia);
  const proxima = proximasDe(c, "entregas")[0];
  const hechas = todas.filter((x) => x.estado === "completada").length;

  if (!c.plan) {
    return (
      <div className="py-10 text-center text-[13px] text-[var(--text-3)]">
        <Truck size={26} className="mx-auto mb-2 opacity-50" />
        {c.nombre.split(" ")[0]} no tiene plan de comidas a domicilio.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--entregas-soft)" }}>
          <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--entregas)" }}>
            Próxima entrega
          </p>
          {proxima ? (
            <>
              <p className="mt-1.5 text-[16px] font-extrabold">
                {etiquetaDia(proxima.dia)} · {proxima.hora}
              </p>
              <p className="text-[12.5px] text-[var(--text-2)]">
                {proxima.servicio} · Ruta {proxima.zona}
              </p>
              <div className="mt-2">
                <EstadoCitaPill estado={proxima.estado} agenda="entregas" />
              </div>
            </>
          ) : (
            <p className="mt-1.5 text-[13px] text-[var(--text-2)]">Sin entregas programadas: el plan ya terminó.</p>
          )}
        </div>
        <div className="rounded-xl border border-line p-4 text-[12.5px]">
          <p className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-3)]">Para la cocina y el repartidor</p>
          <dl className="mt-1.5 grid grid-cols-[90px_1fr] gap-x-3 gap-y-1">
            <dt className="text-[var(--text-3)]">Plan</dt>
            <dd className="font-medium">{PLAN_INFO[c.plan.plan].label}</dd>
            <dt className="text-[var(--text-3)]">Dirección</dt>
            <dd className="font-medium">{c.plan.direccion}</dd>
            <dt className="text-[var(--text-3)]">Restricciones</dt>
            <dd className="font-medium">{c.restricciones?.join(" · ") || "Ninguna"}</dd>
            <dt className="text-[var(--text-3)]">Entregadas</dt>
            <dd className="font-medium">{hechas} en los últimos 7 días</dd>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[14px] font-bold">Entregas de la semana</p>
            <p className="text-[12.5px] text-[var(--text-3)]">De la semana pasada a la próxima. MIA las mueve si el paciente lo pide por chat.</p>
          </div>
          <button
            type="button"
            onClick={() => acciones.agendar("entregas")}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12.5px] font-bold text-white hover:opacity-90"
            style={{ backgroundColor: "var(--entregas)" }}
          >
            <Truck size={14} /> Ver en calendario
          </button>
        </div>
        {todas.length === 0 && <p className="py-6 text-center text-[13px] text-[var(--text-3)]">Sin entregas en estas fechas.</p>}
        <div className="mt-3 divide-y divide-line">
          {todas.map((x) => (
            <div key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[12.5px]">
              <span className="w-28 shrink-0 font-semibold">{etiquetaDia(x.dia)}</span>
              <span className="w-12 shrink-0 tabular-nums text-[var(--text-2)]">{x.hora}</span>
              <span className="min-w-0 flex-1 truncate text-[var(--text-2)]">
                {x.servicio} · {x.zona}
                {x.origen === "ia" ? " · movida por MIA" : ""}
              </span>
              <EstadoCitaPill estado={x.estado} agenda="entregas" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Columna derecha ---------- */

function Lateral({ titulo, children }: { titulo: string; children: ReactNode }) {
  const [abierto, setAbierto] = useState(true);
  return (
    <section className="rounded-2xl border border-line bg-card shadow-sm">
      <button type="button" onClick={() => setAbierto((a) => !a)} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <ChevronDown size={16} className={cn("shrink-0 transition", !abierto && "-rotate-90")} />
        <span className="truncate text-[14px] font-bold">{titulo}</span>
      </button>
      {abierto && <div className="border-t border-line p-3">{children}</div>}
    </section>
  );
}

function ProximasCitas({ c }: { c: Cliente }) {
  const proximas = proximasDe(c, "consultas");
  return (
    <Lateral titulo={`Próximas citas (${proximas.length})`}>
      {proximas.length === 0 ? (
        <div className="py-4 text-center text-[12.5px] text-[var(--text-3)]">
          <CalendarClock size={26} className="mx-auto mb-2 opacity-50" />
          No tiene consultas próximas.
        </div>
      ) : (
        <div className="space-y-2">
          {proximas.map((x) => (
            <div key={x.id} className="rounded-xl border border-line p-2.5 text-[12.5px]">
              <div className="flex items-center justify-between gap-2">
                <AgendaPill agenda={x.agenda} />
                <EstadoCitaPill estado={x.estado} />
              </div>
              <p className="mt-1.5 font-semibold">
                {x.servicio}
                {x.modalidad === "en_linea" ? " · en línea" : ""}
              </p>
              <p className="text-[var(--text-3)]">
                {etiquetaDia(x.dia)} · {x.hora}
              </p>
            </div>
          ))}
        </div>
      )}
    </Lateral>
  );
}

function ConversacionCard({ conv, abrir }: { conv?: Conversacion; abrir?: () => void }) {
  const ultimo = conv && [...conv.mensajes].reverse().find((m) => m.autor !== "sistema");
  return (
    <Lateral titulo="Conversación">
      {conv && ultimo ? (
        <div className="text-[12.5px]">
          <div className="flex items-center justify-between">
            <ChannelBadge canal={conv.canal} label />
            <span className="text-[var(--text-3)]">{conv.hora === "Ayer" ? "Ayer" : `Hoy ${conv.hora}`}</span>
          </div>
          <p className="mt-2 line-clamp-3 text-[var(--text-2)]">{ultimo.texto}</p>
        </div>
      ) : (
        <p className="text-[12.5px] text-[var(--text-3)]">Sin conversación reciente.</p>
      )}
      {abrir ? (
        <button type="button" onClick={abrir} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[13px] font-bold text-white hover:bg-brand-dark">
          <MessageCircle size={15} /> {conv ? "Abrir conversación" : "Iniciar conversación"}
        </button>
      ) : (
        <p className="mt-2 text-[11.5px] text-[var(--text-3)]">La conversación la atiende MIA con atención al cliente.</p>
      )}
    </Lateral>
  );
}
