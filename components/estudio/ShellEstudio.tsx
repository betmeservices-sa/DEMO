"use client";

// La cara del motor de contenido (TenantConfig.shell = "estudio"), con la
// identidad de BetMe: la barra lateral azul marino de su panel de agencia.
//
//   - A la izquierda, la barra: la marca BetMe, el cambio de marca (las marcas
//     a las que BetMe les hace contenido), las pantallas con su ícono y su
//     nombre, los créditos del mes y la cuenta. En celular baja y queda como
//     barra inferior de íconos.
//   - Arriba, el nombre de la pantalla en rótulo, el día y la campana con lo
//     que espera aprobación.
//   - Todo lo de este panel vive en /estudio: otra ruta se manda al resumen.
//
// También corre el reloj de los videos: cada pocos segundos avanza los que se
// están armando, y el que termina vuelve a la cola de aprobación.

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Bell,
  CalendarRange,
  Check,
  CheckCheck,
  ChevronsUpDown,
  Clapperboard,
  Coins,
  Images,
  LayoutDashboard,
  LogOut,
  MousePointerClick,
  Palette,
  RotateCcw,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { deMarca, elegirMarca, restablecer, tick, useEstudio, useMarcaActiva } from "@/lib/estudio/store";
import { diaDe, fechaCorta, localSV } from "@/lib/estudio/fechas";
import { creditosTotal } from "@/lib/estudio/generador";
import { ClienteSwitcher } from "@/components/shell/ClienteSwitcher";
import { MarcaSello, creditos } from "./ui";
import { FuentesRotulo } from "./Rotulo";

interface Pantalla {
  href: string;
  titulo: string;
  Icono: LucideIcon;
}

export const PANTALLAS: Pantalla[] = [
  { href: "/estudio", titulo: "Resumen", Icono: LayoutDashboard },
  { href: "/estudio/crear", titulo: "Crear", Icono: WandSparkles },
  { href: "/estudio/aprobacion", titulo: "Aprobar", Icono: CheckCheck },
  { href: "/estudio/calendario", titulo: "Calendario", Icono: CalendarRange },
  { href: "/estudio/videos", titulo: "Videos", Icono: Clapperboard },
  { href: "/estudio/biblioteca", titulo: "Biblioteca", Icono: Images },
  { href: "/estudio/marcas", titulo: "Marcas", Icono: Palette },
  { href: "/estudio/creditos", titulo: "Créditos", Icono: Coins },
];

function pantallaDe(pathname: string): Pantalla {
  return (
    [...PANTALLAS].sort((a, b) => b.href.length - a.href.length).find((p) => pathname === p.href || pathname.startsWith(`${p.href}/`)) ??
    PANTALLAS[0]
  );
}

