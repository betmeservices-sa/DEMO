// Datos semilla del tenant "chalatenango" (Caja de Credito de Chalatenango).
//
// El trabajo de la Caja se parte en tres areas, y la bandeja tambien: lo que
// pregunta cualquiera (horarios, agencias, cuentas, credito), los cobros y las
// tarjetas de credito. Cada conversacion de muestra cae en una de las tres.
//
// Las personas, los telefonos y los montos de cada cliente son INVENTADOS. Los
// telefonos van con 9 despues del 503, una serie que en El Salvador no se
// asigna: asi nadie le escribe por error a un numero ajeno desde el demo.
// Lo que se dice de la Caja (horarios, agencias, productos, canales) sale de
// su sitio; lo que no esta publicado, no se afirma: se lo confirma un asesor.

import type { TenantSeed } from "../types";

const ME = "me";

export const chalatenangoSeed: TenantSeed = {
  ME,
  departments: [
    { id: "consultas", nombre: "Consultas generales", color: "#006341" },
    { id: "cobranza", nombre: "Cobros", color: "#a14b00" },
    { id: "tarjetas", nombre: "Tarjetas de crédito", color: "#2b5d8c" },
  ],
  staff: [
    { id: ME, nombre: "Patricia Escobar", rol: "gerente_marketing", departamento: "consultas", iniciales: "PE" },
    { id: "s2", nombre: "Mariela Alas", rol: "recepcion", departamento: "consultas", iniciales: "MA" },
    { id: "s3", nombre: "Óscar Guardado", rol: "medico", departamento: "cobranza", iniciales: "OG" },
    { id: "s4", nombre: "Wendy Serrano", rol: "medico", departamento: "cobranza", iniciales: "WS" },
    { id: "s5", nombre: "Rafael Orellana", rol: "medico", departamento: "tarjetas", iniciales: "RO" },
    { id: "s6", nombre: "Karen Landaverde", rol: "medico", departamento: "consultas", iniciales: "KL" },
    { id: "s7", nombre: "Roberto Mejía", rol: "jefe", departamento: "cobranza", iniciales: "RM" },
  ],
  // Los doce primeros tienen conversacion abierta en la bandeja; el resto llena
  // Contactos, que con doce se veria vacia para una Caja con tres agencias.
  contacts: [
    { id: "c1", nombre: "Ana Gloria Rivera", telefono: "50391204417", canal: "whatsapp", notas: "Socia de la agencia Plaza Suiza. Pregunta por horario de sábado.", tags: ["Horarios y agencias"] },
    { id: "c2", nombre: "Yesenia Hernández", handle: "@yese.hdz", canal: "instagram", notas: "Quiere abrir la cuenta de ahorro infantil para su hija de 9 años.", tags: ["Ahorro"] },
    { id: "c3", nombre: "José Mauricio Tobar", handle: "Mauricio Tobar", canal: "facebook", notas: "No es socio. Pregunta si puede pagar recibos en ventanilla.", tags: ["Horarios y agencias"] },
    { id: "c4", nombre: "Fredy Antonio Menjívar", telefono: "50392318840", correo: "fredy.menjivar@gmail.com", canal: "whatsapp", notas: "Busca crédito de consumo para comprar un carro usado. Trabaja en la alcaldía, tiene constancia salarial.", tags: ["Interés en crédito"] },
    { id: "c5", nombre: "Marta Lidia Galdámez", telefono: "50393017726", canal: "whatsapp", notas: "Crédito popular, cuota semanal vencida 6 días. Promete pagar el viernes 9, cuando cobra la venta del mercado.", tags: ["Cuota vencida", "Promesa de pago"] },
    { id: "c6", nombre: "Carlos Humberto Ayala", telefono: "50394450193", canal: "whatsapp", notas: "Dice que pagó la cuota en un Fede Punto Vecino. Verificar el abono antes de volver a escribirle.", tags: ["Cuota vencida"] },
    { id: "c7", nombre: "Rosa Amelia Quijada", handle: "Rosa Quijada", canal: "facebook", notas: "Perdió el empleo en septiembre. Pide ver opciones para la cuota del crédito de vivienda.", tags: ["Pide arreglo de pago"] },
    { id: "c8", nombre: "Nelson Alexander Pineda", telefono: "50395562081", canal: "whatsapp", notas: "Pregunta cuánto debe para ponerse al día. Pendiente de verificar identidad.", tags: ["Cuota vencida"] },
    { id: "c9", nombre: "Gabriel Eduardo Recinos", telefono: "50396673352", correo: "grecinos@outlook.com", canal: "whatsapp", notas: "Presolicitud de tarjeta de crédito por el sitio. Esperando que lo contacte un ejecutivo.", tags: ["Solicitud de tarjeta"] },
    { id: "c10", nombre: "Daniela Sofía Mena", handle: "@danimena.sv", canal: "instagram", notas: "Extravió la tarjeta de crédito. Se le indicó el bloqueo inmediato.", tags: ["Bloqueo de tarjeta"] },
    { id: "c11", nombre: "Luis Enrique Portillo", telefono: "50397784613", canal: "whatsapp", notas: "Quiere canjear sus Fedepuntos por efectivo.", tags: ["Fedepuntos"] },
    { id: "c12", nombre: "Brenda Carolina Aguilar", telefono: "50398815924", correo: "brenda.aguilar@gmail.com", canal: "whatsapp", notas: "Viaja a Estados Unidos el 20 de octubre. Va a reportar el viaje de su tarjeta.", tags: ["Solicitud de tarjeta"] },

    { id: "c13", nombre: "Santos Efraín Alvarado", telefono: "50399026135", canal: "whatsapp", notas: "Crédito empresarial de su ferretería en Tejutla. Paga puntual; pidió aviso dos días antes de cada cuota.", tags: ["Interés en crédito"] },
    { id: "c14", nombre: "Glenda Marisol Orellana", telefono: "50391137246", canal: "whatsapp", notas: "Promesa de pago incumplida el 30 de septiembre. Segunda promesa para el 10 de octubre.", tags: ["Promesa de pago", "Cuota vencida"] },
    { id: "c15", nombre: "Héctor Armando Lemus", telefono: "50392248357", correo: "hlemus@gmail.com", canal: "whatsapp", notas: "Tarjeta de crédito aprobada. Pasa a recogerla a la Oficina Central.", tags: ["Solicitud de tarjeta"] },
    { id: "c16", nombre: "Iris Yamileth Cañas", telefono: "50393359468", canal: "whatsapp", notas: "Socia de El Coyolito. Pregunta por depósito a plazo.", tags: ["Ahorro"] },
    { id: "c17", nombre: "Wilfredo Antonio Chávez", telefono: "50394460579", canal: "whatsapp", notas: "Pidió que no lo llamen al trabajo. Solo mensajes después de las 5.", tags: ["Cuota vencida"] },
    { id: "c18", nombre: "Ruth Noemí Dubón", telefono: "50395571680", canal: "whatsapp", notas: "Quiere aumentar el límite de su tarjeta. Pasarle el caso a Rafael.", tags: ["Solicitud de tarjeta"] },
  ],
  conversations: [
    // Consultas generales
    { id: "v1", canal: "whatsapp", contactId: "c1", departamento: "consultas", estado: "resuelto", asignadoA: "s2", noLeidos: 0, ultimoMensajeTs: "2026-10-07T08:14:00" },
    { id: "v2", canal: "instagram", contactId: "c2", departamento: "consultas", estado: "nuevo", noLeidos: 2, ultimoMensajeTs: "2026-10-07T09:52:00" },
    { id: "v3", canal: "facebook", contactId: "c3", departamento: "consultas", estado: "resuelto", asignadoA: "s2", noLeidos: 0, ultimoMensajeTs: "2026-10-06T16:40:00" },
    { id: "v4", canal: "whatsapp", contactId: "c4", departamento: "consultas", estado: "en_progreso", asignadoA: "s6", noLeidos: 1, ultimoMensajeTs: "2026-10-07T10:21:00" },
    // Cobros
    { id: "v5", canal: "whatsapp", contactId: "c5", departamento: "cobranza", estado: "en_progreso", asignadoA: "s3", noLeidos: 0, ultimoMensajeTs: "2026-10-07T09:05:00" },
    { id: "v6", canal: "whatsapp", contactId: "c6", departamento: "cobranza", estado: "en_progreso", asignadoA: "s4", noLeidos: 1, ultimoMensajeTs: "2026-10-07T08:47:00" },
    { id: "v7", canal: "facebook", contactId: "c7", departamento: "cobranza", estado: "nuevo", noLeidos: 2, ultimoMensajeTs: "2026-10-07T10:03:00" },
    { id: "v8", canal: "whatsapp", contactId: "c8", departamento: "cobranza", estado: "nuevo", noLeidos: 1, ultimoMensajeTs: "2026-10-07T10:36:00" },
    // Tarjetas de credito
    { id: "v9", canal: "whatsapp", contactId: "c9", departamento: "tarjetas", estado: "nuevo", noLeidos: 1, ultimoMensajeTs: "2026-10-07T10:12:00" },
    { id: "v10", canal: "instagram", contactId: "c10", departamento: "tarjetas", estado: "en_progreso", asignadoA: "s5", noLeidos: 0, ultimoMensajeTs: "2026-10-07T07:58:00" },
    { id: "v11", canal: "whatsapp", contactId: "c11", departamento: "tarjetas", estado: "resuelto", asignadoA: "s5", noLeidos: 0, ultimoMensajeTs: "2026-10-06T15:22:00" },
    { id: "v12", canal: "whatsapp", contactId: "c12", departamento: "tarjetas", estado: "en_progreso", asignadoA: "s5", noLeidos: 0, ultimoMensajeTs: "2026-10-07T09:30:00" },
  ],
  messages: [
    { id: "m1", conversationId: "v1", autor: "cliente", texto: "Buenos días. ¿La agencia de Plaza Suiza abre este sábado? ¿A qué hora?", ts: "2026-10-07T08:10:00" },
    { id: "m2", conversationId: "v1", autor: "staff", staffId: "s2", texto: "Buenos días, doña Ana. Sí, la agencia Plaza Suiza atiende el sábado de 8:00 a. m. a 12:00 m.", ts: "2026-10-07T08:14:00" },

    { id: "m3", conversationId: "v2", autor: "cliente", texto: "Hola, quiero abrirle una cuenta de ahorro a mi hija de 9 años.", ts: "2026-10-07T09:50:00" },
    { id: "m4", conversationId: "v2", autor: "cliente", texto: "¿Qué tengo que llevar?", ts: "2026-10-07T09:52:00" },

    { id: "m5", conversationId: "v3", autor: "cliente", texto: "¿Puedo pagar el recibo de la luz ahí aunque no tenga cuenta con ustedes?", ts: "2026-10-06T16:31:00" },
    { id: "m6", conversationId: "v3", autor: "staff", staffId: "s2", texto: "Claro que sí. No necesita cuenta de ahorro para pagar sus recibos de agua, energía, teléfono o cable en nuestras agencias.", ts: "2026-10-06T16:40:00" },

    { id: "m7", conversationId: "v4", autor: "cliente", texto: "Buenas, me interesa un crédito para comprar un carro usado. ¿Cómo hago?", ts: "2026-10-07T10:02:00" },
    { id: "m8", conversationId: "v4", autor: "staff", staffId: "s6", texto: "Con gusto, don Fredy. Para vehículo aplica el crédito de consumo. ¿Usted es empleado o tiene negocio propio?", ts: "2026-10-07T10:09:00" },
    { id: "m9", conversationId: "v4", autor: "cliente", texto: "Empleado, trabajo en la alcaldía. Tengo constancia de salario.", ts: "2026-10-07T10:21:00" },

    { id: "m10", conversationId: "v5", autor: "staff", staffId: "s3", texto: "Buenos días, doña Marta. Le escribimos de la Caja: su cuota semanal del crédito popular quedó pendiente desde el martes pasado. ¿Le puedo ayudar a ponerse al día?", ts: "2026-10-07T08:40:00" },
    { id: "m11", conversationId: "v5", autor: "cliente", texto: "Sí, disculpe. El viernes cobro lo del mercado y paso a pagar.", ts: "2026-10-07T08:58:00" },
    { id: "m12", conversationId: "v5", autor: "staff", staffId: "s3", texto: "Perfecto. Queda anotado su compromiso de pago para el viernes 9 de octubre. Gracias por avisar.", ts: "2026-10-07T09:05:00" },

    { id: "m13", conversationId: "v6", autor: "cliente", texto: "Ya pagué la cuota ayer en el Fede Punto Vecino de la Farmacia San Lucas. ¿Por qué me siguen avisando?", ts: "2026-10-07T08:47:00" },

    { id: "m14", conversationId: "v7", autor: "cliente", texto: "Buenas tardes. Me quedé sin trabajo en septiembre y no voy a poder con la cuota completa de la casa.", ts: "2026-10-07T09:58:00" },
    { id: "m15", conversationId: "v7", autor: "cliente", texto: "¿Hay alguna forma de arreglar los pagos?", ts: "2026-10-07T10:03:00" },

    { id: "m16", conversationId: "v8", autor: "cliente", texto: "¿Cuánto debo para ponerme al día con el préstamo?", ts: "2026-10-07T10:36:00" },

    { id: "m17", conversationId: "v9", autor: "cliente", texto: "Llené la presolicitud de la tarjeta de crédito en la página. ¿Cuánto se tardan en llamar?", ts: "2026-10-07T10:12:00" },

    { id: "m18", conversationId: "v10", autor: "cliente", texto: "Perdí mi tarjeta de crédito anoche, ¿qué hago?", ts: "2026-10-07T07:41:00" },
    { id: "m19", conversationId: "v10", autor: "staff", staffId: "s5", texto: "Bloquéela de inmediato por Chatbot Fede, al WhatsApp 2221-3333, que atiende las 24 horas. Ya bloqueada, le ayudamos con lo que sigue.", ts: "2026-10-07T07:58:00" },

    { id: "m20", conversationId: "v11", autor: "cliente", texto: "¿Los Fedepuntos se pueden cambiar por dinero?", ts: "2026-10-06T15:10:00" },
    { id: "m21", conversationId: "v11", autor: "staff", staffId: "s5", texto: "Sí, don Luis. Con la tarjeta de crédito acumula un Fedepunto por cada dólar en compras y los puede canjear por efectivo.", ts: "2026-10-06T15:22:00" },

    { id: "m22", conversationId: "v12", autor: "cliente", texto: "Me voy a Estados Unidos el 20. ¿Tengo que avisar algo de la tarjeta?", ts: "2026-10-07T09:24:00" },
    { id: "m23", conversationId: "v12", autor: "staff", staffId: "s5", texto: "Sí, conviene reportar el viaje antes de salir. Lo puede hacer desde el sitio, en Reporte de Viajes, o por Chatbot Fede.", ts: "2026-10-07T09:30:00" },
  ],
  internalChannels: [
    { id: "ic1", nombre: "general", tipo: "canal", miembros: [ME, "s2", "s3", "s4", "s5", "s6", "s7"] },
    { id: "ic2", nombre: "cobros", tipo: "canal", miembros: [ME, "s3", "s4", "s7"] },
    { id: "ic3", nombre: "tarjetas", tipo: "canal", miembros: [ME, "s5"] },
    { id: "dm1", nombre: "Roberto Mejía", tipo: "dm", miembros: [ME, "s7"] },
    { id: "dm2", nombre: "Rafael Orellana", tipo: "dm", miembros: [ME, "s5"] },
  ],
  internalMessages: [
    { id: "im1", channelId: "ic1", staffId: ME, texto: "Buenos días. Hoy primero las cuotas que vencen hoy y las promesas de mañana; después lo demás.", ts: "2026-10-07T07:30:00" },
    { id: "im2", channelId: "ic2", staffId: "s3", texto: "Doña Marta Galdámez prometió para el viernes. Ya quedó anotado.", ts: "2026-10-07T09:06:00" },
    { id: "im3", channelId: "ic2", staffId: "s4", texto: "Don Carlos Ayala dice que pagó en la Farmacia San Lucas. ¿Alguien me confirma si ya entró el abono?", ts: "2026-10-07T08:50:00" },
    { id: "im4", channelId: "ic2", staffId: "s7", texto: "Lo reviso con caja central y te aviso. Mientras, no le mandemos más recordatorios.", ts: "2026-10-07T08:55:00" },
    { id: "im5", channelId: "ic3", staffId: "s5", texto: "Entraron tres presolicitudes de tarjeta por el sitio desde ayer. Las llamo antes del mediodía.", ts: "2026-10-07T08:20:00" },
    { id: "im6", channelId: "dm1", staffId: "s7", texto: "El caso de doña Rosa Quijada (vivienda) hay que verlo con el comité, no por chat.", ts: "2026-10-07T10:05:00" },
    { id: "im7", channelId: "dm1", staffId: ME, texto: "De acuerdo. Que la llame Wendy hoy para agendarle cita en la Oficina Central.", ts: "2026-10-07T10:08:00" },
  ],
  // La Caja tiene Facebook, Instagram y YouTube, pero este panel no publica:
  // atiende lo que entra. Los mensajes de Facebook e Instagram siguen en la
  // bandeja; el modulo de redes queda fuera de su menu.
  socialPosts: [],
  socialStats: [],
  metrics: [
    { label: "Consultas generales hoy", valor: 86, delta: 12 },
    { label: "Gestiones de cobro hoy", valor: 64, delta: 9 },
    { label: "Promesas de pago", valor: 38, delta: 21 },
    { label: "Solicitudes de tarjeta", valor: 27, delta: 15 },
    { label: "Atendidas por IA", valor: "74%", delta: 8 },
    { label: "Primera respuesta", valor: "1 min", delta: -35 },
  ],
};
