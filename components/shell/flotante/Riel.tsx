"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, Bot, Contact, Inbox, LogOut, MessagesSquare, PhoneCall, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useRole } from "@/lib/roles";
import { MODULO_RUTA, type ModuleId } from "@/lib/modulos";
import { useStore } from "@/lib/store";
import { activeTenantId } from "@/lib/tenants/active";
import { veModuloVoz } from "@/lib/tenants/voz";
import { menuFlotante } from "@/lib/flotante";
import { Brand } from "../Brand";

// Nombre e icono de cada modulo que puede ir en el riel. El nombre no se pinta:
// es el tooltip y la etiqueta para lectores de pantalla.
const ITEM: Partial<Record<ModuleId, { label: string; Icon: LucideIcon }>> = {
  bandeja: { label: "Bandeja", Icon: Inbox },
  dashboard: { label: "Tablero", Icon: BarChart3 },
  contactos: { label: "Contactos", Icon: Contact },
  interno: { label: "Chat del equipo", Icon: MessagesSquare },
  llamadas: { label: "Llamadas", Icon: PhoneCall },
  agentes: { label: "Agente de voz", Icon: Bot },
};

function useItems() {
  const pathname = usePathname();
  const { def } = useRole();
  const { state } = useStore();
  const tenant = activeTenantId();
  const voz = veModuloVoz(tenant);
  const sinLeer = state.conversations.reduce((n, c) => n + c.noLeidos, 0);

  const items = menuFlotante(tenant)
    .filter((id) => def.ve.includes(id))
    .filter((id) => (id !== "llamadas" && id !== "agentes") || voz)
    .map((id) => {
      const href = MODULO_RUTA[id];
      const activo = href === "/" ? pathname === "/" : pathname.startsWith(href);
      return { id, href, activo, aviso: id === "bandeja" ? sinLeer : 0, ...ITEM[id]! };
    })
    .filter((it) => Boolean(it.Icon));
  return items;
}

/** El riel de escritorio: una pastilla oscura flotando a la izquierda. */
export function RielLateral({ onLogout }: { onLogout?: () => void }) {
  const items = useItems();
  return (
    <aside className="hidden w-[92px] shrink-0 items-center justify-center py-4 pl-4 lg:flex">
      <nav
        aria-label="Módulos"
        className="caja-riel flex h-full max-h-[720px] w-[64px] flex-col items-center rounded-[30px] px-2 py-3"
      >
        <span className="mb-4 flex rounded-[14px] bg-white p-1 shadow-sm">
          <Brand compact />
        </span>

        <ul className="flex flex-1 flex-col items-center gap-1.5">
          {items.map(({ id, href, label, Icon, activo, aviso }) => (
            <li key={id} className="group relative">
              <Link
                href={href}
                aria-label={label}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-2xl transition-colors duration-150",
                  activo ? "text-[var(--brand-blue-dark)]" : "text-white/80 hover:bg-white/10 hover:text-white",
                )}
              >
                {activo && (
                  <motion.span
                    layoutId="caja-riel-activo"
                    className="absolute inset-0 rounded-2xl bg-[var(--caja-lima)]"
                    transition={{ type: "spring", stiffness: 520, damping: 38 }}
                  />
                )}
                <Icon size={20} strokeWidth={2.1} className="relative" />
                {aviso > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10.5px] font-bold text-[var(--brand-blue-dark)] ring-2 ring-[var(--brand-blue)]">
                    {aviso > 9 ? "9+" : aviso}
                  </span>
                )}
              </Link>
              <span
                aria-hidden
                className="caja-tooltip pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[var(--text)] px-2.5 py-1.5 text-[12px] font-semibold text-white opacity-0 shadow-lg group-focus-within:opacity-100 group-hover:opacity-100"
              >
                {label}
              </span>
            </li>
          ))}
        </ul>

        {onLogout && (
          <div className="group relative mt-2">
            <button
              type="button"
              onClick={onLogout}
              aria-label="Cerrar sesión"
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white"
            >
              <LogOut size={19} />
            </button>
            <span
              aria-hidden
              className="caja-tooltip pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[var(--text)] px-2.5 py-1.5 text-[12px] font-semibold text-white opacity-0 shadow-lg group-focus-within:opacity-100 group-hover:opacity-100"
            >
              Cerrar sesión
            </span>
          </div>
        )}
      </nav>
    </aside>
  );
}

/** En celular el riel baja: barra inferior en pastilla, solo iconos. */
export function BarraInferior() {
  const items = useItems();
  return (
    <nav
      aria-label="Módulos"
      className="caja-riel fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-[26px] px-2 py-2 lg:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {items.map(({ id, href, label, Icon, activo, aviso }) => (
        <Link
          key={id}
          href={href}
          aria-label={label}
          aria-current={activo ? "page" : undefined}
          className={cn(
            "relative flex h-11 w-11 items-center justify-center rounded-2xl transition-colors duration-150",
            activo ? "text-[var(--brand-blue-dark)]" : "text-white/85",
          )}
        >
          {activo && (
            <motion.span
              layoutId="caja-barra-activo"
              className="absolute inset-0 rounded-2xl bg-[var(--caja-lima)]"
              transition={{ type: "spring", stiffness: 520, damping: 38 }}
            />
          )}
          <Icon size={20} strokeWidth={2.1} className="relative" />
          {aviso > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[var(--brand-blue-dark)] ring-2 ring-[var(--brand-blue)]">
              {aviso > 9 ? "9+" : aviso}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
