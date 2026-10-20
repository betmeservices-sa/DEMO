// La muestra de ShopUSA: clientes, cargas y paquetes.
//
// Las fechas se arman contra "ahora" (no son fijas), para que el demo se vea
// del día cualquier día que se abra: la carga que va en el aire salió hace un
// rato, la próxima sale esta noche (o mañana) y lo que está en aduana aterrizó
// antier. La etapa de cada paquete sí es fija: no depende de la hora.
//
// Personas, códigos de cliente, teléfonos, trackings y montos son INVENTADOS.
// Los teléfonos van con 9 después del 503, una serie que en El Salvador no se
// asigna: así nadie le escribe por error a un número ajeno desde el demo.
// Supuestos nuestros (shopusa.la no los publica): las cargas salen de Miami a
// las 9:00 p. m. con corte al mediodía, y el código de cliente es "SV" con
// cinco dígitos.

import { diaSV, isoDeSV, sumarDias } from "@/lib/eventos/fechas";
import type {
  Carga,
  Cliente,
  Entrega,
  Etapa,
  EventoPaquete,
  LecturaCaptura,
  Medidas,
  Paquete,
  Prealerta,
  Tienda,
  Transportista,
} from "./tipos";

/** El "ahora" de la muestra: uno solo por carga de página, para que todo cuadre entre pantallas. */
export const AHORA_DEMO = Date.now();

const MIN = 60_000;
const HORA = 3_600_000;
// Miami a San Salvador, puerta a puerta.
const DURACION_VUELO = 2 * HORA + 35 * MIN;
// Aduana libera al día siguiente de aterrizar, a media tarde.
const LIBERA_TRAS = 15 * HORA;

export const CLIENTES: readonly Cliente[] = [
  { id: "c1", codigo: "SV10482", nombre: "María José Hernández", telefono: "50391402263", correo: "majo.hernandez@gmail.com", sucursal: "mascota", desde: "2024-11-08", duiRegistrado: true, conversationId: "x1" },
  { id: "c2", codigo: "SV10217", nombre: "Carlos Ernesto Mejía", telefono: "50392518840", sucursal: "metro_sur", desde: "2023-06-21", duiRegistrado: true, conversationId: "x2" },
  { id: "c4", codigo: "SV10094", nombre: "José Roberto Fuentes", telefono: "50393627715", correo: "jrfuentes@outlook.com", sucursal: "santa_elena", desde: "2022-09-14", duiRegistrado: true, conversationId: "x4" },
  { id: "c6", codigo: "SV10655", nombre: "Luis Alonso Martínez", telefono: "50394730192", sucursal: "santa_tecla", domicilio: { zona: "Santa Tecla", direccion: "Colonia Las Delicias, pasaje 3, casa 14", area: "metro" }, desde: "2025-02-03", duiRegistrado: true, conversationId: "x6" },
  { id: "c7", codigo: "SV10368", nombre: "Paola Ramírez", telefono: "50395841036", sucursal: "santa_tecla", desde: "2024-03-29", duiRegistrado: true, conversationId: "x7" },
  { id: "c8", codigo: "SV10741", nombre: "Ricardo Chávez", telefono: "50396952471", sucursal: "soyapango", desde: "2025-05-17", duiRegistrado: true, conversationId: "x8" },
  { id: "c9", codigo: "SV10903", nombre: "Fernanda Aguilar", telefono: "50397063318", correo: "fer.aguilar@gmail.com", sucursal: "salvador_del_mundo", desde: "2025-08-30", duiRegistrado: true, conversationId: "x9" },
  { id: "c10", codigo: "SV10126", nombre: "Diego Herrera", telefono: "50398174429", sucursal: "mascota", desde: "2023-01-11", duiRegistrado: true, conversationId: "x10" },
  { id: "c11", codigo: "SV10529", nombre: "Sofía Navarro", telefono: "50399285530", sucursal: "metro_sur", desde: "2024-07-02", duiRegistrado: true, conversationId: "x11" },
  { id: "c12", codigo: "SV10312", nombre: "Karen Lissette Alvarado", telefono: "50391396641", sucursal: "santa_ana", desde: "2023-10-19", duiRegistrado: true, conversationId: "x12" },
  { id: "c13", codigo: "SV10877", nombre: "Mauricio Alfaro", telefono: "50392407752", sucursal: "santa_elena", desde: "2025-06-06", duiRegistrado: true },
  { id: "c14", codigo: "SV10190", nombre: "Daniela Guzmán", telefono: "50393518863", correo: "daniguzman@gmail.com", sucursal: "metro_sur", desde: "2023-04-25", duiRegistrado: true },
  { id: "c15", codigo: "SV10433", nombre: "Roberto Carlos Linares", telefono: "50394629974", sucursal: "mascota", desde: "2022-12-02", duiRegistrado: true, conversationId: "x14", notas: "Compra casi cada semana en Amazon." },
  { id: "c16", codigo: "SV11002", nombre: "Verónica Sánchez", telefono: "50395730085", sucursal: "soyapango", desde: "", duiRegistrado: false, notas: "Cuenta nueva: todavía no registra su DUI, por eso no puede prealertar en la web." },
  { id: "c17", codigo: "SV10288", nombre: "Edwin Rodríguez", telefono: "50396841196", sucursal: "salvador_del_mundo", domicilio: { zona: "San Salvador", direccion: "Colonia Miramonte, calle Colima, casa 22", area: "metro" }, desde: "2023-08-08", duiRegistrado: true },
  { id: "c18", codigo: "SV10951", nombre: "Claudia Melgar", telefono: "50397952207", sucursal: "santa_ana", desde: "2025-09-12", duiRegistrado: true },
  { id: "c19", codigo: "SV10612", nombre: "Jonathan Ayala", telefono: "50398063318", sucursal: "soyapango", desde: "2024-12-15", duiRegistrado: true },
  { id: "c20", codigo: "SV10347", nombre: "Silvia Recinos", telefono: "50399174420", sucursal: "santa_elena", desde: "2024-02-20", duiRegistrado: true },
  { id: "c21", codigo: "SV10799", nombre: "Alejandra Quintanilla", telefono: "50391285539", sucursal: "santa_ana", desde: "2025-04-04", duiRegistrado: true, notas: "Emprendedora: trae maquillaje para vender por Instagram." },
  { id: "c22", codigo: "SV10156", nombre: "Mónica Escobar", telefono: "50392396648", sucursal: "mascota", desde: "2023-03-07", duiRegistrado: true, conversationId: "x13" },
];

