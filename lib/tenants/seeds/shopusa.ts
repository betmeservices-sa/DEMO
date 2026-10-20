// Datos semilla de la bandeja de ShopUSA.
//
// Cada conversación cuenta una parte de la línea de un paquete: la captura que
// la IA lee y vuelve prealerta, el "¿ya llegó?" que ya no hace falta preguntar
// porque llegó el aviso, la cotización con su IVA, el selectivo rojo que se
// destraba con la factura, los paquetes que se consolidan en una carga y el
// que está por empezar a cobrar almacenaje.
//
// Los avisos automáticos NO se escriben aquí: salen de la bitácora de cada
// paquete de la muestra (lib/shopusa), con el mismo texto que muestra su
// ficha. Así la bandeja y el tablero nunca se contradicen.
//
// Personas, teléfonos y montos son INVENTADOS (teléfonos 503 9xxx xxxx, serie
// que no se asigna en El Salvador). Lo que se dice de ShopUSA (tarifas,
// tiempos, sucursales, horarios, reglas) sale de shopusa.la.

import type { TenantSeed } from "../types";
import type { Contact, Conversation, ConversationStatus, DepartmentId, Message } from "@/lib/data/types";
import type { TipoEvento } from "@/lib/shopusa/tipos";
import { AHORA_DEMO, CAPTURAS_PENDIENTES, semillaShopusa } from "@/lib/shopusa/semilla";
import { textoAviso } from "@/lib/shopusa/avisos";
import { diaDeCarga } from "@/lib/shopusa/formato";
import { cobroDeEnvio, cotizar, dinero, envioDe, pesoVolumetrico } from "@/lib/shopusa/cobro";
import { HORARIO, sucursalDef } from "@/lib/shopusa/catalogo";

const ME = "me";
const muestra = semillaShopusa(AHORA_DEMO);

const haceMin = (min: number) => new Date(AHORA_DEMO - min * 60_000).toISOString();
const masMin = (iso: string, min: number) => new Date(Date.parse(iso) + min * 60_000).toISOString();

function paquete(id: string) {
  const p = muestra.paquetes.find((x) => x.id === id);
  if (!p) throw new Error(`Paquete de muestra inexistente: ${id}`);
  return p;
}

function carga(id: string) {
  return muestra.cargas.find((c) => c.id === id);
}

const messages: Message[] = [];
let n = 0;

function cliente(conv: string, texto: string, ts: string, imagen?: string) {
  messages.push({
    id: `sm${++n}`,
    conversationId: conv,
    autor: "cliente",
    texto: imagen ? `[imagen] ${texto}`.trim() : texto,
    ts,
    ...(imagen ? { media: { id: `demo-${n}`, tipo: "image", mime: "image/svg+xml", url: imagen } } : {}),
  });
}

function equipo(conv: string, staffId: string, texto: string, ts: string) {
  messages.push({ id: `sm${++n}`, conversationId: conv, autor: "staff", staffId, texto, ts });
}

/** El aviso que el paquete ya le mandó al cliente, tal cual lo dice su bitácora. */
function aviso(conv: string, paqueteId: string, tipo: TipoEvento): string {
  const p = paquete(paqueteId);
  const ev = [...p.historial].reverse().find((e) => e.tipo === tipo);
  const c = muestra.clientes.find((x) => x.id === p.clienteId);
  if (!ev || !c) throw new Error(`Sin evento ${tipo} en ${paqueteId}`);
  const texto = textoAviso(ev, p, { cliente: c, cargas: muestra.cargas, paquetes: muestra.paquetes });
  if (!texto) throw new Error(`El evento ${tipo} no tiene aviso`);
  // La prealerta desde una captura la confirma la agente; lo demás es automático.
  if (ev.actor === "ia") messages.push({ id: `sm${++n}`, conversationId: conv, autor: "staff", staffId: "ia", texto, ts: ev.ts });
  else messages.push({ id: `sm${++n}`, conversationId: conv, autor: "staff", staffNombre: "Aviso automático", texto, ts: ev.ts });
  return ev.ts;
}

