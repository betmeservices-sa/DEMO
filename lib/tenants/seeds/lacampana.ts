// Datos de ejemplo del demo de Restaurante La Campana.
//
// Platos, precios y sucursales son los del sitio del cliente
// (lib/lacampana/). Clientes, teléfonos, pedidos y conversaciones son
// inventados. Las horas se calculan desde el momento en que se abre el panel,
// así la bandeja siempre se ve del día.

import type { TenantSeed } from "../types";
import type { Contact, Conversation, InternalMessage, Message, SocialPost } from "@/lib/data/types";

const ME = "me";
const SOFIA = { autor: "staff" as const, staffId: "ia", staffNombre: "Sofía (IA)" };

function hace(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}

const contacts: Contact[] = [
  { id: "c1", nombre: "Karla", apellido: "Villalta", telefono: "+503 7622 1190", canal: "whatsapp", correo: "karla.villalta@gmail.com", tags: ["Pedido a domicilio", "Cliente frecuente"] },
  { id: "c2", nombre: "Daniela", apellido: "Rivas", handle: "@dani.rivas", canal: "instagram", tags: ["Promo del día"] },
  { id: "c3", nombre: "Nelson", apellido: "Aguirre", handle: "Nelson Aguirre", canal: "facebook", tags: ["Evento o catering"] },
  { id: "c4", nombre: "Fernando", apellido: "Ayala", telefono: "+503 6144 7752", canal: "whatsapp", correo: "fer.ayala@outlook.com", tags: ["Retiro en sucursal"] },
  { id: "c5", nombre: "Marisol", apellido: "Hernández", telefono: "+503 7455 0318", canal: "whatsapp", tags: ["Queja"] },
  { id: "c6", nombre: "Wilfredo", apellido: "Chacón", telefono: "+503 7208 9943", canal: "whatsapp", tags: ["Pedido a domicilio"] },
  { id: "c7", nombre: "Gabriela", apellido: "Menjívar", handle: "@gabi.menjivar", canal: "instagram", tags: ["Retiro en sucursal"] },
  { id: "c8", nombre: "Ricardo", apellido: "Portillo", handle: "Ricardo Portillo", canal: "facebook", tags: ["Pedido a domicilio"] },
  { id: "c9", nombre: "Fátima", apellido: "Escobar", telefono: "+503 7390 2281", canal: "whatsapp", correo: "fatima.escobar@empresa.com.sv", tags: ["Evento o catering"] },
  { id: "c10", nombre: "Mauricio", apellido: "Rosales", handle: "@mau.rosales", canal: "instagram", tags: ["Promo del día", "Cliente frecuente"] },
];

const conversations: Conversation[] = [
  { id: "v1", canal: "whatsapp", contactId: "c1", departamento: "ventas", estado: "nuevo", noLeidos: 2, ultimoMensajeTs: hace(2), sucursalId: "a" },
  { id: "v2", canal: "instagram", contactId: "c2", departamento: "conserjeria", estado: "en_progreso", noLeidos: 0, ultimoMensajeTs: hace(11), sucursalId: "a", paginaNombre: "lacampanacyt" },
  { id: "v3", canal: "facebook", contactId: "c3", departamento: "eventos", estado: "en_progreso", asignadoA: "s3", noLeidos: 1, ultimoMensajeTs: hace(24), sucursalId: "a", paginaNombre: "La Campana" },
  { id: "v4", canal: "whatsapp", contactId: "c4", departamento: "conserjeria", estado: "resuelto", asignadoA: "s4", noLeidos: 0, ultimoMensajeTs: hace(38), sucursalId: "a" },
  { id: "v5", canal: "whatsapp", contactId: "c5", departamento: "atencion", estado: "en_progreso", asignadoA: "s2", noLeidos: 1, ultimoMensajeTs: hace(52), sucursalId: "a" },
  { id: "v6", canal: "whatsapp", contactId: "c6", departamento: "ventas", estado: "resuelto", noLeidos: 0, ultimoMensajeTs: hace(80), sucursalId: "a" },
  { id: "v7", canal: "instagram", contactId: "c7", departamento: "conserjeria", estado: "resuelto", noLeidos: 0, ultimoMensajeTs: hace(115), sucursalId: "a", paginaNombre: "lacampanacyt" },
  { id: "v8", canal: "facebook", contactId: "c8", departamento: "ventas", estado: "en_progreso", noLeidos: 0, ultimoMensajeTs: hace(170), sucursalId: "a", paginaNombre: "La Campana" },
  { id: "v9", canal: "whatsapp", contactId: "c9", departamento: "eventos", estado: "nuevo", asignadoA: "s3", noLeidos: 1, ultimoMensajeTs: hace(230), sucursalId: "a" },
  { id: "v10", canal: "instagram", contactId: "c10", departamento: "ventas", estado: "resuelto", noLeidos: 0, ultimoMensajeTs: hace(300), sucursalId: "a", paginaNombre: "lacampanacyt" },
];