interface DefCarga {
  id: string;
  guia: string;
  /** Días desde hoy (sale a las 9:00 p. m.). */
  dia?: number;
  /** La que va en el aire: salió hace estos minutos. */
  salioHaceMin?: number;
  /** La próxima: sale en la siguiente noche que tenga al menos tres horas por delante. */
  proxima?: true;
  estado: Carga["estado"];
}

const CARGAS_DEF: readonly DefCarga[] = [
  { id: "1028", guia: "Guía 7731 2804", dia: -37, estado: "liberada" },
  { id: "1031", guia: "Guía 7731 3318", dia: -29, estado: "liberada" },
  { id: "1037", guia: "Guía 7731 4105", dia: -8, estado: "liberada" },
  { id: "1039", guia: "Guía 7731 4421", dia: -4, estado: "liberada" },
  { id: "1040", guia: "Guía 7731 4563", dia: -2, estado: "en_aduana" },
  { id: "1041", guia: "Guía 7731 4710", salioHaceMin: 100, estado: "en_transito" },
  { id: "1042", guia: "Guía 7731 4852", proxima: true, estado: "programada" },
];

export function cargasDeMuestra(ahora: number): Carga[] {
  const hoy = diaSV(ahora);
  return CARGAS_DEF.map((c) => {
    let sale: number;
    let corte: number;
    if (c.salioHaceMin !== undefined) {
      sale = ahora - c.salioHaceMin * MIN;
      corte = sale - 9 * HORA;
    } else {
      let dia = sumarDias(hoy, c.dia ?? 0);
      if (c.proxima && Date.parse(isoDeSV(dia, 21)) - ahora < 3 * HORA) dia = sumarDias(dia, 1);
      sale = Date.parse(isoDeSV(dia, 21));
      corte = Date.parse(isoDeSV(dia, 12));
    }
    return {
      id: c.id,
      guia: c.guia,
      sale: new Date(sale).toISOString(),
      llega: new Date(sale + DURACION_VUELO).toISOString(),
      corte: new Date(corte).toISOString(),
      estado: c.estado,
    };
  });
}

