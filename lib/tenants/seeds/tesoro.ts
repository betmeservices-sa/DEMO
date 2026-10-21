// Datos semilla de la bandeja del Hotel Tesoro Beach.
//
// Cada conversación es la otra punta de algo que se ve en el tablero o en los
// tickets: el apartado de la Cuádruple que espera el pago, el comprobante por
// verificar, la cama de Day Pass, la boda en la playa, la ducha sin agua
// caliente. Así "Ver chat" desde el tablero abre la conversación que
// corresponde.
//
// Personas, teléfonos y montos son INVENTADOS (teléfonos 503 9xxx xxxx, serie
// que no se asigna en El Salvador). Precios del Day Pass, reglas de mascotas
// y datos del hotel salen de hoteltesorobeach.com.

import type { TenantSeed } from "../types";
import type { Contact, Conversation, ConversationStatus, DepartmentId, Message } from "@/lib/data/types";
import { TESORO } from "@/lib/hotel-muestra/tesoro";
import { habitacionDe, totalEstadia } from "@/lib/hotel-muestra/libro";
import { diaSV, dinero, fechaCorta, sumarDias } from "@/lib/hotel-muestra/fechas";

const ME = "me";
const AHORA = Date.now();
const HOY = diaSV(AHORA);

const haceMin = (min: number) => new Date(AHORA - min * 60_000).toISOString();

const messages: Message[] = [];
let n = 0;

function cliente(conv: string, texto: string, min: number) {
  messages.push({ id: `tm${++n}`, conversationId: conv, autor: "cliente", texto, ts: haceMin(min) });
}

function agente(conv: string, texto: string, min: number) {
  messages.push({ id: `tm${++n}`, conversationId: conv, autor: "staff", staffId: "ia", texto, ts: haceMin(min) });
}

function equipo(conv: string, staffId: string, texto: string, min: number) {
  messages.push({ id: `tm${++n}`, conversationId: conv, autor: "staff", staffId, texto, ts: haceMin(min) });
}

/** Fechas y precio de un apartado de la muestra, igual que en el tablero. */
function apartado(id: string) {
  const a = TESORO.apartados.find((x) => x.id === id) ?? TESORO.cerradas.find((x) => x.id === id);
  if (!a) throw new Error(`Apartado de muestra inexistente: ${id}`);
  const ref = habitacionDe(TESORO, a.habitacionId);
  if (!ref) throw new Error(`Habitación inexistente: ${a.habitacionId}`);
  const desde = sumarDias(HOY, a.llegaEnDias);
  return { desde, hasta: sumarDias(desde, a.noches), total: totalEstadia(ref.hab, desde, a.noches) };
}

// ── t1 · Daniel: dejó el celular en la piscina ──
cliente("t1", "Buenas, ayer fui con day pass y creo que se me quedó el celular en la piscina grande", 410);
agente("t1", "¡Hola, Daniel! Ya le aviso al equipo de Day Pass para que lo busquen. ¿Cómo es el celular?", 409);
cliente("t1", "Negro, con funda transparente", 405);
equipo("t1", "s4", "Daniel, lo tenemos en recepción 🙌 Puede pasar por él cuando guste con su DUI.", 370);
cliente("t1", "¡Mil gracias! Paso el sábado", 366);

// ── t2 · Rodrigo: habitación para cuatro el sábado ──
cliente("t2", "Buenas tardes, ¿tienen habitación para 2 adultos y 2 niños?", 7);
agente("t2", "¡Hola, Rodrigo! Sí, la Habitación Cuádruple es ideal para su familia, con dos camas dobles. ¿Para qué fechas sería?", 6);
cliente("t2", "Para este sábado, una noche", 3);
cliente("t2", "¿Incluye el day pass para los niños?", 2);

