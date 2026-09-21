// El recordatorio de WhatsApp a los 5 minutos, para quien no contestó.
//
// Al colgar la llamada de CrediQ sale `crediq_seguimiento_requisitos` con los
// cuatro papeles. A quien no contesta ese, cinco minutos después le llega
// `crediq_continuar_solicitud`, que no repite la lista y le baja el escalón:
// "empiece por el que tenga a la mano".
//
// YA NO ES UN BARRIDO. Antes corría cada minuto desde Vercel y recorría TODAS
// las conversaciones de Grupo Q preguntando quién cumplía la espera; casi
// siempre no era nadie. Ahora lee la cola de lib/recordatorios-agenda.ts, que
// llena el webhook de fin de llamada con la hora exacta de cada cita, y a esta
// ruta la despierta Postgres SOLO cuando hay citas vencidas. Sin llamadas, no
// se ejecuta.
//
// POR QUÉ NO UN TEMPORIZADOR EN EL WEBHOOK. El webhook de fin de llamada vive
// 30 segundos y un temporizador en memoria se pierde en el siguiente
// despliegue, justo con la gente que estaba esperando. Por eso la cita se
// guarda en la base.
//
// LA DECISIÓN NO CAMBIÓ: sigue siendo pura y vive en lib/plantilla-tras-llamada.ts.
// Que la cita esté vencida no basta para mandar; si la persona contestó en el
// minuto, `decidirRecordatorio` lo frena igual que antes.
//
// SE PUEDE MIRAR SIN MANDAR NADA: ?seco=1 dice a quién le tocaría y por qué.

import { NextResponse } from "next/server";
import { getContacto } from "@/lib/contacts-store";
import { normalizarTelefono } from "@/lib/memoria-llamadas";
import { normalizarDestinoSV } from "@/lib/phone";
import { CONTINUAR, decidirRecordatorio } from "@/lib/plantilla-tras-llamada";
import { enviarPlantilla } from "@/lib/wa-send";
import { encenderIaSiNadieDecidio } from "@/lib/ai-store";
import { addOutbound, mensajesAnteriores } from "@/lib/wa-store";
import { cerrarCita, citasVencidas } from "@/lib/recordatorios-agenda";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** El cliente cuyo agente promete el WhatsApp. */
const TENANT = "grupoq";

/** Cuántos mensajes del hilo se miran. Alcanza de sobra para ver la plantilla. */
const HILO = 30;

export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secreto || auth !== `Bearer ${secreto}`) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const seco = new URL(req.url).searchParams.get("seco") === "1";
  const ahora = new Date();

  const citas = await citasVencidas(TENANT, ahora);
  const enviados: string[] = [];
  const saltados: Record<string, number> = {};
  let errores = 0;

  for (const cita of citas) {
    const telefono = cita.telefono;
    try {
      const { mensajes } = await mensajesAnteriores(telefono, null, HILO, TENANT);
      const ficha = await getContacto(normalizarTelefono(telefono)).catch(() => null);

      const decision = decidirRecordatorio({
        telefono,
        nombre: [ficha?.nombre, ficha?.apellido].filter(Boolean).join(" ").trim() || null,
        hilo: mensajes.map((m) => ({ direction: m.direccion, texto: m.texto ?? "", ts: m.ts })),
        ahora,
      });

      if (!decision.enviar) {
        saltados[decision.motivo] = (saltados[decision.motivo] ?? 0) + 1;
        // La cita se cierra igual: descartada tambien es atendida. Si no, queda
        // vencida para siempre y se vuelve a mirar en cada pasada.
        if (!seco) await cerrarCita(TENANT, cita.id, `no: ${decision.motivo}`);
        continue;
      }

      if (seco) {
        enviados.push(`[SECO] ${telefono}: ${decision.plantilla}`);
        continue;
      }

      const destino = normalizarDestinoSV(telefono)?.replace(/\D/g, "") ?? telefono;
      const env = await enviarPlantilla(destino, decision.plantilla, decision.idioma, [decision.nombre], {
        tenant: TENANT,
      });
      if (!env.ok) {
        errores++;
        console.error(`[recordatorio] ${telefono}: ${env.error}`);
        // NO se cierra: un fallo de Meta puede ser pasajero y la siguiente
        // pasada lo reintenta. El tope de horas de la decision evita que quede
        // reintentando para siempre.
        continue;
      }
      if (env.id) {
        await addOutbound({
          waId: env.id,
          to: destino,
          texto: decision.texto,
          ts: new Date().toISOString(),
          tenant: TENANT,
        });
      }
      // Cuando conteste, que le responda Sofía.
      await encenderIaSiNadieDecidio(destino);
      await cerrarCita(TENANT, cita.id, "enviado");
      enviados.push(telefono);
      console.log(`[recordatorio] ${telefono}: enviado ${CONTINUAR.nombre}.`);
    } catch (e) {
      errores++;
      console.error("[recordatorio]", telefono, e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.json({
    ok: true,
    seco,
    // Cuantas citas habia vencidas, no cuantas conversaciones existen: si esto
    // da 0 es que no hubo llamadas, y esta corrida no costo nada.
    citas: citas.length,
    enviados: enviados.length,
    detalle: enviados,
    // Por qué NO se le escribió al resto. Una corrida que no explica sus
    // silencios no se puede depurar.
    saltados,
    errores,
  });
}
