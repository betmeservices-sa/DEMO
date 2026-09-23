// Como se escribe cada dato del candidato en pantalla. Lo que el candidato no
// dio (ver Candidato.sinDato) se dice "sin dato", nunca con el valor de relleno.

import { DISPONIBILIDADES, HORARIOS, JORNADAS } from "./catalogo";
import type { Candidato, DatoFaltante } from "./tipos";

export const SIN_DATO = "Sin dato";

export function falta(c: Pick<Candidato, "sinDato">, d: DatoFaltante): boolean {
  return (c.sinDato ?? []).includes(d);
}

export function textoIngles(c: Candidato): string {
  return falta(c, "ingles") ? `Inglés ${SIN_DATO.toLowerCase()}` : `Inglés ${c.ingles}`;
}

export function textoAnios(c: Candidato): string {
  return falta(c, "experiencia") ? SIN_DATO : `${c.aniosExperiencia} años`;
}

export function textoPretension(c: Candidato, alMes = false): string {
  if (falta(c, "pretension")) return `Pretensión ${SIN_DATO.toLowerCase()}`;
  return `$${c.pretension.toLocaleString("en-US")}${alMes ? " al mes" : ""}`;
}

export function textoDisponibilidad(c: Candidato): string {
  const partes: string[] = [];
  if (!falta(c, "jornada")) partes.push(JORNADAS.find((j) => j.id === c.jornada)?.nombre ?? "");
  if (!falta(c, "horarios") && c.horarios.length) {
    partes.push(c.horarios.map((h) => HORARIOS.find((x) => x.id === h)?.nombre.match(/\((.+)\)/)?.[1] ?? h).join(", "));
  }
  if (!falta(c, "disponibilidad")) partes.push(DISPONIBILIDADES.find((d) => d.id === c.disponibilidad)?.nombre ?? "");
  return partes.filter(Boolean).join(" · ") || SIN_DATO;
}