// ── t3 · Marta: apartó la Cuádruple y quiere pagar con tarjeta al llegar ──
{
  const a = apartado("AP-3112");
  cliente("t3", "Hola, quiero reservar para 4, somos mi esposo, yo y dos niños", 45);
  agente("t3", "¡Hola, Marta! ¿Para qué fechas sería?", 44);
  cliente("t3", `Del ${fechaCorta(a.desde)} al ${fechaCorta(a.hasta)}`, 40);
  agente("t3", `¡Hay disponibilidad! La Habitación Cuádruple esas dos noches sale en ${dinero(a.total)}. ¿Se la aparto? El apartado dura una hora y se confirma con el depósito.`, 39);
  cliente("t3", "Sí, apártemela por favor", 35);
  agente("t3", "¡Listo! Quedó apartada por una hora a su nombre. Le comparto los datos para el depósito 😊", 34);
  cliente("t3", "¿Y no puedo pagar con tarjeta cuando llegue?", 14);
  agente("t3", "Eso lo autoriza el equipo de Reservas. Ya les pasé su consulta y le escriben por aquí en un momento.", 13);
}

// ── t4 · Paola: cama de Day Pass para el sábado ──
cliente("t4", "Hola! ¿Las camas de day pass se pueden reservar?", 90);
agente("t4", "¡Hola, Paola! Sí, tenemos 3 camas de Day Pass con sala, a $50 en temporada baja. Se reservan pagando por adelantado. Le paso con el equipo para apartarle una.", 89);
equipo("t4", "s4", "Hola, Paola, soy Ana Cecilia. Para el sábado todavía hay una disponible. ¿Se la aparto?", 68);
cliente("t4", "¡Sí porfa!", 66);

// ── t5 · Gloria: comprobante de la Deluxe Triple ──
{
  const a = apartado("AP-3110");
  cliente("t5", "Buenas, ¿tienen algo para 3 personas para mañana?", 190);
  agente("t5", `¡Hola, Gloria! La Deluxe Triple tiene cama matrimonial más una plegable. Del ${fechaCorta(a.desde)} al ${fechaCorta(a.hasta)} sale en ${dinero(a.total)}. ¿Se la aparto?`, 189);
  cliente("t5", "Sí, por favor", 185);
  agente("t5", "¡Listo! Quedó apartada por una hora. Cuando haga el depósito, mándeme la foto del comprobante por aquí.", 184);
  cliente("t5", "Ya deposité, aquí está el comprobante", 130);
  agente("t5", "¡Gracias, Gloria! Reservas lo verifica y le confirma por aquí.", 129);
  equipo("t5", "s2", "Hola, Gloria, soy Karla de Reservas. Estoy revisando que haya entrado completo y le confirmo.", 110);
}

// ── t6 · Luis Alberto: suite con piscina para la familia ──
{
  const a = apartado("AP-3109");
  cliente("t6", "Buenas, somos 6 adultos, ¿qué opción tienen?", 60);
  agente("t6", `¡Hola, Luis Alberto! La Suite con piscina privada es para 6 adultos, con dos habitaciones. Del ${fechaCorta(a.desde)} al ${fechaCorta(a.hasta)} sale en ${dinero(a.total)}. ¿Se la aparto?`, 58);
  // Apartada hace 48 minutos: le quedan los 12 que dice el tablero.
  cliente("t6", "Dale, apártela", 49);
  agente("t6", "¡Listo! Quedó apartada por una hora a su nombre. Le paso los datos para el depósito.", 48);
}

// ── t7 · Jorge: huésped en casa, no sale agua caliente ──
cliente("t7", "Buenos días, en la habitación no sale agua caliente en la ducha", 155);
agente("t7", "¡Disculpe la molestia, Jorge! Ya le aviso a mantenimiento para que lo revisen de inmediato.", 154);
equipo("t7", "s5", "Buenos días, Jorge, soy Roberto de mantenimiento. Ya estamos revisando el calentador. Si prefiere, le cambiamos de habitación.", 140);
cliente("t7", "Mejor espero, gracias por la rapidez", 138);

