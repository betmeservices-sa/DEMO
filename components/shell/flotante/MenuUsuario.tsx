"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut } from "lucide-react";
import { useRole } from "@/lib/roles";
import { useYo, useYoNombre } from "@/lib/yo";
import { staff, ME } from "@/lib/data/seed";
import { Avatar, inicialesDe } from "@/components/ui/Avatar";
import { RoleSwitcher } from "../RoleSwitcher";
import { CambiarClave } from "../CambiarClave";
import { ClienteSwitcher } from "../ClienteSwitcher";
import { usePopover } from "./usePopover";

/** El usuario, arriba a la derecha: su perfil, "ver como", su clave y salir. */
export function MenuUsuario({ onLogout }: { onLogout?: () => void }) {
  const { def } = useRole();
  const yoId = useYo();
  const nombreSesion = useYoNombre();
  const ficha = staff.find((s) => s.id === yoId) ?? staff.find((s) => s.id === ME)!;
  const nombre = nombreSesion ?? ficha.nombre;
  const { abierto, setAbierto, ref } = usePopover();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Menú del usuario"
        aria-expanded={abierto}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition hover:bg-[var(--surface)] xl:pr-2.5"
      >
        <Avatar iniciales={inicialesDe(nombre)} size={34} />
        <span className="hidden min-w-0 text-left leading-tight xl:block">
          <span className="block max-w-[150px] truncate text-[12.5px] font-bold text-[var(--text)]">{nombre}</span>
          <span className="block max-w-[150px] truncate text-[11px] text-[var(--text-3)]">{def.nombre}</span>
        </span>
        <ChevronDown size={15} className="hidden text-[var(--text-3)] xl:block" />
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-[280px] origin-top-right space-y-3 rounded-2xl bg-[var(--card)] p-3 shadow-xl ring-1 ring-[var(--border)]"
          >
            <div className="flex items-center gap-2.5 px-1">
              <Avatar iniciales={inicialesDe(nombre)} size={38} />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[13.5px] font-bold text-[var(--text)]">{nombre}</p>
                <p className="truncate text-[11.5px] text-[var(--text-3)]">{def.nombre}</p>
              </div>
            </div>
            <RoleSwitcher arriba={false} />
            <CambiarClave />
            <ClienteSwitcher />
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[var(--brand-red)] transition hover:bg-[var(--surface)]"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
