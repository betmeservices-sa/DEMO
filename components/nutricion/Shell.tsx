"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BellRing,
  CalendarDays,
  ChevronDown,
  HeartPulse,
  Inbox,
  LogOut,
  Megaphone,
  MessageSquareText,
  Menu,
  Leaf,
  ClipboardCheck,
  UserRoundSearch,
  Users,
  Wrench,
  UserPlus,
  ClipboardList,
  ListOrdered,
  CookingPot,
  Contact,
  ChefHat,
  BookOpen,
  CalendarRange,
  ChevronsUpDown,
  Check,
  X,
  Send,
  Siren,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { AGENDA_INFO, MOTIVO } from "@/lib/nutricion/format";
import { CITAS, CLINICA, cliente } from "@/lib/nutricion/seed";
import { CALENDARIOS_DE, ROL_INFO, ROLES, type Acceso, type Rol } from "@/lib/nutricion/roles";
import { StoreProvider, useStore } from "@/lib/nutricion/store";
import type { Agenda } from "@/lib/nutricion/types";
import { Avatar } from "./ui";

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

// Menú lateral: bandeja, recordatorios, marketing (agrupado), pacientes y
// dashboard. Los calendarios y los casos por atender viven en la barra de arriba.
const MARKETING: NavItem[] = [
  { href: "/demonutricion/reactivacion", label: "Reactivación", Icon: UserRoundSearch },
  { href: "/demonutricion/seguimiento", label: "Seguimiento", Icon: ClipboardCheck },
  { href: "/demonutricion/publicaciones", label: "Publicaciones", Icon: Send },
  { href: "/demonutricion/plantillas", label: "Plantillas WhatsApp", Icon: MessageSquareText },
];

// Herramientas de la nutricionista y de la cocina (sin marketing).
const HERRAMIENTAS_NUTRI: NavItem[] = [
  { href: "/demonutricion/herramientas/nuevo-paciente", label: "Nuevo paciente", Icon: UserPlus },
  { href: "/demonutricion/herramientas/planes", label: "Planes de alimentación", Icon: ClipboardList },
  { href: "/demonutricion/seguimiento", label: "Seguimiento", Icon: ClipboardCheck },
  { href: "/demonutricion/cocina/menus", label: "Menús disponibles", Icon: BookOpen },
];

const HERRAMIENTAS_CHEF: NavItem[] = [
  { href: "/demonutricion/cocina", label: "Cola de órdenes", Icon: ListOrdered },
  { href: "/demonutricion/cocina/produccion", label: "Producción del día", Icon: CookingPot },
  { href: "/demonutricion/cocina/calendario", label: "Calendario de producción", Icon: CalendarRange },
  { href: "/demonutricion/cocina/perfiles", label: "Perfiles de clientes", Icon: Contact },
  { href: "/demonutricion/cocina/menus", label: "Menús", Icon: BookOpen },
  { href: "/demonutricion/cocina/dashboard", label: "Dashboard", Icon: BarChart3 },
];

const CALENDARIOS: { id: Agenda; label: string }[] = [
  { id: "consultas", label: "Consultas" },
  { id: "entregas", label: "Entregas" },
];

function activo(pathname: string, href: string) {
  // La cola (/cocina) no se marca cuando se está en una subpágina de cocina.
  if (href === "/demonutricion" || href === "/demonutricion/cocina") return pathname === href;
  return pathname.startsWith(href);
}

export function Shell({ children, rol: acceso }: { children: ReactNode; rol: Acceso }) {
  const pathname = usePathname();
  // Vista general: se mira como cualquiera de los tres perfiles. Se recuerda por navegador.
  const [vista, setVistaState] = useState<Rol>("secretaria");
  useEffect(() => {
    try {
      const v = localStorage.getItem("nutri-vista") as Rol | null;
      if (v && ROLES.includes(v)) setVistaState(v);
    } catch {}
  }, []);
  const setVista = (v: Rol) => {
    setVistaState(v);
    try {
      localStorage.setItem("nutri-vista", v);
    } catch {}
  };
  if (pathname === "/demonutricion/login") return <>{children}</>;
  const rol = acceso === "general" ? vista : acceso;
  return (
    <StoreProvider rol={rol}>
      <Layout general={acceso === "general" ? setVista : undefined}>{children}</Layout>
    </StoreProvider>
  );
}

