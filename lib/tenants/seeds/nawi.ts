// Datos semilla de la bandeja de NAWI Beach House.
//
// Cada conversación es la otra punta de algo que se ve en el tablero o en los
// tickets: el apartado que espera el pago, el comprobante por verificar, la
// mesa para un cumpleaños, el aire que gotea, el grupo que quiere Day Pass con
// mesa. Así "Ver chat" desde el tablero abre la conversación que corresponde.
//
// Personas, teléfonos y montos son INVENTADOS (teléfonos 503 9xxx xxxx, serie
// que no se asigna en El Salvador). Precios del Day Pass, horarios y reglas
// del club salen de antiresort.com/nawibeachhouse.

import type { TenantSeed } from "../types";
import type { Contact, Conversation, ConversationStatus, DepartmentId, Message } from "@/lib/data/types";
import { NAWI } from "@/lib/hotel-muestra/nawi";
import { habitacionDe, totalEstadia } from "@/lib/hotel-muestra/libro";
import { diaSV, dinero, fechaCorta, sumarDias } from "@/lib/hotel-muestra/fechas";

const ME = "me";
const AHORA = Date.now();
const HOY = diaSV(AHORA);

const haceMin = (min: number) => new Date(AHORA - min * 60_000).toISOString();

const messages: Message[] = [];
let n = 0;

function cliente(conv: string, texto: string, min: number) {
  messages.push({ id: `nm${++n}`, conversationId: conv, autor: "cliente", texto, ts: haceMin(min) });
}

function agente(conv: string, texto: string, min: number) {
  messages.push({ id: `nm${++n}`, conversationId: conv, autor: "staff", staffId: "ia", texto, ts: haceMin(min) });
}

function equipo(conv: string, staffId: string, texto: string, min: number) {
  messages.push({ id: `nm${++n}`, conversationId: conv, autor: "staff", staffId, texto, ts: haceMin(min) });
}

/** Fechas y precio de un apartado de la muestra, igual que en el tablero. */
function apartado(id: string) {
  const a = NAWI.apartados.find((x) => x.id === id) ?? NAWI.cerradas.find((x) => x.id === id);
  if (!a) throw new Error(`Apartado de muestra inexistente: ${id}`);
  const ref = habitacionDe(NAWI, a.habitacionId);
  if (!ref) throw new Error(`Habitación inexistente: ${a.habitacionId}`);
  const desde = sumarDias(HOY, a.llegaEnDias);
  return { desde, hasta: sumarDias(desde, a.noches), total: totalEstadia(ref.hab, desde, a.noches), hab: ref.hab.nombre };
}

// ── n1 · Valeria: dejó los lentes en la red suspendida ──
cliente("n1", "Hola! Ayer estuve con day pass y creo que dejé mis lentes de sol en la red 😩", 310);
agente("n1", "¡Hola, Valeria! Ya le aviso al equipo del club para que los busquen. ¿Cómo son?", 309);
cliente("n1", "Ray-Ban negros, con estuche café", 305);
equipo("n1", "s4", "¡Los encontramos! Quedan guardados en recepción del club a tu nombre 🙌", 240);
cliente("n1", "Graciasss, paso el sábado por ellos", 236);

// ── n2 · Diego: pregunta por la Ocean Tree House ──
{
  const desde = sumarDias(HOY, 9);
  cliente("n2", "Buenas, ¿la Ocean Tree House está disponible?", 6);
  agente("n2", "¡Hola, Diego! ¿Para qué fechas y cuántas personas sería? Así te confirmo disponibilidad y precio.", 5);
  cliente("n2", `Para el ${fechaCorta(desde)}, somos 2`, 3);
  cliente("n2", "¿Es la que tiene vista al mar desde la cama?", 2);
}

