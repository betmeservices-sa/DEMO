// Guion de la bandeja en vivo de Express Shopping (solo simulación en el
// navegador). Lo que más le preguntan a un casillero: si ya llegó, cuánto
// cuesta, cuánto tarda y dónde se retira. Las respuestas salen de exs.sv.

import type { TenantSimulacion } from "../types";

export const exsSimulacion: TenantSimulacion = {
  turnos: [
    {
      entra: "Hola, ¿ya llegó mi paquete de Amazon?",
      responde: "¡Hola! Sí, lo recibimos en Miami esta mañana: 1.6 lb. Sale en el próximo vuelo y te aviso apenas esté listo para retirar.",
    },
    {
      entra: "¿Cuánto cobran por libra?",
      responde: "$4.99 la libra de 1 a 5 libras y $4.49 la libra desde 6 libras, más el 13% de IVA sobre el valor en aduana de tu compra. Si me dices cuánto pagaste y cuánto pesa, te lo calculo.",
    },
    {
      entra: "¿Hasta qué hora abren el sábado en Plaza Emanuel?",
      responde: "El sábado Plaza Emanuel atiende de 8:30 a. m. a 12:30 p. m. Para retirar lleva tu DUI 😊",
    },
    {
      entra: "¿Cuánto se tarda en llegar lo que compro?",
      responde: "Despachamos desde Miami tres veces por semana, y por avión llega de 3 a 5 días hábiles después del despacho.",
    },
    {
      entra: "¿Ustedes compran por mí?",
      responde: "No compramos por ti: te damos una dirección en Estados Unidos para que compres en tus tiendas favoritas, y nosotros te lo traemos a El Salvador.",
    },
    {
      entra: "Compré tres cosas en SHEIN, ¿se juntan en un solo paquete?",
      responde: "No consolidamos: cada paquete se recibe, se pesa y se cobra por separado, con un mínimo de 1 libra.",
    },
    {
      entra: "¿Aceptan tarjeta?",
      responde: "Sí: transferencia, link de pago, tarjeta de crédito o débito, y efectivo al retirar en sucursal.",
    },
    {
      entra: "Mi compra es de $350, ¿cuánto pago de impuestos?",
      responde: "Desde $300 por vuelo, aduana cobra IVA más DAI según el tipo de producto. Te paso con un asesor para calcularlo bien antes de que compres.",
    },
  ],
  contactos: [
    { nombre: "Kevin Alexander Flores", canal: "whatsapp", telefono: "50393108274", departamento: "atencion" },
    { nombre: "Stephanie Molina", canal: "instagram", handle: "@stephmolina.sv", departamento: "atencion" },
    { nombre: "Héctor Mauricio Ruiz", canal: "whatsapp", telefono: "50394219385", departamento: "prealertas" },
    { nombre: "Gloria Elizabeth Pérez", canal: "facebook", handle: "Gloria Pérez", departamento: "entregas" },
  ],
};