function Layout({ children, general }: { children: ReactNode; general?: (v: Rol) => void }) {
  const [open, setOpen] = useState(false);
  // Fechas y horas libres dependen del navegador: se pinta después de montar
  // para que el HTML del servidor no choque con el cliente.
  const [listo, setListo] = useState(false);
  useEffect(() => setListo(true), []);

  return (
    <div className="flex h-dvh overflow-hidden">
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <Sidebar open={open} onClose={() => setOpen(false)} general={general} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {general && <AjustaCalendario />}
        <TopBar onMenu={() => setOpen(true)} />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{listo ? children : null}</main>
      </div>
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { calendario, setCalendario, rol } = useStore();
  const enAgendas = pathname.startsWith("/demonutricion/agendas");

  return (
    <div className="relative z-30 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line bg-card px-3 py-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" onClick={onMenu} aria-label="Abrir menú" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-2)] hover:bg-surface lg:hidden">
          <Menu size={22} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)] md:flex">
          <CalendarDays size={14} /> Calendarios
        </span>
        <div className="inline-flex rounded-xl border border-line bg-surface p-1">
          {CALENDARIOS.filter((c) => CALENDARIOS_DE[rol].includes(c.id)).map((c) => {
            const on = enAgendas && calendario === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCalendario(c.id);
                  router.push("/demonutricion/agendas");
                }}
                className={cn("rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition sm:px-4", on ? "text-white shadow-sm" : "text-[var(--text-2)] hover:bg-card")}
                style={on ? { backgroundColor: AGENDA_INFO[c.id].color } : undefined}
                aria-pressed={on}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">{rol === "secretaria" ? <Urgencias /> : rol === "nutricionista" ? <CasosNutricionista /> : <AvisosCocina />}</div>
    </div>
  );
}

/** Vista general: al cambiar de perfil, el calendario abierto tiene que ser uno de los suyos. */
function AjustaCalendario() {
  const { rol, calendario, setCalendario } = useStore();
  useEffect(() => {
    if (!CALENDARIOS_DE[rol].includes(calendario)) setCalendario(CALENDARIOS_DE[rol][0]);
  }, [rol, calendario, setCalendario]);
  return null;
}

/**
 * Usuario de abajo a la izquierda: nombre, cargo y correo del perfil. En la
 * vista general se abre como lista para pasar a otro perfil sin cerrar sesión.
 */
function Usuario({ general, onClose }: { general?: (v: Rol) => void; onClose: () => void }) {
  const { rol } = useStore();
  const router = useRouter();
  const { abierto, setAbierto, ref } = useDropdown();
  const ficha = (r: Rol, grande?: boolean) => (
    <>
      <Avatar nombre={ROL_INFO[r].nombre} color={ROL_INFO[r].color} size={grande ? 34 : 30} />
      <span className="min-w-0 flex-1 text-left leading-tight">
        <span className="block text-[13px] font-semibold leading-snug">{ROL_INFO[r].nombre}</span>
        <span className="block text-[11px] leading-snug text-[var(--text-3)]">{ROL_INFO[r].cargo}</span>
        <span className="block break-all text-[10.5px] leading-snug text-brand">{ROL_INFO[r].correo}</span>
      </span>
    </>
  );
  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      {general ? (
        <button type="button" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} title="Cambiar de perfil" className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-surface">
          {ficha(rol, true)}
          <ChevronsUpDown size={15} className="shrink-0 text-[var(--text-3)]" />
        </button>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">{ficha(rol, true)}</div>
      )}
      {general && abierto && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-[calc(100%+40px)] rounded-2xl border border-line bg-card p-1.5 shadow-xl">
          <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-3)]">Vista general · ver como</p>
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                general(r);
                setAbierto(false);
                onClose();
                router.push(ROL_INFO[r].inicio);
              }}
              className={cn("flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5", r === rol ? "bg-brand/10" : "hover:bg-surface")}
            >
              {ficha(r)}
              {r === rol && <Check size={15} className="shrink-0 text-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Abre y cierra un dropdown; se cierra al hacer clic fuera o con Escape. */
function useDropdown() {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);
  return { abierto, setAbierto, ref };
}

