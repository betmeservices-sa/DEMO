// La muestra del motor de contenido: cuatro marcas que BetMe atiende, con su
// calendario de la semana pasada, esta y la que viene.
//
// Se arma RELATIVA a hoy (el lunes de esta semana), para que el calendario de
// la demo siempre se vea vivo: lo de antes de este momento sale publicado y lo
// de después, programado. Las marcas, las personas y las cuentas son
// INVENTADAS.

import { BANCO, lecturaDeFoto, type Angulo } from "./banco";
import { diaDe, instanteDe, localSV, lunesDe, sumarDias } from "./fechas";
import { anuncioDe, estadoDeVariantes, redesPara, rotulosDeAngulo, usoDeGeneracion, usoDeVideo, variantesDe } from "./generador";
import { llevaRotulo } from "./letras";
import type {
  Encargo,
  EstadoEstudio,
  EstadoPieza,
  Idioma,
  Marca,
  Medio,
  Pieza,
  RegistroUso,
  TipoPieza,
  TrabajoRender,
} from "./tipos";

const F = (n: string) => `/brand/estudio/${n}.jpg`;

export const MARCAS: Marca[] = [
  {
    id: "solano",
    nombre: "Solano Pro Painting",
    rubro: "Pintura residencial y comercial",
    ciudad: "Miami, FL",
    zonaHoraria: "America/New_York",
    idiomas: { es: 50, en: 50 },
    tono: "Cercano y directo, de contratista que da la cara. Explica el porqué de cada paso. Nada de exageraciones.",
    servicios: ["Exteriores", "Interiores", "Gabinetes", "Estuco y reparación", "Impermeabilizante de techo"],
    ofertas: ["Estimado gratis en 48 horas", "10% en exteriores hasta el 30 de noviembre"],
    palabrasProhibidas: ["el más barato", "garantía de por vida", "100% seguro"],
    colores: ["#E4572E", "#1D3557", "#F1FAEE"],
    iniciales: "SP",
    plan: "Crecimiento",
    creditosPlan: 200,
    cta: { es: "Pide tu estimado", en: "Get a free estimate" },
    ubicacionId: "loc_7Qm2SolanoPP",
    redes: [
      { red: "instagram", cuenta: "@solanopropainting", estado: "conectada" },
      { red: "facebook", cuenta: "Solano Pro Painting", estado: "conectada" },
      { red: "google", cuenta: "Solano Pro Painting, Miami", estado: "conectada" },
      { red: "tiktok", cuenta: "@solanopaints", estado: "vencida" },
      { red: "youtube", cuenta: "", estado: "sin_conectar" },
      { red: "linkedin", cuenta: "", estado: "sin_conectar" },
    ],
    avatar: {
      tipo: "clon",
      nombre: "Rafael Solano",
      foto: F("retrato-rafael"),
      avatarId: "av_rafael_01",
      vozId: "vz_rafael_es_en",
      vozNombre: "Rafael (clon)",
      consentimiento: { firmado: "2026-10-02", quien: "Rafael Solano" },
    },
    portada: F("casa-blanca"),
  },
  {
    id: "keystone",
    nombre: "Keystone Shield Roofing",
    rubro: "Techos residenciales",
    ciudad: "Fort Lauderdale, FL",
    zonaHoraria: "America/New_York",
    idiomas: { es: 30, en: 70 },
    tono: "Técnico y tranquilo. Explica antes de vender, sobre todo en temporada de huracanes.",
    servicios: ["Reemplazo de techo", "Reparación por tormenta", "Inspección", "Teja y metal"],
    ofertas: ["Inspección gratis después de tormenta", "Financiamiento a 18 meses"],
    palabrasProhibidas: ["a prueba de huracanes", "sin costo para usted", "el seguro lo paga todo"],
    colores: ["#2B4C7E", "#F2A541", "#E8EEF2"],
    iniciales: "KS",
    plan: "Total",
    creditosPlan: 350,
    cta: { es: "Pide tu inspección", en: "Book an inspection" },
    ubicacionId: "loc_3Kx9Keystone",
    redes: [
      { red: "instagram", cuenta: "@keystoneshieldroofing", estado: "conectada" },
      { red: "facebook", cuenta: "Keystone Shield Roofing", estado: "conectada" },
      { red: "linkedin", cuenta: "Keystone Shield Roofing", estado: "conectada" },
      { red: "google", cuenta: "Keystone Shield Roofing", estado: "conectada" },
      { red: "youtube", cuenta: "Keystone Shield", estado: "conectada" },
      { red: "tiktok", cuenta: "", estado: "sin_conectar" },
    ],
    avatar: {
      tipo: "marca",
      nombre: "Voz de Keystone",
      foto: F("techo-trabajo"),
      avatarId: "av_keystone_broll",
      vozId: "vz_mark_en",
      vozNombre: "Mark, voz en off",
    },
    portada: F("casa-piscina"),
  },
  {
    id: "casanova",
    nombre: "Casa Nova Kitchen & Bath",
    rubro: "Remodelación de cocinas y baños",
    ciudad: "Doral, FL",
    zonaHoraria: "America/New_York",
    idiomas: { es: 60, en: 40 },
    tono: "Cálido y aspiracional, siempre con datos concretos de tiempos y materiales.",
    servicios: ["Cocinas completas", "Baños", "Gabinetes a medida", "Encimeras de cuarzo", "Diseño 3D"],
    ofertas: ["Diseño 3D sin costo con tu remodelación", "15% en encimeras de cuarzo en noviembre"],
    palabrasProhibidas: ["barato", "en una semana", "lujo a precio de nada"],
    colores: ["#2F5D50", "#C9A66B", "#F7F3EC"],
    iniciales: "CN",
    plan: "Crecimiento",
    creditosPlan: 200,
    cta: { es: "Pide tu diseño 3D", en: "Get your 3D design" },
    ubicacionId: "loc_8Pd4CasaNova",
    redes: [
      { red: "instagram", cuenta: "@casanovakitchenbath", estado: "conectada" },
      { red: "facebook", cuenta: "Casa Nova Kitchen & Bath", estado: "conectada" },
      { red: "tiktok", cuenta: "@casanovadoral", estado: "conectada" },
      { red: "google", cuenta: "Casa Nova Kitchen & Bath, Doral", estado: "conectada" },
      { red: "linkedin", cuenta: "", estado: "sin_conectar" },
      { red: "youtube", cuenta: "", estado: "sin_conectar" },
    ],
    avatar: {
      tipo: "clon",
      nombre: "Daniela Nova",
      foto: F("retrato-daniela"),
      avatarId: "av_daniela_01",
      vozId: "vz_daniela_es_en",
      vozNombre: "Daniela (clon)",
      consentimiento: { firmado: "2026-10-09", quien: "Daniela Nova" },
    },
    portada: F("cocina-isla"),
  },
  {
    id: "betme",
    nombre: "BetMe Services",
    rubro: "Personal remoto y operaciones",
    ciudad: "Miami, FL",
    zonaHoraria: "America/New_York",
    idiomas: { es: 20, en: 80 },
    tono: "Profesional y humano. Habla de horas recuperadas y de equipo, nunca de recortar gente.",
    servicios: ["Asistentes virtuales", "Contabilidad", "Asistentes legales", "Agentes de IA"],
    ofertas: ["Una semana de prueba"],
    palabrasProhibidas: ["mano de obra barata", "outsourcing barato"],
    colores: ["#1B2A4A", "#5BBCD6", "#F0A830"],
    iniciales: "BM",
    plan: "Total",
    creditosPlan: 350,
    cta: { es: "Habla con nosotros", en: "Talk to us" },
    ubicacionId: "aStaZagxlnAITYYGtub2",
    redes: [
      { red: "linkedin", cuenta: "BetMe Services", estado: "conectada" },
      { red: "instagram", cuenta: "@betmeservices", estado: "conectada" },
      { red: "facebook", cuenta: "BetMe Services", estado: "conectada" },
      { red: "google", cuenta: "", estado: "sin_conectar" },
      { red: "tiktok", cuenta: "", estado: "sin_conectar" },
      { red: "youtube", cuenta: "", estado: "sin_conectar" },
    ],
    avatar: {
      tipo: "marca",
      nombre: "Voz de BetMe",
      foto: F("equipo-remoto"),
      avatarId: "av_betme_broll",
      vozId: "vz_ana_en",
      vozNombre: "Ana, voz en off",
    },
    portada: F("reunion"),
    letra: "montserrat",
  },
];

