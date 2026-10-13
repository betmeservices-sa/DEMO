import { NextResponse } from "next/server";
import { doctorPorCodigo, registrarPaciente } from "@/lib/consultorio/almacen";
import { recordarPaciente } from "@/lib/consultorio/contacto";
import { leerPaciente } from "@/lib/consultorio/validar";
import { claveIp, golpe, respuestaBloqueado } from "@/lib/freno";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// El registro que llega del QR del doctor.
//
// PÚBLICO a propósito: el paciente que escanea no tiene cuenta ni la va a
// tener. Lo que decide de quién es el paciente NO es un campo del formulario
// sino el código del QR, que se resuelve acá contra el doctor: así nadie puede
// meterle pacientes a otro doctor mandando un id en el cuerpo.
// Freno por IP, compartido entre instancias. Generoso: en una sala de espera
// todos salen por la misma IP. Corta a quien mete registros en bucle.
const FRENO = { max: 60, ventanaSeg: 10 * 60 };

export async function POST(req: Request) {
  if (await golpe(claveIp(req, "consultorio-publico"), FRENO)) return respuestaBloqueado(60);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const doctor = doctorPorCodigo(String(b.codigo ?? ""));
  if (!doctor) {
    return NextResponse.json({ ok: false, error: "Ese código no existe." }, { status: 404 });
  }

  // La misma regla que el registro a mano del doctor (lib/consultorio/validar).
  const leido = leerPaciente(b);
  if (!leido.ok) return NextResponse.json({ ok: false, error: leido.error }, { status: 400 });

  const { paciente, repetido } = await registrarPaciente({ ...leido.datos, doctorId: doctor.id });

  // Y queda en la pestaña Contactos de la clínica, con su historial.
  await recordarPaciente({
    nombre: paciente.nombre,
    telefono: paciente.telefono,
    correo: paciente.correo,
  });

  return NextResponse.json({ ok: true, repetido, doctor: doctor.nombre, pacienteId: paciente.id });
}
