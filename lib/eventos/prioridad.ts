// Prioridad, datos faltantes, plazo del primer contacto y reparto de asesores.
//
// Todo puro: recibe la propuesta y "hoy", y devuelve el resultado CON SUS
// RAZONES. La pantalla las muestra tal cual, para que el asesor vea por qué
// una propuesta salió Alta y no tenga que creerle a un número.

import type { DatosEvento, Etapa, Propuesta } from "./tipos";
import { ASESORES, ETAPAS_ABIERTAS } from "./catalogo";
import { diasEntre } from "./fechas";

export type NivelPrioridad = "alta" | "media" | "baja";

export interface Razon {
  texto: string;
  puntos: number; // positivo suma, negativo resta
}

export interface Prioridad {
  nivel: NivelPrioridad;
  puntos: number;
  razones: Razon[];
}

export const NOMBRE_PRIORIDAD: Record<NivelPrioridad, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

const miles = (n: number) => n.toLocaleString("en-US");

export const UMBRAL_ALTA = 9;
export const UMBRAL_MEDIA = 5;

/**
 * Qué tan pronto conviene atender esta propuesta.
 *
 * Suma por aforo, por cercanía de la fecha (y del plazo que puso el
 * organizador), por exclusividad, por la condición comercial, por lo que el
 * organizador incluye (energía, agua, toldo), por historial de ediciones
 * anteriores y por qué tan completos están los datos. 9 o más es Alta; de 5 a
 * 8, Media; menos, Baja.
 */
export function calcularPrioridad(d: DatosEvento, hoy: string): Prioridad {
  const razones: Razon[] = [];
  const sumar = (puntos: number, texto: string) => razones.push({ puntos, texto });

  // Aforo
  if (d.aforo_esperado >= 10_000) sumar(4, `Aforo de ${miles(d.aforo_esperado)} personas`);
  else if (d.aforo_esperado >= 5_000) sumar(3, `Aforo de ${miles(d.aforo_esperado)} personas`);
  else if (d.aforo_esperado >= 2_000) sumar(2, `Aforo de ${miles(d.aforo_esperado)} personas`);
  else if (d.aforo_esperado >= 800) sumar(1, `Aforo de ${miles(d.aforo_esperado)} personas`);
  else if (d.aforo_esperado > 0) sumar(0, `Aforo chico: ${miles(d.aforo_esperado)} personas`);

  // Días que faltan
  if (d.fecha_inicio) {
    const faltan = diasEntre(hoy, d.fecha_inicio);
    if (faltan < 0) sumar(-3, "La fecha del evento ya pasó");
    else if (faltan <= 21) sumar(2, faltan === 0 ? "El evento es hoy" : `Faltan ${faltan} ${faltan === 1 ? "día" : "días"}: hay que responder ya`);
    else if (faltan <= 60) sumar(1, `Faltan ${faltan} días`);
  }
  if (d.fecha_limite_respuesta) {
    const plazo = diasEntre(hoy, d.fecha_limite_respuesta);
    if (plazo >= 0 && plazo <= 7) sumar(1, plazo === 0 ? "Piden respuesta hoy" : `Piden respuesta en ${plazo} ${plazo === 1 ? "día" : "días"}`);
  }

  // Exclusividad
  if (d.exclusividad_pizza === "si") sumar(2, "Exclusividad de pizza en el evento");
  else if (d.exclusividad_pizza === "no") sumar(-1, "Sin exclusividad de pizza");

  // Condición comercial
  switch (d.condicion_comercial) {
    case "sin_costo":
      sumar(2, "Sin costo de participación");
      break;
    case "canje":
      sumar(1, "Participación por canje");
      break;
    case "comision":
      if (d.porcentaje_comision > 0 && d.porcentaje_comision <= 15) sumar(1, `Comisión de ${d.porcentaje_comision}% sobre ventas`);
      else if (d.porcentaje_comision > 25) sumar(-1, `Comisión alta: ${d.porcentaje_comision}%`);
      break;
    case "cuota_fija":
    case "cuota_mas_comision":
      if (d.monto_cuota > 0 && d.aforo_esperado > 0) {
        const porPersona = d.monto_cuota / d.aforo_esperado;
        if (porPersona <= 0.1) sumar(1, `Cuota baja para el aforo ($${miles(d.monto_cuota)})`);
        else if (porPersona > 0.5) sumar(-1, `Cuota alta para el aforo ($${miles(d.monto_cuota)})`);
      }
      break;
  }

  // Servicios incluidos
  const incluidos = [
    d.energia_electrica === "incluida" ? "energía" : "",
    d.agua === "incluida" ? "agua" : "",
    d.toldo_mobiliario === "incluido" ? "toldo" : "",
  ].filter(Boolean);
  if (incluidos.length >= 2) sumar(1, `Incluye ${unir(incluidos)}`);

  // Recurrente con historial
  if (d.evento_recurrente && d.asistencia_anterior > 0) {
    sumar(1, `Evento recurrente: ${miles(d.asistencia_anterior)} asistentes la edición pasada`);
  } else if (d.evento_recurrente) {
    sumar(0, "Evento recurrente");
  }

  // Completitud
  const pct = completitud(d);
  if (pct >= 0.85) sumar(1, "Datos casi completos");
  else if (pct < 0.5) sumar(-2, "Faltan muchos datos");

  const puntos = razones.reduce((n, r) => n + r.puntos, 0);
  const nivel: NivelPrioridad = puntos >= UMBRAL_ALTA ? "alta" : puntos >= UMBRAL_MEDIA ? "media" : "baja";
  return { nivel, puntos, razones };
}