// El horario termina en "p. m.": ese punto también cierra la frase.
const horario = `de ${HORARIO.semana} y el ${HORARIO.sabado}`;

// ── x1 · María José: la captura que la IA vuelve prealerta sola ──
{
  const p = paquete("P-24701");
  cliente("x1", "¡Hola! Les mando la captura de mi pedido de Amazon", masMin(p.prealerta!.ts, -2), "/demo/shopusa/captura-amazon.svg");
  aviso("x1", "P-24701", "pendiente");
  cliente("x1", "¡Excelente, gracias! 🙌", masMin(p.prealerta!.ts, 2));
}

// ── x2 · Carlos: el aviso de Miami llegó antes que la pregunta ──
{
  const llego = aviso("x2", "P-24607", "miami");
  cliente("x2", "¡Genial! ¿Y cuándo lo puedo recoger?", masMin(llego, 6));
  equipo(
    "x2",
    "ia",
    `Sale en la carga del ${diaDeCarga(carga("1042"))}. La entrega estimada es de 7 días hábiles desde que llegó a Miami, y te aviso apenas esté listo en la sucursal ${sucursalDef("metro_sur").nombre}; lo retiras con tu DUI.`,
    masMin(llego, 7),
  );
  equipo("x2", "ia", "Por cierto: tu smartwatch Amazfit ya va en tránsito, en la carga que salió hace un rato de Miami ✈️", masMin(llego, 7.5));
}

// ── x3 · Gabriela: cotización con la fórmula de la calculadora de shopusa.la ──
{
  const tenis = cotizar(120, "Calzado", 3);
  const cel = cotizar(629, "Celulares y smartphones", 1);
  cliente("x3", "Hola, ¿cuánto me sale traer unos tenis de $120? Pesan como 3 libras", haceMin(82));
  equipo(
    "x3",
    "ia",
    `¡Hola, Gabriela! Te lo calculo:\n• Flete: ${tenis.libras} lb x ${dinero(tenis.precioLibra)} = ${dinero(tenis.flete)}\n• IVA: 13% de ${dinero(120)} = ${dinero(tenis.iva)}\nTotal aproximado: ${dinero(tenis.total)}. El peso exacto se confirma en nuestra bodega de Miami.`,
    haceMin(81),
  );
  cliente("x3", "¿Y un iPhone de $629?", haceMin(79));
  equipo(
    "x3",
    "ia",
    `Los celulares de más de $100 llevan tarifa fija de ${dinero(cel.arancel.monto)}. Con 1 lb de flete (${dinero(cel.flete)}) y el IVA de ${dinero(cel.iva)}, serían ${dinero(cel.total)} aproximadamente.`,
    haceMin(78),
  );
  cliente("x3", "¿Y cómo hago para tener mi dirección en Miami?", haceMin(76));
  equipo(
    "x3",
    "ia",
    "Te registras en shopusa.la/registro. En tu perfil completas tu nombre, DUI, teléfono y sucursal favorita, y ahí te sale tu dirección en Miami con tu código de cliente 😊",
    haceMin(75),
  );
}

// ── x4 · José Roberto: selectivo rojo al reloj; la factura llega por el chat ──
{
  aviso("x4", "P-24410", "selectivo");
  cliente("x4", "Aquí está la factura del reloj", haceMin(25), "/demo/shopusa/factura-ebay.svg");
}

