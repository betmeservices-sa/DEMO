// Qué proveedor contesta cada servicio.
//
// Mientras un servicio no tenga su adaptador real registrado aquí, contesta
// el simulado. Conectar uno = escribir el adaptador con la interfaz de
// tipos.ts (llave en el entorno del servidor, nunca en el navegador) y
// ponerlo en REALES. Las rutas de /api/estudio y las pantallas no cambian.

import { llevaImagen, origenDe, pedidosDePieza } from "../imagen";
import { llevaRotulo } from "../letras";
import type { Marca, Pieza } from "../tipos";
import { simulados } from "./simulado";
import type { Proveedores, UsoSinId } from "./tipos";

const REALES: Partial<Proveedores> = {};

export function proveedores(): Proveedores {
  return { ...simulados, ...REALES };
}

/**
 * Genera las imágenes de las piezas que las piden al modelo: un pedido por
 * lámina, con el espacio libre donde va su texto. Las fotos de obra no pasan
 * por aquí. Si una imagen falla, falla el encargo entero: así no queda
 * cobrada una imagen que no salió.
 */
export async function conImagenes(piezas: Pieza[], marca: Marca, imagen = proveedores().imagen): Promise<Pieza[]> {
  return Promise.all(
    piezas.map(async (p) => {
      if (!llevaImagen(p.tipo) || origenDe(p) !== "ia" || p.pedidosImagen?.length) return p;
      const pedidos = pedidosDePieza(p, marca);
      const urls = await Promise.all(pedidos.map((pd) => imagen.generar(pd, marca.id).then((r) => r.url)));
      return { ...p, medios: urls, pedidosImagen: pedidos };
    }),
  );
}

/**
 * Lee la portada de cada pieza que lleva texto encima, para sugerir su letra.
 * Si la lectura falla la pieza sale igual: la letra se sugiere sin ella.
 */
export async function conLectura(piezas: Pieza[], vision = proveedores().vision): Promise<{ piezas: Pieza[]; uso: UsoSinId[] }> {
  const uso: UsoSinId[] = [];
  const leidas = await Promise.all(
    piezas.map(async (p) => {
      const portada = p.medios[0];
      if (!portada || !llevaRotulo(p.tipo)) return p;
      try {
        const r = await vision.leer(portada);
        uso.push(...r.uso.map((u) => ({ ...u, piezaId: p.id })));
        return { ...p, lectura: r.lectura };
      } catch {
        return p;
      }
    }),
  );
  return { piezas: leidas, uso };
}

export type { Proveedores } from "./tipos";
