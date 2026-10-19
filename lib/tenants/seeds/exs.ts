// Datos semilla de la bandeja de Express Shopping.
//
// Cada conversación cuenta una parte de la línea de un paquete: la captura que
// la IA lee y vuelve prealerta, el "¿ya llegó?" que ya no hace falta preguntar
// porque llegó el aviso, la cotización con su IVA, la retención de aduana que
// se destraba con la factura, el cliente que pasa de $300 en un vuelo y el que
// está por dejar su paquete en abandono.
//
// Los avisos automáticos NO se escriben aquí: salen de la bitácora de cada
// paquete de la muestra (lib/exs), con el mismo texto que muestra su ficha. Así
// la bandeja y el tablero nunca se contradicen.
//
// Personas, teléfonos y montos son INVENTADOS (teléfonos 503 9xxx xxxx, serie
// que no se asigna en El Salvador). Lo que se dice de Express Shopping (tarifas,
// tiempos, sucursales, horarios, reglas) sale de exs.sv.

import type { TenantSeed } from "../types";
import type { Contact, Conversation, ConversationStatus, DepartmentId, Message } from "@/lib/data/types";
import type { TipoEvento } from "@/lib/exs/tipos";
import { AHORA_DEMO, CAPTURAS_PENDIENTES, semillaExs } from "@/lib/exs/semilla";
import { textoAviso } from "@/lib/exs/avisos";
import { diaDeVuelo } from "@/lib/exs/formato";
import { totalDelVuelo } from "@/lib/exs/estado";
import { costoEnvio, dinero, impuestoDe, librasCobradas, pesoVolumetrico, precioPorLibra } from "@/lib/exs/cobro";
import { sucursalDef } from "@/lib/exs/catalogo";

const ME = "me";
const muestra = semillaExs(AHORA_DEMO);

const haceMin = (min: number) => new Date(AHORA_DEMO - min * 60_000).toISOString();
const masMin = (iso: string, min: number) => new Date(Date.parse(iso) + min * 60_000).toISOString();

function paquete(id: string) {
  const p = muestra.paquetes.find((x) => x.id === id);
  if (!p) throw new Error(`Paquete de muestra inexistente: ${id}`);
  return p;
}

function vuelo(id: string) {
  return muestra.vuelos.find((v) => v.id === id);
}

const messages: Message[] = [];
let n = 0;

function cliente(conv: string, texto: string, ts: string, imagen?: string) {
  messages.push({
    id: `xm${++n}`,
    conversationId: conv,
    autor: "cliente",
    texto: imagen ? `[imagen] ${texto}`.trim() : texto,
    ts,
    ...(imagen ? { media: { id: `demo-${n}`, tipo: "image", mime: "image/svg+xml", url: imagen } } : {}),
  });
}

function equipo(conv: string, staffId: string, texto: string, ts: string) {
  messages.push({ id: `xm${++n}`, conversationId: conv, autor: "staff", staffId, texto, ts });
}

/** El aviso que el paquete ya le mandó al cliente, tal cual lo dice su bitácora. */
function aviso(conv: string, paqueteId: string, tipo: TipoEvento): string {
  const p = paquete(paqueteId);
  const ev = [...p.historial].reverse().find((e) => e.tipo === tipo);
  const c = muestra.clientes.find((x) => x.id === p.clienteId);
  if (!ev || !c) throw new Error(`Sin evento ${tipo} en ${paqueteId}`);
  const texto = textoAviso(ev, p, { cliente: c, vuelos: muestra.vuelos, totalDelVuelo: totalDelVuelo(muestra.paquetes, p.clienteId, p.vueloId) });
  if (!texto) throw new Error(`El evento ${tipo} no tiene aviso`);
  // La prealerta desde una captura la confirma la agente; lo demás es automático.
  if (ev.actor === "ia") messages.push({ id: `xm${++n}`, conversationId: conv, autor: "staff", staffId: "ia", texto, ts: ev.ts });
  else messages.push({ id: `xm${++n}`, conversationId: conv, autor: "staff", staffNombre: "Aviso automático", texto, ts: ev.ts });
  return ev.ts;
}

// ── x1 · María José: la captura que la IA vuelve prealerta sola ──
{
  const p = paquete("P-24701");
  cliente("x1", "¡Hola! Les mando la captura de mi pedido de Amazon", masMin(p.prealerta!.ts, -2), "/demo/exs/captura-amazon.svg");
  aviso("x1", "P-24701", "prealertado");
  cliente("x1", "¡Excelente, gracias! 🙌", masMin(p.prealerta!.ts, 2));
}

