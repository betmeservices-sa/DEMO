// Guion de la bandeja en vivo de ShopUSA (solo simulación en el navegador).
// Lo que más le preguntan: si ya llegó, cuánto cuesta, cuánto tarda y dónde
// se retira. Las respuestas salen de shopusa.la.

import type { TenantSimulacion } from "../types";

export const shopusaSimulacion: TenantSimulacion = {
  turnos: [
    {
      entra: "Hola, ¿ya llegó mi paquete de Amazon?",
      responde: "¡Hola! Sí, lo recibimos en nuestra bodega de Miami esta mañana: 1.6 lb. Sale en la próxima carga y te aviso apenas esté listo para retirar.",
    },
    {
      entra: "¿Cuánto cobran por libra?",
      responde: "$4.99 la libra hasta 5 libras y $4.40 la libra desde 6 libras, más el 13% de IVA sobre el valor de tu factura. Si me dices cuánto pagaste y cuánto pesa, te lo calculo.",
    },
    {
      entra: "¿Cuánto pago por traer un celular?",
      responde: "Los celulares con factura de $100 o más llevan tarifa fija de $25, más el flete por libra y el 13% de IVA sobre la factura. ¿De cuánto es tu celular?",
    },
    {
      entra: "¿Hasta qué hora abren el sábado?",
      responde: "Los sábados atendemos de 9:00 a. m. a 1:00 p. m. en todas las sucursales. Para retirar lleva tu DUI 😊",
    },
    {
      entra: "¿Cuánto se tarda en llegar lo que compro?",
      responde: "La entrega estimada es de 7 días hábiles desde que tu paquete llega a nuestra bodega de Miami.",
    },
    {
      entra: "Compré tres cosas en SHEIN y me llegan en paquetes separados, ¿pago tres veces el flete?",
      responde: "Si llegan a la bodega a tiempo para la misma carga, se pesan juntos y pagas un solo flete. Eso sí: prealerta cada tracking por separado.",
    },
    {
      entra: "¿Me lo pueden llevar a mi casa?",
      responde: "¡Claro! La entrega a domicilio cuesta $3.50 en el área metropolitana y $7.00 fuera de ella. ¿A qué zona sería?",
    },
    {
      entra: "Mi compra es de $350, ¿cuánto pago de impuestos?",
      responde: "Si la factura pasa de $300, además del 13% de IVA se paga DAI según el tipo de producto. ¿Qué compraste? Así te digo el porcentaje.",
    },
  ],
  contactos: [
    { nombre: "Kevin Alexander Flores", canal: "whatsapp", telefono: "50393108274", departamento: "atencion" },
    { nombre: "Stephanie Molina", canal: "instagram", handle: "@stephmolina.sv", departamento: "atencion" },
    { nombre: "Héctor Mauricio Ruiz", canal: "whatsapp", telefono: "50394219385", departamento: "prealertas" },
    { nombre: "Gloria Elizabeth Pérez", canal: "facebook", handle: "Gloria Pérez", departamento: "entregas" },
  ],
};
