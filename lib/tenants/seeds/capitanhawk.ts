// Datos semilla de la bandeja de Capitán Hawk.
//
// Cada conversación es la otra punta de algo que se ve en el tablero o en los
// tickets: el apartado que espera el pago, el comprobante por verificar, el
// cumpleaños de 25, los perros grandes, los lentes olvidados. Así "Ver chat"
// desde el tablero abre la conversación que corresponde.
//
// Personas, teléfonos y montos son INVENTADOS (teléfonos 503 9xxx xxxx, serie
// que no se asigna en El Salvador). La visita de día, el horario y las reglas
// del lugar salen de lo que publica Capitán Hawk.

import type { TenantSeed } from "../types";
import type { Contact, Conversation, ConversationStatus, DepartmentId, Message } from "@/lib/data/types";
import { CAPITANHAWK } from "@/lib/hotel-muestra/capitanhawk";
import { habitacionDe, totalEstadia } from "@/lib/hotel-muestra/libro";
import { diaSV, dinero, fechaCorta, sumarDias } from "@/lib/hotel-muestra/fechas";
import { publicacionesDeMuestra } from "@/lib/hotel-muestra/redes";

const ME = "me";
const AHORA = Date.now();
const HOY = diaSV(AHORA);

const haceMin = (min: number) => new Date(AHORA - min * 60_000).toISOString();

const messages: Message[] = [];
let n = 0;

function cliente(conv: string, texto: string, min: number) {
  messages.push({ id: `hm${++n}`, conversationId: conv, autor: "cliente", texto, ts: haceMin(min) });
}

function agente(conv: string, texto: string, min: number) {
  messages.push({ id: `hm${++n}`, conversationId: conv, autor: "staff", staffId: "ia", texto, ts: haceMin(min) });
}

function equipo(conv: string, staffId: string, texto: string, min: number) {
  messages.push({ id: `hm${++n}`, conversationId: conv, autor: "staff", staffId, texto, ts: haceMin(min) });
}

/** Fechas y precio de un apartado de la muestra, igual que en el tablero. */
function apartado(id: string) {
  const a = CAPITANHAWK.apartados.find((x) => x.id === id) ?? CAPITANHAWK.cerradas.find((x) => x.id === id);
  if (!a) throw new Error(`Apartado de muestra inexistente: ${id}`);
  const ref = habitacionDe(CAPITANHAWK, a.habitacionId);
  if (!ref) throw new Error(`Habitación inexistente: ${a.habitacionId}`);
  const desde = sumarDias(HOY, a.llegaEnDias);
  return { desde, hasta: sumarDias(desde, a.noches), total: totalEstadia(ref.hab, desde, a.noches), hab: ref.hab.nombre };
}

// ── h1 · Karla: bungalow con su schnauzer, esperando el pago ──
{
  const a = apartado("AP-1208");
  cliente("h1", "Hola, buen día. ¿Tienen bungalow disponible? Somos 2 adultos y una niña de 6 años", 40);
  agente("h1", `¡Hola! Le saluda MIA, de Capitán Hawk 🌴 Para el ${fechaCorta(a.desde)} tengo libre el Bungalow Ecológico, con aire acondicionado y a pasos de la playa. ¿Sería solo una noche?`, 39);
  cliente("h1", "Sí, una noche. ¿Puedo llevar a mi perrito? Es un schnauzer", 34);
  agente("h1", `¡Claro que sí! Somos pet friendly y su schnauzer entra sin costo 🐾 La noche sale en ${dinero(a.total)}. ¿Se lo aparto?`, 33);
  cliente("h1", "Sí, apártemelo a nombre de Karla Villalta", 28);
  agente("h1", "¡Listo, Karla! Quedó apartado por una hora a su nombre. Le paso los datos para el depósito.", 27);
  cliente("h1", "Perfecto, ¿aceptan transferencia de Agrícola?", 4);
}

