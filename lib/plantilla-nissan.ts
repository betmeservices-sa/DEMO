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
 * Nombre de la plantilla aprobada en Meta (WABA de la demo, id 1274453414764609).
 *
 * Lleva el cliente adelante como las de CrediQ: la WABA es UNA sola para todos
 * los demos, y un "seguimiento_llamada" a secas se lo queda el primero que lo
 * pida.
 */
export const SEGUIMIENTO = "nissan_seguimiento_llamada";
export const IDIOMA = "es";

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
      variables: [string, string];
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

/**
 * El texto que de verdad le llega.
 *
 * Es el cuerpo aprobado con las variables ya puestas, PALABRA POR PALABRA: se
 * guarda en el hilo del panel, y si acá dijera otra cosa, el chat mostraría un
 * mensaje que nadie recibió. Si se edita la plantilla en Meta, se edita acá.
 */
export function textoDe(nombre: string, que: string): string {
  return (
    `Hola ${nombre}, le saluda Sofía de Nissan. Gracias por su llamada: sigo por acá ` +
    `con lo de ${que}. Con gusto le mando fotos y precios, o le agendo una prueba de ` +
    `manejo cuando guste.`
  );
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
    plantilla: SEGUIMIENTO,
    idioma: IDIOMA,
    variables: [nombre, que],
    texto: textoDe(nombre, que),
  };
}
