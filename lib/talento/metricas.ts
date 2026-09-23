// Metricas de reclutamiento, calculadas del historial de cada postulacion.
// Funciones puras: el tablero y las pruebas leen lo mismo.

import { ETAPAS_EMBUDO, FUENTES } from "./catalogo";
import { diasEntre } from "./fechas";
import type { Candidato, Etapa, EstadoTalento, Fuente, Postulacion } from "./tipos";

/** Hasta que etapa del embudo llego una postulacion (aunque despues la descartaran). */
export function etapaMaxima(p: Postulacion): Etapa {
  let max = 0;
  for (const h of p.historial) {
    const i = ETAPAS_EMBUDO.indexOf(h.etapa);
    if (i > max) max = i;
  }
  const actual = ETAPAS_EMBUDO.indexOf(p.etapa);
  if (actual > max) max = actual;
  return ETAPAS_EMBUDO[max];
}

export function llegoA(p: Postulacion, etapa: Etapa): boolean {
  return ETAPAS_EMBUDO.indexOf(etapaMaxima(p)) >= ETAPAS_EMBUDO.indexOf(etapa);
}

export interface PasoEmbudo {
  etapa: Etapa;
  cuantos: number;
  /** Porcentaje que paso desde la etapa anterior. null en la primera. */
  conversion: number | null;
}

export function embudo(postulaciones: Postulacion[]): PasoEmbudo[] {
  const pasos: PasoEmbudo[] = [];
  for (let i = 0; i < ETAPAS_EMBUDO.length; i++) {
    const etapa = ETAPAS_EMBUDO[i];
    const cuantos = postulaciones.filter((p) => llegoA(p, etapa)).length;
    const previo = i === 0 ? null : pasos[i - 1].cuantos;
    pasos.push({
      etapa,
      cuantos,
      conversion: previo === null ? null : previo === 0 ? 0 : Math.round((cuantos / previo) * 100),
    });
  }
  return pasos;
}

/** Dias desde que la persona entro al pipeline hasta que la contrataron. */
export function diasParaContratar(p: Postulacion): number | null {
  const contratado = p.historial.find((h) => h.etapa === "contratado");
  if (!contratado) return null;
  return Math.max(0, diasEntre(p.creada, contratado.ts));
}

export function tiempoPromedioContratacion(postulaciones: Postulacion[]): number | null {
  const dias = postulaciones.map(diasParaContratar).filter((d): d is number => d !== null);
  if (dias.length === 0) return null;
  return Math.round(dias.reduce((a, b) => a + b, 0) / dias.length);
}

/** De las ofertas que se resolvieron, cuantas se aceptaron. */
export function aceptacionDeOfertas(postulaciones: Postulacion[]): number | null {
  const conOferta = postulaciones.filter((p) => llegoA(p, "oferta"));
  const resueltas = conOferta.filter((p) => p.etapa === "contratado" || p.etapa === "descartado");
  if (resueltas.length === 0) return null;
  return Math.round((resueltas.filter((p) => p.etapa === "contratado").length / resueltas.length) * 100);
}

export interface FilaFuente {
  fuente: Fuente;
  nombre: string;
  candidatos: number;
  entrevistados: number;
  contratados: number;
}

export function porFuente(estado: Pick<EstadoTalento, "candidatos" | "postulaciones">): FilaFuente[] {
  const porCandidato = new Map<string, Postulacion[]>();
  for (const p of estado.postulaciones) {
    porCandidato.set(p.candidatoId, [...(porCandidato.get(p.candidatoId) ?? []), p]);
  }
  return FUENTES.map((f) => {
    const suyos: Candidato[] = estado.candidatos.filter((c) => c.fuente === f.id);
    const ps = (c: Candidato) => porCandidato.get(c.id) ?? [];
    return {
      fuente: f.id,
      nombre: f.nombre,
      candidatos: suyos.length,
      entrevistados: suyos.filter((c) => ps(c).some((p) => llegoA(p, "entrevista"))).length,
      contratados: suyos.filter((c) => ps(c).some((p) => p.etapa === "contratado")).length,
    };
  })
    .filter((f) => f.candidatos > 0)
    .sort((a, b) => b.candidatos - a.candidatos);
}

/** Dias que lleva la postulacion en su etapa actual. */
export function diasEnEtapa(p: Postulacion, ahora: Date = new Date()): number {
  const ultimo = p.historial[p.historial.length - 1]?.ts ?? p.creada;
  return Math.max(0, diasEntre(ultimo, ahora.toISOString()));
}

/** Ids de candidatos que ya estan colocados con algun cliente. */
export function colocados(postulaciones: Postulacion[]): Set<string> {
  return new Set(postulaciones.filter((p) => p.etapa === "contratado").map((p) => p.candidatoId));
}
