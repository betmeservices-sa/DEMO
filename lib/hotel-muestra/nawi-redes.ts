// Redes, comentarios y promociones de NAWI Beach House para el demo.
//
// Los afiches y las fotos son los de su sitio (antiresort.com/nawibeachhouse,
// revisado el 2026-10-22), igual que las cuentas (@nawibeachhouse en Instagram
// y TikTok, NAWIBeachHouse en Facebook), los eventos de octubre, el Happy Hour
// y los precios del Day Pass (SINGLE $25 entre semana y $40 el fin de semana,
// DUO $40 y $65, solo mayores de 18). Los seguidores, los números de cada
// publicación, quién comenta y las promociones son INVENTADOS.

import type { PromocionSemilla, RedesMuestra } from "./tipos";

const F = "/brand/nawi/redes";

export const NAWI_REDES: RedesMuestra = {
  cuentas: [
    { red: "instagram", handle: "@nawibeachhouse", seguidores: 18400, nuevosSeguidores: 920, crecimientoPct: 5.3, alcance30d: 96500, vistas30d: 214000, interacciones30d: 11800 },
    { red: "facebook", handle: "NAWI Beach House", seguidores: 9700, nuevosSeguidores: 210, crecimientoPct: 2.2, alcance30d: 38400, vistas30d: 61200, interacciones30d: 3150 },
    { red: "tiktok", handle: "@nawibeachhouse", seguidores: 12600, nuevosSeguidores: 2300, crecimientoPct: 22.3, vistas30d: 388000, meGusta30d: 24100, comentarios30d: 640, compartidos30d: 1850 },
  ],
  publicaciones: [
    { id: "ig1", red: "instagram", estado: "publicado", enDias: -2, hora: "18:30", imagenes: [`${F}/beach-olympics.jpg`], texto: "Running Man Beach Olympics este fin de semana: juegos de playa, voleibol, ceremonia de premios, fire show y DJ en vivo. Compra tu Day Pass en línea y ahorra hasta $5. Solo mayores de 18.", engagement: { alcance: 15800, meGusta: 1240, comentarios: 86, compartidos: 140, guardados: 410 } },
    { id: "ig2", red: "instagram", estado: "publicado", enDias: -5, hora: "12:00", imagenes: [`${F}/piscina.jpg`], texto: "Así se ve un sábado en la infinity frente al mar. Tu Day Pass incluye la piscina, la red suspendida, la playa semiprivada y el welcome drink.", engagement: { alcance: 21300, meGusta: 1890, comentarios: 64, compartidos: 120, guardados: 530 } },
    { id: "ig3", red: "instagram", estado: "publicado", enDias: -8, hora: "19:00", imagenes: [`${F}/girls-day-out.jpg`], texto: "Girls Day Out: manicure de cortesía, braid station, clase de salsa, s'mores, fire show y la ruleta de premios. Arma el plan con tus amigas.", engagement: { alcance: 12900, meGusta: 1020, comentarios: 58, compartidos: 205, guardados: 260 } },
    { id: "ig4", red: "instagram", estado: "programado", enDias: 1, hora: "10:00", imagenes: [`${F}/habitacion.jpg`], texto: "Despertar con el sonido del mar en una Ocean Tree House. Quedan pocas noches libres en noviembre: escríbenos por WhatsApp y te ayudamos a apartar." },
    { id: "ig5", red: "instagram", estado: "borrador", enDias: 6, hora: "12:00", imagenes: [`${F}/piscina.jpg`, `${F}/happy-hour.jpg`, `${F}/habitacion.jpg`], texto: "Tres razones para venir entre semana: el club más tranquilo, el Happy Hour 2x1 y las tarifas de domingo a jueves." },

    { id: "fb1", red: "facebook", estado: "publicado", enDias: -1, hora: "17:00", imagenes: [`${F}/happy-hour.jpg`], texto: "Happy Hour de lunes a viernes, de 6:00 a 7:00 p. m.: 2x1 en Tequila Sunrise, Cuba Libre, Mojito, Cosmopolitan y Vodka Tonic. ¡Te esperamos!", engagement: { alcance: 6400, meGusta: 310, comentarios: 22, compartidos: 41 } },
    { id: "fb2", red: "facebook", estado: "publicado", enDias: -14, hora: "18:00", imagenes: [`${F}/mayan-roots.jpg`], texto: "Mayan Roots: ceremonia maya del fuego, dinner show, masajes y tatuajes, braid station, fire show y DJ en vivo. Un fin de semana para conectar con nuestras raíces.", engagement: { alcance: 8700, meGusta: 455, comentarios: 39, compartidos: 88 } },
    { id: "fb3", red: "facebook", estado: "publicado", enDias: -20, hora: "11:00", imagenes: [`${F}/eventos-octubre.jpg`], texto: "Octubre en NAWI: Unicorn Jungle, Mayan Roots, Girls Day Out y Running Man Beach Olympics. Un fin de semana distinto cada semana.", engagement: { alcance: 9800, meGusta: 520, comentarios: 47, compartidos: 96 } },
    { id: "fb4", red: "facebook", estado: "programado", enDias: 2, hora: "09:00", imagenes: [`${F}/beach-olympics.jpg`], texto: "Hoy arrancan las Beach Olympics. Todavía hay Day Pass en línea; en la puerta se venden individuales y cuestan más." },

    { id: "tt1", red: "tiktok", estado: "publicado", enDias: -3, hora: "20:00", imagenes: [`${F}/girls-day-out.jpg`], texto: "Lo que pasó en Girls Day Out: salsa en la arena, s'mores al atardecer y el fire show.", engagement: { vistas: 48200, meGusta: 3900, comentarios: 120, compartidos: 410 } },
    { id: "tt2", red: "tiktok", estado: "publicado", enDias: -9, hora: "19:30", imagenes: [`${F}/piscina.jpg`], texto: "POV: llegas a Mizata un viernes y ya no te quieres ir.", engagement: { vistas: 112000, meGusta: 9100, comentarios: 260, compartidos: 1200 } },
    { id: "tt3", red: "tiktok", estado: "programado", enDias: 3, hora: "19:00", imagenes: [`${F}/unicorn-jungle.jpg`], texto: "Unicorn Jungle en 15 segundos: tarot, bodypaint y la clase de baile frente al mar." },
  ],
  // Cinco quedan sin responder (la cola con la que abre la pantalla), uno
  // está oculto (spam) y el resto ya tiene respuesta del hotel. El de
  // Patricia lo contestó otra persona, no el hotel: por eso sigue en la cola.
  comentarios: [
    { id: "nc1", publicacionId: "ig1", autor: "andre.melara", texto: "¿El Day Pass del evento incluye comida o solo el welcome drink?", haceMin: 14 },
    { id: "nc2", publicacionId: "ig1", autor: "kathy_rivas.sv", texto: "Vamos 8 amigas el sábado, ¿se puede apartar mesa frente al mar?", haceMin: 52, meGusta: 3 },
    {
      id: "nc3",
      publicacionId: "ig1",
      autor: "josue.alfaro",
      texto: "¿Hasta qué hora es el fire show? Salimos tarde de San Salvador",
      haceMin: 210,
      respuestas: [{ autor: "", nuestra: true, texto: "¡Hola Josué! El fire show arranca al caer el sol y el sábado el club abre hasta las 11:00 p. m. Te esperamos.", haceMin: 186 }],
    },
    {
      id: "nc4",
      publicacionId: "ig1",
      autor: "mafer.cg",
      texto: "@luisa_hdz este finde sí o sí",
      haceMin: 340,
      meGusta: 2,
      respuestas: [
        { autor: "luisa_hdz", texto: "Ya compré los DUO 🙌", haceMin: 322, meGusta: 1 },
        { autor: "", nuestra: true, texto: "¡Las esperamos a las dos!", haceMin: 300 },
      ],
    },
    { id: "nc5", publicacionId: "ig2", autor: "dvd.portillo", texto: "¿Puedo llevar a mi hijo de 15 años?", haceMin: 95 },
    {
      id: "nc6",
      publicacionId: "ig2",
      autor: "sofi.alvarenga",
      texto: "El mejor lugar de Mizata, ya quiero volver",
      haceMin: 1300,
      meGusta: 12,
      respuestas: [{ autor: "", nuestra: true, texto: "¡Gracias, Sofi! Aquí te esperamos para la próxima.", haceMin: 1240 }],
    },
    { id: "nc7", publicacionId: "ig2", autor: "promo.seguidores.reales", texto: "Gana 5K seguidores reales en 24 horas, escríbenos al DM", haceMin: 410, oculto: true },
    { id: "nc8", publicacionId: "fb1", autor: "Roberto Menjívar", texto: "¿El 2x1 aplica aunque no tenga Day Pass? Solo queremos ir al bar en la tarde", haceMin: 35 },
    {
      id: "nc9",
      publicacionId: "fb1",
      autor: "Patricia Hernández",
      texto: "¿Y los sábados no hay happy hour?",
      haceMin: 160,
      respuestas: [{ autor: "Carlos Rosales", texto: "Solo entre semana, ya pregunté yo", haceMin: 121 }],
    },
    {
      id: "nc10",
      publicacionId: "fb3",
      autor: "Ana Gabriela Castro",
      texto: "¿Para noviembre ya tienen fechas de eventos?",
      haceMin: 2900,
      respuestas: [{ autor: "", nuestra: true, texto: "¡Hola Ana! Los anunciamos la próxima semana en nuestras redes. Si quieres, te avisamos por WhatsApp.", haceMin: 2860 }],
    },
    {
      id: "nc11",
      publicacionId: "fb2",
      autor: "Lissette Bonilla",
      texto: "Estuvo increíble la ceremonia, gracias por todo 🙏",
      haceMin: 15000,
      meGusta: 8,
      respuestas: [{ autor: "", nuestra: true, texto: "¡Gracias a ti por venir, Lissette!", haceMin: 14900 }],
    },
    {
      id: "nc12",
      publicacionId: "fb2",
      autor: "Rafael Quintanilla",
      texto: "Cobraron el parqueo aparte y nadie nos avisó",
      haceMin: 14100,
      respuestas: [{ autor: "", nuestra: true, texto: "Hola Rafael, lamentamos la confusión. Te escribimos por mensaje para revisarlo.", haceMin: 13980 }],
    },
  ],
};

