"use client";

// La cara "flotante" del panel, elegida por cliente (TenantConfig.shell). Hoy
// la usa la Caja de Credito de Chalatenango.
//
//   - A la izquierda, un riel oscuro en pastilla con los modulos (solo iconos,
//     con tooltip). En celular baja y queda como barra inferior.
//   - Arriba, una barra en pastilla: la marca, las areas del cliente como
//     pestanas (filtran la bandeja y el tablero), la busqueda, la campana y el
//     usuario.
//   - El contenido flota en tarjetas blancas sobre un fondo con un tinte de la
//     marca. La bandeja y el tablero arman sus propias tarjetas; el resto de
//     las pantallas va dentro de una.
//
// Movimiento sobrio y apagado para quien pide menos movimiento: MotionConfig
// con reducedMotion="user" y las transiciones de CSS caen con la media query.

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig } from "framer-motion";
import { cn } from "@/lib/cn";
import { activeTenant } from "@/lib/tenants/active";
import { Brand } from "../Brand";
import { RielLateral, BarraInferior } from "./Riel";
import { PestanasArea } from "./PestanasArea";
import { Busqueda } from "./Busqueda";
import { Notificaciones } from "./Notificaciones";
import { MenuUsuario } from "./MenuUsuario";

// Pantallas que arman sus propias tarjetas sobre el fondo. El resto se mete en
// una tarjeta grande, para que una pantalla pensada para el shell de siempre
// no quede pintada directo sobre el tinte.
function armaSusTarjetas(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/dashboard");
}

// Donde tienen sentido las pestanas de area: las pantallas que filtran.
function filtraPorArea(pathname: string): boolean {
  return armaSusTarjetas(pathname);
}

export function ShellFlotante({ children, onLogout }: { children: ReactNode; onLogout?: () => void }) {
  const pathname = usePathname();
  const pestanas = filtraPorArea(pathname);

  return (
    <MotionConfig reducedMotion="user">
      <div data-shell="flotante" className="flex h-[100dvh] overflow-hidden">
        <RielLateral onLogout={onLogout} />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* z-30: la barra usa backdrop-filter, que arma su propio contexto de
              apilamiento; sin esto la campana y la busqueda quedan debajo de
              las tarjetas de la bandeja. */}
          <header className="relative z-30 px-3 pt-3 lg:pl-1 lg:pr-4 lg:pt-4">
            <div className="caja-barra flex items-center gap-2 rounded-full py-1.5 pl-2 pr-1.5 lg:gap-3 lg:pl-4">
              <span className="lg:hidden">
                <Brand compact />
              </span>
              <span className="hidden shrink-0 lg:block">
                <Brand />
              </span>
              <span className="min-w-0 truncate text-[14px] font-extrabold tracking-tight text-[var(--brand-blue)] lg:hidden">
                {activeTenant().brand.nombreCorto}
              </span>

              <div className="flex min-w-0 flex-1 justify-center">
                {pestanas && <PestanasArea grupo="barra" className="hidden lg:flex" />}
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <Busqueda />
                <Notificaciones />
                <MenuUsuario onLogout={onLogout} />
              </div>
            </div>

            {/* En celular las pestanas van en su propia fila, deslizables. */}
            {pestanas && (
              <div className="-mx-3 mt-2 overflow-x-auto px-3 pb-1 lg:hidden">
                <PestanasArea grupo="fila" className="w-max bg-[var(--card)] shadow-sm ring-1 ring-[var(--border)]" />
              </div>
            )}
          </header>

          <main
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 pb-[92px] pt-3 lg:pb-4 lg:pl-1 lg:pr-4",
            )}
          >
            {armaSusTarjetas(pathname) ? (
              children
            ) : (
              <div className="caja-tarjeta flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
            )}
          </main>
        </div>

        <BarraInferior />
      </div>
    </MotionConfig>
  );
}
