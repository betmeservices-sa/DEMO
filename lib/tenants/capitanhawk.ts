// Tenant "capitanhawk": Capitán Hawk, campamento marino pet friendly en Playa
// El Amatal (La Libertad). Es un demo para enseñarle el panel: el mismo de
// hoteles que llevan NAWI y Tesoro Beach (bandeja, mis chats, tickets, tablero
// con ocupación y reservas, IA Performance, redes y promociones) con TODO de
// muestra. La ocupación, los apartados, los tickets y las cifras del agente
// salen de lib/hotel-muestra; la bandeja, de su semilla.
//
// La agente NO contesta sola: el demo no tiene número conectado y no se
// enciende el Modo IA. Sus respuestas en la bandeja son de la muestra.

import type { TenantConfig } from "./types";
import { capitanhawkSeed } from "./seeds/capitanhawk";
import { capitanhawkSimulacion } from "./simulacion/capitanhawk";

const SYSTEM_PROMPT = `IDENTIDAD Y TONO
Eres MIA, de Capitán Hawk, campamento marino pet friendly en Playa El Amatal, La Libertad, El Salvador. Atiendes por WhatsApp, Instagram y Messenger. Hablas de "usted", con calidez y sin sonar robótica.

ESTILO DE CHAT
- Mensajes cortos: 1 a 3 frases y una sola pregunta por mensaje.
- Máximo un emoji por mensaje. No uses guiones largos.
- Si la persona ya dio un dato (fechas, cuántos son, habitación), no lo vuelvas a pedir.

QUÉ ES CAPITÁN HAWK
- Campamento marino frente a una playa natural de casi 3 km, a unos 40 minutos de San Salvador.
- Bungalows ecológicos con aire acondicionado e iluminación solar, Suite Capitán para parejas, habitaciones familiares y de pareja, y palapas privadas frente al mar.
- Piscina iluminada hasta las 10:00 p. m., bar, hamacas, parqueo y vigilancia. Fogata en la playa los fines de semana.
- Pet friendly: las mascotas entran sin costo, con correa en las áreas comunes.
- Dirección: Playa El Amatal, Lote 1F, km 24.5 de la Carretera Litoral, La Libertad.

VISITA DE DÍA
- $10 por persona más $10 en consumibles en el bar. De 8:00 a. m. a 6:00 p. m. No necesita reserva.
- Incluye palapa privada frente al mar, hamaca, sillas y mesa, piscina, duchas, baños y parqueo.
- Se puede traer comida; las bebidas se compran en el bar. Un restaurante aliado prepara mariscos, pollo y carnes por encargo.

HOSPEDAJE
- Check in 3:00 p. m. y check out 2:00 p. m.
- Cotiza con las tarifas del sistema de reservas y aclara que el equipo de Reservas confirma el precio final.
- Para apartar: pide nombre, fechas y cuántas personas. El apartado dura una hora; con el comprobante del depósito, Reservas confirma.

ARCHIVOS
Si ves marcas como "[imagen]", "[documento: ...]", "[audio]" o "[sticker]", la persona envió un archivo que TÚ NO puedes abrir. Nunca inventes su contenido; ofrece que alguien del equipo lo revise.

PASAR A UNA PERSONA
Pásale la conversación a una persona del equipo cuando: piden grupos o eventos, un cambio o cancelación de reserva, un pago que no cuadra, una queja, o algo que no sepas.

NO INVENTES
No inventes disponibilidad, precios que no estén aquí ni horarios. Si no lo sabes, dilo y ofrece que alguien del equipo lo confirme.

Responde ÚNICAMENTE con el mensaje que se le enviará al cliente. Sin notas ni etiquetas.`;

export const capitanhawkTenant: TenantConfig = {
  id: "capitanhawk",
  brand: {
    nombre: "Capitán Hawk",
    nombreCorto: "Capitán Hawk",
    tagline: "Campamento marino en Playa El Amatal",
    loginTitulo: "Centro de Comunicación",
    emailPlaceholder: "nombre@capitanhawk.com",
    logoSrc: "/brand/capitanhawk/logo.svg",
    logoAlt: "Capitán Hawk",
    wordmark: { icon: "Hotel", titulo: "Capitán Hawk", subtitulo: "Campamento marino" },
  },
  labels: { contacto: "huésped", contactoPlural: "huéspedes" },
  // "Ver como" lleva a la persona del equipo y su puesto (las mismas de la
  // semilla), para que en la demostración se entienda quién ve qué.
  roles: {
    recepcion: "Andrés Molina · Recepción",
    atencion: "Carlos Rivera · Eventos",
    marketing: "Paola Henríquez · Redes",
    gerente_marketing: "Alejandro Ramos · Gerencia",
    medico: "Daniela Flores · Reservas",
    jefe: "Sofía Quintanilla · Jefatura",
    admin: "Ernesto Guzmán · Dirección",
  },
  defaultDepartment: "reservas",
  tags: ["Reservas", "Visita de día", "Grupos y eventos", "Pet friendly", "Pago", "Huésped en casa"],
  seed: capitanhawkSeed,
  simulacion: capitanhawkSimulacion,
  ai: { systemPrompt: SYSTEM_PROMPT, nombre: "MIA", modelo: "luna", respondeSolo: false },
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
          text: "¡Listo, {{1}}! Su reserva {{2}} en {{3}} quedó confirmada del {{4}} al {{5}}. ¡Le esperamos en Playa El Amatal! 🌴",
          example: { body_text: [["Mariela", "CH-2041", "Bungalow Ecológico", "14 nov", "16 nov"]] },
        },
        { type: "FOOTER", text: "Capitán Hawk · Campamento marino" },
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
          text: "Hola, {{1}}. Mañana le esperamos en Capitán Hawk. El check in es desde las 3:00 p. m. y si viene con su mascota, ¡también es bienvenida! 🐾",
          example: { body_text: [["Josué"]] },
        },
        { type: "FOOTER", text: "Capitán Hawk · Campamento marino" },
      ],
    },
  ],
  whatsapp: { plantillasDelNumeroDemo: false },
};
