import { NextResponse } from "next/server";
import {
  documentosDePacientes,
  listarDoctores,
  listarSucursales,
  pacientesPorCorreo,
} from "@/lib/consultorio/almacen";
import { armarPortal, normalizarCorreo } from "@/lib/consultorio/portal";
import { claveIp, golpe, respuestaBloqueado } from "@/lib/freno";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// El portal del paciente: entra con su correo y le salen sus recetas y órdenes.
//
// PÚBLICO a propósito, igual que el registro: quien pregunta no tiene cuenta.
// Va por POST para que el correo no quede en la URL ni en los logs de acceso.
// Lo que devuelve lo recorta portal.ts: ni teléfonos ni diagnóstico.
//
// Dos defensas contra probar correos en bucle hasta dar con uno:
//   - freno por IP compartido entre instancias (lib/freno.ts), porque el de
//     memoria se reiniciaba con cada instancia de Vercel;
//   - respuesta UNIFORME: un correo que no está contesta lo mismo que uno
//     registrado sin documentos (200 y portal vacío). Antes el 404 decía con
//     todas sus letras "ese correo no es paciente de acá", que es un dato.
const FRENO = { max: 12, ventanaSeg: 10 * 60 };

export async function POST(req: Request) {
  if (await golpe(claveIp(req, "portal"), FRENO)) return respuestaBloqueado(FRENO.ventanaSeg);

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const correo = normalizarCorreo(String(b.correo ?? ""));
  if (!correo) {
    return NextResponse.json({ ok: false, error: "Escribí el correo completo." }, { status: 400 });
  }

  const pacientes = await pacientesPorCorreo(correo);
  const documentos = pacientes.length > 0 ? await documentosDePacientes(pacientes.map((p) => p.id)) : [];
  return NextResponse.json({
    ok: true,
    portal: armarPortal(pacientes, documentos, listarDoctores(), listarSucursales()),
  });
}
