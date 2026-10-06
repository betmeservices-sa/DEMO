// Lo que deja la llamada de Daniela, convertido en una propuesta del tablero.
//
// Puro y sin red: el webhook solo autentica, llama a esto y guarda. Así el
// mapeo se prueba con un payload de ejemplo (lib/__tests__/eventos-contrato).
//
// Se lee a la DEFENSIVA. Los datos llegan de un modelo y pueden venir con otro
// tipo ("5,000" en vez de 5000, "Sí" en vez de true, "Concierto" en vez de
// "concierto"), y pueden venir en dos lugares: `analysis.structuredData` (el
// plan de análisis, que es el que usa este agente) y, de respaldo,
// `artifact.structuredOutputs`. Lo que no se entiende queda vacío o "por
// definir" y aparece en Datos faltantes; nunca tumba la llamada.

import type {
  CanalContacto,
  Condicion,
  DatosEvento,
  Espacio,
  LlamadaEvento,
  Modalidad,
  MotivoLlamada,
  Permisos,
  Propuesta,
  Servicio,
  SiNoPorDefinir,
  TipoEntrada,
  TipoEvento,
  Toldo,
} from "./tipos";
import { esFechaValida } from "./fechas";

/** Menos que esto no alcanza para una propuesta: colgaron o se equivocaron. */
export const DURACION_MINIMA_SEG = 20;

const TIPOS: TipoEvento[] = [
  "concierto",
  "deportivo",
  "festival_feria",
  "fiesta_patronal",
  "corporativo",
  "educativo",
  "religioso_comunitario",
  "otro",
];

export function datosVacios(): DatosEvento {
  return {
    tipo_evento: "otro",
    nombre_evento: "",
    descripcion_evento: "",
    fecha_inicio: "",
    fecha_fin: "",
    horario: "",
    recinto: "",
    municipio: "",
    departamento: "",
    espacio: "",
    aforo_esperado: 0,
    evento_recurrente: false,
    asistencia_anterior: 0,
    perfil_publico: "",
    tipo_entrada: "",
    precio_boleto: 0,
    modalidad: "por_definir",
    condicion_comercial: "por_definir",
    monto_cuota: 0,
    porcentaje_comision: 0,
    exclusividad_pizza: "por_definir",
    otros_vendedores_comida: 0,
    tamano_espacio: "",
    energia_electrica: "por_definir",
    agua: "por_definir",
    toldo_mobiliario: "por_definir",
    montaje: "",
    permisos_a_cargo_de: "por_definir",
    medios_de_pago: "",
    promocion_de_marca: "",
    fecha_limite_respuesta: "",
    contacto_nombre: "",
    contacto_cargo: "",
    contacto_empresa: "",
    contacto_telefono: "",
    contacto_correo: "",
    contacto_horario: "",
    contacto_canal: "",
    notas: "",
  };
}

// ── Lectores por tipo ──

const VACIOS = new Set(["", "null", "undefined", "none", "n/a", "na", "ninguno", "ninguna"]);

export function texto(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v !== "string") return "";
  const s = v.trim();
  return VACIOS.has(s.toLowerCase()) ? "" : s;
}

/** "Fiesta Patronal" o "fiesta-patronal" -> "fiesta_patronal". */
function clave(v: unknown): string {
  return texto(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s-]+/g, "_");
}

function enumDe<T extends string>(v: unknown, validos: readonly T[], porDefecto: T): T {
  const k = clave(v);
  return (validos as readonly string[]).includes(k) ? (k as T) : porDefecto;
}

export function numero(v: unknown): number {
  let n: number;
  if (typeof v === "number") n = v;
  else if (typeof v === "string") {
    const limpio = v.replace(/[$,\s%]/g, "");
    n = limpio === "" ? 0 : Number(limpio);
  } else n = 0;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function booleano(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const k = clave(v);
  return k === "true" || k === "si" || k === "yes" || k === "1";
}

function fecha(v: unknown): string {
  const s = texto(v).slice(0, 10);
  return esFechaValida(s) ? s : "";
}

/** 8 dígitos de El Salvador, sin el 503 ni guiones. */
export function telefonoLocal(v: unknown): string {
  const d = texto(v).replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("503")) return d.slice(3);
  return d;
}

