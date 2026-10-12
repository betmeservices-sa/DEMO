import { NextResponse } from "next/server";
import { doctorPorCodigo, registrarPaciente } from "@/lib/consultorio/almacen";
import type { Sexo } from "@/lib/consultorio/tipos";
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
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const doctor = doctorPorCodigo(b.codigo ?? "");
  if (!doctor) {
    return NextResponse.json({ ok: false, error: "Ese código no existe." }, { status: 404 });
  }

  const nombre = (b.nombre ?? "").trim();
  const telefono = (b.telefono ?? "").replace(/[^\d+]/g, "");
  if (nombre.length < 3) {
    return NextResponse.json({ ok: false, error: "Escribí tu nombre completo." }, { status: 400 });
  }
  if (telefono.replace(/\D/g, "").length < 8) {
    return NextResponse.json({ ok: false, error: "El teléfono no está completo." }, { status: 400 });
  }

  const sexo = ["F", "M", "otro"].includes(b.sexo ?? "") ? (b.sexo as Sexo) : null;
  const { paciente, repetido } = await registrarPaciente({
    doctorId: doctor.id,
    nombre,
    telefono,
    correo: (b.correo ?? "").trim(),
    nacimiento: (b.nacimiento ?? "").trim() || null,
    sexo,
    motivo: (b.motivo ?? "").trim(),
    alergias: (b.alergias ?? "").trim(),
  });

  return NextResponse.json({ ok: true, repetido, doctor: doctor.nombre, pacienteId: paciente.id });
}
