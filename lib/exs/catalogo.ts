// Catálogo de Express Shopping: etapas, sucursales, tarifas y nombres.
//
// Lo que se afirma del negocio sale de exs.sv (inicio, FAQs, términos y la
// calculadora de /cotizar), revisado el 2026-10-19:
//   - Tarifa aérea por libra o fracción: $4.99 de 1 a 5 lb, $4.49 desde 6 lb.
//     La calculadora cobra TODO el peso al precio del tramo (modo "tramo").
//   - IVA 13% sobre el valor en aduana (CIF), que es el precio más 10% de
//     flete y 1.5% de seguro. Desde $300 por vuelo entra también el DAI.
//   - Despachan tres veces por semana; por avión llega de 3 a 5 días hábiles
//     después del despacho.
//   - No consolidan: cada paquete se pesa y se cobra aparte, mínimo 1 lb.
//   - Se retira con DUI (pasaporte o carnet de residencia si es extranjero).
//   - 30 días calendario sin retirar = abandono.
//
// Lo que NO está publicado y el demo necesita (los días de los vuelos, el
// costo del domicilio) se dice como supuesto nuestro donde se use.

import type { Etapa, SucursalId, Tienda, Transportista } from "./tipos";

export interface EtapaDef {
  id: Etapa;
  nombre: string;
  /** Para donde no cabe el nombre entero (la línea de la ficha). */
  corto: string;
  /** Una línea para la columna del tablero. */
  detalle: string;
  /** Token del tema para el punto de la etapa (nunca texto). */
  color: string;
}

export const ETAPAS: readonly EtapaDef[] = [
  { id: "prealertado", nombre: "Prealertado", corto: "Prealerta", detalle: "Captura recibida, viene en camino a Miami", color: "var(--exs-etapa-prealertado)" },
  { id: "miami", nombre: "En bodega Miami", corto: "Miami", detalle: "Recibido y pesado", color: "var(--exs-etapa-miami)" },
  { id: "en_vuelo", nombre: "En vuelo", corto: "En vuelo", detalle: "Salió de Miami", color: "var(--exs-etapa-vuelo)" },
  { id: "aduana", nombre: "En aduana", corto: "Aduana", detalle: "Aterrizó, en trámite", color: "var(--exs-etapa-aduana)" },
  { id: "listo", nombre: "Listo para entregar", corto: "Listo", detalle: "Liberado por aduana", color: "var(--exs-etapa-listo)" },
  { id: "entregado", nombre: "Entregado", corto: "Entregado", detalle: "Retirado o entregado a domicilio", color: "var(--exs-etapa-entregado)" },
];

export const ORDEN_ETAPAS: readonly Etapa[] = ETAPAS.map((e) => e.id);

export function etapaDef(id: Etapa): EtapaDef {
  return ETAPAS.find((e) => e.id === id) ?? ETAPAS[0];
}

export function esEtapa(v: unknown): v is Etapa {
  return typeof v === "string" && ORDEN_ETAPAS.includes(v as Etapa);
}

/** La que sigue en la línea. La última no tiene siguiente. */
export function siguienteEtapa(e: Etapa): Etapa | null {
  const i = ORDEN_ETAPAS.indexOf(e);
  return i >= 0 && i < ORDEN_ETAPAS.length - 1 ? ORDEN_ETAPAS[i + 1] : null;
}

export interface SucursalDef {
  id: SucursalId;
  nombre: string;
  zona: string;
  semana: string;
  sabado: string;
}

// Las tres sucursales con el horario de la página de inicio. El sitio no
// publica la dirección exacta: se nombra la plaza y la zona, nada más.
export const SUCURSALES: readonly SucursalDef[] = [
  { id: "emanuel", nombre: "Plaza Emanuel", zona: "Antiguo Cuscatlán", semana: "8:30 a. m. a 5:30 p. m.", sabado: "8:30 a. m. a 12:30 p. m." },
  { id: "orion", nombre: "Plaza Orion Masferrer", zona: "Colonia Escalón", semana: "8:00 a. m. a 5:00 p. m.", sabado: "8:00 a. m. a 12:00 m." },
  { id: "santafe", nombre: "Plaza Santa Fe", zona: "Ciudad Merliot", semana: "8:30 a. m. a 5:30 p. m.", sabado: "8:30 a. m. a 12:30 p. m." },
];