// ── n3 · Carolina: apartó y quiere pagar en dos partes ──
{
  const a = apartado("AP-2041");
  cliente("n3", "Hola! Quiero reservar una habitación con vista al mar para mi cumpleaños 🎉", 40);
  agente("n3", "¡Felicidades por adelantado! ¿Qué fechas tienes en mente y cuántas personas serían?", 39);
  cliente("n3", `Del ${fechaCorta(a.desde)} al ${fechaCorta(a.hasta)}, somos 2`, 36);
  agente(
    "n3",
    `¡Hay lugar! La Ocean Tree House 180° esas dos noches sale en ${dinero(a.total)}. ¿Te la aparto? El apartado dura una hora y se confirma con el depósito.`,
    35,
  );
  cliente("n3", "Sí, apártamela porfa", 30);
  agente("n3", "¡Listo! Quedó apartada por una hora a tu nombre. Te paso los datos para el depósito 😊", 29);
  cliente("n3", "¿Puedo pagar la mitad hoy y la otra mitad cuando llegue?", 18);
  agente("n3", "Eso lo autoriza el equipo de Reservas. Ya les pasé tu consulta y te escriben por aquí en un momento.", 17);
}

// ── n4 · Laura: mesa para ocho el sábado ──
cliente("n4", "Hola, quiero celebrar un cumpleaños el sábado en la noche, somos 8", 100);
agente("n4", "¡Qué buen plan! El restaurante frente al mar abre hasta las 11:00 p. m. el sábado. Le paso tu pedido a nuestro concierge para apartarte la mesa 🌊", 99);
cliente("n4", "¿Podemos llevar pastel?", 97);
equipo("n4", "s3", "¡Hola, Laura! Soy Kevin, del concierge. Te aparto la mesa frente al mar a las 7:00 p. m. Sobre el pastel, déjame confirmarlo con cocina.", 80);

// ── n5 · Ricardo: Lodge para seis, mandó el comprobante ──
{
  const a = apartado("AP-2039");
  cliente("n5", "Buenas, somos 6 amigos, ¿qué opción tienen?", 210);
  agente(
    "n5",
    `La Habitación Lodge es justo para grupos: una cama king y cuatro literas, sala y baño privado, frente a Nawi. Del ${fechaCorta(a.desde)} al ${fechaCorta(a.hasta)} serían ${dinero(a.total)}. ¿Te la aparto?`,
    208,
  );
  cliente("n5", "Dale, apártala", 200);
  agente("n5", "¡Listo, Ricardo! Quedó apartada por una hora. Cuando hagas el depósito, mándame la foto del comprobante por aquí.", 199);
  cliente("n5", "Ya transferí, aquí va el comprobante 🙌", 170);
  agente("n5", "¡Gracias! Reservas lo verifica y te confirma por aquí.", 169);
  equipo("n5", "s2", "Hola, Ricardo, soy Andrea de Reservas. Estoy revisando que haya entrado completo y te confirmo.", 150);
}

// ── n6 · Michael: huésped en casa, el aire gotea ──
cliente("n6", "Hi, the AC in our Jungle Tree House is leaking water on the floor", 150);
agente("n6", "So sorry about that, Michael! I'm sending someone from maintenance right away. Please avoid the wet area meanwhile.", 149);
equipo("n6", "s5", "Hi Michael, Mauricio here. Our technician is on his way, and we're bringing you a fan and extra towels.", 115);
cliente("n6", "Thanks, appreciate the quick response!", 112);

// ── n7 · Jason: bungalow para cuatro y clases de surf ──
{
  const a = apartado("AP-2037");
  cliente("n7", "Hey! Looking for a room for 4 people, we want to surf", 70);
  agente(
    "n7",
    `Hi Jason! The Beachfront Bungalow fits 4 and it's steps from the ocean. From ${fechaCorta(a.desde)} to ${fechaCorta(a.hasta)} it's ${dinero(a.total)}. Want me to hold it for you?`,
    68,
  );
  // Apartado hace 51 minutos: le quedan los 9 que dice el tablero.
  cliente("n7", "Yes please! Also, do you offer surf lessons with photos?", 52);
  agente("n7", "Done! It's held for one hour. Surf lessons with a pro photographer are arranged by our concierge, they'll message you here 🏄", 51);
}

