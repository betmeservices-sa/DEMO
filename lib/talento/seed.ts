// Banco de talento, vacantes y pipeline de demostracion de BetMe.
//
// Todas las fechas son RELATIVAS al dia en que se siembra (hora de El
// Salvador): la entrevista de manana tiene que ser de manana el dia que se
// ensena el demo. Los nombres, telefonos y correos son inventados.
//
// Los clientes de EE. UU. van descritos por rubro y ciudad, sin nombre: asi es
// como BetMe los presenta a los candidatos antes de la entrevista final.

import { TAREAS_ONBOARDING } from "./catalogo";
import { diaSv, isoDesdeSv, sumarDias } from "./fechas";
import type {
  Candidato,
  CriterioId,
  Disc,
  Disponibilidad,
  Entrevista,
  EstadoTalento,
  Etapa,
  Experiencia,
  Fuente,
  Horario,
  Jornada,
  NivelIngles,
  Onboarding,
  Pais,
  Postulacion,
  Recomendacion,
  Vacante,
} from "./tipos";

export const VERSION_TALENTO = 2;

// El equipo de talento de BetMe (ids del staff del tenant).
export const EQUIPO = {
  daniela: "s2", // reclutadora senior
  josue: "s3", // reclutador
  karla: "s4", // evaluacion DISC
  andres: "s5", // cuentas de clientes en EE. UU.
  paola: "s6", // onboarding
} as const;

interface FilaCandidato {
  id: string;
  nombre: string;
  tel: string;
  pais: Pais;
  dep?: string;
  mun?: string;
  titular: string;
  anios: number;
  skills: string[];
  ingles: NivelIngles;
  pretension: number;
  jornada: Jornada;
  horarios: Horario[];
  disp: Disponibilidad;
  disc?: [Disc, Disc?];
  fuente: Fuente;
  referido?: string;
  /** Mando su grabacion de 60 s (link de Vocaroo). */
  grabacion: boolean;
  hace: number;
  /** Entro hace pocas horas: gana sobre `hace`, para que el demo tenga "nuevos". */
  horas?: number;
  educacion: string;
  exp: Experiencia[];
  resumen: string;
  otros?: string[];
}

