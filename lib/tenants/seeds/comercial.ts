// Datos semilla de MiAgentIA Comercial (tenant "comercial"): el panel de las
// asesoras de MiAgentIA. Es un panel REAL, no un demo: la bandeja muestra solo
// lo que entra por su WhatsApp y los leads salen de las landings de
// conferencia. Por eso no trae conversaciones, contactos ni metricas de
// muestra; solo el equipo, para poder asignar chats.

import type { TenantSeed } from "../types";

const ME = "me";

export const comercialSeed: TenantSeed = {
  ME,
  departments: [{ id: "ventas", nombre: "Ventas", color: "#7c3aed" }],
  staff: [
    { id: ME, nombre: "Equipo MiAgentIA", rol: "gerente_marketing", departamento: "ventas", iniciales: "MI" },
    { id: "sandra", nombre: "Sandra Alvarez", rol: "medico", departamento: "ventas", iniciales: "SA" },
    { id: "andrea", nombre: "Andrea García", rol: "medico", departamento: "ventas", iniciales: "AG" },
  ],
  contacts: [],
  conversations: [],
  messages: [],
  internalChannels: [{ id: "ic1", nombre: "general", tipo: "canal", miembros: [ME, "sandra", "andrea"] }],
  internalMessages: [],
  socialPosts: [],
  socialStats: [],
  metrics: [],
};
