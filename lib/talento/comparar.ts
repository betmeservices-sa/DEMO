// Comparar hasta tres candidatos contra una misma vacante.
//
// Cada fila trae el valor que se muestra y un numero para ordenar; "mejores"
// son los indices que ganan esa fila (varios si empatan). Si todos empatan, o
// si hay un solo candidato, no gana nadie: resaltar a todos no dice nada.

import { ETAPAS_EMBUDO, nombreEtapa, nombrePais, nombreSkill, rangoIngles, DISPONIBILIDADES } from "./catalogo";
import { falta, SIN_DATO, textoAnios, textoDisponibilidad } from "./mostrar";
import { calcularMatch, PESOS, type CriterioMatch, type ResultadoMatch } from "./matching";
import type { Candidato, EstadoTalento, Etapa, Postulacion, Vacante } from "./tipos";

export const MAX_COMPARAR = 3;

export interface Celda {
  texto: string;
  /** Detalle chico debajo del valor. */
  detalle?: string;
  /** Para ordenar: mas alto es mejor. null = no compite. */
  valor: number | null;
  /** Listas (skills): lo que cumple y lo que falta. */
  si?: string[];
  no?: string[];
}

export interface FilaComparacion {
  id: string;
  nombre: string;
  celdas: Celda[];
  mejores: number[];
}

export interface Comparacion {
  candidatos: Candidato[];
  matches: ResultadoMatch[];
  postulaciones: (Postulacion | null)[];
  filas: FilaComparacion[];
}

/** Indices que ganan: el valor mas alto, salvo que todos empaten. */
export function mejoresDe(valores: (number | null)[]): number[] {
  const validos = valores.filter((v): v is number => v !== null);
  if (validos.length < 2) return [];
  const max = Math.max(...validos);
  const ganan = valores.map((v, i) => (v === max ? i : -1)).filter((i) => i >= 0);
  return ganan.length === valores.length ? [] : ganan;
}

/** Promedio de todas las notas de todos sus scorecards (1 a 5), o null sin entrevistas calificadas. */
export function promedioScorecards(estado: Pick<EstadoTalento, "postulaciones" | "entrevistas">, candidatoId: string): number | null {
  const suyas = new Set(estado.postulaciones.filter((p) => p.candidatoId === candidatoId).map((p) => p.id));
  const notas = estado.entrevistas
    .filter((e) => suyas.has(e.postulacionId) && e.scorecard)
    .flatMap((e) => Object.values(e.scorecard!.criterios));
  if (notas.length === 0) return null;
  return Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10;
}

/** Que tan adelante va en la vacante: descartado y sin postular no compiten. */
export function avanceEtapa(p: Postulacion | null): number | null {
  if (!p || p.etapa === "descartado") return null;
  return ETAPAS_EMBUDO.indexOf(p.etapa);
}

/** La etapa que sigue en el embudo, o null si ya no hay a donde avanzar. */
export function siguienteEtapa(e: Etapa): Etapa | null {
  if (e === "descartado" || e === "contratado") return null;
  return ETAPAS_EMBUDO[ETAPAS_EMBUDO.indexOf(e) + 1] ?? null;
}

const NOMBRE_CRITERIO: Record<CriterioMatch, string> = {
  skills: "Skills",
  deseables: "Deseables",
  ingles: "Inglés",
  experiencia: "Experiencia",
  salario: "Salario",
  ubicacion: "Ubicación",
  disponibilidad: "Jornada y horario",
  disc: "DISC",
};

const PRONTITUD: Record<string, number> = { inmediata: 3, "2_semanas": 2, "1_mes": 1 };

