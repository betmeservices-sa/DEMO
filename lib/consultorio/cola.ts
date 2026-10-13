// La cola del doctor: quién ya pagó sus exámenes hoy y viene a la consulta.
//
// El circuito del demo es doctor → laboratorio → doctor: el paciente se
// registra con el QR del doctor, se hace los exámenes, paga en el mostrador y
// vuelve con los resultados. Esta es la segunda flecha: al finalizar y facturar
// en el laboratorio, la persona le aparece al doctor arriba de su lista como
// la que sigue. Sale de ahí sola cuando el doctor le deja algo escrito después
// de ese pago (una nota, una receta), porque eso es haberla atendido.
//
// Es lógica pura a propósito: recibe las listas y decide, sin red ni base,
// para poder probarla. Quién trae las listas es el almacén.

import { TODOS } from "./catalogos";
import type { Documento, Paciente, Sucursal, Turno } from "./tipos";

/** Los últimos ocho dígitos: es lo que queda igual escriban "+503 7293 8961" o "72938961". */
export const ultimos8 = (t: string) => t.replace(/\D/g, "").slice(-8);

const DIA_SV = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/El_Salvador",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Si ese instante cae en el día de hoy de El Salvador, no del servidor. */
export function esHoySV(iso: string, ahora: Date = new Date()): boolean {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && DIA_SV.format(d) === DIA_SV.format(ahora);
}

/**
 * De quién es un turno.
 *
 * Primero por el expediente que quedó amarrado al crear el turno (vino con la
 * orden del doctor). Si no lo hay, por teléfono: la misma persona se registró
 * con el doctor y tomó turno en el laboratorio con el mismo número. Si se
 * registró más de una vez, manda el expediente más reciente.
 */
export function pacienteDeTurno(turno: Turno, pacientes: Paciente[]): Paciente | null {
  if (turno.pacienteId) {
    const p = pacientes.find((x) => x.id === turno.pacienteId);
    if (p) return p;
  }
  const tel = ultimos8(turno.telefono);
  if (tel.length < 8) return null;
  return (
    [...pacientes]
      .filter((p) => ultimos8(p.telefono) === tel)
      .sort((a, b) => b.creado.localeCompare(a.creado))[0] ?? null
  );
}

export interface EnCola {
  paciente: Paciente;
  turnoId: string;
  /** Cuándo pagó (el instante en que se finalizó en el mostrador). */
  pagado: string;
  unidad: string;
  /** Los nombres de lo que sí se le hizo. */
  examenes: string[];
  factura: string;
  monto: number | null;
}

/**
 * La cola de un doctor a partir de las listas.
 *
 * Entra quien hoy (día de El Salvador) finalizó y pagó en cualquier unidad y
 * es paciente de este doctor. Sale quien ya tiene un documento de este doctor
 * con fecha posterior al pago. El orden es el del pago: el que pagó primero es
 * el que sigue.
 */
export function armarCola(
  doctorId: string,
  turnos: Turno[],
  pacientes: Paciente[],
  documentos: Documento[],
  sucursales: Sucursal[],
  ahora: Date = new Date(),
): EnCola[] {
  const suyos = pacientes.filter((p) => p.doctorId === doctorId);
  const lista: EnCola[] = [];
  for (const t of turnos) {
    if (!t.factura || !t.cerrado || !esHoySV(t.cerrado, ahora)) continue;
    const paciente = pacienteDeTurno(t, suyos);
    if (!paciente) continue;
    const atendido = documentos.some(
      (d) =>
        d.doctorId === doctorId && d.pacienteId === paciente.id && d.fecha > (t.cerrado as string),
    );
    if (atendido) continue;
    lista.push({
      paciente,
      turnoId: t.id,
      pagado: t.cerrado,
      unidad: sucursales.find((s) => s.id === t.sucursalId)?.nombre ?? "",
      examenes: t.hechos.map((id) => TODOS[id]?.nombre ?? id),
      factura: t.factura,
      monto: t.monto,
    });
  }
  return lista.sort((a, b) => a.pagado.localeCompare(b.pagado));
}
