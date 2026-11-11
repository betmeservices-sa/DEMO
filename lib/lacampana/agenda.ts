// La agenda de La Campana: SOLO reservaciones de mesa y eventos (cumpleaños,
// convivios, catering). Los pedidos no entran aquí: van a la cola de cocina de
// su sucursal (lib/lacampana/pedidos.ts), justamente para no saturar la agenda.
//
// Todo es de demostración salvo las sucursales. Las fechas se arman alrededor
// del día en que se abre el panel, para que la semana siempre tenga movimiento.

export type TipoCita = "reserva" | "evento";
export type EstadoCita = "pendiente" | "confirmada" | "cancelada";

export interface Cita {
  id: string;
  tipo: TipoCita;
  titulo: string;
  cliente: string;
  telefono: string;
  sucursalId: string;
  /** Inicio (ISO). */
  inicio: string;
  /** Duración en minutos. */
  duracion: number;
  personas: number;
  estado: EstadoCita;
  canal: "whatsapp" | "instagram" | "facebook" | "llamada";
  nota?: string;
  /** Solo eventos: paquete o menú cotizado. */
  paquete?: string;
  /** Solo eventos: anticipo recibido. */
  anticipo?: number;
}

/** Mesas por sucursal para reservaciones (demo): una mesa = hasta 6 personas. */
export const MESAS_POR_SUCURSAL = 6;

export const HORA_INICIO_AGENDA = 7;
export const HORA_FIN_AGENDA = 22;

type Semilla = Omit<Cita, "id" | "inicio"> & { dia: number; hora: number; minuto?: number };

// dia: 0 = hoy, 1 = mañana, -1 = ayer...
const SEMILLA: Semilla[] = [
  { tipo: "reserva", titulo: "Almuerzo familiar", cliente: "Familia Orellana", telefono: "+503 7023 1150", sucursalId: "plaza-mundo-soyapango", dia: 0, hora: 13, duracion: 90, personas: 8, estado: "confirmada", canal: "whatsapp", nota: "Silla para bebé" },
  { tipo: "reserva", titulo: "Mesa para 4", cliente: "Javier Hernández", telefono: "+503 7712 0098", sucursalId: "metrocentro-santa-ana", dia: 0, hora: 19, minuto: 30, duracion: 90, personas: 4, estado: "confirmada", canal: "instagram" },
  { tipo: "reserva", titulo: "Mesa para 6", cliente: "Patricia Flores", telefono: "+503 7801 4433", sucursalId: "plaza-centro", dia: 0, hora: 20, duracion: 90, personas: 6, estado: "pendiente", canal: "facebook", nota: "Pide terraza" },
  { tipo: "evento", titulo: "Reunión de equipo", cliente: "Distribuidora El Pino", telefono: "+503 2250 1100", sucursalId: "unicentro-metropolis", dia: 1, hora: 12, duracion: 120, personas: 18, estado: "confirmada", canal: "whatsapp", paquete: "Parrilladas para compartir", anticipo: 120 },
  { tipo: "reserva", titulo: "Cena de aniversario", cliente: "Roberto y Elena", telefono: "+503 7666 2390", sucursalId: "lourdes", dia: 1, hora: 19, duracion: 120, personas: 2, estado: "confirmada", canal: "whatsapp", nota: "Mesa tranquila" },
  { tipo: "reserva", titulo: "Desayuno de trabajo", cliente: "Ing. Marroquín", telefono: "+503 7099 5521", sucursalId: "plaza-centro", dia: 2, hora: 8, duracion: 60, personas: 5, estado: "confirmada", canal: "llamada" },
  { tipo: "evento", titulo: "Graduación de bachillerato", cliente: "Colegio Santa Inés", telefono: "+503 2273 9900", sucursalId: "metrocentro-sonsonate", dia: 2, hora: 18, duracion: 180, personas: 35, estado: "pendiente", canal: "facebook", paquete: "Taquizas y quesobirria", nota: "Esperan confirmación de la dirección" },
  { tipo: "evento", titulo: "Cumpleaños de don Nelson", cliente: "Nelson Aguirre", telefono: "+503 7340 1122", sucursalId: "unicentro-metropolis", dia: 3, hora: 12, duracion: 180, personas: 30, estado: "confirmada", canal: "facebook", paquete: "Parrilladas y taquizas, ~$15 por persona", anticipo: 150, nota: "Traen su pastel. Terraza reservada." },
  { tipo: "reserva", titulo: "Mesa para 8", cliente: "Grupo de ciclistas", telefono: "+503 7456 8800", sucursalId: "opico", dia: 3, hora: 9, duracion: 90, personas: 8, estado: "confirmada", canal: "instagram" },
  { tipo: "reserva", titulo: "Mesa para 3", cliente: "Gabriela Menjívar", telefono: "+503 7811 4520", sucursalId: "lourdes", dia: 4, hora: 13, duracion: 60, personas: 3, estado: "pendiente", canal: "instagram" },
  { tipo: "evento", titulo: "Convivio de fin de año", cliente: "Corporación Santa Elena (RRHH)", telefono: "+503 2209 4400", sucursalId: "plaza-centro", dia: 5, hora: 12, duracion: 180, personas: 60, estado: "pendiente", canal: "whatsapp", paquete: "Catering en sus oficinas", nota: "Servicio a domicilio en Santa Elena" },
  { tipo: "reserva", titulo: "Mesa para 10", cliente: "Familia Rivas", telefono: "+503 7311 0420", sucursalId: "plaza-mundo-soyapango", dia: 5, hora: 14, duracion: 120, personas: 10, estado: "confirmada", canal: "whatsapp" },
  { tipo: "reserva", titulo: "Mesa para 2", cliente: "Marisol Hernández", telefono: "+503 7455 0318", sucursalId: "apopa", dia: 6, hora: 19, duracion: 60, personas: 2, estado: "cancelada", canal: "whatsapp", nota: "Canceló por la queja del pedido" },
  { tipo: "reserva", titulo: "Desayuno del club", cliente: "Club de lectura", telefono: "+503 7781 2233", sucursalId: "san-martin", dia: -1, hora: 10, duracion: 90, personas: 7, estado: "confirmada", canal: "facebook" },
];

/** Medianoche local del día de `ahora` desplazado `dias`. */
function inicioDeDia(ahora: number, dias: number): Date {
  const d = new Date(ahora);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  return d;
}

export function semillaAgenda(ahora: number): Cita[] {
  return SEMILLA.map(({ dia, hora, minuto, ...c }, i) => {
    const d = inicioDeDia(ahora, dia);
    d.setHours(hora, minuto ?? 0, 0, 0);
    return { ...c, id: `C-${100 + i}`, inicio: d.toISOString() };
  });
}

/** El lunes (00:00) de la semana de `fecha`. */
export function lunesDe(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  const dia = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - dia);
  return d;
}

export function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Personas ya reservadas en una sucursal a esa hora (citas que se traslapan).
 * Sirve para avisar antes de aceptar una reservación que no cabe.
 */
export function ocupacion(citas: Cita[], sucursalId: string, inicio: Date, duracion: number, ignorar?: string): number {
  const a = inicio.getTime();
  const b = a + duracion * 60_000;
  return citas
    .filter((c) => c.id !== ignorar && c.sucursalId === sucursalId && c.estado !== "cancelada")
    .filter((c) => {
      const ca = Date.parse(c.inicio);
      const cb = ca + c.duracion * 60_000;
      return ca < b && a < cb;
    })
    .reduce((t, c) => t + c.personas, 0);
}

export function capacidadSucursal(): number {
  return MESAS_POR_SUCURSAL * 6;
}