function BotonAviso({
  abierto,
  onClick,
  Icon,
  label,
  n,
  color,
  titulo,
  tono,
}: {
  abierto: boolean;
  onClick: () => void;
  Icon: LucideIcon;
  label: string;
  n: number;
  color: string;
  titulo: string;
  tono: "rojo" | "neutro";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={abierto}
      className={cn(
        "relative flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[12.5px] font-semibold transition",
        abierto
          ? tono === "rojo"
            ? "border-rose-300 bg-rose-50 text-rose-700"
            : "border-brand/50 bg-brand/5 text-brand"
          : tono === "rojo" && n > 0
            ? "border-rose-200 text-rose-700 hover:bg-rose-50"
            : "border-line text-[var(--text-2)] hover:bg-surface",
      )}
    >
      <Icon size={16} />
      <span className="hidden md:inline">{label}</span>
      <ChevronDown size={14} className={cn("hidden transition md:block", abierto && "rotate-180")} />
      {n > 0 && (
        <span
          className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10.5px] font-bold text-white ring-2 ring-card"
          style={{ backgroundColor: color }}
          title={titulo}
        >
          {n}
        </span>
      )}
    </button>
  );
}

// Por atender: conversaciones que MIA pasó al equipo y esperan respuesta.
// Solo paciente y motivo; al tocar una se abre en la bandeja.
function Urgencias() {
  const { abierto, setAbierto, ref } = useDropdown();
  const router = useRouter();
  const { conversaciones, setConvSel } = useStore();
  const esperando = conversaciones
    .filter((c) => c.estado === "transferida")
    .sort((a, b) => Number(b.motivo === "urgencia") - Number(a.motivo === "urgencia") || (b.esperaMin ?? 0) - (a.esperaMin ?? 0));

  return (
    <div ref={ref} className="relative">
      <BotonAviso
        abierto={abierto}
        onClick={() => setAbierto((a) => !a)}
        Icon={Siren}
        label="Por atender"
        n={esperando.length}
        color="#dc2626"
        titulo={`${esperando.length} conversaciones esperan respuesta del equipo`}
        tono="rojo"
      />
      {abierto && (
        <div className="absolute right-0 z-40 mt-2 max-h-[80vh] w-[min(340px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-line bg-card shadow-xl">
          <div className="flex items-center justify-between bg-rose-50 px-4 py-3">
            <div>
              <p className="text-[14px] font-bold text-rose-800">Esperan respuesta del equipo</p>
              <p className="text-[12px] text-rose-700/80">MIA las pasó y dejó de responder</p>
            </div>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dc2626] px-1.5 text-[11px] font-bold text-white">{esperando.length}</span>
          </div>
          {esperando.length === 0 && <p className="px-4 py-6 text-center text-[13px] text-[var(--text-3)]">Nada pendiente por ahora.</p>}
          <div className="divide-y divide-line">
            {esperando.map((c) => {
              const cli = cliente(c.clienteId);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setConvSel(c.id);
                    setAbierto(false);
                    router.push("/demonutricion");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface"
                  title="Abrir la conversación"
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", c.motivo === "urgencia" ? "bg-[#dc2626]" : "bg-amber-500")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{cli.nombre}</span>
                    <span className="flex items-center gap-1 truncate text-[12px] text-[var(--text-2)]">
                      {c.motivo ? MOTIVO[c.motivo].label : "Pidió hablar con alguien"} · {c.esperaMin ?? 0} min
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Sidebar({ open, onClose, general }: { open: boolean; onClose: () => void; general?: (v: Rol) => void }) {
  const pathname = usePathname();
  const { conversaciones, rol, ordenes } = useStore();
  const transferidas = conversaciones.filter((c) => c.estado === "transferida").length;
  const nuevas = ordenes.filter((o) => o.estado === "nueva").length;
  // Citas de hoy a pasado mañana que siguen sin confirmar (burbuja naranja).
  const porConfirmar = CITAS.filter((c) => c.dia >= 0 && c.dia <= 2 && c.estado === "por_confirmar").length;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-dvh w-64 shrink-0 flex-col border-r border-line bg-card transition-transform lg:static lg:z-auto lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
            <Leaf size={20} strokeWidth={2.4} />
          </span>
          <div className="leading-tight">
            <p className="text-[15px] font-extrabold tracking-tight">{CLINICA.nombre}</p>
            <p className="text-[11px] font-medium text-brand">Nutrición y dietética · MiAgentIA</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar menú" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-surface lg:hidden">
          <X size={18} />
        </button>
      </div>

      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
          <HeartPulse size={15} className="text-[#146c43]" />
          <p className="text-[12px] font-semibold text-[var(--text-2)]">
            Agente <span className="text-[var(--text)]">{CLINICA.agente}</span> activo
          </p>
          <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {rol === "secretaria" && (
          <>
            <NavLink href="/demonutricion" label="Bandeja" Icon={Inbox} activo={activo(pathname, "/demonutricion")} aviso={transferidas} onClick={onClose} />
            <NavLink href="/demonutricion/recordatorios" label="Recordatorios" Icon={BellRing} activo={activo(pathname, "/demonutricion/recordatorios")} aviso={porConfirmar} avisoColor="#f59e0b" onClick={onClose} />
            <Grupo label="Marketing" Icon={Megaphone} items={MARKETING} pathname={pathname} onClose={onClose} />
            <NavLink href="/demonutricion/pacientes" label="Pacientes" Icon={Users} activo={activo(pathname, "/demonutricion/pacientes")} onClick={onClose} />
            <NavLink href="/demonutricion/dashboard" label="Dashboard" Icon={BarChart3} activo={activo(pathname, "/demonutricion/dashboard")} onClick={onClose} />
          </>
        )}
        {rol === "nutricionista" && (
          <>
            <NavLink href="/demonutricion/agendas" label="Mi agenda" Icon={CalendarDays} activo={activo(pathname, "/demonutricion/agendas")} onClick={onClose} />
            <NavLink href="/demonutricion/pacientes" label="Pacientes" Icon={Users} activo={activo(pathname, "/demonutricion/pacientes")} onClick={onClose} />
            <Grupo label="Herramientas" Icon={Wrench} items={HERRAMIENTAS_NUTRI} pathname={pathname} onClose={onClose} />
            <NavLink href="/demonutricion/recordatorios" label="Recordatorios" Icon={BellRing} activo={activo(pathname, "/demonutricion/recordatorios")} onClick={onClose} />
          </>
        )}
        {rol === "chef" && <Grupo label="Herramientas" Icon={Wrench} items={HERRAMIENTAS_CHEF} pathname={pathname} onClose={onClose} avisos={{ "/demonutricion/cocina": nuevas }} />}
      </nav>

      <div className="space-y-3 border-t border-line p-3">
        <div className="flex items-center gap-1">
          <Usuario general={general} onClose={onClose} />
          <button
            type="button"
            onClick={async () => {
              await fetch("/demonutricion/api/logout", { method: "POST" });
              window.location.assign("/demonutricion/login");
            }}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-3)] transition hover:bg-red-50 hover:text-[#a32923]"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/** Grupo desplegable del menú (Marketing o Herramientas). */
function Grupo({
  label,
  Icon,
  items,
  pathname,
  onClose,
  avisos = {},
}: {
  label: string;
  Icon: LucideIcon;
  items: NavItem[];
  pathname: string;
  onClose: () => void;
  avisos?: Record<string, number>;
}) {
  const dentro = items.some((a) => activo(pathname, a.href));
  const [abierto, setAbierto] = useState(true);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
          dentro && !abierto ? "bg-brand text-white shadow-sm shadow-brand/25" : dentro ? "text-[var(--text)] hover:bg-surface" : "text-[var(--text-2)] hover:bg-surface hover:text-[var(--text)]",
        )}
      >
        <Icon size={18} strokeWidth={2.1} />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown size={16} className={cn("transition", abierto && "rotate-180")} />
      </button>
      {abierto && (
        <div className="ml-5 space-y-1 border-l border-line pl-2">
          {items.map((a) => (
            <NavLink key={a.href} {...a} activo={activo(pathname, a.href)} onClick={onClose} compacto aviso={avisos[a.href] ?? 0} avisoColor="#c2410c" />
          ))}
        </div>
      )}
    </>
  );
}

// Casos para la nutricionista: conversaciones que MIA le pasó y avisos de la
// cocina. Se abren en la ficha del paciente (ella no usa la bandeja).
function CasosNutricionista() {
  const { abierto, setAbierto, ref } = useDropdown();
  const router = useRouter();
  const { conversaciones, incidencias } = useStore();
  const casos = conversaciones.filter((c) => c.estado === "transferida" && (c.motivo === "caso_clinico" || c.motivo === "urgencia"));
  const avisos = incidencias.filter((i) => !i.resuelta);
  const n = casos.length + avisos.length;
  const ir = (id: string) => {
    setAbierto(false);
    router.push(`/demonutricion/pacientes/${id}`);
  };
  return (
    <div ref={ref} className="relative">
      <BotonAviso abierto={abierto} onClick={() => setAbierto((a) => !a)} Icon={Siren} label="Casos para ti" n={n} color="#dc2626" titulo={`${n} casos esperan a la nutricionista`} tono="rojo" />
      {abierto && (
        <div className="absolute right-0 z-40 mt-2 max-h-[80vh] w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-line bg-card shadow-xl">
          <div className="bg-rose-50 px-4 py-3">
            <p className="text-[14px] font-bold text-rose-800">Esperan a la nutricionista</p>
            <p className="text-[12px] text-rose-700/80">Lo que MIA no responde y los avisos de cocina</p>
          </div>
          {n === 0 && <p className="px-4 py-6 text-center text-[13px] text-[var(--text-3)]">Nada pendiente por ahora.</p>}
          <div className="divide-y divide-line">
            {casos.map((c) => {
              const primero = c.mensajes.find((m) => m.autor === "cliente");
              return (
                <button key={c.id} type="button" onClick={() => ir(c.clienteId)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-surface">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", c.motivo === "urgencia" ? "bg-[#dc2626]" : "bg-amber-500")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{cliente(c.clienteId).nombre}</span>
                    <span className="line-clamp-2 text-[12px] text-[var(--text-2)]">{primero?.texto}</span>
                  </span>
                </button>
              );
            })}
            {avisos.map((i) => (
              <button key={i.id} type="button" onClick={() => ir(i.clienteId)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-surface">
                <ChefHat size={14} className="mt-0.5 shrink-0 text-[#c2410c]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">Cocina · {cliente(i.clienteId).nombre}</span>
                  <span className="line-clamp-2 text-[12px] text-[var(--text-2)]">{i.texto}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Avisos de cocina: órdenes nuevas sin confirmar, la más antigua primero.
function AvisosCocina() {
  const { abierto, setAbierto, ref } = useDropdown();
  const router = useRouter();
  const { ordenes } = useStore();
  const nuevas = ordenes.filter((o) => o.estado === "nueva");
  return (
    <div ref={ref} className="relative">
      <BotonAviso abierto={abierto} onClick={() => setAbierto((a) => !a)} Icon={ChefHat} label="Órdenes nuevas" n={nuevas.length} color="#c2410c" titulo={`${nuevas.length} órdenes sin confirmar`} tono="neutro" />
      {abierto && (
        <div className="absolute right-0 z-40 mt-2 max-h-[80vh] w-[min(340px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-line bg-card shadow-xl">
          <div className="bg-orange-50 px-4 py-3">
            <p className="text-[14px] font-bold text-orange-800">Órdenes por confirmar</p>
            <p className="text-[12px] text-orange-700/80">En orden de llegada</p>
          </div>
          {nuevas.length === 0 && <p className="px-4 py-6 text-center text-[13px] text-[var(--text-3)]">Todas confirmadas.</p>}
          <div className="divide-y divide-line">
            {nuevas.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setAbierto(false);
                  router.push(`/demonutricion/cocina?orden=${o.id}`);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface"
              >
                <span className="w-11 shrink-0 text-[12px] font-bold tabular-nums text-[var(--text-3)]">{o.llegada}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{cliente(o.clienteId).nombre}</span>
                  <span className="block truncate text-[12px] text-[var(--text-2)]">{o.origen}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NavLink({
  href,
  label,
  Icon,
  activo: a,
  aviso = 0,
  avisoColor = "#dc2626",
  onClick,
  compacto,
}: NavItem & { activo: boolean; aviso?: number; avisoColor?: string; onClick: () => void; compacto?: boolean }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 font-semibold transition",
        compacto ? "py-2 text-[13px]" : "py-2.5 text-sm",
        a ? "bg-brand text-white shadow-sm shadow-brand/25" : "text-[var(--text-2)] hover:bg-surface hover:text-[var(--text)]",
      )}
    >
      <Icon size={compacto ? 16 : 18} strokeWidth={2.1} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {aviso > 0 && (
        <span
          className={cn("flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10.5px] font-bold text-white", a && "bg-white/25")}
          style={a ? undefined : { backgroundColor: avisoColor }}
        >
          {aviso}
        </span>
      )}
    </Link>
  );
}
