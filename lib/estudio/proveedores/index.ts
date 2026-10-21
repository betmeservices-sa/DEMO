// Qué proveedor contesta cada servicio.
//
// Mientras un servicio no tenga su adaptador real registrado aquí, contesta
// el simulado. Conectar uno = escribir el adaptador con la interfaz de
// tipos.ts (llave en el entorno del servidor, nunca en el navegador) y
// ponerlo en REALES. Las rutas de /api/estudio y las pantallas no cambian.

import { simulados } from "./simulado";
import type { Proveedores } from "./tipos";

const REALES: Partial<Proveedores> = {};

export function proveedores(): Proveedores {
  return { ...simulados, ...REALES };
}

export type { Proveedores } from "./tipos";
