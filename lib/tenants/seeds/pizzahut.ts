// Bandeja de muestra de Pizza Hut (tenant "pizzahut").
//
// Organizadores que escriben por WhatsApp, Instagram y Messenger para invitar
// a Pizza Hut a su evento; Daniela (IA) toma los mismos datos que en la
// llamada y un asesor toma la conversación cuando hace falta. Son los mismos
// organizadores de la muestra de Eventos (lib/eventos/semilla.ts), con los
// mismos teléfonos.
//
// TODO ficticio. Teléfonos en el rango 9xxx, que no existe en El Salvador. Los
// ids de las conversaciones empiezan con "sim-": así la bandeja las trata como
// simuladas y responderles NUNCA manda un mensaje de verdad.

import type { TenantSeed } from "../types";

const ME = "me";

function haceMin(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}
const haceH = (h: number) => haceMin(Math.round(h * 60));

export const pizzahutSeed: TenantSeed = {
  ME,
  departments: [
    { id: "eventos", nombre: "Eventos", color: "#c8102e" },
    { id: "atencion", nombre: "Servicio al cliente", color: "#4f4c4d" },
  ],
  staff: [
    { id: ME, nombre: "Gerencia de Mercadeo", rol: "gerente_marketing", departamento: "eventos", iniciales: "GM" },
    { id: "s2", nombre: "Andrea Molina", rol: "medico", departamento: "eventos", iniciales: "AM" },
    { id: "s3", nombre: "Ricardo Ayala", rol: "medico", departamento: "eventos", iniciales: "RA" },
    { id: "s4", nombre: "Gabriela Quintanilla", rol: "medico", departamento: "eventos", iniciales: "GQ" },
    { id: "s5", nombre: "Mauricio Bonilla", rol: "jefe", departamento: "eventos", iniciales: "MB" },
    { id: "s6", nombre: "Paola Hernández", rol: "recepcion", departamento: "atencion", iniciales: "PH" },
  ],
  contacts: [
    { id: "c1", nombre: "Karla Rosales", telefono: "+503 9335 0218", correo: "karla.rosales@mareaalta.example", canal: "whatsapp", tags: ["Festival"], notas: "Colectivo Marea Alta. Festival Gastronómico de Playa en El Tunco." },
    { id: "c2", nombre: "Sandra Escalante", telefono: "+503 9640 2258", correo: "actividades@losalmendros.example", canal: "whatsapp", tags: ["Educativo"], notas: "Colegio Bilingüe Los Almendros. Festival deportivo." },
    { id: "c3", nombre: "Iván Saravia", telefono: "+503 9506 7719", canal: "whatsapp", tags: ["Corporativo"], notas: "Conecta Servicios de Contacto. Inauguración de oficinas." },
    { id: "c4", nombre: "Marta Alicia Guevara", telefono: "+503 9723 0495", canal: "whatsapp", tags: ["Comunitario", "Recurrente"], notas: "Asociación Comunal Brisas del Lago, Usulután." },
    { id: "c5", nombre: "Fernando Aguilar", handle: "@expo.ingenio", canal: "instagram", tags: ["Educativo"] },
    { id: "c6", nombre: "Tomás Henríquez", handle: "@rutasabores.sv", canal: "instagram", tags: ["Festival"] },
    { id: "c7", nombre: "Rosa Elena Cáceres", handle: "Rosa Elena Cáceres", canal: "facebook", tags: ["Comunitario"] },
    { id: "c8", nombre: "Gabriel Zelaya", handle: "Cine Bajo las Estrellas", canal: "facebook" },
    { id: "c9", nombre: "Andrés Navarro", handle: "@andresnav.gaming", canal: "instagram" },
    { id: "c10", nombre: "Lorena Castro", telefono: "+503 9811 4420", canal: "whatsapp" },
  ],
  conversations: [
    { id: "sim-ph1", canal: "whatsapp", contactId: "c1", departamento: "eventos", estado: "en_progreso", asignadoA: "s2", noLeidos: 1, ultimoMensajeTs: haceMin(18) },
    { id: "sim-ph2", canal: "whatsapp", contactId: "c2", departamento: "eventos", estado: "nuevo", noLeidos: 1, ultimoMensajeTs: haceH(11.6) },
    { id: "sim-ph3", canal: "whatsapp", contactId: "c3", departamento: "eventos", estado: "nuevo", noLeidos: 2, ultimoMensajeTs: haceMin(9) },
    { id: "sim-ph4", canal: "whatsapp", contactId: "c4", departamento: "eventos", estado: "en_progreso", asignadoA: "s5", noLeidos: 0, ultimoMensajeTs: haceH(20) },
    { id: "sim-ph5", canal: "instagram", contactId: "c5", departamento: "eventos", estado: "en_progreso", asignadoA: "s2", noLeidos: 0, ultimoMensajeTs: haceH(52) },
    { id: "sim-ph6", canal: "instagram", contactId: "c6", departamento: "eventos", estado: "resuelto", asignadoA: "s3", noLeidos: 0, ultimoMensajeTs: haceH(100) },
    { id: "sim-ph7", canal: "facebook", contactId: "c7", departamento: "eventos", estado: "en_progreso", asignadoA: "s4", noLeidos: 0, ultimoMensajeTs: haceH(88) },
    { id: "sim-ph8", canal: "facebook", contactId: "c8", departamento: "eventos", estado: "en_progreso", asignadoA: "s2", noLeidos: 1, ultimoMensajeTs: haceH(26) },
    { id: "sim-ph9", canal: "instagram", contactId: "c9", departamento: "eventos", estado: "nuevo", noLeidos: 1, ultimoMensajeTs: haceMin(3) },
    { id: "sim-ph10", canal: "whatsapp", contactId: "c10", departamento: "atencion", estado: "resuelto", noLeidos: 0, ultimoMensajeTs: haceH(5) },
  ],
  messages: [
    // sim-ph1: Karla, festival de playa. Daniela tomó los datos y Andrea siguió.
    { id: "m1", conversationId: "sim-ph1", autor: "cliente", texto: "Buenas tardes. Estamos organizando el Festival Gastronómico de Playa en El Tunco y queremos invitar a Pizza Hut a vender.", ts: haceH(31.4) },
    { id: "m2", conversationId: "sim-ph1", autor: "staff", staffId: "ia", texto: "¡Buenas tardes! Gracias por tomar en cuenta a Pizza Hut. ¿Para qué fecha es el festival y en qué horario?", ts: haceH(31.4) },
    { id: "m3", conversationId: "sim-ph1", autor: "cliente", texto: "Son dos días, sábado y domingo, de 10 de la mañana a 9 de la noche.", ts: haceH(31.3) },
    { id: "m4", conversationId: "sim-ph1", autor: "staff", staffId: "ia", texto: "Perfecto. ¿Cuántas personas esperan y la entrada es gratuita?", ts: haceH(31.3) },
    { id: "m5", conversationId: "sim-ph1", autor: "cliente", texto: "Unas 4,500 personas en los dos días. La entrada es libre.", ts: haceH(31.2) },
    { id: "m6", conversationId: "sim-ph1", autor: "staff", staffId: "ia", texto: "Gracias. ¿Qué condiciones tienen para los vendedores y Pizza Hut sería la única marca de pizza?", ts: haceH(31.2) },
    { id: "m7", conversationId: "sim-ph1", autor: "cliente", texto: "Es una cuota fija de $600 por los dos días. No hay exclusividad, vamos a tener como 25 vendedores de comida. La energía y el agua van incluidas.", ts: haceH(31.1) },
    { id: "m8", conversationId: "sim-ph1", autor: "staff", staffId: "ia", texto: "Anotado. Para que un asesor le contacte, ¿me confirma su nombre, su organización y su correo?", ts: haceH(31.1) },
    { id: "m9", conversationId: "sim-ph1", autor: "cliente", texto: "Karla Rosales, del Colectivo Marea Alta. karla.rosales@mareaalta.example", ts: haceH(31) },
    { id: "m10", conversationId: "sim-ph1", autor: "staff", staffId: "ia", texto: "Gracias, Karla. Resumo: Festival Gastronómico de Playa en El Tunco, dos días, 4,500 personas, cuota de $600, sin exclusividad y con energía y agua. Un asesor del equipo de eventos le va a contactar.", ts: haceH(31) },
    { id: "m11", conversationId: "sim-ph1", autor: "staff", staffId: "s2", texto: "Hola Karla, le saluda Andrea Molina, del equipo de eventos de Pizza Hut. ¿Me podría compartir el plano del festival con la ubicación de los puestos?", ts: haceMin(40) },
    { id: "m12", conversationId: "sim-ph1", autor: "cliente", texto: "Claro, Andrea. Se lo mando en un momento. Los puestos de comida van frente al escenario.", ts: haceMin(18) },

    // sim-ph2: Sandra, festival deportivo del colegio.
    { id: "m13", conversationId: "sim-ph2", autor: "cliente", texto: "Hola, buenas noches. Soy Sandra Escalante, del Colegio Bilingüe Los Almendros. Vamos a tener nuestro festival deportivo y nos gustaría que Pizza Hut esté vendiendo.", ts: haceH(12.2) },
    { id: "m14", conversationId: "sim-ph2", autor: "staff", staffId: "ia", texto: "¡Buenas noches, Sandra! Gracias por tomarnos en cuenta. ¿Para qué fecha es y cuántas personas esperan?", ts: haceH(12.2) },
    { id: "m15", conversationId: "sim-ph2", autor: "cliente", texto: "Es en dos semanas y media, de 7 a 2. Seríamos unas 900 personas entre alumnos y papás. Pedimos el 10% de lo que se venda para la asociación de padres.", ts: haceH(12) },
    { id: "m16", conversationId: "sim-ph2", autor: "staff", staffId: "ia", texto: "Anotado. ¿Pizza Hut sería la única marca de pizza y el espacio tiene energía y agua?", ts: haceH(12) },
    { id: "m17", conversationId: "sim-ph2", autor: "cliente", texto: "Sí, solo ustedes. Tenemos mesa en la cancha techada, con tomacorriente y agua.", ts: haceH(11.6) },

    // sim-ph3: Iván, inauguración de oficinas. Daniela pide el horario.
    { id: "m18", conversationId: "sim-ph3", autor: "cliente", texto: "Buen día. Vamos a inaugurar oficinas y queremos pizza para unas 700 personas.", ts: haceH(4.2) },
    { id: "m19", conversationId: "sim-ph3", autor: "staff", staffId: "ia", texto: "¡Buen día! Gracias por pensar en Pizza Hut. ¿Para qué fecha es la inauguración y en qué horario sería el convivio?", ts: haceH(4.2) },
    { id: "m20", conversationId: "sim-ph3", autor: "cliente", texto: "Es en 12 días en nuestras oficinas de Antiguo Cuscatlán. El horario todavía no lo tenemos.", ts: haceMin(12) },
    { id: "m21", conversationId: "sim-ph3", autor: "cliente", texto: "Mi nombre es Iván Saravia, coordinador de operaciones de Conecta.", ts: haceMin(9) },

    // sim-ph4: Marta, torneo comunal. Mauricio tomó la conversación.
    { id: "m22", conversationId: "sim-ph4", autor: "cliente", texto: "Buenas, somos la directiva comunal de Brisas del Lago. Hacemos un torneo relámpago y una feria cada año para la casa comunal.", ts: haceH(46.5) },
    { id: "m23", conversationId: "sim-ph4", autor: "staff", staffId: "ia", texto: "¡Buenas! Gracias por tomarnos en cuenta. ¿Cuántas personas llegaron el año pasado y qué le proponen a Pizza Hut?", ts: haceH(46.5) },
    { id: "m24", conversationId: "sim-ph4", autor: "cliente", texto: "Llegaron como 1,000. Queremos pedir un donativo de pizzas para los equipos y que ustedes vendan en la feria sin costo.", ts: haceH(46) },
    { id: "m25", conversationId: "sim-ph4", autor: "staff", staffId: "s5", texto: "Buenas tardes, doña Marta. Soy Mauricio Bonilla, de eventos. Estamos revisando la solicitud del donativo; ¿cuántos equipos participan?", ts: haceH(22) },
    { id: "m26", conversationId: "sim-ph4", autor: "cliente", texto: "Son 16 equipos de 10 jugadores. Muchas gracias por la atención.", ts: haceH(20) },

    // sim-ph5: Fernando, Expo Ingenio (Instagram).
    { id: "m27", conversationId: "sim-ph5", autor: "cliente", texto: "Hola! Somos el comité de Expo Ingenio, la feria de proyectos de la Ciudad Universitaria. ¿Les interesaría tener un stand?", ts: haceH(70) },
    { id: "m28", conversationId: "sim-ph5", autor: "staff", staffId: "ia", texto: "¡Hola! Gracias por la invitación. ¿Cuántas personas esperan y qué condiciones tienen para los stands?", ts: haceH(70) },
    { id: "m29", conversationId: "sim-ph5", autor: "cliente", texto: "Unos 3,000 estudiantes. El stand no tiene costo y Pizza Hut sería la única pizza. Nos gustaría además que donaran pizzas para el jurado y poner su logo en el premio.", ts: haceH(69.8) },
    { id: "m30", conversationId: "sim-ph5", autor: "staff", staffId: "s2", texto: "Hola Fernando, le escribe Andrea, del equipo de eventos. Estamos revisando lo del jurado con mercadeo. ¿Cuántas personas son en el jurado?", ts: haceH(54) },
    { id: "m31", conversationId: "sim-ph5", autor: "cliente", texto: "Son 12 jurados. ¡Quedamos atentos!", ts: haceH(52) },

    // sim-ph6: Tomás, food trucks en Ataco. Descartada por aforo.
    { id: "m32", conversationId: "sim-ph6", autor: "cliente", texto: "Buenas! Organizamos un encuentro de food trucks en Ataco, ¿les interesa?", ts: haceH(120) },
    { id: "m33", conversationId: "sim-ph6", autor: "staff", staffId: "ia", texto: "¡Buenas! Gracias por tomarnos en cuenta. ¿Cuántas personas esperan y qué condiciones tienen?", ts: haceH(120) },
    { id: "m34", conversationId: "sim-ph6", autor: "cliente", texto: "Unas 600 personas en el fin de semana, cuota de $300. No hay energía ni agua en el parque.", ts: haceH(119.5) },
    { id: "m35", conversationId: "sim-ph6", autor: "staff", staffId: "s3", texto: "Gracias, Tomás. Revisamos la propuesta y para esta edición no vamos a participar: el aforo no alcanza para montar un punto de venta. Con gusto vemos la próxima.", ts: haceH(100) },

    // sim-ph7: Rosa Elena, kermés (Messenger).
    { id: "m36", conversationId: "sim-ph7", autor: "cliente", texto: "Buenas tardes, de la pastoral juvenil de Ilobasco. Tenemos una kermés y queríamos invitar a Pizza Hut.", ts: haceH(96) },
    { id: "m37", conversationId: "sim-ph7", autor: "staff", staffId: "ia", texto: "¡Buenas tardes! Gracias por la invitación. ¿Para qué fecha es la kermés y cuántas personas esperan?", ts: haceH(96) },
    { id: "m38", conversationId: "sim-ph7", autor: "cliente", texto: "Es en unas tres semanas, sábado y domingo. Llegan unas 1,500 personas. Pedimos el 10% para la parroquia.", ts: haceH(95.8) },
    { id: "m39", conversationId: "sim-ph7", autor: "staff", staffId: "s4", texto: "Doña Rosa, le saluda Gabriela, de eventos. Ya hablamos por teléfono; le confirmo que llevamos el agua nosotros. ¿Nos regala la hora de montaje?", ts: haceH(89) },
    { id: "m40", conversationId: "sim-ph7", autor: "cliente", texto: "Desde las 8 de la mañana pueden montar. Bendiciones.", ts: haceH(88) },

    // sim-ph8: Gabriel, autocinema (Messenger).
    { id: "m41", conversationId: "sim-ph8", autor: "cliente", texto: "Hola, tenemos un autocinema familiar en el Parque Cuscatlán. ¿Pizza Hut podría vender en las funciones?", ts: haceH(144) },
    { id: "m42", conversationId: "sim-ph8", autor: "staff", staffId: "ia", texto: "¡Hola! Gracias por tomarnos en cuenta. ¿Cuántas personas llegan por función y qué condiciones manejan?", ts: haceH(144) },
    { id: "m43", conversationId: "sim-ph8", autor: "cliente", texto: "Como 1,800 por fin de semana. Pedimos el 15% y serían los únicos de pizza. La idea es llevarles la pizza a los carros.", ts: haceH(143.7) },
    { id: "m44", conversationId: "sim-ph8", autor: "staff", staffId: "s2", texto: "Gabriel, soy Andrea, de eventos. ¿Tienen sistema para que los carros pidan desde su lugar?", ts: haceH(30) },
    { id: "m45", conversationId: "sim-ph8", autor: "cliente", texto: "Sí, piden por un formulario con el número de su espacio. Le mando cómo funciona.", ts: haceH(26) },

    // sim-ph9: Andrés, torneo de videojuegos. Daniela todavía toma datos.
    { id: "m46", conversationId: "sim-ph9", autor: "cliente", texto: "Qué tal! Estamos armando un torneo de videojuegos en el Gimnasio Nacional y buscamos marcas de comida. ¿Les interesa?", ts: haceMin(5) },
    { id: "m47", conversationId: "sim-ph9", autor: "staff", staffId: "ia", texto: "¡Hola! Gracias por pensar en Pizza Hut. ¿Para qué fecha es el torneo y cuántas personas esperan?", ts: haceMin(5) },
    { id: "m48", conversationId: "sim-ph9", autor: "cliente", texto: "En dos meses, un sábado. Esperamos unas 2,000 personas, la entrada cuesta $5.", ts: haceMin(3) },

    // sim-ph10: Lorena quería pedir pizza. Daniela la orienta.
    { id: "m49", conversationId: "sim-ph10", autor: "cliente", texto: "Buenas, quiero pedir 3 pizzas grandes para mi casa.", ts: haceH(5.2) },
    { id: "m50", conversationId: "sim-ph10", autor: "staff", staffId: "ia", texto: "¡Hola! Este canal atiende propuestas para eventos. Para pedidos a domicilio puede usar los canales de pedidos de Pizza Hut. ¿Le ayudo con algo más?", ts: haceH(5.2) },
    { id: "m51", conversationId: "sim-ph10", autor: "cliente", texto: "Ah ok, gracias.", ts: haceH(5) },
  ],
  internalChannels: [
    { id: "ic1", nombre: "eventos", tipo: "canal", miembros: [ME, "s2", "s3", "s4", "s5"] },
    { id: "ic2", nombre: "operaciones", tipo: "canal", miembros: [ME, "s5", "s6"] },
  ],
  internalMessages: [
    { id: "im1", channelId: "ic1", staffId: "s5", texto: "Hay dos propuestas nuevas con más de 24 horas sin contacto. ¿Quién las toma?", ts: haceH(3) },
    { id: "im2", channelId: "ic1", staffId: "s2", texto: "Tomo la del festival de playa; ya le escribí a Karla.", ts: haceH(1) },
  ],
  socialPosts: [],
  socialStats: [],
  metrics: [
    { label: "Conversaciones hoy", valor: 9, delta: 12 },
    { label: "Tiempo de respuesta", valor: "1 min", delta: -40 },
  ],
};
