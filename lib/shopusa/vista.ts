// Todo lo que pintan las pantallas de ShopUSA, armado de una vez a partir de
// la muestra y los movimientos. Puro: el store del navegador solo lo cachea y
// avisa cuando cambia.

import type { Aviso, Carga, Cliente, Movimiento, Paquete } from "./tipos";
import { aplicarMovimientos } from "./estado";
import { alertasDe, type Alertas } from "./alertas";
import { avisosDe } from "./avisos";
import { CAPTURAS_PENDIENTES, type CapturaPendiente, type MuestraShopusa } from "./semilla";

export interface VistaShopusa {
  ahora: number;
  clientes: Cliente[];
  cargas: Carga[];
  paquetes: Paquete[];
  alertas: Alertas;
  /** Las capturas que la IA leyó y todavía no son paquete. */
  capturasPendientes: CapturaPendiente[];
  /** Los avisos de WhatsApp por paquete, en orden. */
  avisos: Map<string, Aviso[]>;
}

export function armarVista(base: MuestraShopusa, movimientos: readonly Movimiento[]): VistaShopusa {
  const { paquetes, cargas } = aplicarMovimientos(base, movimientos);
  const clientes = base.clientes;

  const avisos = new Map<string, Aviso[]>();
  for (const p of paquetes) {
    const cliente = clientes.find((c) => c.id === p.clienteId);
    if (!cliente) continue;
    avisos.set(p.id, avisosDe(p, { cliente, cargas, paquetes }));
  }

  const capturasPendientes = CAPTURAS_PENDIENTES.filter(
    (cap) => !paquetes.some((p) => p.tracking === cap.lectura.tracking),
  );

  return {
    ahora: base.ahora,
    clientes,
    cargas,
    paquetes,
    alertas: alertasDe(paquetes, base.ahora),
    capturasPendientes,
    avisos,
  };
}

export function clienteDe(v: VistaShopusa, id: string): Cliente | undefined {
  return v.clientes.find((c) => c.id === id);
}

export function paquetesDe(v: VistaShopusa, clienteId: string): Paquete[] {
  return v.paquetes.filter((p) => p.clienteId === clienteId);
}

/** Los avisos que salieron de algo hecho en este demo (los que la bandeja todavía no tiene). */
export function avisosDelDemo(v: VistaShopusa): Aviso[] {
  const out: Aviso[] = [];
  for (const xs of v.avisos.values()) for (const a of xs) if (a.movId) out.push(a);
  return out.sort((a, b) => a.ts.localeCompare(b.ts));
}

/** El último aviso que recibió un cliente por un paquete. */
export function ultimoAviso(v: VistaShopusa, paqueteId: string): Aviso | undefined {
  const xs = v.avisos.get(paqueteId);
  return xs?.[xs.length - 1];
}
