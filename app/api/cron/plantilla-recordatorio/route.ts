// El vigía de la cola: manda lo que quedó agendado y ya venció.
//
// EMPEZÓ SIENDO UNO SOLO. Al colgar la llamada de CrediQ sale
// `crediq_seguimiento_requisitos` con los cuatro papeles, y a quien no contesta
// ese, un rato después le llega `crediq_continuar_solicitud`, que no repite la
// lista y le baja el escalón: "empiece por el que tenga a la mano".
//
// AHORA SON DOS FORMAS, y la diferencia está en QUIÉN decide el texto:
//
//   1. La cita trae el mensaje adentro (`datos.plantilla`). Lo decidió el
//      webhook de fin de llamada, que era el único momento en que se sabía de
//      qué se habló: el seguimiento de Nissan nombra el carro por el que la
//      persona preguntó, y eso acá ya no hay forma de averiguarlo.
//   2. La cita viene vacía. Entonces decide `decidirRecordatorio`, que mira el
//      hilo: es el caso de CrediQ, donde el texto no depende de lo que se habló
//      sino de si le llegaron o no los requisitos.
//
// YA NO ES UN BARRIDO. Antes corría cada minuto desde Vercel y recorría TODAS
// las conversaciones preguntando quién cumplía la espera; casi siempre no era
// nadie. Ahora lee la cola de lib/recordatorios-agenda.ts, que llena el webhook
// de fin de llamada con la hora exacta de cada cita. Sin llamadas no hay nada
// que mirar, y la corrida no cuesta nada.
//
// Y ATIENDE A TODOS LOS CLIENTES. La cola es una sola tabla con el cliente como
// columna; recorrerla por cliente serían tantos relojes como clientes.
//
// POR QUÉ NO UN TEMPORIZADOR EN EL WEBHOOK. El webhook de fin de llamada vive
// 30 segundos, y un temporizador en memoria se pierde en el siguiente
// despliegue justo con la gente que estaba esperando. Por eso la cita se guarda
// en la base.
//
// SE PUEDE MIRAR SIN MANDAR NADA: ?seco=1 dice a quién le tocaría y por qué.

import { NextResponse } from "next/server";
import { getContacto } from "@/lib/contacts-store";
import { normalizarTelefono } from "@/lib/memoria-llamadas";
import { normalizarDestinoSV } from "@/lib/phone";
import { decidirRecordatorio } from "@/lib/plantilla-tras-llamada";
import { enviarPlantilla } from "@/lib/wa-send";
import { encenderIaSiNadieDecidio } from "@/lib/ai-store";
import { addOutbound, mensajesAnteriores } from "@/lib/wa-store";
import { cerrarCita, citasVencidas, type CitaRecordatorio } from "@/lib/recordatorios-agenda";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Cuántos mensajes del hilo se miran. Alcanza de sobra para ver la plantilla. */
const HILO = 30;

/**
 * Hasta cuándo sigue teniendo sentido mandarlo.
 *
 * Si la cola estuvo caída medio día, la cita vencida no se manda igual: un
 * "gracias por su llamada" nueve horas tarde no es un seguimiento, es una
 * confusión. Se cierra y se cuenta como saltada, que es lo honesto.
 */
const TOPE_HORAS = 6;

interface Envio {
  plantilla: string;
  idioma: string;
  variables: string[];
  texto: string;
}

type Resuelto = { enviar: false; motivo: string } | ({ enviar: true } & Envio);

/**
 * El mensaje que dejó escrito el webhook, si lo dejó.
 *
 * Se valida campo por campo en vez de confiar en el jsonb: lo que sale de acá
 * termina en un WhatsApp a una persona real. Una variable vacía no es un
 * detalle (Meta rechaza el envío entero), y un texto que no corresponda al que
 * se manda deja el hilo del panel diciendo una cosa distinta de la que recibió.
 */
function envioDeLaCita(datos: Record<string, unknown>): Envio | null {
  const plantilla = typeof datos.plantilla === "string" ? datos.plantilla.trim() : "";
  const texto = typeof datos.texto === "string" ? datos.texto.trim() : "";
  if (!plantilla || !texto) return null;
  const variables = Array.isArray(datos.variables)
    ? datos.variables.filter((v): v is string => typeof v === "string" && v.trim() !== "")
    : [];
  const idioma = typeof datos.idioma === "string" && datos.idioma ? datos.idioma : "es";
  return { plantilla, idioma, variables, texto };
}

interface DelHilo {
  direction: "in" | "out";
  texto: string;
  ts: string;
}

/** ¿Escribió DESDE que se colgó? Entonces el seguimiento sobra. */
function contestoDesde(hilo: DelHilo[], desde: string): boolean {
  const corte = Date.parse(desde);
  if (Number.isNaN(corte)) return false;
  return hilo.some((m) => m.direction === "in" && Date.parse(m.ts) >= corte);
}