const DIA_MS = 86_400_000;

interface Entrada {
  marca: string;
  angulo: string;
  idioma: Idioma;
  /** Para sacar el ángulo en otro formato (un consejo como anuncio, por ejemplo). */
  formato?: TipoPieza;
  /** Días desde el lunes de esta semana (negativo = semana pasada). */
  dia?: number;
  hora?: string;
  estado?: EstadoPieza;
  encargo?: string;
  /** Hace cuántos minutos se generó, si no sale de la fecha de publicación. */
  creadaHaceMin?: number;
  nota?: string;
  /** La red que falló al publicar. */
  falla?: { red: string; error: string };
}

// El calendario de la muestra, marca por marca. Las horas son de El Salvador:
// 7:00 aquí son las 9:00 en Miami.
const ENTRADAS: Entrada[] = [
  // Solano Pro Painting
  { marca: "solano", angulo: "solano-interior", idioma: "es", dia: -6, hora: "07:00" },
  { marca: "solano", angulo: "solano-pelado", idioma: "en", dia: -4, hora: "10:30" },
  {
    marca: "solano",
    angulo: "solano-manos",
    idioma: "en",
    dia: -3,
    hora: "16:00",
    falla: { red: "tiktok", error: "La sesión de TikTok venció. Reconecta la cuenta para volver a publicar." },
  },
  { marca: "solano", angulo: "solano-fachada", idioma: "es", dia: -2, hora: "16:00" },
  { marca: "solano", angulo: "solano-color", idioma: "en", dia: 0, hora: "07:00" },
  { marca: "solano", angulo: "solano-pelado", idioma: "es", dia: 1, hora: "10:30" },
  { marca: "solano", angulo: "solano-oferta", idioma: "es", dia: 2, hora: "16:00" },
  { marca: "solano", angulo: "solano-interior", idioma: "en", dia: 3, hora: "07:00" },
  { marca: "solano", angulo: "solano-fachada", idioma: "en", dia: 4, hora: "16:00" },
  { marca: "solano", angulo: "solano-oferta", idioma: "en", dia: 7, hora: "07:00" },
  { marca: "solano", angulo: "solano-color", idioma: "es", dia: 9, hora: "10:30" },
  { marca: "solano", angulo: "solano-manos", idioma: "es", estado: "por_aprobar", encargo: "enc-solano-video", creadaHaceMin: 38 },
  { marca: "solano", angulo: "solano-oferta", idioma: "es", formato: "anuncio", estado: "por_aprobar", encargo: "enc-solano-anuncios", creadaHaceMin: 15 },
  { marca: "solano", angulo: "solano-pelado", idioma: "en", formato: "anuncio", estado: "por_aprobar", encargo: "enc-solano-anuncios", creadaHaceMin: 15 },

  // Keystone Shield Roofing
  { marca: "keystone", angulo: "keystone-metal", idioma: "en", dia: -5, hora: "08:00" },
  { marca: "keystone", angulo: "keystone-tormenta", idioma: "en", dia: -3, hora: "11:00" },
  { marca: "keystone", angulo: "keystone-tormenta", idioma: "es", dia: -1, hora: "08:00" },
  { marca: "keystone", angulo: "keystone-aislante", idioma: "en", dia: 0, hora: "11:00" },
  { marca: "keystone", angulo: "keystone-financiamiento", idioma: "en", dia: 1, hora: "08:00" },
  { marca: "keystone", angulo: "keystone-materiales", idioma: "en", dia: 2, hora: "11:00" },
  { marca: "keystone", angulo: "keystone-metal", idioma: "es", dia: 3, hora: "17:30" },
  { marca: "keystone", angulo: "keystone-financiamiento", idioma: "es", dia: 5, hora: "08:00" },
  { marca: "keystone", angulo: "keystone-aislante", idioma: "es", dia: 8, hora: "11:00" },
  { marca: "keystone", angulo: "keystone-informe", idioma: "en", estado: "aprobada", encargo: "enc-keystone-video", creadaHaceMin: 26 * 60 },
  { marca: "keystone", angulo: "keystone-materiales", idioma: "es", estado: "por_aprobar", encargo: "enc-keystone-carrusel", creadaHaceMin: 26 * 60 },

  // Casa Nova Kitchen & Bath
  { marca: "casanova", angulo: "casanova-comedor", idioma: "es", dia: -6, hora: "16:00" },
  { marca: "casanova", angulo: "casanova-cuarzo", idioma: "es", dia: -4, hora: "07:30" },
  { marca: "casanova", angulo: "casanova-bano", idioma: "es", dia: -2, hora: "16:00" },
  { marca: "casanova", angulo: "casanova-cocina", idioma: "es", dia: 0, hora: "07:30" },
  { marca: "casanova", angulo: "casanova-3d", idioma: "en", dia: 2, hora: "16:00" },
  { marca: "casanova", angulo: "casanova-comedor", idioma: "en", dia: 4, hora: "07:30" },
  { marca: "casanova", angulo: "casanova-cocina", idioma: "en", dia: 6, hora: "10:00" },
  { marca: "casanova", angulo: "casanova-cuarzo", idioma: "en", estado: "por_aprobar", encargo: "enc-casanova-imagenes", creadaHaceMin: 125 },
  { marca: "casanova", angulo: "casanova-bano", idioma: "en", estado: "por_aprobar", encargo: "enc-casanova-carrusel", creadaHaceMin: 125 },
  { marca: "casanova", angulo: "casanova-3d", idioma: "es", formato: "imagen", estado: "por_aprobar", encargo: "enc-casanova-imagenes", creadaHaceMin: 125 },
  { marca: "casanova", angulo: "casanova-tiempos", idioma: "es", estado: "aprobada", encargo: "enc-casanova-video", creadaHaceMin: 123 },
  { marca: "casanova", angulo: "casanova-cuarzo", idioma: "es", formato: "anuncio", estado: "aprobada", encargo: "enc-casanova-anuncio", creadaHaceMin: 122 },

  // BetMe Services
  { marca: "betme", angulo: "betme-contabilidad", idioma: "en", dia: -5, hora: "09:00" },
  { marca: "betme", angulo: "betme-asistente", idioma: "en", dia: -1, hora: "09:00" },
  { marca: "betme", angulo: "betme-delegar", idioma: "en", dia: 1, hora: "09:00" },
  { marca: "betme", angulo: "betme-agentes", idioma: "en", dia: 3, hora: "09:00" },
  { marca: "betme", angulo: "betme-legal", idioma: "en", dia: 5, hora: "09:00" },
  { marca: "betme", angulo: "betme-prueba", idioma: "en", formato: "texto", estado: "por_aprobar", encargo: "enc-betme-linkedin", creadaHaceMin: 3 * 24 * 60 },
  { marca: "betme", angulo: "betme-asistente", idioma: "es", formato: "texto", estado: "por_aprobar", encargo: "enc-betme-linkedin", creadaHaceMin: 3 * 24 * 60 },
  { marca: "betme", angulo: "betme-contabilidad", idioma: "es", estado: "aprobada", encargo: "enc-betme-linkedin", creadaHaceMin: 3 * 24 * 60 },
  { marca: "betme", angulo: "betme-agentes", idioma: "es", estado: "aprobada", encargo: "enc-betme-linkedin", creadaHaceMin: 3 * 24 * 60 },
  {
    marca: "betme",
    angulo: "betme-delegar",
    idioma: "es",
    formato: "texto",
    estado: "rechazada",
    encargo: "enc-betme-linkedin",
    creadaHaceMin: 3 * 24 * 60,
    nota: "Muy larga para LinkedIn en español. Que salga solo en inglés.",
  },
];

