// El dashboard del laboratorio (tenant "consultorio"): lo que pasa en su
// WhatsApp (2247 1141) con Valeria, con cifras REALES de la base.
//
// Pedido del 10/11/2026: conversaciones, respuestas de Valeria, temas, días con
// más mensajes, "full dashboard con stats". De dónde sale cada cosa:
//   - Mensajes: wa_messages del tenant.
//   - Valeria o el equipo: un saliente es de Valeria si su wa_id está en
//     ai_uso_tokens (cada respuesta de la IA deja ahí su consumo con el id del
//     mensaje). Lo demás lo escribió una persona desde el panel. Así se separa
//     también lo de antes de que el panel guardara quién escribió.
//   - Temas: ia_busquedas, lo que Valeria buscó en la base del lab (ver
//     lib/ia-busquedas.ts). No el texto crudo: "tengo media hora esperando"
//     caía en el test de O'Sullivan.
//   - Casos: la tabla tickets.
//
// `armarPanelLab` es pura (se prueba sin base); `cargarPanelLab` lee. Todas las
// fechas en hora de El Salvador.

import { getSupabase } from "./supabase";
import { claveDiaSV } from "./hospital-panel";
import { TIPOS, ESTADOS, type EstadoTicket } from "./tickets";
import { estaAbiertoAhora, type Horario } from "./tickets-sla";
import type { PeriodoLab } from "./lab-panel-periodos";
import { consultorioSeed } from "./tenants/seeds/consultorio";
import type { Busqueda, ResultadoGuardado } from "./ia-busquedas";

const TENANT = "consultorio";
const TZ = "America/El_Salvador";
const DIA_MS = 24 * 3600 * 1000;
/** Una respuesta de Valeria cuenta para el tiempo de respuesta si llega dentro de esto. */
const RESPUESTA_MAX_MS = 15 * 60 * 1000;
/** Un chat cuyo último mensaje es de la persona y lleva más de esto, "espera". */
const ESPERA_MIN = 3;

/**
 * Teléfonos que no cuentan: el de pruebas de la agencia (7539 1721). Se
 * comparan los últimos 8 dígitos.
 */
export const TELEFONOS_DE_PRUEBA = ["75391721"];

export { PERIODOS, esPeriodo, type PeriodoLab } from "./lab-panel-periodos";

/**
 * El horario hábil del laboratorio, el de su base (tema-horario-habil): lunes
 * a sábado de 6:00 a.m. a 6:00 p.m. Fuera de eso (noches y domingos) hay
 * recargo, y es justo cuando Valeria atiende sola.
 */
export const HORARIO_HABIL_LAB: Horario = {
  dias: [null, ...Array.from({ length: 6 }, () => ({ abre: 6 * 60, cierra: 18 * 60 }))],
  offsetMin: -360,
};

export interface MensajeLab {
  from: string;
  nombre?: string | null;
  texto?: string | null;
  direccion: "in" | "out";
  /** ISO, cuándo lo guardamos (created_at). */
  ts: string;
  waId: string;
  /** image | document | audio | ... */
  media?: string | null;
  /** Quién lo escribió desde el panel, si se guardó. */
  staffNombre?: string | null;
}

export interface TicketLab {
  estado: EstadoTicket;
  tipo: string;
  asignadoA?: string | null;
  creado: string;
  resuelto?: string | null;
  telefono?: string | null;
}

export interface EntradaPanelLab {
  mensajes: MensajeLab[];
  /** wa_id de los salientes que escribió Valeria. */
  idsValeria: Set<string>;
  tickets: TicketLab[];
  busquedas: Busqueda[];
  /** Chats marcados "resuelto" en la bandeja. */
  resueltos?: Set<string>;
}

export interface Conteo {
  id: string;
  label: string;
  /** Conversaciones distintas. */
  conversaciones: number;
  /** Veces que se buscó. */
  busquedas: number;
}

