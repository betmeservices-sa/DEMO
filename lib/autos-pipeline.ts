// El embudo de la sala de ventas: en que va cada prospecto, quien lo atiende y
// que se le esta enfriando al equipo.
//
// Es el espejo del embudo de credito (lib/ventas-pipeline), con la misma regla
// de oro y un objeto distinto. LA REGLA: la etapa NO se escribe a mano, sale de
// los pasos de la venta y de las marcas de tiempo, asi el tablero no puede
// mentir. EL OBJETO: aca no se persigue un expediente, se persigue una unidad.
// Alguien que ya manejo el carro y dejo el deposito esta mas cerca de comprar
// que alguien con todos los papeles en regla, y el tablero tiene que decir eso.
//
// Puro (sin base y sin reloj propio) para poder probarlo: recibe las
// oportunidades y devuelve etapas, alertas y el reporte del gerente.

import {
  PASOS,
  PASOS_REQUERIDOS,
  modeloDe,
  nombreDeModelo,
  nombreDeTraba,
  type MotivoTraba,
} from "./autos-catalogo";
import { HORA, DIA, type Rango } from "./periodos";

export type EtapaId =
  | "nuevos"
  | "contactados"
  | "sin_respuesta"
  | "cotizados"
  | "prueba"
  | "negociacion"
  | "separados"
  | "entregados"
  | "perdidos";

export interface Etapa {
  id: EtapaId;
  nombre: string;
  /** Que significa estar aca, para quien abre el tablero por primera vez. */
  ayuda: string;
  /** El color del tramo en el embudo. Uno por etapa, para leerlo de un vistazo. */
  color: string;
}

/**
 * Los colores del embudo son una RAMPA del rojo de la marca, de claro a oscuro
 * conforme la venta avanza: el tablero se va cargando de color hasta la
 * entrega. Es una sola magnitud a lo largo de un proceso ordenado, no
 * categorias, asi que rampa y no paleta.
 *
 * Tres se salen de la rampa a proposito. "Sin respuesta" va en ambar porque no
 * es un paso adelante sino un desvio; "entregados" en verde y "perdidos" en
 * gris, porque son el resultado y no un lugar donde alguien espera algo.
 *
 * Todos los tramos abiertos llevan texto BLANCO encima en el embudo, asi que
 * todos pasan el 4.5:1 contra blanco (lo cubre nissan-tema.test.ts). Si se
 * agrega una etapa, hay que medir el tono nuevo, no elegirlo a ojo.
 */
export const ETAPAS: Etapa[] = [
  {
    id: "nuevos",
    nombre: "Leads asignados",
    ayuda: "Entró el lead y tiene vendedor, pero todavía nadie le habla",
    color: "#e11d48",
  },
  {
    id: "contactados",
    nombre: "Contactados",
    ayuda: "Ya se le habló y contestó",
    color: "#d80b3c",
  },
  {
    id: "sin_respuesta",
    nombre: "Sin respuesta",
    ayuda: "Se le habló y lleva días sin contestar",
    color: "#8a5300",
  },
  {
    id: "cotizados",
    nombre: "Con cotización",
    ayuda: "Ya tiene el precio por escrito y lo está pensando",
    color: "#c3002f",
  },
  {
    id: "prueba",
    nombre: "Prueba de manejo",
    ayuda: "Agendada o ya manejó la unidad",
    color: "#ab0029",
  },
  {
    id: "negociacion",
    nombre: "Negociación",
    ayuda: "Hay propuesta en firme sobre la mesa, falta que diga que sí",
    color: "#930023",
  },
  {
    id: "separados",
    nombre: "Unidad separada",
    ayuda: "Dejó el depósito: la unidad ya no se le vende a otro",
    color: "#7b001d",
  },
  { id: "entregados", nombre: "Entregados", ayuda: "Vendido y con las llaves puestas", color: "#146c43" },
  { id: "perdidos", nombre: "Perdidos", ayuda: "No compró", color: "#525252" },
];

export const ETAPA: Record<EtapaId, Etapa> = Object.fromEntries(ETAPAS.map((e) => [e.id, e])) as Record<
  EtapaId,
  Etapa
>;

