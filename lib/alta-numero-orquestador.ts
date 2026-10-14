// El que corre el alta de punta a punta.
//
// Se parte en dos mitades porque en medio hay una llamada de teléfono. La
// primera (`iniciarAlta`) deja el número dado de alta y a Meta llamando, y
// devuelve en seguida para que la pantalla pueda mostrar el reloj. La segunda
// (`continuarConCodigo`) la dispara el agente de voz cuando oyó el código, y de
// ahí ya va de corrido hasta dejarlo contestando WhatsApp.
//
// Partirlo así evita una función serverless esperando un minuto al teléfono, y
// de paso hace que el paso lento sea justo el que la demo quiere lucir.

import { randomUUID } from "node:crypto";
import {
  avanzar,
  codigoValido,
  conError,
  corridaNueva,
  lineasDisponibles,
  normalizarLinea,
  type Corrida,
} from "./alta-numero";
import {
  altaEnMeta,
  lineasListasEnVapi,
  numerosEnWhatsApp,
  pedirCodigoPorLlamada,
  registrarNumero,
  verificarCodigo,
  type CredsAlta,
} from "./alta-numero-meta";
import { corridaVivaDe, guardarCorrida, leerCorrida } from "./alta-numero-store";
import { conexionesWaDe, guardarConexionWa } from "./wa-conexiones-store";

/** El agente de voz que contesta la llamada de Meta y oye el código. */
export const ASISTENTE_VERIFICADOR = "e60c6223-ea1f-47f8-a940-5ebd55a9c107";

/** El panel donde cae el número nuevo: el comercial, con Sofía contestando. */
export const TENANT_DEMO = "comercial";

const NOMBRE_VISIBLE = "MiAgentIA";

/**
 * Token, cuenta y PIN para el alta.
 *
 * Sale de la conexión que el panel comercial ya tiene (su número de WhatsApp de
 * siempre), así no hace falta una variable de entorno nueva ni otro token
 * rodando por ahí. El PIN es el de dos pasos que se le fija al número al
 * registrarlo: el de la variable si está, y si no el de cualquier número ya
 * conectado que lo tenga guardado.
 */
export async function credencialesAlta(): Promise<CredsAlta | null> {
  const conexiones = await conexionesWaDe(TENANT_DEMO);
  const conWaba = conexiones.find((c) => c.wabaId && c.accessToken);
  if (!conWaba) return null;
  const pin = process.env.WHATSAPP_ALTA_PIN || conexiones.find((c) => c.pin)?.pin;
  if (!pin) return null;
  return { token: conWaba.accessToken, wabaId: conWaba.wabaId, pin };
}

/** Las líneas que se le pueden ofrecer hoy, ya cruzadas con Vapi y con Meta. */
export async function lineasParaOfrecer(): Promise<{ lineas: string[]; motivo: string | null }> {
  const creds = await credencialesAlta();
  if (!creds) return { lineas: [], motivo: "No hay credenciales de WhatsApp en este ambiente." };
  const [enVapi, enWhatsApp] = await Promise.all([
    lineasListasEnVapi(ASISTENTE_VERIFICADOR),
    numerosEnWhatsApp(creds),
  ]);
  if (enVapi.length === 0) {
    return { lineas: [], motivo: "Ninguna línea tiene el agente verificador colgado en Vapi." };
  }
  const lineas = lineasDisponibles(enVapi, enWhatsApp);
  return {
    lineas,
    motivo: lineas.length === 0 ? "Las líneas de demo ya están todas dadas de alta en WhatsApp." : null,
  };
}

export interface ResultadoInicio {
  ok: boolean;
  corrida?: Corrida;
  error?: string;
}

/**
 * Primera mitad: comprueba la línea, la da de alta y pide el código por llamada.
 *
 * La comprobación contra Vapi no es ceremonia: si la línea no tiene agente, la
 * llamada de Meta entra a un número muerto, el código se gasta y el número queda
 * a medio dar de alta sin poder repetirlo.
 */
export async function iniciarAlta(entrada: string): Promise<ResultadoInicio> {
  const numero = normalizarLinea(entrada);
  if (!numero) return { ok: false, error: "Ese número no es de la serie de la demo (2505 46xx)." };

  const creds = await credencialesAlta();
  if (!creds) return { ok: false, error: "No hay credenciales de WhatsApp en este ambiente." };

  const { lineas } = await lineasParaOfrecer();
  if (!lineas.includes(numero)) {
    return {
      ok: false,
      error:
        "Esa línea no está lista: tiene que estar dada de alta en Vapi con el agente verificador y no estar todavía en WhatsApp.",
    };
  }

  const yaCorriendo = await corridaVivaDe(numero);
  if (yaCorriendo) return { ok: true, corrida: yaCorriendo };

  let c = corridaNueva(randomUUID(), numero);
  c = avanzar(c, "linea");
  await guardarCorrida(c);

  try {
    const phoneNumberId = await altaEnMeta(creds, numero, NOMBRE_VISIBLE);
    c = { ...avanzar(c, "alta"), phoneNumberId };
    await guardarCorrida(c);

    await pedirCodigoPorLlamada(creds, phoneNumberId);
    c = avanzar(c, "codigo-pedido");
    c = avanzar(c, "esperando-codigo");
    await guardarCorrida(c);
    return { ok: true, corrida: c };
  } catch (e) {
    c = conError(c, e instanceof Error ? e.message : "Falló el alta en Meta.");
    await guardarCorrida(c);
    return { ok: false, corrida: c, error: c.error ?? undefined };
  }
}

