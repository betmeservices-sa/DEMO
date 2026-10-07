// "Seguimos por WhatsApp": la herramienta que usa Sofía en la llamada demo de
// la conferencia (Vapi "Sofia - MiAgentIA (Conferencia)"). Cuando la persona
// dice que prefiere seguir por WhatsApp, le sale la plantilla con la que Mia
// abre el chat desde el número comercial (+503 7560 5872) y sigue la demo.
//
// Lo puro vive acá (número, variables, texto) para poder probarlo; la ruta es
// app/api/webhooks/vapi/comercial/route.ts.

/** El único agente de voz que puede usar esta herramienta. */
export const ASISTENTE_CONFERENCIA = "54679e1f-c05a-4933-9ca0-1180b3df32cf";
export const TENANT_COMERCIAL = "comercial";
export const NOMBRE_TOOL_WHATSAPP = "seguir_por_whatsapp";
/** Plantilla aprobada en la WABA del número comercial. */
export const PLANTILLA_MIA = "mia_continuar_demo";

/** El número para WhatsApp: solo dígitos y con código de país (503 si vino local). */
export function numeroWhatsApp(raw: unknown): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (d.length === 8) return `503${d}`;
  return d.length >= 10 && d.length <= 15 ? d : null;
}

/** "maría josé lópez" -> "María". La plantilla saluda por el primer nombre. */
export function primerNombre(nombre: unknown): string | null {
  const p = String(nombre ?? "").trim().split(/\s+/)[0] ?? "";
  if (p.length < 2 || /^no disponible$/i.test(String(nombre).trim())) return null;
  return p.charAt(0).toLocaleUpperCase("es") + p.slice(1).toLocaleLowerCase("es");
}

/**
 * La variable {{1}} de la plantilla. Sin nombre no se puede mandar vacía:
 * "Hola de nuevo, soy Mia" se lee bien, porque la persona acaba de hablar con
 * nosotros.
 */
export function variablesMia(nombre: unknown): string[] {
  return [primerNombre(nombre) ?? "de nuevo"];
}

/** El texto tal como lo recibe la persona, para el hilo de la bandeja. */
export function textoMia(nombre: unknown): string {
  const [n] = variablesMia(nombre);
  return (
    `Hola ${n}, soy Mia, el agente de IA de MiAgentIA. Estoy aquí para continuar con la demo por WhatsApp. ` +
    "¿Qué te gustaría probar? Puedo mostrarte cómo atendería a tus clientes, cómo agendo una cita o qué hago con una foto que me mandes."
  );
}

/** Lo que Sofía le dice a la persona según cómo salió el envío. */
export const RESPUESTA_SOFIA = {
  enviado:
    "Listo: se le envió un WhatsApp desde el número de MiAgentIA. Ahí le escribe Mia, nuestro agente de WhatsApp, para seguir con la demo. Díselo en una frase y pregúntale si necesita algo más antes de despedirte.",
  repetido: "Ya se le envió el WhatsApp en esta llamada. No lo vuelvas a enviar; sigue la conversación.",
  sinNumero:
    "No tengo un número de WhatsApp válido. Pregúntale a qué número le escribimos y vuelve a usar la herramienta con ese número.",
  fallo:
    "No se pudo enviar el WhatsApp en este momento. Dile que en un momento le escribimos por WhatsApp y sigue la conversación.",
  otroAgente: "Esta herramienta no está disponible en esta llamada.",
};