// [conversación, minutos atrás, quién, texto]
type Linea = [string, number, "c" | "ia" | string, string];
const LINEAS: Linea[] = [
  ["v1", 10, "c", "Buenas! quiero pedir a domicilio para la casa, somos 4"],
  ["v1", 9, "ia", "¡Hola! Le saluda Sofía, de La Campana 🔔 Para 4 personas le recomiendo la Parrillada para 4 ($33.95): cuatro platos con carne y pollo, casamiento, ensalada, chorizo y tortillas. ¿Se la preparo o prefiere ver el menú?"],
  ["v1", 6, "c", "Sí esa, y agrégale una Taquiza de birria y 2 horchatas grandes"],
  ["v1", 5, "ia", "¡Buena elección! Su orden: Parrillada para 4 ($33.95), Taquiza de birria ($27.95) y 2 Horchatas de 32 oz ($4.50). Total $66.40 más envío. ¿A qué dirección se la enviamos, con un punto de referencia?"],
  ["v1", 2, "c", "Col. Escalón, pasaje Los Pinos #14, frente al parque. Pago con tarjeta"],
  ["v2", 28, "c", "Hola! la promo de burritos sigue hoy?"],
  ["v2", 27, "ia", "¡Hola! Sí, la Promo Burritos sigue: 2 burritos con frijoles, guacamole, carne, arroz, quesillo, chimol y cilantro por $9.75 🌯 ¿La quiere a domicilio o para retirar en sucursal?"],
  ["v2", 18, "c", "Para retirar en Plaza Mundo Soyapango"],
  ["v2", 17, "ia", "Perfecto, se la dejo lista en Plaza Mundo Soyapango. ¿A nombre de quién la anoto y a qué hora pasa por ella?"],
  ["v2", 11, "c", "Daniela, como a las 12:30 🙌"],
  ["v3", 60, "c", "Buenas tardes, quiero hacer el cumpleaños de mi papá en La Campana, seríamos unas 30 personas"],
  ["v3", 59, "ia", "¡Qué bonita celebración! Para grupos de 30 un asesor de eventos le arma la propuesta. ¿Me confirma la fecha y en qué sucursal le gustaría?"],
  ["v3", 50, "c", "Sábado 28 de noviembre en Unicentro Metrópolis, al mediodía"],
  ["v3", 49, "ia", "Anotado: 30 personas, sábado 28 de noviembre al mediodía en Unicentro Metrópolis. Ya le dejé el caso a Carlos, de eventos, y le escribe por aquí en breve."],
  ["v3", 35, "s3", "Hola Nelson, soy Carlos de eventos La Campana. Para 30 personas le proponemos parrilladas y taquizas para compartir con área reservada. ¿Tienen un presupuesto por persona en mente?"],
  ["v3", 24, "c", "Unos $15 por persona más o menos. ¿Se puede llevar pastel?"],
  ["v4", 75, "c", "Quiero pedir para retirar en Metrocentro Santa Ana: 2 Churrascos Campana y 2 tés de limón grandes"],
  ["v4", 74, "ia", "¡Con gusto! 2 Churrascos Campana ($25.90) y 2 Tés de limón de 32 oz ($4.50). Total $30.40. ¿Qué corte prefiere para los churrascos y a qué hora pasa?"],
  ["v4", 66, "c", "Puyazo los dos, paso a la 1. A nombre de Fernando Ayala"],
  ["v4", 65, "ia", "Listo, Fernando. Su pedido queda para retirar a la 1:00 p.m. en Metrocentro Santa Ana, a nombre de Fernando Ayala. ¡Buen provecho! 🔔"],
  ["v4", 38, "s4", "Fernando, su pedido ya está listo en caja. ¡Lo esperamos!"],
  ["v5", 70, "c", "Pedí ayer a domicilio y llegó frío y faltaba una bebida. No es la primera vez"],
  ["v5", 69, "ia", "Lamento mucho lo que pasó, Marisol. ¿Me indica de qué sucursal fue el pedido, a qué hora llegó y, si lo tiene, el número de orden? Así lo trasladamos a la gerencia de esa sucursal."],
  ["v5", 64, "c", "De Apopa, como a las 7:40 pm, orden 4718"],
  ["v5", 63, "ia", "Gracias, ya registré su caso con la sucursal Apopa (orden 4718). Le paso con Daniela, de servicio al cliente, para darle seguimiento."],
  ["v5", 52, "s2", "Marisol, le saluda Daniela. Ya hablé con el gerente de Apopa y estamos revisando qué pasó con la entrega. Le escribo hoy mismo con una respuesta."],
  ["v6", 120, "c", "Me puede mandar el menú?"],
  ["v6", 119, "ia", "¡Claro! Aquí puede ver el menú completo con fotos y precios, y pedir directo: lacampanacyt.com 🔔 ¿Le ayudo a armar su pedido por aquí?"],
  ["v6", 100, "c", "Quiero 2 Hamburguesas La Texana y unas papas, a domicilio en San Martín"],
  ["v6", 99, "ia", "Perfecto: 2 Hamburguesas La Texana ($15.90) y 1 Entrada orden de papas ($3.50). Total $19.40 más envío. ¿Me comparte la dirección exacta?"],
  ["v6", 80, "c", "Ya se la pasé a la sucursal por teléfono, gracias!"],
  ["v7", 130, "c", "A qué hora abren en Lourdes?"],
  ["v7", 129, "ia", "Los pedidos en línea se reciben desde las 11:00 a.m. ¿Le dejo algo listo para retirar en Lourdes?"],
  ["v7", 115, "c", "Sí, unos Nachos Campana de birria para las 11:30"],
  ["v8", 200, "c", "Tienen algo para 2 que no sea tan caro?"],
  ["v8", 199, "ia", "¡Sí! Mi Media Campana ($13.50) trae dos típicos mexicanos, una entrada de nachos y dos bebidas de 16 oz. O la Parrillada para 2 ($19.95). ¿Cuál le preparo?"],
  ["v8", 170, "c", "La Media Campana, para Valle Dulce"],
  ["v9", 245, "c", "Hola, soy de RRHH de una empresa en Santa Elena. Queremos cotizar almuerzo para 60 personas para el convivio de fin de año"],
  ["v9", 244, "ia", "¡Con mucho gusto! Para 60 personas un asesor de eventos le prepara la cotización. ¿Para qué fecha sería y prefieren venir a una sucursal o que se lo llevemos a la empresa?"],
  ["v9", 235, "c", "18 de diciembre, que lo lleven a la empresa"],
  ["v9", 234, "ia", "Anotado: 60 personas, 18 de diciembre, servicio en su empresa. Ya le dejé el caso a Carlos, de eventos, y le contacta hoy mismo."],
  ["v9", 230, "c", "Perfecto, quedo pendiente"],
  ["v10", 330, "c", "Vi en Insta lo de los Campacheros 😍 cuánto es?"],
  ["v10", 329, "ia", "¡Los Campacheros son ideales para compartir! $25.99: cuatro típicos mexicanos, una entrada de nachos y cuatro bebidas de 16 oz. ¿Se los mando a domicilio?"],
  ["v10", 300, "c", "Siii, ya hice el pedido en la página. Gracias!"],
];

