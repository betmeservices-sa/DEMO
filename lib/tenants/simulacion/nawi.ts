// Guion de la bandeja en vivo de NAWI Beach House (solo simulación en el
// navegador). Lo que más le preguntan a un club de playa con hotel: el Day
// Pass, si hay habitación, si pueden ir con niños y cómo se llega. Precios,
// horarios y reglas salen de antiresort.com/nawibeachhouse.

import type { TenantSimulacion } from "../types";

export const nawiSimulacion: TenantSimulacion = {
  turnos: [
    {
      entra: "Hola, ¿cuánto cuesta el day pass este sábado?",
      responde: "¡Hola! El fin de semana el Pase de un día es de $40 por persona y el DUO, para dos, de $65. Incluye piscina infinita, red suspendida, playa semiprivada y bebida de bienvenida. ¿Cuántos serían?",
    },
    {
      entra: "¿Puedo llevar a mi hijo de 12?",
      responde: "Nawi es solo para mayores de 18, así que no podemos recibir menores. ¡Te esperamos cuando sea plan de adultos! 🌊",
    },
    {
      entra: "¿Tienen habitación para el próximo fin de semana para 2?",
      responde: "¡Sí hay! Te recomiendo la Ocean Tree House, con vista al mar desde la cama. ¿Me confirmas la fecha de llegada y de salida para darte el precio?",
    },
    {
      entra: "¿La comida está incluida en el day pass?",
      responde: "La comida no está incluida, pero con el pase puedes pedir a la carta en el restaurante frente al mar. Ojo: no se permite entrar comida ni bebida de fuera.",
    },
    {
      entra: "¿A qué hora abren?",
      responde: "Abrimos todos los días desde las 7:30 a. m. De domingo a viernes cerramos a las 10:00 p. m. y el sábado a las 11:00 p. m. 😊",
    },
    {
      entra: "Hi! Do you have rooms for this weekend?",
      responde: "Hi! Yes, we do 🌴 How many guests, and which nights would you like to stay? I'll check the best option for you.",
    },
    {
      entra: "Somos 6 amigos, ¿qué habitación nos recomiendas?",
      responde: "La Habitación Lodge es justo para grupos: una cama king y cuatro literas, sala y baño privado, frente a Nawi. ¿Para qué fechas sería?",
    },
    {
      entra: "¿Puedo llevar mi hielera con bebidas?",
      responde: "No se permite entrar comida ni bebida de fuera, pero el bar y el restaurante frente al mar están abiertos todo el día 🍹",
    },
  ],
  contactos: [
    { nombre: "Alejandra Pineda", canal: "whatsapp", telefono: "50391234560" },
    { nombre: "Marcos Villalta", canal: "instagram", handle: "@marcos.villalta", departamento: "club" },
    { nombre: "Ryan Cooper", canal: "whatsapp", telefono: "13105550188" },
    { nombre: "Gabriela Orellana", canal: "facebook", handle: "Gabriela Orellana", departamento: "club" },
  ],
};