const FILAS: FilaCandidato[] = [
  {
    id: "c01", nombre: "Gabriela Martínez", tel: "+503 7410 2201", pais: "SV", dep: "La Libertad", mun: "Santa Tecla",
    titular: "Executive Virtual Assistant", anios: 5,
    skills: ["agenda", "correo", "workspace", "redaccion_en", "crm_ghl", "canva", "office"], ingles: "C1", pretension: 1050,
    jornada: "completo", horarios: ["este", "central"], disp: "2_semanas", disc: ["S", "C"], fuente: "carreras", grabacion: true, hace: 14,
    educacion: "Licenciatura en Administración de Empresas, UCA",
    exp: [
      { puesto: "Executive Assistant (remoto)", empresa: "Agencia inmobiliaria en Florida", desde: "2022-02", descripcion: "Agenda y correo del broker principal, seguimiento de leads en GoHighLevel." },
      { puesto: "Asistente de gerencia", empresa: "Distribuidora en San Salvador", desde: "2020-01", hasta: "2022-01" },
    ],
    resumen: "Cinco años sosteniendo la agenda de dueños de negocio. Ordena el inbox, prepara las reuniones y no deja un lead sin seguimiento.",
  },
  {
    id: "c02", nombre: "Fernanda López", tel: "+503 7410 2202", pais: "SV", dep: "San Salvador", mun: "San Salvador",
    titular: "Asistente ejecutiva bilingüe", anios: 4,
    skills: ["agenda", "correo", "workspace", "redaccion_en", "crm_ghl", "ia", "clickup"], ingles: "C2", pretension: 1100,
    jornada: "completo", horarios: ["este"], disp: "inmediata", disc: ["C", "S"], fuente: "referido", referido: "Mónica Castillo", grabacion: true, hace: 13,
    educacion: "Licenciatura en Idioma Inglés, UES",
    exp: [
      { puesto: "Virtual Assistant", empresa: "Coach de negocios en Texas", desde: "2023-03", descripcion: "Calendario, correo y automatizaciones de seguimiento." },
      { puesto: "Agente bilingüe", empresa: "Contact center bilingüe", desde: "2021-01", hasta: "2023-02" },
    ],
    resumen: "Vivió seis años en Virginia. Escribe en inglés como nativa y usa herramientas de IA para redactar y resumir.",
  },
  {
    id: "c03", nombre: "Rodrigo Alvarado", tel: "+503 7410 2203", pais: "SV", dep: "San Salvador", mun: "Soyapango",
    titular: "Virtual Assistant", anios: 3,
    skills: ["agenda", "correo", "workspace", "atencion_cliente", "entrada_datos"], ingles: "C1", pretension: 900,
    jornada: "completo", horarios: ["este", "central"], disp: "inmediata", disc: ["S"], fuente: "linkedin", grabacion: true, hace: 9,
    educacion: "Técnico en Administración, ITCA",
    exp: [
      { puesto: "Virtual Assistant", empresa: "Clínica de fisioterapia en Georgia", desde: "2023-06" },
      { puesto: "Agente de servicio al cliente", empresa: "Contact center bilingüe", desde: "2022-01", hasta: "2023-05" },
    ],
    resumen: "Ordenado y constante. Maneja agenda de pacientes y confirmaciones por correo y teléfono.",
  },
  {
    id: "c04", nombre: "Alejandra Cruz", tel: "+503 7410 2204", pais: "SV", dep: "Santa Ana", mun: "Santa Ana",
    titular: "Asistente administrativa", anios: 2,
    skills: ["agenda", "correo", "office", "entrada_datos", "canva"], ingles: "B2", pretension: 800,
    jornada: "completo", horarios: ["central"], disp: "inmediata", disc: ["S", "I"], fuente: "instagram", grabacion: false, hace: 3,
    educacion: "Licenciatura en Mercadeo, Universidad Católica de El Salvador",
    exp: [{ puesto: "Asistente administrativa", empresa: "Despacho contable en Santa Ana", desde: "2024-01" }],
    resumen: "Busca su primer rol remoto con un cliente de Estados Unidos.",
  },
  {
    id: "c05", nombre: "Kevin Aguilar", tel: "+503 7410 2205", pais: "SV", dep: "San Miguel", mun: "San Miguel",
    titular: "Asistente virtual", anios: 1,
    skills: ["correo", "entrada_datos", "atencion_cliente"], ingles: "B1", pretension: 700,
    jornada: "completo", horarios: ["central", "este"], disp: "inmediata", fuente: "facebook", grabacion: false, hace: 11,
    educacion: "Bachillerato técnico en Comercio",
    exp: [{ puesto: "Auxiliar de ventas", empresa: "Almacén de electrodomésticos", desde: "2024-03" }],
    resumen: "Atento y rápido. Está mejorando su inglés con un curso nocturno.",
  },
  {
    id: "c06", nombre: "Sofía Ramírez", tel: "+503 7410 2206", pais: "SV", dep: "La Libertad", mun: "Antiguo Cuscatlán",
    titular: "Executive Assistant", anios: 6,
    skills: ["agenda", "correo", "workspace", "redaccion_en", "crm_ghl", "crm_hubspot", "ia", "canva"], ingles: "C1", pretension: 1150,
    jornada: "completo", horarios: ["este"], disp: "1_mes", disc: ["C", "D"], fuente: "linkedin", grabacion: true, hace: 13,
    educacion: "Licenciatura en Ciencias Jurídicas, ESEN",
    exp: [
      { puesto: "Executive Assistant", empresa: "Firma de inversiones en Nueva York", desde: "2021-09", descripcion: "Agenda de dos socios, viajes y preparación de juntas." },
      { puesto: "Asistente de dirección", empresa: "Banco local", desde: "2019-01", hasta: "2021-08" },
    ],
    resumen: "Discreta y muy estructurada. Maneja agendas de alto nivel con zonas horarias cruzadas.",
  },
  {
    id: "c07", nombre: "Mónica Castillo", tel: "+503 7410 2207", pais: "SV", dep: "San Salvador", mun: "Mejicanos",
    titular: "Legal Assistant bilingüe", anios: 4,
    skills: ["intake_legal", "documentos_legales", "atencion_cliente", "agenda", "clio", "traduccion"], ingles: "C1", pretension: 950,
    jornada: "completo", horarios: ["central", "este"], disp: "2_semanas", disc: ["S", "C"], fuente: "carreras", grabacion: true, hace: 21,
    educacion: "Licenciatura en Ciencias Jurídicas, UES",
    exp: [
      { puesto: "Legal Assistant (remoto)", empresa: "Despacho de inmigración en California", desde: "2022-05", descripcion: "Intake de clientes, formularios y seguimiento de casos en Clio." },
      { puesto: "Asistente legal", empresa: "Notaría en San Salvador", desde: "2020-02", hasta: "2022-04" },
    ],
    resumen: "Hace intake en inglés y en español, prepara expedientes y lleva la agenda de audiencias.",
  },
  {
    id: "c08", nombre: "Diego Portillo", tel: "+503 7410 2208", pais: "SV", dep: "La Libertad", mun: "Santa Tecla",
    titular: "Paralegal", anios: 3,
    skills: ["intake_legal", "documentos_legales", "atencion_cliente", "agenda", "office"], ingles: "C1", pretension: 1000,
    jornada: "completo", horarios: ["central"], disp: "inmediata", disc: ["C"], fuente: "linkedin", grabacion: true, hace: 16,
    educacion: "Licenciatura en Ciencias Jurídicas, UJMD",
    exp: [{ puesto: "Paralegal", empresa: "Firma de lesiones personales en Texas", desde: "2023-01" }],
    resumen: "Conoce el proceso de intake de lesiones personales y la preparación de demandas.",
  },
  {
    id: "c09", nombre: "Carolina Menjívar", tel: "+503 7410 2209", pais: "SV", dep: "San Salvador", mun: "San Salvador",
    titular: "Legal Assistant", anios: 2,
    skills: ["intake_legal", "documentos_legales", "atencion_cliente", "agenda", "clio"], ingles: "C1", pretension: 900,
    jornada: "completo", horarios: ["central", "este"], disp: "2_semanas", disc: ["S"], fuente: "whatsapp", grabacion: true, hace: 17,
    educacion: "Licenciatura en Ciencias Jurídicas, UCA",
    exp: [{ puesto: "Asistente legal bilingüe", empresa: "Despacho de inmigración en Houston", desde: "2024-02" }],
    resumen: "Formularios de inmigración, citas con clientes y traducción de documentos personales.",
  },
  {
    id: "c10", nombre: "Luis Bonilla", tel: "+503 7410 2210", pais: "SV", dep: "Sonsonate", mun: "Sonsonate",
    titular: "Asistente legal", anios: 2,
    skills: ["documentos_legales", "atencion_cliente", "office", "traduccion"], ingles: "B2", pretension: 850,
    jornada: "completo", horarios: ["central"], disp: "inmediata", disc: ["C", "S"], fuente: "carreras", grabacion: true, hace: 12,
    educacion: "Licenciatura en Ciencias Jurídicas, Universidad Francisco Gavidia",
    exp: [{ puesto: "Asistente de notario", empresa: "Notaría en Sonsonate", desde: "2023-08" }],
    resumen: "Redacta escrituras y traduce documentos. Busca dar el salto a un despacho de EE. UU.",
  },
  {
    id: "c11", nombre: "Tatiana Orellana", tel: "+503 7410 2211", pais: "SV", dep: "Cuscatlán", mun: "Cojutepeque",
    titular: "Recepcionista bilingüe", anios: 2,
    skills: ["atencion_cliente", "agenda", "intake_legal"], ingles: "B2", pretension: 800,
    jornada: "completo", horarios: ["central"], disp: "inmediata", fuente: "facebook", grabacion: false, hace: 19,
    educacion: "Técnico en Idiomas, UDB",
    exp: [{ puesto: "Recepcionista bilingüe", empresa: "Clínica dental en San Salvador", desde: "2023-04" }],
    resumen: "Atención al público en dos idiomas y agenda de pacientes.",
  },
  {
    id: "c12", nombre: "Ricardo Velásquez", tel: "+502 5510 3312", pais: "GT",
    titular: "Legal Intake Specialist", anios: 3,
    skills: ["intake_legal", "atencion_cliente", "agenda", "clio", "crm_salesforce"], ingles: "C1", pretension: 1000,
    jornada: "completo", horarios: ["central", "pacifico"], disp: "2_semanas", disc: ["I", "S"], fuente: "linkedin", grabacion: true, hace: 2,
    educacion: "Licenciatura en Derecho, Universidad Rafael Landívar",
    exp: [{ puesto: "Intake Specialist", empresa: "Firma de abogados en Arizona", desde: "2022-10" }],
    resumen: "Toma de casos en frío y calificación de prospectos para firmas de abogados.",
  },
  {
    id: "c13", nombre: "Valeria Henríquez", tel: "+503 7410 2213", pais: "SV", dep: "La Libertad", mun: "Santa Tecla",
    titular: "Community Manager bilingüe", anios: 3,
    skills: ["redes", "canva", "email_marketing", "crm_ghl", "atencion_cliente", "ia"], ingles: "B2", pretension: 850,
    jornada: "completo", horarios: ["central", "este"], disp: "inmediata", disc: ["I", "D"], fuente: "instagram", grabacion: true, hace: 7,
    educacion: "Licenciatura en Comunicaciones, UFG",
    exp: [
      { puesto: "Marketing Assistant (remoto)", empresa: "Spa médico en Texas", desde: "2023-05", descripcion: "Contenido, campañas de correo y respuestas en GoHighLevel." },
      { puesto: "Community manager", empresa: "Agencia de marketing digital", desde: "2022-01", hasta: "2023-04" },
    ],
    resumen: "Arma el calendario de contenido, diseña en Canva y deja las campañas de correo corriendo.",
  },
  {
    id: "c14", nombre: "Andrea Molina", tel: "+503 7410 2214", pais: "SV", dep: "San Salvador", mun: "Ilopango",
    titular: "Marketing & Ops Assistant", anios: 2,
    skills: ["redes", "canva", "email_marketing", "workspace", "atencion_cliente"], ingles: "B2", pretension: 800,
    jornada: "completo", horarios: ["central"], disp: "2_semanas", disc: ["I"], fuente: "carreras", grabacion: true, hace: 6,
    educacion: "Licenciatura en Mercadeo, UTEC",
    exp: [{ puesto: "Asistente de mercadeo", empresa: "Cadena de restaurantes local", desde: "2024-01" }],
    resumen: "Redes, correo y un poco de todo en operaciones.",
  },
  {
    id: "c15", nombre: "José Miranda", tel: "+503 7410 2215", pais: "SV", dep: "Usulután", mun: "Usulután",
    titular: "Diseñador y community manager", anios: 2,
    skills: ["redes", "canva", "atencion_cliente"], ingles: "B1", pretension: 700,
    jornada: "medio", horarios: ["central"], disp: "inmediata", fuente: "facebook", grabacion: false, hace: 4,
    educacion: "Técnico en Diseño Gráfico",
    exp: [{ puesto: "Freelance", empresa: "Negocios locales", desde: "2023-01" }],
    resumen: "Diseño de piezas y manejo de páginas de negocios pequeños.",
  },
  {
    id: "c16", nombre: "Paola Escobar", tel: "+503 7410 2216", pais: "SV", dep: "San Salvador", mun: "San Salvador",
    titular: "Customer Success bilingüe", anios: 4,
    skills: ["atencion_cliente", "crm_ghl", "email_marketing", "workspace", "setter"], ingles: "C1", pretension: 950,
    jornada: "completo", horarios: ["central", "este"], disp: "1_mes", disc: ["I", "S"], fuente: "referido", referido: "Brenda Flores", grabacion: true, hace: 3,
    educacion: "Licenciatura en Administración de Empresas, UEES",
    exp: [{ puesto: "Customer Success", empresa: "Software de gimnasios en Florida", desde: "2022-03" }],
    resumen: "Onboarding de clientes y campañas de reactivación por correo.",
  },
  {
    id: "c17", nombre: "Ernesto Rivas", tel: "+503 7410 2217", pais: "SV", dep: "San Salvador", mun: "San Salvador",
    titular: "Project Coordinator", anios: 4,
    skills: ["proyectos", "clickup", "excel", "workspace", "redaccion_en"], ingles: "C1", pretension: 1200,
    jornada: "completo", horarios: ["este"], disp: "2_semanas", disc: ["C", "D"], fuente: "linkedin", grabacion: true, hace: 5,
    educacion: "Ingeniería Industrial, UCA",
    exp: [{ puesto: "Project Coordinator", empresa: "Constructora en San Salvador", desde: "2021-04", descripcion: "Cronogramas, compras y reportes semanales al cliente." }],
    resumen: "Lleva proyectos de construcción con cronograma y presupuesto a la vista.",
  },
  {
    id: "c18", nombre: "Natalia Figueroa", tel: "+503 7410 2218", pais: "SV", dep: "Santa Ana", mun: "Santa Ana",
    titular: "Coordinadora de operaciones", anios: 3,
    skills: ["proyectos", "clickup", "workspace", "atencion_cliente"], ingles: "B2", pretension: 1000,
    jornada: "completo", horarios: ["este", "central"], disp: "inmediata", disc: ["S", "C"], fuente: "carreras", grabacion: true, hace: 4,
    educacion: "Licenciatura en Administración de Empresas, Universidad Católica de El Salvador",
    exp: [{ puesto: "Coordinadora de operaciones", empresa: "Empresa de logística", desde: "2022-06" }],
    resumen: "Coordina equipos y proveedores con tableros de tareas.",
  },
  {
    id: "c19", nombre: "Marco Pineda", tel: "+503 7410 2219", pais: "SV", dep: "La Libertad", mun: "Antiguo Cuscatlán",
    titular: "Analista de datos", anios: 3,
    skills: ["excel", "power_bi", "analisis", "sql"], ingles: "B2", pretension: 1400,
    jornada: "completo", horarios: ["este"], disp: "1_mes", disc: ["C"], fuente: "linkedin", grabacion: false, hace: 3,
    educacion: "Licenciatura en Economía, ESEN",
    exp: [{ puesto: "Analista de datos", empresa: "Cadena de supermercados", desde: "2022-01" }],
    resumen: "Tableros de ventas en Power BI y consultas SQL para el área comercial.",
  },
  {
    id: "c20", nombre: "Daniela Quintanilla", tel: "+503 7410 2220", pais: "SV", dep: "San Salvador", mun: "San Salvador",
    titular: "Reclutadora bilingüe", anios: 3,
    skills: ["reclutamiento", "atencion_cliente", "workspace", "redaccion_en", "ia"], ingles: "C1", pretension: 850,
    jornada: "completo", horarios: ["central", "este"], disp: "2_semanas", disc: ["I", "S"], fuente: "referido", referido: "Karla Mejía", grabacion: true, hace: 14,
    educacion: "Licenciatura en Psicología, UCA",
    exp: [{ puesto: "Reclutadora", empresa: "Contact center bilingüe", desde: "2022-02", descripcion: "Selección masiva de agentes bilingües." }],
    resumen: "Filtra por nivel de inglés en cinco minutos de llamada y cierra rápido con quien sirve.",
  },
  {
    id: "c21", nombre: "Wendy Serrano", tel: "+503 7410 2221", pais: "SV", dep: "La Libertad", mun: "Colón",
    titular: "Talent Acquisition", anios: 2,
    skills: ["reclutamiento", "atencion_cliente", "office", "crm_ghl"], ingles: "B2", pretension: 800,
    jornada: "completo", horarios: ["central"], disp: "inmediata", disc: ["S"], fuente: "carreras", grabacion: true, hace: 12,
    educacion: "Licenciatura en Psicología, UFG",
    exp: [{ puesto: "Auxiliar de recursos humanos", empresa: "Maquila textil", desde: "2023-02" }],
    resumen: "Entrevistas, pruebas y expedientes de ingreso.",
  },
  {
    id: "c22", nombre: "Óscar Lemus", tel: "+503 7410 2222", pais: "SV", dep: "San Miguel", mun: "San Miguel",
    titular: "HR Generalist", anios: 5,
    skills: ["reclutamiento", "office", "atencion_cliente", "excel"], ingles: "B2", pretension: 1200,
    jornada: "completo", horarios: ["central"], disp: "1_mes", disc: ["D"], fuente: "linkedin", grabacion: false, hace: 13,
    educacion: "Licenciatura en Administración de Empresas, Universidad Gerardo Barrios",
    exp: [{ puesto: "Jefe de recursos humanos", empresa: "Distribuidora regional", desde: "2020-01" }],
    resumen: "Cinco años al frente de recursos humanos de una empresa de 200 personas.",
  },
  {
    id: "c23", nombre: "Silvia Recinos", tel: "+503 7410 2223", pais: "SV", dep: "San Salvador", mun: "San Salvador",
    titular: "Bookkeeper", anios: 4,
    skills: ["quickbooks", "bookkeeping", "excel", "correo"], ingles: "C1", pretension: 1000,
    jornada: "completo", horarios: ["este"], disp: "2_semanas", disc: ["C"], fuente: "carreras", grabacion: true, hace: 46,
    educacion: "Licenciatura en Contaduría Pública, UES",
    exp: [{ puesto: "Auxiliar contable", empresa: "Despacho contable en San Salvador", desde: "2021-01" }],
    resumen: "Conciliaciones, cuentas por pagar y cierres mensuales en QuickBooks.",
  },
  {
    id: "c24", nombre: "Julio Ayala", tel: "+503 7410 2224", pais: "SV", dep: "La Paz", mun: "Zacatecoluca",
    titular: "Asistente contable", anios: 2,
    skills: ["quickbooks", "bookkeeping", "excel"], ingles: "B2", pretension: 850,
    jornada: "completo", horarios: ["este", "central"], disp: "inmediata", disc: ["S"], fuente: "facebook", grabacion: true, hace: 44,
    educacion: "Licenciatura en Contaduría Pública, UNIVO",
    exp: [{ puesto: "Asistente contable", empresa: "Cooperativa de ahorro", desde: "2023-01" }],
    resumen: "Registro contable y conciliaciones bancarias.",
  },
  {
    id: "c25", nombre: "Irene Campos", tel: "+503 7410 2225", pais: "SV", dep: "San Salvador", mun: "Apopa",
    titular: "Auxiliar de contabilidad", anios: 1,
    skills: ["bookkeeping", "excel", "entrada_datos"], ingles: "B1", pretension: 700,
    jornada: "completo", horarios: ["central"], disp: "inmediata", fuente: "feria", grabacion: false, hace: 43,
    educacion: "Técnico en Contaduría",
    exp: [{ puesto: "Auxiliar contable", empresa: "Ferretería", desde: "2024-05" }],
    resumen: "Facturación y registro de gastos.",
  },
  {
    id: "c26", nombre: "Brenda Flores", tel: "+503 7410 2226", pais: "SV", dep: "San Salvador", mun: "San Salvador",
    titular: "Appointment Setter", anios: 3,
    skills: ["setter", "llamadas_frio", "crm_ghl", "atencion_cliente", "ventas"], ingles: "C1", pretension: 900,
    jornada: "completo", horarios: ["pacifico", "central"], disp: "inmediata", disc: ["I", "D"], fuente: "carreras", grabacion: true, hace: 60,
    educacion: "Licenciatura en Mercadeo, UEES",
    exp: [{ puesto: "Appointment Setter", empresa: "Agencia solar en California", desde: "2022-08" }],
    resumen: "Agenda citas de venta en frío con una tasa de show arriba del promedio.",
  },
  {
    id: "c27", nombre: "Héctor Galdámez", tel: "+503 7410 2227", pais: "SV", dep: "La Libertad", mun: "Santa Tecla",
    titular: "Sales Development Rep", anios: 2,
    skills: ["setter", "llamadas_frio", "crm_hubspot", "ventas"], ingles: "C1", pretension: 850,
    jornada: "completo", horarios: ["pacifico"], disp: "inmediata", disc: ["D", "I"], fuente: "linkedin", grabacion: true, hace: 59,
    educacion: "Licenciatura en Administración de Empresas, UJMD",
    exp: [{ puesto: "SDR", empresa: "Software para restaurantes", desde: "2023-06" }],
    resumen: "Prospección telefónica y calificación de leads.",
  },
  {
    id: "c28", nombre: "Jennifer Ruiz", tel: "+503 7410 2228", pais: "SV", dep: "Sonsonate", mun: "Izalco",
    titular: "Setter bilingüe", anios: 2,
    skills: ["setter", "llamadas_frio", "atencion_cliente"], ingles: "C1", pretension: 850,
    jornada: "completo", horarios: ["pacifico", "central"], disp: "inmediata", disc: ["I"], fuente: "instagram", grabacion: true, hace: 58,
    educacion: "Técnico en Idiomas, UDB",
    exp: [{ puesto: "Agente bilingüe de ventas", empresa: "Contact center bilingüe", desde: "2023-01" }],
    resumen: "Ventas por teléfono en inglés.",
  },
  {
    id: "c29", nombre: "Rebeca Arévalo", tel: "+503 7410 2229", pais: "SV", dep: "San Salvador", mun: "San Salvador",
    titular: "Business Analyst", anios: 5,
    skills: ["excel", "power_bi", "sql", "analisis", "quickbooks", "redaccion_en"], ingles: "C1", pretension: 1450,
    jornada: "completo", horarios: ["este", "central"], disp: "2_semanas", disc: ["C", "D"], fuente: "linkedin", grabacion: true, hace: 8,
    educacion: "Maestría en Finanzas, ESEN",
    exp: [
      { puesto: "Business Analyst (remoto)", empresa: "Franquicia de comida rápida en Florida", desde: "2022-07", descripcion: "Costos por tienda, tableros semanales y análisis de menú." },
      { puesto: "Analista financiera", empresa: "Grupo empresarial local", desde: "2020-01", hasta: "2022-06" },
    ],
    resumen: "Convierte las ventas por tienda en decisiones: qué cerrar, qué empujar y dónde se va el margen.",
  },
  {
    id: "c30", nombre: "Samuel Chicas", tel: "+503 7410 2230", pais: "SV", dep: "La Libertad", mun: "Antiguo Cuscatlán",
    titular: "Project Manager", anios: 6,
    skills: ["proyectos", "clickup", "excel", "workspace", "redaccion_en", "crm_hubspot"], ingles: "C1", pretension: 1250,
    jornada: "completo", horarios: ["este"], disp: "1_mes", disc: ["D", "C"], fuente: "referido", referido: "Ernesto Rivas", grabacion: true, hace: 10,
    educacion: "Ingeniería Civil, UCA",
    exp: [{ puesto: "Project Manager", empresa: "Desarrolladora residencial", desde: "2019-03", descripcion: "Tres proyectos habitacionales en paralelo." }],
    resumen: "Seis años llevando obra y clientes. Reporta en inglés sin traductor.",
  },
  {
    id: "c31", nombre: "Lucía Zelaya", tel: "+503 7410 2231", pais: "SV", dep: "San Salvador", mun: "San Salvador",
    titular: "Executive Virtual Assistant", anios: 7,
    skills: ["agenda", "correo", "workspace", "redaccion_en", "crm_ghl", "ia", "canva", "clickup"], ingles: "C2", pretension: 1100,
    jornada: "completo", horarios: ["este", "central"], disp: "2_semanas", disc: ["S", "C"], fuente: "carreras", grabacion: true, hace: 1,
    educacion: "Licenciatura en Relaciones Internacionales, UCA",
    exp: [
      { puesto: "Executive Virtual Assistant", empresa: "Consultora de bienes raíces en Miami", desde: "2021-01", descripcion: "Agenda, inbox, viajes y seguimiento de cierres." },
      { puesto: "Asistente de embajada", empresa: "Sector diplomático", desde: "2018-02", hasta: "2020-12" },
    ],
    resumen: "Siete años de asistencia ejecutiva, cuatro con clientes de bienes raíces en Florida.",
  },
  {
    id: "c32", nombre: "Mauricio Navas", tel: "+504 9510 4432", pais: "HN",
    titular: "Virtual Assistant", anios: 3,
    skills: ["agenda", "correo", "workspace", "atencion_cliente", "canva"], ingles: "C1", pretension: 900,
    jornada: "completo", horarios: ["central", "este"], disp: "inmediata", disc: ["S"], fuente: "instagram", grabacion: true, hace: 5,
    educacion: "Licenciatura en Lenguas Extranjeras, UNAH",
    exp: [{ puesto: "Virtual Assistant", empresa: "Agencia de viajes en Texas", desde: "2023-02" }],
    resumen: "Desde San Pedro Sula. Agenda, reservas y correo de clientes.",
  },
  {
    id: "c33", nombre: "Ana Belén Durán", tel: "+506 8810 5533", pais: "CR",
    titular: "Operations Coordinator", anios: 4,
    skills: ["proyectos", "clickup", "workspace", "atencion_cliente", "redaccion_en"], ingles: "C1", pretension: 1300,
    jornada: "completo", horarios: ["central", "pacifico"], disp: "1_mes", disc: ["C", "S"], fuente: "linkedin", grabacion: true, hace: 0, horas: 4,
    educacion: "Administración de Negocios, Universidad de Costa Rica",
    exp: [{ puesto: "Operations Coordinator", empresa: "Empresa de software en Colorado", desde: "2022-01" }],
    resumen: "Procesos, tableros y comunicación con equipos en tres zonas horarias.",
  },
  {
    id: "c34", nombre: "Kathya Guevara", tel: "+503 7410 2234", pais: "SV", dep: "San Salvador", mun: "San Salvador",
    titular: "Social Media & Email Marketing", anios: 4,
    skills: ["redes", "canva", "email_marketing", "crm_ghl", "ia", "workspace", "atencion_cliente"], ingles: "C1", pretension: 900,
    jornada: "completo", horarios: ["central", "este"], disp: "2_semanas", disc: ["I", "S"], fuente: "carreras", grabacion: true, hace: 0, horas: 18,
    educacion: "Licenciatura en Comunicaciones, UCA",
    exp: [{ puesto: "Marketing Coordinator (remoto)", empresa: "Consultorio de ortodoncia en Texas", desde: "2022-09", descripcion: "Contenido, campañas en GoHighLevel y respuesta a pacientes." }],
    resumen: "Ya trabajó con una clínica dental de Texas: sabe qué contenido llena la agenda.",
  },
  {
    id: "c35", nombre: "Francisco Mejía", tel: "+503 7410 2235", pais: "SV", dep: "San Salvador", mun: "San Salvador",
    titular: "Paralegal de inmigración", anios: 5,
    skills: ["intake_legal", "documentos_legales", "clio", "traduccion", "atencion_cliente", "agenda"], ingles: "C2", pretension: 1050,
    jornada: "completo", horarios: ["central", "este"], disp: "1_mes", disc: ["C", "S"], fuente: "referido", referido: "Mónica Castillo", grabacion: true, hace: 4,
    educacion: "Licenciatura en Ciencias Jurídicas, UCA",
    exp: [{ puesto: "Paralegal", empresa: "Despacho de inmigración en Nueva Jersey", desde: "2020-06" }],
    resumen: "Cinco años armando casos de asilo y peticiones familiares.",
  },
  {
    id: "c36", nombre: "Ivonne Portillo", tel: "+503 7410 2236", pais: "SV", dep: "Santa Ana", mun: "Chalchuapa",
    titular: "Asistente administrativa y contable", anios: 3,
    skills: ["quickbooks", "bookkeeping", "excel", "correo", "agenda"], ingles: "B2", pretension: 800,
    jornada: "medio", horarios: ["este"], disp: "inmediata", disc: ["S"], fuente: "whatsapp", grabacion: false, hace: 2,
    educacion: "Licenciatura en Contaduría Pública, Universidad Católica de El Salvador",
    exp: [{ puesto: "Asistente contable", empresa: "Beneficio de café", desde: "2022-03" }],
    resumen: "Medio tiempo por las tardes. Facturación y conciliaciones.",
  },
];