const NOMBRES: Record<string, string> = { s2: "Daniela Flores", s3: "Carlos Rivera", s4: "Andrés Molina" };

const messages: Message[] = LINEAS.map(([conv, min, quien, texto], i) => {
  const base = { id: `m${i + 1}`, conversationId: conv, texto, ts: hace(min) };
  if (quien === "c") return { ...base, autor: "cliente" as const };
  if (quien === "ia") return { ...base, ...SOFIA };
  return { ...base, autor: "staff" as const, staffId: quien, staffNombre: NOMBRES[quien] };
});

const internalMessages: InternalMessage[] = [
  { id: "im1", channelId: "ic1", staffId: "s5", texto: "Buenos días equipo. Hoy arranca la promo de Parrillada para 2 en redes; esperen más pedidos a domicilio desde las 12.", ts: hace(300) },
  { id: "im2", channelId: "ic1", staffId: "s2", texto: "Anotado. Sofía ya está ofreciendo la parrillada cuando preguntan por algo para dos.", ts: hace(280) },
  { id: "im3", channelId: "ic2", staffId: "s3", texto: "Andrés, ¿Unicentro Metrópolis puede reservar área para 30 personas el sábado 28 al mediodía?", ts: hace(34) },
  { id: "im4", channelId: "ic2", staffId: "s4", texto: "Sí, la terraza queda libre ese día. Les aparto mesas.", ts: hace(30) },
  { id: "im5", channelId: "ic3", staffId: "s2", texto: "Tercera queja de pedido frío en Apopa esta semana. ¿Podemos revisar los tiempos del motorista de la noche?", ts: hace(50) },
];

