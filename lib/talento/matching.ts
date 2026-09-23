// Match entre una vacante y el banco de talento.
//
// Es un puntaje DETERMINISTA, sin llamar a ningun modelo: la misma vacante
// contra los mismos perfiles da siempre el mismo orden, no cuesta nada y se
// puede explicar criterio por criterio. Eso ultimo es lo que importa: quien
// recluta no confia en un "87%" que no sabe de donde sale, pero si en "cumple
// GoHighLevel e ingles C1, le falta Clio".
//
// Pesos (suman 100):
//   skills requeridas 35 · deseables 10 · ingles 15 · experiencia 15
//   salario 10 · ubicacion 5 · jornada y horario 5 · DISC 5

import { nombrePais, nombreSkill, rangoIngles, VECINOS } from "./catalogo";
import type { Candidato, Requisitos, Vacante } from "./tipos";

export const PESOS = {
  skills: 35,
  deseables: 10,
  ingles: 15,
  experiencia: 15,
  salario: 10,
  ubicacion: 5,
  disponibilidad: 5,
  disc: 5,
} as const;

export type CriterioMatch = keyof typeof PESOS;

export interface DetalleCriterio {
  criterio: CriterioMatch;
  puntos: number;
  maximo: number;
}

export interface ResultadoMatch {
  candidatoId: string;
  score: number;
  cumple: string[];
  falta: string[];
  detalle: DetalleCriterio[];
}

export type Nivel = "fuerte" | "bueno" | "parcial" | "bajo";

export function nivelDeScore(score: number): Nivel {
  if (score >= 80) return "fuerte";
  if (score >= 65) return "bueno";
  if (score >= 50) return "parcial";
  return "bajo";
}

const redondear = (n: number) => Math.round(n * 10) / 10;