// ── n8 · Josué: quiere ir con su hija de 15 ──
cliente("n8", "Hola, ¿puedo llevar a mi hija de 15 años el sábado?", 36);
agente("n8", "Hola, Josué. Nawi es un club solo para mayores de 18, así que no podemos recibir menores. ¡Disculpa!", 35);
cliente("n8", "Ah ok, ¿y no hay alguna excepción si está con nosotros todo el tiempo?", 30);

// ── n9 · Andrea: seis Day Pass con mesa ──
cliente("n9", "Hola! Queremos ir 6 el domingo con day pass", 92);
agente("n9", "¡Qué bien! El domingo el Pase de un día es de $40 por persona y el DUO, para dos, de $65. Si son 3 DUO serían $195. ¿Te ayudo con algo más?", 91);
cliente("n9", "¿Se puede apartar una mesa cerca de la piscina? Llegamos como a las 10", 15);

// ── n10 · Natalia: retiro de yoga para doce ──
cliente("n10", "Hola, organizo retiros de yoga y busco lugar para 12 personas en diciembre, 3 noches", 1320);
agente("n10", "¡Hola, Natalia! Suena increíble. Los retiros los arma nuestra gerencia a la medida; ya les pasé tu consulta y te escriben por aquí.", 1319);
equipo("n10", ME, "Hola, Natalia, soy Gabriela. Te preparo una propuesta con yoga diario, temazcal y comidas. ¿Me compartes tu correo?", 1250);
cliente("n10", "Claro, natalia.yoga@correo.com. ¿Incluye transporte del aeropuerto?", 60);

// ── n11 · Mónica: aniversario confirmado ──
{
  const a = apartado("AP-2033");
  cliente("n11", "Hola, ¿tienen algo especial para aniversario?", 1500);
  agente("n11", `¡Felicidades! La Jungle Tree House es muy romántica, rodeada de jardín. Del ${fechaCorta(a.desde)} al ${fechaCorta(a.hasta)} sale en ${dinero(a.total)}. ¿Te la aparto?`, 1499);
  cliente("n11", "Sí! Y si se puede decoración en la habitación 🥹", 1490);
  equipo("n11", "s2", "¡Confirmada, Mónica! Ya quedó la nota de la decoración. Los esperamos 💛", 1420);
}

// ── n12 · Emily: early check in y surf ──
cliente("n12", "Hi! Our flight lands at 7am, could we check in early?", 1750);
agente("n12", "Hi Emily! Early check in depends on availability, so I'm passing this to our Reservations team to confirm.", 1749);
equipo("n12", "s2", "Hi Emily, Andrea from Reservations. Your Jungle Bungalow will be ready at 9:00 a.m. See you soon!", 1700);
cliente("n12", "Amazing, thank you!!", 1690);

// ── n13 · Fernanda: dijo que sí y no apartó ──
{
  const desde = sumarDias(HOY, 23);
  cliente("n13", "Hola, ¿cuánto sale un bungalow en la selva para 2?", 5800);
  agente("n13", `¡Hola, Fernanda! Del ${fechaCorta(desde)} al ${fechaCorta(sumarDias(desde, 2))} sería ${dinero(420)}. ¿Te lo aparto?`, 5799);
  cliente("n13", "Sí me interesa, déjame confirmar con mi novio", 5790);
}

// ── n14 · Kevin: le cancelaron el vuelo ──
cliente("n14", "Buenas, me cancelaron el vuelo, ¿puedo mover mi reserva una semana?", 2620);
agente("n14", "Lamento lo del vuelo, Kevin. Los cambios de fecha los hace Reservas; ya les pasé tu caso.", 2619);
equipo("n14", "s2", "Hola, Kevin. Listo, tu reserva quedó movida una semana, mismas condiciones.", 2560);
cliente("n14", "Mil gracias 🙏", 2555);