export const NAWI_PROMOCIONES: PromocionSemilla[] = [
  {
    id: "np1",
    nombre: "Happy Hour 2x1",
    descripcion: "2x1 en Tequila Sunrise, Cuba Libre, Mojito, Cosmopolitan y Vodka Tonic.",
    precio: "2x1 en los drinks de la lista",
    restricciones: "Solo de lunes a viernes, de 6:00 a 7:00 p. m.",
    activa: true,
  },
  {
    id: "np2",
    nombre: "Beach Olympics con noche",
    descripcion: "La noche del sábado en Ocean Tree House 180° con DUO Day Pass para el evento.",
    precio: "$330 para dos",
    restricciones: "Solo el fin de semana del evento y sujeto a disponibilidad",
    desdeEnDias: 0,
    hastaEnDias: 3,
    activa: true,
  },
  {
    id: "np3",
    nombre: "Tres noches en la selva",
    descripcion: "Tres noches en Bungalow en la selva para dos, por el precio de dos.",
    precio: "$280 las tres noches",
    restricciones: "Entrada de domingo a miércoles; no aplica en fines de semana de evento",
    hastaEnDias: 39,
    activa: true,
  },
  {
    id: "np4",
    nombre: "La Lodge entre semana",
    descripcion: "La Lodge para seis con 15% menos, de domingo a jueves.",
    precio: "$178.50 la noche (normal $210)",
    restricciones: "Mínimo dos noches; no aplica viernes ni sábado",
    hastaEnDias: 24,
    activa: true,
  },
  {
    id: "np5",
    nombre: "Cumpleaños en el club",
    descripcion: "Mesa frente al mar y postre para quien cumple años, en grupos con Day Pass.",
    precio: "Cortesía desde 6 Day Pass",
    restricciones: "Avisar con 48 horas; no aplica en noches de evento",
    activa: false,
  },
  {
    id: "np6",
    nombre: "Girls Day Out en DUO",
    descripcion: "DUO Day Pass para el fin de semana de Girls Day Out.",
    precio: "$60 por pareja (normal $65)",
    restricciones: "Solo en línea",
    desdeEnDias: -10,
    hastaEnDias: -4,
    activa: true,
  },
];