// ── t8 · Andrea: boda para 150 en la playa ──
cliente("t8", "Hola! Me caso en marzo y quiero hacer la boda en la playa, seríamos como 150", 100);
agente("t8", "¡Felicidades, Andrea! Nuestro equipo de eventos le arma la cotización con ceremonia en la playa y recepción. ¿Ya tiene una fecha?", 99);
cliente("t8", "Sábado 13 de marzo. ¿También tienen habitaciones para la familia?", 95);

// ── t9 · Kevin: perro de 30 kg ──
cliente("t9", "Hola, ¿puedo llevar a mi perro al day pass?", 40);
agente("t9", "¡Hola, Kevin! Las mascotas son bienvenidas en Day Pass si son tranquilas y de hasta 10 kg, con correa y vacunas al día 🐾", 39);
cliente("t9", "Es un golden de 30 kg pero es súper tranquilo, ¿no hay excepción?", 30);

// ── t10 · Ramón: graduación de 80 personas ──
cliente("t10", "Buenas, soy del comité de graduación, queremos cotizar una cena para 80 personas en diciembre", 930);
agente("t10", "¡Hola, Ramón! Con gusto. Le paso con nuestra gerencia de eventos para cotizarle.", 929);
equipo("t10", ME, "Hola, Ramón, soy Patricia. Le preparo una propuesta con menú de tres tiempos y la sala de conferencias. ¿Qué fecha tienen?", 860);
cliente("t10", "Sería el viernes 11 de diciembre. ¿El precio incluye DJ?", 50);

// ── t11 · Rosa Elena: queja del restaurante, ya atendida ──
cliente("t11", "Fuimos el domingo con day pass y esperamos 40 minutos la comida 😞", 1420);
agente("t11", "Lamento mucho la espera, Rosa Elena. Le paso su comentario a la gerencia para que le den seguimiento.", 1419);
equipo("t11", ME, "Rosa Elena, le pido una disculpa. Ese domingo tuvimos lleno total. Para su próxima visita le regalamos el Day Pass de los niños.", 1380);
cliente("t11", "Muchas gracias por la atención", 1370);

// ── t12 · Alejandro: late check out en la Suite Presidencial ──
cliente("t12", "¿Podemos quedarnos hasta las 3 el domingo en la suite?", 1810);
agente("t12", "Lo consulto con Reservas, Alejandro, que son quienes autorizan la salida tarde.", 1809);
equipo("t12", "s2", "Listo, Alejandro: tiene salida a las 3:00 p. m. el domingo.", 1780);
cliente("t12", "¡Excelente, gracias!", 1775);

// ── t13 · Beatriz: excursión de la parroquia ──
cliente("t13", "Buenas, somos un grupo de la parroquia, 30 adultos y 10 niños, ¿tienen precio de grupo para day pass?", 520);
agente("t13", "¡Hola, Beatriz! El Day Pass es de $45 por adulto y $25 por niño. Para grupos le paso con el equipo de Day Pass para que le cotice.", 519);
equipo("t13", "s4", "Hola, Beatriz, soy Ana Cecilia. Le preparo la cotización para el domingo. ¿Llegarían en bus?", 490);
cliente("t13", "Sí, en un bus de 45 pasajeros", 480);

// ── t14 · Ernesto: cumpleaños confirmado ──
{
  const a = apartado("AP-3104");
  cliente("t14", "Hola, queremos celebrar el cumpleaños de mi hijo, somos 3", 1600);
  agente("t14", `¡Qué bonito plan, Ernesto! La Habitación Triple del ${fechaCorta(a.desde)} al ${fechaCorta(a.hasta)} sale en ${dinero(a.total)}. ¿Se la aparto?`, 1599);
  cliente("t14", "Sí", 1590);
  equipo("t14", "s2", "¡Confirmada, Ernesto! Los esperamos para celebrar 🎂", 1520);
}

