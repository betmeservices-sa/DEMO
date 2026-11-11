import { CITAS } from "./seed";
import { diaCorto, horaDe, minutosDe } from "./format";
import type { Agenda, Cita } from "./types";

/**
 * Horario de cada calendario: [inicio, fin] en minutos y tamaño del bloque.
 * Consultas: lun a vie 8:00–19:00 y sáb 7:00–13:00, en bloques de 30 min.
 * Entregas: lun a sáb 6:00–13:00, ventanas de 20 min por cliente.
 */
export function horario(agenda: Agenda, dia: number): { ini: number; fin: number; bloque: number } | null {
  const d = diaCorto(dia);
  if (d.domingo) return null;
  if (agenda === "consultas") return d.sabado ? { ini: 7 * 60, fin: 13 * 60, bloque: 30 } : { ini: 8 * 60, fin: 19 * 60, bloque: 30 };
  return { ini: 6 * 60, fin: 13 * 60, bloque: 20 };
}

/** La nutricionista almuerza de 12:00 a 13:00 entre semana. */
function enAlmuerzo(agenda: Agenda, dia: number, t: number) {
  return agenda === "consultas" && !diaCorto(dia).sabado && t >= 12 * 60 && t < 13 * 60;
}

export function citasDe(agenda: Agenda, dia: number): Cita[] {
  return CITAS.filter((c) => c.agenda === agenda && c.dia === dia && c.estado !== "cancelada" && c.estado !== "reagendada").sort(
    (a, b) => minutosDe(a.hora) - minutosDe(b.hora),
  );
}

/** Bloques libres de un día. */
export function espaciosLibres(agenda: Agenda, dia: number): string[] {
  const h = horario(agenda, dia);
  if (!h) return [];
  const ocupadas = citasDe(agenda, dia).map((c) => [minutosDe(c.hora), minutosDe(c.hora) + Math.max(c.duracionMin, h.bloque)]);
  const libres: string[] = [];
  const ahora = new Date();
  const minAhora = dia === 0 ? ahora.getHours() * 60 + ahora.getMinutes() : -1;
  for (let t = h.ini; t + h.bloque <= h.fin; t += h.bloque) {
    if (dia === 0 && t < minAhora) continue;
    if (enAlmuerzo(agenda, dia, t)) continue;
    const choca = ocupadas.some(([a, b]) => t < b && t + h.bloque > a);
    if (!choca) libres.push(horaDe(t));
  }
  return libres;
}

/** % de ocupación de un día: minutos con cita sobre minutos de atención. */
export function ocupacion(agenda: Agenda, dia: number): number | null {
  const h = horario(agenda, dia);
  if (!h) return null;
  const almuerzo = agenda === "consultas" && !diaCorto(dia).sabado ? 60 : 0;
  const total = h.fin - h.ini - almuerzo;
  const usado = citasDe(agenda, dia).reduce((n, c) => n + Math.max(c.duracionMin, h.bloque), 0);
  return Math.min(100, Math.round((usado / total) * 100));
}

/** Próximos N espacios libres desde hoy. */
export function proximosLibres(agenda: Agenda, n = 4): { dia: number; hora: string }[] {
  const out: { dia: number; hora: string }[] = [];
  for (let d = 0; d <= 6 && out.length < n; d++) {
    for (const hora of espaciosLibres(agenda, d)) {
      out.push({ dia: d, hora });
      if (out.length >= n) break;
    }
  }
  return out;
}
