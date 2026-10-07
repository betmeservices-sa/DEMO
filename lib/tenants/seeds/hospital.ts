// Datos semilla del Hospital Centro Ginecológico (tenant "hospital").
// Español salvadoreño. Timestamps fijos (sin Date.now) para un demo estable.
// Nota: el discriminante `autor` es canónico ("cliente"); la palabra visible
// ("paciente") sale de tenant.labels.contacto.

import type { TenantSeed } from "../types";

const ME = "me";

export const hospitalSeed: TenantSeed = {
  ME,
  departments: [
    { id: "ginecologia", nombre: "Ginecología", color: "#0067f8" },
    { id: "obstetricia", nombre: "Obstetricia", color: "#e84d8a" },
    { id: "pediatria", nombre: "Pediatría", color: "#4ac12f" },
    { id: "reproduccion", nombre: "Reproducción Asistida", color: "#9b51e0" },
    { id: "laboratorio", nombre: "Laboratorio", color: "#f5a623" },
    { id: "imagenes", nombre: "Imágenes", color: "#00b8d4" },
    { id: "recepcion", nombre: "Recepción", color: "#64748b" },
  ],
  staff: [
    // Equipo REAL del hospital (el panel atiende su WhatsApp de verdad desde el
    // 2026-10-07). Nada de médicos inventados: lo que se ve acá es a quién se le
    // asigna un chat o un ticket. "s2" es Marielos, la dueña de los tickets que
    // abre Claudia (RESPONSABLE_HOSPITAL en lib/tickets-tenant.ts). Las cuentas
    // de cada persona van en la variable USUARIOS, con su staffId de esta lista.
    { id: ME, nombre: "Dirección", rol: "admin", departamento: "recepcion", iniciales: "DI" },
    { id: "s2", nombre: "Marielos", rol: "atencion", departamento: "recepcion", iniciales: "MA" },
  ],
  // Bandeja limpia: sin conversaciones de muestra. Los chats aparecen aquí
  // cuando llega un mensaje REAL de WhatsApp (webhook -> Supabase -> inbox).
  contacts: [],
  conversations: [],
  messages: [],
  internalChannels: [
    { id: "ic1", nombre: "general", tipo: "canal", miembros: [ME, "s2"] },
  ],
  internalMessages: [],
  socialPosts: [],
  socialStats: [],
  metrics: [
    { label: "Conversaciones hoy", valor: 38, delta: 12 },
    { label: "Tiempo de respuesta", valor: "6 min", delta: -18 },
  ],
};