// ── x2 · Carlos: el aviso de Miami llegó antes que la pregunta ──
{
  const llego = aviso("x2", "P-24607", "miami");
  cliente("x2", "¡Genial! ¿Y cuándo lo puedo recoger?", masMin(llego, 6));
  equipo(
    "x2",
    "ia",
    `Sale en el vuelo del ${diaDeVuelo(vuelo("EXS-1042"))} y por avión llega de 3 a 5 días hábiles después del despacho. Te aviso apenas esté listo en ${sucursalDef("orion").nombre}; lo retiras con tu DUI.`,
    masMin(llego, 7),
  );
  equipo("x2", "ia", "Por cierto: tu smartwatch Amazfit va en el vuelo que salió hace un rato de Miami ✈️", masMin(llego, 7.5));
}

// ── x3 · Gabriela: cotización con el cálculo de la calculadora del sitio ──
{
  const valor = 120;
  const lb = 3;
  const imp = impuestoDe(valor);
  const envio = costoEnvio(lb);
  cliente("x3", "Hola, ¿cuánto me sale traer unos tenis de $120? Pesan como 3 libras", haceMin(82));
  equipo(
    "x3",
    "ia",
    `¡Hola, Gabriela! Te lo calculo:\n• Envío: ${lb} lb x ${dinero(precioPorLibra(lb))} = ${dinero(envio)}\n• IVA: 13% del valor en aduana (${dinero(valor)} + 10% de flete + 1.5% de seguro = ${dinero(imp.cif)}) = ${dinero(imp.iva)}\nTotal aproximado: ${dinero(Math.round((envio + imp.iva) * 100) / 100)}. El peso exacto se confirma al recibirlo en Miami.`,
    haceMin(81),
  );
  cliente("x3", "¿Y cómo hago para tener casillero?", haceMin(78));
  equipo(
    "x3",
    "ia",
    "Te registras en casillero.exs.sv/registro y en horario de oficina un asesor te escribe por WhatsApp con tu dirección en Estados Unidos 😊",
    haceMin(77),
  );
}

// ── x4 · José Roberto: aduana retuvo el reloj; la factura llega por el chat ──
{
  aviso("x4", "P-24410", "retenido");
  cliente("x4", "Aquí está la factura del reloj", haceMin(25), "/demo/exs/factura-ebay.svg");
}

// ── x5 · Andrea: quiere su casillero ──
{
  cliente("x5", "Hola, ¿cómo hago para tener mi casillero?", haceMin(305));
  equipo(
    "x5",
    "ia",
    "¡Hola, Andrea! Te registras en casillero.exs.sv/registro con tus datos. En horario de oficina un asesor te escribe por WhatsApp con tu dirección en Estados Unidos y tu código de casillero.",
    haceMin(304),
  );
  cliente("x5", "¿Y ustedes me compran las cosas?", haceMin(299));
  equipo(
    "x5",
    "ia",
    "No compramos por ti: tú compras en tus tiendas favoritas (Amazon, SHEIN, Walmart, Temu y más) con la dirección de tu casillero, y nosotros te lo traemos a El Salvador.",
    haceMin(298),
  );
  cliente("x5", "Ah perfecto, ya me registro 😊", haceMin(295));
}

// ── x6 · Luis: por qué se cobra por volumen, y la entrega a domicilio ──
{
  const p = paquete("P-24291");
  aviso("x6", "P-24291", "listo");
  const vol = pesoVolumetrico(p.medidas!);
  const lb = librasCobradas(p.pesoLb!, p.medidas);
  cliente("x6", "Buenas, ¿por qué me cobran 15 libras si el monitor pesa menos de 10?", haceMin(130));
  equipo(
    "x6",
    "ia",
    `Hola, Luis. Es por el tamaño de la caja: mide ${p.medidas!.largo} x ${p.medidas!.ancho} x ${p.medidas!.alto} pulgadas y por volumen equivale a ${vol.toFixed(1)} lb, más que su peso real (${p.pesoLb} lb). Cuando el volumen pasa en más de 30% al peso, se cobra por volumen: ${lb} lb a ${dinero(precioPorLibra(lb))}.`,
    haceMin(129),
  );
  cliente("x6", "Ah ok. ¿Me lo pueden llevar mañana? Trabajo hasta las 5", haceMin(124));
  equipo("x6", "s6", "Claro, Luis. Mañana salgo con la ruta de Santa Tecla entre 9:00 y 12:00. ¿Alguien te lo recibe en casa?", haceMin(110));
  cliente("x6", "Sí, mi mamá. ¡Gracias!", haceMin(105));
}