export interface PanelLab {
  generadoEn: string;
  periodo: PeriodoLab;
  /** Primer día del período (AAAA-MM-DD), o el del primer mensaje en "todo". */
  desde: string | null;
  resumen: {
    conversaciones: number;
    /** Escribieron por primera vez en el período. */
    nuevas: number;
    mensajesRecibidos: number;
    fotos: number;
    archivos: number;
    respuestasValeria: number;
    respuestasEquipo: number;
    conversacionesConEquipo: number;
    /** Con respuesta de Valeria, sin respuesta del equipo y sin caso abierto. */
    resueltasSoloValeria: number;
    pctSoloValeria: number | null;
    respuestaMedianaSeg: number | null;
    respuestaP90Seg: number | null;
    /** Mensajes recibidos con el laboratorio fuera de horario hábil. */
    fueraDeHorario: number;
    pctFueraDeHorario: number | null;
    /** Contra el período anterior del mismo largo. null en "todo" o sin base. */
    deltaConversacionesPct: number | null;
  };
  porDia: Array<{ dia: string; etiqueta: string; conversaciones: number; recibidos: number; valeria: number; equipo: number }>;
  /** Los días con más mensajes recibidos, de mayor a menor. */
  topDias: Array<{ dia: string; etiqueta: string; recibidos: number; conversaciones: number }>;
  /** Lunes a domingo. */
  porDiaSemana: Array<{ dia: string; recibidos: number; conversaciones: number }>;
  /** Mensajes recibidos por día de la semana (lun..dom) y hora (0..23). */
  calor: number[][];
  temas: {
    /** Desde cuándo se anotan las búsquedas (ISO), null si todavía no hay. */
    desde: string | null;
    busquedas: number;
    conversaciones: number;
    categorias: Conteo[];
    examenes: Conteo[];
    seguros: Conteo[];
    /** Lo que preguntaron y no está en la base. */
    sinResultado: Array<{ consulta: string; veces: number }>;
  };
  casos: {
    creados: number;
    abiertosHoy: number;
    resueltos: number;
    resolucionMedianaMin: number | null;
    porTipo: Array<{ id: string; label: string; n: number }>;
    porEstado: Array<{ id: string; label: string; n: number }>;
    porPersona: Array<{ id: string; nombre: string; asignados: number; resueltos: number }>;
  };
  /** Respuestas que escribió el equipo, por persona. */
  equipo: Array<{ nombre: string; respuestas: number }>;
  /** Ahora mismo: chats cuyo último mensaje es de la persona y nadie contestó. */
  esperan: Array<{ from: string; nombre: string; texto: string; minutos: number }>;
}

// ── Temas: de la base del lab a categorías que se leen de un vistazo ────────

export const CATEGORIAS: Array<{ id: string; label: string }> = [
  { id: "precios", label: "Precios y exámenes" },
  { id: "resultados", label: "Resultados" },
  { id: "preparacion", label: "Preparación y muestras" },
  { id: "seguros", label: "Seguros y convenios" },
  { id: "horarios", label: "Horarios y sucursales" },
  { id: "domicilio", label: "Servicio a domicilio" },
  { id: "pagos", label: "Pagos y factura" },
  { id: "fuera", label: "No es del laboratorio" },
  { id: "quejas", label: "Quejas y demoras" },
  { id: "otros", label: "Otros" },
];