/** Cuándo liberó aduana esa carga (las que ya liberó). */
export function liberacionDe(c: Carga): string {
  return new Date(Date.parse(c.llega) + LIBERA_TRAS).toISOString();
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
  carga?: string;
  /** "captura" (la leyó la IA), "web" (el formulario de shopusa.la), "equipo" o "sin" (llegó sin prealerta). */
  pre: Prealerta["origen"] | "sin";
  /** Horas desde la prealerta (los que todavía no llegan a Miami). */
  hPre?: number;
  /** Horas desde que llegó a Miami (los que esperan carga). */
  hMiami?: number;
  /** Horas desde que se entregó. */
  hEntregado?: number;
  selectivo?: string;
  domicilio?: true;
  pagado?: true;
  captura?: string;
  conv?: string;
  /** Confianza de la lectura de la captura (0 a 1). */
  confianza?: number;
  /** Horas desde que se le recordó retirarlo. */
  recordatorio?: number;
}

const COCINA_ELECTRO = "Licuadoras, cafeteras y freidoras de aire";
const ROPA = "Prendas de vestir";
const CALZADO = "Calzado";
const MAQUILLAJE = "Cosméticos y maquillaje";
const PIEL = "Cuidado de la piel y el cabello";
const AUDIO = "Audífonos, barras de sonido y altavoces";
const CONSOLAS = "Consolas de videojuegos";
const FUNDAS = "Fundas para teléfonos y mochilas para laptops";
const JUGUETES = "Juguetes y artículos infantiles";
const MUEBLES = "Muebles y decoración";

