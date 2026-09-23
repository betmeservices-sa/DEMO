// Lo que se le puede hacer al estado de reclutamiento. Reducer puro: la UI
// despacha acciones y las pruebas verifican lo mismo sin navegador.

import { TAREAS_ONBOARDING } from "./catalogo";
import { correrIso, diaSv, sumarDias } from "./fechas";
import type {
  Candidato,
  Entrevista,
  EstadoTalento,
  Etapa,
  Nota,
  Postulacion,
  Scorecard,
  Vacante,
} from "./tipos";

export type AccionTalento =
  | { type: "MOVER"; postulacionId: string; etapa: Etapa; ts: string; motivo?: string }
  | { type: "AL_PIPELINE"; vacanteId: string; candidatoIds: string[]; ts: string }
  | { type: "CREAR_VACANTE"; vacante: Vacante }
  | { type: "ESTADO_VACANTE"; vacanteId: string; estado: Vacante["estado"]; ts: string }
  | { type: "CREAR_CANDIDATO"; candidato: Candidato }
  | { type: "NOTA"; candidatoId: string; nota: Nota }
  | { type: "CREAR_ENTREVISTA"; entrevista: Entrevista }
  | { type: "ESTADO_ENTREVISTA"; entrevistaId: string; estado: Entrevista["estado"] }
  | { type: "SCORECARD"; entrevistaId: string; scorecard: Scorecard }
  | { type: "TAREA_ONBOARDING"; postulacionId: string; tareaId: string }
  | { type: "RESTABLECER"; estado: EstadoTalento };

export function nuevoOnboarding(postulacionId: string, ts: string) {
  return {
    postulacionId,
    // Arranca el lunes que sigue a dos semanas de la contratacion (el aviso
    // en el trabajo anterior).
    inicio: sumarDias(diaSv(ts), 14),
    tareas: TAREAS_ONBOARDING.map((label, i) => ({ id: `t${i + 1}`, label, hecha: false })),
  };
}

let secuencia = 0;
export function idNuevo(prefijo: string): string {
  secuencia += 1;
  return `${prefijo}-${Date.now().toString(36)}-${secuencia}`;
}

export function reducirTalento(s: EstadoTalento, a: AccionTalento): EstadoTalento {
  switch (a.type) {
    case "MOVER": {
      const p = s.postulaciones.find((x) => x.id === a.postulacionId);
      if (!p || p.etapa === a.etapa) return s;
      const postulaciones = s.postulaciones.map((x) =>
        x.id === a.postulacionId
          ? {
              ...x,
              etapa: a.etapa,
              historial: [...x.historial, { etapa: a.etapa, ts: a.ts }],
              motivoDescarte: a.etapa === "descartado" ? a.motivo ?? x.motivoDescarte : undefined,
            }
          : x,
      );
      const onboarding =
        a.etapa === "contratado" && !s.onboarding.some((o) => o.postulacionId === a.postulacionId)
          ? [...s.onboarding, nuevoOnboarding(a.postulacionId, a.ts)]
          : s.onboarding;
      return { ...s, postulaciones, onboarding };
    }
    case "AL_PIPELINE": {
      const ya = new Set(s.postulaciones.filter((p) => p.vacanteId === a.vacanteId).map((p) => p.candidatoId));
      const nuevas: Postulacion[] = a.candidatoIds
        .filter((id) => !ya.has(id))
        .map((candidatoId) => ({
          id: idNuevo("p"),
          candidatoId,
          vacanteId: a.vacanteId,
          etapa: "nuevo",
          historial: [{ etapa: "nuevo", ts: a.ts }],
          creada: a.ts,
        }));
      if (nuevas.length === 0) return s;
      return { ...s, postulaciones: [...s.postulaciones, ...nuevas] };
    }
    case "CREAR_VACANTE":
      return { ...s, vacantes: [a.vacante, ...s.vacantes] };
    case "ESTADO_VACANTE":
      return {
        ...s,
        vacantes: s.vacantes.map((v) =>
          v.id === a.vacanteId
            ? { ...v, estado: a.estado, cerrada: a.estado === "cerrada" ? a.ts : undefined }
            : v,
        ),
      };
    case "CREAR_CANDIDATO":
      return { ...s, candidatos: [a.candidato, ...s.candidatos] };
    case "NOTA":
      return {
        ...s,
        candidatos: s.candidatos.map((c) =>
          c.id === a.candidatoId ? { ...c, notas: [a.nota, ...c.notas] } : c,
        ),
      };
    case "CREAR_ENTREVISTA":
      return { ...s, entrevistas: [...s.entrevistas, a.entrevista] };
    case "ESTADO_ENTREVISTA":
      return {
        ...s,
        entrevistas: s.entrevistas.map((e) => (e.id === a.entrevistaId ? { ...e, estado: a.estado } : e)),
      };
    case "SCORECARD":
      return {
        ...s,
        entrevistas: s.entrevistas.map((e) =>
          e.id === a.entrevistaId ? { ...e, estado: "realizada", scorecard: a.scorecard } : e,
        ),
      };
    case "TAREA_ONBOARDING":
      return {
        ...s,
        onboarding: s.onboarding.map((o) =>
          o.postulacionId === a.postulacionId
            ? { ...o, tareas: o.tareas.map((t) => (t.id === a.tareaId ? { ...t, hecha: !t.hecha } : t)) }
            : o,
        ),
      };
    case "RESTABLECER":
      return a.estado;
    default:
      return s;
  }
}

/**
 * Corre TODAS las fechas del estado n dias.
 *
 * El demo se arma con fechas relativas a hoy (la entrevista de manana, el que
 * lleva 6 dias en filtrado). Si el navegador guardo el estado la semana pasada,
 * al volver se ve una agenda vieja y vacia. En vez de borrar lo que la persona
 * hizo, se corre todo junto hasta hoy: la foto queda igual, solo que al dia.
 */
export function desplazar(s: EstadoTalento, dias: number): EstadoTalento {
  if (dias === 0) return s;
  const iso = (x: string) => correrIso(x, dias);
  const dia = (x: string) => sumarDias(x, dias);
  return {
    ...s,
    sembradoEn: dia(s.sembradoEn),
    candidatos: s.candidatos.map((c) => ({
      ...c,
      creado: iso(c.creado),
      notas: c.notas.map((n) => ({ ...n, ts: iso(n.ts) })),
    })),
    vacantes: s.vacantes.map((v) => ({ ...v, creada: iso(v.creada), cerrada: v.cerrada ? iso(v.cerrada) : undefined })),
    postulaciones: s.postulaciones.map((p) => ({
      ...p,
      creada: iso(p.creada),
      historial: p.historial.map((h) => ({ ...h, ts: iso(h.ts) })),
    })),
    entrevistas: s.entrevistas.map((e) => ({
      ...e,
      inicio: iso(e.inicio),
      scorecard: e.scorecard ? { ...e.scorecard, ts: iso(e.scorecard.ts) } : undefined,
    })),
    onboarding: s.onboarding.map((o) => ({ ...o, inicio: dia(o.inicio) })),
  };
}
