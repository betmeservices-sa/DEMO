// Los ángulos de contenido de cada marca de la muestra, en los dos idiomas.
//
// De aquí salen la muestra del calendario y lo que devuelve el generador
// simulado. Con el modelo conectado, este banco deja de ser la fuente y pasa a
// ser el ejemplo de estilo que va en el prompt de cada marca.
//
// Las marcas son INVENTADAS. Lo que dicen (tiempos de obra, materiales,
// ofertas) es de la muestra, no de un negocio real.

import type { Idioma, TipoPieza } from "./tipos";

export interface TextoAngulo {
  titulo: string;
  texto: string;
  hashtags: string[];
  guion?: string;
}

export interface Angulo {
  id: string;
  tipo: TipoPieza;
  /** Palabras del prompt que hacen que este ángulo salga primero. */
  claves: string[];
  idea: string;
  fotos: string[];
  duracion?: number;
  es: TextoAngulo;
  en: TextoAngulo;
}

const F = (n: string) => `/brand/estudio/${n}.jpg`;

export const BANCO: Record<string, Angulo[]> = {
  solano: [
    {
      id: "solano-fachada",
      tipo: "carrusel",
      claves: ["antes", "después", "fachada", "exterior", "before"],
      idea: "Fachada antes y después, misma toma, luz de mañana",
      fotos: [F("casa-blanca"), F("casa-porche")],
      es: {
        titulo: "Antes y después, fachada en Coral Gables",
        texto:
          "Esta fachada llevaba 12 años sin pintura y el sol de Miami ya se le notaba. Lavado a presión, sellador y dos manos de elastomérico. Tres días de trabajo y la casa parece otra.",
        hashtags: ["#PinturaMiami", "#AntesYDespues", "#CoralGables"],
      },
      en: {
        titulo: "Before and after, Coral Gables façade",
        texto:
          "This façade went 12 years without fresh paint, and the Miami sun showed it. Pressure wash, primer and two coats of elastomeric. Three days of work, a whole new house.",
        hashtags: ["#MiamiPainters", "#BeforeAndAfter", "#CoralGables"],
      },
    },
    {
      id: "solano-pelado",
      tipo: "imagen",
      claves: ["pela", "humedad", "consejo", "tip", "peeling"],
      idea: "Rodillo sobre pared recién sellada, primer plano",
      fotos: [F("pintura-rodillo")],
      es: {
        titulo: "Por qué se pela la pintura exterior",
        texto:
          "Si la pintura se te pela en láminas, casi nunca es la pintura: es humedad atrapada o una superficie sin preparar. Antes de pintar revisamos grietas, sellamos y dejamos secar. Por eso dura.",
        hashtags: ["#PinturaExterior", "#Miami", "#ConsejosDeCasa"],
      },
      en: {
        titulo: "Why exterior paint peels",
        texto:
          "Peeling paint is rarely the paint's fault. It's trapped moisture or a surface nobody prepped. Before we paint, we check cracks, seal and let it dry. That's why it lasts.",
        hashtags: ["#ExteriorPainting", "#Miami", "#HomeTips"],
      },
    },
    {
      id: "solano-manos",
      tipo: "video",
      claves: ["video", "manos", "rafael", "explica", "reel"],
      idea: "Rafael en una obra terminada, plano medio, subtítulos grandes",
      fotos: [F("retrato-rafael")],
      duracion: 32,
      es: {
        titulo: "Rafael: ¿una mano o dos?",
        texto: "La pregunta que más nos hacen en cada estimado. Rafael la contesta en 30 segundos.",
        hashtags: ["#PinturaMiami", "#Contratista", "#Reels"],
        guion:
          "¿Una mano o dos? Te lo digo claro: si cambias de un color oscuro a uno claro, son dos, siempre. Una sola mano se ve bien el primer mes y después se nota. Nosotros cotizamos dos manos desde el principio, para que no te lleves sorpresas.",
      },
      en: {
        titulo: "Rafael: one coat or two?",
        texto: "The question we get at every estimate. Rafael answers it in 30 seconds.",
        hashtags: ["#MiamiPainters", "#Contractor", "#Reels"],
        guion:
          "One coat or two? Here's the honest answer: going from dark to light, it's two. Every time. One coat looks fine for a month, then it shows. We quote two coats from day one, so there are no surprises.",
      },
    },
    {
      id: "solano-interior",
      tipo: "imagen",
      claves: ["interior", "sala", "cuarto", "brickell"],
      idea: "Sala terminada, blanco cálido, techo mate",
      fotos: [F("interior-pintado")],
      es: {
        titulo: "Interior terminado en Brickell",
        texto:
          "Sala, pasillo y dos cuartos en un fin de semana, con los muebles protegidos y el piso cubierto. Color: blanco cálido con el techo en mate.",
        hashtags: ["#PinturaInterior", "#Brickell", "#Miami"],
      },
      en: {
        titulo: "Interior job in Brickell",
        texto:
          "Living room, hallway and two bedrooms in one weekend, furniture covered and floors protected. Color: warm white with a flat ceiling.",
        hashtags: ["#InteriorPainting", "#Brickell", "#Miami"],
      },
    },
    {
      id: "solano-oferta",
      tipo: "imagen",
      claves: ["oferta", "descuento", "promo", "noviembre", "offer"],
      idea: "Casa con porche recién pintada, espacio arriba para el titular",
      fotos: [F("casa-porche")],
      es: {
        titulo: "10% en exteriores hasta el 30 de noviembre",
        texto:
          "Hasta el 30 de noviembre, 10% en pintura exterior. Estimado gratis en 48 horas, por escrito y sin compromiso. Escríbenos por mensaje.",
        hashtags: ["#PinturaMiami", "#Oferta"],
      },
      en: {
        titulo: "10% off exteriors through Nov 30",
        texto:
          "Through November 30, 10% off exterior painting. Free written estimate within 48 hours, no strings attached. Send us a message.",
        hashtags: ["#MiamiPainters", "#FallSpecial"],
      },
    },
    {
      id: "solano-color",
      tipo: "carrusel",
      claves: ["color", "errores", "elegir", "carrusel"],
      idea: "Tres ambientes con el mismo color bajo luces distintas",
      fotos: [F("sala-color"), F("cuarto-pintado"), F("interior-pintado")],
      es: {
        titulo: "3 errores al elegir color",
        texto:
          "Tres errores que vemos cada semana: elegir el color con la luz de la tienda, probarlo en un cuadrito de 5 cm y olvidarse del color del techo. Desliza para ver cómo evitarlos.",
        hashtags: ["#Color", "#PinturaInterior", "#Miami"],
      },
      en: {
        titulo: "3 mistakes when picking a color",
        texto:
          "Three mistakes we see every week: picking color under store lighting, testing a 2-inch swatch, and forgetting the ceiling. Swipe to see how to avoid them.",
        hashtags: ["#ColorTips", "#InteriorPainting", "#Miami"],
      },
    },
  ],
  keystone: [
    {
      id: "keystone-tormenta",
      tipo: "imagen",
      claves: ["tormenta", "huracán", "inspección", "storm"],
      idea: "Técnico revisando tejas en el techo, cielo despejado",
      fotos: [F("techo-trabajo")],
      es: {
        titulo: "Qué revisar después de la tormenta",
        texto:
          "Después de la tormenta de la semana pasada, revisa tejas levantadas, gránulos en las canaletas y manchas en el techo de adentro. ¿Ves alguna? Pide una inspección gratis antes de la próxima lluvia.",
        hashtags: ["#TechosFlorida", "#Tormenta", "#FortLauderdale"],
      },
      en: {
        titulo: "What to check after the storm",
        texto:
          "After last week's storm, look for lifted shingles, granules in your gutters and stains on the ceiling. Spot any of these? Request a free inspection before the next rain.",
        hashtags: ["#FloridaRoofing", "#StormSeason", "#FortLauderdale"],
      },
    },
    {
      id: "keystone-informe",
      tipo: "video",
      claves: ["video", "informe", "reporte", "explica", "report"],
      idea: "Tomas del techo y del informe en tableta, voz en off",
      fotos: [F("techo-trabajo")],
      duracion: 38,
      es: {
        titulo: "Cómo leer tu informe de inspección",
        texto: "Tres partes, sin letra chiquita. Así se lee el informe que te dejamos después de inspeccionar.",
        hashtags: ["#TechosFlorida", "#Inspeccion"],
        guion:
          "Tu informe de inspección tiene tres partes. Estado: lo que vimos, con fotos. Urgencia: lo que hay que arreglar ya y lo que puede esperar. Estimado: cuánto cuesta, línea por línea. Si algo no queda claro, te lo explicamos por teléfono.",
      },
      en: {
        titulo: "How to read your inspection report",
        texto: "Three parts, no fine print. Here's how to read the report we leave after every inspection.",
        hashtags: ["#FloridaRoofing", "#RoofInspection"],
        guion:
          "Your inspection report has three parts. Condition: what we saw, with photos. Urgency: what needs work now and what can wait. Estimate: what it costs, line by line. If anything is unclear, we walk you through it on the phone.",
      },
    },
    {
      id: "keystone-metal",
      tipo: "imagen",
      claves: ["metal", "terminado", "proyecto", "obra"],
      idea: "Casa moderna con techo de metal gris carbón",
      fotos: [F("casa-moderna")],
      es: {
        titulo: "Techo de metal en Fort Lauderdale",
        texto:
          "Techo de metal de junta alzada, terminado esta semana en Fort Lauderdale. Refleja el calor, aguanta viento y el dueño eligió gris carbón para combinar con las persianas.",
        hashtags: ["#TechoDeMetal", "#FortLauderdale"],
      },
      en: {
        titulo: "Metal roof in Fort Lauderdale",
        texto:
          "Standing seam metal roof, finished this week in Fort Lauderdale. It reflects heat, handles wind, and the homeowner went with charcoal to match the shutters.",
        hashtags: ["#MetalRoof", "#FortLauderdale"],
      },
    },
    {
      id: "keystone-financiamiento",
      tipo: "texto",
      claves: ["financiamiento", "pago", "cuotas", "financing", "oferta"],
      idea: "Casa con piscina y techo nuevo, tarde",
      fotos: [F("casa-piscina")],
      es: {
        titulo: "Financiamiento a 18 meses",
        texto:
          "Un techo nuevo no tiene que ser un solo pago. Pregunta por el financiamiento a 18 meses cuando te enviemos el estimado.",
        hashtags: ["#TechosFlorida", "#Financiamiento"],
      },
      en: {
        titulo: "18-month financing",
        texto: "A new roof doesn't have to be one payment. Ask about 18-month financing when we send your estimate.",
        hashtags: ["#FloridaRoofing", "#Financing"],
      },
    },
    {
      id: "keystone-materiales",
      tipo: "carrusel",
      claves: ["teja", "shingle", "metal", "comparar", "carrusel"],
      idea: "Tres casas, tres materiales de techo",
      fotos: [F("casa-noche"), F("casa-blanca-moderna"), F("estructura")],
      es: {
        titulo: "Teja, shingle o metal",
        texto:
          "¿Teja, shingle o metal? Cuánto dura cada uno, cuánto cuesta y qué aguanta mejor en el sur de Florida. Desliza antes de decidir.",
        hashtags: ["#Techos", "#SurDeFlorida"],
      },
      en: {
        titulo: "Tile, shingle or metal",
        texto:
          "Tile, shingle or metal? Lifespan, cost and what each one handles best in South Florida. Swipe through before you decide.",
        hashtags: ["#Roofing", "#SouthFlorida"],
      },
    },
    {
      id: "keystone-aislante",
      tipo: "imagen",
      claves: ["aislante", "ático", "calor", "detrás"],
      idea: "Instalación de aislante en el ático",
      fotos: [F("aislante")],
      es: {
        titulo: "Lo que no se ve también cuenta",
        texto:
          "Antes de poner el techo nuevo revisamos la base de madera y el aislante, para que el ático se mantenga más fresco.",
        hashtags: ["#TechosFlorida", "#Aislamiento"],
      },
      en: {
        titulo: "What you don't see matters too",
        texto:
          "Before the new roof goes on, we check the decking and the insulation so your attic stays cooler.",
        hashtags: ["#FloridaRoofing", "#Insulation"],
      },
    },
  ],
  casanova: [
    {
      id: "casanova-cocina",
      tipo: "imagen",
      claves: ["cocina", "terminada", "doral", "kitchen"],
      idea: "Cocina blanca con isla de cuarzo, luz natural",
      fotos: [F("cocina-isla")],
      es: {
        titulo: "Cocina terminada en Doral",
        texto:
          "Cocina terminada en Doral: gabinetes blancos a medida, isla con encimera de cuarzo y luz bajo los muebles. Cinco semanas desde la demolición hasta la entrega.",
        hashtags: ["#RemodelacionDeCocinas", "#Doral", "#Miami"],
      },
      en: {
        titulo: "Finished kitchen in Doral",
        texto:
          "Finished kitchen in Doral: custom white cabinets, a quartz island and under-cabinet lighting. Five weeks from demo day to handover.",
        hashtags: ["#KitchenRemodel", "#Doral", "#Miami"],
      },
    },
    {
      id: "casanova-tiempos",
      tipo: "video",
      claves: ["video", "tiempo", "tarda", "daniela", "semanas"],
      idea: "Daniela en una cocina terminada, plano medio",
      fotos: [F("retrato-daniela")],
      duracion: 41,
      es: {
        titulo: "Daniela: cuánto tarda una cocina",
        texto: "La respuesta corta: entre cuatro y seis semanas. La larga, en este video.",
        hashtags: ["#RemodelacionDeCocinas", "#Doral", "#Reels"],
        guion:
          "¿Cuánto tarda una cocina completa? Entre cuatro y seis semanas. La primera es demolición y plomería, dos o tres son gabinetes e instalación, y la última es encimera y detalles. Lo que más atrasa no es la obra: es cambiar de idea a mitad de camino. Por eso cerramos el diseño en 3D antes de empezar.",
      },
      en: {
        titulo: "Daniela: how long a kitchen takes",
        texto: "Short answer: four to six weeks. The long answer is in this video.",
        hashtags: ["#KitchenRemodel", "#Doral", "#Reels"],
        guion:
          "How long does a full kitchen take? Four to six weeks. Week one is demo and plumbing, two or three are cabinets and install, and the last one is countertops and finishing. What slows things down isn't the work, it's changing your mind halfway. That's why we lock the 3D design before we start.",
      },
    },
    {
      id: "casanova-bano",
      tipo: "carrusel",
      claves: ["baño", "antes", "después", "ducha", "bathroom"],
      idea: "Baño terminado con tina, y el antes",
      fotos: [F("bano-tina"), F("bano-plantas")],
      es: {
        titulo: "Baño de los 90 a esto",
        texto:
          "Del baño de los 90 a esto: ducha sin cancel, piso de porcelanato y mueble flotante. Desliza para ver el antes.",
        hashtags: ["#RemodelacionDeBanos", "#AntesYDespues", "#Doral"],
      },
      en: {
        titulo: "From a 90s bathroom to this",
        texto:
          "From a 90s bathroom to this: curbless shower, porcelain floors and a floating vanity. Swipe for the before.",
        hashtags: ["#BathroomRemodel", "#BeforeAndAfter", "#Doral"],
      },
    },
    {
      id: "casanova-cuarzo",
      tipo: "imagen",
      claves: ["oferta", "cuarzo", "encimera", "noviembre", "promo"],
      idea: "Encimera de cuarzo con utensilios, luz cálida",
      fotos: [F("cocina-blanca")],
      es: {
        titulo: "15% en encimeras de cuarzo",
        texto:
          "En noviembre, 15% en encimeras de cuarzo con tu remodelación de cocina. Te llevamos las muestras a casa.",
        hashtags: ["#Cuarzo", "#Cocinas", "#Miami"],
      },
      en: {
        titulo: "15% off quartz countertops",
        texto:
          "In November, 15% off quartz countertops with your kitchen remodel. We bring the samples to your home.",
        hashtags: ["#Quartz", "#KitchenDesign", "#Miami"],
      },
    },
    {
      id: "casanova-3d",
      tipo: "texto",
      claves: ["3d", "diseño", "plano", "design"],
      idea: "Planos y render 3D sobre la mesa",
      fotos: [F("planos")],
      es: {
        titulo: "Tu cocina en 3D antes de empezar",
        texto:
          "Antes de mover un gabinete, ves tu cocina terminada en 3D. Sin costo cuando remodelas con nosotros.",
        hashtags: ["#Diseño3D", "#RemodelacionDeCocinas"],
      },
      en: {
        titulo: "See it in 3D first",
        texto: "Before a single cabinet moves, you see your finished kitchen in 3D. Free when you remodel with us.",
        hashtags: ["#3DDesign", "#KitchenRemodel"],
      },
    },
    {
      id: "casanova-comedor",
      tipo: "imagen",
      claves: ["comedor", "abrir", "pared", "espacio"],
      idea: "Comedor integrado a la cocina, sillas verdes",
      fotos: [F("comedor")],
      es: {
        titulo: "Abrimos la pared",
        texto:
          "Abrimos la pared entre la cocina y el comedor. Más luz, más espacio y la familia junta a la hora de cenar.",
        hashtags: ["#Remodelacion", "#Doral"],
      },
      en: {
        titulo: "We opened the wall",
        texto:
          "We took down the wall between the kitchen and the dining room. More light, more room, and the family together at dinner.",
        hashtags: ["#HomeRemodel", "#Doral"],
      },
    },
  ],
  betme: [
    {
      id: "betme-asistente",
      tipo: "imagen",
      claves: ["asistente", "virtual", "horario", "assistant"],
      idea: "Equipo trabajando en laptops, ambiente real",
      fotos: [F("equipo-remoto")],
      es: {
        titulo: "Tu asistente, en tu horario",
        texto:
          "Tu asistente virtual trabaja en el horario de tu negocio, contesta en inglés y en español, y conoce tus herramientas desde el primer día.",
        hashtags: ["#AsistenteVirtual", "#PequeñosNegocios"],
      },
      en: {
        titulo: "Your assistant, on your hours",
        texto:
          "Your virtual assistant works your business hours, answers in English and Spanish, and knows your tools from day one.",
        hashtags: ["#VirtualAssistant", "#SmallBusiness"],
      },
    },
    {
      id: "betme-contabilidad",
      tipo: "texto",
      claves: ["contabilidad", "cierre", "mes", "bookkeeping"],
      idea: "Reunión de revisión de números",
      fotos: [F("reunion")],
      es: {
        titulo: "El cierre de mes sin perder el fin de semana",
        texto:
          "El cierre de mes no debería costarte el fin de semana. Conciliamos, clasificamos y te mandamos un reporte limpio cada mes.",
        hashtags: ["#Contabilidad", "#PequeñosNegocios"],
      },
      en: {
        titulo: "Month-end without losing your weekend",
        texto:
          "Month-end shouldn't take your whole weekend. Our bookkeepers reconcile, categorize and send you a clean report every month.",
        hashtags: ["#Bookkeeping", "#SmallBusiness"],
      },
    },
    {
      id: "betme-legal",
      tipo: "video",
      claves: ["video", "legal", "abogado", "law"],
      idea: "Tomas de oficina y documentos, voz en off",
      fotos: [F("planos")],
      duracion: 29,
      es: {
        titulo: "Qué hace un asistente legal remoto",
        texto: "Tú haces el trabajo legal. Tu asistente mueve todo lo demás.",
        hashtags: ["#AsistenteLegal", "#Abogados"],
        guion:
          "Un asistente legal remoto atiende las llamadas de casos nuevos, ordena los expedientes, redacta las cartas de rutina y te mantiene la agenda limpia. Tú te quedas con el trabajo legal. Tu asistente mueve todo lo demás.",
      },
      en: {
        titulo: "What a remote legal assistant does",
        texto: "You do the legal work. Your assistant keeps everything else moving.",
        hashtags: ["#LegalAssistant", "#LawFirm"],
        guion:
          "A remote legal assistant handles intake calls, organizes case files, drafts routine letters and keeps your calendar clean. You keep the legal work. They keep everything around it moving.",
      },
    },
    {
      id: "betme-prueba",
      tipo: "imagen",
      claves: ["prueba", "semana", "trial", "oferta"],
      idea: "Persona del equipo en reunión por video, sonriendo",
      fotos: [F("reunion")],
      es: {
        titulo: "Una semana de prueba",
        texto: "Empieza con una semana de prueba y mira cómo encaja tu nueva persona en el equipo.",
        hashtags: ["#Talento", "#EquipoRemoto"],
      },
      en: {
        titulo: "Start with a one-week trial",
        texto: "Start with a one-week trial and see how your new team member fits in.",
        hashtags: ["#RemoteTeam", "#Hiring"],
      },
    },
    {
      id: "betme-delegar",
      tipo: "carrusel",
      claves: ["delegar", "tareas", "lista", "carrusel"],
      idea: "Cinco tarjetas, una tarea por tarjeta",
      fotos: [F("equipo-remoto"), F("reunion"), F("planos")],
      es: {
        titulo: "5 tareas para delegar esta semana",
        texto:
          "Cinco tareas que casi cualquier negocio pequeño puede delegar esta semana: la bandeja de entrada, confirmar citas, cobrar facturas pendientes, captura de datos y pedir reseñas.",
        hashtags: ["#Productividad", "#PequeñosNegocios"],
      },
      en: {
        titulo: "5 tasks to hand off this week",
        texto:
          "Five tasks most small businesses can hand off this week: inbox triage, appointment confirmations, invoice follow-ups, data entry and review requests.",
        hashtags: ["#Productivity", "#SmallBusiness"],
      },
    },
    {
      id: "betme-agentes",
      tipo: "texto",
      claves: ["ia", "agente", "llamadas", "ai"],
      idea: "Teléfono con llamada entrante sobre escritorio",
      fotos: [F("equipo-remoto")],
      es: {
        titulo: "Llamada perdida, trabajo perdido",
        texto:
          "Una llamada perdida es un trabajo perdido. Nuestros agentes de IA contestan, califican al cliente y lo pasan a tu CRM, de día o de noche.",
        hashtags: ["#AgentesDeIA", "#Ventas"],
      },
      en: {
        titulo: "Missed call, missed job",
        texto:
          "A missed call is a missed job. Our AI agents answer, qualify the lead and send it to your CRM, day or night.",
        hashtags: ["#AIAgents", "#Sales"],
      },
    },
  ],
};

export function textoDe(angulo: Angulo, idioma: Idioma): TextoAngulo {
  return angulo[idioma];
}