function unir(xs: string[]): string {
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;
}

// ── Datos faltantes ──

export interface Faltante {
  campo: keyof DatosEvento;
  etiqueta: string;
}

/**
 * Lo que quedó vacío o "por definir": la lista que el asesor completa cuando
 * llama. Una propuesta con faltantes se crea igual; esto le dice qué preguntar.
 */
export function datosFaltantes(d: DatosEvento): Faltante[] {
  const f: Faltante[] = [];
  const falta = (campo: keyof DatosEvento, etiqueta: string) => f.push({ campo, etiqueta });

  if (!d.nombre_evento) falta("nombre_evento", "Nombre del evento");
  if (!d.fecha_inicio) falta("fecha_inicio", "Fecha del evento");
  if (!d.horario) falta("horario", "Horario");
  if (!d.recinto) falta("recinto", "Lugar o recinto");
  if (!d.municipio && !d.departamento) falta("municipio", "Municipio y departamento");
  if (d.aforo_esperado <= 0) falta("aforo_esperado", "Aforo esperado");
  if (!d.perfil_publico) falta("perfil_publico", "Perfil del público");
  if (!d.tipo_entrada) falta("tipo_entrada", "Tipo de entrada");
  if (d.modalidad === "por_definir") falta("modalidad", "Modalidad de participación");
  if (d.condicion_comercial === "por_definir") falta("condicion_comercial", "Condición comercial");
  if ((d.condicion_comercial === "cuota_fija" || d.condicion_comercial === "cuota_mas_comision") && d.monto_cuota <= 0) {
    falta("monto_cuota", "Monto de la cuota");
  }
  if ((d.condicion_comercial === "comision" || d.condicion_comercial === "cuota_mas_comision") && d.porcentaje_comision <= 0) {
    falta("porcentaje_comision", "Porcentaje de comisión");
  }
  if (d.exclusividad_pizza === "por_definir") falta("exclusividad_pizza", "Exclusividad de pizza");
  if (!d.tamano_espacio) falta("tamano_espacio", "Tamaño del espacio");
  if (d.energia_electrica === "por_definir") falta("energia_electrica", "Energía eléctrica");
  if (d.agua === "por_definir") falta("agua", "Agua");
  if (d.toldo_mobiliario === "por_definir") falta("toldo_mobiliario", "Toldo y mobiliario");
  if (d.permisos_a_cargo_de === "por_definir") falta("permisos_a_cargo_de", "Quién tramita los permisos");
  if (!d.contacto_nombre) falta("contacto_nombre", "Nombre del contacto");
  if (!d.contacto_telefono) falta("contacto_telefono", "Teléfono del contacto");
  if (!d.contacto_correo) falta("contacto_correo", "Correo del contacto");
  return f;
}

/** Cuántos de los campos que se piden en la llamada quedaron con dato (0 a 1). */
export function completitud(d: DatosEvento): number {
  // 19 campos se piden siempre; el monto y el porcentaje solo si la condición
  // los lleva.
  const conCuota = d.condicion_comercial === "cuota_fija" || d.condicion_comercial === "cuota_mas_comision";
  const conComision = d.condicion_comercial === "comision" || d.condicion_comercial === "cuota_mas_comision";
  const total = 19 + (conCuota ? 1 : 0) + (conComision ? 1 : 0);
  return Math.max(0, (total - datosFaltantes(d).length) / total);
}

// ── Plazo de primer contacto ──

export const PLAZO_PRIMER_CONTACTO_H = 24;

export interface EstadoPlazo {
  /** Hay que contactar todavía (nadie lo ha hecho y la propuesta sigue abierta). */
  pendiente: boolean;
  vencido: boolean;
  /** Horas que faltan (positivo) o que lleva vencido (negativo). */
  horas: number;
  venceEn: string; // ISO
}

export function plazoPrimerContacto(
  p: Pick<Propuesta, "creada" | "primerContacto" | "etapa">,
  ahora: number = Date.now(),
): EstadoPlazo {
  const vence = new Date(p.creada).getTime() + PLAZO_PRIMER_CONTACTO_H * 3_600_000;
  const pendiente = !p.primerContacto && (p.etapa === "nueva" || p.etapa === "revision");
  const horas = Math.round(((vence - ahora) / 3_600_000) * 10) / 10;
  return { pendiente, vencido: pendiente && ahora > vence, horas, venceEn: new Date(vence).toISOString() };
}

// ── Reparto de asesores ──

/**
 * A quién le toca una propuesta nueva: al asesor con MENOS propuestas
 * abiertas. Empate: el primero de la lista. Así el reparto queda parejo aunque
 * entren varias seguidas o alguien cierre muchas en un día.
 */
export function asignarAsesor(propuestas: Pick<Propuesta, "asesorId" | "etapa">[]): string {
  const carga = new Map(ASESORES.map((a) => [a.id, 0]));
  for (const p of propuestas) {
    if (!ETAPAS_ABIERTAS.includes(p.etapa as Etapa)) continue;
    if (carga.has(p.asesorId)) carga.set(p.asesorId, (carga.get(p.asesorId) ?? 0) + 1);
  }
  let elegido = ASESORES[0].id;
  let menor = Infinity;
  for (const a of ASESORES) {
    const n = carga.get(a.id) ?? 0;
    if (n < menor) {
      menor = n;
      elegido = a.id;
    }
  }
  return elegido;
}
