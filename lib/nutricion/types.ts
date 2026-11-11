/** Dos calendarios separados: consultas con la nutricionista y entregas de comida a domicilio. */
export type Agenda = "consultas" | "entregas";
export type Canal = "whatsapp" | "instagram" | "facebook";

/** Planes y productos que vende la agencia. */
export type PlanId = "premium" | "two_meals" | "the_lunch";

/** Plan de comida a domicilio activo (o recién vencido). */
export interface PlanActivo {
  plan: PlanId;
  /** Día de inicio, en días desde hoy (negativo = ya empezó). */
  inicio: number;
  /** Duración en semanas (The Lunch se renueva cada semana). */
  semanas: number;
  zona: string;
  direccion: string;
  /** Hora aproximada de entrega ("06:20"). */
  horaEntrega: string;
}

/** Alérgenos que la cocina controla en cada plato. */
export type Alergeno = "lacteos" | "gluten" | "huevo" | "mani" | "nueces" | "soya" | "pescado" | "mariscos";

export type Tiempo = "Desayuno" | "Merienda AM" | "Almuerzo" | "Merienda PM" | "Cena";

/** Plato del recetario de cocina. Las meriendas sirven para AM y PM. */
export interface Plato {
  id: string;
  /** Número del plato en el menú (1 a 8 por tiempo). */
  numero?: number;
  nombre: string;
  tiempo: "Desayuno" | "Merienda" | "Almuerzo" | "Cena";
  /** Cómo se arma el plato, tal como viene en el menú. */
  componentes?: { proteina: string; carbohidrato: string; vegetales: string; grasa: string };
  contiene: Alergeno[];
  etiquetas: ("Vegetariano" | "Bajo en azúcar" | "Alto en proteína")[];
  /** Insumos por porción, para la lista de producción. */
  insumos: [string, number, string][];
}

/**
 * Plan de alimentación que la nutricionista asigna a un paciente con plan a
 * domicilio. Es lo que ve la cocina: qué cocinar, en qué porción y qué evitar.
 */
export interface PlanAlimentacion {
  clienteId: string;
  plan: PlanId;
  tiempos: Tiempo[];
  /** Opciones elegidas por tiempo (desayuno, almuerzo, cena, meriendas): la cocina las rota de lunes a sábado. */
  opciones: Partial<Record<Tiempo, string[]>>;
  /** Cambios escritos por la nutricionista para este paciente, por plato (por alergias o gustos). */
  ajustes: Record<string, string>;
  kcal: number;
  proteinaG: number;
  porcion: "Pequeña" | "Regular" | "Grande";
  alergias: Alergeno[];
  /** Alimentos que no le gustan: la cocina los quita del plato. */
  noLeGusta: string[];
  /** Lo que sí le gusta: la cocina lo prefiere al sustituir. */
  leGusta: string[];
  notasCocina: string;
  autor: string;
  actualizado: string;
}

export type EstadoOrden = "nueva" | "confirmada" | "preparacion" | "lista" | "despachada";

export interface ItemOrden {
  tiempo: Tiempo;
  platoId: string;
  /** Cambio escrito por la nutricionista para este paciente (viene de su plan). */
  ajuste?: string;
  /** La cocina ya preparó esta porción. */
  hecho?: boolean;
  /** Partes del plato ya hechas (proteína, carbohidrato, vegetales, grasa). */
  partes?: string[];
}

/** Un día del paquete: los platos que le tocan y si ya está listo. */
export interface DiaOrden {
  /** Día de la entrega (0 = hoy). */
  dia: number;
  hora: string;
  items: ItemOrden[];
  estado: "pendiente" | "lista" | "entregada";
}

/**
 * Orden de cocina: el paquete semanal de un paciente (lunes a sábado) según su
 * plan, con los platos de cada día.
 */
export interface Orden {
  id: string;
  clienteId: string;
  /** 0 = esta semana, 1 = la próxima. */
  semana: number;
  zona: string;
  plan: PlanId;
  dias: DiaOrden[];
  /** Cuándo llegó a la cocina: día relativo y hora. Ordena la cola. */
  diaLlegada: number;
  llegada: string;
  origen: string;
  estado: EstadoOrden;
  /** Pedido del paciente que vino con la orden (por chat). */
  nota?: string;
  confirmada?: string;
  lista?: string;
}