export function calcularMatch(c: Candidato, r: Requisitos): ResultadoMatch {
  const cumple: string[] = [];
  const falta: string[] = [];
  const detalle: DetalleCriterio[] = [];
  const sumar = (criterio: CriterioMatch, puntos: number) =>
    detalle.push({ criterio, puntos: redondear(puntos), maximo: PESOS[criterio] });

  const tiene = new Set(c.skills);
  const sin = new Set(c.sinDato ?? []);

  // Skills requeridas: proporcion de las que tiene.
  if (r.skills.length === 0) {
    sumar("skills", PESOS.skills);
  } else {
    const si = r.skills.filter((s) => tiene.has(s));
    const no = r.skills.filter((s) => !tiene.has(s));
    si.forEach((s) => cumple.push(nombreSkill(s)));
    no.forEach((s) => falta.push(nombreSkill(s)));
    sumar("skills", (PESOS.skills * si.length) / r.skills.length);
  }

  // Deseables: suman, pero lo que falta de aca no se anota como falta.
  if (r.deseables.length === 0) {
    sumar("deseables", PESOS.deseables);
  } else {
    const si = r.deseables.filter((s) => tiene.has(s));
    si.forEach((s) => cumple.push(`${nombreSkill(s)} (deseable)`));
    sumar("deseables", (PESOS.deseables * si.length) / r.deseables.length);
  }

  // Ingles: completo si alcanza, la mitad si le falta un nivel, nada si mas.
  // Sin dato no suma: el match no adivina.
  if (sin.has("ingles")) {
    falta.push("Inglés sin dato");
    sumar("ingles", 0);
  } else {
  const brecha = rangoIngles(r.ingles) - rangoIngles(c.ingles);
  if (brecha <= 0) {
    cumple.push(`Inglés ${c.ingles}`);
    sumar("ingles", PESOS.ingles);
  } else {
    falta.push(`Inglés ${r.ingles} (tiene ${c.ingles})`);
    sumar("ingles", brecha === 1 ? PESOS.ingles / 2 : 0);
  }
  }

  // Experiencia: proporcional hasta el minimo pedido.
  if (sin.has("experiencia") && r.experiencia > 0) {
    falta.push("Experiencia sin dato");
    sumar("experiencia", 0);
  } else if (r.experiencia <= 0 || c.aniosExperiencia >= r.experiencia) {
    cumple.push(`${c.aniosExperiencia} años de experiencia`);
    sumar("experiencia", PESOS.experiencia);
  } else {
    falta.push(`${r.experiencia} años de experiencia (tiene ${c.aniosExperiencia})`);
    sumar("experiencia", (PESOS.experiencia * c.aniosExperiencia) / r.experiencia);
  }

  // Salario: dentro del tope, completo; hasta 10% arriba se negocia; hasta 20%
  // es cuesta arriba; mas que eso no entra.
  if (sin.has("pretension")) {
    falta.push("Pretensión sin dato");
    sumar("salario", 0);
  } else if (r.salarioMax <= 0 || c.pretension <= r.salarioMax) {
    cumple.push(`Pretensión $${c.pretension}`);
    sumar("salario", PESOS.salario);
  } else {
    const exceso = (c.pretension - r.salarioMax) / r.salarioMax;
    falta.push(`Pretensión $${c.pretension} sobre el tope de $${r.salarioMax}`);
    sumar("salario", exceso <= 0.1 ? 6 : exceso <= 0.2 ? 3 : 0);
  }

  // Ubicacion: en remoto manda el pais; en hibrido o presencial, el departamento.
  if (r.modalidad === "remoto") {
    if (r.paises.length === 0 || r.paises.includes(c.ubicacion.pais)) {
      cumple.push(`Remoto desde ${nombrePais(c.ubicacion.pais)}`);
      sumar("ubicacion", PESOS.ubicacion);
    } else {
      falta.push(`País no aceptado (${nombrePais(c.ubicacion.pais)})`);
      sumar("ubicacion", 0);
    }
  } else if (sin.has("ubicacion") && r.departamento) {
    falta.push("Departamento sin dato");
    sumar("ubicacion", 0);
  } else {
    const dep = c.ubicacion.departamento;
    const oficina = r.departamento;
    if (!oficina || (c.ubicacion.pais === "SV" && dep === oficina)) {
      cumple.push(`Vive en ${dep ?? nombrePais(c.ubicacion.pais)}`);
      sumar("ubicacion", PESOS.ubicacion);
    } else if (c.ubicacion.pais === "SV" && dep && (VECINOS[oficina] ?? []).includes(dep)) {
      cumple.push(`Vive cerca de la oficina (${dep})`);
      sumar("ubicacion", 3);
    } else {
      falta.push(`Lejos de la oficina en ${oficina}`);
      sumar("ubicacion", 0);
    }
  }

  // Jornada (3) y horario del cliente (2).
  let disp = 0;
  if (sin.has("jornada")) {
    falta.push("Jornada sin dato");
  } else if (c.jornada === r.jornada || (r.jornada === "medio" && c.jornada === "completo")) {
    disp += 3;
  } else {
    falta.push("Solo medio tiempo");
  }
  if (sin.has("horarios")) {
    falta.push("Horario sin dato");
  } else if (c.horarios.includes(r.horario)) {
    disp += 2;
  } else {
    falta.push("Horario del cliente");
  }
  if (disp === PESOS.disponibilidad) cumple.push("Jornada y horario");
  sumar("disponibilidad", disp);

  // DISC: si la vacante no pide perfil, no pesa.
  if (r.disc.length === 0) {
    sumar("disc", PESOS.disc);
  } else if (!c.disc) {
    falta.push("Sin evaluación DISC");
    sumar("disc", 0);
  } else if (r.disc.includes(c.disc.primario)) {
    cumple.push(`Perfil DISC ${c.disc.primario}`);
    sumar("disc", PESOS.disc);
  } else if (c.disc.secundario && r.disc.includes(c.disc.secundario)) {
    cumple.push(`DISC secundario ${c.disc.secundario}`);
    sumar("disc", 3);
  } else {
    sumar("disc", 0);
  }

  const score = Math.round(detalle.reduce((n, d) => n + d.puntos, 0));
  return { candidatoId: c.id, score, cumple, falta, detalle };
}

export interface OpcionesTop {
  limite?: number;
  /** Ids a dejar fuera (ya colocados, ya en el pipeline de esta vacante). */
  excluir?: Set<string>;
  minimo?: number;
}

/**
 * Los perfiles que mejor cumplen, del mejor al peor.
 *
 * Empate: primero quien cumple mas requeridas, despues quien pide menos.
 * Asi el orden es estable y no depende del orden del banco.
 */
export function topCandidatos(
  vacante: Pick<Vacante, "requisitos">,
  candidatos: Candidato[],
  { limite = 10, excluir, minimo = 0 }: OpcionesTop = {},
): ResultadoMatch[] {
  const porId = new Map(candidatos.map((c) => [c.id, c]));
  return candidatos
    .filter((c) => !excluir?.has(c.id))
    .map((c) => calcularMatch(c, vacante.requisitos))
    .filter((m) => m.score >= minimo)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const pa = a.detalle.find((d) => d.criterio === "skills")!.puntos;
      const pb = b.detalle.find((d) => d.criterio === "skills")!.puntos;
      if (pb !== pa) return pb - pa;
      const sa = porId.get(a.candidatoId)!.pretension;
      const sb = porId.get(b.candidatoId)!.pretension;
      if (sa !== sb) return sa - sb;
      return a.candidatoId.localeCompare(b.candidatoId);
    })
    .slice(0, limite);
}
