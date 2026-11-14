// La base completa del laboratorio, tal como la consulta `kb_buscar`.
//
// Los datos salen del respaldo del WhatsApp de la Sucursal Escalón (1,803 chats
// de 2022 a octubre de 2026), cruzados con la base del hospital del mismo grupo.
// Cada registro dice su fuente; lo que no cuadra queda en `notas`, que el
// modelo no ve.
//
// PRECIOS: desde el 2026-11-12 mandan los del Excel oficial del lab
// (lab-kb-excel.ts). Sobre cada examen de la base se pone el precio, el precio
// con aseguradora, el tiempo y la indicación previa del Excel; los exámenes del
// Excel que la base no tenía se agregan.

import type { BaseLab, ExamenKb } from "./lab-kb";
import { EXAMENES_LAB } from "./lab-kb-examenes";
import { EXAMENES_EXCEL, PRECIOS_EXCEL, type PrecioExcel } from "./lab-kb-excel";
import { CONVENIOS_LAB, PROMOCIONES_LAB, SUCURSALES_LAB, TEMAS_LAB } from "./lab-kb-negocio";

// Exámenes de la base que en el Excel tienen otro nombre ("T-4", "Vitamina B-12"):
// toman el precio de esa fila, y la fila no se agrega aparte (serían dos
// respuestas para lo mismo, una sin precio).
const UNIR: Record<string, string> = {
  "lab-t3": "lab-xl-06002",
  "lab-t4": "lab-xl-06004",
  "lab-vitamina-b12": "lab-xl-03031",
  "lab-aso": "lab-xl-05004",
  "lab-anticoagulante-lupico": "lab-xl-05012",
  "lab-maternit21": "lab-xl-07009",
  "lab-ck-mb": "lab-xl-04009",
  "lab-duo-dengue": "lab-xl-duo-dengue-antigeno-anticuerpos",
};
// Filas del Excel que repiten un examen que ya tiene su precio en la base.
// lab-xl-07005: el CA 15-3, que ya es lab-ca153 con el precio de esa misma fila.
const REPETIDOS = new Set(["lab-xl-06005", "lab-xl-07005"]);

function precioDe(id: string): PrecioExcel | undefined {
  if (PRECIOS_EXCEL[id]) return PRECIOS_EXCEL[id];
  const fila = EXAMENES_EXCEL.find((x) => x.id === UNIR[id]);
  if (!fila) return undefined;
  return { precio: fila.precio, precioAseguradora: fila.precioAseguradora, resultado: fila.resultado, indicacion: fila.preparacion === "No requiere preparación previa." ? undefined : fila.preparacion, excel: fila.nombre };
}

function conPrecioOficial(e: ExamenKb): ExamenKb {
  const x = precioDe(e.id);
  if (!x) return e;
  return {
    ...e,
    estado: "vigente",
    precio: x.precio ?? e.precio,
    precioAseguradora: x.precioAseguradora ?? e.precioAseguradora,
    resultado: x.resultado ?? e.resultado,
    // La indicación del Excel es la oficial; si dice "Ninguna", se conserva lo
    // de la base (suele explicar más) o se dice que no pide preparación.
    preparacion: x.indicacion ?? e.preparacion ?? "No requiere preparación previa.",
    fuente: `precios - IA Valeria (Excel del lab, 2026-11-12): ${x.excel}; ${e.fuente}`,
  };
}

export const BASE_LAB: BaseLab = {
  examenes: [
    ...EXAMENES_LAB.map(conPrecioOficial),
    ...EXAMENES_EXCEL.filter((x) => !Object.values(UNIR).includes(x.id) && !REPETIDOS.has(x.id)),
  ],
  sucursales: SUCURSALES_LAB,
  convenios: CONVENIOS_LAB,
  temas: TEMAS_LAB,
  promociones: PROMOCIONES_LAB,
};
