// Guion de bandeja en vivo de Pizza Hut: organizadores que escriben para
// invitar a Pizza Hut a su evento y Daniela tomando los datos. Todo ficticio;
// teléfonos en el rango 9xxx, que no existe en El Salvador.
import type { TenantSimulacion } from "../types";

export const pizzahutSimulacion: TenantSimulacion = {
  turnos: [
    {
      entra: "Buenas, vamos a tener un concierto en el Estadio Cuscatlán. ¿Les interesa estar vendiendo?",
      responde: "¡Buenas! Gracias por tomar en cuenta a Pizza Hut. ¿Para qué fecha es el concierto y cuántas personas esperan?",
    },
    {
      entra: "Organizamos las fiestas patronales del barrio y queremos invitar a Pizza Hut.",
      responde: "¡Qué gusto! Gracias por la invitación. ¿En qué fechas son las fiestas y en qué lugar se hacen?",
    },
    {
      entra: "Esperamos unas 5,000 personas, la entrada es gratis.",
      responde: "Perfecto, anotado. ¿Qué condiciones tienen para los vendedores: cuota fija, comisión o sin costo?",
    },
    {
      entra: "Cobramos una cuota de $500 por el espacio y ustedes serían los únicos de pizza.",
      responde: "Gracias. ¿El espacio incluye energía eléctrica, agua y toldo?",
    },
    {
      entra: "Es un torneo de fútbol de colegios, en el estadio de Santa Ana.",
      responde: "¡Qué buena actividad! ¿Para qué fecha es la final y cuánta gente llega?",
    },
    {
      entra: "Somos una empresa y queremos pizza para el convivio de fin de año del personal.",
      responde: "Con gusto le ayudo a dejar la solicitud. ¿Para cuántas personas sería y en qué fecha?",
    },
    {
      entra: "¿Cuánto cobran por llevar un puesto a un evento?",
      responde: "Eso lo revisa un asesor según el evento. Le tomo los datos para que le contacte: ¿qué tipo de evento es y para qué fecha?",
    },
    {
      entra: "Mi nombre es Carmen López, de la asociación de vecinos. Mi correo es carmen.lopez@vecinos.example",
      responde: "Gracias, Carmen. Ya tengo todo: un asesor del equipo de eventos le va a contactar para revisar los detalles.",
    },
    {
      entra: "Quiero pedir una pizza a domicilio.",
      responde: "Este canal atiende propuestas para eventos. Para pedidos a domicilio puede usar los canales de pedidos de Pizza Hut. ¿Le ayudo con algo más?",
    },
  ],
  contactos: [
    { nombre: "Ernesto Molina", canal: "whatsapp", telefono: "50391550101", departamento: "eventos" },
    { nombre: "Carmen López", canal: "whatsapp", telefono: "50391550102", departamento: "eventos" },
    { nombre: "Festival Brisa Sur", canal: "instagram", handle: "@festivalbrisasur", departamento: "eventos" },
    { nombre: "Comité Fiestas San José", canal: "facebook", handle: "Comité Fiestas San José", departamento: "eventos" },
    { nombre: "Liga Juvenil de Occidente", canal: "instagram", handle: "@ligajuvenil.occ", departamento: "eventos" },
  ],
};
