import { NextResponse } from "next/server";
import { exigirModulo } from "@/lib/permisos";
import { doctorActual } from "@/lib/consultorio/actual";
import { colaDelDoctor, pacientesDe, registrarPaciente } from "@/lib/consultorio/almacen";
import { recordarPaciente } from "@/lib/consultorio/contacto";
import { leerPaciente } from "@/lib/consultorio/validar";
import { tenantFromRequest } from "@/lib/tenants/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Los pacientes del doctor que se está viendo. Nunca los del otro.
//
// El módulo es de un solo cliente, así que la primera pregunta es si la sesión
// es de ese cliente: sin esto, la cuenta de otro tenant podría leer la lista de
// pacientes de la clínica escribiendo la URL a mano.
export async function GET(req: Request) {
  if (tenantFromRequest(req) !== "consultorio") {
    return NextResponse.json({ ok: false, error: "No existe." }, { status: 404 });
  }
  const doctor = await doctorActual();
  // La cola va en la misma respuesta: la pantalla del doctor se refresca cada
  // cinco segundos, y pedirla aparte serían dos viajes por vuelta.
  const [pacientes, cola] = await Promise.all([pacientesDe(doctor.id), colaDelDoctor(doctor.id)]);
  return NextResponse.json({ ok: true, pacientes, cola });
}

// Registrar un paciente a mano. Es el mismo registro del QR, solo que lo hace
// el doctor desde su escritorio: el paciente queda con ÉL (el doctor que se
// está viendo), nunca con uno que venga en el cuerpo.
export async function POST(req: Request) {
  const permiso = await exigirModulo(req, "consultorio");
  if (!permiso.ok) return permiso.respuesta;
  if (tenantFromRequest(req) !== "consultorio") {
    return NextResponse.json({ ok: false, error: "No existe." }, { status: 404 });
  }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const leido = leerPaciente(b);
  if (!leido.ok) return NextResponse.json({ ok: false, error: leido.error }, { status: 400 });

  const doctor = await doctorActual();
  const { paciente, repetido } = await registrarPaciente({ ...leido.datos, doctorId: doctor.id });
  await recordarPaciente({
    nombre: paciente.nombre,
    telefono: paciente.telefono,
    correo: paciente.correo,
  });
  return NextResponse.json({ ok: true, repetido, pacienteId: paciente.id, paciente });
}