// ── h2 · Daniela: visita de día para cinco el domingo ──
cliente("h2", "Hola! cuánto cuesta el day pass?", 30);
agente("h2", "¡Hola! La visita de día es de $10 por persona más $10 en consumibles en el bar. Incluye palapa privada frente al mar, hamaca, piscina, duchas y parqueo. De 8:00 a. m. a 6:00 p. m.", 29);
cliente("h2", "Y se puede llevar comida?", 20);
agente("h2", "Sí, puede traer sus alimentos; las bebidas se compran en el bar. ¿Para qué día nos visitaría?", 19);
cliente("h2", "El domingo, somos 5 🙌", 14);

// ── h3 · Nelson: cumpleaños para 25 ──
cliente("h3", "Buenas, queremos celebrar un cumpleaños, seríamos como 25 personas entre adultos y niños. ¿Tienen paquete?", 55);
agente("h3", "¡Qué buena celebración! Para grupos de ese tamaño una persona del equipo le arma la propuesta con palapas reservadas. Ya le pasé su caso a Carlos, de eventos.", 54);
equipo("h3", "s3", "Hola Nelson, soy Carlos de Capitán Hawk. Para 25 personas le reservamos 3 palapas juntas frente al mar. ¿Qué fecha tienen en mente?", 40);
cliente("h3", "Sería el sábado 29. ¿Pueden poner música?", 26);

// ── h4 · Fernando: Suite Capitán para su aniversario, mandó comprobante ──
{
  const a = apartado("AP-1206");
  cliente("h4", "Quiero reservar la Suite Capitán para mi aniversario", 90);
  agente("h4", `¡Felicidades! La Suite Capitán está libre del ${fechaCorta(a.desde)} al ${fechaCorta(a.hasta)}: cama matrimonial, aire acondicionado, baño completo y jardín privado, por ${dinero(a.total)}. ¿Se la aparto?`, 89);
  cliente("h4", "Sí por favor, Fernando Ayala", 80);
  agente("h4", "¡Listo, Fernando! Quedó apartada por una hora. Cuando haga el depósito, mándeme la foto del comprobante por aquí.", 79);
  cliente("h4", "Ya transferí, aquí va el comprobante 🙏", 23);
  agente("h4", "¡Gracias! Reservas lo verifica y le confirma por aquí.", 22);
}

// ── h5 · Sarah: habitación de pareja, apartada por Instagram ──
{
  const a = apartado("AP-1207");
  cliente("h5", "Hi! Do you have rooms available? Two people", 62);
  agente("h5", `¡Hola! Sí, del ${fechaCorta(a.desde)} al ${fechaCorta(a.hasta)} tengo la Habitación de Pareja por ${dinero(a.total)}. ¿Se la aparto?`, 61);
  cliente("h5", "Yes please! Is there wifi?", 42);
  agente("h5", "¡Listo, quedó apartada por una hora! No tenemos wifi: es un lugar para desconectarse 🌊", 41);
}

// ── h6 · Wilfredo: llega hoy con su familia ──
cliente("h6", "Ya vamos en camino, llegamos como a las 3", 140);
agente("h6", "¡Perfecto, Wilfredo! El check in es desde las 3:00 p. m. Le esperamos en Playa El Amatal, km 24.5 de la Carretera Litoral. Buen viaje 🚗", 139);
equipo("h6", "s4", "Ya los recibimos, bienvenidos a Capitán Hawk 🙌", 100);
cliente("h6", "Gracias! Todo muy bonito", 95);

// ── h7 · Gabriela: dos labradores a la visita de día ──
cliente("h7", "¿Aceptan mascotas en la visita de día? Tengo dos labradores", 135);
agente("h7", "¡Sí! Somos pet friendly y sus mascotas entran sin costo 🐾 Para dos perros grandes le confirmo con el equipo si hay alguna indicación especial.", 134);
cliente("h7", "Va, quedo pendiente", 130);

