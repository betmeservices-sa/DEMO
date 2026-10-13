// El paciente queda en Contactos.
//
// Quien se registra con el QR del doctor o toma turno en una unidad pasa a la
// pestaña Contactos de la clínica, con la etiqueta "Paciente", para que su
// ficha junte lo de la clínica con lo que escriba por WhatsApp. Es un efecto
// secundario: si falla, el registro o el turno siguen igual.

import { getContacto, upsertContacto } from "@/lib/contacts-store";

export const TENANT = "consultorio";
export const ETIQUETA_PACIENTE = "Paciente";

export async function recordarPaciente(datos: {
  nombre: string;
  telefono: string;
  correo?: string;
}): Promise<void> {
  const from = datos.telefono.replace(/\D/g, "");
  if (from.length < 8) return;
  try {
    // La tabla de contactos es una sola para todos los clientes y su llave es
    // el teléfono: un paciente de la clínica con el mismo número que un
    // huésped de otro cliente le pisaría la ficha. Si ya es de otro, no se toca.
    const previo = await getContacto(from);
    if (previo?.tenant && previo.tenant !== TENANT) {
      console.warn(`[consultorio] el contacto ${from} es de ${previo.tenant}; no se toca.`);
      return;
    }
    const partes = datos.nombre.trim().split(/\s+/);
    await upsertContacto({
      from,
      nombre: partes[0] ?? datos.nombre,
      apellido: partes.slice(1).join(" "),
      correo: datos.correo?.trim() || undefined,
      tenant: TENANT,
      tags: [ETIQUETA_PACIENTE],
    });
  } catch (e) {
    console.error("[consultorio] no se pudo guardar el contacto", e);
  }
}
