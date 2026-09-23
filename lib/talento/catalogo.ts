// Catalogos del modulo de reclutamiento: skills (con sus sinonimos, para leer
// texto libre), niveles de ingles, etapas, fuentes y ubicaciones.
//
// Los sinonimos van en minusculas y SIN acentos: el lector normaliza el texto
// antes de buscarlos (ver normalizar()).

import type {
  CriterioId,
  Disc,
  Disponibilidad,
  Etapa,
  Fuente,
  Horario,
  Jornada,
  Modalidad,
  NivelIngles,
  Pais,
  Recomendacion,
  TipoEntrevista,
} from "./tipos";

export interface Skill {
  id: string;
  nombre: string;
  grupo: "Administracion" | "Clientes" | "Marketing" | "Datos" | "Legal" | "Proyectos" | "Finanzas" | "Herramientas";
  sinonimos: string[];
}

export const SKILLS: Skill[] = [
  { id: "agenda", nombre: "Gestión de agenda", grupo: "Administracion", sinonimos: ["agenda", "calendario", "calendar management", "calendar", "scheduling", "citas"] },
  { id: "correo", nombre: "Manejo de inbox", grupo: "Administracion", sinonimos: ["inbox", "correo electronico", "email management", "bandeja de correo", "manejo de correo"] },
  { id: "entrada_datos", nombre: "Entrada de datos", grupo: "Administracion", sinonimos: ["data entry", "entrada de datos", "digitacion", "captura de datos"] },
  { id: "redaccion_en", nombre: "Redacción en inglés", grupo: "Administracion", sinonimos: ["redaccion en ingles", "business writing", "written english", "escritura en ingles", "copywriting"] },
  { id: "traduccion", nombre: "Traducción", grupo: "Administracion", sinonimos: ["traduccion", "translation", "traductor", "traductora"] },
  { id: "atencion_cliente", nombre: "Atención al cliente", grupo: "Clientes", sinonimos: ["atencion al cliente", "servicio al cliente", "customer service", "customer support", "call center", "soporte al cliente"] },
  { id: "llamadas_frio", nombre: "Llamadas en frío", grupo: "Clientes", sinonimos: ["cold calling", "llamadas en frio", "prospeccion telefonica", "outbound"] },
  { id: "setter", nombre: "Agendar citas de venta", grupo: "Clientes", sinonimos: ["appointment setter", "appointment setting", "setter", "agendar citas de venta"] },
  { id: "ventas", nombre: "Ventas", grupo: "Clientes", sinonimos: ["ventas", "sales", "cierre de ventas", "closer"] },
  { id: "redes", nombre: "Manejo de redes sociales", grupo: "Marketing", sinonimos: ["redes sociales", "social media", "community manager", "instagram", "facebook", "tiktok"] },
  { id: "canva", nombre: "Canva", grupo: "Marketing", sinonimos: ["canva", "diseno grafico basico"] },
  { id: "email_marketing", nombre: "Email marketing", grupo: "Marketing", sinonimos: ["email marketing", "mailchimp", "newsletters", "campanas de correo"] },
  { id: "crm_ghl", nombre: "GoHighLevel", grupo: "Herramientas", sinonimos: ["gohighlevel", "go high level", "highlevel", "ghl"] },
  { id: "crm_hubspot", nombre: "HubSpot", grupo: "Herramientas", sinonimos: ["hubspot"] },
  { id: "crm_salesforce", nombre: "Salesforce", grupo: "Herramientas", sinonimos: ["salesforce"] },
  { id: "workspace", nombre: "Google Workspace", grupo: "Herramientas", sinonimos: ["google workspace", "g suite", "gsuite", "google drive", "google sheets", "gmail"] },
  { id: "office", nombre: "Microsoft 365", grupo: "Herramientas", sinonimos: ["microsoft 365", "office 365", "outlook", "microsoft office", "word"] },
  { id: "excel", nombre: "Excel avanzado", grupo: "Datos", sinonimos: ["excel avanzado", "advanced excel", "tablas dinamicas", "pivot tables", "vlookup", "buscarv", "excel"] },
  { id: "power_bi", nombre: "Power BI", grupo: "Datos", sinonimos: ["power bi", "powerbi"] },
  { id: "sql", nombre: "SQL", grupo: "Datos", sinonimos: ["sql", "mysql", "postgres", "consultas a base de datos"] },
  { id: "analisis", nombre: "Análisis de datos", grupo: "Datos", sinonimos: ["analisis de datos", "data analysis", "analista de datos", "kpis", "reporteria", "reportes"] },
  { id: "proyectos", nombre: "Gestión de proyectos", grupo: "Proyectos", sinonimos: ["gestion de proyectos", "project management", "project coordinator", "coordinacion de proyectos", "project manager"] },
  { id: "clickup", nombre: "ClickUp / Asana", grupo: "Proyectos", sinonimos: ["clickup", "asana", "monday", "trello", "notion"] },
  { id: "intake_legal", nombre: "Intake legal", grupo: "Legal", sinonimos: ["intake", "client intake", "intake legal", "recepcion de casos"] },
  { id: "documentos_legales", nombre: "Documentos legales", grupo: "Legal", sinonimos: ["documentos legales", "legal documents", "preparacion de documentos", "paralegal", "formularios uscis", "uscis"] },
  { id: "clio", nombre: "Clio", grupo: "Legal", sinonimos: ["clio", "mycase"] },
  { id: "quickbooks", nombre: "QuickBooks", grupo: "Finanzas", sinonimos: ["quickbooks", "qbo"] },
  { id: "bookkeeping", nombre: "Bookkeeping", grupo: "Finanzas", sinonimos: ["bookkeeping", "contabilidad", "conciliaciones", "cuentas por pagar", "cuentas por cobrar", "facturacion"] },
  { id: "ia", nombre: "Herramientas de IA", grupo: "Herramientas", sinonimos: ["herramientas de ia", "inteligencia artificial", "chatgpt", "ai tools", "prompts", "automatizaciones con ia"] },
  { id: "reclutamiento", nombre: "Reclutamiento", grupo: "Administracion", sinonimos: ["reclutamiento", "recruiting", "seleccion de personal", "talent acquisition", "recursos humanos"] },
];

