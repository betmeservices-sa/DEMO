// "Seguimos por WhatsApp": la herramienta que usan las agentes de voz de las
// demos cuya agente de WhatsApp es LA MISMA. Cuando la persona dice en la
// llamada que prefiere seguir por WhatsApp, le sale la plantilla con la que la
// misma agente abre el chat desde el número del panel y sigue la demo. Lo que
// se habló por teléfono pasa al chat (lib/llamada-contexto.ts).
//
//   - Sofía, de la llamada demo de la conferencia (Vapi "Sofia - MiAgentIA
//     (Conferencia)"), en el panel comercial (+503 7560 5872). De tú.
//   - Elena, de la demo de la Caja de Crédito de Chalatenango (Vapi "Elena -
//     Caja Chalatenango (Demo)"), en su panel (+503 6452 4233). De usted.
//
// Lo puro vive acá (agente, número, variables, texto, respuestas) para poder
// probarlo; lo que manda y guarda es lib/seguir-por-whatsapp-webhook.ts, y
// cada agente tiene su ruta en app/api/webhooks/vapi/<panel>/route.ts.

import {
  CHALATENANGO_ASSISTANT_ID,
  CLIENTE_EJEMPLO,
  NOMBRE_AGENTE as ELENA,
  NOMBRE_TOOL_SEGUIR,
  PLANTILLA_ELENA,
} from "./chalatenango-agente";

export { telefonoClave as numeroWhatsApp } from "./llamada-contexto";

export const NOMBRE_TOOL_WHATSAPP = NOMBRE_TOOL_SEGUIR;

/** "maría josé lópez" -> "María". La plantilla saluda por el primer nombre. */
export function primerNombre(nombre: unknown): string | null {
  const p = String(nombre ?? "").trim().split(/\s+/)[0] ?? "";
  if (p.length < 2 || /^no disponible$/i.test(String(nombre).trim())) return null;
  return p.charAt(0).toLocaleUpperCase("es") + p.slice(1).toLocaleLowerCase("es");
}

/** Lo que la herramienta le contesta a la agente de voz según cómo salió el envío. */
export interface RespuestasSeguir {
  enviado: string;
  repetido: string;
  sinNumero: string;
  fallo: string;
  otroAgente: string;
}

/** Una agente de voz que puede seguir la demo por WhatsApp, y todo lo que eso necesita. */
export interface AgenteSeguirPorWhatsApp {
  /** El único agente de Vapi que puede usar la ruta. */
  assistantId: string;
  /** El panel: desde su número sale la plantilla y en su bandeja queda el hilo. */
  tenant: string;
  /** Cómo se llama, para la conversación guardada ("Elena: ...") y los logs. */
  agente: string;
  plantilla: { nombre: string; idioma: string };
  /** Las variables de la plantilla ({{1}} = primer nombre). */
  variables: (nombre: unknown) => string[];
  /** El texto tal como lo recibe la persona, para el hilo de la bandeja. */
  texto: (nombre: unknown) => string;
  respuestas: RespuestasSeguir;
}

// ── Sofía (panel comercial) ──

/** El único agente de voz que puede usar la ruta del panel comercial. */
export const ASISTENTE_CONFERENCIA = "54679e1f-c05a-4933-9ca0-1180b3df32cf";
export const TENANT_COMERCIAL = "comercial";
/** Plantilla aprobada en la WABA del número comercial. */
export const PLANTILLA_SOFIA = "sofia_continuar_demo";

/**
 * La variable {{1}} de la plantilla. Sin nombre no se puede mandar vacía:
 * "Hola de nuevo, soy Sofía" se lee bien, porque la persona acaba de hablar
 * con ella.
 */
export function variablesSofia(nombre: unknown): string[] {
  return [primerNombre(nombre) ?? "de nuevo"];
}

