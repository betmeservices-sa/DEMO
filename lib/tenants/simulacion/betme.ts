// Guion de bandeja en vivo de BetMe: gente que quiere aplicar, que pregunta
// por su entrevista o por los requisitos del trabajo remoto.
import type { TenantSimulacion } from "../types";

export const betmeSimulacion: TenantSimulacion = {
  turnos: [
    {
      entra: "Hola, ¿están contratando asistentes virtuales?",
      responde: "¡Hola! Sí, tenemos posiciones abiertas para asistentes bilingües. ¿Qué tipo de puesto le interesa?",
    },
    {
      entra: "¿El trabajo es 100% remoto?",
      responde: "Sí, es 100% remoto, desde su casa y en horario de negocios de Estados Unidos. ¿Cuenta con internet estable?",
    },
    {
      entra: "¿Qué nivel de inglés piden?",
      responde: "Inglés profesional, hablado y escrito. En el proceso hay un screening en inglés de 20 minutos. ¿Cómo describiría su nivel?",
    },
    {
      entra: "¿Cómo aplico?",
      responde: "Aplique en nuestra página de carreras con su CV y una grabación de 60 segundos presentándose en inglés. ¿Le comparto el enlace?",
    },
    {
      entra: "Ya apliqué la semana pasada, ¿cómo va mi proceso?",
      responde: "Gracias por escribir. Déjeme su nombre completo y reviso con el equipo de reclutamiento en qué etapa está.",
    },
    {
      entra: "¿La entrevista es por videollamada?",
      responde: "Sí, las entrevistas son por videollamada. Le llega el enlace por correo un día antes. ¿Le queda bien el horario que le propusieron?",
    },
    {
      entra: "¿Cuánto pagan?",
      responde: "La compensación depende del puesto y del cliente. Se conversa con detalle en la entrevista con reclutamiento.",
    },
    {
      entra: "¿Contratan gente de Guatemala?",
      responde: "Sí, trabajamos con talento de toda Latinoamérica. Lo importante es el inglés y la disponibilidad en horario de EE. UU.",
    },
    {
      entra: "No tengo experiencia como asistente virtual, ¿puedo aplicar?",
      responde: "Puede aplicar. Valoramos experiencia en atención al cliente, administración o ventas. ¿En qué ha trabajado?",
    },
  ],
  contactos: [
    { nombre: "Andrea Lemus", canal: "whatsapp", telefono: "50374102290", departamento: "reclutamiento" },
    { nombre: "Carlos Mendoza", canal: "whatsapp", telefono: "50374102291", departamento: "reclutamiento" },
    { nombre: "Fátima Chávez", canal: "instagram", handle: "@fati.chavez", departamento: "reclutamiento" },
    { nombre: "Roberto Cañas", canal: "facebook", handle: "Roberto Cañas", departamento: "atencion" },
    { nombre: "Gabriela Mena", canal: "instagram", handle: "@gabymena.va", departamento: "reclutamiento" },
  ],
};