function dias(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}
function enDias(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}

const socialPosts: SocialPost[] = [
  {
    id: "p1",
    red: "instagram",
    estado: "publicado",
    texto: "La Parrillada para 2 que estabas esperando 🔥 Carne y pollo, casamiento, ensalada, chorizo y tortillas por $19.95. Pídela por WhatsApp o en lacampanacyt.com",
    fecha: dias(2),
    imagenes: ["/fotos/lc/parrillada-para-2.jpg"],
    engagement: { alcance: 18400, meGusta: 1240, comentarios: 96, compartidos: 71, guardados: 188 },
  },
  {
    id: "p2",
    red: "facebook",
    estado: "publicado",
    texto: "¡Martes de birria! Tacos, quesadillas y tortas de birria a $9.45 en tus 21 sucursales La Campana 🌮",
    fecha: dias(5),
    imagenes: ["/fotos/lc/tacos-de-birria.jpg"],
    engagement: { alcance: 26300, meGusta: 980, comentarios: 143, compartidos: 112 },
  },
  {
    id: "p3",
    red: "instagram",
    estado: "publicado",
    texto: "Campacheros para la mara 🙌 Cuatro típicos, nachos y cuatro bebidas por $25.99.",
    fecha: dias(9),
    imagenes: ["/fotos/lc/campacheros.jpg"],
    engagement: { alcance: 15200, meGusta: 870, comentarios: 54, compartidos: 38, guardados: 121 },
  },
  {
    id: "p4",
    red: "instagram",
    estado: "programado",
    texto: "Desayunos La Campana: El Típico, Campesino, Chilaquiles y más. Empieza el día con sabor 🍳",
    fecha: enDias(2),
    imagenes: ["/fotos/lc/campesino.jpg"],
  },
  {
    id: "p5",
    red: "facebook",
    estado: "borrador",
    texto: "Celebra tu convivio de fin de año con La Campana: parrilladas y taquizas para grupos, en sucursal o en tu empresa. Escríbenos.",
    fecha: enDias(5),
    imagenes: ["/fotos/lc/parrillada-para-4.jpg"],
  },
];

export const lacampanaSeed: TenantSeed = {
  ME,
  departments: [
    { id: "sin_clasificar", nombre: "Sin clasificar", color: "#94a3b8" },
    { id: "ventas", nombre: "Pedidos a domicilio", color: "#7a210f" },
    { id: "conserjeria", nombre: "Retiro en sucursal", color: "#c2410c" },
    { id: "eventos", nombre: "Eventos y catering", color: "#a16207" },
    { id: "atencion", nombre: "Quejas y comentarios", color: "#be123c" },
    { id: "recepcion", nombre: "Sucursales", color: "#475569" },
  ],
  staff: [
    { id: ME, nombre: "Administración", rol: "gerente_marketing", departamento: "eventos", iniciales: "AD" },
    { id: "s2", nombre: "Daniela Flores", rol: "atencion", departamento: "atencion", iniciales: "DF" },
    { id: "s3", nombre: "Carlos Rivera", rol: "marketing", departamento: "eventos", iniciales: "CR" },
    { id: "s4", nombre: "Andrés Molina", rol: "recepcion", departamento: "recepcion", iniciales: "AM" },
    { id: "s5", nombre: "Gerencia", rol: "jefe", departamento: "eventos", iniciales: "GE" },
  ],
  contacts,
  conversations,
  messages,
  internalChannels: [
    { id: "ic1", nombre: "general", tipo: "canal", miembros: [ME, "s2", "s3", "s4", "s5"] },
    { id: "ic2", nombre: "eventos", tipo: "canal", miembros: [ME, "s3", "s4"] },
    { id: "ic3", nombre: "servicio-al-cliente", tipo: "canal", miembros: [ME, "s2", "s5"] },
    { id: "dm1", nombre: "Daniela Flores", tipo: "dm", miembros: [ME, "s2"] },
  ],
  internalMessages,
  socialPosts,
  socialStats: [
    { red: "instagram", handle: "@lacampanacyt", seguidores: 38400, nuevosSeguidores: 1260, crecimientoPct: 3.4, vistas30d: 412000, alcance30d: 168000, interacciones30d: 21300 },
    { red: "facebook", handle: "La Campana", seguidores: 96200, nuevosSeguidores: 840, crecimientoPct: 0.9, vistas30d: 298000, alcance30d: 141000, interacciones30d: 12800 },
  ],
  metrics: [{ label: "Conversaciones hoy", valor: 184, delta: 22 }],
};
