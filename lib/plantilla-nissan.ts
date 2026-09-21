// El WhatsApp que sale al minuto de colgar con Sofía de Nissan.
//
// POR QUÉ EXISTE. El agente cierra la llamada diciendo que sigue por WhatsApp y
// no le escribía nadie: el mismo hueco que tenía CrediQ antes de
// lib/plantilla-tras-llamada.ts. La diferencia es qué se dice. A quien pidió un
// crédito se le mandan los requisitos; a quien preguntó por un carro se le
// ofrece lo que sigue (fotos, precio, prueba de manejo).
//
// POR QUÉ AL MINUTO Y NO AL COLGAR. Al colgar, la persona todavía está
// guardando el teléfono. Al minuto ya lo tiene en la mano y el mensaje llega a
// una pantalla que está mirando. Es el mismo minuto que usa CrediQ, y sale de
// la misma cola (lib/recordatorios-agenda.ts).
//
// LA DECISIÓN ES PURA para poder probarla sin red ni reloj. Cada envío es un
// WhatsApp a una persona real y se cobra, así que las razones para NO mandar
// están escritas una por una.

/**
 * Una plantilla de Meta, con su texto al lado.
 *
 * El texto va acá y no en el que la manda porque el que se guarda en el hilo
 * del panel tiene que ser PALABRA POR PALABRA el que Meta aprobó. Si se separan,
 * el chat muestra un mensaje que nadie recibió y nadie se entera hasta que
 * alguien compara los dos teléfonos.
 */
interface Plantilla {
  nombre: string;
  idioma: string;
  /** Meta rechaza el envío entero si falta una. El orden es el de los {{n}}. */
  variables: (nombre: string, que: string) => string[];
  texto: (nombre: string, que: string) => string;
}

/**
 * La de Nissan. Enviada a Meta el 21 de septiembre de 2026 (id
 * 1274453414764609) y todavía en revisión.
 *
 * Lleva el cliente adelante en el nombre como las de CrediQ: la WABA es UNA
 * sola para todos los demos, y un "seguimiento_llamada" a secas se lo queda el
 * primero que lo pida.
 */
export const PROPIA: Plantilla = {
  nombre: "nissan_seguimiento_llamada",
  idioma: "es",
  variables: (nombre, que) => [nombre, que],
  texto: (nombre, que) =>
    `Hola ${nombre}, le saluda Sofía de Nissan. Gracias por su llamada: sigo por acá ` +
    `con lo de ${que}. Con gusto le mando fotos y precios, o le agendo una prueba de ` +
    `manejo cuando guste.`,
};

/**
 * La prestada, que es la que sale HOY.
 *
 * Mientras Meta no apruebe la de arriba, el seguimiento no existe: un envío con
 * plantilla sin aprobar devuelve "Template name does not exist in the
 * translation" y no llega nada. Esta ya está aprobada y sale.
 *
 * EL TEXTO NO ES EL DE NISSAN y hay que saberlo: dice "Soy Sofia de CrediQ" y
 * pide documentos. En el demo se va a leer fuera de lugar para quien acaba de
 * preguntar por una X-Trail. Es a propósito y es temporal.
 *
 * UNA SOLA VARIABLE: el cuerpo aprobado no tiene dónde poner el modelo, así que
 * eso se pierde hasta volver a PROPIA.
 */
export const PRESTADA: Plantilla = {
  nombre: "crediq_continuar_solicitud",
  idioma: "es",
  variables: (nombre) => [nombre],
  // Sin tildes y con el salto de línea a la mitad, tal como está aprobada.
  texto: (nombre) =>
    `Hola ${nombre}! Soy Sofia de CrediQ, le hablo continuando con su solicitud.\n\n` +
    `Por aqui me puede enviar los documentos que le comente en la llamada. Empiece ` +
    `por el que tenga a la mano y yo le voy diciendo cual falta.`,
};

/**
 * La que sale. Cuando Meta apruebe la de Nissan, acá se cambia PRESTADA por
 * PROPIA y no hay que tocar nada más.
 */
export const ACTIVA: Plantilla = PRESTADA;

/** Minutos entre colgar y el mensaje. */
export const ESPERA_MIN = 1;

/**
 * Qué se pone en {{2}} cuando la llamada no capturó el modelo.
 *
 * Meta exige TODAS las variables llenas: sin esto, la llamada donde la persona
 * preguntó en general (que es la mayoría de las primeras) no podría recibir
 * nada. "su consulta" es cierto en todos los casos y no promete un carro que
 * nadie nombró.
 */
export const SIN_MODELO = "su consulta";

export interface EntradaSeguimiento {
  /** Como lo dijo la persona en la llamada, o de la ficha. */
  nombre?: string | null;
  /** Los modelos que miró, si los dijo. */
  modelos?: string[];
  /** true / false / undefined: solo el `false` expreso cierra la puerta. */
  acepta?: boolean;
  telefono: string;
}

/**
 * La forma que espera `seguimientoAgendado` en lib/memoria-webhook.ts.
 *
 * Trae `minutos` adentro y no como constante del que llama: quién decide QUÉ se
 * manda es quien sabe CUÁNDO conviene mandarlo, y separarlo era pedir que un
 * día el texto y la espera dejaran de corresponderse.
 */
export type Decision =
  | { enviar: false; motivo: string }
  | {
      enviar: true;
      minutos: number;
      plantilla: string;
      idioma: string;
      variables: string[];
      texto: string;
    };

/** El primer nombre, con la primera en mayúscula. Meta lo muestra tal cual. */
export function primerNombre(nombre?: string | null): string {
  const limpio = (nombre ?? "").trim().split(/\s+/)[0] ?? "";
  if (!limpio) return "";
  return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
}

/** Cómo se nombra lo que le interesó. Uno solo: dos ya suena a catálogo. */
export function comoSeLlama(modelos?: string[]): string {
  const primero = (modelos ?? []).map((m) => m.trim()).find((m) => m.length > 0);
  if (!primero) return SIN_MODELO;
  // "la X-Trail" suena a persona; "X-Trail" suena a inventario. El artículo lo
  // trae el texto de la plantilla, así que acá va solo el nombre.
  return primero;
}

/** El texto que de verdad le llega, con la plantilla que esté activa. */
export function textoDe(nombre: string, que: string): string {
  return ACTIVA.texto(nombre, que);
}

/**
 * ¿Se le escribe?
 *
 * Solo el "no" expreso cierra la puerta: quien no contestó, cayó al buzón o
 * colgó antes de que se le preguntara es justamente a quien hay que escribirle,
 * porque el WhatsApp es el único camino que queda.
 */
export function decidirSeguimiento(e: EntradaSeguimiento): Decision {
  if (!/^\d{8,15}$/.test(e.telefono)) return { enviar: false, motivo: "sin número usable" };
  if (e.acepta === false) return { enviar: false, motivo: "dijo que no le escribiéramos" };

  const nombre = primerNombre(e.nombre);
  // Meta rechaza el envío con una variable vacía, así que sin nombre no sale.
  // Y un "Hola ," es peor que no escribir.
  if (!nombre) return { enviar: false, motivo: "no sabemos su nombre y la plantilla lo exige" };

  const que = comoSeLlama(e.modelos);
  return {
    enviar: true,
    minutos: ESPERA_MIN,
    plantilla: ACTIVA.nombre,
    idioma: ACTIVA.idioma,
    variables: ACTIVA.variables(nombre, que),
    texto: ACTIVA.texto(nombre, que),
  };
}
