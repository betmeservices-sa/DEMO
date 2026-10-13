// El historial de una persona en la clínica, para su ficha de Contactos.
//
// Se arma por teléfono porque es lo único que comparten las tres cosas: el
// registro con el doctor (QR de la sala de espera), los turnos del laboratorio
// (QR de la entrada) y lo que el doctor le dejó escrito. Con eso la ficha dice
// qué exámenes se ha hecho, qué facturas pagó y qué recetas y notas tiene.
//
// Lógica pura: recibe las listas y las ordena. Quién las trae es el almacén.

import { TODOS } from "./catalogos";
import { ultimos8 } from "./cola";
import type { Doctor, Documento, Paciente, Sucursal, Turno } from "./tipos";

export interface Historial {
  /** Cada vez que se registró con un doctor. */
  registros: { doctor: string; creado: string; motivo: string }[];
  /** Cada visita al laboratorio o a una unidad, con lo que sí se le hizo. */
  examenes: {
    fecha: string;
    unidad: string;
    examenes: string[];
    /** Cuántos de los que pidió quedaron sin hacerse. */
    pendientes: number;
    estado: Turno["estado"];
  }[];
  facturas: { fecha: string; numero: string; monto: number | null; unidad: string }[];
  documentos: {
    id: string;
    tipo: Documento["tipo"];
    fecha: string;
    doctor: string;
    resumen: string;
    codigo: string;
  }[];
}

function resumenDe(d: Documento): string {
  if (d.tipo === "receta") return d.medicamentos.map((m) => m.nombre).join(", ");
  if (d.tipo === "nota") return d.texto.length > 120 ? `${d.texto.slice(0, 120).trim()}...` : d.texto;
  const n = d.examenes.length;
  const areas = [...new Set(d.examenes.map((id) => TODOS[id]?.area).filter(Boolean))];
  return `${n} ${n === 1 ? "examen" : "exámenes"}${areas.length ? ` de ${areas.join(", ")}` : ""}`;
}

export function armarHistorial(
  telefono: string,
  pacientes: Paciente[],
  turnos: Turno[],
  documentos: Documento[],
  doctores: Doctor[],
  sucursales: Sucursal[],
): Historial {
  const tel = ultimos8(telefono);
  const doctor = (id: string) => doctores.find((d) => d.id === id)?.nombre ?? "";
  const unidad = (id: string) => sucursales.find((s) => s.id === id)?.nombre ?? "";

  // Se vuelve a comparar el teléfono acá: la consulta trae parecidos y esta es
  // la línea entre el historial de una persona y el de otra.
  const propios = pacientes.filter((p) => ultimos8(p.telefono) === tel);
  const ids = new Set(propios.map((p) => p.id));
  const visitas = turnos.filter(
    (t) => ultimos8(t.telefono) === tel || (t.pacienteId && ids.has(t.pacienteId)),
  );

  return {
    registros: [...propios]
      .sort((a, b) => b.creado.localeCompare(a.creado))
      .map((p) => ({ doctor: doctor(p.doctorId), creado: p.creado, motivo: p.motivo })),
    examenes: visitas
      .filter((t) => t.hechos.length > 0 || t.estado !== "esperando")
      .map((t) => ({
        fecha: t.cerrado ?? t.creado,
        unidad: unidad(t.sucursalId),
        examenes: t.hechos.map((id) => TODOS[id]?.nombre ?? id),
        pendientes: Math.max(0, t.examenes.length - t.hechos.length),
        estado: t.estado,
      }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    facturas: visitas
      .filter((t): t is Turno & { factura: string } => Boolean(t.factura))
      .map((t) => ({
        fecha: t.cerrado ?? t.creado,
        numero: t.factura,
        monto: t.monto,
        unidad: unidad(t.sucursalId),
      }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    documentos: documentos
      .filter((d) => ids.has(d.pacienteId))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .map((d) => ({
        id: d.id,
        tipo: d.tipo,
        fecha: d.fecha,
        doctor: doctor(d.doctorId),
        resumen: resumenDe(d),
        codigo: d.tipo === "nota" ? "" : d.codigo,
      })),
  };
}
