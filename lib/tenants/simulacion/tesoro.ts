// Guion de la bandeja en vivo del Hotel Tesoro Beach (solo simulación en el
// navegador). Lo que más le preguntan a un hotel de familias en la Costa del
// Sol: el Day Pass, habitación para cuatro, mascotas y eventos. Precios,
// horarios y reglas salen de hoteltesorobeach.com.

import type { TenantSimulacion } from "../types";

export const tesoroSimulacion: TenantSimulacion = {
  turnos: [
    {
      entra: "Buenas, ¿cuánto cuesta el day pass?",
      responde: "¡Hola! El Day Pass es de $45 por adulto, desde los 11 años, e incluye $20 para consumir, y de $25 por niño. Es de 7:00 a. m. a 5:00 p. m. ¿Cuántas personas serían?",
    },
    {
      entra: "¿Tienen habitación para 2 adultos y 2 niños este sábado?",
      responde: "¡Sí tenemos! La Habitación Cuádruple es ideal para su familia, con dos camas dobles. ¿Me confirma la fecha de salida para darle el precio?",
    },
    {
      entra: "¿Puedo llevar a mi perrito?",
      responde: "¡Claro! Las mascotas son bienvenidas en Day Pass, tranquilas y de hasta 10 kg, con correa y vacunas al día. Solo no pueden entrar a las piscinas 🐾",
    },
    {
      entra: "¿Se puede apartar un lugar en la piscina?",
      responde: "En Day Pass la ubicación es por orden de llegada. Si quiere asegurar su espacio, tenemos camas de Day Pass con sala por $50 en temporada baja.",
    },
    {
      entra: "Quiero cotizar una boda en la playa",
      responde: "¡Qué emoción! Le paso con nuestro equipo de eventos para armarle la cotización. ¿Para cuántas personas y qué fecha tienen en mente?",
    },
    {
      entra: "¿Dónde están ubicados?",
      responde: "Estamos en el Boulevard Costa del Sol, kilómetro 65 y medio, San Luis La Herradura. A unos 45 minutos de San Salvador y a 20 del aeropuerto 😊",
    },
    {
      entra: "¿El day pass incluye comida?",
      responde: "El Day Pass de adulto incluye $20 para consumir en nuestros restaurantes y bares. Lo demás se paga aparte.",
    },
    {
      entra: "¿Cuánto sale la suite con piscina?",
      responde: "La Suite con piscina privada es para 6 adultos, con dos habitaciones. ¿Para qué fechas sería? Así le doy el precio exacto.",
    },
  ],
  contactos: [
    { nombre: "Wendy Martínez", canal: "whatsapp", telefono: "50391230011" },
    { nombre: "Edwin Flores", canal: "facebook", handle: "Edwin Flores", departamento: "club" },
    { nombre: "Brenda Cruz", canal: "instagram", handle: "@brenda.cruz.sv" },
    { nombre: "Julio Ramírez", canal: "whatsapp", telefono: "50391230022", departamento: "eventos" },
  ],
};
