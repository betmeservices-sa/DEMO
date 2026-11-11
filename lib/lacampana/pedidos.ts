// Los pedidos de La Campana y su COLA DE COCINA. Todo es de demostración salvo
// los platos, precios y sucursales (lib/lacampana/menu.ts y sucursales.ts).
//
// POR QUÉ UNA COLA Y NO LA AGENDA. Un restaurante con 21 sucursales recibe
// cientos de pedidos al día: si cada uno ocupara un espacio en el calendario,
// la agenda dejaría de servir para lo que sí necesita fecha y hora (las
// reservaciones de mesa y los eventos). Por eso los pedidos NO van a la agenda:
// entran a la cola de su sucursal, y la cocina los toma en orden según su
// capacidad. Un pedido programado ("para el domingo a las 7") espera en la cola
// hasta su hora, también sin tocar la agenda.
//
// La lógica de la cola es pura (sin red ni navegador) para poder probarla:
// lib/__tests__/lacampana-pedidos.test.ts.

import { platoPorId } from "./menu";

export type EtapaPedido = "cola" | "cocina" | "listo" | "camino" | "entregado";
export type CanalPedido = "whatsapp" | "instagram" | "facebook" | "web" | "llamada";
export type TipoEntrega = "domicilio" | "retiro";

export interface LineaPedido {
  platoId: string;
  cantidad: number;
  nota?: string;
}

export interface Pedido {
  id: string;
  numero: number;
  cliente: string;
  telefono: string;
  canal: CanalPedido;
  sucursalId: string;
  tipo: TipoEntrega;
  direccion?: string;
  lineas: LineaPedido[];
  pago: "efectivo" | "tarjeta";
  etapa: EtapaPedido;
  /** Cuándo entró el pedido (ISO). Ordena la cola. */
  recibido: string;
  /** Si el cliente lo pidió para más tarde: no entra a cocina antes de esta hora. */
  programado?: string;
  /** Cuándo pasó a la etapa en la que está (ISO). */
  desde: string;
  /** true = Sofía tomó el pedido completo en el chat, sin una persona. */
  porSofia: boolean;
}

export const ETAPAS: Array<{ id: EtapaPedido; nombre: string; ayuda: string }> = [
  { id: "cola", nombre: "En cola", ayuda: "Recibido, espera turno de cocina" },
  { id: "cocina", nombre: "En cocina", ayuda: "Preparándose" },
  { id: "listo", nombre: "Listo", ayuda: "Para retirar o para el motorista" },
  { id: "camino", nombre: "En camino", ayuda: "Con el motorista" },
  { id: "entregado", nombre: "Entregado", ayuda: "Cerrado" },
];

export const CANAL_NOMBRE: Record<CanalPedido, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  web: "Sitio web",
  llamada: "Llamada",
};

/** Cuántos pedidos prepara a la vez la cocina de una sucursal (demo). */
export const CAPACIDAD_COCINA = 4;
/** Minutos que tarda un turno de cocina (demo). */
export const MINUTOS_POR_TURNO = 15;
/** Cuánto antes de su hora entra a cocina un pedido programado. */
export const MINUTOS_ANTES_PROGRAMADO = 20;

export function totalPedido(p: Pick<Pedido, "lineas">): number {
  return p.lineas.reduce((t, l) => t + (platoPorId(l.platoId)?.precio ?? 0) * l.cantidad, 0);
}

export function unidadesPedido(p: Pick<Pedido, "lineas">): number {
  return p.lineas.reduce((t, l) => t + l.cantidad, 0);
}

/** ¿Ya le toca? Un pedido programado espera hasta poco antes de su hora. */
export function listoParaCocina(p: Pedido, ahora: number): boolean {
  if (!p.programado) return true;
  return Date.parse(p.programado) - MINUTOS_ANTES_PROGRAMADO * 60_000 <= ahora;
}

