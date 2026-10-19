// La muestra de Express Shopping: clientes, vuelos y paquetes.
//
// Las fechas se arman contra "ahora" (no son fijas), para que el demo se vea
// del día cualquier día que se abra: el vuelo que va en el aire salió hace un
// rato, el próximo sale en dos días y lo que está en aduana aterrizó antier.
// La etapa de cada paquete sí es fija: no depende de la hora en que se mire.
//
// Personas, casilleros, teléfonos, trackings y montos son INVENTADOS. Los
// teléfonos van con 9 después del 503, una serie que en El Salvador no se
// asigna: así nadie le escribe por error a un número ajeno desde el demo.
// Los días de los vuelos son supuesto nuestro: el sitio dice que despachan
// tres veces por semana, no cuáles.

import { diaSV, isoDeSV, sumarDias } from "@/lib/eventos/fechas";
import type {
  Cliente,
  Entrega,
  Etapa,
  EventoPaquete,
  LecturaCaptura,
  Medidas,
  Paquete,
  SucursalId,
  Tienda,
  Transportista,
  Vuelo,
} from "./tipos";

/** El "ahora" de la muestra: uno solo por carga, para que todo cuadre entre pantallas. */
export const AHORA_DEMO = Date.now();

const MIN = 60_000;
const HORA = 3_600_000;
// Miami a San Salvador, puerta a puerta.
const DURACION_VUELO = 2 * HORA + 35 * MIN;
// Aduana libera al día siguiente de aterrizar, a media tarde.
const LIBERA_TRAS = 15 * HORA;

export const CLIENTES: readonly Cliente[] = [
  { id: "c1", casillero: "EXS-10482", nombre: "María José Hernández", telefono: "50391402263", correo: "majo.hernandez@gmail.com", sucursal: "emanuel", desde: "2024-11-08", conversationId: "x1" },
  { id: "c2", casillero: "EXS-10217", nombre: "Carlos Ernesto Mejía", telefono: "50392518840", sucursal: "orion", desde: "2023-06-21", conversationId: "x2" },
  { id: "c4", casillero: "EXS-10094", nombre: "José Roberto Fuentes", telefono: "50393627715", correo: "jrfuentes@outlook.com", sucursal: "santafe", desde: "2022-09-14", conversationId: "x4" },
  { id: "c6", casillero: "EXS-10655", nombre: "Luis Alonso Martínez", telefono: "50394730192", sucursal: "santafe", domicilio: { zona: "Santa Tecla", direccion: "Colonia Las Delicias, pasaje 3, casa 14" }, desde: "2025-02-03", conversationId: "x6" },
  { id: "c7", casillero: "EXS-10368", nombre: "Paola Ramírez", telefono: "50395841036", sucursal: "santafe", desde: "2024-03-29", conversationId: "x7" },
  { id: "c8", casillero: "EXS-10741", nombre: "Ricardo Chávez", telefono: "50396952471", sucursal: "orion", desde: "2025-05-17", conversationId: "x8" },
  { id: "c9", casillero: "EXS-10903", nombre: "Fernanda Aguilar", telefono: "50397063318", correo: "fer.aguilar@gmail.com", sucursal: "emanuel", desde: "2025-08-30", conversationId: "x9" },
  { id: "c10", casillero: "EXS-10126", nombre: "Diego Herrera", telefono: "50398174429", sucursal: "emanuel", desde: "2023-01-11", conversationId: "x10" },
  { id: "c11", casillero: "EXS-10529", nombre: "Sofía Navarro", telefono: "50399285530", sucursal: "orion", desde: "2024-07-02", conversationId: "x11" },
  { id: "c12", casillero: "EXS-10312", nombre: "Karen Lissette Alvarado", telefono: "50391396641", sucursal: "emanuel", desde: "2023-10-19", conversationId: "x12" },
  { id: "c13", casillero: "EXS-10877", nombre: "Mauricio Alfaro", telefono: "50392407752", sucursal: "santafe", desde: "2025-06-06" },
  { id: "c14", casillero: "EXS-10190", nombre: "Daniela Guzmán", telefono: "50393518863", correo: "daniguzman@gmail.com", sucursal: "orion", desde: "2023-04-25" },
  { id: "c15", casillero: "EXS-10433", nombre: "Roberto Carlos Linares", telefono: "50394629974", sucursal: "emanuel", desde: "2022-12-02", conversationId: "x14", notas: "Compra casi cada semana en Amazon." },
  { id: "c16", casillero: "EXS-11002", nombre: "Verónica Sánchez", telefono: "50395730085", sucursal: "santafe", desde: "", notas: "Casillero nuevo: es su primera compra con nosotros." },
  { id: "c17", casillero: "EXS-10288", nombre: "Edwin Rodríguez", telefono: "50396841196", sucursal: "orion", domicilio: { zona: "San Salvador", direccion: "Colonia Miramonte, calle Colima, casa 22" }, desde: "2023-08-08" },
  { id: "c18", casillero: "EXS-10951", nombre: "Claudia Melgar", telefono: "50397952207", sucursal: "emanuel", desde: "2025-09-12" },
  { id: "c19", casillero: "EXS-10612", nombre: "Jonathan Ayala", telefono: "50398063318", sucursal: "santafe", desde: "2024-12-15" },
  { id: "c20", casillero: "EXS-10347", nombre: "Silvia Recinos", telefono: "50399174420", sucursal: "emanuel", desde: "2024-02-20" },
  { id: "c21", casillero: "EXS-10799", nombre: "Alejandro Quintanilla", telefono: "50391285539", sucursal: "orion", desde: "2025-04-04", notas: "Taller mecánico: compra repuestos en RockAuto." },
  { id: "c22", casillero: "EXS-10156", nombre: "Mónica Escobar", telefono: "50392396648", sucursal: "emanuel", desde: "2023-03-07", conversationId: "x13" },
];