// Ids de ejemplo con las dos formas del link que manda el formulario. Son de
// muestra: el reproductor carga, pero la grabacion no existe en Vocaroo.
const VOCAROO = [
  "1hQeB7vFzK2m", "12nYt6RzLx4W", "1cPa8Wq3JmVd", "1kR5sTz9HbNe", "1vG2yLp7QwXa", "1mD4fJ8sKtRc",
  "1zX6nB3qWpLe", "1aT9hM2vCyFk", "1sW7eK4rNdGb", "1fL3pZ8xVmQh", "1bJ5cY6tRnWs", "1eN8gH2kPzTd",
  "1qV4mX7wLcBa", "1rK9dF3sGyUe", "1uP2zT6bMhWn", "1wC5jQ8vNrKf", "1xH7aL4eSdPm", "1yB3tR9gFkZc",
  "1gM6wD2hQnVb", "1iS8kE5pXtLa", "1jF4rN7cWyGd", "1lZ9vB3mHsQe", "1nT2qK6dPwRf", "1oG5hX8jLbMc",
  "1pW7cS4fVkNa", "1tR3mJ9eQzHd", "1dY6bP2wKsGe", "1hL8nF5tXrBc",
];
const linkDemo = (i: number) =>
  i % 2 ? `https://voca.ro/${VOCAROO[i % VOCAROO.length]}` : `https://vocaroo.com/${VOCAROO[i % VOCAROO.length]}`;