/**
 * La cola de una sucursal, en el orden en que la cocina los va a tomar: primero
 * los que ya pueden entrar (por hora de llegada), después los programados (por
 * su hora).
 */
export function colaDe(pedidos: Pedido[], sucursalId: string, ahora: number): Pedido[] {
  const enCola = pedidos.filter((p) => p.sucursalId === sucursalId && p.etapa === "cola");
  const ya = enCola.filter((p) => listoParaCocina(p, ahora)).sort((a, b) => a.recibido.localeCompare(b.recibido));
  const luego = enCola
    .filter((p) => !listoParaCocina(p, ahora))
    .sort((a, b) => (a.programado ?? "").localeCompare(b.programado ?? ""));
  return [...ya, ...luego];
}

export function enCocina(pedidos: Pedido[], sucursalId: string): number {
  return pedidos.filter((p) => p.sucursalId === sucursalId && p.etapa === "cocina").length;
}

export function hayLugarEnCocina(pedidos: Pedido[], sucursalId: string): boolean {
  return enCocina(pedidos, sucursalId) < CAPACIDAD_COCINA;
}

/**
 * Minutos que faltan para que un pedido en cola entre a cocina. Con la cocina
 * llena, cada CAPACIDAD_COCINA pedidos delante suman un turno. Un programado
 * espera, como mínimo, hasta su hora.
 */
export function esperaEstimada(p: Pedido, pedidos: Pedido[], ahora: number): number {
  if (p.etapa !== "cola") return 0;
  const cola = colaDe(pedidos, p.sucursalId, ahora);
  const delante = cola.findIndex((x) => x.id === p.id);
  const libres = CAPACIDAD_COCINA - enCocina(pedidos, p.sucursalId);
  const turnos = delante < libres ? 0 : Math.floor((delante - Math.max(0, libres)) / CAPACIDAD_COCINA) + 1;
  let min = turnos * MINUTOS_POR_TURNO;
  if (p.programado) {
    const hasta = (Date.parse(p.programado) - MINUTOS_ANTES_PROGRAMADO * 60_000 - ahora) / 60_000;
    min = Math.max(min, Math.ceil(hasta));
  }
  return Math.max(0, min);
}

/** La etapa que sigue. Retiro salta "en camino": lo recoge el cliente. */
export function siguienteEtapa(p: Pedido): EtapaPedido | null {
  switch (p.etapa) {
    case "cola":
      return "cocina";
    case "cocina":
      return "listo";
    case "listo":
      return p.tipo === "domicilio" ? "camino" : "entregado";
    case "camino":
      return "entregado";
    default:
      return null;
  }
}

/**
 * Mueve un pedido a la etapa siguiente. Si con eso se libera un lugar en la
 * cocina y `autoCola` está activo, entra el primero de la cola que ya pueda.
 * Nunca deja más de CAPACIDAD_COCINA pedidos en cocina.
 */
export function avanzar(pedidos: Pedido[], id: string, ahora: number, autoCola = true): Pedido[] {
  const p = pedidos.find((x) => x.id === id);
  if (!p) return pedidos;
  const sig = siguienteEtapa(p);
  if (!sig) return pedidos;
  if (sig === "cocina" && !hayLugarEnCocina(pedidos, p.sucursalId)) return pedidos;
  const iso = new Date(ahora).toISOString();
  let lista = pedidos.map((x) => (x.id === id ? { ...x, etapa: sig, desde: iso } : x));
  if (autoCola && p.etapa === "cocina") lista = llenarCocina(lista, p.sucursalId, ahora);
  return lista;
}

/** Pasa a cocina los primeros de la cola hasta llenar la capacidad. */
export function llenarCocina(pedidos: Pedido[], sucursalId: string, ahora: number): Pedido[] {
  let lista = pedidos;
  const iso = new Date(ahora).toISOString();
  for (const sig of colaDe(lista, sucursalId, ahora)) {
    if (!hayLugarEnCocina(lista, sucursalId) || !listoParaCocina(sig, ahora)) break;
    lista = lista.map((x) => (x.id === sig.id ? { ...x, etapa: "cocina" as const, desde: iso } : x));
  }
  return lista;
}