const contacts: Contact[] = [
  { id: "c1", nombre: "Daniel Guzmán", telefono: "50391230101", canal: "whatsapp", tags: ["Day Pass"] },
  { id: "c2", nombre: "Rodrigo Pineda", telefono: "50391230102", canal: "whatsapp", tags: ["Reservas", "Familia"] },
  { id: "c3", nombre: "Marta Hernández", telefono: "50391230103", canal: "whatsapp", notas: "Viene con dos niños.", tags: ["Reservas", "Familia", "Pago"] },
  { id: "c4", nombre: "Paola Rivas", handle: "@paola.rivas.sv", canal: "instagram", tags: ["Day Pass"] },
  { id: "c5", nombre: "Gloria Ventura", telefono: "50391230105", canal: "whatsapp", tags: ["Reservas", "Pago"] },
  { id: "c6", nombre: "Luis Alberto Mejía", handle: "Luis Alberto Mejía", canal: "facebook", tags: ["Reservas", "Grupo"] },
  { id: "c7", nombre: "Jorge Alvarado", telefono: "50391230107", canal: "whatsapp", tags: ["Huésped en casa"] },
  { id: "c8", nombre: "Andrea Campos", telefono: "50391230108", canal: "whatsapp", tags: ["Eventos"] },
  { id: "c9", nombre: "Kevin Ramos", handle: "@kevin.ramos", canal: "instagram", tags: ["Day Pass", "Mascotas"] },
  { id: "c10", nombre: "Ramón Escobar", telefono: "50391230110", canal: "whatsapp", tags: ["Eventos", "Grupo"] },
  { id: "c11", nombre: "Rosa Elena Díaz", handle: "Rosa Elena Díaz", canal: "facebook", tags: ["Day Pass", "Familia"] },
  { id: "c12", nombre: "Alejandro Funes", telefono: "50391230112", canal: "whatsapp", tags: ["Reservas"] },
  { id: "c13", nombre: "Beatriz Ramírez", telefono: "50391230113", canal: "whatsapp", tags: ["Day Pass", "Grupo"] },
  { id: "c14", nombre: "Ernesto Portillo", telefono: "50391230114", canal: "whatsapp", notas: "Cumpleaños de su hijo.", tags: ["Reservas", "Familia"] },
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
  { id: "t1", contactId: "c1", canal: "whatsapp", departamento: "club", estado: "resuelto", asignadoA: "s4", noLeidos: 0 },
  { id: "t2", contactId: "c2", canal: "whatsapp", departamento: "reservas", estado: "nuevo", noLeidos: 2 },
  { id: "t3", contactId: "c3", canal: "whatsapp", departamento: "reservas", estado: "nuevo", noLeidos: 1 },
  { id: "t4", contactId: "c4", canal: "instagram", departamento: "club", estado: "en_progreso", asignadoA: "s4", noLeidos: 1 },
  { id: "t5", contactId: "c5", canal: "whatsapp", departamento: "reservas", estado: "en_progreso", asignadoA: "s2", noLeidos: 0 },
  { id: "t6", contactId: "c6", canal: "facebook", departamento: "reservas", estado: "en_progreso", noLeidos: 0 },
  { id: "t7", contactId: "c7", canal: "whatsapp", departamento: "conserjeria", estado: "en_progreso", asignadoA: "s5", noLeidos: 0 },
  { id: "t8", contactId: "c8", canal: "whatsapp", departamento: "eventos", estado: "nuevo", noLeidos: 1 },
  { id: "t9", contactId: "c9", canal: "instagram", departamento: "club", estado: "nuevo", noLeidos: 1 },
  { id: "t10", contactId: "c10", canal: "whatsapp", departamento: "eventos", estado: "en_progreso", asignadoA: ME, noLeidos: 1 },
  { id: "t11", contactId: "c11", canal: "facebook", departamento: "club", estado: "resuelto", asignadoA: ME, noLeidos: 0 },
  { id: "t12", contactId: "c12", canal: "whatsapp", departamento: "reservas", estado: "resuelto", asignadoA: "s2", noLeidos: 0 },
  { id: "t13", contactId: "c13", canal: "whatsapp", departamento: "club", estado: "en_progreso", asignadoA: "s4", noLeidos: 0 },
  { id: "t14", contactId: "c14", canal: "whatsapp", departamento: "reservas", estado: "resuelto", asignadoA: "s2", noLeidos: 0 },
];

