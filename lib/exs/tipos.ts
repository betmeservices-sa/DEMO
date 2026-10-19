// El dominio de Express Shopping: casilleros, paquetes y vuelos.
//
// Express Shopping trae a El Salvador lo que la gente compra en tiendas de
// Estados Unidos. Cada cliente tiene un casillero (una dirección en Miami con
// su código); compra en Amazon, SHEIN o Walmart, manda la captura del tracking
// por WhatsApp (la prealerta), el paquete llega a la bodega de Miami, sale en
// uno de los vuelos de la semana, pasa por aduana y queda listo para retirar
// en una sucursal o para llevarlo a domicilio.
//
// Todo el panel gira alrededor de esa línea: un paquete está siempre en UNA
// etapa, y lo que le pasa encima (retenido en aduana, pagado, entregado) se
// guarda como movimientos aparte, igual que el tablero de eventos.

export type Etapa = "prealertado" | "miami" | "en_vuelo" | "aduana" | "listo" | "entregado";

export type SucursalId = "emanuel" | "orion" | "santafe";

export type Tienda =
  | "Amazon"
  | "SHEIN"
  | "Temu"
  | "Walmart"
  | "eBay"
  | "Sephora"
  | "Macy's"
  | "Nordstrom"
  | "Old Navy"
  | "H&M"
  | "AliExpress"
  | "RockAuto";

export type Transportista = "USPS" | "UPS" | "FedEx" | "Amazon Logistics" | "DHL";

export type Entrega =
  | { tipo: "sucursal"; sucursal: SucursalId }
  | { tipo: "domicilio"; zona: string; direccion: string };

/** Lo que la IA leyó de la captura que mandó el cliente por el chat. */
export interface LecturaCaptura {
  tracking: string;
  tienda: Tienda;
  transportista: Transportista;
  contenido: string;
  categoria: string;
  valor: number;
  /** 0 a 1. Por debajo de 0.8 se pide confirmar el dato antes de prealertar. */
  confianza: number;
  /** El dato que no se leyó bien, para decírselo a quien revisa. */
  dudoso?: "valor" | "tracking" | "contenido";
}

export interface Prealerta {
  /** "captura" = la leyó la IA del chat; "manual" = la escribió alguien del equipo. */
  origen: "captura" | "manual";
  ts: string;
  capturaUrl?: string;
  lectura?: LecturaCaptura;
  /** La conversación de la bandeja de donde salió. */
  conversationId?: string;
}

/**
 * Lo que le pasó a un paquete, en orden. Cada evento es también el aviso de
 * WhatsApp que recibió el cliente (lib/exs/avisos.ts).
 *   - una etapa: llegó a esa etapa
 *   - "retenido": aduana lo detuvo
 *   - "pagado": pagó envío e impuestos
 *   - "cambio_vuelo": se pasó a otro vuelo
 *   - "recordatorio": se le recordó que lo retire antes del abandono
 */
export type TipoEvento = Etapa | "retenido" | "pagado" | "cambio_vuelo" | "recordatorio";

export interface EventoPaquete {
  ts: string;
  tipo: TipoEvento;
  /** Id de la ficha del equipo, "ia" o "sistema" (los cambios de un vuelo entero). */
  actor: string;
  /** El movimiento que lo generó, si se hizo en este demo (no viene de la muestra). */
  movId?: string;
  /** Lo que haga falta para el aviso: el motivo de la retención, el vuelo nuevo. */
  detalle?: string;
}

export interface Medidas {
  largo: number;
  ancho: number;
  alto: number;
}

export interface Paquete {
  id: string;
  clienteId: string;
  tracking: string;
  tienda: Tienda;
  transportista: Transportista;
  contenido: string;
  /** Categoría para aduana, con los nombres de la calculadora del sitio. */
  categoria: string;
  /** Lo que pagó en la tienda, en dólares. Es la base del IVA. */
  valor: number;
  /** Peso real en libras. Sin pesar hasta que llega a Miami. */
  pesoLb?: number;
  /** En pulgadas. Solo los que se midieron en bodega. */
  medidas?: Medidas;
  etapa: Etapa;
  vueloId?: string;
  /** Sin prealerta = llegó a Miami y nadie mandó captura ni factura. */
  prealerta?: Prealerta;
  retenido?: { motivo: string; desde: string };
  entrega: Entrega;
  pagado: boolean;
  historial: EventoPaquete[];
  creado: string;
  /** Quién lo retiró, con el DUI verificado en mostrador. */
  entregadoA?: string;
}

export interface Cliente {
  id: string;
  /** El código que va en la dirección de compra. */
  casillero: string;
  nombre: string;
  telefono: string;
  correo?: string;
  sucursal: SucursalId;
  domicilio?: { zona: string; direccion: string };
  /** Fecha de alta del casillero, "YYYY-MM-DD". */
  desde: string;
  /** La conversación de la bandeja con este cliente, si tiene. */
  conversationId?: string;
  notas?: string;
}

export type EstadoVuelo = "programado" | "en_vuelo" | "en_aduana" | "liberado";

export interface Vuelo {
  id: string;
  /** Guía aérea madre del despacho. */
  guia: string;
  /** Sale de Miami (ISO). */
  sale: string;
  /** Aterriza en El Salvador (ISO). */
  llega: string;
  /** Lo que llegue a bodega después de esta hora se va en el siguiente. */
  corte: string;
  estado: EstadoVuelo;
}

export type TipoMovimiento =
  | "etapa"
  | "prealerta"
  | "retener"
  | "liberar"
  | "pagado"
  | "vuelo"
  | "recordatorio"
  | "despacho";

/**
 * Lo que una persona hizo en el demo. Se guarda en orden y no pisa la muestra:
 * la muestra se vuelve a armar en cada carga y los movimientos se aplican
 * encima, como en el tablero de eventos.
 */
export interface Movimiento {
  id: string;
  /** El paquete; en "despacho", el vuelo. */
  objetivo: string;
  tipo: TipoMovimiento;
  ts: string;
  actor: string;
  /**
   * etapa: { a } · prealerta: { paquete } · retener: { motivo } · liberar: {}
   * pagado: {} · vuelo: { vueloId } · recordatorio: {} · despacho: { estado }
   */
  valor: Record<string, unknown>;
}

/** Un aviso de WhatsApp que recibió el cliente. */
export interface Aviso {
  id: string;
  paqueteId: string;
  clienteId: string;
  ts: string;
  texto: string;
  /** El movimiento que lo generó, si se hizo en este demo. */
  movId?: string;
}