export const SKILL_POR_ID: Record<string, Skill> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

export function nombreSkill(id: string): string {
  return SKILL_POR_ID[id]?.nombre ?? id;
}

export const NIVELES_INGLES: { id: NivelIngles; nombre: string }[] = [
  { id: "A2", nombre: "A2 básico" },
  { id: "B1", nombre: "B1 intermedio" },
  { id: "B2", nombre: "B2 intermedio alto" },
  { id: "C1", nombre: "C1 avanzado" },
  { id: "C2", nombre: "C2 nativo" },
];

export function rangoIngles(n: NivelIngles): number {
  return NIVELES_INGLES.findIndex((x) => x.id === n);
}

export const ETAPAS: { id: Etapa; nombre: string; color: string }[] = [
  { id: "nuevo", nombre: "Nuevo", color: "#5a6a82" },
  { id: "filtrado", nombre: "Filtrado", color: "#1f7a93" },
  { id: "entrevista", nombre: "Entrevista", color: "#2a5d8f" },
  { id: "prueba", nombre: "Prueba", color: "#6d4bb8" },
  { id: "oferta", nombre: "Oferta", color: "#a86400" },
  { id: "contratado", nombre: "Contratado", color: "#157347" },
  { id: "descartado", nombre: "Descartado", color: "#8a3b3b" },
];

/** Las etapas del embudo, en orden, sin el descarte. */
export const ETAPAS_EMBUDO: Etapa[] = ["nuevo", "filtrado", "entrevista", "prueba", "oferta", "contratado"];

export function nombreEtapa(e: Etapa): string {
  return ETAPAS.find((x) => x.id === e)?.nombre ?? e;
}

export const FUENTES: { id: Fuente; nombre: string }[] = [
  { id: "carreras", nombre: "Página de carreras" },
  { id: "referido", nombre: "Referido" },
  { id: "linkedin", nombre: "LinkedIn" },
  { id: "whatsapp", nombre: "WhatsApp" },
  { id: "instagram", nombre: "Instagram" },
  { id: "facebook", nombre: "Facebook" },
  { id: "feria", nombre: "Feria de empleo" },
];

export function nombreFuente(f: Fuente): string {
  return FUENTES.find((x) => x.id === f)?.nombre ?? f;
}

export const PAISES: { id: Pais; nombre: string; alias: string[] }[] = [
  { id: "SV", nombre: "El Salvador", alias: ["el salvador", "salvador"] },
  { id: "GT", nombre: "Guatemala", alias: ["guatemala"] },
  { id: "HN", nombre: "Honduras", alias: ["honduras"] },
  { id: "NI", nombre: "Nicaragua", alias: ["nicaragua"] },
  { id: "CR", nombre: "Costa Rica", alias: ["costa rica"] },
  { id: "PA", nombre: "Panamá", alias: ["panama"] },
  { id: "MX", nombre: "México", alias: ["mexico"] },
  { id: "CO", nombre: "Colombia", alias: ["colombia"] },
];

export function nombrePais(p: Pais): string {
  return PAISES.find((x) => x.id === p)?.nombre ?? p;
}

