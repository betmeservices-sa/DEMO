// Qué guarda de cada llamada la memoria de los agentes de voz de CEGISA.
//
// Desde 2026-11-06 la usan los TRES agentes (Recepción, Ultrasonografía y
// Laboratorio) con la misma memoria por teléfono: el que preguntó en el Lab por
// dos exámenes, se le cortó y vuelve a marcar, es reconocido por cualquiera de
// las tres. Pedido del usuario: "me había llamado por estos 2 exámenes, ¿aún le
// interesan?".
//
// Los tres extraen `estudios` (lo concreto: "hemograma", "ultra 4D"). `temas`
// queda de respaldo para las llamadas viejas de Recepción, porque en Ultras y en
// el Lab `temas` son categorías ("precio", "horario") que no sirven para retomar.

import type { ExtractoLlamada } from "./memoria-llamadas";
import { comoLista, comoTexto } from "./memoria-webhook";

export function extraerHospital(d: Record<string, unknown>, resumen?: string): ExtractoLlamada {
  const estudios = comoLista(d.estudios);
  const modelos = estudios.length > 0 ? estudios : comoLista(d.temas);
  const motivo = comoTexto(d.motivo);
  return {
    nombre: comoTexto(d.nombre),
    // Se reusa el campo "modelos" del modelo compartido para no tener dos
    // formas de lo mismo.
    modelos,
    // En un hospital "uso" es el motivo por el que consulta, y "pago" es con
    // quién se atiende. Mismos campos, otro significado según el tenant.
    uso: motivo,
    pago: comoTexto(d.doctora),
    agendo: d.agendo === true,
    // El resumen general de Vapi solo si la llamada dejó algo: una llamada que
    // se cortó sin consulta no puede pisar el resumen de la anterior.
    resumen: comoTexto(d.resumen) ?? (modelos.length > 0 || motivo ? comoTexto(resumen) : undefined),
  };
}

/** La nota de la ficha, en palabras del hospital (la de defecto habla de vehículos y de "pagarlo"). */
export function notaHospital(e: ExtractoLlamada): string | undefined {
  const partes: string[] = [];
  if (e.modelos?.length) partes.push(`consultó por ${e.modelos.join(", ")}`);
  if (e.uso) partes.push(`llamó por ${e.uso}`);
  if (e.pago) partes.push(`se atiende con ${e.pago}`);
  if (partes.length === 0 && e.resumen) partes.push(e.resumen);
  if (partes.length === 0) return undefined;
  const texto = partes.join("; ");
  return texto.charAt(0).toUpperCase() + texto.slice(1) + (texto.endsWith(".") ? "" : ".");
}
