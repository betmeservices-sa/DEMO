// Tenant "betme": el centro de reclutamiento de BetMe Services.
//
// BetMe coloca asistentes virtuales bilingues de Latinoamerica con negocios de
// Estados Unidos. Su panel no vende nada ni publica en redes: recibe
// candidatos por WhatsApp, Instagram y Facebook, y los lleva de la vacante a
// la contratacion (pipeline, perfiles, entrevistas y onboarding, en /talento).

import type { TenantConfig } from "./types";
import { betmeSeed } from "./seeds/betme";
import { betmeSimulacion } from "./simulacion/betme";

const SYSTEM_PROMPT = `IDENTIDAD Y TONO
Eres Sara, del equipo de talento de BetMe Services. Atiendes por WhatsApp, Instagram y Facebook a personas que quieren trabajar como asistentes virtuales bilingües con negocios de Estados Unidos. Hablas de "usted", con calidez y claridad. Suenas humana, nunca robótica.

ESTILO DE CHAT
- Mensajes cortos: 1 a 3 frases, UNA pregunta por mensaje.
- Máximo un emoji por mensaje. No uses guiones largos.
- Si escriben en inglés, responde en inglés.

LO QUE SABES DEL TRABAJO
- Es 100% remoto, desde casa, en horario de negocios de Estados Unidos (Este o Central).
- Se requiere inglés y español profesionales, hablados y escritos, e internet estable.
- Puestos habituales: Executive Virtual Assistant, Legal Assistant, Ops & Marketing Coordinator, Project Coordinator y Business Analyst.
- Trabajamos con talento de toda Latinoamérica.

EL PROCESO
1. Aplicar en la página de carreras con el CV y una grabación de 60 segundos presentándose en inglés.
2. Revisión y screening bilingüe (una llamada corta en inglés).
3. Evaluación DISC.
4. Match con un cliente y entrevista con el cliente.
5. Onboarding con acompañamiento del equipo.

OBJETIVO
Que la persona aplique con su CV, o que siga en su proceso sin fricción. Si pregunta por su proceso, pide su nombre completo y pásala con reclutamiento.

REGLAS
1. NUNCA des cifras de salario ni prometas un puesto: la compensación depende del puesto y del cliente y se conversa en la entrevista.
2. No inventes vacantes, fechas ni resultados de entrevistas. Si no lo sabes, dilo y ofrece que una persona del equipo le responda.
3. Si manda su CV o su resumen, agradécelo y dile que el equipo lo revisa y le escribe si hay match.
4. Si manda archivos que no puedes abrir ("[documento]", "[imagen]", "[audio]"), no inventes su contenido: dile que el equipo los revisa.

HERRAMIENTAS
- guardar_datos_contacto: úsala apenas diga su nombre, correo o el puesto que le interesa. No la anuncies.

Responde ÚNICAMENTE con el mensaje que se le enviará a la persona. Sin notas ni etiquetas.`;

export const betmeTenant: TenantConfig = {
  id: "betme",
  brand: {
    nombre: "BetMe Services",
    nombreCorto: "BetMe",
    tagline: "Talento bilingüe para negocios de EE. UU.",
    loginTitulo: "Centro de Reclutamiento",
    emailPlaceholder: "nombre@betmeservices.com",
    wordmark: { icon: "Briefcase", titulo: "BetMe", subtitulo: "Talento" },
  },
  labels: { contacto: "candidato", contactoPlural: "candidatos" },
  roles: {
    recepcion: "Coordinación",
    atencion: "Atención",
    marketing: "Marketing",
    gerente_marketing: "Gerente de Talento",
    medico: "Reclutador(a)",
    jefe: "Jefa de Talento",
    admin: "Dirección (todo)",
  },
  defaultDepartment: "reclutamiento",
  // Primero el tipo de puesto que busca y despues en que punto del proceso va.
  tags: [
    "Asistente ejecutiva",
    "Legal",
    "Marketing",
    "Proyectos",
    "Análisis",
    "Entrevista agendada",
    "Oferta enviada",
    "Contratada",
  ],
  seed: betmeSeed,
  simulacion: betmeSimulacion,
  // Número real de BetMe: los candidatos los atiende una persona hasta que el
  // cliente apruebe al agente.
  ai: { systemPrompt: SYSTEM_PROMPT, nombre: "Sara", respondeSolo: false },
  dashboard: [
    { label: "Conversaciones hoy", icon: "MessageSquare", kind: "metric", metricLabel: "Conversaciones hoy", fallback: 0 },
    { label: "Tiempo de respuesta", icon: "Clock", kind: "metric", metricLabel: "Tiempo de respuesta", fallback: "6 min" },
    { label: "Atendidas por IA", icon: "Bot", kind: "metric", metricLabel: "Atendidas por IA", fallback: "0%" },
    { label: "Sin asignar", icon: "Inbox", kind: "sinAsignar" },
  ],
  // Plantillas de respaldo (sin credenciales de Meta). Con el número conectado,
  // Plantillas lee las de la WABA de BetMe.
  waTemplates: [
    {
      name: "invitacion_entrevista",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, le saluda el equipo de talento de BetMe. Queremos conocerle para la posición de {{2}}. ¿Le queda bien el {{3}}? Responda SÍ para confirmar o proponga otro horario.",
          example: { body_text: [["Carolina", "Legal Assistant", "jueves a las 11:00 am"]] },
        },
        { type: "FOOTER", text: "BetMe Services" },
      ],
    },
    {
      name: "recordatorio_entrevista",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, le recordamos su entrevista de hoy a las {{2}}. El enlace de la videollamada está en su correo. Conéctese 5 minutos antes.",
          example: { body_text: [["Diego", "3:00 pm"]] },
        },
        { type: "FOOTER", text: "BetMe Services" },
      ],
    },
    {
      name: "oferta_laboral",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "¡Felicidades {{1}}! El cliente eligió su perfil para la posición de {{2}}. Le enviamos la oferta a su correo. ¿Tiene un momento hoy para revisarla juntos?",
          example: { body_text: [["Sofía", "Executive Virtual Assistant"]] },
        },
        { type: "FOOTER", text: "BetMe Services" },
      ],
    },
    {
      name: "gracias_por_postular",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, gracias por su tiempo en el proceso de {{2}}. En esta ocasión el cliente siguió con otro perfil. Su perfil queda en nuestro banco de talento y le escribimos cuando haya un match.",
          example: { body_text: [["Luis", "Legal Assistant"]] },
        },
        { type: "FOOTER", text: "BetMe Services" },
      ],
    },
    {
      name: "bienvenida_onboarding",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "¡Bienvenida al equipo, {{1}}! Arranca el {{2}}. Esta semana le llegan su correo corporativo y los accesos. Cualquier duda, escríbanos por aquí.",
          example: { body_text: [["Mónica", "lunes 6 de octubre"]] },
        },
        { type: "FOOTER", text: "BetMe Services" },
      ],
    },
  ],
  // Número de BetMe (+503 7023 3151). Sin phoneNumberId a propósito: el número
  // se conecta desde Configuración (queda en wa_connections con tenant
  // "betme") cuando la WABA tenga método de pago y la app suscrita. Conectarlo
  // antes haría que el agente le conteste a candidatos reales sin revisión.
  whatsapp: { numeroPublico: "50370233151" },
};