// ── h8 · Ricardo: fogata para propuesta de matrimonio ──
cliente("h8", "Hola, quiero pedirle matrimonio a mi novia en la fogata del sábado. ¿Me ayudan a prepararlo?", 610);
agente("h8", "¡Qué bonito! Le paso su pedido a gerencia para coordinar la decoración y el momento exacto 💍", 609);
equipo("h8", ME, "Hola Ricardo, soy Alejandro. Le preparamos la fogata con decoración a las 6:00 p. m. ¿Le gustaría reservar también la Suite Capitán?", 560);
cliente("h8", "¡Sí! ¿Cuánto sería?", 540);

// ── h9 · Fátima: convivio de empresa ──
cliente("h9", "Hola, trabajo en una empresa y queremos hacer un convivio de fin de año con 40 personas", 250);
agente("h9", "¡Con mucho gusto! Para un grupo de 40 una persona del equipo le prepara una propuesta a la medida. Ya le dejé el caso a eventos.", 249);
cliente("h9", "Perfecto, quedo pendiente", 240);

// ── h10 · Mauricio: lentes olvidados en la palapa ──
cliente("h10", "Hola! El sábado estuve de visita y creo que dejé mis lentes en la palapa 4 😩", 430);
agente("h10", "¡Hola, Mauricio! Ya le aviso al equipo para que los busquen. ¿Cómo son?", 429);
cliente("h10", "Ray-Ban negros", 425);
equipo("h10", "s4", "¡Los encontramos! Quedan guardados en recepción a su nombre 🙌", 400);

const contacts: Contact[] = [
  { id: "c1", nombre: "Karla Villalta", telefono: "50391020311", canal: "whatsapp", correo: "karla.villalta@correo.com", tags: ["Reservas", "Pet friendly", "Pago"] },
  { id: "c2", nombre: "Daniela Rivas", handle: "@dani.rivas", canal: "instagram", tags: ["Visita de día"] },
  { id: "c3", nombre: "Nelson Aguirre", handle: "Nelson Aguirre", canal: "facebook", tags: ["Grupos y eventos"] },
  { id: "c4", nombre: "Fernando Ayala", telefono: "50391020322", canal: "whatsapp", notas: "Aniversario.", tags: ["Reservas", "Pago"] },
  { id: "c5", nombre: "Sarah Nolan", handle: "@sarah.nolan", canal: "instagram", tags: ["Reservas"] },
  { id: "c6", nombre: "Wilfredo Chacón", telefono: "50391020333", canal: "whatsapp", tags: ["Huésped en casa"] },
  { id: "c7", nombre: "Gabriela Menjívar", telefono: "50391020344", canal: "whatsapp", tags: ["Visita de día", "Pet friendly"] },
  { id: "c8", nombre: "Ricardo Portillo", handle: "Ricardo Portillo", canal: "facebook", tags: ["Grupos y eventos"] },
  { id: "c9", nombre: "Fátima Escobar", telefono: "50391020355", canal: "whatsapp", correo: "fatima.escobar@correo.com", tags: ["Grupos y eventos"] },
  { id: "c10", nombre: "Mauricio Rosales", handle: "@mau.rosales", canal: "instagram", tags: ["Visita de día"] },
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
  { id: "h1", contactId: "c1", canal: "whatsapp", departamento: "reservas", estado: "nuevo", noLeidos: 1 },
  { id: "h2", contactId: "c2", canal: "instagram", departamento: "club", estado: "en_progreso", noLeidos: 1 },
  { id: "h3", contactId: "c3", canal: "facebook", departamento: "eventos", estado: "en_progreso", asignadoA: "s3", noLeidos: 1 },
  { id: "h4", contactId: "c4", canal: "whatsapp", departamento: "reservas", estado: "en_progreso", noLeidos: 0 },
  { id: "h5", contactId: "c5", canal: "instagram", departamento: "reservas", estado: "en_progreso", noLeidos: 0 },
  { id: "h6", contactId: "c6", canal: "whatsapp", departamento: "conserjeria", estado: "resuelto", asignadoA: "s4", noLeidos: 0 },
  { id: "h7", contactId: "c7", canal: "whatsapp", departamento: "club", estado: "nuevo", noLeidos: 1 },
  { id: "h8", contactId: "c8", canal: "facebook", departamento: "eventos", estado: "en_progreso", asignadoA: ME, noLeidos: 1 },
  { id: "h9", contactId: "c9", canal: "whatsapp", departamento: "eventos", estado: "nuevo", noLeidos: 1 },
  { id: "h10", contactId: "c10", canal: "instagram", departamento: "club", estado: "resuelto", asignadoA: "s4", noLeidos: 0 },
];