/** Las etapas donde el caso sigue vivo. */
export const ETAPAS_ABIERTAS: EtapaId[] = ETAPAS.filter(
  (e) => e.id !== "entregados" && e.id !== "perdidos",
).map((e) => e.id);

// ---- Los pasos de cada venta ------------------------------------------------

export type EstadoPaso = "pendiente" | "agendado" | "hecho" | "trabado";

export interface PasoEnCurso {
  estado: EstadoPaso;
  /** Solo cuando esta trabado: por que no avanza. */
  motivo?: MotivoTraba | null;
  /** Lo que escribio el vendedor (el valor del usado, el color que pidio). */
  nota?: string | null;
  /** Cuando quedo en este estado (ISO). */
  ts?: string | null;
  /** Para lo agendado: cuando es la cita (ISO). */
  fecha?: string | null;
  /** Quien lo movio (staffId) o "sofia" si lo hizo el agente. */
  por?: string | null;
}

export type Pasos = Record<string, PasoEnCurso>;

export function pasoDe(pasos: Pasos | null | undefined, id: string): PasoEnCurso {
  return pasos?.[id] ?? { estado: "pendiente" };
}

export interface PasoConEstado extends PasoEnCurso {
  id: string;
  nombre: string;
  ayuda: string;
  agendable: boolean;
  opcional?: boolean;
}

/** La venta completa, en el orden en que ocurren las cosas. */
export function pasosDe(pasos: Pasos | null | undefined): PasoConEstado[] {
  return PASOS.map((p) => ({ ...p, ...pasoDe(pasos, p.id) }));
}

export const TOTAL_PASOS = PASOS_REQUERIDOS.length;

export function hechos(pasos: Pasos | null | undefined): number {
  return PASOS_REQUERIDOS.filter((p) => pasoDe(pasos, p.id).estado === "hecho").length;
}

export function hecho(pasos: Pasos | null | undefined, id: string): boolean {
  return pasoDe(pasos, id).estado === "hecho";
}

/** Una cita puesta que todavía no ocurre (o que ya se pasó de fecha). */
export function agendado(pasos: Pasos | null | undefined, id: string): PasoEnCurso | null {
  const p = pasoDe(pasos, id);
  return p.estado === "agendado" ? p : null;
}

export interface Avance {
  hechos: number;
  total: number;
  /** Frase corta para la tarjeta: "falta la prueba de manejo". */
  resumen: string;
  /** El paso que toca mover, que es la única instrucción que necesita el vendedor. */
  siguiente: PasoConEstado | null;
  trabados: PasoConEstado[];
  agendados: PasoConEstado[];
}

const lista = (nombres: string[]): string =>
  nombres.length <= 1 ? (nombres[0] ?? "") : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;

