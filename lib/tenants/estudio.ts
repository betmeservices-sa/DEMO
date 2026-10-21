// Tenant "estudio": el motor de contenido de BetMe (Content Engine).
//
// Un prompt con el perfil de la marca se vuelve posts, gráficos y videos con
// avatar; una persona los aprueba y el calendario los publica en cada red.
// Es de varias marcas a la vez (los clientes a los que BetMe se lo revende),
// así que el panel tiene su propio selector de marca, aparte del selector de
// cliente de la agencia.
//
// No tiene bandeja ni agente de chat: todo vive en /estudio (lib/estudio y
// components/estudio), con su propia cara (shell "estudio").

import type { TenantConfig, TenantSeed } from "./types";

const seed: TenantSeed = {
  ME: "me",
  departments: [{ id: "atencion", nombre: "Contenido", color: "#ff7a1a" }],
  staff: [{ id: "me", nombre: "Mario G.", rol: "gerente_marketing", departamento: "atencion", iniciales: "MG" }],
  contacts: [],
  conversations: [],
  messages: [],
  internalChannels: [],
  internalMessages: [],
  socialPosts: [],
  socialStats: [],
  metrics: [],
};

export const estudioTenant: TenantConfig = {
  id: "estudio",
  brand: {
    nombre: "Content Engine",
    nombreCorto: "Content Engine",
    tagline: "Del prompt al calendario",
    loginTitulo: "Content Engine",
    emailPlaceholder: "nombre@betmeservices.com",
    wordmark: { icon: "Briefcase", titulo: "Content Engine", subtitulo: "BetMe" },
  },
  labels: { contacto: "marca", contactoPlural: "marcas" },
  roles: {
    recepcion: "Coordinación",
    atencion: "Revisión",
    marketing: "Contenido",
    gerente_marketing: "Dirección de contenido",
    medico: "Diseño",
    jefe: "Jefatura de cuentas",
    admin: "Dirección (todo)",
  },
  defaultDepartment: "atencion",
  tags: [],
  seed,
  simulacion: { turnos: [], contactos: [] },
  // Sin agente de chat: el texto lo genera el motor, no una conversación.
  ai: { systemPrompt: "", nombre: "Motor", modelo: "luna", respondeSolo: false },
  dashboard: [],
  waTemplates: [],
  whatsapp: { plantillasDelNumeroDemo: false },
  shell: "estudio",
};
