// Datos semilla del tenant "consultorio": el Centro Ginecologico.
//
// Una clínica chica con laboratorio propio: dos doctores que pasan consulta y
// dos sucursales donde se toman las muestras. Lo que la distingue de los otros
// demos es que aquí el paciente se registra solo, escaneando un QR, y el
// expediente, la receta y la orden de exámenes viven en la misma app.
//
// Español salvadoreño. Timestamps fijos (sin Date.now) para que el demo se vea
// igual cada vez que se abre. Las personas son inventadas.

import type { TenantSeed } from "../types";

const ME = "me";

export const consultorioSeed: TenantSeed = {
  ME,
  // Desde 2026-11-09 el panel es SOLO del laboratorio (pedido del usuario): un
  // solo departamento, y el equipo es el de verdad, el de las cuentas del lab
  // (variable USUARIOS_LAB en Vercel, cada cuenta con su ficha). Verónica es la
  // encargada: recibe los casos que abre Valeria (RESPONSABLE_LAB).
  departments: [{ id: "laboratorio", nombre: "Laboratorio", color: "#0067a8" }],
  staff: [
    { id: ME, nombre: "Administración", rol: "gerente_marketing", departamento: "laboratorio", iniciales: "AD" },
    { id: "lab-veronica", nombre: "Verónica", rol: "recepcion", departamento: "laboratorio", iniciales: "VE" },
    { id: "lab-mirna", nombre: "Mirna Paredes", rol: "recepcion", departamento: "laboratorio", iniciales: "MP" },
    { id: "lab-liliana", nombre: "Liliana", rol: "recepcion", departamento: "laboratorio", iniciales: "LI" },
    { id: "lab-gabriela", nombre: "Gabriela Pérez", rol: "recepcion", departamento: "laboratorio", iniciales: "GP" },
    { id: "lab-imelda", nombre: "Imelda Molina", rol: "recepcion", departamento: "laboratorio", iniciales: "IM" },
    { id: "lab-helen", nombre: "Helen Chicas", rol: "recepcion", departamento: "laboratorio", iniciales: "HC" },
    { id: "lab-abigail", nombre: "Abigail Cubas", rol: "recepcion", departamento: "laboratorio", iniciales: "AC" },
  ],
  // Sin contactos inventados: desde el 10/11 este es el panel REAL del lab y
  // la bandeja busca el nombre de quien escribe en esta lista por teléfono; un
  // paciente real con uno de esos números salía con nombre y notas de mentira.
  // Los de muestra viven en bandejaDeMuestra.contacts.
  contacts: [],
  // Sin chats de muestra: desde 2026-11-03 la bandeja es la del WhatsApp real
  // del laboratorio (2247 1141). Los de muestra viven en bandejaDeMuestra.
  conversations: [],
  messages: [],
  internalChannels: [],
  internalMessages: [],
  socialPosts: [],
  socialStats: [],
  metrics: [],
};

// La bandeja de muestra (/mensajes): vacía desde el 2026-11-12 (pedido del
// usuario: el panel del lab sin datos inventados). Ya no sale en el menu de la clinica, que ahora tiene la
// bandeja real, pero la pagina sigue existiendo.
export const bandejaDeMuestra: Pick<TenantSeed, "contacts" | "conversations" | "messages"> = {
  contacts: [],
  conversations: [],
  messages: [],
};