// ── x5 · Andrea: quiere comprar con ShopUSA por primera vez ──
{
  cliente("x5", "Hola, ¿cómo funciona? Nunca he comprado en Amazon", haceMin(305));
  equipo(
    "x5",
    "ia",
    "¡Hola, Andrea! Compras en la tienda que quieras con la dirección de nuestra bodega en Miami y nosotros te lo traemos. Primero te registras en shopusa.la/registro y ahí te sale tu dirección con tu código de cliente.",
    haceMin(304),
  );
  cliente("x5", "¿Y ustedes me pueden hacer la compra?", haceMin(299));
  equipo(
    "x5",
    "ia",
    "¡Claro! Uno de nuestros asesores hace la compra por ti, por un cargo adicional al total de tu compra. Te paso con un asesor para que te ayude 😊",
    haceMin(298),
  );
  cliente("x5", "Perfecto, gracias", haceMin(295));
}

// ── x6 · Luis: por qué se cobra por volumen, y la entrega a domicilio ──
{
  const p = paquete("P-24291");
  aviso("x6", "P-24291", "listo");
  const vol = pesoVolumetrico(p.medidas!);
  const c = cobroDeEnvio([p]);
  cliente("x6", `Buenas, ¿por qué me cobran ${c.libras} libras si el edredón pesa ${Math.round(p.pesoLb!)}?`, haceMin(130));
  equipo(
    "x6",
    "ia",
    `Hola, Luis. Es por el tamaño de la caja: mide ${p.medidas!.largo} x ${p.medidas!.ancho} x ${p.medidas!.alto} pulgadas y por volumen equivale a ${vol.toFixed(1)} lb, más de 3 veces su peso real (${p.pesoLb} lb). En ese caso se cobra el promedio entre los dos: ${c.libras} lb a ${dinero(c.precioLibra)}.`,
    haceMin(129),
  );
  cliente("x6", "Ah ok. ¿Me lo llevan mañana? Trabajo hasta las 5", haceMin(124));
  equipo("x6", "s6", "Claro, Luis. Mañana salgo con la ruta de Santa Tecla entre 9:00 y 12:00. ¿Alguien te lo recibe en casa?", haceMin(110));
  cliente("x6", "Sí, mi mamá. ¡Gracias!", haceMin(105));
}

// ── x7 · Paola: ya está listo; solo pregunta el horario ──
{
  aviso("x7", "P-24288", "listo");
  cliente("x7", "¿Hasta qué hora puedo pasar a Santa Tecla? 🙏", haceMin(55));
  equipo("x7", "ia", `Todas nuestras sucursales atienden ${horario} Llega con tu DUI y lo retiras al momento.`, haceMin(54));
  cliente("x7", "Perfecto, paso saliendo del trabajo", haceMin(50));
}

// ── x8 · Ricardo: USPS dice "entregado" y la bodega todavía no lo tiene ──
{
  cliente("x8", "Buenas, USPS me dice entregado desde hace dos días y ustedes todavía no me avisan nada 😕", haceMin(180));
  equipo(
    "x8",
    "ia",
    "Hola, Ricardo. Con USPS es normal: acumula los paquetes para direcciones comerciales y puede tardar unos días en entregarlos en nuestra bodega, aunque su página ya diga \"entregado\". Tu prealerta de los zapatos escolares de Walmart está activa: apenas llegue a Miami te aviso.",
    haceMin(179),
  );
  cliente("x8", "¿Y si no aparece?", haceMin(171));
  equipo(
    "x8",
    "s2",
    "Si no aparece, el reclamo es con la tienda o con USPS, y te ayudamos con lo que necesites para hacerlo. Por ahora lo dejamos vigilado 👀",
    haceMin(160),
  );
}

// ── x9 · Fernanda: vitaminas, y la agente pasa el caso a una persona ──
{
  cliente("x9", "Hola! ¿Puedo traer vitaminas y colágeno de Amazon?", haceMin(15));
  equipo(
    "x9",
    "ia",
    "¡Hola, Fernanda! Sí se pueden traer, pero algunos suplementos necesitan permiso de la Dirección Nacional de Medicamentos. Te paso con un asesor para revisar tu producto antes de que compres.",
    haceMin(14),
  );
}

