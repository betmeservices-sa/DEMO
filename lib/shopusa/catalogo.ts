// Catálogo de ShopUSA: etapas, sucursales, tarifas, categorías y nombres.
//
// Lo que se afirma del negocio sale de shopusa.la (inicio y su calculadora de
// envío, tarifas, contacto, preguntas frecuentes, atención al cliente, el
// rastreo y los términos y condiciones), revisado el 2026-10-20:
//   - Flete por libra o fracción: $4.99 hasta 5 lb y $4.40 desde 6 lb, todo
//     el peso al precio de su tramo. El peso se redondea hacia arriba.
//   - IVA 13% sobre el valor de la factura. Si la factura pasa de $300, también
//     DAI, con el porcentaje de la categoría del producto (su calculadora).
//   - Tarifa fija en electrónicos con factura desde $100: laptops $50,
//     celulares $25, tablets y Kindles $35, relojes y smartwatch $15 o $25.
//   - Si el peso volumétrico (L x A x H en pulgadas / 166) supera 3 veces el
//     real, se cobra el promedio de los dos.
//   - Los paquetes de un mismo cliente en la misma carga se consolidan: se
//     pesan juntos y se emite un solo cargo.
//   - Sin prealerta antes de llegar a la bodega: cargo de $1.50. Traslado entre
//     sucursales: $2.50 (no se cobra si se prealertó a tiempo). Domicilio:
//     $3.50 en el área metropolitana y $7.00 fuera de ella.
//   - Se retira con DUI en la sucursal elegida, de lunes a viernes de 9:00 a. m.
//     a 6:00 p. m. y sábado de 9:00 a. m. a 1:00 p. m. Hay 30 días para
//     retirar; después, 10% del total por semana de almacenaje, y a los 60 días
//     el paquete cae en abandono.
//   - Entrega estimada: 7 días hábiles desde que el paquete llega a la bodega.
//
// Lo que NO está publicado y el demo necesita (qué días y a qué hora sale cada
// carga, el formato del código de cliente) se dice como supuesto nuestro
// donde se use.

import type { AreaEntrega, Etapa, SucursalId, Tienda, Transportista } from "./tipos";

export interface EtapaDef {
  id: Etapa;
  /** Como lo dice el rastreo de shopusa.la. */
  nombre: string;
  /** Para donde no cabe el nombre entero (la línea de la ficha). */
  corto: string;
  /** Una línea para la columna del tablero. */
  detalle: string;
  /** El código del estado en su sistema de rastreo. */
  codigo: string;
  /** Token del tema para el punto de la etapa (nunca texto). */
  color: string;
}

export const ETAPAS: readonly EtapaDef[] = [
  { id: "pendiente", nombre: "Pendiente de recepción", corto: "Prealerta", detalle: "Prealertado, viene en camino a Miami", codigo: "RE", color: "var(--susa-etapa-pendiente)" },
  { id: "miami", nombre: "En bodega Florida", corto: "Miami", detalle: "Recibido y pesado en Miami", codigo: "RM", color: "var(--susa-etapa-miami)" },
  { id: "transito", nombre: "En tránsito", corto: "Tránsito", detalle: "Despachado de Miami", codigo: "DE", color: "var(--susa-etapa-transito)" },
  { id: "aduana", nombre: "Recibido en aduana", corto: "Aduana", detalle: "En El Salvador, en trámite", codigo: "RA", color: "var(--susa-etapa-aduana)" },
  { id: "listo", nombre: "Listo para entregar", corto: "Listo", detalle: "En sucursal o por salir a domicilio", codigo: "LE", color: "var(--susa-etapa-listo)" },
  { id: "entregado", nombre: "Entregado", corto: "Entregado", detalle: "Retirado o entregado a domicilio", codigo: "EN", color: "var(--susa-etapa-entregado)" },
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
  /** Donde queda, para decirlo en una línea. */
  zona: string;
  direccion: string;
}

// Las siete sucursales de la página de contacto, con su dirección tal cual.
export const SUCURSALES: readonly SucursalDef[] = [
  { id: "mascota", nombre: "La Mascota", zona: "San Salvador", direccion: "Urbanización Maquilishuat, Calle La Mascota y Avenida Las Azaleas, N°210, San Salvador" },
  { id: "metro_sur", nombre: "Metro Sur", zona: "San Salvador", direccion: "Bulevar de Los Héroes y Alameda Juan Pablo II, San Salvador" },
  { id: "salvador_del_mundo", nombre: "Salvador del Mundo", zona: "San Salvador", direccion: "Alameda Roosevelt, entre 63 y 65 Avenida Norte, Centro Comercial Salvador del Mundo" },
  { id: "santa_elena", nombre: "Santa Elena", zona: "Antiguo Cuscatlán", direccion: "Calle Cortez Blanco poniente, Urbanización Madreselva, Centro Comercial San Andrés, local #4, Antiguo Cuscatlán" },
  { id: "santa_tecla", nombre: "Santa Tecla", zona: "Santa Tecla", direccion: "Carretera Panamericana, Centro Comercial Ramblas, sótano, local #S111" },
  { id: "soyapango", nombre: "Soyapango", zona: "Soyapango", direccion: "Centro Comercial Boulevard Espíritu Santo, Km 20, Carretera de Oro, Soyapango" },
  { id: "santa_ana", nombre: "Santa Ana", zona: "Santa Ana", direccion: "Las Ramblas, Carretera Panamericana, Santa Ana" },
];

