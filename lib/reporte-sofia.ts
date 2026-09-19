// El reporte de desempeño de Sofía en Yali: qué reservas le pertenecen y por qué.
//
// POR QUÉ ES UNA FOTO Y NO UN CÁLCULO EN VIVO. Las cifras salen de cruzar tres
// fuentes que la app no tiene a mano: Cloudbeds de las tres sedes (por API, con
// las llaves del hotel), la tabla de apartados y los mensajes. Y el veredicto de
// cada chat es lectura humana, no una regla: en uno de los seis el error fue de
// sede y solo se ve leyendo. Así que esto es un corte con fecha, y la fecha se
// muestra siempre para que nadie lo lea como "hoy".
//
// CÓMO SE IDENTIFICA A SOFÍA. Por `staff_id = 'ia'` en los mensajes, que es como
// el dato la marca. NO por "mensaje saliente sin operador": esa regla mete los
// mensajes que el hotel manda desde su propio WhatsApp (marcados "Equipo") y
// multiplica el resultado por cuatro. Ya pasó.

export const CORTE = "2026-09-18";

/** Universo: reservas vivas creadas desde que hay mensajes guardados. */
export const UNIVERSO = { desde: "2026-08-11", reservas: 471, monto: 44489 };

/** Cuándo entró Sofía a cada canal. Sin esto, cualquier comparación miente. */
export const ARRANQUE: { canal: string; fecha: string; dias: number }[] = [
  { canal: "Instagram", fecha: "2026-08-27", dias: 22 },
  { canal: "Facebook", fecha: "2026-09-01", dias: 17 },
  { canal: "WhatsApp", fecha: "2026-09-15", dias: 3 },
];

export interface FilaCanal {
  canal: string;
  /** Sofía apartó y el sistema escribió la reserva en Cloudbeds. */
  escribio: { n: number; monto: number };
  /** El hotel tecleó la reserva a mano, con o sin apartado previo. */
  tecleo: { n: number; monto: number };
}

export const POR_CANAL: FilaCanal[] = [
  { canal: "Instagram", escribio: { n: 10, monto: 1005 }, tecleo: { n: 7, monto: 830 } },
  { canal: "WhatsApp", escribio: { n: 8, monto: 710 }, tecleo: { n: 6, monto: 515 } },
  { canal: "Facebook", escribio: { n: 1, monto: 150 }, tecleo: { n: 1, monto: 75 } },
];

export const TOTAL = { reservas: 33, monto: 3285 };

/** Lo que hizo Sofía, en contadores sueltos. NO es un embudo: de las 73 */
/** conversaciones que terminaron en apartado, solo 49 recibieron los datos */
/** bancarios, así que los pasos no se contienen y dibujarlos encadenados */
/** sería dibujar una mentira. */
export const ACTIVIDAD = [
  { etiqueta: "Conversaciones atendidas", valor: "1,141", pie: "los tres canales" },
  { etiqueta: "Veces que pidió el pago", valor: "28", pie: "mandó los datos bancarios" },
  { etiqueta: "Habitaciones que apartó", valor: "80", pie: "18 confirmadas en Instagram" },
  { etiqueta: "Mediana de respuesta", valor: "36 s", pie: "contestó 3,838 de 3,838" },
];

export type Veredicto = "suya" | "parcial" | "no";

export interface Turno {
  quien: "Huésped" | "Sofía" | "Equipo" | "Vero";
  hora: string;
  texto: string;
}

export interface CasoChat {
  id: string;
  huesped: string;
  monto: number;
  sede: string;
  canal: string;
  fecha: string;
  veredicto: Veredicto;
  /** Una línea: qué pasó. */
  resumen: string;
  /** De quién fue el error, dicho sin rodeos. Null si no hubo. */
  culpa: string | null;
  turnos: Turno[];
  /** Por qué ese veredicto, con el dato que lo sostiene. */
  porque: string[];
}