// ── x7 · Paola: ya está listo; solo pregunta el horario ──
{
  aviso("x7", "P-24288", "listo");
  const s = sucursalDef("santafe");
  cliente("x7", "¿Hasta qué hora puedo pasar a Santa Fe? 🙏", haceMin(55));
  equipo(
    "x7",
    "ia",
    // El horario termina en "p. m." o "m.": ese punto cierra la frase.
    `${s.nombre} atiende de lunes a viernes de ${s.semana} y el sábado de ${s.sabado} Llega con tu DUI y lo retiras al momento.`,
    haceMin(54),
  );
  cliente("x7", "Perfecto, paso saliendo del trabajo", haceMin(50));
}

// ── x8 · Ricardo: USPS dice "entregado" y la bodega no lo tiene ──
{
  cliente("x8", "Buenas, USPS me dice entregado desde hace dos días y ustedes todavía no me avisan nada 😕", haceMin(180));
  equipo(
    "x8",
    "ia",
    "Hola, Ricardo. El \"entregado\" de USPS no siempre significa que ya esté en nuestra bodega: USPS nos entrega una o dos veces por semana, y lo normal es que aparezca de 1 a 7 días hábiles después de ese aviso. Tu prealerta de los zapatos escolares de Walmart está activa: apenas llegue a Miami te aviso.",
    haceMin(179),
  );
  cliente("x8", "¿Y si no aparece?", haceMin(171));
  equipo(
    "x8",
    "s2",
    "Si pasan los 7 días hábiles, te ayudamos a pedirle a la tienda la prueba de entrega con firma para el reclamo. Por ahora lo dejamos vigilado 👀",
    haceMin(160),
  );
}

// ── x9 · Fernanda: un perfume, y la agente pasa el caso a una persona ──
{
  cliente("x9", "Hola! ¿Puedo traer un perfume de Sephora?", haceMin(15));
  equipo(
    "x9",
    "ia",
    "¡Hola, Fernanda! Los perfumes tienen restricciones: los que vienen en spray o aerosol no pueden viajar por avión porque son inflamables. Te paso con un asesor para revisar tu caso antes de que compres.",
    haceMin(14),
  );
}

// ── x10 · Diego: con los juegos pasa de $300 en el mismo vuelo ──
{
  const consola = paquete("P-24601");
  const juegos = paquete("P-24604");
  const total = totalDelVuelo(muestra.paquetes, "c10", "EXS-1042");
  cliente("x10", "Hola, ¿ya les llegaron mis juegos de Switch? Los compré aparte de la consola", haceMin(70));
  equipo(
    "x10",
    "ia",
    `¡Hola, Diego! Sí, llegaron hoy a Miami (${juegos.pesoLb} lb). Un detalle: con la consola (${dinero(consola.valor)}) y los juegos (${dinero(juegos.valor)}) llevas ${dinero(total)} en el vuelo del ${diaDeVuelo(vuelo("EXS-1042"))}. Desde $300 por vuelo, aduana cobra IVA más DAI. Si mandamos los juegos en el vuelo siguiente, el del ${diaDeVuelo(vuelo("EXS-1043"))}, en los dos pagas solo IVA. ¿Te parece?`,
    haceMin(69),
  );
  cliente("x10", "Sí, mándenlos en el siguiente porfa 🙏", haceMin(32));
}

// ── x11 · Sofía: la captura acaba de llegar; la IA ya la leyó ──
{
  const cap = CAPTURAS_PENDIENTES.find((c) => c.conversationId === "x11")!;
  cliente("x11", "Hola, este es mi pedido de Walmart", haceMin(cap.haceMin), cap.capturaUrl);
  cliente("x11", "Es una silla de comer para bebé 👶", haceMin(cap.haceMin - 1));
}

// ── x12 · Karen: el valor declarado no cuadra con la factura ──
{
  const ts = aviso("x12", "P-24413", "retenido");
  cliente("x12", "Ah es que usé un cupón, por eso pagué menos. Ahorita busco la factura", masMin(ts, 38));
}

// ── x13 · Mónica: casi un mes sin retirar ──
{
  aviso("x13", "P-23810", "listo");
  aviso("x13", "P-23810", "recordatorio");
  const s = sucursalDef("emanuel");
  cliente("x13", "Uy, se me había olvidado 🙈 Paso mañana sin falta", haceMin(185));
  equipo("x13", "ia", `¡Va, Mónica! ${s.nombre} atiende de lunes a viernes de ${s.semana} y el sábado de ${s.sabado} Lleva tu DUI.`, haceMin(184));
}