export function sucursalDef(id: SucursalId): SucursalDef {
  return SUCURSALES.find((s) => s.id === id) ?? SUCURSALES[0];
}

export function esSucursal(v: unknown): v is SucursalId {
  return typeof v === "string" && SUCURSALES.some((s) => s.id === v);
}

// El mismo horario para retirar en todas las sucursales (términos, cláusula 12).
export const HORARIO = { semana: "lunes a viernes de 9:00 a. m. a 6:00 p. m.", sabado: "sábado de 9:00 a. m. a 1:00 p. m." };

export const WHATSAPP_SHOPUSA = "7858-0444";
export const TELEFONO_SHOPUSA = "2252-9213";
export const CORREO_SHOPUSA = "hello@shopusa.la";
export const CORREO_PREALERTA = "prealerta@shopusa.la";
export const REGISTRO_URL = "shopusa.la/registro";
export const PREALERTA_URL = "shopusa.la/pre-alerta";

// La dirección de compra, como la da el paso 2 de su página de inicio. El sitio
// muestra dos códigos postales para la misma bodega (33166 en servicios y
// 33195 en estas instrucciones): va el de las instrucciones, que es el que
// el cliente copia al comprar.
export const BODEGA = {
  nombre: "SUSA + nombre y apellido",
  linea: "7343 NW 79th Ter. Suite 503",
  ciudad: "Medley",
  estado: "Florida",
  zip: "33195",
  telefono: "(305) 999-7380",
} as const;

// Flete por libra o fracción. Todo el peso va al precio de su tramo.
export const TARIFA_HASTA_5 = 4.99;
export const TARIFA_DESDE_6 = 4.4;
export const LIBRAS_TRAMO = 5;

export const IVA = 0.13;
// Factura de MÁS de este monto: además del IVA, paga DAI.
export const LIMITE_DAI = 300;
export const DIVISOR_VOLUMEN = 166;
// El volumen manda cuando supera esta cantidad de veces el peso real.
export const VECES_VOLUMEN = 3;

export const RECARGO_SIN_PREALERTA = 1.5;
export const CARGO_TRASLADO = 2.5;
export const CARGO_DOMICILIO: Record<AreaEntrega, number> = { metro: 3.5, fuera: 7 };

export const DIAS_SIN_ALMACENAJE = 30;
export const ALMACENAJE_POR_SEMANA = 0.1;
export const DIAS_ABANDONO = 60;
// A cuántos días del cobro de almacenaje se avisa en el tablero.
export const DIAS_AVISO_ALMACENAJE = 7;
export const DIAS_HABILES_ENTREGA = 7;

export interface CategoriaDef {
  nombre: string;
  grupo: string;
  /** Porcentaje de DAI cuando la factura pasa de $300. */
  dai: number;
  /** Tarifa fija por tramo de factura (reemplaza al DAI). */
  fija?: readonly { desde: number; monto: number }[];
}

const TEC = "Tecnología: cómputo, conectividad y telecomunicaciones";
const PER = "Tecnología: componentes, periféricos y equipo especializado";
const AUD = "Tecnología: consolas, audio, video y medios";
const SAL = "Consumo: cuidado personal, belleza y salud";
const MOD = "Consumo: textil, calzado, moda y deporte";
const HOG = "Consumo: hogar, vehículos y bienes generales";