function correoDe(nombre: string): string {
  const base = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/\s+/);
  return `${base[0]}.${base[base.length - 1]}@gmail.com`;
}

interface FilaVacante {
  id: string;
  titulo: string;
  cliente: string;
  area: string;
  descripcion: string;
  requisitos: Vacante["requisitos"];
  estado: Vacante["estado"];
  plazas: number;
  responsable: string;
  hace: number;
  cerradaHace?: number;
}

const VACANTES: FilaVacante[] = [
  {
    id: "v1", titulo: "Executive Virtual Assistant", cliente: "Broker de bienes raíces, Miami FL", area: "Ejecutiva",
    descripcion: "Dueña de la agenda, el inbox y las prioridades del broker principal. Seguimiento de leads en GoHighLevel.",
    requisitos: { skills: ["agenda", "correo", "workspace", "redaccion_en", "crm_ghl"], deseables: ["canva", "ia"], ingles: "C1", experiencia: 3, salarioMax: 1100, modalidad: "remoto", paises: ["SV", "GT", "HN"], jornada: "completo", horario: "este", disc: ["S", "C"] },
    estado: "abierta", plazas: 1, responsable: EQUIPO.daniela, hace: 12,
  },
  {
    id: "v2", titulo: "Legal Assistant bilingüe", cliente: "Despacho de inmigración, Houston TX", area: "Legal",
    descripcion: "Intake bilingüe de clientes nuevos, preparación de documentos y coordinación de citas con los abogados.",
    requisitos: { skills: ["intake_legal", "documentos_legales", "atencion_cliente", "agenda"], deseables: ["clio", "traduccion"], ingles: "C1", experiencia: 2, salarioMax: 1000, modalidad: "remoto", paises: ["SV", "GT", "HN", "NI"], jornada: "completo", horario: "central", disc: ["S", "C"] },
    estado: "abierta", plazas: 2, responsable: EQUIPO.josue, hace: 20,
  },
  {
    id: "v3", titulo: "Ops & Marketing Coordinator", cliente: "Clínica dental, Dallas TX", area: "Operaciones",
    descripcion: "Redes sociales, campañas de correo y comunicación con pacientes en inglés y español.",
    requisitos: { skills: ["redes", "canva", "email_marketing", "crm_ghl", "atencion_cliente"], deseables: ["ia", "workspace"], ingles: "B2", experiencia: 2, salarioMax: 900, modalidad: "remoto", paises: ["SV", "GT", "HN"], jornada: "completo", horario: "central", disc: ["I"] },
    estado: "abierta", plazas: 1, responsable: EQUIPO.daniela, hace: 8,
  },
  {
    id: "v4", titulo: "Project Coordinator", cliente: "Constructora residencial, Orlando FL", area: "Proyectos",
    descripcion: "Cronogramas, coordinación de subcontratistas, CRM al día y reportes semanales al dueño.",
    requisitos: { skills: ["proyectos", "clickup", "excel", "workspace", "redaccion_en"], deseables: ["crm_hubspot"], ingles: "C1", experiencia: 3, salarioMax: 1200, modalidad: "remoto", paises: ["SV", "GT", "HN", "CR"], jornada: "completo", horario: "este", disc: ["C", "D"] },
    estado: "abierta", plazas: 1, responsable: EQUIPO.josue, hace: 5,
  },
  {
    id: "v5", titulo: "Business Analyst", cliente: "Cadena de restaurantes, Atlanta GA", area: "Análisis",
    descripcion: "Tableros de ventas y costos por tienda; recomendaciones semanales al dueño.",
    requisitos: { skills: ["excel", "power_bi", "sql", "analisis"], deseables: ["quickbooks"], ingles: "B2", experiencia: 3, salarioMax: 1500, modalidad: "remoto", paises: ["SV", "GT", "HN", "CR"], jornada: "completo", horario: "este", disc: ["C", "D"] },
    estado: "abierta", plazas: 1, responsable: EQUIPO.daniela, hace: 3,
  },
  {
    id: "v6", titulo: "Reclutador(a) bilingüe", cliente: "BetMe Services (equipo interno)", area: "Talento",
    descripcion: "Screening bilingüe, coordinación de entrevistas y seguimiento a candidatos. Híbrido: dos días en la oficina de San Salvador.",
    requisitos: { skills: ["reclutamiento", "atencion_cliente", "workspace", "redaccion_en"], deseables: ["ia", "crm_ghl"], ingles: "B2", experiencia: 2, salarioMax: 850, modalidad: "hibrido", paises: ["SV"], departamento: "San Salvador", jornada: "completo", horario: "central", disc: ["I", "S"] },
    estado: "abierta", plazas: 1, responsable: EQUIPO.karla, hace: 15,
  },
  {
    id: "v7", titulo: "Bookkeeper Assistant", cliente: "Firma contable, Charlotte NC", area: "Finanzas",
    descripcion: "Conciliaciones, cuentas por pagar y cierres mensuales en QuickBooks.",
    requisitos: { skills: ["quickbooks", "bookkeeping", "excel"], deseables: ["correo"], ingles: "B2", experiencia: 2, salarioMax: 1000, modalidad: "remoto", paises: ["SV", "GT", "HN"], jornada: "completo", horario: "este", disc: ["C"] },
    estado: "cerrada", plazas: 1, responsable: EQUIPO.josue, hace: 45, cerradaHace: 12,
  },
  {
    id: "v8", titulo: "Appointment Setter", cliente: "Agencia de seguros, Phoenix AZ", area: "Ventas",
    descripcion: "Llamadas a prospectos que dejaron sus datos y agenda de citas con los agentes.",
    requisitos: { skills: ["setter", "llamadas_frio", "atencion_cliente"], deseables: ["crm_ghl"], ingles: "C1", experiencia: 1, salarioMax: 900, modalidad: "remoto", paises: ["SV", "GT", "HN"], jornada: "completo", horario: "pacifico", disc: ["I", "D"] },
    estado: "cerrada", plazas: 2, responsable: EQUIPO.daniela, hace: 60, cerradaHace: 27,
  },
];

