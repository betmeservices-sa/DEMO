// Tipos del modulo de reclutamiento de BetMe (tenant "betme").
//
// BetMe coloca asistentes virtuales bilingues de LATAM con negocios de Estados
// Unidos. Una VACANTE es la posicion que pide un cliente; un CANDIDATO es una
// persona del banco de talento; una POSTULACION es ese candidato metido en el
// pipeline de esa vacante. El mismo candidato puede estar en dos vacantes a la
// vez y avanzar distinto en cada una.

export type NivelIngles = "A2" | "B1" | "B2" | "C1" | "C2";
export type Jornada = "completo" | "medio";
export type Horario = "este" | "central" | "pacifico";
export type Disc = "D" | "I" | "S" | "C";
export type Modalidad = "remoto" | "hibrido" | "presencial";
export type Pais = "SV" | "GT" | "HN" | "NI" | "CR" | "PA" | "MX" | "CO" | "OT";
export type Disponibilidad = "inmediata" | "2_semanas" | "1_mes";

export type Etapa = "nuevo" | "filtrado" | "entrevista" | "prueba" | "oferta" | "contratado" | "descartado";

export type Fuente = "carreras" | "referido" | "linkedin" | "whatsapp" | "instagram" | "facebook" | "feria" | "google" | "otro";

/** Datos que el candidato NO dio. El match no los inventa: los cuenta como faltantes. */
export type DatoFaltante = "ingles" | "experiencia" | "pretension" | "jornada" | "horarios" | "disponibilidad" | "ubicacion";

export interface Ubicacion {
  pais: Pais;
  /** Departamento (SV) o equivalente. Solo pesa en vacantes presenciales o hibridas. */
  departamento?: string;
  municipio?: string;
}

export interface Experiencia {
  puesto: string;
  empresa: string;
  /** AAAA-MM */
  desde: string;
  /** AAAA-MM; sin valor = trabajo actual. */
  hasta?: string;
  descripcion?: string;
}

export interface Nota {
  id: string;
  autor: string;
  texto: string;
  ts: string;
}

export interface Candidato {
  id: string;
  nombre: string;
  telefono: string;
  correo: string;
  ubicacion: Ubicacion;
  titular: string;
  resumen: string;
  experiencia: Experiencia[];
  aniosExperiencia: number;
  educacion: string;
  skills: string[];
  ingles: NivelIngles;
  otrosIdiomas?: string[];
  /** USD al mes. */
  pretension: number;
  jornada: Jornada;
  horarios: Horario[];
  disponibilidad: Disponibilidad;
  disc?: { primario: Disc; secundario?: Disc };
  fuente: Fuente;
  referidoPor?: string;
  /**
   * Grabacion de presentacion de 60 segundos en ingles, como la manda el
   * formulario de carreras: un link de Vocaroo (vocaroo.com/ID o voca.ro/ID).
   */
  audioUrl?: string;
  /** Aprobado o rechazado por el equipo. Sin esto, esta pendiente de revision. */
  decision?: Decision;
  /** Resultado de marcar la decision en GHL. Lo escribe el servidor. */
  ghl?: EstadoGhl;
  /** Fecha de ingreso al banco de talento. */
  creado: string;
  /** Puesto al que aplico en el formulario de carreras. */
  puesto?: string;
  /** Link publico al CV (PDF en el bucket o Drive). */
  cvUrl?: string;
  /** Lo que el formulario no pregunta. Ver DatoFaltante. */
  sinDato?: DatoFaltante[];
  /** "formulario" = postulacion real del sitio de BetMe. Sin esto, perfil de ejemplo o cargado a mano. */
  origen?: "formulario";
  notas: Nota[];
}

/** Un cambio que hizo la decision sobre el candidato, para poder deshacerlo. */
export interface MovimientoDecision {
  postulacionId: string;
  /** La postulacion no existia: la creo la aprobacion. Deshacer la borra. */
  creada: boolean;
  etapaPrevia?: Etapa;
  motivoPrevio?: string;
}

export interface EstadoGhl {
  estado: "ok" | "error";
  accion: "aprobado" | "rechazado" | "deshacer";
  /** Resultado previo, para poder reintentar un deshacer. */
  previo?: "aprobado" | "rechazado";
  ts: string;
  detalle?: string;
}

export interface Decision {
  resultado: "aprobado" | "rechazado";
  por: string;
  ts: string;
  motivo?: string;
  movimientos: MovimientoDecision[];
}

export interface Requisitos {
  skills: string[];
  deseables: string[];
  ingles: NivelIngles;
  experiencia: number;
  salarioMax: number;
  modalidad: Modalidad;
  /** Paises aceptados para trabajo remoto. */
  paises: Pais[];
  /** Departamento de la oficina, para hibrido o presencial. */
  departamento?: string;
  jornada: Jornada;
  horario: Horario;
  /** Perfiles DISC que mejor encajan. Vacio = no pesa. */
  disc: Disc[];
}

export type EstadoVacante = "abierta" | "pausada" | "cerrada";

export interface Vacante {
  id: string;
  titulo: string;
  cliente: string;
  area: string;
  descripcion: string;
  requisitos: Requisitos;
  estado: EstadoVacante;
  plazas: number;
  responsable: string;
  creada: string;
  cerrada?: string;
  /**
   * "formulario" = no la creo el equipo: es el puesto tal como llega del
   * formulario de carreras, para que ninguna postulacion quede fuera del
   * pipeline. No tiene requisitos, asi que no se le calcula match.
   */
  origen?: "formulario";
}

export interface MovimientoEtapa {
  etapa: Etapa;
  ts: string;
}

export interface Postulacion {
  id: string;
  candidatoId: string;
  vacanteId: string;
  etapa: Etapa;
  historial: MovimientoEtapa[];
  motivoDescarte?: string;
  creada: string;
}

export type TipoEntrevista = "screening" | "tecnica" | "cliente" | "disc";
export type EstadoEntrevista = "programada" | "realizada" | "no_asistio" | "cancelada";
export type CriterioId = "ingles" | "comunicacion" | "proactividad" | "tecnico" | "cultura";
export type Recomendacion = "avanzar" | "dudoso" | "no_avanzar";

export interface Scorecard {
  entrevistador: string;
  criterios: Record<CriterioId, number>;
  recomendacion: Recomendacion;
  comentario: string;
  ts: string;
}

export interface Entrevista {
  id: string;
  postulacionId: string;
  tipo: TipoEntrevista;
  entrevistador: string;
  inicio: string;
  duracionMin: number;
  modalidad: "video" | "llamada" | "presencial";
  estado: EstadoEntrevista;
  scorecard?: Scorecard;
}

export interface TareaOnboarding {
  id: string;
  label: string;
  hecha: boolean;
}

export interface Onboarding {
  postulacionId: string;
  inicio: string;
  tareas: TareaOnboarding[];
}

export interface EstadoTalento {
  version: number;
  /** Dia (AAAA-MM-DD, hora de El Salvador) en que se armaron las fechas. */
  sembradoEn: string;
  candidatos: Candidato[];
  vacantes: Vacante[];
  postulaciones: Postulacion[];
  entrevistas: Entrevista[];
  onboarding: Onboarding[];
}