// ─────────────────────────── La muestra ───────────────────────────

type Semilla = Omit<Pedido, "id" | "recibido" | "desde" | "programado"> & {
  hace: number; // minutos desde que entró
  enEtapaHace?: number; // minutos en la etapa actual
  programadoEn?: number; // minutos desde ahora
};

const SEMILLA: Semilla[] = [
  // Plaza Mundo Soyapango: la cocina llena y cola larga, para enseñar la cola.
  { numero: 4821, cliente: "Daniela Rivas", telefono: "+503 7311 0420", canal: "instagram", sucursalId: "plaza-mundo-soyapango", tipo: "retiro", lineas: [{ platoId: "promo-burritos", cantidad: 1 }], pago: "tarjeta", etapa: "cola", hace: 9, porSofia: true },
  { numero: 4816, cliente: "José Martínez", telefono: "+503 7720 1184", canal: "whatsapp", sucursalId: "plaza-mundo-soyapango", tipo: "domicilio", direccion: "Res. Los Ángeles, pje. 3 #12, Soyapango", lineas: [{ platoId: "parrillada-para-2", cantidad: 1 }, { platoId: "horchata-de-32-oz", cantidad: 2 }], pago: "efectivo", etapa: "cocina", hace: 21, enEtapaHace: 8, porSofia: true },
  { numero: 4817, cliente: "Ana Lucía Pérez", telefono: "+503 7055 2290", canal: "web", sucursalId: "plaza-mundo-soyapango", tipo: "retiro", lineas: [{ platoId: "taquiza", cantidad: 1 }], pago: "tarjeta", etapa: "cocina", hace: 19, enEtapaHace: 6, porSofia: false },
  { numero: 4818, cliente: "Mario Henríquez", telefono: "+503 7612 0031", canal: "whatsapp", sucursalId: "plaza-mundo-soyapango", tipo: "domicilio", direccion: "Col. Guadalupe, calle principal #45", lineas: [{ platoId: "churrasco-campana", cantidad: 2 }, { platoId: "soda-lata", cantidad: 2 }], pago: "tarjeta", etapa: "cocina", hace: 17, enEtapaHace: 5, porSofia: true },
  { numero: 4819, cliente: "Claudia Ramos", telefono: "+503 7488 9012", canal: "facebook", sucursalId: "plaza-mundo-soyapango", tipo: "domicilio", direccion: "Urb. Montes de San Bartolo IV, senda 7", lineas: [{ platoId: "tacos-de-birria", cantidad: 3 }], pago: "efectivo", etapa: "cocina", hace: 14, enEtapaHace: 3, porSofia: true },
  { numero: 4822, cliente: "Óscar Mejía", telefono: "+503 7901 3345", canal: "whatsapp", sucursalId: "plaza-mundo-soyapango", tipo: "domicilio", direccion: "Col. Santa Lucía, av. B #9", lineas: [{ platoId: "campacheros", cantidad: 1 }], pago: "tarjeta", etapa: "cola", hace: 7, porSofia: true },
  { numero: 4824, cliente: "Brenda Castillo", telefono: "+503 7166 8820", canal: "llamada", sucursalId: "plaza-mundo-soyapango", tipo: "retiro", lineas: [{ platoId: "hamburguesa-la-mexicana", cantidad: 2 }, { platoId: "entrada-orden-de-papas", cantidad: 1 }], pago: "efectivo", etapa: "cola", hace: 4, porSofia: false },
  { numero: 4825, cliente: "Iglesia Vida Nueva", telefono: "+503 7023 5521", canal: "whatsapp", sucursalId: "plaza-mundo-soyapango", tipo: "retiro", lineas: [{ platoId: "el-tipico", cantidad: 12 }], pago: "tarjeta", etapa: "cola", hace: 40, programadoEn: 18 * 60, porSofia: true },

  // Plaza Centro: el pedido de Karla, de la bandeja.
  { numero: 4823, cliente: "Karla Villalta", telefono: "+503 7622 1190", canal: "whatsapp", sucursalId: "plaza-centro", tipo: "domicilio", direccion: "Col. Escalón, pje. Los Pinos #14, frente al parque", lineas: [{ platoId: "parrillada-para-4", cantidad: 1 }, { platoId: "taquiza-de-birria", cantidad: 1 }, { platoId: "horchata-de-32-oz", cantidad: 2 }], pago: "tarjeta", etapa: "cola", hace: 2, porSofia: true },
  { numero: 4812, cliente: "Luis Alvarado", telefono: "+503 7845 6610", canal: "web", sucursalId: "plaza-centro", tipo: "retiro", lineas: [{ platoId: "nachos-campana", cantidad: 1 }, { platoId: "quesadillas-mexicanas", cantidad: 1 }], pago: "tarjeta", etapa: "cocina", hace: 16, enEtapaHace: 9, porSofia: false },

  // Metrocentro Santa Ana: el de Fernando ya listo para retirar.
  { numero: 4808, cliente: "Fernando Ayala", telefono: "+503 6144 7752", canal: "whatsapp", sucursalId: "metrocentro-santa-ana", tipo: "retiro", lineas: [{ platoId: "churrasco-campana", cantidad: 2, nota: "Corte puyazo" }, { platoId: "te-de-limon-de-32-oz", cantidad: 2 }], pago: "tarjeta", etapa: "listo", hace: 46, enEtapaHace: 6, porSofia: true },
  { numero: 4814, cliente: "Rocío Lemus", telefono: "+503 7290 4471", canal: "instagram", sucursalId: "metrocentro-santa-ana", tipo: "domicilio", direccion: "Col. IVU, calle 2 #18, Santa Ana", lineas: [{ platoId: "mi-media-campana", cantidad: 1 }], pago: "efectivo", etapa: "cocina", hace: 12, enEtapaHace: 4, porSofia: true },

  // Lourdes y Valle Dulce, de la bandeja.
  { numero: 4810, cliente: "Gabriela Menjívar", telefono: "+503 7811 4520", canal: "instagram", sucursalId: "lourdes", tipo: "retiro", lineas: [{ platoId: "nachos-campana-de-birria", cantidad: 1 }], pago: "efectivo", etapa: "cocina", hace: 25, enEtapaHace: 10, porSofia: true },
  { numero: 4820, cliente: "Ricardo Portillo", telefono: "+503 7533 1290", canal: "facebook", sucursalId: "valle-dulce", tipo: "domicilio", direccion: "Res. Valle Dulce, pol. F #23, Apopa", lineas: [{ platoId: "mi-media-campana", cantidad: 1 }], pago: "efectivo", etapa: "cola", hace: 11, porSofia: true },

  // En camino y entregados.
  { numero: 4805, cliente: "Wilfredo Chacón", telefono: "+503 7208 9943", canal: "whatsapp", sucursalId: "san-martin", tipo: "domicilio", direccion: "Col. San Martín, calle al lago #7", lineas: [{ platoId: "hamburguesa-la-texana", cantidad: 2 }, { platoId: "entrada-orden-de-papas", cantidad: 1 }], pago: "efectivo", etapa: "camino", hace: 52, enEtapaHace: 12, porSofia: true },
  { numero: 4809, cliente: "Andrea Cáceres", telefono: "+503 7622 9001", canal: "whatsapp", sucursalId: "unicentro-metropolis", tipo: "domicilio", direccion: "Col. Zacamil, edif. 14, apto 3", lineas: [{ platoId: "parrillada-para-2", cantidad: 1 }], pago: "tarjeta", etapa: "camino", hace: 38, enEtapaHace: 7, porSofia: true },
  { numero: 4801, cliente: "Mauricio Rosales", telefono: "+503 7400 2231", canal: "web", sucursalId: "unicentro-metropolis", tipo: "domicilio", direccion: "Col. Metrópolis, calle 4 #31", lineas: [{ platoId: "campacheros", cantidad: 1 }], pago: "tarjeta", etapa: "entregado", hace: 95, enEtapaHace: 40, porSofia: false },
  { numero: 4803, cliente: "Kevin Bonilla", telefono: "+503 7311 8890", canal: "instagram", sucursalId: "apopa", tipo: "retiro", lineas: [{ platoId: "tacos-de-birria", cantidad: 2 }, { platoId: "jamaica-de-32-oz", cantidad: 2 }], pago: "efectivo", etapa: "entregado", hace: 80, enEtapaHace: 35, porSofia: true },
  { numero: 4806, cliente: "Valeria Zelaya", telefono: "+503 7199 2210", canal: "facebook", sucursalId: "metrocentro-sonsonate", tipo: "domicilio", direccion: "Col. Sensunapán, calle 5, Sonsonate", lineas: [{ platoId: "carne-tipica-campana", cantidad: 2 }], pago: "tarjeta", etapa: "entregado", hace: 70, enEtapaHace: 15, porSofia: true },
];

