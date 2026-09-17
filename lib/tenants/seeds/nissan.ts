// Datos semilla de la sala de ventas Nissan (tenant "nissan").
// Timestamps fijos (sin Date.now) para un demo estable, salvo las
// publicaciones, que van relativas porque el muro muestra los ultimos siete
// dias y con fechas fijas nace vacio el dia que se ensena.
//
// Lo que se ve aca es UNA sala de ventas: quien pregunta por un modelo, quien
// quiere probarlo, quien trae un usado a cuenta y quien viene por su entrega.
// El financiamiento aparece de refilon, como aparece en la vida real, pero el
// tablero de este cliente no es de creditos: es de carros que salen del piso.

import type { TenantSeed } from "../types";

const ME = "me";

function haceDias(d: number, hora: number): string {
  const x = new Date();
  x.setDate(x.getDate() - d);
  x.setHours(hora, 0, 0, 0);
  return x.toISOString();
}

export const nissanSeed: TenantSeed = {
  ME,
  departments: [
    { id: "ventas", nombre: "Vehículos Nuevos", color: "#c3002f" },
    { id: "usados", nombre: "Seminuevos Certificados", color: "#f5a623" },
    { id: "seguimiento", nombre: "Entregas", color: "#2baab1" },
    { id: "taller", nombre: "Taller de Servicio", color: "#64748b" },
    { id: "repuestos", nombre: "Repuestos", color: "#9b51e0" },
    { id: "atencion", nombre: "Atención al Cliente", color: "#0f172a" },
  ],
  staff: [
    { id: ME, nombre: "Gerente de Marketing", rol: "gerente_marketing", departamento: "atencion", iniciales: "GM" },
    { id: "s2", nombre: "Diana Escobar", rol: "medico", departamento: "ventas", iniciales: "DE" },
    { id: "s3", nombre: "Kevin Rivera", rol: "medico", departamento: "ventas", iniciales: "KR" },
    { id: "s4", nombre: "Alejandra Solís", rol: "jefe", departamento: "ventas", iniciales: "AS" },
    { id: "s5", nombre: "Rodrigo Lara", rol: "medico", departamento: "ventas", iniciales: "RL" },
    { id: "s6", nombre: "Tatiana Menjívar", rol: "medico", departamento: "usados", iniciales: "TM" },
    { id: "s7", nombre: "Óscar Peraza", rol: "recepcion", departamento: "atencion", iniciales: "OP" },
    { id: "s8", nombre: "Marcela Rivas", rol: "medico", departamento: "taller", iniciales: "MR" },
    { id: "s9", nombre: "Julio Campos", rol: "recepcion", departamento: "repuestos", iniciales: "JC" },
    { id: "s10", nombre: "Gerardo Núñez", rol: "jefe", departamento: "taller", iniciales: "GN" },
  ],
  contacts: [
    { id: "c1", nombre: "Melissa Arteaga", handle: "@meli.arteaga", canal: "instagram", notas: "Lead del anuncio del Kicks en Instagram." },
    { id: "c2", nombre: "Ricardo Flores", handle: "Ricardo Flores", canal: "facebook", notas: "Pregunta por la Frontier para su taller de obra." },
    { id: "c3", nombre: "Andrea Palacios", handle: "@andre.palacios", canal: "instagram" },
    { id: "c4", nombre: "Gustavo Iraheta", handle: "Gustavo Iraheta", canal: "facebook" },
    // De acá para abajo, contactos de WhatsApp. Van CON teléfono a propósito:
    // la pestaña Contactos llavea la ficha por número, así que los de arriba,
    // que solo tienen handle, nunca aparecen ahí.
    { id: "c5", nombre: "Marielos Cañas", telefono: "+503 7003 0010", correo: "mcanas@gmail.com", canal: "whatsapp", tags: ["Interés SUV", "Cotización enviada"], notas: "Qashqai. Comparando contra compra de contado." },
    { id: "c6", nombre: "Ernesto Batres", telefono: "+503 7003 0015", canal: "whatsapp", tags: ["Interés Pickup", "Prueba de manejo"], notas: "Frontier Cabina Simple. Prueba de manejo el sábado a las 10 en Autopista Sur." },
    { id: "c7", nombre: "Rocío Zelaya", telefono: "+503 7003 0019", correo: "rzelaya@gmail.com", canal: "whatsapp", tags: ["Interés Pickup", "Propuesta enviada"], notas: "Frontier doble cabina con descuento de empleado. Quiere bajar la cuota a 84 meses." },
    { id: "c8", nombre: "Fátima Rodríguez", telefono: "+503 7003 0023", correo: "frodriguez@outlook.com", canal: "whatsapp", tags: ["Interés SUV", "Unidad separada"], notas: "X-Trail gris. Prima pagada, entrega el viernes a las 3." },
    { id: "c9", nombre: "Luis Menéndez", telefono: "+503 7003 0020", correo: "lmenendez@hotmail.com", canal: "whatsapp", tags: ["Interés SUV", "Usado a cuenta"], notas: "X-Trail e-POWER. Entrega un Versa 2017 valuado en $7,800." },
    { id: "c10", nombre: "Wilber Chávez", telefono: "+503 7003 0017", canal: "whatsapp", tags: ["Interés SUV", "Prueba de manejo"], notas: "Kicks. No llegó a la prueba de manejo y nadie la volvió a agendar." },
  ],
  conversations: [
    { id: "v1", canal: "instagram", contactId: "c1", departamento: "ventas", estado: "en_progreso", asignadoA: "s2", noLeidos: 0, ultimoMensajeTs: "2026-06-23T10:20:00" },
    { id: "v2", canal: "facebook", contactId: "c2", departamento: "ventas", estado: "nuevo", noLeidos: 2, ultimoMensajeTs: "2026-06-23T10:12:00" },
    { id: "v3", canal: "instagram", contactId: "c3", departamento: "usados", estado: "nuevo", noLeidos: 1, ultimoMensajeTs: "2026-06-23T10:27:00" },
    { id: "v4", canal: "facebook", contactId: "c4", departamento: "taller", estado: "resuelto", asignadoA: "s8", noLeidos: 0, ultimoMensajeTs: "2026-06-22T16:40:00" },
    { id: "v5", canal: "whatsapp", contactId: "c5", departamento: "ventas", estado: "nuevo", asignadoA: ME, noLeidos: 2, ultimoMensajeTs: "2026-06-23T10:44:00" },
    { id: "v6", canal: "whatsapp", contactId: "c6", departamento: "ventas", estado: "en_progreso", asignadoA: "s3", noLeidos: 0, ultimoMensajeTs: "2026-06-23T09:31:00" },
    { id: "v7", canal: "whatsapp", contactId: "c7", departamento: "ventas", estado: "en_progreso", asignadoA: ME, noLeidos: 1, ultimoMensajeTs: "2026-06-23T10:41:00" },
    { id: "v8", canal: "whatsapp", contactId: "c8", departamento: "seguimiento", estado: "en_progreso", asignadoA: ME, noLeidos: 0, ultimoMensajeTs: "2026-06-23T10:29:00" },
    { id: "v9", canal: "whatsapp", contactId: "c9", departamento: "usados", estado: "en_progreso", asignadoA: "s6", noLeidos: 0, ultimoMensajeTs: "2026-06-23T09:58:00" },
    { id: "v10", canal: "whatsapp", contactId: "c10", departamento: "ventas", estado: "nuevo", noLeidos: 1, ultimoMensajeTs: "2026-06-23T08:52:00" },
  ],
  messages: [
    // v1 - IG, lead del anuncio del Kicks
    { id: "m1", conversationId: "v1", autor: "cliente", texto: "Hola! Vi el anuncio del Kicks, ¿cuánto está?", ts: "2026-06-23T10:05:00" },
    { id: "m2", conversationId: "v1", autor: "staff", staffId: "s2", texto: "Hola Melissa, el Kicks arranca desde $25,000. ¿Le gustaría venir a manejarlo? Tenemos unidades en sala para prueba.", ts: "2026-06-23T10:12:00" },
    { id: "m3", conversationId: "v1", autor: "cliente", texto: "Sí, me interesa. ¿El sábado puedo?", ts: "2026-06-23T10:20:00" },
    // v2 - FB, Frontier para trabajo
    { id: "m4", conversationId: "v2", autor: "cliente", texto: "Buenas, ando viendo la Frontier para el negocio.", ts: "2026-06-23T10:08:00" },
    { id: "m5", conversationId: "v2", autor: "cliente", texto: "¿Cuánto aguanta de carga y qué tienen en existencia?", ts: "2026-06-23T10:12:00" },
    // v3 - IG, usado a cuenta
    { id: "m6", conversationId: "v3", autor: "cliente", texto: "¿Reciben mi carro como parte de pago? Es un Sentra 2019.", ts: "2026-06-23T10:27:00" },
    // v4 - FB, taller
    { id: "m7", conversationId: "v4", autor: "cliente", texto: "¿El taller atiende sábados?", ts: "2026-06-22T16:20:00" },
    { id: "m8", conversationId: "v4", autor: "staff", staffId: "s8", texto: "Hola Gustavo, sí, los sábados atendemos con cita. ¿Le agendo un espacio?", ts: "2026-06-22T16:35:00" },
    { id: "m9", conversationId: "v4", autor: "cliente", texto: "Perfecto, la otra semana le escribo. ¡Gracias!", ts: "2026-06-22T16:40:00" },
    // v5 - WA, Marielos comparando contra contado
    { id: "m10", conversationId: "v5", autor: "staff", staffId: ME, texto: "Buenas tardes Marielos, le comparto la cotización del Qashqai que quedamos.", ts: "2026-06-22T15:20:00" },
    { id: "m11", conversationId: "v5", autor: "cliente", texto: "Gracias. Si lo pago de contado, ¿hay algo adicional?", ts: "2026-06-23T10:40:00" },
    { id: "m12", conversationId: "v5", autor: "cliente", texto: "Y me gustaría manejarlo antes de decidir.", ts: "2026-06-23T10:44:00" },
    // v6 - WA, prueba de manejo agendada
    { id: "m13", conversationId: "v6", autor: "cliente", texto: "Quería probar la Frontier cabina simple antes de decidir.", ts: "2026-06-23T09:20:00" },
    { id: "m14", conversationId: "v6", autor: "staff", staffId: "s3", texto: "Con gusto don Ernesto. Le dejo la prueba el sábado a las diez en Autopista Sur. Solo traiga su licencia vigente.", ts: "2026-06-23T09:31:00" },
    // v7 - WA, Rocío negociando la cuota
    { id: "m15", conversationId: "v7", autor: "staff", staffId: ME, texto: "Doña Rocío, ya tengo la propuesta autorizada con el descuento de empleado.", ts: "2026-06-23T10:30:00" },
    { id: "m16", conversationId: "v7", autor: "cliente", texto: "Gracias. ¿Y a 84 meses cómo me quedaría la cuota?", ts: "2026-06-23T10:41:00" },
    // v8 - WA, entrega del viernes
    { id: "m17", conversationId: "v8", autor: "cliente", texto: "¿Todo listo para el viernes? ¿A qué hora paso?", ts: "2026-06-23T10:22:00" },
    { id: "m18", conversationId: "v8", autor: "staff", staffId: ME, texto: "Todo listo doña Fátima. La entrega es el viernes a las tres. Calcule una hora: ahí mismo le configuramos el CarPlay y le explicamos el mantenimiento.", ts: "2026-06-23T10:29:00" },
    // v9 - WA, usado valuado
    { id: "m19", conversationId: "v9", autor: "cliente", texto: "¿En cuánto me quedó valuado el Versa?", ts: "2026-06-23T09:44:00" },
    { id: "m20", conversationId: "v9", autor: "staff", staffId: "s6", texto: "Don Luis, el Versa 2017 quedó en $7,800 con la revisión de 150 puntos. Eso entra directo a la prima de la X-Trail e-POWER.", ts: "2026-06-23T09:58:00" },
    // v10 - WA, el que no llegó a la prueba
    { id: "m21", conversationId: "v10", autor: "cliente", texto: "Disculpe, no pude llegar el sábado a la prueba del Kicks. ¿Se puede otro día?", ts: "2026-06-23T08:52:00" },
  ],
  internalChannels: [
    { id: "ic1", nombre: "general", tipo: "canal", miembros: [ME, "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"] },
    { id: "ic2", nombre: "piso-de-ventas", tipo: "canal", miembros: [ME, "s2", "s3", "s4", "s5", "s6"] },
    { id: "ic3", nombre: "entregas", tipo: "canal", miembros: [ME, "s2", "s4", "s8"] },
    { id: "ic4", nombre: "inventario", tipo: "canal", miembros: ["s4", "s5", "s9"] },
    { id: "dm1", nombre: "Alejandra Solís", tipo: "dm", miembros: [ME, "s4"] },
  ],
  internalMessages: [
    { id: "im1", channelId: "ic1", staffId: "s4", texto: "Buenos días equipo. Este mes el objetivo son 40 unidades y llevamos 26.", ts: "2026-06-23T08:00:00" },
    { id: "im2", channelId: "ic2", staffId: "s2", texto: "Alejandra, ¿queda Kicks gris para entrega inmediata? Tengo un cliente listo para separar.", ts: "2026-06-23T09:10:00" },
    { id: "im3", channelId: "ic2", staffId: "s4", texto: "Queda una. Te la aparto hasta mañana al mediodía.", ts: "2026-06-23T09:18:00" },
    { id: "im4", channelId: "ic4", staffId: "s5", texto: "La Pathfinder gris entra hasta el otro mes. Si alguien la tiene ofrecida, avisen al cliente hoy.", ts: "2026-06-23T09:40:00" },
    { id: "im5", channelId: "ic3", staffId: "s8", texto: "La X-Trail de la entrega del viernes ya salió de lavado y pulido.", ts: "2026-06-23T10:05:00" },
    { id: "im6", channelId: "dm1", staffId: "s4", texto: "¿Me pasás el reporte de leads sin llamar antes de la reunión?", ts: "2026-06-23T09:50:00" },
    { id: "im7", channelId: "dm1", staffId: ME, texto: "Va antes del mediodía. Anoche quedaron tres sin tomar.", ts: "2026-06-23T09:55:00" },
  ],
  socialPosts: [
    { id: "sp1", red: "instagram", estado: "publicado", texto: "La nueva Frontier ya está en sala. Agendá tu prueba de manejo esta semana.", fecha: haceDias(1, 9), engagement: { alcance: 9120, meGusta: 648, comentarios: 41, compartidos: 52, guardados: 133 } },
    { id: "sp2", red: "facebook", estado: "publicado", texto: "X-Trail e-POWER: la híbrida que no se enchufa. Te contamos cómo funciona en dos minutos.", fecha: haceDias(2, 15), engagement: { alcance: 12400, meGusta: 512, comentarios: 77, compartidos: 141 } },
    { id: "sp3", red: "instagram", estado: "programado", texto: "Tu usado vale más de lo que creés. Traelo, te lo valuamos sin costo y lo dejás de prima.", fecha: haceDias(-1, 10) },
    { id: "sp4", red: "facebook", estado: "programado", texto: "Fin de semana de puertas abiertas: pruebas de manejo sin cita, sábado y domingo.", fecha: haceDias(-2, 8) },
    { id: "sp5", red: "instagram", estado: "publicado", texto: "Otra familia estrenando Kicks. Gracias por dejarnos ser parte.", fecha: haceDias(4, 17), engagement: { alcance: 8300, meGusta: 455, comentarios: 22, compartidos: 37 } },
    { id: "sp6", red: "instagram", estado: "borrador", texto: "5 cosas que nadie te dice antes de comprar tu primer carro.", fecha: haceDias(3, 12) },
  ],
  socialStats: [
    { red: "instagram", handle: "@nissan.sv", seguidores: 21400, nuevosSeguidores: 612, crecimientoPct: 3.5, alcance30d: 48600, vistas30d: 104200, interacciones30d: 6410 },
    { red: "facebook", handle: "Nissan El Salvador", seguidores: 34800, nuevosSeguidores: 470, crecimientoPct: 1.6, alcance30d: 62300, vistas30d: 129800, interacciones30d: 8240 },
    { red: "tiktok", handle: "@nissansv", seguidores: 15900, nuevosSeguidores: 3100, crecimientoPct: 24.2, vistas30d: 402100, meGusta30d: 21800, compartidos30d: 2940 },
  ],
  metrics: [
    { label: "Conversaciones hoy", valor: 44, delta: 16 },
    { label: "Leads de anuncios", valor: 27, delta: 21 },
    { label: "Tiempo de respuesta", valor: "4 min", delta: -22 },
    { label: "Pruebas agendadas", valor: 9, delta: 12 },
    { label: "CSAT", valor: "4.7 / 5", delta: 4 },
    { label: "Atendidas por IA", valor: "68%", delta: 11 },
  ],
};
