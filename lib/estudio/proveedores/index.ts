// Qué proveedor contesta cada servicio.
//
// Mientras un servicio no tenga su adaptador real registrado aquí, contesta
// el simulado. Conectar uno = escribir el adaptador con la interfaz de
// tipos.ts (llave en el entorno del servidor, nunca en el navegador) y
// ponerlo en REALES. Las rutas de /api/estudio y las pantallas no cambian.

import { llevaImagen, origenDe, pedidosDePieza } from "../imagen";
import { llevaRotulo } from "../letras";
import type { Marca, Pieza } from "../tipos";
import { imagenOpenAI, visionOpenAI } from "./openai";
import { simulados } from "./simulado";
import type { Proveedores, ProveedorVision, UsoSinId } from "./tipos";

/**
 * Las fotos de muestra viven dentro del panel (/brand/estudio) y OpenAI no
 * llega a ellas; su lectura ya está en la tabla de la muestra. Al modelo van
 * solo las imágenes generadas.
 */
function visionConMuestra(real: ProveedorVision): ProveedorVision {
  return {
    nombre: real.nombre,
    leer: (url) => (/^(https?:|data:)/.test(url) ? real.leer(url) : simulados.vision.leer(url)),
  };
}

/** Con la llave de OpenAI del panel, la imagen y su lectura salen de verdad. */
function reales(): Partial<Proveedores> {
  const openai = process.env.OPENAI_API_KEY;
  return openai ? { imagen: imagenOpenAI(openai), vision: visionConMuestra(visionOpenAI(openai)) } : {};
}

export function proveedores(): Proveedores {
  return { ...simulados, ...reales() };
}

const IMAGENES_A_LA_VEZ = 4;

/**
 * Genera las imágenes de las piezas que las piden al modelo: un pedido por
 * lámina, con el espacio libre donde va su texto. Las fotos de obra no pasan
 * por aquí. Si una imagen falla, falla el encargo entero: así no queda
 * cobrada una imagen que no salió.
 */
export async function conImagenes(piezas: Pieza[], marca: Marca, imagen = proveedores().imagen): Promise<Pieza[]> {
  const pedidos = piezas.map((p) =>
    !llevaImagen(p.tipo) || origenDe(p) !== "ia" || p.pedidosImagen?.length ? null : pedidosDePieza(p, marca),
  );
  const tareas = pedidos.flatMap((ps, i) => (ps ?? []).map((pd, j) => ({ i, j, pd })));
  const urls: string[][] = pedidos.map((ps) => (ps ? Array<string>(ps.length) : []));
  // De a pocas a la vez: un lote de carruseles son decenas de imágenes, y
  // todas juntas chocan con el límite por minuto de OpenAI. Si una falla, las
  // que faltan ya no se piden: el encargo entero va a fallar igual.
  let siguiente = 0;
  let fallo = false;
  const trabajador = async () => {
    while (!fallo && siguiente < tareas.length) {
      const t = tareas[siguiente++];
      try {
        urls[t.i][t.j] = (await imagen.generar(t.pd, marca.id)).url;
      } catch (e) {
        fallo = true;
        throw e;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(IMAGENES_A_LA_VEZ, tareas.length) }, trabajador));
  return piezas.map((p, i) => (pedidos[i] ? { ...p, medios: urls[i], pedidosImagen: pedidos[i] } : p));
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