// ── x14 · Roberto: la línea completa, solo con avisos automáticos ──
{
  aviso("x14", "P-24419", "prealertado");
  aviso("x14", "P-24419", "miami");
  aviso("x14", "P-24419", "en_vuelo");
  aviso("x14", "P-24419", "aduana");
  aviso("x14", "P-24707", "prealertado");
  cliente("x14", "¡Qué buena onda que avisen de todo! 🙌", haceMin(1250));
}

const contacts: Contact[] = [
  ...muestra.clientes
    .filter((c) => c.conversationId)
    .map((c): Contact => {
      const instagram = c.id === "c9";
      return {
        id: c.id,
        nombre: c.nombre,
        telefono: instagram ? undefined : c.telefono,
        handle: instagram ? "@fer.aguilar.sv" : undefined,
        correo: c.correo,
        canal: instagram ? "instagram" : "whatsapp",
        notas: c.notas,
        tags: c.id === "c15" ? ["Cliente frecuente"] : undefined,
      };
    }),
  { id: "c3", nombre: "Gabriela Portillo", handle: "@gaby.portillo", canal: "instagram", notas: "Todavía no tiene casillero. Cotizó unos tenis de $120.", tags: ["Cotización", "Registro de casillero"] },
  { id: "c5", nombre: "Andrea Castillo", handle: "Andrea Castillo", canal: "facebook", notas: "Preguntó cómo sacar su casillero.", tags: ["Registro de casillero"] },
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
  { id: "x1", contactId: "c1", canal: "whatsapp", departamento: "prealertas", estado: "resuelto", noLeidos: 0 },
  { id: "x2", contactId: "c2", canal: "whatsapp", departamento: "atencion", estado: "resuelto", noLeidos: 0 },
  { id: "x3", contactId: "c3", canal: "instagram", departamento: "atencion", estado: "resuelto", noLeidos: 0 },
  { id: "x4", contactId: "c4", canal: "whatsapp", departamento: "aduana", estado: "en_progreso", asignadoA: "s3", noLeidos: 1 },
  { id: "x5", contactId: "c5", canal: "facebook", departamento: "atencion", estado: "resuelto", noLeidos: 0 },
  { id: "x6", contactId: "c6", canal: "whatsapp", departamento: "entregas", estado: "en_progreso", asignadoA: "s6", noLeidos: 0 },
  { id: "x7", contactId: "c7", canal: "whatsapp", departamento: "entregas", estado: "resuelto", noLeidos: 0 },
  { id: "x8", contactId: "c8", canal: "whatsapp", departamento: "prealertas", estado: "en_progreso", asignadoA: "s2", noLeidos: 0 },
  { id: "x9", contactId: "c9", canal: "instagram", departamento: "atencion", estado: "nuevo", noLeidos: 0 },
  { id: "x10", contactId: "c10", canal: "whatsapp", departamento: "aduana", estado: "en_progreso", noLeidos: 1 },
  { id: "x11", contactId: "c11", canal: "whatsapp", departamento: "prealertas", estado: "nuevo", noLeidos: 2 },
  { id: "x12", contactId: "c12", canal: "whatsapp", departamento: "aduana", estado: "en_progreso", asignadoA: "s3", noLeidos: 0 },
  { id: "x13", contactId: "c22", canal: "whatsapp", departamento: "entregas", estado: "resuelto", noLeidos: 0 },
  { id: "x14", contactId: "c15", canal: "whatsapp", departamento: "atencion", estado: "resuelto", noLeidos: 0 },
];

const conversations: Conversation[] = CONVERSACIONES.map((c) => {
  const ultimo = messages
    .filter((m) => m.conversationId === c.id)
    .reduce((max, m) => (m.ts > max ? m.ts : max), "");
  return { ...c, ultimoMensajeTs: ultimo || haceMin(600) };
});

const enAire = vuelo("EXS-1041");
const proximo = vuelo("EXS-1042");
const enVuelo = muestra.paquetes.filter((p) => p.vueloId === "EXS-1041");
const librasEnVuelo = enVuelo.reduce((s, p) => s + (p.pesoLb ?? 0), 0);

