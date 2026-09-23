// Aprobado / Rechazado: la decision del equipo sobre un candidato.
//
// Aprobar lo mueve un paso en el pipeline de su vacante; rechazar lo descarta
// con el motivo que escriba quien decide. Todo lo que se movio queda anotado
// en la decision, asi "Deshacer" deja el pipeline exactamente como estaba.

import { calcularMatch } from "./matching";
import type { Candidato, Decision, EstadoTalento, Etapa, MovimientoDecision, Postulacion } from "./tipos";

export type EstadoRevision = "pendiente" | "aprobado" | "rechazado";

export function estadoRevision(c: Pick<Candidato, "decision">): EstadoRevision {
  return c.decision?.resultado ?? "pendiente";
}

const ORDEN: Etapa[] = ["nuevo", "filtrado", "entrevista", "prueba", "oferta", "contratado"];

/** Postulaciones vivas del candidato en vacantes abiertas, la mas reciente primero. */
function activas(s: EstadoTalento, candidatoId: string): Postulacion[] {
  const abiertas = new Set(s.vacantes.filter((v) => v.estado === "abierta").map((v) => v.id));
  return s.postulaciones
    .filter((p) => p.candidatoId === candidatoId && abiertas.has(p.vacanteId) && p.etapa !== "descartado" && p.etapa !== "contratado")
    .sort((a, b) => b.creada.localeCompare(a.creada));
}

export type DestinoAprobado =
  | { tipo: "mover"; postulacionId: string; vacanteId: string; etapa: Etapa }
  | { tipo: "crear"; vacanteId: string; etapa: Etapa }
  | { tipo: "nada" };

/**
 * A donde va al aprobarlo.
 *
 * Si esta en una vacante, un paso adelante (Nuevo pasa a Preselección). Nunca a
 * Contratado: eso se cierra con la oferta, no con este boton. Si no esta en
 * ninguna, entra a su mejor vacante abierta por match, ya en Preselección.
 */
export function destinoAprobado(s: EstadoTalento, candidatoId: string): DestinoAprobado {
  const vivas = activas(s, candidatoId);
  if (vivas.length > 0) {
    const p = vivas[0];
    const sig = ORDEN[ORDEN.indexOf(p.etapa) + 1];
    if (!sig || sig === "contratado") return { tipo: "nada" };
    return { tipo: "mover", postulacionId: p.id, vacanteId: p.vacanteId, etapa: sig };
  }
  const c = s.candidatos.find((x) => x.id === candidatoId);
  if (!c) return { tipo: "nada" };
  const yaEsta = new Set(s.postulaciones.filter((p) => p.candidatoId === candidatoId).map((p) => p.vacanteId));
  const mejor = s.vacantes
    .filter((v) => v.estado === "abierta" && v.origen !== "formulario" && !yaEsta.has(v.id))
    .map((v) => ({ v, score: calcularMatch(c, v.requisitos).score }))
    .sort((a, b) => b.score - a.score || a.v.id.localeCompare(b.v.id))[0];
  return mejor ? { tipo: "crear", vacanteId: mejor.v.id, etapa: "filtrado" } : { tipo: "nada" };
}

/** Aplica la decision al estado. `idNueva` es el id de la postulacion si hay que crearla. */
export function decidir(
  s: EstadoTalento,
  candidatoId: string,
  resultado: Decision["resultado"],
  por: string,
  ts: string,
  idNueva: string,
  motivo?: string,
): EstadoTalento {
  const movimientos: MovimientoDecision[] = [];
  let postulaciones = s.postulaciones;

  if (resultado === "aprobado") {
    const d = destinoAprobado(s, candidatoId);
    if (d.tipo === "mover") {
      const p = postulaciones.find((x) => x.id === d.postulacionId)!;
      movimientos.push({ postulacionId: p.id, creada: false, etapaPrevia: p.etapa, motivoPrevio: p.motivoDescarte });
      postulaciones = postulaciones.map((x) =>
        x.id === p.id ? { ...x, etapa: d.etapa, historial: [...x.historial, { etapa: d.etapa, ts }] } : x,
      );
    } else if (d.tipo === "crear") {
      movimientos.push({ postulacionId: idNueva, creada: true });
      postulaciones = [
        ...postulaciones,
        {
          id: idNueva,
          candidatoId,
          vacanteId: d.vacanteId,
          etapa: d.etapa,
          historial: [
            { etapa: "nuevo", ts },
            { etapa: d.etapa, ts },
          ],
          creada: ts,
        },
      ];
    }
  } else {
    // Rechazado: sale de todas las vacantes donde seguia vivo.
    for (const p of activas(s, candidatoId)) {
      movimientos.push({ postulacionId: p.id, creada: false, etapaPrevia: p.etapa, motivoPrevio: p.motivoDescarte });
    }
    const ids = new Set(movimientos.map((m) => m.postulacionId));
    postulaciones = postulaciones.map((x) =>
      ids.has(x.id)
        ? { ...x, etapa: "descartado" as Etapa, motivoDescarte: motivo, historial: [...x.historial, { etapa: "descartado" as Etapa, ts }] }
        : x,
    );
  }

  const decision: Decision = { resultado, por, ts, motivo: resultado === "rechazado" ? motivo : undefined, movimientos };
  return {
    ...s,
    postulaciones,
    candidatos: s.candidatos.map((c) => (c.id === candidatoId ? { ...c, decision } : c)),
  };
}

/** Cambia el motivo del rechazo, en la decision y en las postulaciones que descarto. */
export function cambiarMotivo(s: EstadoTalento, candidatoId: string, motivo: string): EstadoTalento {
  const c = s.candidatos.find((x) => x.id === candidatoId);
  if (!c?.decision || c.decision.resultado !== "rechazado") return s;
  const ids = new Set(c.decision.movimientos.map((m) => m.postulacionId));
  return {
    ...s,
    postulaciones: s.postulaciones.map((p) => (ids.has(p.id) ? { ...p, motivoDescarte: motivo } : p)),
    candidatos: s.candidatos.map((x) => (x.id === candidatoId ? { ...x, decision: { ...x.decision!, motivo } } : x)),
  };
}

/** Deja todo como estaba antes de decidir y el candidato vuelve a pendiente. */
export function deshacerDecision(s: EstadoTalento, candidatoId: string): EstadoTalento {
  const c = s.candidatos.find((x) => x.id === candidatoId);
  if (!c?.decision) return s;
  let postulaciones = s.postulaciones;
  const ts = c.decision.ts;
  // Si alguien ya lo movio a mano despues de la decision, esa postulacion no
  // se toca: deshacer no puede pisar trabajo posterior.
  const intacta = (id: string) => postulaciones.find((p) => p.id === id)?.historial.at(-1)?.ts === ts;
  for (const m of c.decision.movimientos) {
    if (!intacta(m.postulacionId)) continue;
    if (m.creada) {
      postulaciones = postulaciones.filter((p) => p.id !== m.postulacionId);
    } else {
      postulaciones = postulaciones.map((p) =>
        p.id === m.postulacionId
          ? { ...p, etapa: m.etapaPrevia ?? p.etapa, motivoDescarte: m.motivoPrevio, historial: p.historial.slice(0, -1) }
          : p,
      );
    }
  }
  return {
    ...s,
    postulaciones,
    candidatos: s.candidatos.map((x) => (x.id === candidatoId ? { ...x, decision: undefined } : x)),
  };
}