function tipoEvento(v: unknown): TipoEvento {
  const k = clave(v);
  if ((TIPOS as string[]).includes(k)) return k as TipoEvento;
  // Lo que el modelo dice a veces con otras palabras.
  if (k.startsWith("festival") || k.startsWith("feria")) return "festival_feria";
  if (k.startsWith("patronal") || k.includes("patronal")) return "fiesta_patronal";
  if (k.startsWith("religios") || k.startsWith("comunitari")) return "religioso_comunitario";
  if (k.startsWith("deport") || k.startsWith("partido") || k.startsWith("torneo")) return "deportivo";
  if (k.startsWith("concierto")) return "concierto";
  if (k.startsWith("corporativ") || k.startsWith("empresa")) return "corporativo";
  if (k.startsWith("educativ") || k.startsWith("colegio") || k.startsWith("universi")) return "educativo";
  return "otro";
}

/** El contrato normalizado. Lo que falta queda vacío o "por definir". */
export function normalizarDatos(raw: Record<string, unknown> | null | undefined): DatosEvento {
  const r = raw ?? {};
  const d = datosVacios();
  d.tipo_evento = tipoEvento(r.tipo_evento);
  d.nombre_evento = texto(r.nombre_evento);
  d.descripcion_evento = texto(r.descripcion_evento);
  d.fecha_inicio = fecha(r.fecha_inicio);
  d.fecha_fin = fecha(r.fecha_fin);
  if (d.fecha_fin && d.fecha_inicio && d.fecha_fin < d.fecha_inicio) d.fecha_fin = "";
  d.horario = texto(r.horario);
  d.recinto = texto(r.recinto);
  d.municipio = texto(r.municipio);
  d.departamento = texto(r.departamento);
  d.espacio = enumDe<Espacio>(r.espacio, ["aire_libre", "techado", "mixto", ""], "");
  d.aforo_esperado = Math.round(numero(r.aforo_esperado));
  d.evento_recurrente = booleano(r.evento_recurrente);
  d.asistencia_anterior = Math.round(numero(r.asistencia_anterior));
  d.perfil_publico = texto(r.perfil_publico);
  d.tipo_entrada = enumDe<TipoEntrada>(r.tipo_entrada, ["gratuita", "con_boleto", ""], "");
  d.precio_boleto = numero(r.precio_boleto);
  d.modalidad = enumDe<Modalidad>(
    r.modalidad,
    ["venta_en_sitio", "patrocinio", "catering", "donacion", "mixta", "por_definir"],
    "por_definir",
  );
  d.condicion_comercial = enumDe<Condicion>(
    r.condicion_comercial,
    ["cuota_fija", "comision", "cuota_mas_comision", "sin_costo", "canje", "por_definir"],
    "por_definir",
  );
  d.monto_cuota = numero(r.monto_cuota);
  d.porcentaje_comision = Math.min(100, numero(r.porcentaje_comision));
  d.exclusividad_pizza = enumDe<SiNoPorDefinir>(r.exclusividad_pizza, ["si", "no", "por_definir"], "por_definir");
  d.otros_vendedores_comida = Math.round(numero(r.otros_vendedores_comida));
  d.tamano_espacio = texto(r.tamano_espacio);
  d.energia_electrica = enumDe<Servicio>(r.energia_electrica, ["incluida", "no_incluida", "por_definir"], "por_definir");
  d.agua = enumDe<Servicio>(r.agua, ["incluida", "no_incluida", "por_definir"], "por_definir");
  d.toldo_mobiliario = enumDe<Toldo>(r.toldo_mobiliario, ["incluido", "no_incluido", "por_definir"], "por_definir");
  d.montaje = texto(r.montaje);
  d.permisos_a_cargo_de = enumDe<Permisos>(r.permisos_a_cargo_de, ["organizador", "pizza_hut", "por_definir"], "por_definir");
  d.medios_de_pago = texto(r.medios_de_pago);
  d.promocion_de_marca = texto(r.promocion_de_marca);
  d.fecha_limite_respuesta = fecha(r.fecha_limite_respuesta);
  d.contacto_nombre = texto(r.contacto_nombre);
  d.contacto_cargo = texto(r.contacto_cargo);
  d.contacto_empresa = texto(r.contacto_empresa);
  d.contacto_telefono = telefonoLocal(r.contacto_telefono);
  d.contacto_correo = texto(r.contacto_correo).toLowerCase();
  d.contacto_horario = texto(r.contacto_horario);
  d.contacto_canal = enumDe<CanalContacto>(r.contacto_canal, ["llamada", "whatsapp", "correo", ""], "");
  d.notas = texto(r.notas);
  return d;
}

