import { NextResponse } from "next/server";
import { exigirModulo } from "@/lib/permisos";
import { tenantFromRequest } from "@/lib/tenants/server";
import { golpe } from "@/lib/freno";
import {
  FRENO_PRUEBA,
  SIN_CONEXION,
  SIN_RESPUESTA,
  claveDeFreno,
  cuerpoDePrueba,
  peticionAlHub,
} from "@/lib/consultorio/valeria";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Probar a Valeria desde el demo del Centro Ginecológico.
//
// Esta ruta no tiene guion ni modelo: reenvía la conversación al hub, que es
// donde vive la Valeria que contesta el número real, y devuelve lo que ella
// dijo. Nada se guarda de este lado tampoco: el historial viaja completo en
// cada turno y vive en el navegador de quien prueba.
export async function POST(req: Request) {
  const permiso = await exigirModulo(req, "valeria");
  if (!permiso.ok) return permiso.respuesta;
  if (tenantFromRequest(req) !== "consultorio") {
    return NextResponse.json({ ok: false, error: "No existe." }, { status: 404 });
  }

  const cuerpo = cuerpoDePrueba(await req.json().catch(() => ({})));
  if (!cuerpo) {
    return NextResponse.json({ ok: false, error: "Escribe algo." }, { status: 400 });
  }

  const peticion = peticionAlHub(cuerpo);
  if (!peticion) {
    return NextResponse.json({ ok: false, error: SIN_CONEXION }, { status: 503 });
  }

  if (await golpe(claveDeFreno(cuerpo.sesion), FRENO_PRUEBA)) {
    return NextResponse.json(
      { ok: false, error: "Muchos mensajes seguidos. Espera unos minutos y vuelve a probar." },
      { status: 429 },
    );
  }

  try {
    const r = await fetch(peticion.url, { ...peticion.init, cache: "no-store" });
    const d = (await r.json().catch(() => null)) as { ok?: boolean; respuesta?: string; error?: string } | null;
    if (!d || typeof d.ok !== "boolean") {
      console.error("consultorio/valeria: el hub respondió", r.status);
      return NextResponse.json({ ok: false, error: SIN_RESPUESTA });
    }
    // Lo que dijo el hub, tal cual, con su estado: un 429 de allá también
    // es un "espera un rato" acá.
    return NextResponse.json(
      d.ok ? { ok: true, respuesta: d.respuesta } : { ok: false, error: d.error ?? SIN_RESPUESTA },
      { status: r.ok ? 200 : r.status },
    );
  } catch (e) {
    console.error("consultorio/valeria:", e);
    return NextResponse.json({ ok: false, error: SIN_RESPUESTA });
  }
}
