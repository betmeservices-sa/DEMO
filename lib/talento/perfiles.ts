// Orden y filtro de fechas de la pantalla de Perfiles. Las fechas se cortan
// por DIA DE EL SALVADOR: "hoy" es hoy en San Salvador, no en UTC.

import { diaSv, sumarDias } from "./fechas";
import type { Candidato } from "./tipos";

export type OrdenPerfiles = "recientes" | "antiguos" | "nombre" | "match";

export type FiltroFecha =
  | { tipo: "todos" }
  | { tipo: "hoy" }
  | { tipo: "7" }
  | { tipo: "30" }
  | { tipo: "rango"; desde?: string; hasta?: string };

/** Entro en las ultimas 24 horas. */
export function esNuevo(c: Pick<Candidato, "creado">, ahora: Date = new Date()): boolean {
  const dif = ahora.getTime() - new Date(c.creado).getTime();
  return dif >= 0 && dif < 24 * 60 * 60 * 1000;
}

export function pasaFecha(c: Pick<Candidato, "creado">, f: FiltroFecha, ahora: Date = new Date()): boolean {
  const dia = diaSv(c.creado);
  const hoy = diaSv(ahora);
  switch (f.tipo) {
    case "todos":
      return true;
    case "hoy":
      return dia === hoy;
    case "7":
      return dia >= sumarDias(hoy, -6) && dia <= hoy;
    case "30":
      return dia >= sumarDias(hoy, -29) && dia <= hoy;
    case "rango": {
      // Si alguien pone el rango al reves, se entiende igual.
      const [a, b] = f.desde && f.hasta && f.desde > f.hasta ? [f.hasta, f.desde] : [f.desde, f.hasta];
      return (!a || dia >= a) && (!b || dia <= b);
    }
  }
}

/** Ordena sin tocar la lista original. `match` trae el mejor puntaje de cada uno. */
export function ordenarPerfiles<T extends { c: Candidato; match?: number }>(lista: T[], orden: OrdenPerfiles): T[] {
  const copia = [...lista];
  const porFecha = (a: T, b: T) => a.c.creado.localeCompare(b.c.creado) || a.c.id.localeCompare(b.c.id);
  switch (orden) {
    case "recientes":
      return copia.sort((a, b) => -porFecha(a, b));
    case "antiguos":
      return copia.sort(porFecha);
    case "nombre":
      return copia.sort((a, b) => a.c.nombre.localeCompare(b.c.nombre, "es"));
    case "match":
      return copia.sort((a, b) => (b.match ?? -1) - (a.match ?? -1) || -porFecha(a, b));
  }
}
