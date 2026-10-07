// Guion de bandeja en vivo de la Caja de Credito de Chalatenango.
// Lo que de verdad le escriben a una caja de credito de pueblo y de ciudad:
// horarios y agencias, una cuota atrasada, la tarjeta. Las respuestas solo dicen
// lo que la Caja publica; lo que no esta publicado lo confirma un asesor.
import type { TenantSimulacion } from "../types";

export const chalatenangoSimulacion: TenantSimulacion = {
  turnos: [
    {
      entra: "Buenas, ¿a qué hora abren el sábado en la oficina de Chalatenango?",
      responde:
        "Buenos días. La Oficina Central atiende el sábado hasta las 4:00 p. m. Entre semana, de 7:00 a. m. a 4:45 p. m.",
    },
    {
      entra: "Me llegó un aviso de que tengo la cuota atrasada. Me pagan el 15.",
      responde:
        "Gracias por escribir. Por seguridad, ¿me confirma su nombre completo y los últimos cuatro dígitos de su DUI? Así dejamos anotado el pago para el 15.",
    },
    {
      entra: "¿Qué necesito para sacar la tarjeta de crédito?",
      responde:
        "Puede empezar con la presolicitud en nuestro sitio o en cualquier agencia. Un ejecutivo de negocios lo contacta y le confirma los requisitos.",
    },
    {
      entra: "¿Puedo pagar la cuota del préstamo en un Fede Punto Vecino?",
      responde:
        "Sí, en los Fede Punto Vecino puede abonar a su préstamo y a su tarjeta de crédito, hasta mil dólares por operación.",
    },
    {
      entra: "Perdí la tarjeta, ayuda por favor.",
      responde:
        "Bloquéela de inmediato por Chatbot Fede, al WhatsApp 2221-3333, que atiende las 24 horas. Ya bloqueada, le ayudamos con lo que sigue.",
    },
    {
      entra: "Ya pagué ayer en la agencia, ¿por qué me siguen avisando?",
      responde:
        "Disculpe la molestia. ¿Me indica la fecha y dónde hizo el pago? Lo verificamos y, si ya está aplicado, deja de recibir avisos.",
    },
    {
      entra: "Quiero un crédito para ampliar mi casa.",
      responde:
        "Con gusto. El crédito de vivienda cubre mejoras y ampliación. ¿Prefiere que un asesor lo llame o pasar a una agencia?",
    },
    {
      entra: "¿Cuántos Fedepuntos me dan por compra?",
      responde:
        "Con la tarjeta de crédito acumula un Fedepunto por cada dólar en compras, y los puede canjear por efectivo.",
    },
    {
      entra: "No voy a poder pagar la cuota completa este mes.",
      responde:
        "Le entiendo. ¿Cuánto podría abonar y en qué fecha? Si necesita revisar el plan de pagos, un asesor lo contacta.",
    },
  ],
  contactos: [
    { nombre: "Edwin Alexander Rauda", canal: "whatsapp", telefono: "50391402268", departamento: "cobranza" },
    { nombre: "Claudia Ivette Serrano", canal: "instagram", handle: "@ivette.serrano", departamento: "tarjetas" },
    { nombre: "Miguel Ángel Tejada", canal: "facebook", handle: "Miguel Tejada", departamento: "consultas" },
    { nombre: "Sonia Elizabeth Mejía", canal: "whatsapp", telefono: "50392513379", departamento: "consultas" },
    { nombre: "Kevin Josué Guardado", canal: "whatsapp", telefono: "50393624480", departamento: "tarjetas" },
  ],
};