/** El texto tal como lo recibe la persona, para el hilo de la bandeja. */
export function textoSofia(nombre: unknown): string {
  const [n] = variablesSofia(nombre);
  return (
    `Hola ${n}, soy Sofía, la asistente virtual de MiAgentIA. Como quedamos en la llamada, sigo contigo por aquí para continuar la demo. ` +
    "¿Qué te gustaría probar? Puedo mostrarte cómo atendería a tus clientes, cómo agendo una cita o qué hago con una foto que me mandes."
  );
}

/** Lo que Sofía le dice a la persona según cómo salió el envío. */
export const RESPUESTA_SOFIA: RespuestasSeguir = {
  enviado:
    "Listo: se le envió un WhatsApp desde el número de MiAgentIA, y ahí sigues tú misma con la demo por chat, ya sabiendo lo que hablaron. Díselo en una frase y pregúntale si necesita algo más antes de despedirte.",
  repetido: "Ya se le envió el WhatsApp en esta llamada. No lo vuelvas a enviar; sigue la conversación.",
  sinNumero:
    "No tengo un número de WhatsApp válido. Pregúntale a qué número le escribimos y vuelve a usar la herramienta con ese número.",
  fallo:
    "No se pudo enviar el WhatsApp en este momento. Dile que en un momento le escribes por WhatsApp y sigue la conversación.",
  otroAgente: "Esta herramienta no está disponible en esta llamada.",
};

export const SOFIA_COMERCIAL: AgenteSeguirPorWhatsApp = {
  assistantId: ASISTENTE_CONFERENCIA,
  tenant: TENANT_COMERCIAL,
  agente: "Sofía",
  plantilla: { nombre: PLANTILLA_SOFIA, idioma: "es" },
  variables: variablesSofia,
  texto: textoSofia,
  respuestas: RESPUESTA_SOFIA,
};

// ── Elena (Caja de Crédito de Chalatenango) ──

export const TENANT_CHALATENANGO = "chalatenango";

/**
 * {{1}} de elena_continuar_demo: el primer nombre o "de nuevo". El nombre del
 * cliente del juego de roles no es el de la persona: si la agente lo pasa por
 * error, se saluda "de nuevo".
 */
export function variablesElena(nombre: unknown): string[] {
  const n = primerNombre(nombre);
  return [n && n !== primerNombre(CLIENTE_EJEMPLO) ? n : PLANTILLA_ELENA.sinNombre];
}

/** El cuerpo de la plantilla con el nombre puesto, para el hilo de la bandeja. */
export function textoElena(nombre: unknown): string {
  const [n] = variablesElena(nombre);
  return PLANTILLA_ELENA.cuerpo.replace("{{1}}", n);
}

/**
 * Lo que la herramienta le contesta a la Elena de voz. Las instrucciones son
 * para ella; lo que le dice a la persona va citado y de usted.
 */
export const RESPUESTA_ELENA: RespuestasSeguir = {
  enviado:
    'Listo: se le envió el WhatsApp desde el número de la Caja, y ahí sigues tú misma con la demo por chat, sabiendo lo que hablaron. Díselo de usted y en una frase: "Listo, le acabo de enviar un WhatsApp; ahí seguimos con la demo." Después pregúntale si desea algo más antes de despedirte.',
  repetido: "Ya se le envió el WhatsApp en esta llamada. No lo vuelvas a enviar; sigue la conversación.",
  sinNumero:
    'No tengo un número de WhatsApp válido. Pregúntale de usted: "¿A qué número le escribo?", repíteselo de dos en dos y vuelve a usar la herramienta con ese número.',
  fallo:
    'No se pudo enviar el WhatsApp en este momento. Dile de usted: "En un momento le escribimos por WhatsApp", y sigue la conversación.',
  otroAgente: "Esta herramienta no está disponible en esta llamada.",
};

export const ELENA_CHALATENANGO: AgenteSeguirPorWhatsApp = {
  assistantId: CHALATENANGO_ASSISTANT_ID,
  tenant: TENANT_CHALATENANGO,
  agente: ELENA,
  plantilla: { nombre: PLANTILLA_ELENA.nombre, idioma: PLANTILLA_ELENA.idioma },
  variables: variablesElena,
  texto: textoElena,
  respuestas: RESPUESTA_ELENA,
};
