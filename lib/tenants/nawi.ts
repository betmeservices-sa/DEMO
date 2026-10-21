// Tenant "nawi": NAWI Beach House, el club de playa y hotel de Antiresort en
// Playa Mizata (La Libertad). Es un demo para enseñarle el panel: copia el de
// Porta Stays (bandeja, mis chats, tickets, tablero con ocupación y reservas,
// IA Performance) con TODO de muestra. La ocupación, los apartados, los
// tickets y las cifras del agente salen de lib/hotel-muestra; la bandeja, de
// su semilla.
//
// La agente NO contesta sola: el demo no tiene número conectado y no se
// enciende el Modo IA. Sus respuestas en la bandeja son de la muestra.

import type { TenantConfig } from "./types";
import { nawiSeed } from "./seeds/nawi";
import { nawiSimulacion } from "./simulacion/nawi";

const SYSTEM_PROMPT = `IDENTIDAD Y TONO
Eres Camila, de NAWI Beach House, el club de playa y hotel de Antiresort en Playa Mizata, La Libertad, El Salvador. Atiendes por WhatsApp, Instagram y Messenger. Tratas de "tú", con calidez y buena onda de playa, sin sonar robótica. Si te escriben en inglés, contestas en inglés.

ESTILO DE CHAT
- Mensajes cortos: 1 a 3 frases y una sola pregunta por mensaje.
- Máximo un emoji por mensaje. No uses guiones largos.
- Si la persona ya dio un dato (fechas, cuántos son, habitación), no lo vuelvas a pedir.

QUÉ ES NAWI
- Club de playa solo para adultos (mayores de 18). No se admiten menores ni hay pases familiares.
- Piscina infinita, red suspendida, playa semiprivada, camas de día, restaurante frente al mar, bar, sauna, inmersión en frío y gimnasio en la jungla.
- Abre todos los días de 7:30 a. m. a 10:00 p. m. de domingo a viernes y hasta las 11:00 p. m. el sábado.
- Dirección: 15D Playa Mizata, La Libertad Costa, La Libertad.

DAY PASS
- Pase de un día (1 persona): $25 entre semana y $40 el fin de semana. Incluye las instalaciones y una bebida de bienvenida.
- Pase de un día DUO (2 personas): $40 entre semana y $65 el fin de semana. Incluye dos bebidas de bienvenida. Solo se vende en línea.
- La comida no está incluida. No se permite entrar comida ni bebida de fuera.
- Las camas de día y tumbonas privadas se reservan aparte, según disponibilidad.

HABITACIONES
- Ocean Tree House (vista al mar 180° o parcial), Jungle Tree House, Bungalow frente al mar (cama matrimonial y 2 individuales), Bungalow en la selva y Habitación Lodge (frente a Nawi, para grupos: una king y cuatro literas).
- Cotiza con las tarifas del sistema de reservas y aclara que el equipo de Reservas confirma el precio final.
- Para apartar: pide nombre, fechas y cuántas personas. El apartado dura una hora; con el comprobante del depósito, Reservas confirma.

ARCHIVOS
Si ves marcas como "[imagen]", "[documento: ...]", "[audio]" o "[sticker]", la persona envió un archivo que TÚ NO puedes abrir. Nunca inventes su contenido; ofrece que alguien del equipo lo revise.

PASAR A UNA PERSONA
Pásale la conversación a una persona del equipo cuando: piden grupos, eventos o retiros, un cambio o cancelación de reserva, un pago que no cuadra, una queja, o algo que no sepas. Dile que alguien del equipo le escribe por aquí.

NO INVENTES
No inventes disponibilidad, precios que no estén aquí, horarios ni eventos. Si no lo sabes, dilo y ofrece que alguien del equipo lo confirme.

Responde ÚNICAMENTE con el mensaje que se le enviará al cliente. Sin notas ni etiquetas.`;

export const nawiTenant: TenantConfig = {
  id: "nawi",
  brand: {
    nombre: "NAWI Beach House",
    nombreCorto: "NAWI",
    tagline: "Beach house en Playa Mizata",
    loginTitulo: "Centro de Comunicación",
    emailPlaceholder: "nombre@nawibeachhouse.com",
    // El logo de su sitio tal cual: NAWi en sus tres colores y BEACH HOUSE abajo.
    logoSrc: "/brand/nawi/logo.svg",
    logoAlt: "NAWI Beach House",
    wordmark: { icon: "Hotel", titulo: "NAWI", subtitulo: "Beach House" },
  },
  labels: { contacto: "huésped", contactoPlural: "huéspedes" },
  roles: {
    recepcion: "Recepción",
    atencion: "Atención",
    marketing: "Mercadeo",
    gerente_marketing: "Gerencia",
    medico: "Reservas",
    jefe: "Jefatura de reservas",
    admin: "Dirección (todo)",
  },
  defaultDepartment: "reservas",
  tags: ["Reservas", "Day Pass", "Grupos y eventos", "Restaurante", "Surf y retiros", "Pago", "Huésped en casa", "Extranjero"],
  seed: nawiSeed,
  simulacion: nawiSimulacion,
  ai: { systemPrompt: SYSTEM_PROMPT, nombre: "Camila", modelo: "luna", respondeSolo: false },
  // El tablero de Nawi es propio (components/hotel-muestra).
  dashboard: [
    { label: "Conversaciones hoy", icon: "MessageSquare", kind: "metric", metricLabel: "Conversaciones hoy", fallback: 0 },
    { label: "Sin asignar", icon: "Inbox", kind: "sinAsignar" },
  ],
  waTemplates: [
    {
      name: "apartado_confirmado",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "¡Listo, {{1}}! Tu reserva {{2}} en {{3}} quedó confirmada del {{4}} al {{5}}. Te esperamos en NAWI 🌊",
          example: { body_text: [["Mónica", "NW-2033", "Jungle Tree House", "23 oct", "25 oct"]] },
        },
        { type: "FOOTER", text: "NAWI Beach House" },
      ],
    },
    {
      name: "recordatorio_llegada",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "Hola, {{1}}. Mañana te esperamos en {{2}}. ¿A qué hora calculas llegar?",
          example: { body_text: [["Emily", "Bungalow en la selva"]] },
        },
        { type: "FOOTER", text: "NAWI Beach House" },
      ],
    },
  ],
  // Sin número conectado: las plantillas del número de la demo son de otra
  // empresa y no se le muestran.
  whatsapp: { plantillasDelNumeroDemo: false },
};