const conversations: Conversation[] = CONVERSACIONES.map((c) => {
  const ultimo = messages.filter((m) => m.conversationId === c.id).reduce((max, m) => (m.ts > max ? m.ts : max), "");
  return { ...c, ultimoMensajeTs: ultimo || haceMin(600) };
});

export const tesoroSeed: TenantSeed = {
  ME,
  departments: [
    { id: "reservas", nombre: "Reservas", color: "#0b7285" },
    { id: "club", nombre: "Day Pass", color: "#02a3b5" },
    { id: "eventos", nombre: "Eventos", color: "#0f2c30" },
    { id: "conserjeria", nombre: "Recepción", color: "#475569" },
  ],
  staff: [
    { id: ME, nombre: "Patricia Rodríguez", rol: "gerente_marketing", departamento: "eventos", iniciales: "PR" },
    { id: "s2", nombre: "Karla Orellana", rol: "medico", departamento: "reservas", iniciales: "KO" },
    { id: "s3", nombre: "José Luis Rivera", rol: "recepcion", departamento: "conserjeria", iniciales: "JR" },
    { id: "s4", nombre: "Ana Cecilia Flores", rol: "recepcion", departamento: "club", iniciales: "AF" },
    { id: "s5", nombre: "Roberto Cañas", rol: "jefe", departamento: "conserjeria", iniciales: "RC" },
  ],
  contacts,
  conversations,
  messages,
  internalChannels: [
    { id: "ic1", nombre: "general", tipo: "canal", miembros: [ME, "s2", "s3", "s4", "s5"] },
    { id: "ic2", nombre: "reservas", tipo: "canal", miembros: [ME, "s2", "s3"] },
    { id: "ic3", nombre: "day-pass", tipo: "canal", miembros: [ME, "s4", "s5"] },
    { id: "dm1", nombre: "Karla Orellana", tipo: "dm", miembros: [ME, "s2"] },
  ],
  internalMessages: [
    { id: "im1", channelId: "ic1", staffId: ME, texto: "Este fin de semana viene casi lleno: prioricemos las familias que ya apartaron y confirmemos los depósitos temprano.", ts: haceMin(620) },
    { id: "im2", channelId: "ic2", staffId: "s2", texto: "Quedan dos apartados esperando pago de Marina. El de la Deluxe Triple ya mandó comprobante, lo estoy verificando.", ts: haceMin(108) },
    { id: "im3", channelId: "ic2", staffId: "s3", texto: "La Suite Presidencial queda libre a las 3:00 p. m. el domingo por la salida tarde.", ts: haceMin(1770) },
    { id: "im4", channelId: "ic3", staffId: "s4", texto: "Apareció el celular de Daniel Guzmán en la piscina grande, queda en recepción.", ts: haceMin(372) },
    { id: "im5", channelId: "ic3", staffId: "s4", texto: "El domingo llega el grupo de la parroquia: 40 personas en bus. Reservemos espacio en el parqueo.", ts: haceMin(470) },
    { id: "im6", channelId: "dm1", staffId: "s2", texto: "Marta Hernández pregunta si puede pagar con tarjeta al llegar. ¿Lo autorizamos?", ts: haceMin(12) },
  ],
  socialPosts: [],
  socialStats: [],
  metrics: [{ label: "Conversaciones hoy", valor: conversations.filter((c) => c.ultimoMensajeTs >= haceMin(24 * 60)).length }],
};
