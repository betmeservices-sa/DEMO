// El catalogo de la sala de ventas y los pasos por los que pasa una venta.
//
// Es el equivalente de crediq-requisitos para el tablero de autos, y cambia lo
// que se persigue: alla se persiguen PAPELES (que el cliente mande el DUI),
// aca se persiguen MOMENTOS (que venga a manejar la unidad, que acepte la
// propuesta, que deje la prima). Por eso los pasos no son documentos que se
// aprueban o se devuelven: son cosas que pasan, que se pueden agendar y que se
// pueden trabar.
//
// Los precios son los de lista de Nissan El Salvador que ya usa el guion de
// Sofia (ver lib/tenants/grupoq.ts). Se muestran SIEMPRE como referencia
// ("desde"), nunca como precio cerrado: el precio final lo autoriza el gerente
// y queda en la propuesta de cada caso.

export type Categoria = "pickup" | "suv" | "van";

export interface Modelo {
  /** Llave estable. Es lo que se guarda en la ficha; nunca cambia. */
  id: string;
  nombre: string;
  categoria: Categoria;
  /** Precio de lista en dolares, como arranque de conversacion. */
  desde: number;
  /** Una linea de por que lo compran, para quien abre la ficha sin saber. */
  gancho: string;
}

export const MODELOS: Modelo[] = [
  {
    id: "frontier-dc",
    nombre: "Frontier Doble Cabina",
    categoria: "pickup",
    desde: 40000,
    gancho: "Diésel 2.5, carga de 1,015 kg y remolque de 3,500 kg",
  },
  {
    id: "frontier-cs",
    nombre: "Frontier Cabina Simple",
    categoria: "pickup",
    desde: 35000,
    gancho: "La de trabajo: plataforma larga y el costo por kilómetro más bajo",
  },
  {
    id: "xtrail-epower",
    nombre: "X-Trail e-POWER",
    categoria: "suv",
    desde: 22000,
    gancho: "Híbrida que no se enchufa, para quien hace ciudad todos los días",
  },
  {
    id: "xtrail",
    nombre: "X-Trail",
    categoria: "suv",
    desde: 35000,
    gancho: "Gasolina, tres filas y el maletero más grande de la gama",
  },
  {
    id: "kicks",
    nombre: "Kicks",
    categoria: "suv",
    desde: 25000,
    gancho: "La puerta de entrada a la marca: primer carro o segundo de la casa",
  },
  {
    id: "qashqai",
    nombre: "Qashqai",
    categoria: "suv",
    desde: 30000,
    gancho: "El salto del Kicks para quien quiere equipamiento sin llegar a X-Trail",
  },
  {
    id: "pathfinder",
    nombre: "Pathfinder",
    categoria: "suv",
    desde: 40000,
    gancho: "Siete plazas de verdad, para familia grande y carretera",
  },
  {
    id: "urvan",
    nombre: "Urvan",
    categoria: "van",
    desde: 30000,
    gancho: "Transporte de personal y reparto, el que compran las empresas",
  },
];

export const MODELO: Record<string, Modelo> = Object.fromEntries(MODELOS.map((m) => [m.id, m]));

/**
 * El modelo que corresponde a lo guardado en la ficha.
 *
 * Acepta el id y tambien el nombre escrito a mano: los leads viejos y los que
 * entran por chat traen "Kicks" o "la Frontier", no un id. Lo que no se
 * reconoce no se fuerza a nada, se devuelve null y la pantalla lo muestra tal
 * como vino.
 */
export function modeloDe(v: string | null | undefined): Modelo | null {
  if (!v) return null;
  const t = v.trim().toLowerCase();
  return (
    MODELOS.find((m) => m.id === t) ??
    MODELOS.find((m) => m.nombre.toLowerCase() === t) ??
    MODELOS.find((m) => t.includes(m.nombre.toLowerCase())) ??
    null
  );
}

/** Como se le dice al modelo en pantalla. */
export function nombreDeModelo(v: string | null | undefined): string {
  return modeloDe(v)?.nombre ?? (v?.trim() || "sin modelo");
}

export const CATEGORIA: Record<Categoria, string> = {
  pickup: "Pick-up",
  suv: "SUV",
  van: "Van",
};

// ---- Los pasos de la venta --------------------------------------------------

export interface Paso {
  /** Llave estable dentro de la ficha. */
  id: string;
  nombre: string;
  /** Que es estar aca, para quien abre el tablero por primera vez. */
  ayuda: string;
  /**
   * Si el paso se puede dejar puesto en el calendario antes de que ocurra. La
   * prueba de manejo y la entrega se agendan; una cotizacion se manda y ya.
   */
  agendable: boolean;
  /**
   * Los pasos opcionales no cuentan para el avance: no todo el mundo entrega un
   * usado a cuenta, y contarlo dejaria a media sala de ventas en 4 de 5 para
   * siempre.
   */
  opcional?: boolean;
}

export const PASOS: Paso[] = [
  {
    id: "cotizacion",
    nombre: "Cotización enviada",
    ayuda: "Ya tiene por escrito el precio, la prima y la cuota estimada",
    agendable: false,
  },
  {
    id: "prueba",
    nombre: "Prueba de manejo",
    ayuda: "Vino a manejar la unidad, que es lo que más cierra ventas",
    agendable: true,
  },
  {
    id: "usado",
    nombre: "Usado valuado",
    ayuda: "Trae un vehículo a cuenta y ya se le puso valor",
    agendable: true,
    opcional: true,
  },
  {
    id: "propuesta",
    nombre: "Propuesta en firme",
    ayuda: "Precio final autorizado por el gerente, con descuento y usado adentro",
    agendable: false,
  },
  {
    id: "separacion",
    nombre: "Unidad separada",
    ayuda: "Dejó prima o depósito: la unidad sale de disponible",
    agendable: false,
  },
  {
    id: "entrega",
    nombre: "Entrega",
    ayuda: "Papelería, seguro y placas listos, con cita de entrega",
    agendable: true,
  },
];

export const PASO: Record<string, Paso> = Object.fromEntries(PASOS.map((p) => [p.id, p]));

/** Los pasos que SI cuentan para el avance de la venta. */
export const PASOS_REQUERIDOS = PASOS.filter((p) => !p.opcional);

/**
 * Por que se traba una venta. Cerrado a proposito: es lo que despues se reporta
 * en "donde se traba la venta", y una lista abierta ahi no se puede sumar.
 */
export const MOTIVOS_TRABA = [
  { id: "precio", nombre: "El precio no le cierra" },
  { id: "cuota", nombre: "La cuota le queda alta" },
  { id: "credito", nombre: "No le pasó el crédito" },
  { id: "inventario", nombre: "No hay la unidad o el color" },
  { id: "usado", nombre: "No acepta el valor de su usado" },
  { id: "tiempo", nombre: "Lo está pensando" },
  { id: "competencia", nombre: "Está viendo otra marca" },
  { id: "otro", nombre: "Otro" },
] as const;

export type MotivoTraba = (typeof MOTIVOS_TRABA)[number]["id"];

export function nombreDeTraba(id: string | null | undefined): string {
  return MOTIVOS_TRABA.find((m) => m.id === id)?.nombre ?? "Sin motivo";
}

export function esMotivoTraba(v: unknown): v is MotivoTraba {
  return typeof v === "string" && MOTIVOS_TRABA.some((m) => m.id === v);
}