export const exsSeed: TenantSeed = {
  ME,
  departments: [
    { id: "atencion", nombre: "Atención al cliente", color: "#00345e" },
    { id: "prealertas", nombre: "Prealertas", color: "#0b7fb8" },
    { id: "aduana", nombre: "Aduana", color: "#a15c00" },
    { id: "entregas", nombre: "Entregas", color: "#00661c" },
  ],
  staff: [
    { id: ME, nombre: "Gabriela Rivas", rol: "gerente_marketing", departamento: "atencion", iniciales: "GR" },
    { id: "s2", nombre: "Karla Menjívar", rol: "recepcion", departamento: "atencion", iniciales: "KM" },
    { id: "s3", nombre: "Josué Martínez", rol: "medico", departamento: "aduana", iniciales: "JM" },
    { id: "s4", nombre: "Daniel Ortiz", rol: "medico", departamento: "prealertas", iniciales: "DO" },
    { id: "s5", nombre: "Fátima Cruz", rol: "recepcion", departamento: "entregas", iniciales: "FC" },
    { id: "s6", nombre: "Óscar Henríquez", rol: "medico", departamento: "entregas", iniciales: "OH" },
    { id: "s7", nombre: "Ricardo Alvarado", rol: "jefe", departamento: "aduana", iniciales: "RA" },
  ],
  contacts,
  conversations,
  messages,
  internalChannels: [
    { id: "ic1", nombre: "general", tipo: "canal", miembros: [ME, "s2", "s3", "s4", "s5", "s6", "s7"] },
    { id: "ic2", nombre: "bodega-miami", tipo: "canal", miembros: [ME, "s2", "s4", "s7"] },
    { id: "ic3", nombre: "aduana", tipo: "canal", miembros: [ME, "s3", "s7"] },
    { id: "ic4", nombre: "entregas", tipo: "canal", miembros: [ME, "s5", "s6"] },
    { id: "dm1", nombre: "Ricardo Alvarado", tipo: "dm", miembros: [ME, "s7"] },
    { id: "dm2", nombre: "Daniel Ortiz", tipo: "dm", miembros: [ME, "s4"] },
  ],
  internalMessages: [
    {
      id: "im1",
      channelId: "ic1",
      staffId: ME,
      texto: `Recordatorio: el corte del ${proximo?.id} es el ${diaDeVuelo(proximo)} a las 12:00 m. Lo que llegue sin prealerta, a escribirle al cliente el mismo día.`,
      ts: haceMin(400),
    },
    {
      id: "im2",
      channelId: "ic2",
      staffId: "s4",
      texto: `Despachado el ${enAire?.id}: ${enVuelo.length} paquetes, ${librasEnVuelo.toFixed(1)} lb. Ya va en el aire ✈️`,
      ts: haceMin(98),
    },
    {
      id: "im3",
      channelId: "ic2",
      staffId: "s4",
      texto: "Llegó una caja de Amazon para el casillero EXS-10190 sin prealerta, 3.4 lb. Ya le salió el aviso automático a Daniela Guzmán pidiéndole la captura.",
      ts: haceMin(415),
    },
    { id: "im4", channelId: "ic2", staffId: "s2", texto: "Le doy seguimiento si no contesta antes del mediodía 👍", ts: haceMin(405) },
    {
      id: "im5",
      channelId: "ic3",
      staffId: "s3",
      texto: "Del EXS-1040 hay 2 retenidos: el reloj de José Roberto Fuentes (falta factura) y la tablet de Karen Alvarado (el valor no cuadra con la factura). Los demás salen mañana.",
      ts: haceMin(1300),
    },
    { id: "im6", channelId: "ic3", staffId: "s7", texto: "José Roberto ya mandó la factura por WhatsApp. Josué, ¿se la pasas a aduana?", ts: haceMin(20) },
    {
      id: "im7",
      channelId: "ic4",
      staffId: "s6",
      texto: "Mañana salgo con la ruta de Santa Tecla y San Salvador: el monitor de Luis Martínez va primero.",
      ts: haceMin(100),
    },
    {
      id: "im8",
      channelId: "dm1",
      staffId: "s7",
      texto: "Diego Herrera pasa de $300 en el EXS-1042 con los juegos. Lucía ya le ofreció mandarlos en el siguiente vuelo y dijo que sí.",
      ts: haceMin(30),
    },
    { id: "im9", channelId: "dm1", staffId: ME, texto: "Perfecto, pasémoslos al EXS-1043 desde su chat.", ts: haceMin(27) },
    {
      id: "im10",
      channelId: "dm2",
      staffId: "s4",
      texto: "La aspiradora de Verónica Sánchez viene en caja grande: se cobra por volumen (12 lb).",
      ts: haceMin(1180),
    },
  ],
  socialPosts: [],
  socialStats: [],
  metrics: [
    { label: "Conversaciones hoy", valor: conversations.filter((c) => c.ultimoMensajeTs >= haceMin(24 * 60)).length },
    { label: "Prealertas leídas por IA", valor: muestra.paquetes.filter((p) => p.prealerta?.origen === "captura" && p.etapa === "prealertado").length },
  ],
};
