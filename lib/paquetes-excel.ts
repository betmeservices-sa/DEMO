// La tabla de paquetes como hoja de Excel: la misma tabla del tablero, con
// cabecera, una fila por paquete y las fechas en hora de El Salvador. Puro.

import { TZ } from "./formato-agencia";
import type { FilaDePaquete } from "./plan-conversaciones";
import type { Celda } from "./xlsx-minimo";

/** "01/09/2026 10:43", que Excel entiende como fecha si se lo pide. */
const FECHA = new Intl.DateTimeFormat("es-SV", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
export const fechaExcel = (iso: string | null): string => (iso ? FECHA.format(new Date(iso)).replace(",", "") : "");

export const ESTADO_PAQUETE: Record<FilaDePaquete["estado"], string> = {
  lleno: "Se acabó",
  en_curso: "En curso",
  cerrado: "Cerró el mes sin llenarse",
};

export const CABECERA_PAQUETES = [
  "Mes",
  "Paquete",
  "Inicio",
  "Fin",
  "Normales usadas",
  "Normales del paquete",
  "Day Pass usadas",
  "Day Pass del paquete",
  "Estado",
] as const;

/** Anchos de columna en caracteres, uno por cabecera. */
export const ANCHOS_PAQUETES = [18, 9, 17, 17, 16, 20, 16, 20, 26] as const;

export function filasParaExcel(filas: readonly FilaDePaquete[]): Celda[][] {
  return [
    [...CABECERA_PAQUETES],
    ...filas.map((f): Celda[] => [
      f.ciclo,
      f.numero,
      fechaExcel(f.inicio),
      fechaExcel(f.fin),
      f.usadas,
      f.incluidas,
      f.dayPassUsadas,
      f.dayPassIncluidas,
      ESTADO_PAQUETE[f.estado],
    ]),
  ];
}