interface DefVuelo {
  id: string;
  guia: string;
  /** Días desde hoy (sale a las 9:00 p. m.). */
  dia?: number;
  /** El que va en el aire: salió hace estos minutos. */
  salioHaceMin?: number;
  estado: Vuelo["estado"];
}

const VUELOS_DEF: readonly DefVuelo[] = [
  { id: "EXS-1031", guia: "AWB 145-6620 3318", dia: -29, estado: "liberado" },
  { id: "EXS-1037", guia: "AWB 145-6620 4105", dia: -8, estado: "liberado" },
  { id: "EXS-1039", guia: "AWB 145-6620 4421", dia: -4, estado: "liberado" },
  { id: "EXS-1040", guia: "AWB 145-6620 4563", dia: -2, estado: "en_aduana" },
  { id: "EXS-1041", guia: "AWB 145-6620 4710", salioHaceMin: 100, estado: "en_vuelo" },
  { id: "EXS-1042", guia: "AWB 145-6620 4852", dia: 2, estado: "programado" },
  { id: "EXS-1043", guia: "AWB 145-6620 4997", dia: 4, estado: "programado" },
];

export function vuelosDeMuestra(ahora: number): Vuelo[] {
  const hoy = diaSV(ahora);
  return VUELOS_DEF.map((v) => {
    let sale: number;
    let corte: number;
    if (v.salioHaceMin !== undefined) {
      sale = ahora - v.salioHaceMin * MIN;
      corte = sale - 9 * HORA;
    } else {
      const dia = sumarDias(hoy, v.dia ?? 0);
      sale = Date.parse(isoDeSV(dia, 21));
      corte = Date.parse(isoDeSV(dia, 12));
    }
    return {
      id: v.id,
      guia: v.guia,
      sale: new Date(sale).toISOString(),
      llega: new Date(sale + DURACION_VUELO).toISOString(),
      corte: new Date(corte).toISOString(),
      estado: v.estado,
    };
  });
}

/** Cuándo liberó aduana ese vuelo (los que ya liberó). */
export function liberacionDe(v: Vuelo): string {
  return new Date(Date.parse(v.llega) + LIBERA_TRAS).toISOString();
}

interface DefPaquete {
  id: string;
  c: string;
  tienda: Tienda;
  tr: Transportista;
  tracking: string;
  contenido: string;
  cat: string;
  valor: number;
  peso?: number;
  medidas?: Medidas;
  etapa: Etapa;
  vuelo?: string;
  /** "captura" (la leyó la IA), "manual" (la escribió el equipo) o "sin" (llegó sin prealerta). */
  pre: "captura" | "manual" | "sin";
  /** Horas desde la prealerta (los que todavía no llegan a Miami). */
  hPre?: number;
  /** Horas desde que llegó a Miami (los que esperan vuelo). */
  hMiami?: number;
  /** Horas desde que se entregó. */
  hEntregado?: number;
  retenido?: string;
  domicilio?: true;
  pagado?: true;
  captura?: string;
  conv?: string;
  /** Confianza de la lectura de la captura (0 a 1). */
  confianza?: number;
  /** Horas desde que se le recordó retirarlo (los que se acercan al abandono). */
  recordatorio?: number;
}

