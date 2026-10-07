"use client";

// Lo que el shell "flotante" necesita saber de cada cliente que lo usa: que
// modulos van en el riel y que casos urgentes alimentan la campana y el
// tablero. Hoy lo usa solo la Caja de Credito de Chalatenango; el dia que otro
// cliente quiera esta cara, se suma aca y en su TenantConfig (shell, areas).

import type { DepartmentId } from "./data/types";
import type { ModuleId } from "./modulos";
import { MODULOS_CAJA } from "./modulos";
import type { TenantId } from "./tenants/types";
import { URGENTES, type Urgente } from "./tenants/chalatenango-panel";
import { fijarArea } from "./area-shell";
import { TENANTS } from "./tenants";

const MENU: Partial<Record<TenantId, readonly ModuleId[]>> = {
  chalatenango: MODULOS_CAJA,
};

const URGENTES_DE: Partial<Record<TenantId, Urgente[]>> = {
  chalatenango: URGENTES,
};

/** Los modulos del riel, en orden. */
export function menuFlotante(tenant: TenantId): readonly ModuleId[] {
  return MENU[tenant] ?? MODULOS_CAJA;
}

export function urgentesDe(tenant: TenantId): Urgente[] {
  return URGENTES_DE[tenant] ?? [];
}

/**
 * Abre una conversacion en la bandeja, venga de donde venga (busqueda,
 * notificaciones, el tablero). Si la bandeja ya esta abierta le avisa por un
 * evento; si no, la deja anotada y navega, y la bandeja la toma al montar.
 * De paso pone las pestanas en el area de esa conversacion, para que tambien
 * aparezca seleccionada en la lista.
 */
export function abrirConversacion(
  tenant: TenantId,
  id: string,
  departamento: DepartmentId | undefined,
  pathname: string,
  navegar: (ruta: string) => void,
): void {
  const areas = TENANTS[tenant].areas ?? [];
  if (departamento && areas.includes(departamento)) fijarArea(departamento);
  window.sessionStorage.setItem("ccg.abrirConv", id);
  if (pathname === "/") {
    window.dispatchEvent(new CustomEvent("ccg:abrir-conv", { detail: id }));
  } else {
    navegar("/");
  }
}
