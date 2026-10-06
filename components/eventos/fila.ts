// Una propuesta con lo que se calcula encima: prioridad, faltantes y plazo.
// Se calcula una vez por carga y lo comparten la lista, el tablero, el
// calendario y la ficha.

import type { Propuesta } from "@/lib/eventos/tipos";
import {
  calcularPrioridad,
  datosFaltantes,
  plazoPrimerContacto,
  type EstadoPlazo,
  type Faltante,
  type Prioridad,
} from "@/lib/eventos/prioridad";
import { diaSV } from "@/lib/eventos/fechas";

export interface Fila {
  p: Propuesta;
  prioridad: Prioridad;
  faltantes: Faltante[];
  plazo: EstadoPlazo;
}

export function armarFilas(propuestas: Propuesta[], ahora: number): Fila[] {
  const hoy = diaSV(ahora);
  return propuestas.map((p) => ({
    p,
    prioridad: calcularPrioridad(p.datos, hoy),
    faltantes: datosFaltantes(p.datos),
    plazo: plazoPrimerContacto(p, ahora),
  }));
}

/** Si el evento ya terminó. Sin fecha, todavía no. */
export function yaPaso(p: Propuesta, hoy: string): boolean {
  const fin = p.datos.fecha_fin || p.datos.fecha_inicio;
  return Boolean(fin) && fin < hoy;
}