const ELECTRO_COCINA = "Electrodomésticos de cocina (cafeteras, licuadoras, microondas)";
const ROPA = "Ropa (adulto y bebé)";
const REPUESTOS = "Repuestos para vehículos (motor, frenos, baterías, escape)";
const COSMETICOS = "Cosméticos y maquillaje (incluye brochas y desmaquillantes)";
const COMPUTACION = "Accesorios de computación (cables, cargadores)";

const PAQUETES_DEF: readonly DefPaquete[] = [
  // EXS-1031: el que se quedó sin retirar casi un mes.
  { id: "P-23810", c: "c22", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA306612987004", contenido: "Freidora de aire Ninja 4 qt", cat: ELECTRO_COCINA, valor: 89.99, peso: 11.6, medidas: { largo: 14, ancho: 12, alto: 13 }, etapa: "listo", vuelo: "EXS-1031", pre: "captura", recordatorio: 20 },

  // EXS-1037: entregados la semana pasada.
  { id: "P-24102", c: "c15", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA310027715309", contenido: "Kindle Paperwhite", cat: "Tablets (iPad)", valor: 149.99, peso: 0.9, etapa: "entregado", vuelo: "EXS-1037", pre: "captura", hEntregado: 123, pagado: true },
  { id: "P-24105", c: "c2", tienda: "SHEIN", tr: "USPS", tracking: "9400111899562341778801", contenido: "Ropa variada (6 piezas)", cat: ROPA, valor: 46.8, peso: 2.1, etapa: "entregado", vuelo: "EXS-1037", pre: "captura", hEntregado: 140, pagado: true },
  { id: "P-24109", c: "c18", tienda: "Sephora", tr: "UPS", tracking: "1ZA4W8920394817726", contenido: "Set de maquillaje", cat: COSMETICOS, valor: 72, peso: 1.4, etapa: "entregado", vuelo: "EXS-1037", pre: "captura", hEntregado: 118, pagado: true },
  { id: "P-24113", c: "c21", tienda: "RockAuto", tr: "FedEx", tracking: "774812369902", contenido: "Pastillas de freno y filtros", cat: REPUESTOS, valor: 118.4, peso: 9.6, etapa: "entregado", vuelo: "EXS-1037", pre: "manual", hEntregado: 142, pagado: true },
  { id: "P-24117", c: "c17", tienda: "Walmart", tr: "FedEx", tracking: "774812370415", contenido: "Licuadora Ninja", cat: ELECTRO_COCINA, valor: 79, peso: 8.3, etapa: "entregado", vuelo: "EXS-1037", pre: "captura", hEntregado: 116, domicilio: true, pagado: true },

  // EXS-1039: liberado hace tres días; casi todo listo para retirar.
  { id: "P-24288", c: "c7", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA312845530071", contenido: "Cafetera Keurig K-Mini", cat: ELECTRO_COCINA, valor: 79.99, peso: 5.3, etapa: "listo", vuelo: "EXS-1039", pre: "captura" },
  { id: "P-24291", c: "c6", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA312851094466", contenido: "Monitor LG de 24 pulgadas", cat: "Pantallas y televisores", valor: 129.99, peso: 9.8, medidas: { largo: 25, ancho: 16, alto: 6 }, etapa: "listo", vuelo: "EXS-1039", pre: "captura", domicilio: true },
  { id: "P-24295", c: "c13", tienda: "Macy's", tr: "UPS", tracking: "1ZA4W8920395102233", contenido: "Zapatos deportivos", cat: "Zapatos", valor: 95, peso: 3.2, etapa: "listo", vuelo: "EXS-1039", pre: "captura", pagado: true },
  { id: "P-24298", c: "c19", tienda: "eBay", tr: "USPS", tracking: "9400111899562399120457", contenido: "Control de PlayStation 5", cat: "Consolas de videojuegos", valor: 64.99, peso: 1.3, etapa: "listo", vuelo: "EXS-1039", pre: "captura" },
  { id: "P-24302", c: "c14", tienda: "Old Navy", tr: "FedEx", tracking: "774812371188", contenido: "Ropa de niño (8 piezas)", cat: ROPA, valor: 58.4, peso: 2.6, etapa: "entregado", vuelo: "EXS-1039", pre: "captura", hEntregado: 50, pagado: true },
  { id: "P-24305", c: "c20", tienda: "Temu", tr: "USPS", tracking: "9200190311845527390012", contenido: "Organizadores de cocina", cat: "Artículos de plástico (envases, cajas, tapas, depósitos)", valor: 23.6, peso: 1.8, etapa: "listo", vuelo: "EXS-1039", pre: "captura" },
  { id: "P-24309", c: "c1", tienda: "SHEIN", tr: "USPS", tracking: "9400111899562401887736", contenido: "Vestidos (3)", cat: ROPA, valor: 41.97, peso: 1.2, etapa: "entregado", vuelo: "EXS-1039", pre: "captura", hEntregado: 46, pagado: true },

  // EXS-1040: aterrizó antier; dos se quedaron en aduana.
  { id: "P-24410", c: "c4", tienda: "eBay", tr: "USPS", tracking: "9400111899562417700983", contenido: "Reloj Seiko 5 automático (usado)", cat: "Relojes", valor: 185, peso: 0.8, etapa: "aduana", vuelo: "EXS-1040", pre: "manual", retenido: "Aduana pide la factura de compra", conv: "x4" },
  { id: "P-24413", c: "c12", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA313372086615", contenido: "Tablet Samsung Galaxy Tab A9", cat: "Tablets (iPad)", valor: 139.99, peso: 1.6, etapa: "aduana", vuelo: "EXS-1040", pre: "captura", retenido: "El valor declarado no coincide con la factura" },
  { id: "P-24416", c: "c16", tienda: "Walmart", tr: "FedEx", tracking: "774812372650", contenido: "Set de LEGO Classic", cat: "Juguetes (incluye juguetes para bebé)", valor: 54.97, peso: 2.4, etapa: "aduana", vuelo: "EXS-1040", pre: "captura" },
  { id: "P-24419", c: "c15", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA313380471228", contenido: "Bocina JBL Flip 6", cat: "Bocinas, amplificadores y micrófonos", valor: 99.95, peso: 2, etapa: "aduana", vuelo: "EXS-1040", pre: "captura" },
  { id: "P-24422", c: "c21", tienda: "RockAuto", tr: "FedEx", tracking: "774812372981", contenido: "Bomba de agua", cat: REPUESTOS, valor: 67.8, peso: 6.4, etapa: "aduana", vuelo: "EXS-1040", pre: "manual" },
  { id: "P-24425", c: "c9", tienda: "Sephora", tr: "UPS", tracking: "1ZA4W8920396230519", contenido: "Crema facial y sérum", cat: COSMETICOS, valor: 86, peso: 1.1, etapa: "aduana", vuelo: "EXS-1040", pre: "captura" },
  { id: "P-24428", c: "c18", tienda: "Nordstrom", tr: "UPS", tracking: "1ZA4W8920396241870", contenido: "Cartera de cuero", cat: "Carteras, bolsas y billeteras", valor: 168, peso: 2.2, etapa: "aduana", vuelo: "EXS-1040", pre: "captura" },

  // EXS-1041: va en el aire ahora mismo.
  { id: "P-24502", c: "c2", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA314190553820", contenido: "Smartwatch Amazfit Bip 5", cat: "Smartwatch", valor: 69.99, peso: 0.7, etapa: "en_vuelo", vuelo: "EXS-1041", pre: "captura" },
  { id: "P-24505", c: "c10", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA314197762095", contenido: "Audífonos Bose QuietComfort", cat: "Audífonos", valor: 229, peso: 1.5, etapa: "en_vuelo", vuelo: "EXS-1041", pre: "captura" },
  { id: "P-24508", c: "c11", tienda: "Walmart", tr: "FedEx", tracking: "774812374406", contenido: "Set de ollas antiadherentes", cat: "Artículos de cocina y mesa (vajilla, cubiertos, utensilios)", valor: 49.88, peso: 7.2, etapa: "en_vuelo", vuelo: "EXS-1041", pre: "captura" },
  { id: "P-24511", c: "c13", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA314203318547", contenido: "Proteína en polvo (5 lb)", cat: "Suplementos dietéticos", valor: 64.99, peso: 5.6, etapa: "en_vuelo", vuelo: "EXS-1041", pre: "captura" },
  { id: "P-24514", c: "c19", tienda: "AliExpress", tr: "USPS", tracking: "9400111899562455028164", contenido: "Cables USB-C y cargador", cat: COMPUTACION, valor: 18.4, peso: 0.6, etapa: "en_vuelo", vuelo: "EXS-1041", pre: "captura" },
  { id: "P-24517", c: "c20", tienda: "H&M", tr: "UPS", tracking: "1ZA4W8920397018342", contenido: "Ropa de mujer (5 piezas)", cat: ROPA, valor: 76.95, peso: 2.3, etapa: "en_vuelo", vuelo: "EXS-1041", pre: "captura" },
  { id: "P-24520", c: "c17", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA314211904736", contenido: "Taladro inalámbrico DeWalt", cat: "Herramientas (manuales, de taller y soldadura)", valor: 99, peso: 4.9, etapa: "en_vuelo", vuelo: "EXS-1041", pre: "captura", domicilio: true },
  { id: "P-24523", c: "c8", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA314215580913", contenido: "Mochila para laptop", cat: "Mochilas, maletines y portafolios", valor: 45.99, peso: 1.9, etapa: "en_vuelo", vuelo: "EXS-1041", pre: "captura" },

  // EXS-1042: en bodega, esperando el próximo vuelo.
  { id: "P-24601", c: "c10", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA315022710488", contenido: "Nintendo Switch Lite", cat: "Consolas de videojuegos", valor: 199.99, peso: 2.1, etapa: "miami", vuelo: "EXS-1042", pre: "captura", hMiami: 26 },
  { id: "P-24604", c: "c10", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA315029384173", contenido: "Juegos de Nintendo Switch (2)", cat: "Videojuegos (discos y cartuchos)", valor: 109.98, peso: 0.5, etapa: "miami", vuelo: "EXS-1042", pre: "captura", hMiami: 1.5, conv: "x10" },
  { id: "P-24607", c: "c2", tienda: "SHEIN", tr: "USPS", tracking: "9400111899562470093551", contenido: "Ropa y accesorios (9 piezas)", cat: ROPA, valor: 58.73, peso: 1.9, etapa: "miami", vuelo: "EXS-1042", pre: "captura", hMiami: 0.45, conv: "x2" },
  { id: "P-24610", c: "c16", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA315035521604", contenido: "Aspiradora robot Eufy", cat: "Electrodomésticos del hogar (aspiradoras, planchas)", valor: 159.99, peso: 7.9, medidas: { largo: 18, ancho: 17, alto: 6 }, etapa: "miami", vuelo: "EXS-1042", pre: "captura", hMiami: 20 },
  { id: "P-24613", c: "c14", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA315040986312", contenido: "Por confirmar", cat: "Otro tipo de producto", valor: 0, peso: 3.4, etapa: "miami", vuelo: "EXS-1042", pre: "sin", hMiami: 7 },
  { id: "P-24616", c: "c12", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA315044213378", contenido: "Funda y protector de pantalla", cat: "Accesorios para celular (estuches, protectores)", valor: 24.99, peso: 0.4, etapa: "miami", vuelo: "EXS-1042", pre: "captura", hMiami: 30 },
  { id: "P-24619", c: "c22", tienda: "Temu", tr: "USPS", tracking: "9200190311845560014427", contenido: "Adornos de Navidad", cat: "Adornos para el hogar", valor: 37.45, peso: 3.1, etapa: "miami", vuelo: "EXS-1042", pre: "captura", hMiami: 40 },
  { id: "P-24622", c: "c19", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA315051807259", contenido: "Teclado y mouse Logitech", cat: COMPUTACION, valor: 59.99, peso: 2.2, etapa: "miami", vuelo: "EXS-1042", pre: "captura", hMiami: 12 },
  { id: "P-24625", c: "c9", tienda: "Nordstrom", tr: "UPS", tracking: "1ZA4W8920398412655", contenido: "Lentes de sol Ray-Ban", cat: "Lentes de sol", valor: 161, peso: 0.6, etapa: "miami", vuelo: "EXS-1042", pre: "captura", hMiami: 4 },

  // Prealertados: la captura ya llegó, el paquete todavía no.
  { id: "P-24701", c: "c1", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA318274650012", contenido: "Audífonos Sony WH-CH720N", cat: "Audífonos", valor: 89.99, etapa: "prealertado", pre: "captura", hPre: 3.1, captura: "/demo/exs/captura-amazon.svg", conv: "x1", confianza: 0.97 },
  { id: "P-24704", c: "c7", tienda: "SHEIN", tr: "USPS", tracking: "9400111899562488215530", contenido: "Blusas y pantalón (4 piezas)", cat: ROPA, valor: 38.5, etapa: "prealertado", pre: "captura", hPre: 22 },
  { id: "P-24707", c: "c15", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA318240913377", contenido: "Disco duro externo WD de 2 TB", cat: "Discos duros y memorias externas", valor: 79.99, etapa: "prealertado", pre: "captura", hPre: 46 },
  { id: "P-24710", c: "c21", tienda: "RockAuto", tr: "FedEx", tracking: "774812379950", contenido: "Kit de clutch", cat: REPUESTOS, valor: 142.3, etapa: "prealertado", pre: "manual", hPre: 28 },
  { id: "P-24713", c: "c18", tienda: "Temu", tr: "USPS", tracking: "9200190311845577201854", contenido: "Accesorios para el cabello", cat: "Accesorios de aseo personal (cepillos, peines, manicura)", valor: 16.8, etapa: "prealertado", pre: "captura", hPre: 5 },
  { id: "P-24716", c: "c8", tienda: "Walmart", tr: "USPS", tracking: "9400111899562491670244", contenido: "Zapatos escolares", cat: "Zapatos", valor: 34.97, etapa: "prealertado", pre: "captura", hPre: 70, conv: "x8" },
];

/**
 * La captura que llegó hace unos minutos y todavía no es paquete: la IA ya la
 * leyó y espera a que alguien la confirme desde la bandeja.
 */
export interface CapturaPendiente {
  conversationId: string;
  clienteId: string;
  capturaUrl: string;
  lectura: LecturaCaptura;
  /** Minutos desde que llegó. */
  haceMin: number;
}

export const CAPTURAS_PENDIENTES: readonly CapturaPendiente[] = [
  {
    conversationId: "x11",
    clienteId: "c11",
    capturaUrl: "/demo/exs/captura-walmart.svg",
    haceMin: 6,
    lectura: {
      tracking: "9400111899562503318867",
      tienda: "Walmart",
      transportista: "USPS",
      contenido: "Silla de comer para bebé Graco",
      categoria: "Muebles para el hogar (madera, metal, cunas)",
      valor: 69.98,
      confianza: 0.94,
    },
  },
];

function clienteDe(id: string): Cliente {
  const c = CLIENTES.find((x) => x.id === id);
  if (!c) throw new Error(`Cliente de muestra sin ficha: ${id}`);
  return c;
}

function entregaDe(def: DefPaquete): Entrega {
  const c = clienteDe(def.c);
  if (def.domicilio && c.domicilio) return { tipo: "domicilio", zona: c.domicilio.zona, direccion: c.domicilio.direccion };
  return { tipo: "sucursal", sucursal: c.sucursal as SucursalId };
}

// Un desfase chico y estable por paquete, para que no lleguen todos al mismo
// minuto. Sale del id, así la muestra es la misma en cada carga.
function desfase(id: string, rangoHoras: number): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return (h % Math.max(1, Math.round(rangoHoras * 60))) * MIN;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

export interface MuestraExs {
  ahora: number;
  clientes: Cliente[];
  vuelos: Vuelo[];
  paquetes: Paquete[];
}

export function semillaExs(ahora: number = AHORA_DEMO): MuestraExs {
  const vuelos = vuelosDeMuestra(ahora);
  const vueloDe = (id?: string) => vuelos.find((v) => v.id === id);

  const paquetes = PAQUETES_DEF.map((def): Paquete => {
    const v = vueloDe(def.vuelo);
    const historial: EventoPaquete[] = [];
    let tPre: number | undefined;

    if (def.etapa === "prealertado") {
      tPre = ahora - (def.hPre ?? 1) * HORA;
      historial.push({ ts: iso(tPre), tipo: "prealertado", actor: def.pre === "captura" ? "ia" : "s2" });
    } else {
      // Llegó a Miami antes del corte de su vuelo (o hace hMiami horas si
      // todavía espera vuelo). La prealerta fue uno a tres días antes.
      const corte = v ? Date.parse(v.corte) : ahora;
      const tMiami = def.hMiami !== undefined ? ahora - def.hMiami * HORA : corte - 4 * HORA - desfase(def.id, 30);
      if (def.pre !== "sin") {
        tPre = tMiami - 26 * HORA - desfase(`${def.id}p`, 40);
        historial.push({ ts: iso(tPre), tipo: "prealertado", actor: def.pre === "captura" ? "ia" : "s2" });
      }
      historial.push({ ts: iso(tMiami), tipo: "miami", actor: "s4" });
      if (v && ["en_vuelo", "aduana", "listo", "entregado"].includes(def.etapa)) {
        historial.push({ ts: v.sale, tipo: "en_vuelo", actor: "sistema" });
      }
      if (v && ["aduana", "listo", "entregado"].includes(def.etapa)) {
        historial.push({ ts: v.llega, tipo: "aduana", actor: "sistema" });
      }
      if (v && def.retenido) {
        historial.push({ ts: iso(Date.parse(v.llega) + 9 * HORA), tipo: "retenido", actor: "s3", detalle: def.retenido });
      }
      if (v && ["listo", "entregado"].includes(def.etapa)) {
        historial.push({ ts: liberacionDe(v), tipo: "listo", actor: "s3" });
      }
      if (def.recordatorio !== undefined) {
        historial.push({ ts: iso(ahora - def.recordatorio * HORA), tipo: "recordatorio", actor: "sistema" });
      }
      if (def.etapa === "entregado") {
        const tEntrega = ahora - (def.hEntregado ?? 24) * HORA;
        // Paga al retirar (o al recibir, si es a domicilio).
        if (def.pagado) historial.push({ ts: iso(tEntrega - 4 * MIN), tipo: "pagado", actor: def.domicilio ? "s6" : "s5" });
        historial.push({ ts: iso(tEntrega), tipo: "entregado", actor: def.domicilio ? "s6" : "s5" });
      } else if (def.pagado && v) {
        // Pagó por link apenas le avisamos que estaba listo.
        historial.push({ ts: iso(Date.parse(liberacionDe(v)) + 2 * HORA + 17 * MIN), tipo: "pagado", actor: "s2" });
      }
    }

    const c = clienteDe(def.c);
    const lectura: LecturaCaptura | undefined =
      def.pre === "captura"
        ? {
            tracking: def.tracking,
            tienda: def.tienda,
            transportista: def.tr,
            contenido: def.contenido,
            categoria: def.cat,
            valor: def.valor,
            confianza: def.confianza ?? 0.96,
          }
        : undefined;

    return {
      id: def.id,
      clienteId: def.c,
      tracking: def.tracking,
      tienda: def.tienda,
      transportista: def.tr,
      contenido: def.contenido,
      categoria: def.cat,
      valor: def.valor,
      pesoLb: def.etapa === "prealertado" ? undefined : def.peso,
      medidas: def.etapa === "prealertado" ? undefined : def.medidas,
      etapa: def.etapa,
      vueloId: def.vuelo,
      prealerta:
        def.pre === "sin" || tPre === undefined
          ? undefined
          : {
              origen: def.pre,
              ts: iso(tPre),
              capturaUrl: def.captura,
              lectura,
              conversationId: def.conv ?? (def.pre === "captura" ? c.conversationId : undefined),
            },
      retenido: def.retenido && v ? { motivo: def.retenido, desde: iso(Date.parse(v.llega) + 9 * HORA) } : undefined,
      entrega: entregaDe(def),
      pagado: Boolean(def.pagado),
      historial,
      creado: historial[0]?.ts ?? iso(ahora),
      entregadoA: def.etapa === "entregado" ? c.nombre : undefined,
    };
  });

  // El cliente nuevo se dio de alta hace nueve días.
  const clientes = CLIENTES.map((c) => (c.desde ? { ...c } : { ...c, desde: sumarDias(diaSV(ahora), -9) }));

  return { ahora, clientes, vuelos, paquetes };
}