// Departamentos de El Salvador y los municipios que la gente escribe en vez del
// departamento ("vivo en Santa Tecla").
export const DEPARTAMENTOS_SV: { nombre: string; municipios: string[] }[] = [
  { nombre: "San Salvador", municipios: ["san salvador", "soyapango", "mejicanos", "apopa", "ilopango", "san marcos", "ayutuxtepeque", "cuscatancingo", "ciudad delgado", "santo tomas", "panchimalco", "tonacatepeque", "guazapa", "nejapa", "aguilares", "rosario de mora", "san martin"] },
  { nombre: "La Libertad", municipios: ["santa tecla", "antiguo cuscatlan", "la libertad", "colon", "zaragoza", "quezaltepeque", "san juan opico", "ciudad arce", "nuevo cuscatlan", "comasagua", "lourdes"] },
  { nombre: "Santa Ana", municipios: ["santa ana", "metapan", "chalchuapa", "coatepeque", "el congo"] },
  { nombre: "San Miguel", municipios: ["san miguel", "chinameca", "ciudad barrios", "moncagua"] },
  { nombre: "Sonsonate", municipios: ["sonsonate", "izalco", "acajutla", "nahuizalco", "juayua"] },
  { nombre: "Usulután", municipios: ["usulutan", "jiquilisco", "santiago de maria", "berlin"] },
  { nombre: "La Paz", municipios: ["zacatecoluca", "olocuilta", "san luis talpa", "san pedro masahuat"] },
  { nombre: "Cuscatlán", municipios: ["cojutepeque", "suchitoto", "san pedro perulapan"] },
  { nombre: "Ahuachapán", municipios: ["ahuachapan", "atiquizaya", "apaneca", "concepcion de ataco"] },
  { nombre: "Chalatenango", municipios: ["chalatenango", "la palma", "nueva concepcion"] },
  { nombre: "La Unión", municipios: ["la union", "santa rosa de lima", "conchagua"] },
  { nombre: "San Vicente", municipios: ["san vicente", "tecoluca", "apastepeque"] },
  { nombre: "Morazán", municipios: ["san francisco gotera", "perquin"] },
  { nombre: "Cabañas", municipios: ["sensuntepeque", "ilobasco"] },
];

/** Departamentos que se consideran "cerca" para una oficina (el Gran San Salvador). */
export const VECINOS: Record<string, string[]> = {
  "San Salvador": ["La Libertad", "Cuscatlán", "La Paz"],
  "La Libertad": ["San Salvador", "Sonsonate"],
  "Santa Ana": ["Ahuachapán", "Sonsonate"],
  "San Miguel": ["Usulután", "La Unión", "Morazán"],
};

export const JORNADAS: { id: Jornada; nombre: string }[] = [
  { id: "completo", nombre: "Tiempo completo" },
  { id: "medio", nombre: "Medio tiempo" },
];

export const HORARIOS: { id: Horario; nombre: string }[] = [
  { id: "este", nombre: "Hora del Este (EST)" },
  { id: "central", nombre: "Hora Central (CST)" },
  { id: "pacifico", nombre: "Hora del Pacífico (PST)" },
];

export const MODALIDADES: { id: Modalidad; nombre: string }[] = [
  { id: "remoto", nombre: "Remoto" },
  { id: "hibrido", nombre: "Híbrido" },
  { id: "presencial", nombre: "Presencial" },
];

export const DISPONIBILIDADES: { id: Disponibilidad; nombre: string }[] = [
  { id: "inmediata", nombre: "Inmediata" },
  { id: "2_semanas", nombre: "En 2 semanas" },
  { id: "1_mes", nombre: "En 1 mes" },
];

export const DISC: { id: Disc; nombre: string }[] = [
  { id: "D", nombre: "Dominante" },
  { id: "I", nombre: "Influyente" },
  { id: "S", nombre: "Estable" },
  { id: "C", nombre: "Concienzudo" },
];

export const TIPOS_ENTREVISTA: { id: TipoEntrevista; nombre: string; duracion: number }[] = [
  { id: "screening", nombre: "Screening bilingüe", duracion: 20 },
  { id: "tecnica", nombre: "Prueba técnica", duracion: 45 },
  { id: "disc", nombre: "Revisión DISC", duracion: 30 },
  { id: "cliente", nombre: "Entrevista con el cliente", duracion: 30 },
];

export function nombreTipoEntrevista(t: TipoEntrevista): string {
  return TIPOS_ENTREVISTA.find((x) => x.id === t)?.nombre ?? t;
}

export const CRITERIOS: { id: CriterioId; nombre: string }[] = [
  { id: "ingles", nombre: "Inglés hablado" },
  { id: "comunicacion", nombre: "Comunicación" },
  { id: "proactividad", nombre: "Proactividad" },
  { id: "tecnico", nombre: "Dominio técnico" },
  { id: "cultura", nombre: "Encaje cultural" },
];

export const RECOMENDACIONES: { id: Recomendacion; nombre: string }[] = [
  { id: "avanzar", nombre: "Avanzar" },
  { id: "dudoso", nombre: "Con dudas" },
  { id: "no_avanzar", nombre: "No avanzar" },
];

/** Lo que se le pide a toda persona que entra. Es la lista del onboarding. */
export const TAREAS_ONBOARDING: string[] = [
  "Contrato firmado",
  "DUI y constancia de cuenta bancaria",
  "Correo corporativo creado",
  "Accesos a las herramientas del cliente",
  "Capacitación BetMe (2 días)",
  "Reunión de arranque con el cliente",
  "Revisión de los 30 días",
];

export const MOTIVOS_DESCARTE: string[] = [
  "Inglés por debajo de lo requerido",
  "Pretensión salarial fuera de rango",
  "Sin experiencia en las herramientas",
  "No se presentó a la entrevista",
  "Aceptó otra oferta",
  "El cliente eligió a otra persona",
];

/** Minusculas y sin acentos, para comparar texto libre. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
