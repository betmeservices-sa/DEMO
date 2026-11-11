// Guion de la bandeja en vivo de Capitán Hawk (solo simulación en el
// navegador): lo que más le preguntan a un campamento de playa.

import type { TenantSimulacion } from "../types";

export const capitanhawkSimulacion: TenantSimulacion = {
  turnos: [
    {
      entra: "Buenas, ¿cuánto cuesta la visita de día?",
      responde: "¡Hola! Son $10 por persona más $10 en consumibles en el bar, con palapa privada frente al mar, piscina y parqueo. De 8:00 a. m. a 6:00 p. m. ¿Cuántos serían?",
    },
    {
      entra: "¿Puedo llevar a mi perro?",
      responde: "¡Claro! Somos pet friendly y su mascota entra sin costo 🐾 Solo le pedimos traerla con correa en las áreas comunes.",
    },
    {
      entra: "¿Tienen bungalow para este sábado? Somos 4",
      responde: "Para el sábado tengo libre el Bungalow Ecológico, para cuatro, a pasos del mar. ¿Sería solo una noche?",
    },
    {
      entra: "¿Se puede llevar comida?",
      responde: "Sí, puede traer sus alimentos; las bebidas se compran en el bar. También tenemos un restaurante aliado que prepara mariscos por encargo.",
    },
    {
      entra: "¿Hay fogata el sábado?",
      responde: "¡Sí! Los fines de semana encendemos fogata en la playa al atardecer 🔥 ¿Le aparto un bungalow?",
    },
    {
      entra: "¿Cómo llego desde San Salvador?",
      responde: "Estamos en Playa El Amatal, km 24.5 de la Carretera Litoral, a unos 40 minutos de San Salvador. Le comparto la ubicación 📍",
    },
    {
      entra: "Quiero celebrar un cumpleaños, seríamos 20",
      responde: "¡Qué buen plan! Para grupos juntamos varias palapas. Le paso con nuestro equipo de eventos para armarle la propuesta.",
    },
    {
      entra: "Perfecto, apártemelo",
      responde: "¡Listo! Quedó apartado por una hora a su nombre. Le paso los datos para el depósito 🏴‍☠️",
    },
  ],
  contactos: [
    { nombre: "Andrea Cáceres", canal: "whatsapp", telefono: "50391020411", departamento: "reservas" },
    { nombre: "Kevin Bonilla", canal: "instagram", handle: "@kevin.bonilla", departamento: "club" },
    { nombre: "Valeria Zelaya", canal: "facebook", handle: "Valeria Zelaya", departamento: "reservas" },
    { nombre: "Óscar Peña", canal: "whatsapp", telefono: "50391020422", departamento: "club" },
    { nombre: "Diego Cornejo", canal: "whatsapp", telefono: "50391020433", departamento: "eventos" },
  ],
};