// La lista de su calculadora de envío, con su DAI y su tarifa fija, en el
// mismo orden. La IA clasifica cada compra en una de estas.
export const CATEGORIAS: readonly CategoriaDef[] = [
  { grupo: TEC, nombre: "Laptops y notebooks", dai: 0, fija: [{ desde: 100, monto: 50 }] },
  { grupo: TEC, nombre: "Computadoras de escritorio y servidores", dai: 0 },
  { grupo: TEC, nombre: "Celulares y smartphones", dai: 0, fija: [{ desde: 100, monto: 25 }] },
  { grupo: TEC, nombre: "Tablets", dai: 0, fija: [{ desde: 100, monto: 35 }] },
  { grupo: TEC, nombre: "Kindles y lectores electrónicos", dai: 0, fija: [{ desde: 100, monto: 35 }] },
  { grupo: TEC, nombre: "Routers, módems, switches, antenas y repetidores", dai: 0 },
  { grupo: TEC, nombre: "Relojes y smartwatch", dai: 0, fija: [{ desde: 100, monto: 15 }, { desde: 150, monto: 25 }] },
  { grupo: TEC, nombre: "Pulseras de actividad y visores VR/AR", dai: 0 },
  { grupo: TEC, nombre: "Fax, teléfonos fijos y sus accesorios", dai: 0 },
  { grupo: TEC, nombre: "Videocámaras de circuito cerrado", dai: 0 },
  { grupo: PER, nombre: "SSD, HDD, GPU, CPU, motherboards y memoria RAM", dai: 0 },
  { grupo: PER, nombre: "Monitores, teclados, mouse, webcams y micrófonos", dai: 0 },
  { grupo: PER, nombre: "Impresoras de tinta, láser, 3D y escáneres", dai: 0 },
  { grupo: PER, nombre: "Fundas para teléfonos y mochilas para laptops", dai: 15 },
  { grupo: PER, nombre: "Cables, cargadores de pared y baterías externas", dai: 10 },
  { grupo: PER, nombre: "Equipo de oficina y accesorios", dai: 15 },
  { grupo: PER, nombre: "Papelería y artículos escolares o de oficina", dai: 15 },
  { grupo: PER, nombre: "Repuestos eléctricos", dai: 0 },
  { grupo: PER, nombre: "Repuestos para máquinas industriales", dai: 0 },
  { grupo: AUD, nombre: "Consolas de videojuegos", dai: 15 },
  { grupo: AUD, nombre: "Cartuchos y discos físicos de videojuegos", dai: 15 },
  { grupo: AUD, nombre: "Smart TVs LED, OLED y QLED", dai: 15 },
  { grupo: AUD, nombre: "Audífonos, barras de sonido y altavoces", dai: 15 },
  { grupo: AUD, nombre: "Cámaras, lentes fotográficos y drones con cámara", dai: 10 },
  { grupo: AUD, nombre: "Amplificadores de sonido", dai: 0 },
  { grupo: AUD, nombre: "CD de música", dai: 10 },
  { grupo: AUD, nombre: "DVD de música", dai: 10 },
  { grupo: AUD, nombre: "DVD de video y audio", dai: 0 },
  { grupo: AUD, nombre: "Instrumentos musicales", dai: 10 },
  { grupo: SAL, nombre: "Medicamentos, vitaminas, fórmulas y equipo de diagnóstico", dai: 0 },
  { grupo: SAL, nombre: "Cosméticos y maquillaje", dai: 15 },
  { grupo: SAL, nombre: "Cuidado de la piel y el cabello", dai: 15 },
  { grupo: SAL, nombre: "Productos de higiene diaria", dai: 10 },
  { grupo: SAL, nombre: "Pañales, compresas y tampones higiénicos", dai: 15 },
  { grupo: SAL, nombre: "Aros para lentes", dai: 0 },
  { grupo: SAL, nombre: "Lentes de contacto", dai: 5 },
  { grupo: SAL, nombre: "Lentes en bruto", dai: 0 },
  { grupo: SAL, nombre: "Perfumes sujetos a restricciones", dai: 15 },
  { grupo: MOD, nombre: "Prendas de vestir", dai: 15 },
  { grupo: MOD, nombre: "Calzado", dai: 15 },
  { grupo: MOD, nombre: "Carteras, billeteras, bolsos y maletas", dai: 15 },
  { grupo: MOD, nombre: "Relojes tradicionales, joyería y accesorios de moda", dai: 15 },
  { grupo: MOD, nombre: "Artículos deportivos", dai: 10 },
  { grupo: MOD, nombre: "Bicicletas sin motor", dai: 15 },
  { grupo: MOD, nombre: "Sombreros y cascos de seguridad", dai: 15 },
  { grupo: MOD, nombre: "Paraguas, sombrillas, quitasoles y bastones", dai: 15 },
  { grupo: HOG, nombre: "Línea blanca y electrodomésticos", dai: 15 },
  { grupo: HOG, nombre: "Licuadoras, cafeteras y freidoras de aire", dai: 15 },
  { grupo: HOG, nombre: "Aspiradoras y planchas de ropa", dai: 10 },
  { grupo: HOG, nombre: "Muebles y decoración", dai: 15 },
  { grupo: HOG, nombre: "Juguetes y artículos infantiles", dai: 15 },
  { grupo: HOG, nombre: "Herramientas de bricolaje", dai: 10 },
  { grupo: HOG, nombre: "Accesorios para motocicletas", dai: 5 },
  { grupo: HOG, nombre: "Accesorios para vehículos", dai: 5 },
  { grupo: HOG, nombre: "Artículos para cocina y mesa", dai: 15 },
  { grupo: HOG, nombre: "Termos y recipientes isotérmicos", dai: 10 },
  { grupo: HOG, nombre: "Artículos para fiestas y temporada", dai: 15 },
  { grupo: HOG, nombre: "Azúcar", dai: 40 },
  { grupo: HOG, nombre: "Comestibles permitidos", dai: 15 },
  { grupo: HOG, nombre: "Libros", dai: 0 },
  { grupo: HOG, nombre: "Manufacturas de hierro", dai: 10 },
  { grupo: HOG, nombre: "Manufacturas de madera", dai: 15 },
  { grupo: HOG, nombre: "Manufacturas de vidrio", dai: 15 },
  { grupo: HOG, nombre: "Manufacturas plásticas", dai: 15 },
  { grupo: HOG, nombre: "Materia prima", dai: 0 },
  { grupo: HOG, nombre: "Otros bienes", dai: 20 },
  { grupo: HOG, nombre: "Repuestos para motocicletas", dai: 5 },
  { grupo: HOG, nombre: "Repuestos mecánicos para vehículos", dai: 1 },
];