// ── El payload de la plataforma de voz ──

type Obj = Record<string, unknown>;

function obj(v: unknown): Obj | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Obj;
  if (typeof v === "string" && v.trim().startsWith("{")) {
    try {
      const p = JSON.parse(v);
      return p && typeof p === "object" && !Array.isArray(p) ? (p as Obj) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export type FuenteDatos = "structuredData" | "structuredOutputs" | "ninguna";

/**
 * Los campos estructurados de la llamada. Manda `analysis.structuredData`; si
 * no trae nada, se arma desde `artifact.structuredOutputs`, que viene como
 * { <id>: { name, result } }: el resultado puede ser el objeto entero o un
 * campo suelto cuyo nombre es el del contrato.
 */
export function leerEstructurados(message: Obj): { datos: Obj; fuente: FuenteDatos } {
  const analysis = obj(message.analysis);
  const sd = obj(analysis?.structuredData);
  if (sd && Object.keys(sd).length > 0) return { datos: sd, fuente: "structuredData" };

  const artifact = obj(message.artifact);
  const so = obj(artifact?.structuredOutputs);
  if (so) {
    const datos: Obj = {};
    for (const salida of Object.values(so)) {
      const s = obj(salida);
      if (!s) continue;
      const resultado = obj(s.result);
      if (resultado) Object.assign(datos, resultado);
      else if (typeof s.name === "string" && s.result !== undefined) datos[s.name] = s.result;
    }
    if (Object.keys(datos).length > 0) return { datos, fuente: "structuredOutputs" };
  }
  return { datos: {}, fuente: "ninguna" };
}

/** Si la llamada fue una propuesta. Sin el campo, se deduce de si dejó datos del evento. */
function esPropuesta(datos: Obj, d: DatosEvento): boolean {
  const v = datos.es_propuesta_de_evento;
  if (v !== undefined && v !== null && v !== "") return booleano(v);
  return Boolean(d.nombre_evento || d.fecha_inicio || d.recinto || d.aforo_esperado > 0 || d.tipo_evento !== "otro");
}

/** De qué se trató una llamada que no fue propuesta, para las estadísticas. */
export function motivoDeResumen(resumen: string): MotivoLlamada {
  const t = resumen.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/pedido|ordenar|domicilio|delivery/.test(t)) return "pedido";
  if (/sucursal|restaurante|horario de atencion|ubicacion/.test(t)) return "sucursal";
  if (/seguimiento|ya habia|ya habian|propuesta anterior|estado de su propuesta/.test(t)) return "seguimiento";
  if (/proveedor|ofrecer sus servicios|ofrece servicios|vender a pizza hut/.test(t)) return "proveedor";
  if (/equivocad/.test(t)) return "equivocado";
  return "otro";
}

function iso(v: unknown): string | null {
  const s = texto(v);
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export interface ReporteMapeado {
  /** null = no era un end-of-call-report o no traía id de llamada. */
  llamada: (LlamadaEvento & { transcripcion: string; datosCrudos: Obj; fuente: FuenteDatos }) | null;
  /** La propuesta, SIN asesor (lo reparte el servidor según la carga). */
  propuesta: Omit<Propuesta, "asesorId"> | null;
  /** Por qué no hubo propuesta, para el registro. */
  sinPropuesta?: string;
  /** Dónde podría estar el audio, para copiarlo antes de que la plataforma lo borre. */
  urlsGrabacion: string[];
}

/** El tipo de mensaje del webhook ("end-of-call-report", "status-update"...). */
export function tipoDeMensaje(body: unknown): string {
  const m = obj(obj(body)?.message);
  return texto(m?.type);
}

/**
 * Convierte el `end-of-call-report` en la llamada y, si corresponde, la
 * propuesta. `ahora` se inyecta para que las pruebas no dependan del reloj.
 */
export function mapearReporte(body: unknown, ahora: string = new Date().toISOString()): ReporteMapeado {
  const message = obj(obj(body)?.message);
  if (!message || texto(message.type) !== "end-of-call-report") {
    return { llamada: null, propuesta: null, sinPropuesta: "no es end-of-call-report", urlsGrabacion: [] };
  }
  const call = obj(message.call) ?? {};
  const id = texto(call.id);
  if (!id) return { llamada: null, propuesta: null, sinPropuesta: "sin id de llamada", urlsGrabacion: [] };

  const customer = obj(call.customer) ?? obj(message.customer) ?? {};
  const numero = texto(customer.number);
  const assistantId = texto(call.assistantId) || texto(obj(message.assistant)?.id) || null;

  const inicio = iso(message.startedAt) ?? iso(call.startedAt) ?? iso(call.createdAt) ?? ahora;
  const fin = iso(message.endedAt) ?? iso(call.endedAt) ?? ahora;
  const porMarcas = Math.max(0, Math.round((Date.parse(fin) - Date.parse(inicio)) / 1000));
  const declarada = numeroODuracion(message.durationSeconds);
  const duracionSeg = declarada ?? porMarcas;

  const analysis = obj(message.analysis) ?? {};
  const artifact = obj(message.artifact) ?? {};
  const resumen = texto(analysis.summary) || texto(message.summary);
  const transcripcion = texto(artifact.transcript) || texto(message.transcript);

  const urlsGrabacion = [
    texto(artifact.recordingUrl),
    texto(message.recordingUrl),
    texto(obj(obj(artifact.recording)?.mono)?.combinedUrl),
    texto(artifact.stereoRecordingUrl),
    texto(message.stereoRecordingUrl),
  ].filter(Boolean);

  const { datos: crudos, fuente } = leerEstructurados(message);
  const d = normalizarDatos(crudos);
  const metadata = obj(call.metadata) ?? obj(message.metadata) ?? {};
  const prueba = booleano(metadata.prueba) || id.startsWith("prueba-");

  const fuePropuesta = esPropuesta(crudos, d);
  const corta = duracionSeg > 0 && duracionSeg < DURACION_MINIMA_SEG;
  const generaPropuesta = fuePropuesta && !corta;

  const llamada = {
    id,
    origen: "real" as const,
    assistantId,
    numero,
    inicio,
    fin,
    duracionSeg,
    resumen,
    transcripcion,
    grabacion: urlsGrabacion.length > 0,
    esPropuesta: generaPropuesta,
    motivo: (generaPropuesta ? "propuesta" : fuePropuesta ? "otro" : motivoDeResumen(resumen)) as MotivoLlamada,
    propuestaId: generaPropuesta ? idDePropuesta(id) : undefined,
    prueba,
    datosCrudos: crudos,
    fuente,
  };

  if (!generaPropuesta) {
    return {
      llamada,
      propuesta: null,
      sinPropuesta: corta ? `llamada de ${duracionSeg} s, muy corta` : "no era una propuesta de evento",
      urlsGrabacion,
    };
  }

  // Teléfono de contacto vacío = el número desde el que llamó.
  if (!d.contacto_telefono) d.contacto_telefono = telefonoLocal(numero);
  if (!d.contacto_canal) d.contacto_canal = "llamada";

  const propuesta: Omit<Propuesta, "asesorId"> = {
    id: idDePropuesta(id),
    origen: "real",
    canal: "llamada",
    creada: fin,
    datos: d,
    resumen,
    etapa: "nueva",
    primerContacto: null,
    notasInternas: [],
    historial: [{ ts: fin, de: null, a: "nueva", actor: "ia" }],
    llamadaId: id,
    prueba,
  };
  return { llamada, propuesta, urlsGrabacion };
}

function numeroODuracion(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = numero(v);
  return n > 0 ? Math.round(n) : null;
}

/** Una llamada, una propuesta: el id de la propuesta sale del de la llamada. */
export function idDePropuesta(callId: string): string {
  return `ph-${callId}`;
}