async function resolver(cita: CitaRecordatorio, hilo: DelHilo[], ahora: Date): Promise<Resuelto> {
  const guardado = envioDeLaCita(cita.datos);
  if (guardado) {
    // El texto ya estaba decidido. Lo único que falta preguntar es si sigue
    // haciendo falta, y eso se sabe desde que se colgó, no desde que venció:
    // entre una cosa y la otra la persona pudo escribir.
    if (contestoDesde(hilo, cita.creado)) {
      return { enviar: false, motivo: "sí contestó: no hace falta escribirle" };
    }
    return { enviar: true, ...guardado };
  }

  // Sin mensaje guardado decide el hilo. Es la ruta de CrediQ.
  const ficha = await getContacto(normalizarTelefono(cita.telefono)).catch(() => null);
  const d = decidirRecordatorio({
    telefono: cita.telefono,
    nombre: [ficha?.nombre, ficha?.apellido].filter(Boolean).join(" ").trim() || null,
    hilo,
    ahora,
  });
  if (!d.enviar) return d;
  return {
    enviar: true,
    plantilla: d.plantilla,
    idioma: d.idioma,
    variables: [d.nombre],
    texto: d.texto,
  };
}

/**
 * Quién puede despertar al vigía.
 *
 * DOS LLAVES, y no por descuido. A esta ruta ya no la llama Vercel Cron sino
 * Postgres, que necesita la suya: CRON_SECRET está marcada "sensitive" en
 * Vercel y su valor no se puede volver a leer para ponérselo al job, así que
 * rotarla era la única forma de compartirla, y rotarla se lleva por delante a
 * las otras rutas de cron. COLA_SECRET es la de Postgres; CRON_SECRET se sigue
 * aceptando porque es con la que uno corre a mano el resto y no hay razón para
 * que esta sea la excepción.
 */
function autorizado(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const llaves = [process.env.COLA_SECRET, process.env.CRON_SECRET].filter(
    (s): s is string => Boolean(s),
  );
  return llaves.some((s) => auth === `Bearer ${s}`);
}

export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const seco = new URL(req.url).searchParams.get("seco") === "1";
  const ahora = new Date();

  // Sin cliente: la cola es de todos y se atiende de una pasada.
  const citas = await citasVencidas(undefined, ahora);
  const enviados: string[] = [];
  const saltados: Record<string, number> = {};
  let errores = 0;

  const saltar = (motivo: string) => {
    saltados[motivo] = (saltados[motivo] ?? 0) + 1;
  };

  for (const cita of citas) {
    const { tenant, telefono } = cita;
    try {
      // La cola admite otros tipos (una llamada de vuelta, por ejemplo) y este
      // vigía solo sabe de plantillas. Se cierra igual: una cita que nadie
      // atiende queda vencida para siempre y se vuelve a mirar en cada pasada.
      if (cita.tipo !== "plantilla") {
        saltar(`tipo "${cita.tipo}" sin manejador`);
        if (!seco) await cerrarCita(tenant, cita.id, `sin manejador para "${cita.tipo}"`);
        continue;
      }

      const horasTarde = (ahora.getTime() - Date.parse(cita.enviarA)) / 3_600_000;
      if (horasTarde > TOPE_HORAS) {
        saltar(`vencida hace más de ${TOPE_HORAS} h`);
        if (!seco) await cerrarCita(tenant, cita.id, `no: vencida hace ${horasTarde.toFixed(1)} h`);
        continue;
      }

      const { mensajes } = await mensajesAnteriores(telefono, null, HILO, tenant);
      const hilo: DelHilo[] = mensajes.map((m) => ({
        direction: m.direccion,
        texto: m.texto ?? "",
        ts: m.ts,
      }));

      const decision = await resolver(cita, hilo, ahora);

      if (!decision.enviar) {
        saltar(decision.motivo);
        // La cita se cierra igual: descartada también es atendida. Si no, queda
        // vencida para siempre y se vuelve a mirar en cada pasada.
        if (!seco) await cerrarCita(tenant, cita.id, `no: ${decision.motivo}`);
        continue;
      }

      if (seco) {
        enviados.push(`[SECO] ${tenant} ${telefono}: ${decision.plantilla}`);
        continue;
      }

      const destino = normalizarDestinoSV(telefono)?.replace(/\D/g, "") ?? telefono;
      const env = await enviarPlantilla(destino, decision.plantilla, decision.idioma, decision.variables, {
        tenant,
      });
      if (!env.ok) {
        errores++;
        console.error(`[recordatorio] ${tenant} ${telefono}: ${env.error}`);
        // NO se cierra: un fallo de Meta puede ser pasajero y la siguiente
        // pasada lo reintenta. El tope de horas evita que reintente para
        // siempre.
        continue;
      }
      if (env.id) {
        await addOutbound({
          waId: env.id,
          to: destino,
          texto: decision.texto,
          ts: new Date().toISOString(),
          tenant,
        });
      }
      // Cuando conteste, que le responda Sofía.
      await encenderIaSiNadieDecidio(destino);
      await cerrarCita(tenant, cita.id, "enviado");
      enviados.push(telefono);
      console.log(`[recordatorio] ${tenant} ${telefono}: enviado ${decision.plantilla}.`);
    } catch (e) {
      errores++;
      console.error("[recordatorio]", tenant, telefono, e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.json({
    ok: true,
    seco,
    // Cuántas citas había vencidas, no cuántas conversaciones existen: si esto
    // da 0 es que no hubo llamadas, y esta corrida no costó nada.
    citas: citas.length,
    enviados: enviados.length,
    detalle: enviados,
    // Por qué NO se le escribió al resto. Una corrida que no explica sus
    // silencios no se puede depurar.
    saltados,
    errores,
  });
}
