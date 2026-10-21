"use client";

// La cara del motor de contenido (TenantConfig.shell = "estudio").
//
//   - Un riel de vidrio a la izquierda con las pantallas; en celular baja y
//     queda como barra inferior.
//   - Arriba, el nombre de la pantalla en rótulo, el día, el selector de marca
//     (las marcas a las que BetMe le hace contenido), la campana con lo que
//     espera aprobación y el menú de la cuenta.
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
  ChevronDown,
  Clapperboard,
  Images,
  LayoutDashboard,
  LogOut,
  Palette,
  Receipt,
  RotateCcw,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { elegirMarca, restablecer, tick, useEstudio, useMarcaActiva, deMarca } from "@/lib/estudio/store";
import { diaDe, fechaCorta, localSV } from "@/lib/estudio/fechas";
import { ClienteSwitcher } from "@/components/shell/ClienteSwitcher";
import { MarcaSello } from "./ui";

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
  { href: "/estudio/costos", titulo: "Costos", Icono: Receipt },
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

function SelectorMarca() {
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
        aria-label="Elegir marca"
        className="es-vidrio flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-[13px] font-semibold"
      >
        {marca ? (
          <MarcaSello marca={marca} size={26} />
        ) : (
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/10 text-[11px] font-bold">
            {marcas.length}
          </span>
        )}
        <span className="hidden max-w-[150px] truncate sm:inline">{marca ? marca.nombre : "Todas las marcas"}</span>
        <ChevronDown size={14} className="text-[var(--text-3)]" />
      </button>
      <AnimatePresence>
        {abierto && (
          <motion.div
            {...caer}
            className="es-vidrio absolute right-0 z-50 mt-2 w-[290px] rounded-[20px] p-1.5"
            style={{ background: "rgba(28,23,19,0.94)" }}
          >
            {[{ id: "todas" as const }, ...marcas].map((m) => {
              const esTodas = m.id === "todas";
              const real = esTodas ? null : marcas.find((x) => x.id === m.id)!;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    elegirMarca(m.id);
                    setAbierto(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2 text-left transition hover:bg-white/[0.06]"
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
                  {activa === m.id && <Check size={15} className="text-[var(--es-naranja)]" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Campana() {
  const { piezas } = useEstudio();
  const activa = useMarcaActiva();
  const n = deMarca(piezas, activa).filter((p) => p.estado === "por_aprobar").length;
  return (
    <Link
      href="/estudio/aprobacion"
      aria-label={`${n} piezas por aprobar`}
      className="es-vidrio relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-2)] transition hover:text-[var(--text)]"
    >
      <Bell size={17} />
      {n > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--es-naranja)] px-1 text-[10.5px] font-bold text-[#1a0d03]">
          {n}
        </span>
      )}
    </Link>
  );
}

function MenuCuenta({ onLogout }: { onLogout?: () => void }) {
  const { abierto, setAbierto, ref } = usePopover();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-label="Cuenta"
        aria-expanded={abierto}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ffb36b] to-[#e8650c] text-[13px] font-bold text-[#1a0d03] ring-2 ring-white/10"
      >
        MG
      </button>
      <AnimatePresence>
        {abierto && (
          <motion.div
            {...caer}
            className="es-vidrio absolute right-0 z-50 mt-2 w-[260px] space-y-2 rounded-[20px] p-2"
            style={{ background: "rgba(28,23,19,0.94)" }}
          >
            <div className="px-2.5 pb-1 pt-1.5">
              <p className="text-[13.5px] font-semibold">Mario G.</p>
              <p className="text-[12px] text-[var(--text-3)]">Dirección de contenido</p>
            </div>
            <ClienteSwitcher />
            <button
              type="button"
              onClick={() => {
                restablecer();
                setAbierto(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-[13px] text-[var(--text-2)] transition hover:bg-white/[0.06] hover:text-[var(--text)]"
            >
              <RotateCcw size={15} />
              Restablecer la muestra
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-[13px] text-[var(--text-2)] transition hover:bg-white/[0.06] hover:text-[var(--text)]"
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

function Riel({ actual }: { actual: Pantalla }) {
  const { piezas } = useEstudio();
  const activa = useMarcaActiva();
  const porAprobar = deMarca(piezas, activa).filter((p) => p.estado === "por_aprobar").length;
  return (
    <nav
      aria-label="Pantallas"
      className="es-vidrio fixed inset-x-3 bottom-3 z-40 flex items-center gap-0.5 overflow-x-auto rounded-[22px] p-1.5 lg:static lg:inset-auto lg:my-4 lg:ml-4 lg:w-[76px] lg:shrink-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:rounded-[30px] lg:py-4"
    >
      <Link
        href="/estudio"
        aria-label="Content Engine"
        className="mb-4 hidden h-11 w-11 items-center justify-center rounded-[16px] lg:flex"
        style={{ background: "linear-gradient(150deg, #ffb066, #ff7a1a 55%, #d9580a)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)" }}
      >
        <span className="es-rotulo text-[17px] font-bold text-[#1a0d03]">CE</span>
      </Link>
      {PANTALLAS.map((p) => {
        const on = p.href === actual.href;
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={on ? "page" : undefined}
            className="group relative flex h-11 min-w-10 flex-1 items-center justify-center rounded-[16px] lg:w-12 lg:min-w-11 lg:flex-none"
          >
            {on && (
              <motion.span
                layoutId="riel-activo"
                className="absolute inset-0 rounded-[16px]"
                style={{
                  background: "linear-gradient(180deg, #ff8a33, #f06a0c)",
                  boxShadow: "0 8px 22px -8px rgba(255,122,26,0.8), inset 0 1px 0 rgba(255,255,255,0.35)",
                }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <p.Icono
              size={19}
              className={cn("relative transition", on ? "text-[#1a0d03]" : "text-[var(--text-3)] group-hover:text-[var(--text)]")}
            />
            {p.href === "/estudio/aprobacion" && porAprobar > 0 && !on && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--es-ambar)] ring-2 ring-[#1b1612]" />
            )}
            <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-full bg-[#2a231d] px-3 py-1 text-[12px] font-semibold text-[var(--text)] opacity-0 shadow-lg transition group-hover:opacity-100 lg:block">
              {p.titulo}
            </span>
          </Link>
        );
      })}
    </nav>
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
      <div data-shell="estudio" className="flex h-[100dvh] overflow-hidden">
        <Riel actual={actual} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="relative z-30 flex items-center gap-3 px-4 pb-2 pt-4 lg:px-6 lg:pt-6">
            <h1 className="es-rotulo text-[30px] font-semibold leading-none tracking-[0.005em] lg:text-[36px]">{actual.titulo}</h1>
            <span className="ml-1 hidden rounded-full border border-[var(--border)] px-2.5 py-1 text-[12px] text-[var(--text-2)] sm:inline">
              Hoy, {hoy}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <SelectorMarca />
              <Campana />
              <MenuCuenta onLogout={onLogout} />
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-3 lg:px-6 lg:pb-8">{enEstudio ? children : null}</main>
        </div>
      </div>
    </MotionConfig>
  );
}
