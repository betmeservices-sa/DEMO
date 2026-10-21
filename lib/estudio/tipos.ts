// El motor de contenido de BetMe (tenant "estudio").
//
// Un prompt con el perfil de la marca entra, salen piezas (texto, imagen,
// carrusel o video con avatar), una persona las aprueba y el calendario las
// publica en cada red. Todo es por marca: cada fila lleva `marcaId`, igual que
// el `client_id` del roadmap, porque el motor se revende a varios clientes.
//
// Dos cosas que el roadmap original no tenía y aquí sí:
//   - Cada red es una VARIANTE con su propio texto, su propio id de
//     publicación y su propio estado: el planificador publica un post por
//     cuenta, y una red puede fallar mientras las otras salen.
//   - El historial de cada pieza deja quién la aprobó y cuándo. Es la prueba
//     de que nada sale sin un sí.

export type Red = "instagram" | "facebook" | "tiktok" | "linkedin" | "google" | "youtube";

export type Idioma = "es" | "en";

export type TipoPieza = "texto" | "imagen" | "carrusel" | "video";

export type EstadoPieza = "por_aprobar" | "aprobada" | "programada" | "publicada" | "fallida" | "rechazada";

export type Plantilla = "pieza" | "semana" | "mes" | "guion";

export type EstadoConexion = "conectada" | "vencida" | "sin_conectar";

export interface CuentaRed {
  red: Red;
  /** Como se ve la cuenta en la red: @handle, nombre de página o de la ficha. */
  cuenta: string;
  estado: EstadoConexion;
}

export interface Consentimiento {
  /** Fecha (YYYY-MM-DD) en que firmó el uso de su imagen y su voz. */
  firmado: string;
  quien: string;
}

export interface Avatar {
  /** clon = la persona real de la marca; marca = presentador o voz sin cara. */
  tipo: "clon" | "marca";
  nombre: string;
  foto: string;
  /** Ids del lado de los proveedores (avatar y voz). */
  avatarId: string;
  vozId: string;
  vozNombre: string;
  consentimiento?: Consentimiento;
}

export interface Marca {
  id: string;
  nombre: string;
  rubro: string;
  ciudad: string;
  /** IANA. Las horas de su calendario son las de su ciudad. */
  zonaHoraria: string;
  /** Reparto de idiomas del contenido, en porcentaje (suman 100). */
  idiomas: Record<Idioma, number>;
  tono: string;
  servicios: string[];
  ofertas: string[];
  palabrasProhibidas: string[];
  /** Colores de marca: el primero es el principal. */
  colores: string[];
  iniciales: string;
  plan: "Esencial" | "Crecimiento" | "Total";
  /** Piezas al mes que incluye su plan. */
  piezasPlan: number;
  /** Subcuenta del CRM donde vive su planificador. */
  ubicacionId: string;
  redes: CuentaRed[];
  avatar?: Avatar;
  portada: string;
}

export interface Variante {
  red: Red;
  texto: string;
  /** Id del post en el planificador, cuando ya se programó. */
  postId?: string;
  estado: EstadoPieza;
  error?: string;
}

export type AccionHistorial =
  | "generada"
  | "editada"
  | "regenerada"
  | "aprobada"
  | "rechazada"
  | "programada"
  | "reprogramada"
  | "publicada"
  | "fallo";

export interface EventoPieza {
  ts: string;
  accion: AccionHistorial;
  actor: string;
  nota?: string;
}

export interface Pieza {
  id: string;
  marcaId: string;
  encargoId?: string;
  tipo: TipoPieza;
  idioma: Idioma;
  /** Nombre corto para la cola y el calendario. */
  titulo: string;
  texto: string;
  hashtags: string[];
  /** Guion hablado del video (solo tipo video). */
  guion?: string;
  /** Lo que la imagen debería mostrar, para generarla o elegir foto. */
  ideaImagen?: string;
  medios: string[];
  /** Segundos, solo video. */
  duracion?: number;
  redes: Red[];
  variantes: Variante[];
  estado: EstadoPieza;
  /**
   * Solo video: primero se aprueba el guion y después el video ya armado.
   * Los dos pasan por la misma cola.
   */
  fase?: "guion" | "video";
  /** Hora de El Salvador, "YYYY-MM-DDTHH:mm" (ver fechas.ts). */
  programadaPara?: string;
  creada: string;
  historial: EventoPieza[];
}

export interface Encargo {
  id: string;
  marcaId: string;
  texto: string;
  plantilla: Plantilla;
  idiomas: Record<Idioma, number>;
  redes: Red[];
  creado: string;
  actor: string;
  piezas: string[];
}

export type TipoMedio = "obra" | "generada" | "video";

export interface Medio {
  id: string;
  marcaId: string;
  url: string;
  tipo: TipoMedio;
  titulo: string;
  /** Gráfico de marca: la foto con este titular y el logo encima. */
  titular?: string;
  fecha: string;
  /** En cuántas piezas se usó. */
  usos: number;
}

export type EtapaRender = "voz" | "avatar" | "edicion" | "listo" | "fallo";

export interface TrabajoRender {
  id: string;
  piezaId: string;
  marcaId: string;
  etapa: EtapaRender;
  /** 0 a 100, dentro de la etapa. */
  progreso: number;
  iniciado: string;
  /** Lo que tarda de punta a punta, en segundos. */
  duracionSeg: number;
  /** Minutos de video que factura el proveedor de avatar. */
  minutos: number;
}

export type Servicio = "texto" | "imagen" | "voz" | "avatar" | "edicion" | "publicacion";

export interface RegistroUso {
  id: string;
  marcaId: string;
  servicio: Servicio;
  proveedor: string;
  unidades: number;
  unidad: string;
  costoUsd: number;
  fecha: string;
  piezaId?: string;
}

export interface EstadoEstudio {
  /** Lunes (YYYY-MM-DD) de la semana con la que se armó la muestra. */
  base: string;
  marcas: Marca[];
  piezas: Pieza[];
  encargos: Encargo[];
  medios: Medio[];
  trabajos: TrabajoRender[];
  uso: RegistroUso[];
}