const CATEGORIA_DE_TEMA: Record<string, string> = {
  "tema-cotizar": "precios",
  "tema-descuentos": "precios",
  "tema-tarjeta-vip": "precios",
  "tema-referencia-geneticas": "precios",
  "tema-pediatria": "precios",
  "tema-entrega-resultados": "resultados",
  "tema-estado-resultado": "resultados",
  "tema-cultivo-preliminar": "resultados",
  "tema-resultados-terceros": "resultados",
  "tema-reenvio-resultados": "resultados",
  "tema-formato-resultado": "resultados",
  "tema-error-resultado": "resultados",
  "tema-interpretacion": "resultados",
  "tema-ayuno": "preparacion",
  "tema-muestra-orina": "preparacion",
  "tema-muestra-heces": "preparacion",
  "tema-orina-24-horas": "preparacion",
  "tema-muestras-medico": "preparacion",
  "tema-agregar-prueba": "preparacion",
  "tema-muestra-pendiente": "preparacion",
  "tema-orden-medica": "preparacion",
  "tema-seguro": "seguros",
  "tema-aseguradoras": "seguros",
  "tema-horario-habil": "horarios",
  "tema-feriados": "horarios",
  "tema-cita": "horarios",
  "tema-quienes-somos": "horarios",
  "tema-telefono-escalon": "horarios",
  "tema-escalon-traslado": "horarios",
  "tema-domicilio": "domicilio",
  "tema-formas-de-pago": "pagos",
  "tema-transferencia": "pagos",
  "tema-factura": "pagos",
  "tema-credito-fiscal": "pagos",
  "tema-datos-registro": "pagos",
  "tema-hospital-servicios": "fuera",
  "tema-imagenologia": "fuera",
  "tema-medicamentos": "fuera",
  "tema-quejas": "quejas",
  "tema-demoras": "quejas",
};

/** La categoría de lo que encontró una búsqueda (su primer resultado). */
export function categoriaDe(r: Pick<ResultadoGuardado, "tipo" | "id">): string {
  if (r.tipo === "examen") return "precios";
  if (r.tipo === "convenio") return "seguros";
  if (r.tipo === "sucursal") return "horarios";
  if (r.tipo === "promocion") return "precios";
  return CATEGORIA_DE_TEMA[r.id] ?? "otros";
}

// ── Hora de El Salvador ──────────────────────────────────────────────────────

