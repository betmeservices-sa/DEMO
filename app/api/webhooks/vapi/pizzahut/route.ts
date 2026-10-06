import { NextResponse, after } from "next/server";
import { secretoVapiValido } from "@/lib/vapi-secreto";
import { mapearReporte, tipoDeMensaje } from "@/lib/eventos/contrato";
import { asignarAsesor, datosFaltantes } from "@/lib/eventos/prioridad";
import { crearPropuesta, dondeGuarda, guardarLlamada } from "@/lib/eventos/store";
import { estadoEventos, llamadaDelTenant } from "@/lib/eventos/servidor";
import { copiarGrabacion } from "@/lib/eventos/grabacion";
import { ASESORES } from "@/lib/eventos/catalogo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Lo que deja cada llamada de Daniela, la agente de voz de eventos de Pizza Hut.
//
// Pública (la llama la plataforma de voz desde sus servidores) y protegida con
// el secreto compartido en `x-vapi-secret`. Solo actúa en `end-of-call-report`:
// el resto de los avisos (estado, transcripción parcial) se contesta 200 y se
// ignora.
//
// Idempotente por id de llamada: si la plataforma reintenta, la segunda vez
// no crea nada. Toda llamada cuenta en las estadísticas; la propuesta solo se
// crea si fue una propuesta de evento y la llamada no fue un cuelgue. Si faltan
// datos, se crea igual y la ficha muestra qué falta.

export async function POST(req: Request) {
  if (!secretoVapiValido(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const tipo = tipoDeMensaje(body);
  if (tipo !== "end-of-call-report") {
    return NextResponse.json({ ok: true, ignorado: tipo || "sin tipo" });
  }

  const r = mapearReporte(body);
  if (!r.llamada) return NextResponse.json({ ok: true, ignorado: r.sinPropuesta });
  if (!llamadaDelTenant(r.llamada.assistantId)) {
    return NextResponse.json({ ok: true, ignorado: "la llamada no es del agente de Pizza Hut" });
  }

  try {
    const nueva = await guardarLlamada(r.llamada, r.urlsGrabacion);

    let creada = false;
    let asesorId: string | undefined;
    if (r.propuesta) {
      // Al asesor con menos propuestas abiertas, contando la muestra y lo real.
      try {
        asesorId = asignarAsesor((await estadoEventos()).propuestas);
      } catch {
        asesorId = ASESORES[0].id;
      }
      creada = await crearPropuesta({ ...r.propuesta, asesorId });
    }

    // El audio se copia DESPUÉS de contestar: bajar y subir unos megas no
    // tiene por qué hacer esperar a la plataforma de voz.
    if (nueva) {
      const id = r.llamada.id;
      const urls = r.urlsGrabacion;
      after(async () => {
        const path = await copiarGrabacion(id, urls);
        console.log(`[eventos] audio de ${id}: ${path ?? "sin copia"}`);
      });
    }

    return NextResponse.json({
      ok: true,
      llamada: r.llamada.id,
      nueva,
      propuesta: r.propuesta?.id ?? null,
      creada,
      asesorId: creada ? (asesorId ?? null) : null,
      faltantes: r.propuesta ? datosFaltantes(r.propuesta.datos).map((f) => f.campo) : [],
      sinPropuesta: r.sinPropuesta ?? null,
      fuente: r.llamada.fuente,
      guardaEn: dondeGuarda(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[eventos] el webhook no pudo guardar:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** Diagnóstico: con el secreto, dice dónde se está guardando. */
export async function GET(req: Request) {
  if (!secretoVapiValido(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  return NextResponse.json({ ok: true, guardaEn: dondeGuarda() });
}
