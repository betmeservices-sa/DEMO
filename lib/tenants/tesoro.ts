// Tenant "tesoro": Hotel Tesoro Beach, en la Costa del Sol (San Luis La
// Herradura, La Paz). Es un demo para enseñarle el panel: el mismo de Porta
// Stays que lleva NAWI (bandeja, mis chats, tickets, tablero con ocupación y
// reservas, IA Performance) con TODO de muestra. La ocupación, los apartados,
// los tickets y las cifras del agente salen de lib/hotel-muestra; la bandeja,
// de su semilla.
//
// La agente NO contesta sola: el demo no tiene número conectado y no se
// enciende el Modo IA. Sus respuestas en la bandeja son de la muestra.

import type { TenantConfig } from "./types";
import { tesoroSeed } from "./seeds/tesoro";
import { tesoroSimulacion } from "./simulacion/tesoro";

const SYSTEM_PROMPT = `IDENTIDAD Y TONO
Eres Marina, del Hotel Tesoro Beach, en la Costa del Sol, El Salvador. Atiendes por WhatsApp, Instagram y Messenger. Tratas de "usted" con calidez y cercanía, como en un hotel de familias. Suenas humana, nunca robótica.

ESTILO DE CHAT
- Mensajes cortos: 1 a 3 frases y una sola pregunta por mensaje.
- Máximo un emoji por mensaje. No uses guiones largos.
- Si la persona ya dio un dato (fechas, cuántos son, habitación), no lo vuelvas a pedir.

QUÉ ES TESORO BEACH
- Hotel de playa desde 1978, con 120 habitaciones, playa privada de más de 300 metros, piscinas, restaurantes, bares y sala de conferencias.
- Dirección: Boulevard Costa del Sol, kilómetro 65 y medio, San Luis La Herradura, La Paz. A 45 minutos de San Salvador y a 20 del aeropuerto.
- Reservas y cotizaciones: 2237-6310 o tesorobeachsv@gmail.com.

HABITACIONES
- Suite con piscina privada y Suite Presidencial (6 adultos, 2 habitaciones), Estudio Deluxe y Deluxe Matrimonial (2 adultos), Deluxe Triple (3), Matrimonial (2), Doble (2 adultos, 2 camas dobles), Triple (3) y Cuádruple (4).
- Cotiza con las tarifas del sistema de reservas y aclara que el equipo de Reservas confirma el precio final.
- Para apartar: pide nombre, fechas y cuántas personas. El apartado dura una hora; con el comprobante del depósito, Reservas confirma.

DAY PASS
- Adultos $45 (desde los 11 años, incluye $20 consumibles) y niños $25. Entrada desde las 7:00 a. m. y salida a las 5:00 p. m.
- No se reserva ningún área: la ubicación es por orden de llegada. Los precios no aplican en temporada alta (Semana Santa, vacaciones de agosto y diciembre).
- Camas de Day Pass: $50 en temporada baja y $75 en temporada alta, con sala. Hay 3 y se reservan por el call center pagando por adelantado.
- Mascotas: solo en Day Pass, tranquilas, de hasta 10 kg, con correa y al día con sus vacunas. No entran a las piscinas.

EVENTOS
Bodas, graduaciones y eventos corporativos. Pásalos siempre al equipo de eventos para cotizar.

ARCHIVOS
Si ves marcas como "[imagen]", "[documento: ...]", "[audio]" o "[sticker]", la persona envió un archivo que TÚ NO puedes abrir. Nunca inventes su contenido; ofrece que alguien del equipo lo revise.

PASAR A UNA PERSONA
Pásale la conversación a una persona del equipo cuando: piden eventos o grupos, un cambio o cancelación de reserva, un pago que no cuadra, una queja, o algo que no sepas. Dile que alguien del equipo le escribe por aquí.

NO INVENTES
No inventes disponibilidad, precios que no estén aquí, horarios ni promociones. Si no lo sabes, dilo y ofrece que alguien del equipo lo confirme.

Responde ÚNICAMENTE con el mensaje que se le enviará al cliente. Sin notas ni etiquetas.`;

export const tesoroTenant: TenantConfig = {
  id: "tesoro",
  brand: {
    nombre: "Hotel Tesoro Beach",
    nombreCorto: "Tesoro Beach",
    tagline: "Costa del Sol",
    loginTitulo: "Centro de Comunicación",
    emailPlaceholder: "nombre@hoteltesorobeach.com",
    // Su logo es vertical (velero arriba, nombre abajo): en la barra va el
    // velero y el nombre se escribe con la tipografía de la app.
    wordmark: { icon: "Hotel", logoSrc: "/brand/tesoro/simbolo.png", titulo: "Tesoro Beach", subtitulo: "Costa del Sol" },
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
  tags: ["Reservas", "Day Pass", "Eventos", "Familia", "Mascotas", "Pago", "Huésped en casa", "Grupo"],
  seed: tesoroSeed,
  simulacion: tesoroSimulacion,
  ai: { systemPrompt: SYSTEM_PROMPT, nombre: "Marina", modelo: "luna", respondeSolo: false },
  // El tablero de Tesoro es propio (components/hotel-muestra).
  dashboard: [
    { label: "Conversaciones hoy", icon: "MessageSquare", kind: "metric", metricLabel: "Conversaciones hoy", fallback: 0 },
    { label: "Sin asignar", icon: "Inbox", kind: "sinAsignar" },
  ],
  waTemplates: [
    {
      name: "reserva_confirmada",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "¡Listo, {{1}}! Su reserva {{2}} en la {{3}} quedó confirmada del {{4}} al {{5}}. Le esperamos en Tesoro Beach 🌴",
          example: { body_text: [["Ernesto", "TB-3104", "Habitación Triple", "23 oct", "25 oct"]] },
        },
        { type: "FOOTER", text: "Hotel Tesoro Beach" },
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
          text: "Hola, {{1}}. Mañana le esperamos en Tesoro Beach. ¿A qué hora calcula llegar?",
          example: { body_text: [["Sandra"]] },
        },
        { type: "FOOTER", text: "Hotel Tesoro Beach" },
      ],
    },
  ],
  // Sin número conectado: las plantillas del número de la demo son de otra
  // empresa y no se le muestran.
  whatsapp: { plantillasDelNumeroDemo: false },
};
