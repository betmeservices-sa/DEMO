// Los clientes de verdad que reporta el tablero de la agencia. Los demás
// tenants son demos para prospectos y no tienen nada que reportar acá.
//
// Los dos viven en hub.miagentia.com (repo yali): sus agentes contestan desde
// allá y este tablero solo los lee.

import type { TenantId } from "./tenants/types";

export interface ClienteDeLaAgencia {
  id: TenantId;
  /**
   * Vende por el chat: tiene reservas que contar y "Quién cerró". El hospital
   * no vende: de él se reporta el trabajo del agente, los casos y la gente.
   */
  vende: boolean;
  /**
   * Cómo firma su agente de IA los casos que abre (`creado_por`). El guion vivo
   * está en hub; el TenantConfig de este repo puede tener un nombre viejo.
   */
  agentes: readonly string[];
}

export const CLIENTES_AGENCIA: readonly ClienteDeLaAgencia[] = [
  { id: "yaly", vende: true, agentes: ["Sofía"] },
  // Valeria desde el 2026-10-09; antes se llamaba Claudia y sus casos viejos dicen eso.
  { id: "hospital", vende: false, agentes: ["Valeria", "Claudia"] },
];

export function clienteDeLaAgencia(id: string): ClienteDeLaAgencia | null {
  return CLIENTES_AGENCIA.find((c) => c.id === id) ?? null;
}

export interface Persona {
  usuario: string;
  nombre: string;
  rol: string;
}

/**
 * La gente de un cliente: las cuentas de este panel (variable USUARIOS) y las
 * del directorio de hub, que es donde viven las de un cliente que solo entra
 * por hub (las del hospital). Si una está en las dos, manda la del panel: así
 * lo que ya se veía no cambia.
 */
export function personasDelCliente(delPanel: readonly Persona[], deHub: readonly Persona[]): Persona[] {
  const vistas = new Set(delPanel.map((p) => p.usuario.toLowerCase()));
  return [...delPanel, ...deHub.filter((p) => !vistas.has(p.usuario.toLowerCase()))];
}