/**
 * Segunda mitad: con el código en mano, verificar, registrar y conectar.
 *
 * La llama el webhook del agente de voz. Es idempotente a propósito: la
 * herramienta del agente y el reporte de fin de llamada pueden traer el mismo
 * código, y Vapi reintenta.
 */
export async function continuarConCodigo(
  numero: string,
  codigo: string,
  oido?: string | null,
): Promise<Corrida | null> {
  if (!codigoValido(codigo)) return null;

  let c = await corridaVivaDe(numero);
  if (!c) return null;
  if (c.codigo && c.paso !== "esperando-codigo") return c;

  const creds = await credencialesAlta();
  const phoneNumberId = c.phoneNumberId;
  if (!creds || !phoneNumberId) return c;

  c = { ...avanzar(c, "codigo-recibido"), codigo, oido: oido ?? c.oido };
  await guardarCorrida(c);

  try {
    await verificarCodigo(creds, phoneNumberId, codigo);
    c = avanzar(c, "verificado");
    await guardarCorrida(c);

    await registrarNumero(creds, phoneNumberId);
    c = avanzar(c, "registrado");
    await guardarCorrida(c);

    await conectarAlPanel(creds, numero, phoneNumberId);
    c = avanzar(c, "conectado");
    await guardarCorrida(c);
    return c;
  } catch (e) {
    c = conError(c, e instanceof Error ? e.message : "Falló la verificación con Meta.");
    await guardarCorrida(c);
    return c;
  }
}

/**
 * Deja el número colgado del panel comercial con su IA encendida.
 *
 * El interruptor va en ESTE número, no en el panel: encender el global pondría a
 * contestar a los agentes de todos los demás clientes del demo. Es lo último del
 * flujo porque el código que sabe del tenant ya está desplegado y la cuenta ya
 * está suscrita al webhook del demo; lo único que falta es la fila.
 */
async function conectarAlPanel(creds: CredsAlta, numero: string, phoneNumberId: string): Promise<void> {
  await guardarConexionWa({
    tenant: TENANT_DEMO,
    wabaId: creds.wabaId,
    phoneNumberId,
    displayPhone: numero.replace(/^(\+\d{3})(\d{4})(\d{4})$/, "$1 $2 $3"),
    verifiedName: NOMBRE_VISIBLE,
    accessToken: creds.token,
    pin: creds.pin,
    iaActiva: true,
  });
}

/** Lo que mira la pantalla mientras espera. */
export async function estadoDeCorrida(id: string): Promise<Corrida | null> {
  return leerCorrida(id);
}

/**
 * Volver a pedirle a Meta que llame.
 *
 * Hace falta porque Meta puede contestar `success: true` y no llamar nunca: pasó
 * con el 2505 4610 el 2026-10-14, con la línea sana (se le marcó y timbró). El
 * número ya está dado de alta, así que no se empieza de cero: se vuelve a pedir
 * el código y se reinicia el reloj de la espera.
 */
export async function reintentarCodigo(id: string): Promise<Corrida | null> {
  const c = await leerCorrida(id);
  if (!c || !c.phoneNumberId) return c;
  if (c.estado === "listo") return c;

  const creds = await credencialesAlta();
  if (!creds) return c;

  try {
    await pedirCodigoPorLlamada(creds, c.phoneNumberId);
    const reintentada: Corrida = {
      ...c,
      estado: "corriendo",
      error: null,
      paso: "esperando-codigo",
      marcas: { ...c.marcas, "esperando-codigo": new Date().toISOString() },
      terminadoEn: null,
    };
    await guardarCorrida(reintentada);
    return reintentada;
  } catch (e) {
    const rota = conError(c, e instanceof Error ? e.message : "Meta no aceptó pedir el código otra vez.");
    await guardarCorrida(rota);
    return rota;
  }
}

/**
 * Dejar de esperar.
 *
 * El número queda dado de alta en Meta (eso no se puede deshacer con este token),
 * así que la corrida se marca cerrada y esa línea sale de la lista: lo honesto es
 * decirlo, no fingir que no pasó nada.
 */
export async function cancelarCorrida(id: string): Promise<Corrida | null> {
  const c = await leerCorrida(id);
  if (!c || c.estado === "listo") return c;
  const cerrada = conError(c, "Se dejó de esperar. El número quedó dado de alta en Meta, sin verificar.");
  await guardarCorrida(cerrada);
  return cerrada;
}
