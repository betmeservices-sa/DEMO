// Guion de la bandeja en vivo del demo de La Campana (interruptor "En vivo").
import type { TenantSimulacion } from "../types";

export const lacampanaSimulacion: TenantSimulacion = {
  // La bandeja recibe WhatsApp, Instagram y Facebook para todo (menú, promos,
  // eventos, quejas). Lo único que no se toma en Instagram ni Facebook es el
  // pedido de comida: Sofía lo pasa a WhatsApp. Los turnos que arman un pedido
  // llevan `canales: ["whatsapp"]` y la simulación nunca los pone en otra red.
  turnos: [
    {
      entra: "Hola! quiero pedir unos tacos de birria a domicilio",
      responde:
        "¡Con gusto! Los pedidos los tomamos por WhatsApp para confirmarle y avisarle cuando vaya en camino. Escríbame aquí y lo dejamos listo: wa.me/50370399814 📲",
      canales: ["instagram", "facebook"],
    },
    {
      entra: "Buenas, quiero hacer un pedido a domicilio",
      canales: ["whatsapp"],
      responde: "¡Hola! Le saluda Sofía, de La Campana 🔔 Con gusto. ¿Qué le preparamos hoy? Si quiere le recomiendo las promos del día.",
    },
    {
      entra: "¿Cuánto cuesta la parrillada para 2?",
      responde: "La Parrillada para 2 está en $19.95: dos platos con carne y pollo, casamiento, ensalada, chorizo y tortillas. ¿Se la mando a domicilio o la retira?",
    },
    {
      entra: "¿Tienen tacos de birria?",
      responde: "¡Sí! Los Tacos de birria cuestan $9.45: cuatro tacos con su caldo 🌮 ¿Cuántas órdenes le preparo?",
    },
    {
      entra: "Para retirar en Plaza Mundo Soyapango",
      canales: ["whatsapp"],
      responde: "Perfecto, se lo dejo listo en Plaza Mundo Soyapango. ¿A nombre de quién y a qué hora pasa?",
    },
    {
      entra: "Le mando foto de la promo que vi en Instagram",
      responde: "Ya la vi, son los Campacheros: cuatro típicos mexicanos, nachos y cuatro bebidas por $25.99. ¿Se los preparo a domicilio o para retirar?",
    },
    {
      entra: "Queremos cotizar comida para 40 personas",
      responde: "¡Con gusto! Para 40 personas un asesor de eventos le arma la propuesta. ¿Para qué fecha sería?",
    },
    {
      entra: "Mi pedido va tarde, lo pedí hace una hora",
      canales: ["whatsapp"],
      responde: "Lamento la espera. ¿Me da su número de orden o el nombre del pedido? Lo reviso de inmediato con la sucursal.",
    },
    {
      entra: "¿A qué hora abren?",
      responde: "Recibimos pedidos en línea desde las 11:00 a.m. en nuestras 21 sucursales. ¿Le dejo algo programado?",
    },
    {
      entra: "Hi, do you have vegetarian options?",
      responde: "¡Hola! Tenemos el Omelette de vegetales y quesillo y ensaladas que se pueden pedir sin carne. ¿Le preparo alguno?",
    },
    {
      entra: "Listo, ese es todo mi pedido",
      canales: ["whatsapp"],
      responde: "¡Gracias! Su pedido ya pasó a la sucursal y le avisamos cuando vaya en camino 🛵",
    },
  ],
  contactos: [
    { nombre: "Andrea Cáceres", canal: "whatsapp", telefono: "50376221190", departamento: "ventas" },
    { nombre: "Kevin Bonilla", canal: "instagram", handle: "@kevin.bonilla", departamento: "conserjeria" },
    { nombre: "Valeria Zelaya", canal: "facebook", handle: "Valeria Zelaya", departamento: "ventas" },
    { nombre: "Óscar Peña", canal: "whatsapp", telefono: "50361447752", departamento: "eventos" },
    { nombre: "Emily Carter", canal: "instagram", handle: "@emily.carter", departamento: "ventas" },
    { nombre: "Diego Cornejo", canal: "whatsapp", telefono: "50372089943", departamento: "atencion" },
  ],
};