// ── x10 · Diego: sus dos paquetes viajan en la misma carga y se pesan juntos ──
{
  const consola = paquete("P-24601");
  const juegos = paquete("P-24604");
  const c = cobroDeEnvio(envioDe(juegos, muestra.paquetes));
  cliente("x10", "Hola, ¿ya les llegaron mis juegos de Switch? Los compré aparte de la consola", haceMin(70));
  equipo(
    "x10",
    "ia",
    `¡Hola, Diego! Sí, llegaron hoy a Miami (${juegos.pesoLb} lb) y salen en la misma carga que tu consola (${consola.pesoLb} lb). Como van juntos, se pesan juntos: se cobran ${c.libras} lb (${dinero(c.flete)}) en vez de ${dinero(c.fleteSeparado)} por separado. Te ahorras ${dinero(c.ahorro)} 😉`,
    haceMin(69),
  );
  cliente("x10", "¡Buenísimo! 🙌", haceMin(32));
}

// ── x11 · Sofía: la captura acaba de llegar; la IA ya la leyó ──
{
  const cap = CAPTURAS_PENDIENTES.find((c) => c.conversationId === "x11")!;
  cliente("x11", "Hola, este es mi pedido de Walmart", haceMin(cap.haceMin), cap.capturaUrl);
  cliente("x11", "Es una silla de comer para bebé 👶", haceMin(cap.haceMin - 1));
}

// ── x12 · Karen: el valor declarado no cuadra con la factura ──
{
  const ts = aviso("x12", "P-24413", "selectivo");
  cliente("x12", "Ah es que usé un cupón, por eso pagué menos. ¿Eso cuenta?", masMin(ts, 38));
  equipo(
    "x12",
    "ia",
    "Sí cuenta, Karen: Aduana acepta el descuento en artículos de uso personal, mientras no sean más de seis de la misma categoría. Mándanos por aquí la factura donde se vea el cupón aplicado y se la presentamos.",
    masMin(ts, 39),
  );
}

// ── x13 · Mónica: casi un mes sin retirar ──
{
  aviso("x13", "P-23810", "listo");
  aviso("x13", "P-23810", "recordatorio");
  cliente("x13", "Uy, se me había olvidado 🙈 Paso mañana sin falta", haceMin(185));
  equipo("x13", "ia", `¡Va, Mónica! La sucursal ${sucursalDef("mascota").nombre} atiende ${horario} Lleva tu DUI.`, haceMin(184));
}