const contacts: Contact[] = [
  { id: "c1", nombre: "Valeria Durán", handle: "@vale.duran", canal: "instagram", tags: ["Day Pass"] },
  { id: "c2", nombre: "Diego Aguilar", telefono: "50391020311", canal: "whatsapp", tags: ["Reservas"] },
  { id: "c3", nombre: "Carolina Peña", telefono: "50391020322", canal: "whatsapp", notas: "Viene por su cumpleaños.", tags: ["Reservas", "Pago"] },
  { id: "c4", nombre: "Laura Hernández", telefono: "50391020333", canal: "whatsapp", tags: ["Restaurante"] },
  { id: "c5", nombre: "Ricardo Guevara", telefono: "50391020344", canal: "whatsapp", tags: ["Reservas", "Pago"] },
  { id: "c6", nombre: "Michael Johnson", telefono: "13105550142", canal: "whatsapp", tags: ["Huésped en casa", "Extranjero"] },
  { id: "c7", nombre: "Jason Miller", handle: "@jasonsurfs", canal: "instagram", tags: ["Reservas", "Surf y retiros", "Extranjero"] },
  { id: "c8", nombre: "Josué Romero", handle: "Josué Romero", canal: "facebook", tags: ["Day Pass"] },
  { id: "c9", nombre: "Andrea Melgar", telefono: "50391020355", canal: "whatsapp", tags: ["Day Pass"] },
  { id: "c10", nombre: "Natalia Castillo", telefono: "50391020366", canal: "whatsapp", correo: "natalia.yoga@correo.com", tags: ["Grupos y eventos", "Surf y retiros"] },
  { id: "c11", nombre: "Mónica Aguilar", telefono: "50391020377", canal: "whatsapp", notas: "Aniversario: decoración en la habitación.", tags: ["Reservas"] },
  { id: "c12", nombre: "Emily Carter", telefono: "13105550177", canal: "whatsapp", tags: ["Reservas", "Extranjero"] },
  { id: "c13", nombre: "Fernanda Castillo", handle: "@fer.castillo", canal: "instagram", tags: ["Reservas"] },
  { id: "c14", nombre: "Kevin Salazar", telefono: "50391020388", canal: "whatsapp", tags: ["Reservas"] },
];

interface DefConv {
  id: string;
  contactId: string;
  canal: Conversation["canal"];
  departamento: DepartmentId;
  estado: ConversationStatus;
  asignadoA?: string;
  noLeidos: number;
}

const CONVERSACIONES: DefConv[] = [
  { id: "n1", contactId: "c1", canal: "instagram", departamento: "club", estado: "resuelto", asignadoA: "s4", noLeidos: 0 },
  { id: "n2", contactId: "c2", canal: "whatsapp", departamento: "reservas", estado: "nuevo", noLeidos: 2 },
  { id: "n3", contactId: "c3", canal: "whatsapp", departamento: "reservas", estado: "nuevo", noLeidos: 1 },
  { id: "n4", contactId: "c4", canal: "whatsapp", departamento: "eventos", estado: "en_progreso", asignadoA: "s3", noLeidos: 0 },
  { id: "n5", contactId: "c5", canal: "whatsapp", departamento: "reservas", estado: "en_progreso", asignadoA: "s2", noLeidos: 0 },
  { id: "n6", contactId: "c6", canal: "whatsapp", departamento: "conserjeria", estado: "en_progreso", asignadoA: "s5", noLeidos: 0 },
  { id: "n7", contactId: "c7", canal: "instagram", departamento: "reservas", estado: "en_progreso", noLeidos: 0 },
  { id: "n8", contactId: "c8", canal: "facebook", departamento: "club", estado: "nuevo", noLeidos: 1 },
  { id: "n9", contactId: "c9", canal: "whatsapp", departamento: "club", estado: "nuevo", noLeidos: 1 },
  { id: "n10", contactId: "c10", canal: "whatsapp", departamento: "eventos", estado: "en_progreso", asignadoA: ME, noLeidos: 1 },
  { id: "n11", contactId: "c11", canal: "whatsapp", departamento: "reservas", estado: "resuelto", asignadoA: "s2", noLeidos: 0 },
  { id: "n12", contactId: "c12", canal: "whatsapp", departamento: "reservas", estado: "resuelto", asignadoA: "s2", noLeidos: 0 },
  { id: "n13", contactId: "c13", canal: "instagram", departamento: "reservas", estado: "en_progreso", noLeidos: 0 },
  { id: "n14", contactId: "c14", canal: "whatsapp", departamento: "reservas", estado: "resuelto", asignadoA: "s2", noLeidos: 0 },
];

