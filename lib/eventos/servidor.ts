// Lo que arma el servidor para el tablero de Pizza Hut: muestra + real +
// movimientos, con la frontera del agente de voz aplicada acá (no en la
// pantalla).

import type { LlamadaEvento, Propuesta } from "./tipos";
import { aplicarMovimientos } from "./estado";
import { llamadasDeMuestra, propuestasDeMuestra } from "./semilla";
import { dondeGuarda, listarLlamadasReales, listarMovimientos, listarPropuestasReales, TENANT_EVENTOS } from "./store";
import { assistantIdsDeTenant } from "@/lib/tenants/voz";

/** Si la llamada es del agente de este cliente. Sin agente declarado, el endpoint es la frontera. */
export function llamadaDelTenant(assistantId: string | null | undefined): boolean {
  const mios = assistantIdsDeTenant(TENANT_EVENTOS);
  if (mios.length === 0) return true;
  return Boolean(assistantId) && mios.includes(assistantId as string);
}

export interface EstadoEventos {
  propuestas: Propuesta[];
  llamadas: LlamadaEvento[];
  guardaEn: "base" | "memoria";
  errorBase?: string;
}

export async function estadoEventos(ahora: number = Date.now()): Promise<EstadoEventos> {
  const muestra = propuestasDeMuestra(ahora);
  let reales: Propuesta[] = [];
  let llamadasReales: LlamadaEvento[] = [];
  let errorBase: string | undefined;
  try {
    const [p, l, m] = await Promise.all([listarPropuestasReales(), listarLlamadasReales(), listarMovimientos()]);
    reales = aplicarMovimientos(p, m);
    llamadasReales = l.filter((x) => llamadaDelTenant(x.assistantId));
    const conMovimientos = aplicarMovimientos(muestra, m);
    return {
      propuestas: [...reales, ...conMovimientos],
      llamadas: [...llamadasReales, ...llamadasDeMuestra(muestra, ahora, 30)].sort((a, b) => b.inicio.localeCompare(a.inicio)),
      guardaEn: dondeGuarda(),
    };
  } catch (err) {
    errorBase = err instanceof Error ? err.message : String(err);
    console.error("[eventos] no se pudo leer la base:", errorBase);
  }
  return {
    propuestas: muestra,
    llamadas: llamadasDeMuestra(muestra, ahora, 30),
    guardaEn: dondeGuarda(),
    errorBase,
  };
}