export function categoriaDef(nombre: string): CategoriaDef | undefined {
  return CATEGORIAS.find((c) => c.nombre === nombre);
}

// Lo que su calculadora marca como prohibido.
export const PROHIBIDOS: readonly string[] = [
  "Alcohol y tabaco",
  "Productos agrícolas",
  "Alimentos o medicamentos para animales",
  "Alimentos cárnicos",
  "Productos refrigerados",
  "Productos inflamables",
  "Líquidos para cigarro electrónico",
  "Juguetes sexuales",
  "Armas y sus accesorios",
];

export const TIENDAS: readonly Tienda[] = [
  "Amazon",
  "SHEIN",
  "eBay",
  "Target",
  "Walmart",
  "Sephora",
  "Ulta",
  "ColourPop",
  "Macy's",
  "Nordstrom Rack",
  "Old Navy",
  "Carter's",
  "H&M",
  "IKEA",
  "AliExpress",
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
  { id: "s5", nombre: "Fátima Cruz", iniciales: "FC", puesto: "Sucursal La Mascota" },
  { id: "s6", nombre: "Óscar Henríquez", iniciales: "OH", puesto: "Entregas a domicilio" },
  { id: "s7", nombre: "Ricardo Alvarado", iniciales: "RA", puesto: "Jefatura de operaciones" },
];

export function nombreActor(id: string): string {
  if (id === "ia") return "Lucía (IA)";
  if (id === "sistema") return "Automático";
  if (id === "cliente") return "El cliente, en shopusa.la";
  return EQUIPO.find((p) => p.id === id)?.nombre ?? "Equipo";
}

export interface MotivoSelectivo {
  texto: string;
  /** Si se destraba con la factura que mande el cliente. */
  pideFactura: boolean;
}

// Por qué aduana le da selectivo rojo a un paquete. Salen de los términos: la
// factura respalda el valor ante Aduanas, los descuentos solo valen en uso
// personal, y algunos productos necesitan permiso de otra institución.
export const MOTIVOS_SELECTIVO: readonly MotivoSelectivo[] = [
  { texto: "Aduana pide la factura de compra", pideFactura: true },
  { texto: "El valor declarado no coincide con la factura", pideFactura: true },
  { texto: "Aduana revisa el contenido del paquete", pideFactura: false },
  { texto: "Necesita permiso de la Dirección Nacional de Medicamentos", pideFactura: false },
];

export function motivoSelectivo(texto: string): MotivoSelectivo {
  return MOTIVOS_SELECTIVO.find((m) => m.texto === texto) ?? { texto, pideFactura: true };
}

// Zonas de entrega a domicilio del demo y si caen dentro del área
// metropolitana ($3.50) o fuera ($7.00). Las zonas de cobertura reales las
// define ShopUSA y no están publicadas.
export const ZONAS_DOMICILIO: readonly { zona: string; area: AreaEntrega }[] = [
  { zona: "San Salvador", area: "metro" },
  { zona: "Antiguo Cuscatlán", area: "metro" },
  { zona: "Santa Tecla", area: "metro" },
  { zona: "Soyapango", area: "metro" },
  { zona: "Mejicanos", area: "metro" },
  { zona: "San Marcos", area: "metro" },
  { zona: "Ilopango", area: "metro" },
  { zona: "Apopa", area: "metro" },
  { zona: "Santa Ana", area: "fuera" },
  { zona: "San Miguel", area: "fuera" },
  { zona: "Sonsonate", area: "fuera" },
  { zona: "La Libertad", area: "fuera" },
];