function usePopover() {
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

const caer = {
  initial: { opacity: 0, y: -6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
  transition: { duration: 0.16 },
};

/** "BetMe" con su lema, como en el panel de agencia. */
function WordmarkBetMe() {
  return (
    <Link href="/estudio" aria-label="BetMe, Content Engine" className="block px-2 text-center">
      <span className="block text-[38px] font-extrabold leading-none tracking-[-0.02em]" style={{ fontFamily: "Montserrat, sans-serif" }}>
        <span className="text-white">Bet</span>
        <span className="bg-gradient-to-b from-[#a7e3f2] to-[#5bbcd6] bg-clip-text text-transparent">Me</span>
      </span>
      <span className="mt-1 block text-[9.5px] font-semibold tracking-[0.01em] text-white/80">Don&apos;t Grow Alone, Grow Remote</span>
    </Link>
  );
}

function OpcionesMarca({ alElegir }: { alElegir: () => void }) {
  const { marcas } = useEstudio();
  const activa = useMarcaActiva();
  return (
    <>
      {[{ id: "todas" as const }, ...marcas].map((m) => {
        const real = m.id === "todas" ? null : marcas.find((x) => x.id === m.id)!;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              elegirMarca(m.id);
              alElegir();
            }}
            className="flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left transition hover:bg-white/[0.07]"
          >
            {real ? (
              <MarcaSello marca={real} size={30} />
            ) : (
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[30%] bg-white/10 text-[12px] font-bold">
                {marcas.length}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">{real ? real.nombre : "Todas las marcas"}</span>
              <span className="block truncate text-[11.5px] text-[var(--text-3)]">
                {real ? `${real.rubro} · ${real.ciudad}` : "Vista de la agencia"}
              </span>
            </span>
            {activa === m.id && <Check size={15} className="text-[var(--es-acento)]" />}
          </button>
        );
      })}
    </>
  );
}

/** El cambio de marca de la barra: la caja "Click here to switch" del panel de agencia. */
function CambioDeMarca() {
  const { marcas } = useEstudio();
  const activa = useMarcaActiva();
  const { abierto, setAbierto, ref } = usePopover();
  const marca = marcas.find((m) => m.id === activa);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        aria-label="Cambiar de marca"
        className="flex w-full items-center gap-3 rounded-[14px] border border-white/15 bg-white/[0.06] px-2.5 py-2.5 text-left transition hover:bg-white/[0.1]"
      >
        {marca ? (
          <MarcaSello marca={marca} size={32} />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#a7e3f2]">
            <MousePointerClick size={16} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-bold text-white">{marca ? marca.nombre : "Todas las marcas"}</span>
          <span className="block truncate text-[11px] text-white/60">Cambiar de marca</span>
        </span>
        <ChevronsUpDown size={16} className="shrink-0 text-white/70" />
      </button>
      <AnimatePresence>
        {abierto && (
          <motion.div
            {...caer}
            className="absolute left-0 right-0 z-50 mt-2 rounded-[16px] border border-white/10 p-1.5 shadow-2xl"
            style={{ background: "#22355a" }}
          >
            <OpcionesMarca alElegir={() => setAbierto(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Los créditos del mes de lo que se está viendo: una marca o todas. */
function useCreditosMes() {
  const { marcas, uso } = useEstudio();
  const activa = useMarcaActiva();
  const mes = diaDe(localSV()).slice(0, 7);
  const usado = creditosTotal(deMarca(uso, activa).filter((u) => localSV(Date.parse(u.fecha)).startsWith(mes)));
  const plan = (activa === "todas" ? marcas : marcas.filter((m) => m.id === activa)).reduce((s, m) => s + m.creditosPlan, 0);
  return { usado, plan, quedan: Math.max(0, plan - usado), pct: plan ? Math.min(100, (usado / plan) * 100) : 0 };
}

function MedidorCreditos() {
  const { usado, plan, quedan, pct } = useCreditosMes();
  const color = pct >= 100 ? "var(--es-rojo)" : pct >= 80 ? "var(--es-ambar)" : "var(--es-acento)";
  return (
    <Link href="/estudio/creditos" className="block rounded-[14px] bg-white/[0.05] px-3 py-3 transition hover:bg-white/[0.08]">
      <span className="flex items-baseline justify-between">
        <span className="text-[12px] font-semibold text-white/75">Créditos del mes</span>
        <span className="es-rotulo text-[17px] font-semibold text-white">{creditos(quedan)}</span>
      </span>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </span>
      <span className="mt-1.5 block text-[11px] text-white/55">
        {creditos(usado)} de {creditos(plan)} usados
      </span>
    </Link>
  );
}

function MenuCuenta({ onLogout, arriba = false }: { onLogout?: () => void; arriba?: boolean }) {
  const { abierto, setAbierto, ref } = usePopover();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-label="Cuenta"
        aria-expanded={abierto}
        className={cn(
          "flex items-center gap-2.5 rounded-[14px] text-left transition",
          arriba ? "w-full px-2 py-2 hover:bg-white/[0.06]" : "",
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#a7e3f2] to-[#3fa6c4] text-[12.5px] font-bold text-[#0b1830]">
          MG
        </span>
        {arriba && (
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-white">Mario G.</span>
            <span className="block truncate text-[11px] text-white/55">Dirección de contenido</span>
          </span>
        )}
      </button>
      <AnimatePresence>
        {abierto && (
          <motion.div
            {...caer}
            className={cn(
              "absolute z-50 w-[260px] space-y-2 rounded-[16px] border border-white/10 p-2 shadow-2xl",
              arriba ? "bottom-full left-0 mb-2" : "right-0 mt-2",
            )}
            style={{ background: "#22355a" }}
          >
            <ClienteSwitcher />
            <button
              type="button"
              onClick={() => {
                restablecer();
                setAbierto(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-[13px] text-white/75 transition hover:bg-white/[0.07] hover:text-white"
            >
              <RotateCcw size={15} />
              Restablecer la muestra
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-[13px] text-white/75 transition hover:bg-white/[0.07] hover:text-white"
            >
              <LogOut size={15} />
              Salir
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function usePorAprobar(): number {
  const { piezas } = useEstudio();
  const activa = useMarcaActiva();
  return deMarca(piezas, activa).filter((p) => p.estado === "por_aprobar").length;
}

/** La barra lateral de escritorio, como la del panel de agencia de BetMe. */
function BarraLateral({ actual, onLogout }: { actual: Pantalla; onLogout?: () => void }) {
  const porAprobar = usePorAprobar();
  return (
    <aside className="hidden w-[256px] shrink-0 flex-col border-r border-white/[0.06] bg-[#1b2a4a] px-4 pb-4 pt-7 lg:flex">
      <WordmarkBetMe />
      <div className="mt-7">
        <CambioDeMarca />
      </div>
      <nav aria-label="Pantallas" className="mt-5 flex flex-col gap-1">
        {PANTALLAS.map((p) => {
          const on = p.href === actual.href;
          return (
            <Link
              key={p.href}
              href={p.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex items-center gap-3.5 rounded-[14px] px-3.5 py-2.5 text-[15px] font-semibold transition",
                on ? "bg-[#2e4d72] text-white" : "text-white/85 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              <p.Icono size={20} strokeWidth={1.8} className={on ? "text-white" : "text-[#a7c4e2]"} />
              <span className="flex-1">{p.titulo}</span>
              {p.href === "/estudio/aprobacion" && porAprobar > 0 && (
                <span className="rounded-[6px] bg-[var(--es-ambar)] px-1.5 py-0.5 text-[11px] font-bold leading-none text-[#1b2a4a]">
                  {porAprobar}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3 pt-6">
        <MedidorCreditos />
        <div className="border-t border-white/10 pt-3">
          <MenuCuenta onLogout={onLogout} arriba />
        </div>
      </div>
    </aside>
  );
}

/** En celular: los íconos abajo, como barra fija. */
function BarraInferior({ actual }: { actual: Pantalla }) {
  const porAprobar = usePorAprobar();
  return (
    <nav
      aria-label="Pantallas"
      className="fixed inset-x-3 bottom-3 z-40 flex items-center gap-0.5 overflow-x-auto rounded-[20px] border border-white/10 bg-[#1b2a4a]/95 p-1.5 shadow-2xl backdrop-blur lg:hidden"
    >
      {PANTALLAS.map((p) => {
        const on = p.href === actual.href;
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-label={p.titulo}
            aria-current={on ? "page" : undefined}
            className={cn("relative flex h-11 min-w-10 flex-1 items-center justify-center rounded-[14px]", on && "bg-[#2e4d72]")}
          >
            <p.Icono size={19} className={on ? "text-white" : "text-[#a7c4e2]"} />
            {p.href === "/estudio/aprobacion" && porAprobar > 0 && !on && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--es-ambar)] ring-2 ring-[#1b2a4a]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** En celular la barra lateral no se ve: el cambio de marca va arriba, compacto. */
function MarcaCompacta() {
  const { marcas } = useEstudio();
  const activa = useMarcaActiva();
  const { abierto, setAbierto, ref } = usePopover();
  const marca = marcas.find((m) => m.id === activa);
  return (
    <div ref={ref} className="relative lg:hidden">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-label="Cambiar de marca"
        className="flex h-10 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] pl-1.5 pr-2.5"
      >
        {marca ? (
          <MarcaSello marca={marca} size={28} />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold">{marcas.length}</span>
        )}
        <ChevronsUpDown size={14} className="text-white/70" />
      </button>
      <AnimatePresence>
        {abierto && (
          <motion.div
            {...caer}
            className="absolute right-0 z-50 mt-2 w-[280px] rounded-[16px] border border-white/10 p-1.5 shadow-2xl"
            style={{ background: "#22355a" }}
          >
            <OpcionesMarca alElegir={() => setAbierto(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Campana() {
  const n = usePorAprobar();
  return (
    <Link
      href="/estudio/aprobacion"
      aria-label={`${n} piezas por aprobar`}
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-[var(--text-2)] transition hover:text-[var(--text)]"
    >
      <Bell size={17} />
      {n > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--es-ambar)] px-1 text-[10.5px] font-bold text-[#1b2a4a]">
          {n}
        </span>
      )}
    </Link>
  );
}

export function ShellEstudio({ children, onLogout }: { children: ReactNode; onLogout?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const enEstudio = pathname === "/estudio" || pathname.startsWith("/estudio/");
  const actual = pantallaDe(pathname);

  useEffect(() => {
    if (!enEstudio) router.replace("/estudio");
  }, [enEstudio, router]);

  useEffect(() => {
    tick();
    const id = window.setInterval(() => tick(), 3000);
    return () => window.clearInterval(id);
  }, []);

  const hoy = fechaCorta(diaDe(localSV()));

  return (
    <MotionConfig reducedMotion="user">
      <FuentesRotulo />
      <div data-shell="estudio" className="flex h-[100dvh] overflow-hidden">
        <BarraLateral actual={actual} onLogout={onLogout} />
        <BarraInferior actual={actual} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="relative z-30 flex items-center gap-3 px-4 pb-2 pt-4 lg:px-7 lg:pt-6">
            <h1 className="es-rotulo text-[30px] font-semibold leading-none tracking-[0.005em] lg:text-[36px]">{actual.titulo}</h1>
            <span className="ml-1 hidden rounded-full border border-[var(--border)] px-2.5 py-1 text-[12px] text-[var(--text-2)] sm:inline">
              Hoy, {hoy}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <MarcaCompacta />
              <Campana />
              <span className="lg:hidden">
                <MenuCuenta onLogout={onLogout} />
              </span>
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-3 lg:px-7 lg:pb-8">{enEstudio ? children : null}</main>
        </div>
      </div>
    </MotionConfig>
  );
}