// [id, candidato, vacante, recorrido de etapas con "hace cuantos dias", motivo]
type Paso = [Etapa, number];
const POSTULACIONES: [string, string, string, Paso[], string?][] = [
  ["p01", "c01", "v1", [["nuevo", 11], ["filtrado", 10], ["entrevista", 7]]],
  ["p02", "c02", "v1", [["nuevo", 11], ["filtrado", 9], ["entrevista", 6], ["prueba", 2]]],
  ["p03", "c03", "v1", [["nuevo", 8], ["filtrado", 6]]],
  ["p04", "c04", "v1", [["nuevo", 2]]],
  ["p05", "c05", "v1", [["nuevo", 10], ["filtrado", 9], ["descartado", 8]], "Inglés por debajo de lo requerido"],
  ["p06", "c06", "v1", [["nuevo", 12], ["filtrado", 11], ["entrevista", 8], ["prueba", 5], ["oferta", 1]]],
  ["p07", "c07", "v2", [["nuevo", 19], ["filtrado", 18], ["entrevista", 15], ["prueba", 11], ["oferta", 7], ["contratado", 3]]],
  ["p08", "c08", "v2", [["nuevo", 15], ["filtrado", 13], ["entrevista", 4]]],
  ["p09", "c09", "v2", [["nuevo", 16], ["filtrado", 15], ["entrevista", 10], ["prueba", 6]]],
  ["p10", "c10", "v2", [["nuevo", 11], ["filtrado", 7]]],
  ["p11", "c11", "v2", [["nuevo", 18], ["filtrado", 16], ["descartado", 12]], "No se presentó a la entrevista"],
  ["p12", "c12", "v2", [["nuevo", 2]]],
  ["p13", "c13", "v3", [["nuevo", 7], ["filtrado", 6], ["entrevista", 3]]],
  ["p14", "c14", "v3", [["nuevo", 6], ["filtrado", 4]]],
  ["p15", "c15", "v3", [["nuevo", 4]]],
  ["p16", "c16", "v3", [["nuevo", 3]]],
  ["p17", "c17", "v4", [["nuevo", 5], ["filtrado", 3]]],
  ["p18", "c18", "v4", [["nuevo", 4]]],
  ["p19", "c19", "v5", [["nuevo", 3]]],
  ["p20", "c20", "v6", [["nuevo", 14], ["filtrado", 13], ["entrevista", 10], ["prueba", 7], ["oferta", 2]]],
  ["p21", "c21", "v6", [["nuevo", 12], ["filtrado", 10], ["entrevista", 5]]],
  ["p22", "c22", "v6", [["nuevo", 13], ["filtrado", 12], ["descartado", 11]], "Pretensión salarial fuera de rango"],
  ["p23", "c23", "v7", [["nuevo", 44], ["filtrado", 42], ["entrevista", 38], ["prueba", 33], ["oferta", 26], ["contratado", 22]]],
  ["p24", "c24", "v7", [["nuevo", 43], ["filtrado", 41], ["entrevista", 37], ["prueba", 33], ["descartado", 26]], "El cliente eligió a otra persona"],
  ["p25", "c25", "v7", [["nuevo", 42], ["descartado", 41]], "Inglés por debajo de lo requerido"],
  ["p26", "c26", "v8", [["nuevo", 58], ["filtrado", 56], ["entrevista", 52], ["prueba", 47], ["oferta", 42], ["contratado", 38]]],
  ["p27", "c27", "v8", [["nuevo", 57], ["filtrado", 55], ["entrevista", 50], ["prueba", 45], ["oferta", 40], ["contratado", 36]]],
  ["p28", "c28", "v8", [["nuevo", 56], ["filtrado", 54], ["entrevista", 49], ["prueba", 44], ["oferta", 40], ["descartado", 37]], "Aceptó otra oferta"],
];

