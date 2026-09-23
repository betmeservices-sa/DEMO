// Datos semilla de la bandeja de BetMe Services (tenant "betme").
//
// BetMe recluta asistentes virtuales bilingues para negocios de Estados
// Unidos. Lo que entra por WhatsApp, Instagram y Facebook es gente que quiere
// aplicar, que pregunta por su entrevista o que ya entro y manda papeles.
//
// Los telefonos de los contactos de WhatsApp son LOS MISMOS del banco de
// talento (lib/talento/seed.ts): asi la ficha del candidato encuentra su
// conversacion sin cruzar nada a mano.

import type { TenantSeed } from "../types";

const ME = "me";

// Relativas a la carga para que la bandeja se vea viva el dia que se ensena.
function haceMin(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}
function haceDias(d: number, hora: number): string {
  const x = new Date();
  x.setDate(x.getDate() - d);
  x.setHours(hora, 0, 0, 0);
  return x.toISOString();
}

export const betmeSeed: TenantSeed = {
  ME,
  departments: [
    { id: "reclutamiento", nombre: "Reclutamiento", color: "#1f7a93" },
    { id: "onboarding", nombre: "Onboarding", color: "#157347" },
    { id: "atencion", nombre: "Atención general", color: "#1b2a4a" },
  ],
  staff: [
    { id: ME, nombre: "Gerente de Talento", rol: "gerente_marketing", departamento: "reclutamiento", iniciales: "GT" },
    { id: "s2", nombre: "Daniela Aguirre", rol: "jefe", departamento: "reclutamiento", iniciales: "DA" },
    { id: "s3", nombre: "Josué Hernández", rol: "medico", departamento: "reclutamiento", iniciales: "JH" },
    { id: "s4", nombre: "Karla Mejía", rol: "medico", departamento: "reclutamiento", iniciales: "KM" },
    { id: "s5", nombre: "Andrés Guardado", rol: "medico", departamento: "atencion", iniciales: "AG" },
    { id: "s6", nombre: "Paola Rivas", rol: "recepcion", departamento: "onboarding", iniciales: "PR" },
  ],
  contacts: [
    { id: "c1", nombre: "Carolina Menjívar", telefono: "+503 7410 2209", correo: "carolina.menjivar@gmail.com", canal: "whatsapp", tags: ["Legal"], notas: "Legal Assistant, despacho de Houston. Entrevista con el cliente esta semana." },
    { id: "c2", nombre: "Diego Portillo", telefono: "+503 7410 2208", correo: "diego.portillo@gmail.com", canal: "whatsapp", tags: ["Legal"] },
    { id: "c3", nombre: "Sofía Ramírez", telefono: "+503 7410 2206", correo: "sofia.ramirez@gmail.com", canal: "whatsapp", tags: ["Asistente ejecutiva", "Oferta enviada"] },
    { id: "c4", nombre: "Mónica Castillo", telefono: "+503 7410 2207", correo: "monica.castillo@gmail.com", canal: "whatsapp", tags: ["Legal", "Contratada"] },
    { id: "c5", nombre: "Karen Alfaro", telefono: "+503 7555 1234", correo: "karen.alfaro@gmail.com", canal: "whatsapp", notas: "Mandó su CV por WhatsApp. Aún no está en el banco de talento." },
    { id: "c6", nombre: "Valeria Henríquez", handle: "@vale.henriquez", canal: "instagram" },
    { id: "c7", nombre: "Marcos Villeda", handle: "Marcos Villeda", canal: "facebook" },
    { id: "c8", nombre: "Jorge Menjívar", handle: "@jorge.mnjvr", canal: "instagram" },
  ],
  conversations: [
    { id: "b1", canal: "whatsapp", contactId: "c1", departamento: "reclutamiento", estado: "en_progreso", asignadoA: "s5", noLeidos: 1, ultimoMensajeTs: haceMin(12) },
    { id: "b2", canal: "whatsapp", contactId: "c2", departamento: "reclutamiento", estado: "en_progreso", asignadoA: "s3", noLeidos: 0, ultimoMensajeTs: haceMin(48) },
    { id: "b3", canal: "whatsapp", contactId: "c3", departamento: "reclutamiento", estado: "nuevo", asignadoA: ME, noLeidos: 2, ultimoMensajeTs: haceMin(6) },
    { id: "b4", canal: "whatsapp", contactId: "c4", departamento: "onboarding", estado: "en_progreso", asignadoA: "s6", noLeidos: 0, ultimoMensajeTs: haceMin(95) },
    { id: "b5", canal: "whatsapp", contactId: "c5", departamento: "reclutamiento", estado: "nuevo", noLeidos: 2, ultimoMensajeTs: haceMin(21) },
    { id: "b6", canal: "instagram", contactId: "c6", departamento: "reclutamiento", estado: "nuevo", asignadoA: "s3", noLeidos: 1, ultimoMensajeTs: haceMin(33) },
    { id: "b7", canal: "facebook", contactId: "c7", departamento: "atencion", estado: "resuelto", noLeidos: 0, ultimoMensajeTs: haceDias(1, 16) },
    { id: "b8", canal: "instagram", contactId: "c8", departamento: "reclutamiento", estado: "nuevo", noLeidos: 1, ultimoMensajeTs: haceMin(70) },
  ],
  messages: [
    // b1: Carolina, entrevista con el cliente
    { id: "m1", conversationId: "b1", autor: "staff", staffId: "s5", texto: "Hola Carolina, el despacho de Houston quiere conocerla. La entrevista es por videollamada, 30 minutos, en inglés.", ts: haceMin(40) },
    { id: "m2", conversationId: "b1", autor: "cliente", texto: "¡Qué buena noticia! ¿Hay algo que deba preparar? ¿Me van a preguntar por formularios de inmigración?", ts: haceMin(12) },
    // b2: Diego confirma su screening
    { id: "m3", conversationId: "b2", autor: "staff", staffId: "s3", texto: "Buenas Diego, le confirmo el screening bilingüe hoy a las 3:00 pm. Es una llamada de 20 minutos.", ts: haceMin(60) },
    { id: "m4", conversationId: "b2", autor: "cliente", texto: "Confirmado, ahí estaré. Gracias Josué.", ts: haceMin(48) },
    // b3: Sofia pregunta por la oferta
    { id: "m5", conversationId: "b3", autor: "staff", staffId: ME, texto: "Sofía, le compartimos la oferta del broker de Miami por correo. Cualquier duda nos escribe por aquí.", ts: haceDias(1, 15) },
    { id: "m6", conversationId: "b3", autor: "cliente", texto: "Muchas gracias. La revisé y me interesa mucho.", ts: haceMin(9) },
    { id: "m7", conversationId: "b3", autor: "cliente", texto: "¿El bono de los 90 días es aparte del salario base? ¿Y la fecha de inicio se puede mover una semana?", ts: haceMin(6) },
    // b4: Monica en onboarding
    { id: "m8", conversationId: "b4", autor: "cliente", texto: "Buenos días Paola, ya les mandé por correo el DUI y la constancia del banco.", ts: haceMin(120) },
    { id: "m9", conversationId: "b4", autor: "staff", staffId: "s6", texto: "Recibidos, Mónica. El lunes le llega su correo corporativo y el martes arranca la capacitación.", ts: haceMin(95) },
    // b5: Karen manda su CV por WhatsApp
    { id: "m10", conversationId: "b5", autor: "cliente", texto: "Hola, vi que están contratando asistentes virtuales. Les dejo mi resumen:", ts: haceMin(23) },
    { id: "m11", conversationId: "b5", autor: "cliente", texto: "Karen Alfaro. Soyapango, San Salvador. Virtual Assistant con 4 años de experiencia. Inglés avanzado. Manejo de agenda, correo electrónico, Canva y GoHighLevel. Tiempo completo, hora del Este (EST). Pretensión: $950.", ts: haceMin(21) },
    // b6: Valeria por Instagram
    { id: "m12", conversationId: "b6", autor: "cliente", texto: "Hola! ¿La entrevista de mañana es por videollamada o por teléfono?", ts: haceMin(33) },
    // b7: Marcos desde Honduras, ya resuelto
    { id: "m13", conversationId: "b7", autor: "cliente", texto: "Buenas, ¿contratan gente de Honduras?", ts: haceDias(1, 15) },
    { id: "m14", conversationId: "b7", autor: "staff", staffId: "s5", texto: "Hola Marcos, sí. Trabajamos con talento de toda Latinoamérica. Aplique en nuestra página de carreras con su CV y una grabación de 60 segundos en inglés.", ts: haceDias(1, 16) },
    // b8: Jorge pregunta como aplicar
    { id: "m15", conversationId: "b8", autor: "cliente", texto: "¿Qué necesito para aplicar? No tengo experiencia como asistente virtual pero hablo inglés.", ts: haceMin(70) },
  ],
  internalChannels: [
    { id: "ic1", nombre: "general", tipo: "canal", miembros: [ME, "s2", "s3", "s4", "s5", "s6"] },
    { id: "ic2", nombre: "reclutamiento", tipo: "canal", miembros: [ME, "s2", "s3", "s4"] },
    { id: "ic3", nombre: "clientes-eeuu", tipo: "canal", miembros: [ME, "s2", "s5"] },
    { id: "ic4", nombre: "onboarding", tipo: "canal", miembros: [ME, "s6", "s2"] },
    { id: "dm1", nombre: "Daniela Aguirre", tipo: "dm", miembros: [ME, "s2"] },
  ],
  internalMessages: [
    { id: "im1", channelId: "ic1", staffId: "s2", texto: "Buenos días. Esta semana cerramos Legal Assistant y queremos oferta para el broker de Miami.", ts: haceDias(0, 8) },
    { id: "im2", channelId: "ic2", staffId: "s3", texto: "Subí la vacante de Business Analyst. El match sacó a Rebeca Arévalo arriba: no estaba en ningún pipeline.", ts: haceDias(0, 9) },
    { id: "im3", channelId: "ic2", staffId: "s4", texto: "Wendy necesita la revisión DISC antes de la entrevista con Daniela.", ts: haceDias(0, 9) },
    { id: "im4", channelId: "ic3", staffId: "s5", texto: "El despacho de Houston quiere dos personas, no una. Las dos primeras semanas en su horario.", ts: haceDias(1, 14) },
    { id: "im5", channelId: "ic4", staffId: "s6", texto: "Silvia arranca el lunes con la firma de Charlotte. Accesos listos.", ts: haceDias(0, 10) },
    { id: "im6", channelId: "dm1", staffId: "s2", texto: "¿Me pasás el embudo de la semana antes de la reunión con los clientes?", ts: haceDias(0, 9) },
  ],
  // Sin redes para publicar: el panel de BetMe no tiene esa pestaña.
  socialPosts: [],
  socialStats: [],
  metrics: [
    { label: "Conversaciones hoy", valor: 31, delta: 12 },
    { label: "Tiempo de respuesta", valor: "6 min", delta: -18 },
    { label: "Atendidas por IA", valor: "54%", delta: 9 },
  ],
};