const fmtHora = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" });
const fmtEtiqueta = new Intl.DateTimeFormat("es-SV", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
const DIAS_SEMANA = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

function horaSV(ts: string): number {
  return Number(fmtHora.format(new Date(ts))) % 24;
}

/** 0 = lunes ... 6 = domingo, del día AAAA-MM-DD. */
function diaSemana(clave: string): number {
  return (new Date(`${clave}T12:00:00-06:00`).getUTCDay() + 6) % 7;
}

function etiquetaDia(clave: string): string {
  return fmtEtiqueta.format(new Date(`${clave}T12:00:00-06:00`)).replace(/\./g, "");
}

/** El inicio del día AAAA-MM-DD en El Salvador (UTC-6, sin horario de verano). */
function inicioDia(clave: string): number {
  return new Date(`${clave}T00:00:00-06:00`).getTime();
}

function sumarDias(clave: string, n: number): string {
  return claveDiaSV(new Date(inicioDia(clave) + n * DIA_MS + 12 * 3600 * 1000));
}

function percentil(valores: number[], p: number): number | null {
  if (valores.length === 0) return null;
  const v = [...valores].sort((a, b) => a - b);
  if (p === 50) {
    const m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
  }
  return v[Math.min(v.length - 1, Math.ceil((p / 100) * v.length) - 1)];
}

function pct(n: number, total: number): number | null {
  return total ? Math.round((n / total) * 100) : null;
}

export function esDePrueba(telefono: string | null | undefined): boolean {
  const d = (telefono ?? "").replace(/\D/g, "");
  return TELEFONOS_DE_PRUEBA.some((t) => d.endsWith(t));
}

// ── Cálculo ──────────────────────────────────────────────────────────────────

export function armarPanelLab(entrada: EntradaPanelLab, periodo: PeriodoLab, ahora: Date = new Date()): PanelLab {
  const mensajes = entrada.mensajes.filter((m) => !esDePrueba(m.from)).sort((a, b) => a.ts.localeCompare(b.ts));
  const tickets = entrada.tickets.filter((t) => !esDePrueba(t.telefono));
  const busquedas = entrada.busquedas.filter((b) => !esDePrueba(b.from));
  const esValeria = (m: MensajeLab) => m.direccion === "out" && entrada.idsValeria.has(m.waId);
  const esEquipo = (m: MensajeLab) => m.direccion === "out" && !entrada.idsValeria.has(m.waId);
  const horario = HORARIO_HABIL_LAB;

  // El período, en días de El Salvador.
  const hoy = claveDiaSV(ahora);
  const largo = periodo === "hoy" ? 1 : periodo === "7d" ? 7 : periodo === "30d" ? 30 : null;
  const primerDia = mensajes.length ? claveDiaSV(mensajes[0].ts) : hoy;
  const desde = largo ? sumarDias(hoy, -(largo - 1)) : primerDia;
  const t0 = inicioDia(desde);
  const enPeriodo = (ts: string) => new Date(ts).getTime() >= t0;

  const delPeriodo = mensajes.filter((m) => enPeriodo(m.ts));
  const recibidos = delPeriodo.filter((m) => m.direccion === "in");
  const convs = new Set(recibidos.map((m) => m.from));

  // Nuevas: su primer mensaje de todos cae en el período.
  const primero = new Map<string, string>();
  for (const m of mensajes) if (m.direccion === "in" && !primero.has(m.from)) primero.set(m.from, m.ts);
  const nuevas = [...convs].filter((f) => enPeriodo(primero.get(f) ?? "")).length;

  // Período anterior del mismo largo, para la flecha.
  let deltaConversacionesPct: number | null = null;
  if (largo) {
    const tPrev = inicioDia(sumarDias(desde, -largo));
    const prev = new Set(
      mensajes
        .filter((m) => m.direccion === "in" && new Date(m.ts).getTime() >= tPrev && new Date(m.ts).getTime() < t0)
        .map((m) => m.from),
    );
    deltaConversacionesPct = prev.size ? Math.round(((convs.size - prev.size) / prev.size) * 100) : null;
  }

  // Por chat, para lo que se mide dentro de cada conversación.
  const porChat = new Map<string, MensajeLab[]>();
  for (const m of mensajes) {
    const l = porChat.get(m.from);
    if (l) l.push(m);
    else porChat.set(m.from, [m]);
  }

  const ticketsDelPeriodo = tickets.filter((t) => enPeriodo(t.creado));
  const conCaso = new Set(ticketsDelPeriodo.map((t) => (t.telefono ?? "").replace(/\D/g, "")));
  const conEquipo = new Set(delPeriodo.filter(esEquipo).map((m) => m.from));
  const conValeria = new Set(delPeriodo.filter(esValeria).map((m) => m.from));
  const soloValeria = [...convs].filter((f) => conValeria.has(f) && !conEquipo.has(f) && !conCaso.has(f.replace(/\D/g, ""))).length;

  // Tiempo de respuesta: de lo último que dijo la persona a la respuesta de Valeria.
  const tiempos: number[] = [];
  for (const hilo of porChat.values()) {
    for (let i = 1; i < hilo.length; i++) {
      const m = hilo[i];
      if (!esValeria(m) || !enPeriodo(m.ts) || hilo[i - 1].direccion !== "in") continue;
      const d = new Date(m.ts).getTime() - new Date(hilo[i - 1].ts).getTime();
      if (d >= 0 && d <= RESPUESTA_MAX_MS) tiempos.push(Math.round(d / 1000));
    }
  }

  const fuera = recibidos.filter((m) => !estaAbiertoAhora(m.ts, horario)).length;

  // Por día: todos los días del período, también los de cero.
  const dias: string[] = [];
  for (let d = desde; d <= hoy; d = sumarDias(d, 1)) dias.push(d);
  const delDia = new Map<string, MensajeLab[]>();
  for (const m of delPeriodo) {
    const c = claveDiaSV(m.ts);
    const l = delDia.get(c);
    if (l) l.push(m);
    else delDia.set(c, [m]);
  }
  const porDia = dias.map((d) => {
    const l = delDia.get(d) ?? [];
    const entrantes = l.filter((m) => m.direccion === "in");
    return {
      dia: d,
      etiqueta: etiquetaDia(d),
      conversaciones: new Set(entrantes.map((m) => m.from)).size,
      recibidos: entrantes.length,
      valeria: l.filter(esValeria).length,
      equipo: l.filter(esEquipo).length,
    };
  });
  const topDias = porDia
    .filter((d) => d.recibidos > 0)
    .sort((a, b) => b.recibidos - a.recibidos || b.conversaciones - a.conversaciones || b.dia.localeCompare(a.dia))
    .slice(0, 5)
    .map(({ dia, etiqueta, recibidos: r, conversaciones }) => ({ dia, etiqueta, recibidos: r, conversaciones }));

  const semana = DIAS_SEMANA.map((dia) => ({ dia, recibidos: 0, conversaciones: new Set<string>() }));
  const calor = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const m of recibidos) {
    const ds = diaSemana(claveDiaSV(m.ts));
    semana[ds].recibidos++;
    semana[ds].conversaciones.add(`${claveDiaSV(m.ts)}|${m.from}`);
    calor[ds][horaSV(m.ts)]++;
  }

  // Temas: el primer resultado de cada búsqueda de Valeria.
  const busq = busquedas.filter((b) => enPeriodo(b.creado));
  const contar = () => new Map<string, { label: string; convs: Set<string>; veces: number }>();
  const cats = contar();
  const exams = contar();
  const segs = contar();
  const sumar = (mapa: ReturnType<typeof contar>, id: string, label: string, from: string) => {
    const e = mapa.get(id) ?? { label, convs: new Set<string>(), veces: 0 };
    e.convs.add(from);
    e.veces++;
    mapa.set(id, e);
  };
  const sinRes = new Map<string, { consulta: string; veces: number }>();
  for (const b of busq) {
    const top = b.resultados[0];
    if (!top) {
      const k = b.consulta.toLocaleLowerCase("es").trim();
      const e = sinRes.get(k) ?? { consulta: b.consulta.trim(), veces: 0 };
      e.veces++;
      sinRes.set(k, e);
      continue;
    }
    const cat = categoriaDe(top);
    sumar(cats, cat, CATEGORIAS.find((c) => c.id === cat)?.label ?? cat, b.from);
    if (top.tipo === "examen") sumar(exams, top.id, top.nombre, b.from);
    if (top.tipo === "convenio") sumar(segs, top.id, top.nombre, b.from);
  }
  const lista = (mapa: ReturnType<typeof contar>, tope: number): Conteo[] =>
    [...mapa.entries()]
      .map(([id, e]) => ({ id, label: e.label, conversaciones: e.convs.size, busquedas: e.veces }))
      .sort((a, b) => b.conversaciones - a.conversaciones || b.busquedas - a.busquedas || a.label.localeCompare(b.label))
      .slice(0, tope);
  const primeraBusqueda = busquedas.reduce<string | null>((min, b) => (min === null || b.creado < min ? b.creado : min), null);

  // Casos.
  const resueltosDelPeriodo = ticketsDelPeriodo.filter((t) => t.estado === "resuelto" && t.resuelto);
  const tiemposCaso = resueltosDelPeriodo
    .map((t) => (new Date(t.resuelto!).getTime() - new Date(t.creado).getTime()) / 60000)
    .filter((m) => m >= 0);
  const porTipo = new Map<string, number>();
  const porEstado = new Map<string, number>();
  const porPersona = new Map<string, { asignados: number; resueltos: number }>();
  for (const t of ticketsDelPeriodo) {
    porTipo.set(t.tipo, (porTipo.get(t.tipo) ?? 0) + 1);
    porEstado.set(t.estado, (porEstado.get(t.estado) ?? 0) + 1);
    const quien = t.asignadoA || "sin-asignar";
    const e = porPersona.get(quien) ?? { asignados: 0, resueltos: 0 };
    e.asignados++;
    if (t.estado === "resuelto") e.resueltos++;
    porPersona.set(quien, e);
  }
  const nombreDe = (id: string) =>
    id === "sin-asignar" ? "Sin asignar" : (consultorioSeed.staff.find((s) => s.id === id)?.nombre ?? id);

  // El equipo, por persona (lo de antes de guardar el autor sale como "Equipo").
  const equipo = new Map<string, number>();
  for (const m of delPeriodo.filter(esEquipo)) {
    const n = m.staffNombre?.trim() || "Equipo";
    equipo.set(n, (equipo.get(n) ?? 0) + 1);
  }

  // Esperan, ahora mismo (no depende del período).
  const resueltosBandeja = entrada.resueltos ?? new Set<string>();
  const esperan: PanelLab["esperan"] = [];
  for (const [from, hilo] of porChat) {
    const ultimo = hilo[hilo.length - 1];
    if (ultimo.direccion !== "in" || resueltosBandeja.has(from)) continue;
    const t = new Date(ultimo.ts).getTime();
    if (t < ahora.getTime() - 7 * DIA_MS) continue;
    const minutos = Math.floor((ahora.getTime() - t) / 60000);
    if (minutos < ESPERA_MIN) continue;
    const nombre = [...hilo].reverse().find((m) => m.nombre)?.nombre ?? "";
    esperan.push({ from, nombre: nombre || from, texto: ultimo.texto ?? "", minutos });
  }
  esperan.sort((a, b) => b.minutos - a.minutos);

  const respuestasValeria = delPeriodo.filter(esValeria).length;
  return {
    generadoEn: ahora.toISOString(),
    periodo,
    desde: mensajes.length || largo ? desde : null,
    resumen: {
      conversaciones: convs.size,
      nuevas,
      mensajesRecibidos: recibidos.length,
      fotos: recibidos.filter((m) => m.media === "image").length,
      archivos: recibidos.filter((m) => m.media && m.media !== "image").length,
      respuestasValeria,
      respuestasEquipo: delPeriodo.filter(esEquipo).length,
      conversacionesConEquipo: [...conEquipo].filter((f) => convs.has(f)).length,
      resueltasSoloValeria: soloValeria,
      pctSoloValeria: pct(soloValeria, convs.size),
      respuestaMedianaSeg: percentil(tiempos, 50),
      respuestaP90Seg: percentil(tiempos, 90),
      fueraDeHorario: fuera,
      pctFueraDeHorario: pct(fuera, recibidos.length),
      deltaConversacionesPct,
    },
    porDia,
    topDias,
    porDiaSemana: semana.map((s) => ({ dia: s.dia, recibidos: s.recibidos, conversaciones: s.conversaciones.size })),
    calor,
    temas: {
      desde: primeraBusqueda,
      busquedas: busq.length,
      conversaciones: new Set(busq.map((b) => b.from)).size,
      categorias: lista(cats, CATEGORIAS.length),
      examenes: lista(exams, 10),
      seguros: lista(segs, 8),
      sinResultado: [...sinRes.values()].sort((a, b) => b.veces - a.veces).slice(0, 8),
    },
    casos: {
      creados: ticketsDelPeriodo.length,
      abiertosHoy: tickets.filter((t) => t.estado !== "resuelto").length,
      resueltos: resueltosDelPeriodo.length,
      resolucionMedianaMin: tiemposCaso.length ? Math.round(percentil(tiemposCaso, 50)!) : null,
      porTipo: [...porTipo.entries()]
        .map(([id, n]) => ({ id, label: TIPOS.find((x) => x.id === id)?.label ?? id, n }))
        .sort((a, b) => b.n - a.n),
      porEstado: ESTADOS.map((e) => ({ id: e.id, label: e.label, n: porEstado.get(e.id) ?? 0 })).filter((e) => e.n > 0),
      porPersona: [...porPersona.entries()]
        .map(([id, e]) => ({ id, nombre: nombreDe(id), ...e }))
        .sort((a, b) => b.asignados - a.asignados),
    },
    equipo: [...equipo.entries()].map(([nombre, respuestas]) => ({ nombre, respuestas })).sort((a, b) => b.respuestas - a.respuestas),
    esperan: esperan.slice(0, 10),
  };
}