type Puntos = [number, number, number, number, number];
// [id, postulacion, tipo, entrevistador, dia relativo, hora, minuto, modalidad, estado, puntos?, recomendacion?, comentario?]
const ENTREVISTAS: [string, string, Entrevista["tipo"], string, number, number, number, Entrevista["modalidad"], Entrevista["estado"], Puntos?, Recomendacion?, string?][] = [
  ["e01", "p01", "screening", EQUIPO.josue, -7, 9, 0, "video", "realizada", [5, 5, 4, 4, 5], "avanzar", "Inglés muy claro. Ya maneja GoHighLevel con un broker de Florida."],
  ["e02", "p02", "screening", EQUIPO.josue, -6, 10, 30, "video", "realizada", [5, 5, 5, 4, 4], "avanzar", "Inglés nativo. Pregunta mucho y bien."],
  ["e03", "p02", "tecnica", EQUIPO.daniela, -2, 14, 0, "video", "realizada", [5, 4, 5, 5, 4], "avanzar", "Resolvió el ejercicio de inbox en 25 minutos. Muy buena priorización."],
  ["e04", "p06", "cliente", EQUIPO.andres, -3, 11, 0, "video", "realizada", [5, 5, 4, 5, 5], "avanzar", "El broker quedó encantado. Pide oferta esta semana."],
  ["e05", "p01", "tecnica", EQUIPO.daniela, 1, 10, 0, "video", "programada"],
  ["e06", "p08", "screening", EQUIPO.josue, 0, 15, 0, "llamada", "programada"],
  ["e07", "p09", "cliente", EQUIPO.andres, 2, 11, 0, "video", "programada"],
  ["e08", "p13", "screening", EQUIPO.josue, 1, 14, 0, "video", "programada"],
  ["e09", "p21", "disc", EQUIPO.karla, 3, 9, 30, "presencial", "programada"],
  ["e10", "p20", "cliente", EQUIPO.daniela, -4, 16, 0, "presencial", "realizada", [4, 5, 5, 4, 5], "avanzar", "Encaja con el equipo. Hizo un screening de práctica impecable."],
  ["e11", "p07", "cliente", EQUIPO.andres, -9, 10, 0, "video", "realizada", [5, 4, 4, 5, 5], "avanzar", "El despacho la quiere de inmediato."],
  ["e12", "p11", "screening", EQUIPO.josue, -12, 9, 0, "llamada", "no_asistio"],
  ["e13", "p03", "screening", EQUIPO.josue, 2, 16, 0, "llamada", "programada"],
  ["e14", "p09", "tecnica", EQUIPO.daniela, -7, 15, 0, "video", "realizada", [4, 4, 4, 5, 4], "avanzar", "Buen manejo de formularios. Le falta velocidad escribiendo en inglés."],
  ["e15", "p21", "screening", EQUIPO.karla, -5, 11, 0, "llamada", "realizada", [3, 4, 4, 3, 5], "dudoso", "Muy buena actitud. El inglés escrito necesita trabajo."],
  ["e16", "p10", "screening", EQUIPO.josue, 4, 10, 0, "llamada", "programada"],
];

