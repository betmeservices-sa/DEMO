// Buscar dentro de una lista de exámenes.
//
// Las hojas de exámenes son largas (ciento cincuenta en laboratorio) y quien
// busca "tsh" o "glicosilada" no quiere recorrer las áreas: escribe y le quedan
// a la vista solo los que calzan. Vale para el doctor, para el mostrador y para
// el paciente en su teléfono, así que es puro y vive aparte.

import type { AreaExamenes, Examen } from "./examenes";

/** Minúsculas y sin tildes: "hemoglobina glicosilada" calza con "GLICOSILADA" y con "glicosílada". */
export function normalizar(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Si el examen calza con lo escrito: por nombre, por código o por la nota de preparación. */
export function coincide(e: Examen, q: string): boolean {
  const n = normalizar(q);
  if (!n) return true;
  // Cada palabra tiene que estar en algún campo: "glucosa ayunas" encuentra
  // "Glucosa en ayunas" aunque las palabras no vayan seguidas.
  const campos = normalizar(`${e.nombre} ${e.codigo} ${e.nota ?? ""}`);
  return n.split(/\s+/).every((p) => campos.includes(p));
}

/**
 * Las áreas con solo los exámenes que calzan. Sin texto, las áreas tal cual.
 * Si la palabra es el nombre del área ("hormonas"), entra el área completa.
 */
export function filtrarAreas(areas: AreaExamenes[], q: string): AreaExamenes[] {
  const n = normalizar(q);
  if (!n) return areas;
  return areas
    .map((a) =>
      normalizar(a.nombre).includes(n)
        ? a
        : { ...a, examenes: a.examenes.filter((e) => coincide(e, q)) },
    )
    .filter((a) => a.examenes.length > 0);
}

/** Cuántos exámenes quedan a la vista. */
export function cuantos(areas: AreaExamenes[]): number {
  return areas.reduce((n, a) => n + a.examenes.length, 0);
}
