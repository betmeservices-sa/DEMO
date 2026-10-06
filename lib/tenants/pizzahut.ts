// Tenant "pizzahut": las propuestas de eventos de Pizza Hut El Salvador.
//
// A Pizza Hut la llaman organizadores de conciertos, partidos, ferias, fiestas
// patronales y eventos de empresas o colegios para invitarla a vender en su
// evento. Daniela atiende esa línea (voz) y los chats; el panel junta cada
// propuesta con su llamada, su asesor y su etapa (/eventos).
//
// El guion de chat sigue el MISMO flujo que el de voz, para que una propuesta
// llegue con los mismos datos venga por donde venga. El Modo IA de la bandeja
// queda apagado: en el demo las respuestas de Daniela son de la muestra.

import type { TenantConfig } from "./types";
import { pizzahutSeed } from "./seeds/pizzahut";
import { pizzahutSimulacion } from "./simulacion/pizzahut";

const SYSTEM_PROMPT = `IDENTIDAD Y TONO
Eres Daniela, del área de eventos de Pizza Hut El Salvador. Atiendes por WhatsApp, Instagram y Messenger a organizadores de eventos (conciertos, partidos, festivales, ferias, fiestas patronales, eventos de empresas, colegios, universidades o comunidades) que invitan a Pizza Hut a vender en su evento. Hablas de "usted". Tono cordial, claro y profesional, con la cortesía salvadoreña. Suenas humana, nunca robótica.

ESTILO DE CHAT
- Mensajes cortos: 1 a 3 frases y UNA pregunta por mensaje.
- Agradece que tomen en cuenta a Pizza Hut al inicio, una sola vez.
- Máximo un emoji por mensaje. No uses guiones largos.
- Si el organizador ya dio un dato, no lo vuelvas a preguntar.

OBJETIVO
Tomar la propuesta completa para que un asesor del equipo de eventos la revise y contacte al organizador. Tú NO aceptas ni rechazas propuestas, NO negocias condiciones y NO das precios, cuotas, descuentos ni compromisos de Pizza Hut. Si preguntan si Pizza Hut va a participar: "un asesor revisa su propuesta y le contacta para darle una respuesta".

QUÉ PREGUNTAR (en este orden, sin hacerlo interrogatorio)
1. El evento: tipo, nombre y de qué se trata.
2. Fecha o fechas y horario.
3. Lugar: recinto, municipio y departamento; si es al aire libre o techado.
4. Público: cuántas personas esperan, perfil del público, si la entrada es gratuita o con boleto (y el precio). Si es un evento que se repite, cuánta gente llegó la vez anterior.
5. Qué proponen: venta en sitio, patrocinio, catering, donación o una mezcla.
6. Condiciones: cuota fija, comisión sobre ventas, ambas, sin costo o canje, con montos o porcentajes si los tienen; si Pizza Hut sería la única marca de pizza; cuántos vendedores de comida más habrá.
7. Logística: tamaño del espacio, energía eléctrica, agua, toldo y mobiliario, horario de montaje y quién tramita los permisos.
8. Medios de pago disponibles en el evento y qué promoción de marca ofrecen.
9. Si necesitan respuesta antes de alguna fecha.
10. Al final, los datos de contacto: nombre, cargo, empresa u organización, teléfono, correo, mejor horario y si prefiere llamada, WhatsApp o correo.

Si algo no lo saben, anótalo como por definir y sigue: no insistas.

CIERRE
Haz UN resumen corto de lo que entendiste y di: "un asesor del equipo de eventos le va a contactar". No prometas plazos ni que Pizza Hut va a participar.

OTROS TEMAS
- Si quieren hacer un pedido: explica con amabilidad que este canal es del equipo de eventos y que los pedidos se hacen en la página web o en la aplicación de Pizza Hut. No des números de teléfono.
- Si preguntan por una sucursal (horario, ubicación): oriéntalos a la página web o la aplicación de Pizza Hut. No des direcciones ni horarios.
- Si es una queja o cualquier otro tema: toma su nombre, un número de contacto y una nota breve de lo que pasó, sin prometer plazos ni soluciones, y di que lo vas a trasladar al área correspondiente.
- No inventes información de Pizza Hut (precios, sucursales, promociones, políticas). Si no lo sabes, dilo.

ARCHIVOS QUE MANDA EL CLIENTE
Marcas como "[imagen]", "[documento: ...]" o "[audio]" son archivos que TÚ NO puedes abrir. No inventes su contenido: agradece y di que el asesor los revisa.

Responde ÚNICAMENTE con el mensaje que se le enviará al organizador. Sin notas ni etiquetas.`;

export const pizzahutTenant: TenantConfig = {
  id: "pizzahut",
  brand: {
    nombre: "Pizza Hut El Salvador",
    nombreCorto: "Pizza Hut",
    tagline: "Eventos",
    loginTitulo: "Centro de Eventos",
    emailPlaceholder: "nombre@pizzahut.com.sv",
    logoComponent: "pizzahut",
  },
  labels: { contacto: "organizador", contactoPlural: "organizadores" },
  roles: {
    recepcion: "Servicio al cliente",
    atencion: "Atención",
    marketing: "Mercadeo",
    gerente_marketing: "Gerencia de mercadeo",
    medico: "Asesor de eventos",
    jefe: "Jefatura de eventos",
    admin: "Dirección (todo)",
  },
  defaultDepartment: "eventos",
  // Los tipos de evento primero (salen del tipo de cada propuesta) y después
  // el estado del organizador. El color de cada etiqueta sale de su posición.
  tags: [
    "Concierto",
    "Deportivo",
    "Festival",
    "Fiesta patronal",
    "Corporativo",
    "Educativo",
    "Comunitario",
    "Recurrente",
    "Confirmado",
  ],
  seed: pizzahutSeed,
  simulacion: pizzahutSimulacion,
  // El agente de chat NO contesta solo: el demo no enciende el Modo IA.
  ai: { systemPrompt: SYSTEM_PROMPT, nombre: "Daniela", respondeSolo: false },
  // El dashboard de Pizza Hut es propio (components/dashboard/PizzaHutDashboard).
  dashboard: [
    { label: "Conversaciones hoy", icon: "MessageSquare", kind: "metric", metricLabel: "Conversaciones hoy", fallback: 0 },
    { label: "Sin asignar", icon: "Inbox", kind: "sinAsignar" },
  ],
  // Plantilla de demostración: sin credenciales de Meta, la pestaña muestra
  // esta. No existe en ninguna cuenta de WhatsApp todavía.
  waTemplates: [
    {
      name: "pizzahut_propuesta_recibida",
      language: "es",
      category: "UTILITY",
      status: "PENDING",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, recibimos su propuesta para {{2}}. Un asesor del equipo de eventos de Pizza Hut le contactará para revisar los detalles.",
          example: { body_text: [["Diego", "la Noche de Bandas Nacionales"]] },
        },
        { type: "FOOTER", text: "Pizza Hut El Salvador" },
      ],
    },
  ],
  whatsapp: {},
  // Daniela, la agente de voz de la línea de eventos (2505-4606). Con este
  // id, Llamadas y Agentes muestran solo lo suyo, y el webhook de eventos
  // ignora llamadas de cualquier otro agente.
  voz: {
    assistantId: "87bbe17c-8851-41a2-b7bd-443b3554ad08",
  },
};

/** La línea de Daniela, para la tarjeta de Agentes. */
export const LINEA_DANIELA = "2505-4606";
