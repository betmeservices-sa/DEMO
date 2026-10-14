// Alta de un número de WhatsApp en vivo: la lógica que no habla con nadie.
//
// La demo que vende esto es el tiempo: pones un número, Meta llama para dictar
// el código de verificación, el agente de voz contesta esa llamada, oye el
// código y lo devuelve, y el número queda registrado y contestando WhatsApp.
// Todo sin que una persona toque un teléfono.
//
// Acá vive solo lo puro y testeable: qué pasos tiene el alta, de qué línea se
// puede hacer, y cómo se saca un código de seis dígitos de lo que transcribió
// el agente. Las llamadas a Meta están en alta-numero-meta.ts y el estado de
// cada corrida en alta-numero-store.ts.

/**
 * Las líneas con las que se puede correr la demo.
 *
 * Son números de la serie de Tigo (25054600 a 25054699) que YA están dados de
 * alta en Vapi con el agente verificador colgado. Es a propósito y es la regla
 * que pidió el usuario: la llamada de Meta tiene que entrar a una línea que ya
 * sabemos que timbra, nunca a un número virgen sin probar. El orquestador lo
 * vuelve a comprobar contra Vapi antes de pedirle el código a Meta.
 *
 * Meta manda el código AL número que se está registrando (no hay parámetro para
 * desviarlo), así que la línea que recibe la llamada y el número que se registra
 * son forzosamente el mismo. De ahí que esto sea una lista y no un campo libre.
 */
export const LINEAS_DEMO: readonly string[] = [
  "+50325054610",
  "+50325054611",
  "+50325054612",
  "+50325054613",
  "+50325054614",
  "+50325054615",
  "+50325054616",
  "+50325054617",
  "+50325054618",
  "+50325054619",
];

/** Los pasos del alta, en orden. La pantalla pinta esta lista. */
export const PASOS = [
  "linea",
  "alta",
  "codigo-pedido",
  "esperando-codigo",
  "codigo-recibido",
  "verificado",
  "registrado",
  "conectado",
] as const;

export type Paso = (typeof PASOS)[number];

export type EstadoCorrida = "corriendo" | "listo" | "error";

export interface Corrida {
  id: string;
  /** La línea que se está registrando, en E.164. */
  numero: string;
  /** El id que Meta le dio al número. Aparece después del paso "alta". */
  phoneNumberId: string | null;
  paso: Paso;
  estado: EstadoCorrida;
  /** Los seis dígitos, cuando el agente ya los oyó. */
  codigo: string | null;
  /** Lo que el agente transcribió, para mostrar que de verdad lo escuchó. */
  oido: string | null;
  error: string | null;
  iniciadoEn: string;
  /** Cuándo entró cada paso, para el cronómetro de la pantalla. */
  marcas: Partial<Record<Paso, string>>;
  terminadoEn: string | null;
}

/** Lo que se le dice a la gente en cada paso. En presente, porque está pasando. */
export const TEXTO_PASO: Record<Paso, string> = {
  linea: "Revisando que la línea esté lista",
  alta: "Dando de alta el número en Meta",
  "codigo-pedido": "Pidiéndole a Meta el código por llamada",
  "esperando-codigo": "Meta está llamando. El agente contesta y escucha el código",
  "codigo-recibido": "El agente oyó el código y lo devolvió",
  verificado: "Código verificado con Meta",
  registrado: "Número registrado en la Cloud API",
  conectado: "Conectado al panel, con la IA encendida",
};

export function indiceDePaso(paso: Paso): number {
  return PASOS.indexOf(paso);
}

/** Un número de la serie, normalizado a E.164, o null si no es de la serie. */
export function normalizarLinea(entrada: string): string | null {
  const digitos = (entrada ?? "").replace(/\D/g, "");
  if (!digitos) return null;
  const sinPais = digitos.startsWith("503") ? digitos.slice(3) : digitos;
  if (!/^250546\d{2}$/.test(sinPais)) return null;
  return `+503${sinPais}`;
}

/** "+50325054610" -> "+503 2505 4610", como lo lee la gente. */
export function lineaLegible(e164: string): string {
  const d = (e164 ?? "").replace(/\D/g, "");
  if (d.length !== 11) return e164;
  return `+${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
}

/** Para el wa.me del botón final: solo dígitos. */
export function waMe(e164: string): string {
  return `https://wa.me/${(e164 ?? "").replace(/\D/g, "")}`;
}