export function sucursalDef(id: SucursalId): SucursalDef {
  return SUCURSALES.find((s) => s.id === id) ?? SUCURSALES[0];
}

export const TELEFONO_EXS = "2213-1270";
export const REGISTRO_URL = "casillero.exs.sv/registro";

// Tarifa aérea publicada. Se cobra el peso entero al precio de su tramo.
export const TARIFAS: readonly { desde: number; precio: number }[] = [
  { desde: 1, precio: 4.99 },
  { desde: 6, precio: 4.49 },
];

// Lo que aduana suma al precio para el valor CIF (no son cobros aparte).
export const FLETE_ADUANA = 0.1;
export const SEGURO_ADUANA = 0.015;
export const IVA = 0.13;
// Desde este monto POR VUELO (por cliente) aplica IVA + DAI, no solo IVA.
export const LIMITE_VUELO = 300;
// El volumen manda cuando excede el peso real en más de 30%.
export const HOLGURA_VOLUMEN = 1.3;
export const DIVISOR_VOLUMEN = 166;
export const DIAS_ABANDONO = 30;
// A cuántos días del abandono se avisa en el tablero.
export const DIAS_AVISO_ABANDONO = 7;

export const TIENDAS: readonly Tienda[] = [
  "Amazon",
  "SHEIN",
  "Temu",
  "Walmart",
  "eBay",
  "Sephora",
  "Macy's",
  "Nordstrom",
  "Old Navy",
  "H&M",
  "AliExpress",
  "RockAuto",
];

export const TRANSPORTISTAS: readonly Transportista[] = ["USPS", "UPS", "FedEx", "Amazon Logistics", "DHL"];

// Quién del equipo mueve las cosas. Mismos ids que la semilla de la bandeja.
export interface PersonaEquipo {
  id: string;
  nombre: string;
  iniciales: string;
  puesto: string;
}

export const EQUIPO: readonly PersonaEquipo[] = [
  { id: "me", nombre: "Gabriela Rivas", iniciales: "GR", puesto: "Gerencia" },
  { id: "s2", nombre: "Karla Menjívar", iniciales: "KM", puesto: "Servicio al cliente" },
  { id: "s3", nombre: "Josué Martínez", iniciales: "JM", puesto: "Aduana" },
  { id: "s4", nombre: "Daniel Ortiz", iniciales: "DO", puesto: "Bodega Miami" },
  { id: "s5", nombre: "Fátima Cruz", iniciales: "FC", puesto: "Sucursal Plaza Santa Fe" },
  { id: "s6", nombre: "Óscar Henríquez", iniciales: "OH", puesto: "Entregas a domicilio" },
  { id: "s7", nombre: "Ricardo Alvarado", iniciales: "RA", puesto: "Jefatura de operaciones" },
];

export function nombreActor(id: string): string {
  if (id === "ia") return "Lucía (IA)";
  if (id === "sistema") return "Automático";
  return EQUIPO.find((p) => p.id === id)?.nombre ?? "Equipo";
}

// Por qué aduana detiene un paquete. Salen de lo que piden los términos:
// declarar contenido y valor con veracidad y tener la factura de la compra.
export const MOTIVOS_RETENCION: readonly string[] = [
  "Aduana pide la factura de compra",
  "El valor declarado no coincide con la factura",
  "Aduana revisa el contenido del paquete",
];

// Zonas de entrega a domicilio del demo. El sitio dice que hay domicilio en
// zonas determinadas con un cargo según la zona, sin publicar cuáles ni
// cuánto: por eso aquí no hay montos.
export const ZONAS_DOMICILIO: readonly string[] = [
  "San Salvador",
  "Antiguo Cuscatlán",
  "Santa Tecla",
  "Soyapango",
  "Mejicanos",
  "San Marcos",
  "Ilopango",
  "Apopa",
];
