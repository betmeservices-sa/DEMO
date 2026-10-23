// Tenant "consultorio": el Centro Ginecologico, El Salvador.
//
// Una clinica con laboratorio propio. Ademas de la bandeja, este cliente tiene
// dos módulos que no tiene ningún otro: el consultorio (sus pacientes, las
// recetas y las órdenes de exámenes, con el QR que el paciente escanea para
// registrarse solo) y el mostrador del laboratorio (la fila del día).

import type { TenantConfig } from "./types";
import { consultorioSeed } from "./seeds/consultorio";
import { consultorioSimulacion } from "./simulacion/consultorio";
import { VALERIA_LAB } from "../consultorio/valeria-guion";

export const consultorioTenant: TenantConfig = {
  id: "consultorio",
  brand: {
    nombre: "Centro Ginecológico",
    nombreCorto: "Centro Ginecológico",
    tagline: "Somos parte de tu vida",
    loginTitulo: "Centro de Comunicación",
    emailPlaceholder: "nombre@centroginecologico.com",
    wordmark: {
      icon: "Stethoscope",
      // La barra lateral de este cliente es clara, asi que el simbolo va en el
      // azul de la marca; el blanco no se veria.
      logoSrc: "/gineco/simbolo-azul.svg",
      titulo: "Centro Ginecológico",
      subtitulo: "Somos parte de tu vida",
    },
  },
  labels: { contacto: "paciente", contactoPlural: "pacientes" },
  roles: {
    recepcion: "Recepción",
    atencion: "Atención al paciente",
    marketing: "Marketing",
    gerente_marketing: "Administración",
    medico: "Médico",
    jefe: "Jefe de laboratorio",
    admin: "Dirección (todo)",
  },
  defaultDepartment: "recepcion",
  tags: [
    "Paciente",
    "Cita de consulta",
    "Exámenes de laboratorio",
    "Exámenes pendientes",
    "Resultados",
    "Chequeo anual",
    "Precios",
  ],
  seed: consultorioSeed,
  simulacion: consultorioSimulacion,
  // Valeria del laboratorio, con luna como los demás agentes: guion de reglas
  // (consultorio/valeria-guion.ts) y los datos en la base del lab (kb_buscar).
  ai: { systemPrompt: VALERIA_LAB, nombre: "Valeria", modelo: "luna" },
  dashboard: [
    { label: "Conversaciones hoy", icon: "MessageSquare", kind: "metric", metricLabel: "Conversaciones hoy", fallback: 0 },
    { label: "Tiempo de respuesta", icon: "Clock", kind: "metric", metricLabel: "Tiempo de respuesta", fallback: "4 min" },
    { label: "Resueltas", icon: "CheckCircle2", kind: "resolucionPct" },
    { label: "Citas agendadas", icon: "CalendarCheck", kind: "metric", metricLabel: "Citas agendadas", fallback: 0 },
    { label: "Atendidas por IA", icon: "Bot", kind: "metric", metricLabel: "Atendidas por IA", fallback: "0%" },
    { label: "Sin asignar", icon: "Inbox", kind: "sinAsignar" },
  ],
  waTemplates: [
    {
      name: "resultados_listos",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, sus resultados del {{2}} ya están listos en el Centro Ginecológico. Puede pasar a recogerlos o pedirlos por este mismo chat.",
          example: { body_text: [["Marta", "8 de septiembre"]] },
        },
        { type: "FOOTER", text: "Centro Ginecológico" },
      ],
    },
    {
      name: "recordatorio_ayuno",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, le recordamos que mañana tiene exámenes de laboratorio y necesita ayuno de {{2}} horas. Puede tomar agua.",
          example: { body_text: [["Rodrigo", "8"]] },
        },
      ],
    },
  ],
  whatsapp: {},
};
