// Lo que se le exige a quien entra a la clínica, venga de donde venga.
//
// El paciente que escanea el QR, el que registra el doctor a mano y el que
// recepción mete en la fila sin teléfono inteligente pasan por la misma regla:
// un nombre completo y un teléfono con sus ocho dígitos. Tenerla en tres rutas
// fue lo que dejó una validando y las otras no.

import type { Paciente, Sexo } from "./tipos";

export type Leido<T> = { ok: true; datos: T } | { ok: false; error: string };

export interface Persona {
  nombre: string;
  telefono: string;
  correo: string;
}

/** Nombre, teléfono y correo, limpios. El teléfono queda solo con dígitos y "+". */
export function leerPersona(b: Record<string, unknown>): Leido<Persona> {
  const nombre = String(b.nombre ?? "").trim();
  const telefono = String(b.telefono ?? "").replace(/[^\d+]/g, "");
  if (nombre.length < 3) return { ok: false, error: "Escribí el nombre completo." };
  if (telefono.replace(/\D/g, "").length < 8) {
    return { ok: false, error: "El teléfono no está completo." };
  }
  return { ok: true, datos: { nombre, telefono, correo: String(b.correo ?? "").trim() } };
}

/** Lo que se guarda del paciente, además de la persona: fecha, sexo, motivo y alergias. */
export function leerPaciente(
  b: Record<string, unknown>,
): Leido<Omit<Paciente, "id" | "creado" | "doctorId">> {
  const persona = leerPersona(b);
  if (!persona.ok) return persona;
  const sexo = ["F", "M", "otro"].includes(String(b.sexo ?? "")) ? (b.sexo as Sexo) : null;
  return {
    ok: true,
    datos: {
      ...persona.datos,
      nacimiento: String(b.nacimiento ?? "").trim() || null,
      sexo,
      motivo: String(b.motivo ?? "").trim(),
      alergias: String(b.alergias ?? "").trim(),
    },
  };
}