/**
 * Producción planificada por el chef para un día: qué partes de los platos va
 * a sacar (por ejemplo, todas las de carne y arroz). Se alimenta de las órdenes
 * del día; cada clave es "parte|texto del componente".
 */
export interface Tanda {
  id: string;
  dia: number;
  nombre: string;
  claves: string[];
}

/** Aviso de la cocina a la nutricionista: sustitución, faltante o duda. */
export interface Incidencia {
  id: string;
  ordenId: string;
  clienteId: string;
  tipo: "sustitucion" | "faltante" | "duda";
  texto: string;
  hora: string;
  resuelta?: boolean;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  correo: string;
  canal: Canal;
  edad: number;
  sexo: "F" | "M";
  /** Meta que acordó con la nutricionista. */
  objetivo: string;
  modalidad: "presencial" | "en_linea";
  plan?: PlanActivo;
  /** Fecha de nacimiento ISO (AAAA-MM-DD), si se registró. */
  fechaNacimiento?: string;
  alturaCm?: number;
  /** Alergias e intolerancias que la cocina no puede usar. */
  alergias?: Alergeno[];
  /** Otras restricciones o estilos: "Vegetariana", "Bajo en azúcar"… */
  restricciones?: string[];
  /** Productos digitales comprados (retos, e-book). */
  productos?: string[];
  etiquetas?: string[];
  /** El cliente pidió no recibir mensajes de marketing. */
  optOutMarketing?: boolean;
  /** Perfil creado por el agente: cliente nuevo que no estaba en la base. */
  creadoPorIA?: boolean;
}

/**
 * Quién atiende la conversación:
 * - ia: la responde el agente.
 * - transferida: el agente la pasó al equipo y espera que alguien la tome.
 * - secretaria: una persona la tomó; el agente ya no contesta.
 * - resuelta: cerrada.
 */
export type EstadoConv = "ia" | "transferida" | "secretaria" | "resuelta";

export type MotivoTransferencia = "caso_clinico" | "urgencia" | "cotizacion" | "pedido_cliente";

export interface Mensaje {
  id: string;
  autor: "cliente" | "ia" | "secretaria" | "sistema";
  texto: string;
  hora: string;
  plantilla?: string;
  botones?: string[];
}

/** Para qué está la conversación. */
export type Objetivo = "agendar" | "reactivacion" | "recordatorio" | "seguimiento" | "menu" | "entrega" | "planes" | "informacion";

export interface Conversacion {
  objetivo: Objetivo;
  /** Lo que logró el agente, si ya hay resultado (cita agendada, entrega confirmada…). */
  resultado?: { tipo: "cita" | "confirmada" | "reagendada" | "entrega" | "sin_interes"; texto: string };
  id: string;
  clienteId: string;
  canal: Canal;
  agenda: Agenda | null;
  estado: EstadoConv;
  motivo?: MotivoTransferencia;
  /** Minutos que lleva esperando desde la transferencia. */
  esperaMin?: number;
  noLeidos: number;
  fueraHorario?: boolean;
  hora: string;
  mensajes: Mensaje[];
}

export type EstadoCita =
  | "confirmada"
  | "por_confirmar"
  | "completada"
  | "en_curso"
  | "cancelada"
  | "ausente"
  | "reagendada";

/** Cita en el calendario de consultas o entrega en el calendario de entregas. */
export interface Cita {
  id: string;
  agenda: Agenda;
  clienteId: string;
  servicio: string;
  /** Solo consultas. */
  modalidad?: "presencial" | "en_linea";
  /** Solo entregas: zona de la ruta. */
  zona?: string;
  /** Días desde hoy (0 = hoy, -1 = ayer). */
  dia: number;
  hora: string; // "08:30"
  duracionMin: number;
  estado: EstadoCita;
  origen: "ia" | "manual";
}

export type EstadoSeguimiento = "programado" | "enviado" | "respondido" | "nueva_cita" | "transferido";

export interface Seguimiento {
  id: string;
  clienteId: string;
  consulta: string;
  fechaConsulta: string;
  regla: string;
  envio: string;
  estado: EstadoSeguimiento;
  respuesta?: string;
}

export type EstadoReactivacion = "detectado" | "contactado" | "respondio" | "cita" | "no_interesado";

/** Tiempo sin consulta o sin plan con el que el equipo filtra a quién reactivar. */
export type RangoInactividad = "15d" | "1m" | "mas1m";

