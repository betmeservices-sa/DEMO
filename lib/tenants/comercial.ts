// Tenant "comercial": MiAgentIA Comercial, el panel de las asesoras de
// MiAgentIA (Sandra y Andrea). Login demoagentia + demoa.
//
// Va aparte del tenant "miagentia" (demok) porque ese es el tablero de la
// AGENCIA: costos, consumo y desempeno de los agentes de cada cliente, que las
// asesoras no tienen por que ver. Aca solo hay lo suyo: los leads de las
// landings de conferencia (miagentia.com/sandra y /andrea), la bandeja del
// WhatsApp comercial (+503 7560 5872) y los contactos.
//
// El agente es Mia, el mismo guion de ventas de MiAgentIA. Arranca APAGADO en
// el numero (wa_connections.ia_activa = false): los mensajes entran y los
// contesta una persona hasta que alguien lo encienda.
import type { TenantConfig } from "./types";
import { comercialSeed } from "./seeds/comercial";
import { miagentiaTenant } from "./miagentia";
import { miagentiaSimulacion } from "./simulacion/miagentia";

export const comercialTenant: TenantConfig = {
  id: "comercial",
  brand: {
    nombre: "MiAgentIA Comercial",
    nombreCorto: "MiAgentIA",
    tagline: "Agentes de IA para tu negocio",
    loginTitulo: "Centro de Comunicación",
    emailPlaceholder: "nombre@miagentia.com",
    wordmark: { icon: "Bot", titulo: "MiAgentIA", subtitulo: "Comercial" },
  },
  labels: { contacto: "prospecto", contactoPlural: "prospectos" },
  roles: {
    recepcion: "Atención al Cliente",
    atencion: "Atención",
    marketing: "Marketing",
    gerente_marketing: "Gerente comercial",
    medico: "Asesora",
    jefe: "Jefe de ventas",
    admin: "Dirección (todo)",
  },
  defaultDepartment: "ventas",
  tags: ["Interés Agente WhatsApp", "Interés Agente de Voz", "Interés Voz y WhatsApp", "Demo agendada", "Cliente cerrado"],
  seed: comercialSeed,
  simulacion: miagentiaSimulacion,
  ai: { ...miagentiaTenant.ai },
  dashboard: [
    { label: "Conversaciones hoy", icon: "MessageSquare", kind: "metric", metricLabel: "Conversaciones hoy", fallback: 0 },
    { label: "Sin asignar", icon: "Inbox", kind: "sinAsignar" },
  ],
  waTemplates: [],
  whatsapp: {
    phoneNumberId: "1344094815455988",
    numeroPublico: "50375605872",
    // Su marca no se mezcla con las plantillas del numero de la demo.
    plantillasDelNumeroDemo: false,
  },
};