const fechaCorta = (iso: string | null | undefined): string =>
  iso
    ? new Date(iso).toLocaleString("es-SV", {
        timeZone: "America/El_Salvador",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";

/**
 * En que punto va la venta y que es lo siguiente que hay que hacer.
 *
 * Un paso trabado pesa MAS que uno pendiente: al pendiente solo hay que
 * empujarlo, al trabado hay que resolver algo antes (ajustar el precio,
 * conseguir el color) y si nadie lo mira, ahi se queda la venta.
 */
export function avanceDe(pasos: Pasos | null | undefined, ahora = Date.now()): Avance {
  const todos = pasosDe(pasos);
  const trabados = todos.filter((p) => p.estado === "trabado");
  const agendados = todos.filter((p) => p.estado === "agendado");
  const ok = todos.filter((p) => !p.opcional && p.estado === "hecho").length;
  const siguiente = todos.find((p) => !p.opcional && p.estado !== "hecho") ?? null;

  let resumen: string;
  if (trabados.length > 0) {
    resumen = `trabado en ${lista(trabados.map((p) => `${p.nombre.toLowerCase()}: ${nombreDeTraba(p.motivo).toLowerCase()}`))}`;
  } else if (agendados.length > 0) {
    const vencida = agendados.find((p) => p.fecha && Date.parse(p.fecha) < ahora);
    const cita = agendados[0];
    resumen = vencida
      ? `${vencida.nombre.toLowerCase()} del ${fechaCorta(vencida.fecha)} sin confirmar`
      : `${cita.nombre.toLowerCase()} para el ${fechaCorta(cita.fecha)}`;
  } else if (ok === 0) {
    resumen = "todavía no se le manda la cotización";
  } else if (ok === TOTAL_PASOS) {
    resumen = "entregado";
  } else {
    resumen = `falta ${siguiente ? siguiente.nombre.toLowerCase() : "cerrar"}`;
  }

  return { hechos: ok, total: TOTAL_PASOS, resumen, siguiente, trabados, agendados };
}

/** Una cita que ya pasó y nadie marcó si ocurrió. El clásico agujero de la sala. */
export function citasVencidas(pasos: Pasos | null | undefined, ahora = Date.now()): PasoConEstado[] {
  return pasosDe(pasos).filter((p) => p.estado === "agendado" && p.fecha != null && Date.parse(p.fecha) < ahora);
}

// ---- La oportunidad ---------------------------------------------------------

export type Resultado = "venta" | "perdido";

/**
 * De donde salio el lead.
 *
 * Lo marca el vendedor a mano: el sistema sabe por donde ENTRO el mensaje, pero
 * no de donde venia la persona (un WhatsApp puede nacer de un anuncio de
 * Instagram). "sala" es el que llega caminando al piso de exhibicion, que en un
 * concesionario sigue siendo de los que mas cierran.
 */
export type CanalLead = "whatsapp" | "instagram" | "facebook" | "sala";

export const CANALES: { id: CanalLead; nombre: string; color: string }[] = [
  { id: "whatsapp", nombre: "WhatsApp", color: "#25D366" },
  { id: "instagram", nombre: "Instagram", color: "#E1306C" },
  { id: "facebook", nombre: "Facebook", color: "#1877F2" },
  { id: "sala", nombre: "Llegó a sala", color: "#64748b" },
];

export const CANAL: Record<CanalLead, { id: CanalLead; nombre: string; color: string }> = Object.fromEntries(
  CANALES.map((c) => [c.id, c]),
) as Record<CanalLead, { id: CanalLead; nombre: string; color: string }>;

/**
 * Los prospectos repartidos por el canal del que vinieron.
 *
 * El gris de "sin marcar" es un grupo propio y nunca se reparte a ojo entre los
 * demas: el canal lo pone el vendedor a mano en la ficha, y adivinarlo seria
 * inventarle al gerente de donde le esta entrando la venta.
 */
export function porCanal(oportunidades: Pick<Oportunidad, "canal" | "monto">[]): {
  canal: CanalLead | null;
  nombre: string;
  color: string;
  n: number;
  monto: number;
}[] {
  const grupos: { canal: CanalLead | null; nombre: string; color: string }[] = [
    ...CANALES.map((c) => ({ canal: c.id as CanalLead | null, nombre: c.nombre, color: c.color })),
    { canal: null, nombre: "Sin marcar", color: "#cbd5e1" },
  ];
  return grupos
    .map((g) => {
      const suyos = oportunidades.filter((o) => (o.canal ?? null) === g.canal);
      return { ...g, n: suyos.length, monto: suyos.reduce((m, o) => m + (o.monto ?? 0), 0) };
    })
    .filter((g) => g.n > 0);
}

export function esCanal(v: unknown): v is CanalLead {
  return typeof v === "string" && CANALES.some((c) => c.id === v);
}

export interface Oportunidad {
  tenant: string;
  /** wa_from del contacto: la misma llave que la ficha y la conversacion. */
  telefono: string;
  nombre: string;
  /** Id del catalogo, o lo que se haya escrito a mano. */
  modelo?: string | null;
  pasos: Pasos;
  /** staffId del vendedor a cargo. */
  vendedor: string | null;
  creado: string;
  contactado: string | null;
  /** Cuando se le mando la cotizacion. */
  cotizado: string | null;
  /** Cuando dejo el deposito y la unidad salio de disponible. */
  separado: string | null;
  asignado: string | null;
  /** Cuando el vendedor lo tomo (su primer contacto). */
  tomado: string | null;
  cerrado: string | null;
  resultado: Resultado | null;
  motivoCierre: string | null;
  /** Cuando se le aviso al gerente que nadie lo tomaba. */
  avisado: string | null;
  /** Cuando se marco vencido (paso el plazo largo). */
  escalado: string | null;
  /**
   * El valor de la operacion en dolares: el precio negociado, o el de lista
   * mientras no haya propuesta. Puede no existir, y entonces vale cero en el
   * embudo: no se le inventa un promedio al gerente.
   */
  monto?: number | null;
  canal?: CanalLead | null;
  /** Cuantas veces se le ha buscado, cuando quien arma la lista paga esa consulta. */
  contactos?: { llamadas: number; mensajes: number; ultimo: string | null } | null;
  actualizado: string;
}

/** Días de silencio tras el contacto para dar al lead por no respondido. */
export const DIAS_SIN_RESPUESTA = 3;

/**
 * La etapa sale de los pasos y de las marcas de tiempo, nunca de un campo
 * suelto.
 *
 * El orden de las preguntas ES la definición: se resuelve de lo más avanzado a
 * lo menos, así un caso entregado nunca se confunde con uno que además debe la
 * prueba de manejo. Quien se saltó un paso (hay quien compra sin manejar el
 * carro) aparece igual en la etapa a la que llegó: el tablero refleja lo que
 * pasó, no lo que debió pasar.
 */
export function etapaDe(o: Oportunidad, ahora: number = Date.now()): EtapaId {
  if (o.cerrado) return o.resultado === "venta" ? "entregados" : "perdidos";
  if (hecho(o.pasos, "separacion")) return "separados";
  if (hecho(o.pasos, "propuesta")) return "negociacion";
  if (hecho(o.pasos, "prueba") || agendado(o.pasos, "prueba")) return "prueba";
  if (hecho(o.pasos, "cotizacion")) return "cotizados";
  if (o.contactado) {
    const quieto = ahora - Date.parse(o.actualizado) >= DIAS_SIN_RESPUESTA * DIA;
    return quieto ? "sin_respuesta" : "contactados";
  }
  return "nuevos";
}

// ---- Plazos -----------------------------------------------------------------

/**
 * Aviso al gerente si el vendedor no toca el lead.
 *
 * Son HORAS y no dias a proposito: en credito el expediente espera, en una sala
 * de ventas no. Quien deja sus datos en un anuncio esta cotizando en tres
 * agencias el mismo dia, y a las cuatro horas ya lo llamo otro.
 */
export const HORAS_AVISO = 4;
/** Vencido: paso el dia completo sin que nadie lo tomara. Hay que reasignar. */
export const HORAS_VENCIDO = 24;
/** Días sin movimiento para considerar que un caso se está enfriando. */
export const DIAS_ESTANCADO = 3;

export type NivelAlerta = "aviso" | "vencido";

export interface Alerta {
  telefono: string;
  nombre: string;
  vendedor: string | null;
  nivel: NivelAlerta;
  /** Horas desde que se asignó. */
  horas: number;
  desde: string;
  avisado: string | null;
}

const horasEntre = (desde: string, ahora: number) => Math.max(0, (ahora - Date.parse(desde)) / HORA);

/**
 * Si el lead ya se paso del plazo sin que el vendedor lo tome.
 * null = va en tiempo (o todavia no esta asignado).
 */
export function nivelDeAlerta(o: Oportunidad, ahora = Date.now()): NivelAlerta | null {
  if (!o.asignado || o.tomado || o.cerrado) return null;
  const h = horasEntre(o.asignado, ahora);
  if (h >= HORAS_VENCIDO) return "vencido";
  if (h >= HORAS_AVISO) return "aviso";
  return null;
}

export function alertasDe(oportunidades: Oportunidad[], ahora = Date.now()): Alerta[] {
  return oportunidades
    .map((o) => {
      const nivel = nivelDeAlerta(o, ahora);
      if (!nivel || !o.asignado) return null;
      return {
        telefono: o.telefono,
        nombre: o.nombre,
        vendedor: o.vendedor,
        nivel,
        horas: Math.round(horasEntre(o.asignado, ahora)),
        desde: o.asignado,
        avisado: o.avisado,
      };
    })
    .filter((a): a is Alerta => a !== null)
    .sort((a, b) => b.horas - a.horas);
}

/** Un lead como se ve en el embudo y en la barra del vendedor. */
export interface LeadEnEtapa {
  telefono: string;
  nombre: string;
  vendedor: string | null;
  modelo: string | null;
  /** Valor de la operación. null si nadie le ha puesto precio. */
  monto: number | null;
  canal: CanalLead | null;
}

/** Un lead que se está enfriando, con todo lo que hace falta para decidir. */
export interface LeadFrio extends LeadEnEtapa {
  /** Qué le falta, en una frase. */
  resumen: string;
  diasSinContacto: number;
  diasDesdeInfo: number;
  llamadas: number;
  mensajes: number;
}

/** Una cita agendada que ya pasó sin que nadie dijera si ocurrió. */
export interface CitaVencida extends LeadEnEtapa {
  paso: string;
  pasoNombre: string;
  fecha: string;
  dias: number;
}

const comoLead = (o: Oportunidad): LeadEnEtapa => ({
  telefono: o.telefono,
  nombre: o.nombre,
  vendedor: o.vendedor,
  modelo: o.modelo ?? null,
  monto: o.monto ?? null,
  canal: o.canal ?? null,
});

/** Los que llevan días sin moverse en una etapa: el equipo los dejó enfriar. */
export function estancados(
  oportunidades: Oportunidad[],
  etapa: EtapaId,
  ahora = Date.now(),
  dias = DIAS_ESTANCADO,
): Oportunidad[] {
  return oportunidades
    .filter((o) => etapaDe(o, ahora) === etapa && ahora - Date.parse(o.actualizado) >= dias * DIA)
    .sort((a, b) => a.actualizado.localeCompare(b.actualizado));
}

/** Lo mismo, ya redactado para la pantalla. */
export function friosDe(oportunidades: Oportunidad[], etapa: EtapaId, ahora = Date.now()): LeadFrio[] {
  return estancados(oportunidades, etapa, ahora).map((o) => ({
    ...comoLead(o),
    resumen: avanceDe(o.pasos, ahora).resumen,
    diasSinContacto: Math.floor((ahora - Date.parse(o.contactos?.ultimo ?? o.actualizado)) / DIA),
    diasDesdeInfo: Math.floor((ahora - Date.parse(o.creado)) / DIA),
    llamadas: o.contactos?.llamadas ?? 0,
    mensajes: o.contactos?.mensajes ?? 0,
  }));
}

/**
 * Las citas que ya pasaron y nadie cerró.
 *
 * Es la fuga mas cara de una sala de ventas: la prueba de manejo se agenda, el
 * cliente no llega (o llega y nadie lo anota) y el caso se queda en el tablero
 * como si siguiera vivo.
 */
export function citasVencidasDe(oportunidades: Oportunidad[], ahora = Date.now()): CitaVencida[] {
  const salida: CitaVencida[] = [];
  for (const o of oportunidades) {
    if (o.cerrado) continue;
    for (const p of citasVencidas(o.pasos, ahora)) {
      salida.push({
        ...comoLead(o),
        paso: p.id,
        pasoNombre: p.nombre,
        fecha: p.fecha as string,
        dias: Math.floor((ahora - Date.parse(p.fecha as string)) / DIA),
      });
    }
  }
  return salida.sort((a, b) => b.dias - a.dias);
}

// ---- Reparto ----------------------------------------------------------------

export interface Vendedor {
  id: string;
  nombre: string;
  iniciales: string;
}

/**
 * A quien le toca el siguiente lead: al que menos casos activos tiene; si
 * empatan, al que hace mas rato no recibe uno. Reparte parejo sin que nadie
 * tenga que llevar la cuenta.
 */
export function siguienteVendedor(vendedores: Vendedor[], oportunidades: Oportunidad[]): Vendedor | null {
  if (vendedores.length === 0) return null;
  const activos = new Map<string, number>();
  const ultimo = new Map<string, number>();
  for (const o of oportunidades) {
    if (!o.vendedor) continue;
    if (!o.cerrado) activos.set(o.vendedor, (activos.get(o.vendedor) ?? 0) + 1);
    if (o.asignado) {
      const t = Date.parse(o.asignado);
      if (t > (ultimo.get(o.vendedor) ?? 0)) ultimo.set(o.vendedor, t);
    }
  }
  return [...vendedores].sort((a, b) => {
    const d = (activos.get(a.id) ?? 0) - (activos.get(b.id) ?? 0);
    if (d !== 0) return d;
    return (ultimo.get(a.id) ?? 0) - (ultimo.get(b.id) ?? 0);
  })[0];
}

// ---- Reporte del gerente ----------------------------------------------------

export interface FilaVendedor {
  id: string;
  nombre: string;
  iniciales: string;
  /** Casos que tiene ahora mismo sin cerrar. */
  activos: number;
  sinTomar: number;
  vencidos: number;
  /** En el periodo. */
  asignados: number;
  tomados: number;
  pruebas: number;
  cerrados: number;
  ventas: number;
  perdidos: number;
  /** Lo facturado por sus ventas del periodo. */
  monto: number;
  /** Horas promedio entre que se le asignó el lead y lo tomó. */
  horasEnTomar: number | null;
  /** Ventas sobre casos cerrados, en porcentaje. */
  tasaCierre: number | null;
  leads: LeadEnEtapa[];
}

export interface FilaModelo {
  id: string;
  nombre: string;
  /** Cuántos lo están viendo ahora mismo. */
  interesados: number;
  /** Cuántos se vendieron en el periodo. */
  vendidos: number;
  /** Lo facturado por ese modelo en el periodo. */
  monto: number;
}

export interface ReporteAutos {
  periodo: Rango;
  /** Foto de ahora: cuántos hay en cada etapa, con su plata y su gente. */
  embudo: {
    etapa: EtapaId;
    nombre: string;
    ayuda: string;
    color: string;
    n: number;
    monto: number;
    leads: LeadEnEtapa[];
  }[];
  /** Lo que pasó DENTRO del periodo. */
  movimiento: {
    nuevos: number;
    contactados: number;
    cotizados: number;
    separados: number;
    ventas: number;
    perdidos: number;
    monto: number;
    tasaCierre: number | null;
  };
  anterior: { nuevos: number; cotizados: number; ventas: number; monto: number };
  /** Dónde está trabada la venta, que es lo que el gerente puede desatorar. */
  pasos: {
    /** En qué paso está parada cada venta viva ahora mismo. Suma el embudo abierto. */
    pendientes: { id: string; nombre: string; n: number }[];
    /** Por qué se traban. */
    trabas: { motivo: string; nombre: string; n: number }[];
    /** Pruebas de manejo puestas en el calendario que todavía no ocurren. */
    pruebasAgendadas: number;
    /** Citas que ya pasaron y nadie marcó. */
    citasVencidas: CitaVencida[];
  };
  modelos: FilaModelo[];
  vendedores: FilaVendedor[];
  /** Leads vivos sin vendedor: nadie los está trabajando. */
  sinAsignar: number;
  alertas: Alerta[];
  /**
   * Los que llevan dias quietos, separados por lo que hay que hacerles: al de
   * cotizacion hay que buscarlo para que venga a manejar el carro; al de
   * negociacion ya se le hizo una oferta y nadie volvio a llamarlo, que es la
   * peor de las dos.
   */
  enfriandose: { conCotizacion: LeadFrio[]; enNegociacion: LeadFrio[] };
  tiempos: {
    /** Horas promedio de lead nuevo a primer contacto del vendedor. */
    aPrimerContacto: number | null;
    /** De lead nuevo a cotización enviada. */
    aCotizacion: number | null;
    /** De lead nuevo a prueba de manejo hecha. */
    aPrueba: number | null;
    /** De asignación a cierre. */
    aCierre: number | null;
  };
}

const dentro = (ts: string | null | undefined, r: { desde: string; hasta: string }): boolean =>
  !!ts && ts >= r.desde && ts < r.hasta;

const promedioHoras = (pares: [string, string][]): number | null => {
  if (pares.length === 0) return null;
  const total = pares.reduce((s, [a, b]) => s + (Date.parse(b) - Date.parse(a)), 0);
  return Math.round((total / pares.length / HORA) * 10) / 10;
};

/** Cuándo se marcó hecho un paso, para poder medirlo en el tiempo. */
export function cuandoSeHizo(o: Oportunidad, paso: string): string | null {
  const p = pasoDe(o.pasos, paso);
  return p.estado === "hecho" ? (p.ts ?? null) : null;
}

export function reporteAutos(
  oportunidades: Oportunidad[],
  vendedores: Vendedor[],
  rango: Rango,
  ahora: Date = new Date(),
): ReporteAutos {
  const t = ahora.getTime();
  const abiertas = oportunidades.filter((o) => !o.cerrado);

  const embudo = ETAPAS.map((e) => {
    const suyas = oportunidades.filter((o) => etapaDe(o, t) === e.id);
    return {
      etapa: e.id,
      nombre: e.nombre,
      ayuda: e.ayuda,
      color: e.color,
      n: suyas.length,
      // Los que no tienen precio suman cero. Es preferible un embudo que se
      // queda corto a uno que promedia y le inventa plata al gerente.
      monto: suyas.reduce((m, o) => m + (o.monto ?? 0), 0),
      leads: suyas.map(comoLead).sort((a, b) => (b.monto ?? 0) - (a.monto ?? 0)),
    };
  });

  const enPeriodo = <K extends keyof Oportunidad>(campo: K) =>
    oportunidades.filter((o) => dentro(o[campo] as string | null, rango));
  const cerradasPeriodo = enPeriodo("cerrado");
  const vendidas = cerradasPeriodo.filter((o) => o.resultado === "venta");
  const perdidas = cerradasPeriodo.filter((o) => o.resultado === "perdido");

  const antes = rango.anterior;
  const enAntes = (campo: keyof Oportunidad) =>
    oportunidades.filter((o) => dentro(o[campo] as string | null, antes)).length;

  // Los pasos: solo de lo que sigue vivo, y cada venta cuenta UNA vez, en el
  // paso que le toca ahora. Contar "cuantas no han hecho cada paso" se veia
  // bien en la grafica y no decia nada: por definicion ninguna venta abierta
  // esta entregada, asi que el ultimo paso siempre salia con el total y el
  // gerente no podia leer donde esta parada la sala.
  const esperando = new Map<string, number>();
  for (const o of abiertas) {
    const siguiente = avanceDe(o.pasos, t).siguiente;
    if (siguiente) esperando.set(siguiente.id, (esperando.get(siguiente.id) ?? 0) + 1);
  }
  const pendientes = PASOS_REQUERIDOS.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    n: esperando.get(p.id) ?? 0,
  })).filter((x) => x.n > 0);

  const trabasPor = new Map<string, number>();
  for (const o of abiertas) {
    for (const p of pasosDe(o.pasos)) {
      if (p.estado === "trabado") {
        const k = p.motivo ?? "otro";
        trabasPor.set(k, (trabasPor.get(k) ?? 0) + 1);
      }
    }
  }

  const filasVendedor: FilaVendedor[] = vendedores.map((v) => {
    const suyas = oportunidades.filter((o) => o.vendedor === v.id);
    const activas = suyas.filter((o) => !o.cerrado);
    const cerradas = suyas.filter((o) => dentro(o.cerrado, rango));
    const ventasV = cerradas.filter((o) => o.resultado === "venta");
    return {
      id: v.id,
      nombre: v.nombre,
      iniciales: v.iniciales,
      activos: activas.length,
      sinTomar: activas.filter((o) => !o.tomado).length,
      vencidos: activas.filter((o) => nivelDeAlerta(o, t) !== null).length,
      asignados: suyas.filter((o) => dentro(o.asignado, rango)).length,
      tomados: suyas.filter((o) => dentro(o.tomado, rango)).length,
      pruebas: suyas.filter((o) => dentro(cuandoSeHizo(o, "prueba"), rango)).length,
      cerrados: cerradas.length,
      ventas: ventasV.length,
      perdidos: cerradas.length - ventasV.length,
      monto: ventasV.reduce((m, o) => m + (o.monto ?? 0), 0),
      horasEnTomar: promedioHoras(
        suyas.filter((o) => o.asignado && o.tomado).map((o) => [o.asignado as string, o.tomado as string]),
      ),
      tasaCierre: cerradas.length ? Math.round((ventasV.length / cerradas.length) * 100) : null,
      leads: suyas
        .filter((o) => dentro(o.asignado, rango))
        .map(comoLead)
        .sort((a, b) => (b.monto ?? 0) - (a.monto ?? 0)),
    };
  });

  // Los modelos: que se esta pidiendo ahora y que se vendio en el periodo. Van
  // juntos a proposito, porque la pregunta del gerente es una sola: donde pongo
  // el inventario.
  const modelos = new Map<string, FilaModelo>();
  const filaModelo = (raw: string | null | undefined): FilaModelo | null => {
    const m = modeloDe(raw);
    const id = m?.id ?? (raw?.trim() ? raw.trim().toLowerCase() : null);
    if (!id) return null;
    const previa = modelos.get(id);
    if (previa) return previa;
    const nueva: FilaModelo = { id, nombre: nombreDeModelo(raw), interesados: 0, vendidos: 0, monto: 0 };
    modelos.set(id, nueva);
    return nueva;
  };
  for (const o of abiertas) {
    const fila = filaModelo(o.modelo);
    if (fila) fila.interesados++;
  }
  for (const o of vendidas) {
    const fila = filaModelo(o.modelo);
    if (fila) {
      fila.vendidos++;
      fila.monto += o.monto ?? 0;
    }
  }

  return {
    periodo: rango,
    embudo,
    movimiento: {
      nuevos: enPeriodo("creado").length,
      contactados: enPeriodo("contactado").length,
      cotizados: enPeriodo("cotizado").length,
      separados: enPeriodo("separado").length,
      ventas: vendidas.length,
      perdidos: perdidas.length,
      monto: vendidas.reduce((m, o) => m + (o.monto ?? 0), 0),
      tasaCierre: cerradasPeriodo.length ? Math.round((vendidas.length / cerradasPeriodo.length) * 100) : null,
    },
    anterior: {
      nuevos: enAntes("creado"),
      cotizados: enAntes("cotizado"),
      ventas: oportunidades.filter((o) => dentro(o.cerrado, antes) && o.resultado === "venta").length,
      monto: oportunidades
        .filter((o) => dentro(o.cerrado, antes) && o.resultado === "venta")
        .reduce((m, o) => m + (o.monto ?? 0), 0),
    },
    pasos: {
      pendientes,
      trabas: [...trabasPor.entries()]
        .map(([motivo, n]) => ({ motivo, nombre: nombreDeTraba(motivo), n }))
        .sort((a, b) => b.n - a.n),
      pruebasAgendadas: abiertas.filter((o) => agendado(o.pasos, "prueba") !== null).length,
      citasVencidas: citasVencidasDe(abiertas, t),
    },
    modelos: [...modelos.values()].sort((a, b) => b.vendidos - a.vendidos || b.interesados - a.interesados),
    vendedores: filasVendedor.sort((a, b) => b.ventas - a.ventas || b.activos - a.activos),
    sinAsignar: abiertas.filter((o) => !o.vendedor).length,
    alertas: alertasDe(abiertas, t),
    enfriandose: {
      conCotizacion: friosDe(abiertas, "cotizados", t),
      enNegociacion: friosDe(abiertas, "negociacion", t),
    },
    tiempos: {
      aPrimerContacto: promedioHoras(
        oportunidades.filter((o) => o.asignado && o.tomado).map((o) => [o.asignado as string, o.tomado as string]),
      ),
      aCotizacion: promedioHoras(
        oportunidades.filter((o) => o.cotizado).map((o) => [o.creado, o.cotizado as string]),
      ),
      aPrueba: promedioHoras(
        oportunidades
          .filter((o) => cuandoSeHizo(o, "prueba"))
          .map((o) => [o.creado, cuandoSeHizo(o, "prueba") as string]),
      ),
      aCierre: promedioHoras(
        oportunidades.filter((o) => o.asignado && o.cerrado).map((o) => [o.asignado as string, o.cerrado as string]),
      ),
    },
  };
}