export interface Reactivacion {
  id: string;
  clienteId: string;
  /** consultas: sin control reciente · entregas: plan vencido sin renovar. */
  agenda: Agenda;
  ultimoServicio: string;
  /** Días desde la última consulta o desde que venció el plan. */
  diasInactivo: number;
  estado: EstadoReactivacion;
}

export interface Plantilla {
  nombre: string;
  categoria: "UTILITY" | "MARKETING";
  agenda: Agenda | "ambas";
  titulo: string;
  cuerpo: string;
  ejemplo: string[];
  botones: string[];
  cuando: string;
  estadoMeta: "Borrador" | "En revisión" | "Aprobada";
  stats: { enviados: number; entregados: number; leidos: number; respondidos: number };
}

/** Un tiempo de comida del menú personalizado. */
export interface ItemMenu {
  /** Desayuno, Merienda AM, Almuerzo, Merienda PM, Cena. */
  tiempo: string;
  comida: string;
  porcion: string;
  nota: string;
}

export type EstadoMenu = "enviado" | "leido" | "duda";

/** Menú personalizado que la nutricionista escribe al cerrar la consulta. */
export interface Menu {
  id: string;
  clienteId: string;
  hora: string;
  /** Fecha de la consulta, como se muestra en el perfil del cliente. */
  fecha?: string;
  /** Cuánto tiempo aplica: "4 semanas", "2 semanas"… */
  vigencia: string;
  items: ItemMenu[];
  /** Lista de compras, una línea por producto. */
  compras?: string;
  indicaciones?: string;
  estado: EstadoMenu;
  /** Por dónde se le envió al cliente (WhatsApp si no se indica). */
  canal?: "whatsapp" | "correo";
}

/** Resumen que escribe la nutricionista al cerrar una consulta. Es interno: MIA no lo envía ni lo explica al cliente. */
export interface ResumenConsulta {
  motivo: string;
  pesoKg?: string;
  grasaPct?: string;
  musculoKg?: string;
  observaciones: string;
  objetivo: string;
  indicaciones: string;
  /** Texto legible: "En 15 días", "No requiere"… */
  proximoControl: string;
  autor: string;
  /** Cuándo se escribió (texto de demo). */
  escrito: string;
}

/** Consulta atendida (presencial o en línea). */
export interface Visita {
  id: string;
  clienteId: string;
  agenda: Agenda;
  /** Fecha ISO (AAAA-MM-DD). */
  fecha: string;
  hora: string;
  servicio: string;
  atendio: string;
}

/** Nota interna sobre un paciente. */
export interface Nota {
  id: string;
  clienteId: string;
  texto: string;
  /** Fecha ISO (AAAA-MM-DD). */
  fecha: string;
  hora: string;
  autor: string;
}

export type Red = "instagram" | "facebook";

/** Publicación en redes sociales. */
export interface Post {
  id: string;
  redes: Red[];
  texto: string;
  /** Imagen subida (data URL) o diseño prediseñado. */
  imagen?: string;
  diseno?: { fondo: string; titulo: string };
  estado: "publicada" | "programada";
  /** Fecha ISO (AAAA-MM-DD). */
  fecha: string;
  hora: string;
  stats?: { alcance: number; meGusta: number; comentarios: number; mensajes: number };
}

export type Segmento = "todos" | "consultas_inactivos" | "plan_vencido" | "con_plan" | "sin_plan";

/** Campaña por WhatsApp (plantilla de marketing aprobada por Meta). */
export interface Campana {
  id: string;
  nombre: string;
  segmento: Segmento;
  mensaje: string;
  botones: string[];
  estado: "enviada" | "programada";
  fecha: string;
  hora: string;
  destinatarios: number;
  stats?: { entregados: number; leidos: number; respondieron: number; citas: number };
}

/** Plantilla de WhatsApp que el equipo crea y edita (máximo 5 guardadas). */
export interface PlantillaWA {
  id: string;
  /** Nombre para Meta: minúsculas, números y guion bajo. */
  nombre: string;
  categoria: "UTILITY" | "MARKETING";
  encabezado?: string;
  /** Texto con variables {{1}}, {{2}}… */
  cuerpo: string;
  /** Ejemplos de las variables, en orden (Meta los pide para aprobar). */
  ejemplos: string[];
  pie?: string;
  /** Respuestas rápidas (máximo 3, 25 caracteres cada una). */
  botones: string[];
  estado: "Borrador" | "En revisión" | "Aprobada";
  actualizada: string;
}
