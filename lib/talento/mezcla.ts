// Como se juntan los candidatos reales (servidor) con el tablero local
// (vacantes, entrevistas, onboarding), y que postulaciones pinta el Pipeline.
// Funciones puras: el store y las pruebas usan las mismas.

import { esVacanteDeFormulario, vacanteDeFormulario } from "./formulario";
import type { Candidato, EstadoTalento, Postulacion, Vacante } from "./tipos";

export interface Reales {
  candidatos: Candidato[];
  postulaciones: Postulacion[];
}

/**
 * Lo que ven las pantallas cuando hay candidatos reales.
 *
 * Toda postulacion real tiene que tener su vacante en el tablero: el Pipeline
 * solo pinta postulaciones de vacantes abiertas que conoce. Las de puestos del
 * formulario ("f-...") no existen en ningun navegador, asi que se arman aca a
 * partir de la postulacion misma.
 */
export function mezclarReales(local: EstadoTalento, real: Reales): EstadoTalento {
  const ids = new Set(real.postulaciones.map((p) => p.id));
  const conocidas = new Set(local.vacantes.map((v) => v.id));
  const extra = new Map<string, Vacante>();
  for (const p of real.postulaciones) {
    if (conocidas.has(p.vacanteId) || extra.has(p.vacanteId) || !esVacanteDeFormulario(p.vacanteId)) continue;
    const c = real.candidatos.find((x) => x.id === p.candidatoId);
    extra.set(p.vacanteId, vacanteDeFormulario(p.vacanteId, c?.puesto ?? c?.titular ?? "Sin puesto", p.creada));
  }
  return {
    ...local,
    vacantes: [...local.vacantes, ...extra.values()],
    candidatos: real.candidatos,
    postulaciones: real.postulaciones,
    entrevistas: local.entrevistas.filter((e) => ids.has(e.postulacionId)),
    onboarding: local.onboarding.filter((o) => ids.has(o.postulacionId)),
  };
}

/** Las postulaciones que muestra el Pipeline: todas las de vacantes abiertas, o las de una. */
export function postulacionesDelTablero(estado: EstadoTalento, vacanteId: string): Postulacion[] {
  const abiertas = new Set(estado.vacantes.filter((v) => v.estado === "abierta").map((v) => v.id));
  return estado.postulaciones.filter((p) => (vacanteId === "todas" ? abiertas.has(p.vacanteId) : p.vacanteId === vacanteId));
}