export function comparar(estado: EstadoTalento, ids: string[], vacante: Vacante): Comparacion {
  const candidatos = ids
    .slice(0, MAX_COMPARAR)
    .map((id) => estado.candidatos.find((c) => c.id === id))
    .filter((c): c is Candidato => Boolean(c));
  const r = vacante.requisitos;
  const matches = candidatos.map((c) => calcularMatch(c, r));
  const postulaciones = candidatos.map(
    (c) => estado.postulaciones.find((p) => p.candidatoId === c.id && p.vacanteId === vacante.id) ?? null,
  );

  const filas: FilaComparacion[] = [];
  const fila = (id: string, nombre: string, celdas: Celda[]) =>
    filas.push({ id, nombre, celdas, mejores: mejoresDe(celdas.map((x) => x.valor)) });

  fila("match", "Match", matches.map((m) => ({ texto: String(m.score), valor: m.score })));

  for (const criterio of Object.keys(PESOS) as CriterioMatch[]) {
    fila(
      `c-${criterio}`,
      NOMBRE_CRITERIO[criterio],
      matches.map((m) => {
        const d = m.detalle.find((x) => x.criterio === criterio)!;
        return { texto: `${d.puntos}/${d.maximo}`, valor: d.puntos };
      }),
    );
  }

  fila(
    "requeridas",
    "Skills requeridas",
    candidatos.map((c) => {
      const si = r.skills.filter((s) => c.skills.includes(s));
      return {
        texto: `${si.length} de ${r.skills.length}`,
        valor: si.length,
        si: si.map(nombreSkill),
        no: r.skills.filter((s) => !c.skills.includes(s)).map(nombreSkill),
      };
    }),
  );
  fila(
    "deseables",
    "Skills deseables",
    candidatos.map((c) => {
      const si = r.deseables.filter((s) => c.skills.includes(s));
      return {
        texto: `${si.length} de ${r.deseables.length}`,
        valor: r.deseables.length ? si.length : null,
        si: si.map(nombreSkill),
        no: r.deseables.filter((s) => !c.skills.includes(s)).map(nombreSkill),
      };
    }),
  );
  fila(
    "ingles",
    "Inglés",
    candidatos.map((c) =>
      falta(c, "ingles")
        ? { texto: SIN_DATO, detalle: `Pide ${r.ingles}`, valor: null }
        : { texto: c.ingles, detalle: `Pide ${r.ingles}`, valor: rangoIngles(c.ingles) },
    ),
  );
  fila(
    "experiencia",
    "Experiencia",
    candidatos.map((c) => ({
      texto: textoAnios(c),
      detalle: `Pide ${r.experiencia}`,
      valor: falta(c, "experiencia") ? null : c.aniosExperiencia,
    })),
  );
  fila(
    "pretension",
    "Pretensión",
    candidatos.map((c) => {
      if (falta(c, "pretension")) return { texto: SIN_DATO, detalle: `Tope $${r.salarioMax}`, valor: null };
      const dif = c.pretension - r.salarioMax;
      return {
        texto: `$${c.pretension.toLocaleString("en-US")}`,
        detalle: dif <= 0 ? `$${Math.abs(dif)} bajo el tope` : `$${dif} sobre el tope`,
        // Menos es mejor para la vacante: se invierte el signo.
        valor: -c.pretension,
      };
    }),
  );
  fila(
    "ubicacion",
    "Ubicación",
    candidatos.map((c, i) => ({
      texto: c.ubicacion.departamento ?? nombrePais(c.ubicacion.pais),
      detalle: c.ubicacion.departamento ? nombrePais(c.ubicacion.pais) : undefined,
      valor: matches[i].detalle.find((d) => d.criterio === "ubicacion")!.puntos,
    })),
  );
  fila(
    "disponibilidad",
    "Disponibilidad",
    candidatos.map((c, i) => ({
      texto: falta(c, "disponibilidad") ? SIN_DATO : (DISPONIBILIDADES.find((d) => d.id === c.disponibilidad)?.nombre ?? c.disponibilidad),
      detalle: falta(c, "jornada") && falta(c, "horarios") ? undefined : textoDisponibilidad({ ...c, sinDato: [...(c.sinDato ?? []), "disponibilidad"] }),
      valor: falta(c, "disponibilidad")
        ? null
        : matches[i].detalle.find((d) => d.criterio === "disponibilidad")!.puntos * 10 + (PRONTITUD[c.disponibilidad] ?? 0),
    })),
  );
  fila(
    "disc",
    "DISC",
    candidatos.map((c, i) => ({
      texto: c.disc ? `${c.disc.primario}${c.disc.secundario ? `/${c.disc.secundario}` : ""}` : "Sin evaluar",
      detalle: r.disc.length ? `Encaja ${r.disc.join("/")}` : undefined,
      valor: r.disc.length ? matches[i].detalle.find((d) => d.criterio === "disc")!.puntos : null,
    })),
  );
  fila(
    "scorecards",
    "Scorecards",
    candidatos.map((c) => {
      const p = promedioScorecards(estado, c.id);
      return { texto: p === null ? "Sin entrevistas" : `${p.toFixed(1)} / 5`, valor: p };
    }),
  );
  fila(
    "etapa",
    "Etapa",
    postulaciones.map((p) => ({
      texto: p ? nombreEtapa(p.etapa) : "Fuera del pipeline",
      detalle: p?.motivoDescarte,
      valor: avanceEtapa(p),
    })),
  );

  return { candidatos, matches, postulaciones, filas };
}

/** La vacante abierta donde, en promedio, mejor encajan los elegidos. */
export function vacanteSugerida(estado: EstadoTalento, ids: string[]): Vacante | null {
  const abiertas = estado.vacantes.filter((v) => v.estado === "abierta" && v.origen !== "formulario");
  const cands = estado.candidatos.filter((c) => ids.includes(c.id));
  if (abiertas.length === 0) return null;
  if (cands.length === 0) return abiertas[0];
  return abiertas
    .map((v) => ({ v, s: cands.reduce((n, c) => n + calcularMatch(c, v.requisitos).score, 0) }))
    .sort((a, b) => b.s - a.s || a.v.id.localeCompare(b.v.id))[0].v;
}