export function semillaPedidos(ahora: number): Pedido[] {
  const iso = (min: number) => new Date(ahora - min * 60_000).toISOString();
  return SEMILLA.map(({ hace, enEtapaHace, programadoEn, ...p }) => ({
    ...p,
    id: `P-${p.numero}`,
    recibido: iso(hace),
    desde: iso(enEtapaHace ?? hace),
    programado: programadoEn !== undefined ? new Date(ahora + programadoEn * 60_000).toISOString() : undefined,
  }));
}

// ───────────────────── Un pedido nuevo (simulado) ─────────────────────

const ENTRANTES: Array<Pick<Pedido, "cliente" | "telefono" | "canal" | "sucursalId" | "tipo" | "direccion" | "lineas" | "pago">> = [
  { cliente: "Sofía Navarrete", telefono: "+503 7650 2208", canal: "whatsapp", sucursalId: "plaza-mundo-soyapango", tipo: "domicilio", direccion: "Col. Prados de Venecia, senda 2 #8", lineas: [{ platoId: "parrillada-para-2", cantidad: 1 }, { platoId: "horchata-de-21-oz", cantidad: 2 }], pago: "tarjeta" },
  { cliente: "Diego Cornejo", telefono: "+503 7208 3311", canal: "instagram", sucursalId: "plaza-centro", tipo: "retiro", lineas: [{ platoId: "promo-tortas", cantidad: 1 }], pago: "efectivo" },
  { cliente: "Emily Carter", telefono: "+503 7444 0102", canal: "facebook", sucursalId: "metrocentro-santa-ana", tipo: "domicilio", direccion: "Col. El Palmar, calle 1 #3, Santa Ana", lineas: [{ platoId: "quesobirria", cantidad: 1 }], pago: "tarjeta" },
  { cliente: "Óscar Peña", telefono: "+503 6144 0055", canal: "whatsapp", sucursalId: "plaza-mundo-soyapango", tipo: "retiro", lineas: [{ platoId: "tacos-de-birria", cantidad: 2 }, { platoId: "soda-lata", cantidad: 2 }], pago: "efectivo" },
];

export function pedidoEntrante(pedidos: Pedido[], ahora: number): Pedido {
  const numero = Math.max(4800, ...pedidos.map((p) => p.numero)) + 1;
  const base = ENTRANTES[numero % ENTRANTES.length];
  const iso = new Date(ahora).toISOString();
  return { ...base, id: `P-${numero}`, numero, etapa: "cola", recibido: iso, desde: iso, porSofia: base.canal !== "web" };
}
