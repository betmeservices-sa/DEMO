// El dominio del tablero de eventos de Pizza Hut.
//
// A Pizza Hut la llaman organizadores de conciertos, partidos, ferias y fiestas
// patronales para invitarla a vender en su evento. Daniela (la agente de voz)
// atiende, hace las preguntas y deja los datos; el tablero junta cada propuesta
// con su llamada, su asesor y su etapa.
//
// `DatosEvento` es EL CONTRATO con el agente de voz: mismos nombres, en
// snake_case, que los campos del structuredData de la llamada. Se guardan tal
// cual (normalizados) para que leer la base y leer la llamada sea lo mismo.

export type TipoEvento =
  | "concierto"
  | "deportivo"
  | "festival_feria"
  | "fiesta_patronal"
  | "corporativo"
  | "educativo"
  | "religioso_comunitario"
  | "otro";

export type Espacio = "aire_libre" | "techado" | "mixto" | "";
export type TipoEntrada = "gratuita" | "con_boleto" | "";
export type Modalidad = "venta_en_sitio" | "patrocinio" | "catering" | "donacion" | "mixta" | "por_definir";
export type Condicion = "cuota_fija" | "comision" | "cuota_mas_comision" | "sin_costo" | "canje" | "por_definir";
export type SiNoPorDefinir = "si" | "no" | "por_definir";
export type Servicio = "incluida" | "no_incluida" | "por_definir";
export type Toldo = "incluido" | "no_incluido" | "por_definir";
export type Permisos = "organizador" | "pizza_hut" | "por_definir";
export type CanalContacto = "llamada" | "whatsapp" | "correo" | "";

export interface DatosEvento {
  tipo_evento: TipoEvento;
  nombre_evento: string;
  descripcion_evento: string;
  fecha_inicio: string; // YYYY-MM-DD o ""
  fecha_fin: string;
  horario: string;
  recinto: string;
  municipio: string;
  departamento: string;
  espacio: Espacio;
  aforo_esperado: number; // 0 = no sabe
  evento_recurrente: boolean;
  asistencia_anterior: number; // 0 = no aplica
  perfil_publico: string;
  tipo_entrada: TipoEntrada;
  precio_boleto: number;
  modalidad: Modalidad;
  condicion_comercial: Condicion;
  monto_cuota: number;
  porcentaje_comision: number;
  exclusividad_pizza: SiNoPorDefinir;
  otros_vendedores_comida: number;
  tamano_espacio: string;
  energia_electrica: Servicio;
  agua: Servicio;
  toldo_mobiliario: Toldo;
  montaje: string;
  permisos_a_cargo_de: Permisos;
  medios_de_pago: string;
  promocion_de_marca: string;
  fecha_limite_respuesta: string;
  contacto_nombre: string;
  contacto_cargo: string;
  contacto_empresa: string;
  contacto_telefono: string; // 8 dígitos
  contacto_correo: string;
  contacto_horario: string;
  contacto_canal: CanalContacto;
  notas: string;
}

export type Etapa = "nueva" | "revision" | "contactado" | "negociacion" | "confirmada" | "descartada";

/** Por dónde entró la propuesta. */
export type CanalOrigen = "llamada" | "whatsapp" | "instagram" | "facebook" | "correo";

export interface NotaInterna {
  id: string;
  ts: string;
  autor: string; // id del asesor, "ia" o el nombre de quien escribió
  texto: string;
}

export interface CambioEtapa {
  ts: string;
  de: Etapa | null;
  a: Etapa;
  actor: string;
  motivo?: string;
}

export interface Propuesta {
  id: string;
  origen: "semilla" | "real";
  canal: CanalOrigen;
  creada: string; // ISO
  datos: DatosEvento;
  /** Lo que dejó la llamada como resumen (o el chat). */
  resumen: string;
  etapa: Etapa;
  motivoDescarte?: string;
  asesorId: string;
  /** Primer contacto de un asesor con el organizador. null = todavía no. */
  primerContacto: string | null;
  notasInternas: NotaInterna[];
  historial: CambioEtapa[];
  llamadaId?: string;
  /** Una llamada de prueba (la del despliegue). Se marca para poder borrarla. */
  prueba?: boolean;
}

/** Lo que no es propuesta también se cuenta: es lo que Daniela filtró. */
export type MotivoLlamada =
  | "propuesta"
  | "pedido"
  | "sucursal"
  | "seguimiento"
  | "proveedor"
  | "equivocado"
  | "otro";

export interface LlamadaEvento {
  id: string;
  origen: "muestra" | "real";
  assistantId?: string | null;
  numero: string; // el que llamó, tal como llegó
  inicio: string; // ISO
  fin: string;
  duracionSeg: number;
  resumen: string;
  /** Solo las reales la traen guardada; la de muestra se arma al abrirla. */
  transcripcion?: string;
  grabacion: boolean;
  esPropuesta: boolean;
  motivo: MotivoLlamada;
  propuestaId?: string;
  prueba?: boolean;
}

export interface Asesor {
  id: string;
  nombre: string;
  iniciales: string;
}

/** Un movimiento que una persona hizo sobre una propuesta (semilla o real). */
export type TipoMovimiento = "etapa" | "nota" | "asesor" | "contactado" | "dato";

export interface Movimiento {
  id: string;
  propuestaId: string;
  tipo: TipoMovimiento;
  ts: string;
  actor: string;
  /** etapa: { a, motivo? } · nota: { texto } · asesor: { asesorId } · contactado: {} · dato: { campo, valor } */
  valor: Record<string, unknown>;
}
