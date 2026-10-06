// Etiquetas y catálogos del tablero de eventos. Puro: lo usan el servidor, el
// webhook y la pantalla.

import type {
  Asesor,
  CanalOrigen,
  Condicion,
  Espacio,
  Etapa,
  Modalidad,
  MotivoLlamada,
  Permisos,
  Servicio,
  SiNoPorDefinir,
  TipoEntrada,
  TipoEvento,
  Toldo,
} from "./tipos";

export const TIPOS_EVENTO: { id: TipoEvento; nombre: string; tag: string }[] = [
  { id: "concierto", nombre: "Concierto", tag: "Concierto" },
  { id: "deportivo", nombre: "Deportivo", tag: "Deportivo" },
  { id: "festival_feria", nombre: "Festival o feria", tag: "Festival" },
  { id: "fiesta_patronal", nombre: "Fiesta patronal", tag: "Fiesta patronal" },
  { id: "corporativo", nombre: "Corporativo", tag: "Corporativo" },
  { id: "educativo", nombre: "Colegio o universidad", tag: "Educativo" },
  { id: "religioso_comunitario", nombre: "Religioso o comunitario", tag: "Comunitario" },
  { id: "otro", nombre: "Otro", tag: "Otro" },
];

export function nombreTipo(t: TipoEvento): string {
  return TIPOS_EVENTO.find((x) => x.id === t)?.nombre ?? "Otro";
}

export function tagDeTipo(t: TipoEvento): string {
  return TIPOS_EVENTO.find((x) => x.id === t)?.tag ?? "Otro";
}

export const ETAPAS: { id: Etapa; nombre: string; color: string; abierta: boolean }[] = [
  { id: "nueva", nombre: "Nueva", color: "var(--ph-etapa-nueva)", abierta: true },
  { id: "revision", nombre: "En revisión", color: "var(--ph-etapa-revision)", abierta: true },
  { id: "contactado", nombre: "Contactado", color: "var(--ph-etapa-contactado)", abierta: true },
  { id: "negociacion", nombre: "En negociación", color: "var(--ph-etapa-negociacion)", abierta: true },
  { id: "confirmada", nombre: "Confirmada", color: "var(--ph-etapa-confirmada)", abierta: false },
  { id: "descartada", nombre: "Descartada", color: "var(--ph-etapa-descartada)", abierta: false },
];

export function etapaDef(e: Etapa) {
  return ETAPAS.find((x) => x.id === e) ?? ETAPAS[0];
}

export function esEtapa(v: unknown): v is Etapa {
  return typeof v === "string" && ETAPAS.some((e) => e.id === v);
}

/** Etapas donde todavía hay trabajo por hacer. */
export const ETAPAS_ABIERTAS: Etapa[] = ETAPAS.filter((e) => e.abierta).map((e) => e.id);

/** Motivos de descarte que se ofrecen en la pantalla. Se puede escribir otro. */
export const MOTIVOS_DESCARTE = [
  "Fecha choca con otro evento confirmado",
  "Aforo muy bajo para montar un punto de venta",
  "Condición comercial no conviene",
  "El organizador no respondió",
  "Ya tienen otra marca de pizza",
  "El evento se canceló",
];

/**
 * Los asesores de eventos (ficticios). Los ids son los mismos del staff de la
 * bandeja (lib/tenants/seeds/pizzahut.ts) para que una persona sea la misma en
 * los dos lados.
 */
export const ASESORES: Asesor[] = [
  { id: "s2", nombre: "Andrea Molina", iniciales: "AM" },
  { id: "s3", nombre: "Ricardo Ayala", iniciales: "RA" },
  { id: "s4", nombre: "Gabriela Quintanilla", iniciales: "GQ" },
  { id: "s5", nombre: "Mauricio Bonilla", iniciales: "MB" },
];

export function asesorDe(id: string | undefined | null): Asesor | undefined {
  return ASESORES.find((a) => a.id === id);
}

export const NOMBRE_CANAL: Record<CanalOrigen, string> = {
  llamada: "Llamada",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Messenger",
  correo: "Correo",
};

export const NOMBRE_ESPACIO: Record<Espacio, string> = {
  aire_libre: "Aire libre",
  techado: "Techado",
  mixto: "Mixto",
  "": "",
};

export const NOMBRE_ENTRADA: Record<TipoEntrada, string> = {
  gratuita: "Entrada gratuita",
  con_boleto: "Con boleto",
  "": "",
};

export const NOMBRE_MODALIDAD: Record<Modalidad, string> = {
  venta_en_sitio: "Venta en sitio",
  patrocinio: "Patrocinio",
  catering: "Catering",
  donacion: "Donación",
  mixta: "Mixta",
  por_definir: "Por definir",
};

export const NOMBRE_CONDICION: Record<Condicion, string> = {
  cuota_fija: "Cuota fija",
  comision: "Comisión sobre ventas",
  cuota_mas_comision: "Cuota más comisión",
  sin_costo: "Sin costo",
  canje: "Canje",
  por_definir: "Por definir",
};

export const NOMBRE_SINO: Record<SiNoPorDefinir, string> = {
  si: "Sí",
  no: "No",
  por_definir: "Por definir",
};

export const NOMBRE_SERVICIO: Record<Servicio, string> = {
  incluida: "Incluida",
  no_incluida: "No incluida",
  por_definir: "Por definir",
};

export const NOMBRE_TOLDO: Record<Toldo, string> = {
  incluido: "Incluido",
  no_incluido: "No incluido",
  por_definir: "Por definir",
};

export const NOMBRE_PERMISOS: Record<Permisos, string> = {
  organizador: "El organizador",
  pizza_hut: "Pizza Hut",
  por_definir: "Por definir",
};

export const NOMBRE_MOTIVO: Record<MotivoLlamada, string> = {
  propuesta: "Propuesta de evento",
  pedido: "Quería hacer un pedido",
  sucursal: "Consulta de sucursal",
  seguimiento: "Seguimiento de una propuesta",
  proveedor: "Proveedor ofreciendo servicios",
  equivocado: "Número equivocado",
  otro: "Otro tema",
};

export const DEPARTAMENTOS_SV = [
  "Ahuachapán",
  "Cabañas",
  "Chalatenango",
  "Cuscatlán",
  "La Libertad",
  "La Paz",
  "La Unión",
  "Morazán",
  "San Miguel",
  "San Salvador",
  "San Vicente",
  "Santa Ana",
  "Sonsonate",
  "Usulután",
];

/**
 * Un teléfono como se lee en El Salvador: "9255-4457". Llega como sea
 * ("+50392554457", "92554457", "9255 4457"); uno que no es de 8 dígitos
 * locales se deja como vino.
 */
export function telefonoLegible(v: string | null | undefined): string {
  const crudo = (v ?? "").trim();
  const d = crudo.replace(/\D/g, "");
  const local = d.length === 11 && d.startsWith("503") ? d.slice(3) : d;
  return local.length === 8 ? `${local.slice(0, 4)}-${local.slice(4)}` : crudo;
}

/** Horario del equipo de eventos. Lo de afuera lo atiende solo Daniela. */
export const HORARIO_OFICINA = { desde: 8, hasta: 17, dias: [1, 2, 3, 4, 5] };
export const TEXTO_HORARIO_OFICINA = "lunes a viernes, de 8:00 a 17:00";