// ── Lectura ──────────────────────────────────────────────────────────────────

/** Supabase entrega de a 1000 filas: se pide por páginas hasta este tope. */
const TOPE_FILAS = 20000;
const PAGINA = 1000;

async function todas<T>(pedir: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < TOPE_FILAS; i += PAGINA) {
    const { data, error } = await pedir(i, i + PAGINA - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGINA) break;
  }
  return out;
}

/**
 * Lee todo lo del laboratorio y arma el panel del período. null = sin base (en
 * local sin Supabase no hay cifras, y la pantalla lo dice).
 */
export async function cargarPanelLab(periodo: PeriodoLab): Promise<PanelLab | null> {
  const sb = getSupabase(TENANT);
  if (!sb) return null;

  type FilaMsg = { wa_id: string; wa_from: string; nombre: string | null; texto: string | null; direccion: string | null; created_at: string; media_tipo: string | null; staff_nombre: string | null };
  type FilaUso = { wa_id: string | null };
  type FilaTk = { estado: string; tipo: string; asignado_a: string | null; creado: string; resuelto: string | null; contacto_telefono: string | null };
  type FilaBus = { wa_from: string; consulta: string; resultados: ResultadoGuardado[] | null; creado: string };
  type FilaConv = { wa_from: string; estado: string | null };

  const [msgs, usos, tks, convs] = await Promise.all([
    todas<FilaMsg>((a, b) =>
      sb
        .from("wa_messages")
        .select("wa_id, wa_from, nombre, texto, direccion, created_at, media_tipo, staff_nombre")
        .eq("tenant", TENANT)
        .order("created_at", { ascending: true })
        .range(a, b),
    ),
    todas<FilaUso>((a, b) => sb.from("ai_uso_tokens").select("wa_id").eq("tenant", TENANT).not("wa_id", "is", null).range(a, b)),
    sb.from("tickets").select("estado, tipo, asignado_a, creado, resuelto, contacto_telefono").eq("tenant", TENANT),
    sb.from("wa_conversacion_estado").select("wa_from, estado").eq("tenant", TENANT),
  ]);
  if (tks.error) console.error("[lab-panel] tickets:", tks.error.message);
  if (convs.error) console.error("[lab-panel] estados:", convs.error.message);

  // Sin la tabla de búsquedas (migración sin correr) el panel sale igual, sin temas.
  let busquedas: FilaBus[] = [];
  try {
    busquedas = await todas<FilaBus>((a, b) =>
      sb.from("ia_busquedas").select("wa_from, consulta, resultados, creado").eq("tenant", TENANT).order("creado", { ascending: true }).range(a, b),
    );
  } catch (e) {
    console.error("[lab-panel] búsquedas:", e instanceof Error ? e.message : e);
  }

  return armarPanelLab(
    {
      mensajes: msgs.map((r) => ({
        from: r.wa_from,
        nombre: r.nombre,
        texto: r.texto,
        direccion: r.direccion === "out" ? "out" : "in",
        ts: r.created_at,
        waId: r.wa_id,
        media: r.media_tipo,
        staffNombre: r.staff_nombre,
      })),
      idsValeria: new Set(usos.map((u) => u.wa_id!).filter(Boolean)),
      tickets: ((tks.data ?? []) as FilaTk[]).map((r) => ({
        estado: (r.estado ?? "abierto") as EstadoTicket,
        tipo: r.tipo,
        asignadoA: r.asignado_a,
        creado: r.creado,
        resuelto: r.resuelto,
        telefono: r.contacto_telefono,
      })),
      busquedas: busquedas.map((r) => ({ from: r.wa_from, consulta: r.consulta, resultados: r.resultados ?? [], creado: r.creado })),
      resueltos: new Set(((convs.data ?? []) as FilaConv[]).filter((c) => c.estado === "resuelto").map((c) => c.wa_from)),
    },
    periodo,
  );
}