const PAQUETES_DEF: readonly DefPaquete[] = [
  // 1028: lleva más de 30 días en la sucursal, ya cobra almacenaje.
  { id: "P-23702", c: "c17", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA305998120437", contenido: "Silla de oficina ergonómica", cat: MUEBLES, valor: 139.99, peso: 24, medidas: { largo: 28, ancho: 22, alto: 12 }, etapa: "listo", carga: "1028", pre: "web", recordatorio: 170 },

  // 1031: el que se acerca a los 30 días sin retirar.
  { id: "P-23810", c: "c22", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA306612987004", contenido: "Freidora de aire Ninja 4 qt", cat: COCINA_ELECTRO, valor: 89.99, peso: 11.6, medidas: { largo: 14, ancho: 12, alto: 13 }, etapa: "listo", carga: "1031", pre: "captura", recordatorio: 20 },

  // 1037: entregados la semana pasada.
  { id: "P-24102", c: "c15", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA310027715309", contenido: "Kindle Paperwhite", cat: "Kindles y lectores electrónicos", valor: 149.99, peso: 0.9, etapa: "entregado", carga: "1037", pre: "captura", hEntregado: 123, pagado: true },
  { id: "P-24105", c: "c2", tienda: "SHEIN", tr: "USPS", tracking: "9400111899562341778801", contenido: "Ropa variada (6 piezas)", cat: ROPA, valor: 46.8, peso: 2.1, etapa: "entregado", carga: "1037", pre: "web", hEntregado: 140, pagado: true },
  { id: "P-24109", c: "c18", tienda: "Sephora", tr: "UPS", tracking: "1ZA4W8920394817726", contenido: "Set de maquillaje", cat: MAQUILLAJE, valor: 72, peso: 1.4, etapa: "entregado", carga: "1037", pre: "captura", hEntregado: 118, pagado: true },
  { id: "P-24113", c: "c21", tienda: "ColourPop", tr: "USPS", tracking: "9400111899562344102236", contenido: "Paletas de sombras y labiales (12)", cat: MAQUILLAJE, valor: 118.4, peso: 3.6, etapa: "entregado", carga: "1037", pre: "web", hEntregado: 142, pagado: true },
  { id: "P-24117", c: "c17", tienda: "Walmart", tr: "FedEx", tracking: "774812370415", contenido: "Licuadora Ninja", cat: COCINA_ELECTRO, valor: 79, peso: 8.3, etapa: "entregado", carga: "1037", pre: "captura", hEntregado: 116, domicilio: true, pagado: true },

  // 1039: liberada hace tres días; casi todo listo para retirar.
  { id: "P-24288", c: "c7", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA312845530071", contenido: "Cafetera Keurig K-Mini", cat: COCINA_ELECTRO, valor: 79.99, peso: 5.3, etapa: "listo", carga: "1039", pre: "captura" },
  { id: "P-24291", c: "c6", tienda: "IKEA", tr: "UPS", tracking: "1ZA4W8920395098812", contenido: "Edredón y almohadas", cat: MUEBLES, valor: 89.99, peso: 4.2, medidas: { largo: 22, ancho: 16, alto: 12 }, etapa: "listo", carga: "1039", pre: "captura", domicilio: true },
  { id: "P-24295", c: "c13", tienda: "Macy's", tr: "UPS", tracking: "1ZA4W8920395102233", contenido: "Zapatos de vestir", cat: CALZADO, valor: 95, peso: 3.2, etapa: "listo", carga: "1039", pre: "web", pagado: true },
  { id: "P-24298", c: "c19", tienda: "eBay", tr: "USPS", tracking: "9400111899562399120457", contenido: "Control de PlayStation 5", cat: CONSOLAS, valor: 64.99, peso: 1.3, etapa: "listo", carga: "1039", pre: "web" },
  { id: "P-24302", c: "c14", tienda: "Carter's", tr: "FedEx", tracking: "774812371188", contenido: "Ropa de niño (8 piezas)", cat: ROPA, valor: 58.4, peso: 2.6, etapa: "entregado", carga: "1039", pre: "web", hEntregado: 50, pagado: true },
  { id: "P-24305", c: "c20", tienda: "Target", tr: "USPS", tracking: "9200190311845527390012", contenido: "Organizadores de cocina", cat: "Manufacturas plásticas", valor: 23.6, peso: 1.8, etapa: "listo", carga: "1039", pre: "captura" },
  { id: "P-24309", c: "c1", tienda: "SHEIN", tr: "USPS", tracking: "9400111899562401887736", contenido: "Vestidos (3)", cat: ROPA, valor: 41.97, peso: 1.2, etapa: "entregado", carga: "1039", pre: "captura", hEntregado: 46, pagado: true },

  // 1040: aterrizó antier; a dos les salió selectivo rojo.
  { id: "P-24410", c: "c4", tienda: "eBay", tr: "USPS", tracking: "9400111899562417700983", contenido: "Reloj Seiko 5 automático (usado)", cat: "Relojes tradicionales, joyería y accesorios de moda", valor: 185, peso: 0.8, etapa: "aduana", carga: "1040", pre: "equipo", selectivo: "Aduana pide la factura de compra", conv: "x4" },
  { id: "P-24413", c: "c12", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA313372086615", contenido: "Tablet Samsung Galaxy Tab A9", cat: "Tablets", valor: 139.99, peso: 1.6, etapa: "aduana", carga: "1040", pre: "captura", selectivo: "El valor declarado no coincide con la factura" },
  { id: "P-24416", c: "c16", tienda: "Walmart", tr: "FedEx", tracking: "774812372650", contenido: "Set de LEGO Classic", cat: JUGUETES, valor: 54.97, peso: 2.4, etapa: "aduana", carga: "1040", pre: "equipo" },
  { id: "P-24419", c: "c15", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA313380471228", contenido: "Bocina JBL Flip 6", cat: AUDIO, valor: 99.95, peso: 2, etapa: "aduana", carga: "1040", pre: "captura" },
  { id: "P-24422", c: "c21", tienda: "Ulta", tr: "UPS", tracking: "1ZA4W8920396229014", contenido: "Labiales y delineadores (10)", cat: MAQUILLAJE, valor: 67.8, peso: 1.4, etapa: "aduana", carga: "1040", pre: "web" },
  { id: "P-24425", c: "c9", tienda: "Sephora", tr: "UPS", tracking: "1ZA4W8920396230519", contenido: "Crema facial y sérum", cat: PIEL, valor: 86, peso: 1.1, etapa: "aduana", carga: "1040", pre: "captura" },
  { id: "P-24428", c: "c18", tienda: "Nordstrom Rack", tr: "UPS", tracking: "1ZA4W8920396241870", contenido: "Cartera de cuero", cat: "Carteras, billeteras, bolsos y maletas", valor: 168, peso: 2.2, etapa: "aduana", carga: "1040", pre: "web" },

  // 1041: va en el aire ahora mismo.
  { id: "P-24502", c: "c2", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA314190553820", contenido: "Smartwatch Amazfit Bip 5", cat: "Relojes y smartwatch", valor: 69.99, peso: 0.7, etapa: "transito", carga: "1041", pre: "captura" },
  { id: "P-24505", c: "c10", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA314197762095", contenido: "Audífonos Bose QuietComfort", cat: AUDIO, valor: 229, peso: 1.5, etapa: "transito", carga: "1041", pre: "captura" },
  { id: "P-24508", c: "c11", tienda: "Walmart", tr: "FedEx", tracking: "774812374406", contenido: "Set de ollas antiadherentes", cat: "Artículos para cocina y mesa", valor: 49.88, peso: 7.2, etapa: "transito", carga: "1041", pre: "captura" },
  { id: "P-24511", c: "c13", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA314203318547", contenido: "Proteína en polvo (5 lb)", cat: "Medicamentos, vitaminas, fórmulas y equipo de diagnóstico", valor: 64.99, peso: 5.6, etapa: "transito", carga: "1041", pre: "web" },
  { id: "P-24514", c: "c19", tienda: "AliExpress", tr: "USPS", tracking: "9400111899562455028164", contenido: "Cables USB-C y cargador", cat: "Cables, cargadores de pared y baterías externas", valor: 18.4, peso: 0.6, etapa: "transito", carga: "1041", pre: "web" },
  { id: "P-24517", c: "c20", tienda: "H&M", tr: "UPS", tracking: "1ZA4W8920397018342", contenido: "Ropa de mujer (5 piezas)", cat: ROPA, valor: 76.95, peso: 2.3, etapa: "transito", carga: "1041", pre: "captura" },
  { id: "P-24520", c: "c17", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA314211904736", contenido: "Taladro inalámbrico DeWalt", cat: "Herramientas de bricolaje", valor: 99, peso: 4.9, etapa: "transito", carga: "1041", pre: "web", domicilio: true },
  { id: "P-24523", c: "c8", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA314215580913", contenido: "Mochila para laptop", cat: FUNDAS, valor: 45.99, peso: 1.9, etapa: "transito", carga: "1041", pre: "captura" },
  { id: "P-24526", c: "c1", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA314222675140", contenido: "iPhone 15 de 128 GB", cat: "Celulares y smartphones", valor: 629, peso: 1, etapa: "transito", carga: "1041", pre: "captura" },

  // 1042: en la bodega, esperando la carga de esta noche.
  { id: "P-24601", c: "c10", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA315022710488", contenido: "Nintendo Switch Lite", cat: CONSOLAS, valor: 199.99, peso: 2.1, etapa: "miami", carga: "1042", pre: "captura", hMiami: 6 },
  { id: "P-24604", c: "c10", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA315029384173", contenido: "Juegos de Nintendo Switch (2)", cat: "Cartuchos y discos físicos de videojuegos", valor: 109.98, peso: 0.5, etapa: "miami", carga: "1042", pre: "captura", hMiami: 1.5, conv: "x10" },
  { id: "P-24607", c: "c2", tienda: "SHEIN", tr: "USPS", tracking: "9400111899562470093551", contenido: "Ropa y accesorios (9 piezas)", cat: ROPA, valor: 58.73, peso: 1.9, etapa: "miami", carga: "1042", pre: "web", hMiami: 0.45, conv: "x2" },
  { id: "P-24610", c: "c16", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA315035521604", contenido: "Aspiradora robot Eufy", cat: "Aspiradoras y planchas de ropa", valor: 159.99, peso: 7.9, medidas: { largo: 18, ancho: 17, alto: 6 }, etapa: "miami", carga: "1042", pre: "equipo", hMiami: 5 },
  { id: "P-24613", c: "c14", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA315040986312", contenido: "Por confirmar", cat: "Otros bienes", valor: 0, peso: 3.4, etapa: "miami", carga: "1042", pre: "sin", hMiami: 4 },
  { id: "P-24616", c: "c12", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA315044213378", contenido: "Funda y protector de pantalla", cat: FUNDAS, valor: 24.99, peso: 0.4, etapa: "miami", carga: "1042", pre: "captura", hMiami: 8 },
  { id: "P-24619", c: "c22", tienda: "Target", tr: "USPS", tracking: "9200190311845560014427", contenido: "Adornos de Navidad", cat: "Artículos para fiestas y temporada", valor: 37.45, peso: 3.1, etapa: "miami", carga: "1042", pre: "web", hMiami: 9 },
  { id: "P-24622", c: "c19", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA315051807259", contenido: "Teclado y mouse Logitech", cat: "Monitores, teclados, mouse, webcams y micrófonos", valor: 59.99, peso: 2.2, etapa: "miami", carga: "1042", pre: "web", hMiami: 7 },
  { id: "P-24625", c: "c9", tienda: "Nordstrom Rack", tr: "UPS", tracking: "1ZA4W8920398412655", contenido: "Lentes de sol Ray-Ban", cat: "Relojes tradicionales, joyería y accesorios de moda", valor: 161, peso: 0.6, etapa: "miami", carga: "1042", pre: "captura", hMiami: 3 },
  { id: "P-24628", c: "c18", tienda: "Target", tr: "FedEx", tracking: "774812376930", contenido: "Coche para bebé Graco", cat: JUGUETES, valor: 329.99, peso: 21.4, medidas: { largo: 33, ancho: 19, alto: 13 }, etapa: "miami", carga: "1042", pre: "web", hMiami: 2 },

  // Pendientes de recepción: la prealerta ya llegó, el paquete todavía no.
  { id: "P-24701", c: "c1", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA318274650012", contenido: "Audífonos Sony WH-CH720N", cat: AUDIO, valor: 89.99, etapa: "pendiente", pre: "captura", hPre: 3.1, captura: "/demo/shopusa/captura-amazon.svg", conv: "x1", confianza: 0.97 },
  { id: "P-24704", c: "c7", tienda: "SHEIN", tr: "USPS", tracking: "9400111899562488215530", contenido: "Blusas y pantalón (4 piezas)", cat: ROPA, valor: 38.5, etapa: "pendiente", pre: "web", hPre: 22 },
  { id: "P-24707", c: "c15", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA318240913377", contenido: "Disco duro externo WD de 2 TB", cat: "SSD, HDD, GPU, CPU, motherboards y memoria RAM", valor: 79.99, etapa: "pendiente", pre: "captura", hPre: 46 },
  { id: "P-24710", c: "c21", tienda: "ColourPop", tr: "USPS", tracking: "9400111899562479930118", contenido: "Paletas de sombras (6)", cat: MAQUILLAJE, valor: 96, etapa: "pendiente", pre: "web", hPre: 28 },
  { id: "P-24713", c: "c18", tienda: "Ulta", tr: "UPS", tracking: "1ZA4W8920399105527", contenido: "Accesorios para el cabello", cat: PIEL, valor: 16.8, etapa: "pendiente", pre: "web", hPre: 5 },
  { id: "P-24716", c: "c8", tienda: "Walmart", tr: "USPS", tracking: "9400111899562491670244", contenido: "Zapatos escolares", cat: CALZADO, valor: 34.97, etapa: "pendiente", pre: "captura", hPre: 70, conv: "x8" },
  { id: "P-24719", c: "c13", tienda: "Amazon", tr: "Amazon Logistics", tracking: "TBA318262207791", contenido: "Laptop Lenovo IdeaPad Slim 3", cat: "Laptops y notebooks", valor: 549, etapa: "pendiente", pre: "web", hPre: 12 },
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
    capturaUrl: "/demo/shopusa/captura-walmart.svg",
    haceMin: 6,
    lectura: {
      tracking: "9400111899562503318867",
      tienda: "Walmart",
      transportista: "USPS",
      contenido: "Silla de comer para bebé Graco",
      categoria: JUGUETES,
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
  if (def.domicilio && c.domicilio) return { tipo: "domicilio", ...c.domicilio };
  return { tipo: "sucursal", sucursal: c.sucursal };
}

// Un desfase chico y estable por paquete, para que no lleguen todos al mismo
// minuto. Sale del id, así la muestra es la misma en cada carga de página.
function desfase(id: string, rangoHoras: number): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return (h % Math.max(1, Math.round(rangoHoras * 60))) * MIN;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

// Quién registra cada prealerta: la IA (captura), el cliente (web) o el equipo.
const ACTOR_PREALERTA: Record<Prealerta["origen"], string> = { captura: "ia", web: "cliente", equipo: "s2" };

export interface MuestraShopusa {
  ahora: number;
  clientes: Cliente[];
  cargas: Carga[];
  paquetes: Paquete[];
}

export function semillaShopusa(ahora: number = AHORA_DEMO): MuestraShopusa {
  const cargas = cargasDeMuestra(ahora);
  const cargaDe = (id?: string) => cargas.find((c) => c.id === id);

  const paquetes = PAQUETES_DEF.map((def): Paquete => {
    const c = cargaDe(def.carga);
    const historial: EventoPaquete[] = [];
    let tPre: number | undefined;

    if (def.etapa === "pendiente") {
      tPre = ahora - (def.hPre ?? 1) * HORA;
      if (def.pre !== "sin") historial.push({ ts: iso(tPre), tipo: "pendiente", actor: ACTOR_PREALERTA[def.pre] });
    } else {
      // Llegó a Miami antes del corte de su carga (o hace hMiami horas si
      // todavía espera). La prealerta fue uno a tres días antes.
      const corte = c ? Date.parse(c.corte) : ahora;
      const tMiami = def.hMiami !== undefined ? ahora - def.hMiami * HORA : corte - 4 * HORA - desfase(def.id, 30);
      if (def.pre !== "sin") {
        tPre = tMiami - 26 * HORA - desfase(`${def.id}p`, 40);
        historial.push({ ts: iso(tPre), tipo: "pendiente", actor: ACTOR_PREALERTA[def.pre] });
      }
      historial.push({ ts: iso(tMiami), tipo: "miami", actor: "s4" });
      if (c && ["transito", "aduana", "listo", "entregado"].includes(def.etapa)) {
        historial.push({ ts: c.sale, tipo: "transito", actor: "sistema" });
      }
      if (c && ["aduana", "listo", "entregado"].includes(def.etapa)) {
        historial.push({ ts: c.llega, tipo: "aduana", actor: "sistema" });
      }
      if (c && def.selectivo) {
        historial.push({ ts: iso(Date.parse(c.llega) + 9 * HORA), tipo: "selectivo", actor: "s3", detalle: def.selectivo });
      }
      if (c && ["listo", "entregado"].includes(def.etapa)) {
        historial.push({ ts: liberacionDe(c), tipo: "listo", actor: "s3" });
      }
      if (def.recordatorio !== undefined) {
        historial.push({ ts: iso(ahora - def.recordatorio * HORA), tipo: "recordatorio", actor: "sistema" });
      }
      if (def.etapa === "entregado") {
        const tEntrega = ahora - (def.hEntregado ?? 24) * HORA;
        // Paga al retirar (o al recibir, si es a domicilio).
        if (def.pagado) historial.push({ ts: iso(tEntrega - 4 * MIN), tipo: "pagado", actor: def.domicilio ? "s6" : "s5" });
        if (def.domicilio) historial.push({ ts: iso(tEntrega - 95 * MIN), tipo: "en_camino", actor: "s6" });
        historial.push({ ts: iso(tEntrega), tipo: "entregado", actor: def.domicilio ? "s6" : "s5" });
      } else if (def.pagado && c) {
        // Pagó en línea apenas le avisamos que estaba listo.
        historial.push({ ts: iso(Date.parse(liberacionDe(c)) + 2 * HORA + 17 * MIN), tipo: "pagado", actor: "cliente" });
      }
    }
    historial.sort((a, b) => a.ts.localeCompare(b.ts));

    const cliente = clienteDe(def.c);
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
      pesoLb: def.etapa === "pendiente" ? undefined : def.peso,
      medidas: def.etapa === "pendiente" ? undefined : def.medidas,
      etapa: def.etapa,
      cargaId: def.carga,
      prealerta:
        def.pre === "sin" || tPre === undefined
          ? undefined
          : {
              origen: def.pre,
              ts: iso(tPre),
              capturaUrl: def.captura,
              lectura,
              conversationId: def.conv ?? (def.pre === "captura" ? cliente.conversationId : undefined),
            },
      selectivo: def.selectivo && c ? { motivo: def.selectivo, desde: iso(Date.parse(c.llega) + 9 * HORA) } : undefined,
      entrega: entregaDe(def),
      pagado: Boolean(def.pagado),
      historial,
      creado: historial[0]?.ts ?? iso(ahora),
      entregadoA: def.etapa === "entregado" ? cliente.nombre : undefined,
    };
  });

  // La cuenta nueva se abrió hace nueve días.
  const clientes = CLIENTES.map((c) => (c.desde ? { ...c } : { ...c, desde: sumarDias(diaSV(ahora), -9) }));

  return { ahora, clientes, cargas, paquetes };
}
