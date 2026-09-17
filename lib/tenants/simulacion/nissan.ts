// Guion de bandeja en vivo de la sala de ventas Nissan.
// Todo gira alrededor de sacar el carro del piso: existencia, prueba de manejo,
// usado a cuenta, colores y entrega. El financiamiento aparece, pero nunca es
// el tema: aca se vende el carro, no el credito.
import type { TenantSimulacion } from "../types";

export const nissanSimulacion: TenantSimulacion = {
  turnos: [
    {
      entra: "Buenas, ¿tienen Frontier en existencia?",
      responde: "Buenas, sí hay Frontier en sala. ¿La está viendo para trabajo o para uso familiar?",
    },
    {
      entra: "¿Puedo ir a manejar el Kicks este sábado?",
      responde: "Claro que sí. Tengo espacio a las 10 y a las 3. ¿Cuál le queda mejor?",
    },
    {
      entra: "¿Reciben mi carro como parte de pago?",
      responde: "Sí, se lo valuamos sin costo el mismo día. ¿Qué modelo y año es el suyo?",
    },
    {
      entra: "¿De cuánto es la prima de la X-Trail?",
      responde: "La prima arranca desde el 20 por ciento. ¿Le mando la cotización con todo desglosado?",
    },
    {
      entra: "¿Tienen la Kicks en gris?",
      responde: "Sí, hay una gris en sala ahorita. ¿Se la aparto para que la vea hoy?",
    },
    {
      entra: "¿Cuánto tiempo tardan en entregarme la unidad?",
      responde: "Si está en existencia, la entrega sale en 48 horas. ¿Qué modelo tiene en mente?",
    },
    {
      entra: "Vi el anuncio de la Qashqai, ¿sigue el precio?",
      responde: "Sí, sigue vigente este mes. ¿Quiere que le agende una prueba de manejo?",
    },
    {
      entra: "¿Qué garantía trae un seminuevo certificado?",
      responde: "Llevan revisión de 150 puntos y garantía. ¿Qué presupuesto anda manejando?",
    },
    {
      entra: "Necesito una pick-up para el negocio, ¿cuál me recomienda?",
      responde: "Para trabajo diario, la Frontier cabina simple. ¿Cuánta carga necesita mover?",
    },
    {
      entra: "¿Hasta qué hora abren hoy?",
      responde: "Hoy hasta las 6 y mañana desde las 8. ¿Lo esperamos para verla?",
    },
    {
      entra: "Ya me decidí por la Kicks, ¿qué sigue?",
      responde: "Excelente. Con la prima queda separada a su nombre. ¿Se la dejo apartada desde hoy?",
    },
  ],
  contactos: [
    { nombre: "Josué Amaya", canal: "whatsapp", telefono: "50378442019", departamento: "ventas" },
    { nombre: "Claudia Marroquín", canal: "facebook", handle: "Claudia Marroquín" },
    { nombre: "Wilber Ramírez", canal: "instagram", handle: "@wilber.rmz", departamento: "usados" },
    { nombre: "Néstor Alfaro", canal: "whatsapp", telefono: "50371258834", departamento: "taller" },
    { nombre: "Gabriela Serrano", canal: "instagram", handle: "@gabyserrano.sv" },
    { nombre: "Luis Mancía", canal: "facebook", handle: "Luis Mancía", departamento: "repuestos" },
    { nombre: "Karla Beltrán", canal: "whatsapp", telefono: "50379016642", departamento: "ventas" },
  ],
};