/** Dia habil (lunes a viernes) a n dias de hoy: sabado y domingo pasan al lunes. */
function habil(hoy: string, n: number): string {
  let dia = sumarDias(hoy, n);
  const [a, m, d] = dia.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  if (dow === 6) dia = sumarDias(dia, 2);
  if (dow === 0) dia = sumarDias(dia, 1);
  return dia;
}

export function sembrarTalento(ahora: Date = new Date()): EstadoTalento {
  const hoy = diaSv(ahora);
  const hace = (n: number, hora = 10, minuto = 0) => isoDesdeSv(sumarDias(hoy, -n), hora, minuto);

  const candidatos: Candidato[] = FILAS.map((f, i) => ({
    id: f.id,
    nombre: f.nombre,
    telefono: f.tel,
    correo: correoDe(f.nombre),
    ubicacion: { pais: f.pais, departamento: f.dep, municipio: f.mun },
    titular: f.titular,
    resumen: f.resumen,
    experiencia: f.exp,
    aniosExperiencia: f.anios,
    educacion: f.educacion,
    skills: f.skills,
    ingles: f.ingles,
    otrosIdiomas: f.otros,
    pretension: f.pretension,
    jornada: f.jornada,
    horarios: f.horarios,
    disponibilidad: f.disp,
    disc: f.disc ? { primario: f.disc[0], secundario: f.disc[1] } : undefined,
    fuente: f.fuente,
    referidoPor: f.referido,
    audioUrl: f.grabacion ? linkDemo(i) : undefined,
    creado: f.horas !== undefined ? new Date(ahora.getTime() - f.horas * 3600_000).toISOString() : hace(f.hace, 9),
    notas: [],
  }));

  const notas: Record<string, [string, string, number][]> = {
    c01: [[EQUIPO.josue, "Disponible después de dar dos semanas de aviso. Prefiere clientes en hora del Este.", 7]],
    c06: [[EQUIPO.andres, "El cliente pidió que la oferta incluya el bono de 90 días.", 1]],
    c09: [[EQUIPO.daniela, "Le mandé el caso práctico de formularios. Lo entregó en 24 horas.", 6]],
    c07: [[EQUIPO.paola, "Ya entregó DUI y constancia bancaria.", 2]],
    c20: [[EQUIPO.karla, "La queremos. Negociar fecha de ingreso: su empleo actual pide 15 días.", 2]],
    c31: [[EQUIPO.daniela, "Entró ayer por la página de carreras. Perfil muy fuerte para la vacante del broker de Miami.", 1]],
  };
  for (const c of candidatos) {
    c.notas = (notas[c.id] ?? []).map(([autor, texto, dias], i) => ({ id: `n-${c.id}-${i}`, autor, texto, ts: hace(dias, 11) }));
  }

  const vacantes: Vacante[] = VACANTES.map((v) => ({
    id: v.id,
    titulo: v.titulo,
    cliente: v.cliente,
    area: v.area,
    descripcion: v.descripcion,
    requisitos: v.requisitos,
    estado: v.estado,
    plazas: v.plazas,
    responsable: v.responsable,
    creada: hace(v.hace, 8),
    cerrada: v.cerradaHace !== undefined ? hace(v.cerradaHace, 17) : undefined,
  }));

  const postulaciones: Postulacion[] = POSTULACIONES.map(([id, candidatoId, vacanteId, pasos, motivo]) => ({
    id,
    candidatoId,
    vacanteId,
    etapa: pasos[pasos.length - 1][0],
    historial: pasos.map(([etapa, dias], i) => ({ etapa, ts: hace(dias, 9 + i) })),
    motivoDescarte: motivo,
    creada: hace(pasos[0][1], 9),
  }));

  // Las decisiones que ya se tomaron: quien paso de Nuevo en alguna vacante
  // fue aprobado el dia que lo filtraron; quien quedo descartado en todas,
  // rechazado con su motivo. El resto (banco o solo en Nuevo) espera revision.
  for (const c of candidatos) {
    const suyas = postulaciones.filter((p) => p.candidatoId === c.id);
    if (suyas.length === 0) continue;
    const avanzo = suyas
      .map((p) => p.historial.find((h) => h.etapa !== "nuevo" && h.etapa !== "descartado"))
      .filter((h): h is { etapa: Etapa; ts: string } => Boolean(h))
      .sort((a, b) => a.ts.localeCompare(b.ts))[0];
    if (avanzo) {
      c.decision = { resultado: "aprobado", por: EQUIPO.josue, ts: avanzo.ts, movimientos: [] };
    } else if (suyas.every((p) => p.etapa === "descartado")) {
      const p = suyas[0];
      c.decision = { resultado: "rechazado", por: EQUIPO.josue, ts: p.historial.at(-1)!.ts, motivo: p.motivoDescarte, movimientos: [] };
    }
  }

  const entrevistas: Entrevista[] = ENTREVISTAS.map(
    ([id, postulacionId, tipo, entrevistador, dia, hora, minuto, modalidad, estado, puntos, recomendacion, comentario]) => {
      const fecha = dia >= 0 ? habil(hoy, dia) : sumarDias(hoy, dia);
      const inicio = isoDesdeSv(fecha, hora, minuto);
      const criterios: CriterioId[] = ["ingles", "comunicacion", "proactividad", "tecnico", "cultura"];
      return {
        id,
        postulacionId,
        tipo,
        entrevistador,
        inicio,
        duracionMin: tipo === "tecnica" ? 45 : tipo === "screening" ? 20 : 30,
        modalidad,
        estado,
        scorecard:
          puntos && recomendacion
            ? {
                entrevistador,
                criterios: Object.fromEntries(criterios.map((c, i) => [c, puntos[i]])) as Record<CriterioId, number>,
                recomendacion,
                comentario: comentario ?? "",
                ts: inicio,
              }
            : undefined,
      };
    },
  );

  // Onboarding de quienes ya entraron: los viejos casi terminan, la nueva arranca.
  const hechas = (n: number) =>
    TAREAS_ONBOARDING.map((label, i) => ({ id: `t${i + 1}`, label, hecha: i < n }));
  const onboarding: Onboarding[] = [
    { postulacionId: "p07", inicio: habil(hoy, 11), tareas: hechas(2) },
    { postulacionId: "p23", inicio: habil(hoy, 1), tareas: hechas(4) },
    { postulacionId: "p26", inicio: sumarDias(hoy, -24), tareas: hechas(6) },
    { postulacionId: "p27", inicio: sumarDias(hoy, -22), tareas: hechas(6) },
  ];

  return {
    version: VERSION_TALENTO,
    sembradoEn: hoy,
    candidatos,
    vacantes,
    postulaciones,
    entrevistas,
    onboarding,
  };
}