const conversations: Conversation[] = CONVERSACIONES.map((c) => {
  const ultimo = messages.filter((m) => m.conversationId === c.id).reduce((max, m) => (m.ts > max ? m.ts : max), "");
  return { ...c, ultimoMensajeTs: ultimo || haceMin(600) };
});

export const capitanhawkSeed: TenantSeed = {
  ME,
  departments: [
    { id: "reservas", nombre: "Reservas", color: "#0e7490" },
    { id: "club", nombre: "Visitas de día", color: "#d4772c" },
    { id: "eventos", nombre: "Grupos y eventos", color: "#7c3aed" },
    { id: "conserjeria", nombre: "Recepción", color: "#0a3646" },
  ],
  staff: [
    { id: ME, nombre: "Alejandro Ramos", rol: "gerente_marketing", departamento: "eventos", iniciales: "AR" },
    { id: "s2", nombre: "Daniela Flores", rol: "medico", departamento: "reservas", iniciales: "DF" },
    { id: "s3", nombre: "Carlos Rivera", rol: "recepcion", departamento: "eventos", iniciales: "CR" },
    { id: "s4", nombre: "Andrés Molina", rol: "recepcion", departamento: "conserjeria", iniciales: "AM" },
    { id: "s5", nombre: "Sofía Quintanilla", rol: "jefe", departamento: "club", iniciales: "SQ" },
  ],
  contacts,
  conversations,
  messages,
  internalChannels: [
    { id: "ic1", nombre: "general", tipo: "canal", miembros: [ME, "s2", "s3", "s4", "s5"] },
    { id: "ic2", nombre: "reservas", tipo: "canal", miembros: [ME, "s2", "s3"] },
    { id: "ic3", nombre: "operacion", tipo: "canal", miembros: [ME, "s4", "s5"] },
    { id: "dm1", nombre: "Daniela Flores", tipo: "dm", miembros: [ME, "s2"] },
  ],
  internalMessages: [
    { id: "im1", channelId: "ic1", staffId: "s5", texto: "Buenos días equipo. Este fin de semana viene lleno: grupos de visita de día y los bungalows completos el sábado.", ts: haceMin(300) },
    { id: "im2", channelId: "ic1", staffId: "s2", texto: "MIA ya apartó la Suite Capitán para un aniversario; en cuanto confirme el depósito les aviso para preparar un detalle.", ts: haceMin(280) },
    { id: "im3", channelId: "ic2", staffId: "s2", texto: "Carlos, ¿podemos juntar 3 palapas para el cumpleaños del 29?", ts: haceMin(35) },
    { id: "im4", channelId: "ic2", staffId: "s3", texto: "Sí, las del lado norte quedan libres ese día. Le mando la propuesta a Nelson.", ts: haceMin(30) },
    { id: "im5", channelId: "ic3", staffId: "s5", texto: "Recuerden encender la iluminación de la piscina a las 6:00 p. m. y preparar la leña para la fogata del sábado.", ts: haceMin(200) },
  ],
  socialPosts: publicacionesDeMuestra(CAPITANHAWK, HOY),
  socialStats: CAPITANHAWK.redes?.cuentas ?? [],
  metrics: [{ label: "Conversaciones hoy", valor: conversations.filter((c) => c.ultimoMensajeTs >= haceMin(24 * 60)).length }],
};