// ── x14 · Roberto: la línea completa, solo con avisos automáticos ──
{
  aviso("x14", "P-24419", "pendiente");
  aviso("x14", "P-24419", "miami");
  aviso("x14", "P-24419", "transito");
  aviso("x14", "P-24419", "aduana");
  aviso("x14", "P-24707", "pendiente");
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
  { id: "c3", nombre: "Gabriela Portillo", handle: "@gaby.portillo", canal: "instagram", notas: "Todavía no tiene cuenta. Cotizó unos tenis y un iPhone.", tags: ["Cotización", "Registro"] },
  { id: "c5", nombre: "Andrea Castillo", handle: "Andrea Castillo", canal: "facebook", notas: "Primera compra: pidió una compra asistida.", tags: ["Registro"] },
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
  { id: "x5", contactId: "c5", canal: "facebook", departamento: "atencion", estado: "nuevo", noLeidos: 1 },
  { id: "x6", contactId: "c6", canal: "whatsapp", departamento: "entregas", estado: "en_progreso", asignadoA: "s6", noLeidos: 0 },
  { id: "x7", contactId: "c7", canal: "whatsapp", departamento: "entregas", estado: "resuelto", noLeidos: 0 },
  { id: "x8", contactId: "c8", canal: "whatsapp", departamento: "prealertas", estado: "en_progreso", asignadoA: "s2", noLeidos: 0 },
  { id: "x9", contactId: "c9", canal: "instagram", departamento: "atencion", estado: "nuevo", noLeidos: 0 },
  { id: "x10", contactId: "c10", canal: "whatsapp", departamento: "atencion", estado: "resuelto", noLeidos: 0 },
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

const enAire = carga("1041");
const proxima = carga("1042");
const enTransito = muestra.paquetes.filter((p) => p.cargaId === "1041");
const librasEnTransito = enTransito.reduce((s, p) => s + (p.pesoLb ?? 0), 0);

export const shopusaSeed: TenantSeed = {
  ME,
  departments: [
    { id: "atencion", nombre: "Atención al cliente", color: "#003d5c" },
    { id: "prealertas", nombre: "Prealertas", color: "#0077b3" },
    { id: "aduana", nombre: "Aduana", color: "#a15c00" },
    { id: "entregas", nombre: "Entregas", color: "#0a7a4b" },
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
      texto: `Recordatorio: la carga ${proxima?.id} sale el ${diaDeCarga(proxima)} con corte al mediodía. Lo que llegue sin prealerta, a escribirle al cliente el mismo día para que mande su factura.`,
      ts: haceMin(400),
    },
    {
      id: "im2",
      channelId: "ic2",
      staffId: "s4",
      texto: `Despachada la carga ${enAire?.id}: ${enTransito.length} paquetes, ${librasEnTransito.toFixed(1)} lb. Ya va en el aire ✈️`,
      ts: haceMin(98),
    },
    {
      id: "im3",
      channelId: "ic2",
      staffId: "s4",
      texto: "Llegó una caja de Amazon para el cliente SV10190 sin prealerta, 3.4 lb. Ya le salió el aviso automático a Daniela Guzmán pidiéndole la factura.",
      ts: haceMin(235),
    },
    { id: "im4", channelId: "ic2", staffId: "s2", texto: "Le doy seguimiento si no contesta antes del corte 👍", ts: haceMin(228) },
    {
      id: "im5",
      channelId: "ic3",
      staffId: "s3",
      texto: "De la carga 1040 hay 2 con selectivo rojo: el reloj de José Roberto Fuentes (falta la factura) y la tablet de Karen Alvarado (el valor no cuadra con la factura). Los demás salen mañana.",
      ts: haceMin(1300),
    },
    { id: "im6", channelId: "ic3", staffId: "s7", texto: "José Roberto ya mandó la factura por WhatsApp. Josué, ¿se la pasas a Aduana?", ts: haceMin(20) },
    {
      id: "im7",
      channelId: "ic4",
      staffId: "s6",
      texto: "Mañana salgo con la ruta de Santa Tecla y San Salvador: el edredón de Luis Martínez va primero.",
      ts: haceMin(100),
    },
    {
      id: "im8",
      channelId: "dm1",
      staffId: "s7",
      texto: "Los dos paquetes de Diego Herrera van en la carga de hoy: se consolidan y paga un solo flete. Lucía ya se lo explicó.",
      ts: haceMin(30),
    },
    { id: "im9", channelId: "dm1", staffId: ME, texto: "Perfecto. Así no nos reclama el cobro cuando le llegue 👌", ts: haceMin(27) },
    {
      id: "im10",
      channelId: "dm2",
      staffId: "s4",
      texto: "La aspiradora de Verónica Sánchez la prealertamos nosotros: todavía no tiene el DUI en su perfil y la web no la dejaba.",
      ts: haceMin(290),
    },
  ],
  socialPosts: [],
  socialStats: [],
  metrics: [
    { label: "Conversaciones hoy", valor: conversations.filter((c) => c.ultimoMensajeTs >= haceMin(24 * 60)).length },
    { label: "Prealertas leídas por IA", valor: muestra.paquetes.filter((p) => p.prealerta?.origen === "captura" && p.etapa === "pendiente").length },
  ],
};