const APRUEBA = "Mario G.";

function angulo(id: string): Angulo {
  for (const lista of Object.values(BANCO)) {
    const a = lista.find((x) => x.id === id);
    if (a) return a;
  }
  throw new Error(`Ángulo desconocido: ${id}`);
}

function isoHace(ahora: number, min: number): string {
  return new Date(ahora - min * 60_000).toISOString();
}

function idPostDe(id: string, red: string): string {
  let h = 0;
  for (const c of `${id}:${red}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `sp_${h.toString(36)}`;
}

/** La muestra completa armada alrededor de `ahora`. */
export function semillaEstudio(ahora: number = Date.now()): EstadoEstudio {
  const hoy = diaDe(localSV(ahora));
  const base = lunesDe(hoy);
  const marcaDe = (id: string) => MARCAS.find((m) => m.id === id)!;

  const piezas: Pieza[] = ENTRADAS.map((e) => {
    const a = angulo(e.angulo);
    const t = a[e.idioma];
    const marca = marcaDe(e.marca);
    const tipo = e.formato ?? a.tipo;
    const redes = redesPara(tipo, marca);
    const programadaPara = e.dia !== undefined && e.hora ? `${sumarDias(base, e.dia)}T${e.hora}` : undefined;
    const enPasado = programadaPara ? instanteDe(programadaPara) <= ahora : false;
    const estado: EstadoPieza = e.estado ?? (enPasado ? "publicada" : "programada");
    // Lo programado se generó días antes, y nunca después de ahora: lo que
    // sale la semana que viene se aprobó hace unas horas.
    const creadaMs = programadaPara
      ? Math.min(instanteDe(programadaPara) - 4 * DIA_MS, ahora - 6 * 3_600_000)
      : ahora - (e.creadaHaceMin ?? 60) * 60_000;
    const creada = new Date(creadaMs).toISOString();
    const id = `pz-${e.angulo}-${e.idioma}${tipo !== a.tipo ? `-${tipo}` : ""}`;
    const esVideo = tipo === "video";
    // Los videos que ya salieron o que van en el calendario tienen el video armado.
    const videoListo = esVideo && (estado === "publicada" || estado === "programada");
    const variantes = variantesDe(t.texto, t.hashtags, redes, estado === "rechazada" ? "rechazada" : estado, tipo).map((v) => {
      const conId = estado === "programada" || estado === "publicada" ? { ...v, postId: idPostDe(id, v.red) } : v;
      if (e.falla && v.red === e.falla.red) return { ...conId, estado: "fallida" as const, error: e.falla.error, postId: undefined };
      return conId;
    });
    const medios = esVideo ? (videoListo ? [a.fotos[0]] : []) : tipo === "carrusel" ? a.fotos : a.fotos.slice(0, 1);
    const historial: Pieza["historial"] = [{ ts: creada, accion: "generada", actor: "Motor" }];
    if (estado !== "por_aprobar" && estado !== "rechazada") {
      historial.push({ ts: new Date(creadaMs + 3 * 3_600_000).toISOString(), accion: "aprobada", actor: APRUEBA });
    }
    if (programadaPara) {
      historial.push({ ts: new Date(creadaMs + 3.2 * 3_600_000).toISOString(), accion: "programada", actor: APRUEBA });
    }
    if (estado === "publicada" || e.falla) {
      historial.push({ ts: new Date(instanteDe(programadaPara!)).toISOString(), accion: "publicada", actor: "Planificador" });
    }
    if (e.falla) {
      historial.push({
        ts: new Date(instanteDe(programadaPara!) + 60_000).toISOString(),
        accion: "fallo",
        actor: "Planificador",
        nota: e.falla.error,
      });
    }
    if (estado === "rechazada") {
      historial.push({ ts: new Date(creadaMs + 5 * 3_600_000).toISOString(), accion: "rechazada", actor: APRUEBA, nota: e.nota });
    }
    return {
      id,
      marcaId: marca.id,
      encargoId: e.encargo,
      tipo,
      idioma: e.idioma,
      titulo: t.titulo,
      texto: t.texto,
      hashtags: tipo === "anuncio" ? [] : t.hashtags,
      guion: esVideo ? t.guion : undefined,
      ideaImagen: a.idea,
      medios,
      rotulos: rotulosDeAngulo(tipo, t, medios.length),
      lectura: llevaRotulo(tipo) ? lecturaDeFoto(medios[0]) : undefined,
      duracion: esVideo ? a.duracion : undefined,
      anuncio: tipo === "anuncio" ? anuncioDe(t.titulo, marca, e.idioma) : undefined,
      redes,
      variantes,
      estado: estadoDeVariantes(variantes, estado),
      fase: esVideo ? (videoListo ? "video" : "guion") : undefined,
      programadaPara,
      creada,
      historial: historial.sort((x, y) => x.ts.localeCompare(y.ts)),
    };
  });

  const encargos: Encargo[] = [
    {
      id: "enc-solano-anuncios",
      marcaId: "solano",
      texto: "Anuncios para la oferta de 10% en exteriores: uno en español con la oferta y uno en inglés sobre la pintura que se pela.",
      formato: "anuncio",
      cantidad: 2,
      idiomas: { es: 50, en: 50 },
      redes: [],
      creado: isoHace(ahora, 15),
      actor: APRUEBA,
      piezas: piezas.filter((p) => p.encargoId === "enc-solano-anuncios").map((p) => p.id),
    },
    {
      id: "enc-solano-video",
      marcaId: "solano",
      texto: "Video corto de Rafael explicando cuántas manos de pintura lleva una pared, en español.",
      formato: "video",
      cantidad: 1,
      idiomas: { es: 100, en: 0 },
      redes: [],
      creado: isoHace(ahora, 38),
      actor: APRUEBA,
      piezas: piezas.filter((p) => p.encargoId === "enc-solano-video").map((p) => p.id),
    },
    {
      id: "enc-casanova-imagenes",
      marcaId: "casanova",
      texto: "Imágenes de noviembre: la oferta de cuarzo y el diseño 3D antes de empezar.",
      formato: "imagen",
      cantidad: 2,
      idiomas: { es: 60, en: 40 },
      redes: [],
      creado: isoHace(ahora, 125),
      actor: APRUEBA,
      piezas: piezas.filter((p) => p.encargoId === "enc-casanova-imagenes").map((p) => p.id),
    },
    {
      id: "enc-casanova-carrusel",
      marcaId: "casanova",
      texto: "Carrusel del baño antes y después, en inglés.",
      formato: "carrusel",
      cantidad: 1,
      idiomas: { es: 0, en: 100 },
      redes: [],
      creado: isoHace(ahora, 124),
      actor: APRUEBA,
      piezas: piezas.filter((p) => p.encargoId === "enc-casanova-carrusel").map((p) => p.id),
    },
    {
      id: "enc-casanova-video",
      marcaId: "casanova",
      texto: "Video de Daniela sobre cuánto tarda una cocina completa.",
      formato: "video",
      cantidad: 1,
      idiomas: { es: 100, en: 0 },
      redes: [],
      creado: isoHace(ahora, 123),
      actor: APRUEBA,
      piezas: piezas.filter((p) => p.encargoId === "enc-casanova-video").map((p) => p.id),
    },
    {
      id: "enc-casanova-anuncio",
      marcaId: "casanova",
      texto: "Anuncio de la oferta de cuarzo para la campaña de noviembre.",
      formato: "anuncio",
      cantidad: 1,
      idiomas: { es: 100, en: 0 },
      redes: [],
      creado: isoHace(ahora, 122),
      actor: APRUEBA,
      piezas: piezas.filter((p) => p.encargoId === "enc-casanova-anuncio").map((p) => p.id),
    },
    {
      id: "enc-keystone-video",
      marcaId: "keystone",
      texto: "Video sin cara explicando cómo leer el informe de inspección.",
      formato: "video",
      cantidad: 1,
      idiomas: { es: 0, en: 100 },
      redes: [],
      creado: isoHace(ahora, 1560),
      actor: APRUEBA,
      piezas: piezas.filter((p) => p.encargoId === "enc-keystone-video").map((p) => p.id),
    },
    {
      id: "enc-keystone-carrusel",
      marcaId: "keystone",
      texto: "Carrusel comparando teja, shingle y metal, en español.",
      formato: "carrusel",
      cantidad: 1,
      idiomas: { es: 100, en: 0 },
      redes: [],
      creado: isoHace(ahora, 1555),
      actor: APRUEBA,
      piezas: piezas.filter((p) => p.encargoId === "enc-keystone-carrusel").map((p) => p.id),
    },
    {
      id: "enc-betme-linkedin",
      marcaId: "betme",
      texto: "Posts de texto para LinkedIn sobre asistentes virtuales, contabilidad, agentes de IA y la semana de prueba.",
      formato: "texto",
      cantidad: 5,
      idiomas: { es: 20, en: 80 },
      redes: ["linkedin", "instagram"],
      creado: isoHace(ahora, 4320),
      actor: APRUEBA,
      piezas: piezas.filter((p) => p.encargoId === "enc-betme-linkedin").map((p) => p.id),
    },
  ];

  // Los videos que se están armando ahora mismo. Al terminar, el video pasa a
  // la cola para su segunda aprobación.
  const trabajos: TrabajoRender[] = [
    {
      id: "rd-keystone-informe",
      piezaId: "pz-keystone-informe-en",
      marcaId: "keystone",
      etapa: "edicion",
      progreso: 0,
      iniciado: isoHace(ahora, 6),
      duracionSeg: 9 * 60,
      minutos: 0.63,
    },
    {
      id: "rd-casanova-tiempos",
      piezaId: "pz-casanova-tiempos-es",
      marcaId: "casanova",
      etapa: "avatar",
      progreso: 0,
      iniciado: isoHace(ahora, 2),
      duracionSeg: 11 * 60,
      minutos: 0.68,
    },
    {
      id: "rd-betme-legal",
      piezaId: "pz-betme-legal-en",
      marcaId: "betme",
      etapa: "listo",
      progreso: 100,
      iniciado: isoHace(ahora, 30 * 60),
      duracionSeg: 8 * 60,
      minutos: 0.48,
    },
    {
      id: "rd-solano-manos",
      piezaId: "pz-solano-manos-en",
      marcaId: "solano",
      etapa: "listo",
      progreso: 100,
      iniciado: isoHace(ahora, 5 * 24 * 60),
      duracionSeg: 8 * 60,
      minutos: 0.53,
    },
  ];

  const medios: Medio[] = [];
  for (const marca of MARCAS) {
    const vistas = new Set<string>();
    const deMarca = piezas.filter((p) => p.marcaId === marca.id);
    for (const a of BANCO[marca.id] ?? []) {
      for (const url of a.fotos) {
        if (vistas.has(url) || url.includes("retrato-")) continue;
        vistas.add(url);
        medios.push({
          id: `md-${marca.id}-${url.split("/").pop()!.replace(".jpg", "")}`,
          marcaId: marca.id,
          url,
          tipo: "obra",
          titulo: a.idea,
          lectura: lecturaDeFoto(url),
          fecha: new Date(ahora - (medios.length % 9) * 2.5 * DIA_MS - 5 * DIA_MS).toISOString(),
          usos: deMarca.filter((p) => p.medios.includes(url)).length,
        });
      }
      // Los gráficos con titular: las ofertas y los consejos llevan su texto encima.
      if (a.tipo === "imagen" && /oferta|%|gratis|prueba|financ/i.test(a.es.titulo + a.claves.join(" "))) {
        medios.push({
          id: `md-${a.id}-grafico`,
          marcaId: marca.id,
          url: a.fotos[0],
          tipo: "generada",
          titulo: a.es.titulo,
          titular: a.es.titulo,
          lectura: lecturaDeFoto(a.fotos[0]),
          fecha: new Date(ahora - 3 * DIA_MS).toISOString(),
          usos: 1,
        });
      }
    }
  }
  for (const t of trabajos.filter((x) => x.etapa === "listo")) {
    const p = piezas.find((x) => x.id === t.piezaId);
    if (!p) continue;
    medios.push({
      id: `md-${t.id}`,
      marcaId: t.marcaId,
      url: p.medios[0] ?? angulo(p.id.replace(/^pz-/, "").replace(/-(es|en)$/, "")).fotos[0],
      tipo: "video",
      titulo: p.titulo,
      fecha: t.iniciado,
      usos: 1,
    });
  }

  const uso: RegistroUso[] = [];
  let n = 0;
  const reg = (r: Omit<RegistroUso, "id">) => uso.push({ ...r, id: `uso-${++n}`, costoUsd: Math.round(r.costoUsd * 10000) / 10000 });
  for (const p of piezas) for (const r of usoDeGeneracion(p, p.creada)) reg(r);
  for (const m of medios.filter((x) => x.tipo === "generada")) {
    reg({ marcaId: m.marcaId, servicio: "imagen", proveedor: "Ideogram", unidades: 1, unidad: "imagen", creditos: 4, costoUsd: 0.04, fecha: m.fecha });
  }
  for (const t of trabajos) {
    const p = piezas.find((x) => x.id === t.piezaId)!;
    for (const r of usoDeVideo(p, t.minutos, t.iniciado)) reg(r);
  }

  // Lo que cada marca gastó en el mes antes de la semana de la muestra: piezas
  // que ya no salen en el calendario pero sí se descontaron de su plan.
  const inicioMes = `${hoy.slice(0, 8)}01`;
  const PREVIO: Record<string, number> = { solano: 1, keystone: 2, casanova: 1, betme: 1 };
  for (const marca of MARCAS) {
    for (let d = inicioMes; d < base; d = sumarDias(d, 1)) {
      const k = Number(d.slice(8, 10));
      const fecha = new Date(instanteDe(`${d}T09:00`)).toISOString();
      if ((k + marca.iniciales.charCodeAt(0)) % 2 === 0) {
        for (let v = 0; v < PREVIO[marca.id]; v++) {
          reg({ marcaId: marca.id, servicio: "texto", proveedor: "Claude", unidades: 1, unidad: "pieza", creditos: 1, costoUsd: 0.006, fecha });
          reg({ marcaId: marca.id, servicio: "edicion", proveedor: "Creatomate", unidades: 2, unidad: "láminas", creditos: 2, costoUsd: 0.04, fecha });
        }
      }
      if ((k + marca.iniciales.charCodeAt(1)) % 6 === 0) {
        reg({ marcaId: marca.id, servicio: "voz", proveedor: "ElevenLabs", unidades: 380, unidad: "caracteres", creditos: 4, costoUsd: 0.068, fecha });
        reg({ marcaId: marca.id, servicio: "avatar", proveedor: "HeyGen", unidades: 0.5, unidad: "min", creditos: 10, costoUsd: 0.5, fecha });
        reg({ marcaId: marca.id, servicio: "edicion", proveedor: "Creatomate", unidades: 1, unidad: "video", creditos: 3, costoUsd: 0.1, fecha });
      }
    }
  }

  return { base, marcas: MARCAS, piezas, encargos, medios, trabajos, uso };
}