export const CASOS: CasoChat[] = [
  {
    id: "jhoselyn",
    huesped: "Jhoselyn Carolina Mejía",
    monto: 75,
    sede: "Yalí",
    canal: "WhatsApp",
    fecha: "2026-09-17",
    veredicto: "suya",
    resumen:
      "Sofía hizo la venta completa. El apartado venció porque la clienta cambió de fecha al día siguiente.",
    culpa: null,
    turnos: [
      { quien: "Huésped", hora: "19:01", texto: "Buenas noches" },
      { quien: "Sofía", hora: "19:05", texto: "Excelente, tenemos dos opciones disponibles del sábado 19 al domingo 20…" },
      { quien: "Huésped", hora: "19:23", texto: "El de planta baja" },
      { quien: "Sofía", hora: "19:40", texto: "Listo, Jhoselyn. Su habitación queda apartada por una hora. Total: $100." },
      { quien: "Huésped", hora: "19:50", texto: "¿Será el depósito parcial o total?" },
      { quien: "Equipo", hora: "08:57", texto: "Buenos días. Es depósito total. Serían $100 por planta baja" },
      { quien: "Huésped", hora: "08:58", texto: "Fíjese que tengo cambio de fecha para el domingo 20 saliendo lunes 21" },
      { quien: "Equipo", hora: "08:59", texto: "Se la puedo brindar en precio promocional por $75 al reservar ahora" },
    ],
    porque: [
      "Sofía identificó el hotel, cotizó dos opciones, explicó qué incluían, tomó nombre y correo, apartó la habitación y abrió el ticket de pago. Todo el trabajo de venta es suyo.",
      "El apartado no se cayó: venció. Era para el 19 al 20 y la clienta pidió el 20 al 21, así que ya no servía.",
      "Las 13 horas entre la pregunta de la clienta y la respuesta son del lado humano, no de Sofía.",
      "El cambio de fecha costó $25: el apartado era de $100 y se cerró en $75.",
    ],
  },
  {
    id: "silvia",
    huesped: "Silvia Noemi Granillo",
    monto: 85,
    sede: "Yalí",
    canal: "WhatsApp",
    fecha: "2026-09-18",
    veredicto: "parcial",
    resumen:
      "Sofía cotizó el hotel equivocado. Las tarifas eran correctas, pero de Playa Linda, y la clienta pidió Yalí.",
    culpa:
      "De Sofía, y es error de SEDE, no de precio. Vero heredó el mismo error y mandó la cuenta bancaria de Playa Linda.",
    turnos: [
      { quien: "Huésped", hora: "14:21", texto: "Sería primera vez que visitaría yali" },
      { quien: "Sofía", hora: "14:28", texto: "La Familiar es $55 la noche. Total para la estadía: $55." },
      { quien: "Huésped", hora: "14:39", texto: "Pregunta, quizás muchas camas, solo vamos 4 personas" },
      { quien: "Sofía", hora: "14:40", texto: "Tiene razón. La Doble es perfecta para ustedes, $45 la noche." },
      { quien: "Sofía", hora: "14:42", texto: "Con gusto le confirmo ese detalle en un momento: una persona del equipo le escribe por aquí." },
      { quien: "Vero", hora: "16:13", texto: "Por acá le comparto la cuenta de Playa Linda: Banco de América Central…" },
      { quien: "Huésped", hora: "16:21", texto: "Pero es en yali hotel??? que allí dice playa linda" },
      { quien: "Vero", hora: "16:55", texto: "$90 planta alta frente al mar · $85 planta alta con vista al mar" },
      { quien: "Huésped", hora: "16:59", texto: "La de 85 planta alta vista al mar" },
    ],
    porque: [
      "Cloudbeds para esas fechas y 4 personas: Playa Linda cobra Doble $45 y Familiar $55. Yalí cobra Planta Baja $75 y Planta Alta $80. Sofía dio los precios de Playa Linda exactos.",
      "\"Doble\" y \"Familiar\" ni siquiera son habitaciones de Yalí. Las de Yalí son Bungalow, Planta Baja y Planta Alta.",
      "Bajar de $55 a $45 fue correcto: la clienta dijo que eran solo 4 y la Doble alcanza. El error no fue ese, fue el hotel.",
      "En este chat Sofía NUNCA preguntó a qué hotel escribía, cosa que sí hace en los demás. La conversación quedó anclada a Playa Linda y no la cambió aunque la clienta dijo dos veces que quería Yalí.",
      "El apartado quedó mezclado: sede Playa Linda con una habitación de Yalí. Por eso lo rechazaron con el motivo \"Se ingresó de manera manual\".",
      "Si nadie lo cacha, la clienta paga $45 por una habitación de Yalí que vale $80. Lo atrapó Vero, pero de rebote: porque la clienta le reclamó la cuenta bancaria.",
    ],
  },
  {
    id: "francisco",
    huesped: "Francisco Oscal",
    monto: 60,
    sede: "Yalí",
    canal: "WhatsApp",
    fecha: "2026-09-16",
    veredicto: "parcial",
    resumen: "Sofía tenía los cuatro datos para cotizar y se rindió justo antes de hacerlo.",
    culpa: "De Sofía. Nada de lo que faltaba estaba fuera de su alcance.",
    turnos: [
      { quien: "Huésped", hora: "11:35", texto: "Una consulta, ustedes tienen disponibilidad para hospedaje" },
      { quien: "Huésped", hora: "11:36", texto: "Sería para el día de hoy" },
      { quien: "Huésped", hora: "11:37", texto: "Serían 2 habitaciones para 1 persona cada habitación" },
      { quien: "Huésped", hora: "11:38", texto: "Sería solo una noche" },
      { quien: "Sofía", hora: "11:39", texto: "Con gusto le confirmo ese detalle en un momento: una persona del equipo le escribe por aquí." },
      { quien: "Equipo", hora: "12:26", texto: "En Hotel Yalí puedo brindarle 2 habitaciones planta baja por $65 cada una" },
    ],
    porque: [
      "Tenía hotel, fechas, cantidad de personas y noches. Es todo lo que necesita para cotizar.",
      "No abrió ticket. Dijo \"una persona del equipo le escribe\" sin avisarle a nadie: el caso quedó vivo solo porque alguien andaba mirando el chat.",
      "El Equipo respondió 47 minutos después. La reserva entró en Cloudbeds como \"On Site\": el señor se fue al hotel.",
    ],
  },
  {
    id: "amadeo",
    huesped: "Amadeo Domínguez",
    monto: 175,
    sede: "Costa del Surf",
    canal: "WhatsApp",
    fecha: "2026-09-15",
    veredicto: "no",
    resumen: "Sofía solo alcanzó a saludar. La reserva la hizo otro.",
    culpa: null,
    turnos: [
      { quien: "Huésped", hora: "08:24", texto: "Buenos días" },
      { quien: "Sofía", hora: "12:07", texto: "Gracias por contactar a Yali Hospitality Group. Le saluda Sofía…" },
    ],
    porque: [
      "Un solo mensaje de Sofía, y es el saludo de bienvenida.",
      "Las tres horas y media no son lentitud: el 15 de septiembre a las 12:05 fue el primer mensaje de Sofía en WhatsApp. La encendieron ahí y despachó la cola de una vez.",
      "No debería contar para ella. La regla automática de \"habló menos de 24 h antes\" la atrapó por un buenos días.",
    ],
  },
  {
    id: "eliezer",
    huesped: "Eliezer Castillo López",
    monto: 65,
    sede: "Playa Linda",
    canal: "WhatsApp",
    fecha: "2026-09-17",
    veredicto: "no",
    resumen: "No era una venta. El huésped ya había reservado y pagado, y preguntaba por su comprobante.",
    culpa: null,
    turnos: [
      { quien: "Huésped", hora: "19:19", texto: "Quisiera saber si me va a enviar un ticket como comprobante de que ya cancelé mi reserva" },
      { quien: "Sofía", hora: "19:22", texto: "Cuando usted nos manda la captura del depósito, una persona del equipo verifica que el pago llegó…" },
      { quien: "Huésped", hora: "19:23", texto: "Para el día que yo haga el check in" },
      { quien: "Sofía", hora: "19:23", texto: "Con gusto le confirmo ese detalle en un momento: una persona del equipo le escribe por aquí." },
      { quien: "Vero", hora: "10:24", texto: "Buenos días. Me regala los datos de su reserva y el comprobante de pago para procesarlo" },
    ],
    porque: [
      "La reserva ya existía antes del chat. Sofía dio soporte, no vendió.",
      "Explicó bien el proceso y se rindió en una pregunta de seguimiento.",
      "Vero lo resolvió 15 horas después. La estadía es del 6 de noviembre.",
    ],
  },
  {
    id: "reynaldo",
    huesped: "Reynaldo Renderos",
    monto: 55,
    sede: "Playa Linda",
    canal: "WhatsApp",
    fecha: "2026-09-17",
    veredicto: "no",
    resumen: "La venta la hizo el Equipo. Sofía entró de apoyo y no reconoció el comprobante de pago.",
    culpa: "De Sofía, pero de otra cosa: leyó un comprobante bancario y lo describió como foto de habitación.",
    turnos: [
      { quien: "Equipo", hora: "13:32", texto: "Con gusto, para este sábado cuento con sencilla por $55" },
      { quien: "Equipo", hora: "08:52", texto: "Por acá le comparto la cuenta de Playa Linda: Banco de América Central…" },
      { quien: "Sofía", hora: "10:43", texto: "Acá está nuestra ubicación: KM 44 1/2 Carretera Litoral, La Libertad…" },
      { quien: "Huésped", hora: "06:10", texto: "[imagen del comprobante]" },
      { quien: "Sofía", hora: "06:11", texto: "Veo una foto de una habitación con cama doble, aire acondicionado y vista al exterior. ¿Es una habitación que le interesa?" },
      { quien: "Huésped", hora: "06:11", texto: "Comprobante de pago por habitación a nombre de Reynaldo Renderos" },
      { quien: "Vero", hora: "10:44", texto: "Buenos días. Ahorita proceso su pago" },
    ],
    porque: [
      "El Equipo cotizó, pidió los datos, mandó cuatro fotos y la cuenta bancaria. Sofía apareció después a dar la ubicación.",
      "Cuando llegó el comprobante no lo reconoció: lo describió como una foto de habitación. Ese es un defecto a arreglar, no un detalle.",
      "No cuenta como reserva suya.",
    ],
  },
];

/** Lo que sale de leer los seis, no de contarlos. */
export const HALLAZGOS = [
  {
    titulo: "La frase de rendición aparece en 4 de 6",
    detalle:
      "\"Con gusto le confirmo ese detalle en un momento: una persona del equipo le escribe por aquí.\" En tres de esas cuatro no abrió ticket, así que entregó el chat a nadie.",
  },
  {
    titulo: "Confunde de sede y arrastra el error hasta el apartado",
    detalle:
      "En el caso de Silvia cotizó Playa Linda para una clienta que pidió Yalí, con una diferencia de $35 por noche. El apartado quedó grabado con sede de un hotel y habitación del otro.",
  },
  {
    titulo: "No distingue un comprobante de pago de una foto cualquiera",
    detalle:
      "Con Reynaldo describió el comprobante bancario como \"una foto de una habitación con cama doble\".",
  },
  {
    titulo: "El cuello de botella está después de Sofía",
    detalle:
      "Ella contesta en 36 segundos de mediana y no deja ninguno sin responder. Los tiempos largos son humanos: 13 horas con Jhoselyn, 15 con Eliezer.",
  },
];
