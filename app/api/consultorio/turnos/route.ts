import { NextResponse } from "next/server";
import { exigirModulo } from "@/lib/permisos";
import { sucursalActual } from "@/lib/consultorio/actual";
import { crearTurno, sucursalPorId, tipoDeOrdenDe, turnosDe } from "@/lib/consultorio/almacen";
import { esDe } from "@/lib/consultorio/catalogos";
import { leerPersona } from "@/lib/consultorio/validar";
import { tenantFromRequest } from "@/lib/tenants/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// La fila de hoy del mostrador que pregunta.
//
// La unidad viene en la URL porque hay tres departamentos abiertos a la vez
// (laboratorio, imagenología y procedimientos) y cada uno mira SU fila; sin
// eso, abrir imagenología mostraría la cola del laboratorio.
export async function GET(req: Request) {
  if (tenantFromRequest(req) !== "consultorio") {
    return NextResponse.json({ ok: false, error: "No existe." }, { status: 404 });
  }
  const pedida = new URL(req.url).searchParams.get("unidad");
  const unidad = (pedida ? sucursalPorId(pedida) : null) ?? (await sucursalActual());
  return NextResponse.json({ ok: true, unidad: unidad.id, turnos: await turnosDe(unidad.id) });
}

// Un turno a mano, desde el mostrador: para quien llega sin escanear el QR.
// Es la misma fila y la misma validación que la pública; lo único distinto es
// que acá hay sesión del laboratorio y la unidad la dice el mostrador.
export async function POST(req: Request) {
  const permiso = await exigirModulo(req, "laboratorio");
  if (!permiso.ok) return permiso.respuesta;
  if (tenantFromRequest(req) !== "consultorio") {
    return NextResponse.json({ ok: false, error: "No existe." }, { status: 404 });
  }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const unidad = sucursalPorId(String(b.unidad ?? ""));
  if (!unidad) {
    return NextResponse.json({ ok: false, error: "Esa unidad no existe." }, { status: 404 });
  }
  const persona = leerPersona(b);
  if (!persona.ok) return NextResponse.json({ ok: false, error: persona.error }, { status: 400 });

  // Solo lo que se hace en ESTA unidad, igual que en la entrada.
  const tipo = tipoDeOrdenDe(unidad.tipo);
  const examenes = [...new Set((b.examenes as string[]) ?? [])].filter((e) => esDe(tipo, e));
  if (examenes.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Marcá al menos uno de los que se hacen acá." },
      { status: 400 },
    );
  }

  const turno = await crearTurno({ sucursalId: unidad.id, ...persona.datos, examenes });
  return NextResponse.json({ ok: true, turno });
}