const conversations: Conversation[] = CONVERSACIONES.map((c) => {
  const ultimo = messages.filter((m) => m.conversationId === c.id).reduce((max, m) => (m.ts > max ? m.ts : max), "");
  return { ...c, ultimoMensajeTs: ultimo || haceMin(600) };
});

export const nawiSeed: TenantSeed = {
  ME,
  departments: [
    { id: "reservas", nombre: "Reservas", color: "#029fa3" },
    { id: "club", nombre: "Club de playa", color: "#ef5000" },
    { id: "eventos", nombre: "Grupos y eventos", color: "#5c56eb" },
    { id: "conserjeria", nombre: "Concierge", color: "#1e2630" },
  ],
  staff: [
    { id: ME, nombre: "Gabriela Menéndez", rol: "gerente_marketing", departamento: "eventos", iniciales: "GM" },
    { id: "s2", nombre: "Andrea Ayala", rol: "medico", departamento: "reservas", iniciales: "AA" },
    { id: "s3", nombre: "Kevin Alfaro", rol: "recepcion", departamento: "conserjeria", iniciales: "KA" },
    { id: "s4", nombre: "Rocío Funes", rol: "recepcion", departamento: "club", iniciales: "RF" },
    { id: "s5", nombre: "Mauricio Lemus", rol: "jefe", departamento: "conserjeria", iniciales: "ML" },
  ],
  contacts,
  conversations,
  messages,
  internalChannels: [
    { id: "ic1", nombre: "general", tipo: "canal", miembros: [ME, "s2", "s3", "s4", "s5"] },
    { id: "ic2", nombre: "reservas", tipo: "canal", miembros: [ME, "s2", "s3"] },
    { id: "ic3", nombre: "club-de-playa", tipo: "canal", miembros: [ME, "s4", "s5"] },
    { id: "dm1", nombre: "Andrea Ayala", tipo: "dm", miembros: [ME, "s2"] },
  ],
  internalMessages: [
    { id: "im1", channelId: "ic1", staffId: ME, texto: "Este sábado hay evento en la playa: el club se llena desde temprano. Reservas, prioricen los DUO en línea.", ts: haceMin(600) },
    { id: "im2", channelId: "ic2", staffId: "s2", texto: "Quedan dos apartados esperando pago de Camila. El de la Lodge ya mandó comprobante, lo estoy verificando.", ts: haceMin(150) },
    { id: "im3", channelId: "ic2", staffId: "s3", texto: "La mesa de Laura para el sábado ya está, frente al mar a las 7:00 p. m.", ts: haceMin(78) },
    { id: "im4", channelId: "ic3", staffId: "s4", texto: "Aparecieron los lentes de Valeria en las camas de día, quedan en recepción del club.", ts: haceMin(242) },
    { id: "im5", channelId: "ic3", staffId: "s5", texto: "El técnico ya subió a la Jungle Tree House por el aire. Le dejamos ventilador al huésped.", ts: haceMin(108) },
    { id: "im6", channelId: "dm1", staffId: "s2", texto: "Carolina pregunta si puede pagar el depósito en dos partes. ¿Lo autorizamos?", ts: haceMin(16) },
  ],
  socialPosts: [],
  socialStats: [],
  metrics: [{ label: "Conversaciones hoy", valor: conversations.filter((c) => c.ultimoMensajeTs >= haceMin(24 * 60)).length }],
};
