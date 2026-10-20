// El dominio de ShopUSA: clientes, paquetes y cargas.
//
// ShopUSA (SUSA, Ltda. de C.V.) trae a El Salvador lo que la gente compra en
// tiendas en línea de Estados Unidos. Cada cliente tiene su código: compra en
// Amazon, SHEIN o Target con la dirección de la bodega de Miami (en Medley,
// Florida), prealerta la compra con su factura, el paquete se recibe y se pesa
// en la bodega, sale de Miami en la carga más próxima, pasa por aduana y queda
// listo para retirar en la sucursal que eligió o para llevarlo a domicilio.
//
// Todo el panel gira alrededor de esa línea: un paquete está siempre en UNA
// etapa, y lo que le pasa encima (selectivo rojo en aduana, pagado, entregado)
// se guarda como movimientos aparte, igual que el tablero de eventos.

/**
 * Las etapas son los estados del rastreo de shopusa.la, con sus códigos:
 * pendiente (PR/RE, "Pendiente Recepción"), miami (RM, "En bodega Florida"),
 * transito (DE, "En Tránsito"), aduana (RA, "Recibido en Aduana"), listo (LE,
 * "Listo para entregar") y entregado (EN).
 */
export type Etapa = "pendiente" | "miami" | "transito" | "aduana" | "listo" | "entregado";

export type SucursalId =
  | "soyapango"
  | "mascota"
  | "salvador_del_mundo"
  | "santa_tecla"
  | "metro_sur"
  | "santa_ana"
  | "santa_elena";

export type Tienda =
  | "Amazon"
  | "SHEIN"
  | "eBay"
  | "Target"
  | "Walmart"
  | "Sephora"
  | "Ulta"
  | "ColourPop"
  | "Macy's"
  | "Nordstrom Rack"
  | "Old Navy"
  | "Carter's"
  | "H&M"
  | "IKEA"
  | "AliExpress";

export type Transportista = "USPS" | "UPS" | "FedEx" | "Amazon Logistics" | "DHL";

/** Dentro o fuera del área metropolitana: cambia el cargo del domicilio. */
export type AreaEntrega = "metro" | "fuera";

export type Entrega =
  | { tipo: "sucursal"; sucursal: SucursalId }
  | { tipo: "domicilio"; zona: string; direccion: string; area: AreaEntrega };

/** Lo que la IA leyó de la captura (o factura) que mandó el cliente por el chat. */
export interface LecturaCaptura {
  tracking: string;
  tienda: Tienda;
  transportista: Transportista;
  contenido: string;
  /** La categoría de la calculadora de shopusa.la: de ella sale el DAI o la tarifa fija. */
  categoria: string;
  valor: number;
  /** 0 a 1. Por debajo de 0.8 se pide confirmar el dato antes de prealertar. */
  confianza: number;
  /** El dato que no se leyó bien, para decírselo a quien revisa. */
  dudoso?: "valor" | "tracking" | "contenido";
}

export interface Prealerta {
  /**
   * "captura" = la leyó la IA de la captura o factura que mandó al chat;
   * "web" = el cliente llenó el formulario de shopusa.la;
   * "equipo" = la escribió alguien de ShopUSA.
   */
  origen: "captura" | "web" | "equipo";
  ts: string;
  capturaUrl?: string;
  lectura?: LecturaCaptura;
  /** La conversación de la bandeja de donde salió. */
  conversationId?: string;
}

/**
 * Lo que le pasó a un paquete, en orden. Cada evento es también el aviso de
 * WhatsApp que recibió el cliente (lib/shopusa/avisos.ts).
 *   - una etapa: llegó a esa etapa
 *   - "selectivo": aduana le dio selectivo rojo (lo detuvo para revisarlo)
 *   - "pagado": pagó flete e impuestos
 *   - "en_camino": salió de la sucursal a su domicilio (EC en el rastreo)
 *   - "traslado": se cambió la sucursal donde lo retira
 *   - "recordatorio": se le recordó que lo retire
 */