/**
 * El código de seis dígitos que dictó la grabación de Meta.
 *
 * La grabación lo dice dos veces y Deepgram lo escribe con espacios y puntos en
 * medio ("Tu código de verificación es 4 0 6 3 1 7. Su código de verificación es
 * 4. 0 6 3 1 7."), así que no sirve buscar \d{6}: hay que juntar los dígitos en
 * orden. Cuando vienen las dos repeticiones y coinciden, es la lectura de más
 * confianza; si no coinciden, gana la primera, que es la que se oyó sin que la
 * línea estuviera ya cortándose.
 */
export function codigoDeTranscript(texto: string | null | undefined): string | null {
  if (!texto) return null;
  // Solo lo que dijo quien llamó: si el agente llegara a hablar, sus números no cuentan.
  const lineas = texto
    .split(/\r?\n/)
    .filter((l) => !/^\s*(AI|Assistant|Bot)\s*:/i.test(l))
    .join(" ");
  const digitos = lineas.replace(/\D/g, "");
  if (digitos.length < 6) return null;
  const primero = digitos.slice(0, 6);
  if (digitos.length >= 12) {
    const segundo = digitos.slice(6, 12);
    if (primero === segundo) return primero;
  }
  return primero;
}

/** Seis dígitos y nada más. Lo que manda el agente por la herramienta pasa por acá. */
export function codigoValido(codigo: string | null | undefined): boolean {
  return typeof codigo === "string" && /^\d{6}$/.test(codigo);
}

/**
 * Qué líneas se le pueden ofrecer: las que están listas en Vapi y todavía no
 * están dadas de alta en WhatsApp. Un número ya registrado no se puede volver a
 * registrar, así que sale de la lista.
 */
export function lineasDisponibles(
  listasEnVapi: readonly string[],
  yaEnWhatsApp: readonly string[],
): string[] {
  const vapi = new Set(listasEnVapi.map((n) => n.replace(/\D/g, "")));
  const usadas = new Set(yaEnWhatsApp.map((n) => n.replace(/\D/g, "")));
  return LINEAS_DEMO.filter((n) => {
    const d = n.replace(/\D/g, "");
    return vapi.has(d) && !usadas.has(d);
  });
}

/**
 * Cuánto se espera la llamada de Meta antes de decir que algo pasó.
 *
 * Meta contesta `success: true` al pedido y después llama por su cuenta, pero no
 * siempre llama: el 2026-10-14 acepto el pedido del 2505 4610 y la llamada nunca
 * entró (la línea estaba bien; se comprobó marcándole y timbró). Sin este tope la
 * pantalla se queda girando para siempre y no hay forma de saber si sigue
 * esperando o si se murió.
 */
export const ESPERA_MAX_SEG = 120;

/** Lleva demasiado esperando la llamada: hay que ofrecer pedir el código otra vez. */
export function esperaVencida(c: Corrida, ahora = Date.now()): boolean {
  if (c.estado !== "corriendo" || c.paso !== "esperando-codigo") return false;
  const desde = c.marcas["esperando-codigo"] ?? c.iniciadoEn;
  return (ahora - Date.parse(desde)) / 1000 > ESPERA_MAX_SEG;
}

/** Cuánto duró (o lleva) la corrida, en segundos. */
export function segundos(c: Pick<Corrida, "iniciadoEn" | "terminadoEn">, ahora = Date.now()): number {
  const fin = c.terminadoEn ? Date.parse(c.terminadoEn) : ahora;
  return Math.max(0, Math.round((fin - Date.parse(c.iniciadoEn)) / 1000));
}

export function corridaNueva(id: string, numero: string, ahora = new Date()): Corrida {
  const iso = ahora.toISOString();
  return {
    id,
    numero,
    phoneNumberId: null,
    paso: "linea",
    estado: "corriendo",
    codigo: null,
    oido: null,
    error: null,
    iniciadoEn: iso,
    marcas: { linea: iso },
    terminadoEn: null,
  };
}

/** Avanza la corrida a un paso. No retrocede: los avisos de Vapi pueden llegar fuera de orden. */
export function avanzar(c: Corrida, paso: Paso, ahora = new Date()): Corrida {
  if (indiceDePaso(paso) < indiceDePaso(c.paso)) return c;
  const ultimo = paso === PASOS[PASOS.length - 1];
  return {
    ...c,
    paso,
    estado: ultimo ? "listo" : c.estado,
    marcas: { ...c.marcas, [paso]: ahora.toISOString() },
    terminadoEn: ultimo ? ahora.toISOString() : c.terminadoEn,
  };
}

export function conError(c: Corrida, error: string, ahora = new Date()): Corrida {
  return { ...c, estado: "error", error, terminadoEn: ahora.toISOString() };
}