export type TipoEvento = Etapa | "selectivo" | "pagado" | "en_camino" | "traslado" | "recordatorio";

export interface EventoPaquete {
  ts: string;
  tipo: TipoEvento;
  /** Id de la ficha del equipo, "ia" o "sistema" (los cambios de una carga entera). */
  actor: string;
  /** El movimiento que lo generó, si se hizo en este demo (no viene de la muestra). */
  movId?: string;
  /** Lo que haga falta para el aviso: el motivo del selectivo, la sucursal nueva. */
  detalle?: string;
  /**
   * El evento vino con el de otro paquete del mismo envío (el pago de los
   * paquetes consolidados): el aviso lo manda solo el paquete que lo originó.
   */
  acompana?: string;
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
  /** Categoría de la calculadora de shopusa.la (catalogo.CATEGORIAS). */
  categoria: string;
  /** Lo que dice la factura, en dólares. Es la base del IVA y del DAI. */
  valor: number;
  /** Peso real en libras. Sin pesar hasta que llega a Miami. */
  pesoLb?: number;
  /** En pulgadas. Solo los que se midieron en bodega. */
  medidas?: Medidas;
  etapa: Etapa;
  cargaId?: string;
  /** Sin prealerta = llegó a Miami y nadie mandó la factura antes. */
  prealerta?: Prealerta;
  selectivo?: { motivo: string; desde: string };
  entrega: Entrega;
  /** Se cambió de sucursal; `cobra` = sin prealerta anticipada, lleva el cargo de traslado. */
  traslado?: { cobra: boolean };
  pagado: boolean;
  historial: EventoPaquete[];
  creado: string;
  /** Quién lo retiró, con el DUI verificado en mostrador. */
  entregadoA?: string;
}

export interface Cliente {
  id: string;
  /** El código de cliente que va en la dirección de compra (Suite 503 + código). */
  codigo: string;
  nombre: string;
  telefono: string;
  correo?: string;
  /** La sucursal favorita: ahí llega lo que se prealerta. */
  sucursal: SucursalId;
  domicilio?: { zona: string; direccion: string; area: AreaEntrega };
  /** Fecha de alta, "YYYY-MM-DD". */
  desde: string;
  /** Sin DUI (o pasaporte) en el perfil no puede prealertar en shopusa.la. */
  duiRegistrado: boolean;
  /** La conversación de la bandeja con este cliente, si tiene. */
  conversationId?: string;
  notas?: string;
}

export type EstadoCarga = "programada" | "en_transito" | "en_aduana" | "liberada";

/** Una carga aérea de Miami a El Salvador: lo que sale junto en un vuelo. */
export interface Carga {
  id: string;
  /** Guía aérea madre. */
  guia: string;
  /** Sale de Miami (ISO). */
  sale: string;
  /** Aterriza en El Salvador (ISO). */
  llega: string;
  /** Lo que llegue a bodega después de esta hora se va en la siguiente. */
  corte: string;
  estado: EstadoCarga;
}

export type TipoMovimiento =
  | "etapa"
  | "prealerta"
  | "selectivo"
  | "liberar"
  | "pagado"
  | "en_camino"
  | "traslado"
  | "recordatorio"
  | "despacho";

/**
 * Lo que una persona hizo en el demo. Se guarda en orden y no pisa la muestra:
 * la muestra se vuelve a armar en cada carga y los movimientos se aplican
 * encima, como en el tablero de eventos.
 */
export interface Movimiento {
  id: string;
  /** El paquete; en "despacho", la carga. */
  objetivo: string;
  tipo: TipoMovimiento;
  ts: string;
  actor: string;
  /**
   * etapa: { a } · prealerta: { paquete } · selectivo: { motivo } · liberar: {}
   * pagado: {} · en_camino: {} · traslado: { sucursal } · recordatorio: {}
   * despacho: { estado }
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
