// Lo puro del motor: armar piezas, sus variantes por red, repartir un lote en
// el calendario, el avance de un video y las cuentas de costo. Sin red ni
// navegador, para probarlo con vitest.

import { BANCO, type Angulo } from "./banco";
import { diaSemana, instanteDe, sumarDias } from "./fechas";
import type {
  EstadoPieza,
  EtapaRender,
  Idioma,
  Marca,
  Pieza,
  Plantilla,
  Red,
  RegistroUso,
  Servicio,
  TipoPieza,
  TrabajoRender,
  Variante,
} from "./tipos";

export const CUANTAS: Record<Plantilla, number> = { pieza: 1, semana: 5, mes: 12, guion: 1 };

const REDES_POR_TIPO: Record<TipoPieza, Red[]> = {
  video: ["instagram", "tiktok", "youtube", "facebook"],
  imagen: ["instagram", "facebook", "linkedin", "google"],
  carrusel: ["instagram", "facebook", "linkedin"],
  texto: ["facebook", "linkedin", "google"],
};

/** Las redes donde sale una pieza: las de su formato que la marca tiene conectadas (o vencidas). */
export function redesPara(tipo: TipoPieza, marca: Marca, pedidas?: Red[]): Red[] {
  const tiene = new Set(marca.redes.filter((r) => r.estado !== "sin_conectar").map((r) => r.red));
  return REDES_POR_TIPO[tipo].filter((r) => tiene.has(r) && (!pedidas || pedidas.length === 0 || pedidas.includes(r)));
}

/** El texto de cada red: hashtags donde se usan, sin ellos donde estorban. */
export function textoParaRed(red: Red, texto: string, hashtags: string[]): string {
  switch (red) {
    case "instagram":
    case "tiktok":
      return hashtags.length ? `${texto}\n\n${hashtags.join(" ")}` : texto;
    case "facebook":
      return hashtags[0] ? `${texto}\n\n${hashtags[0]}` : texto;
    case "linkedin":
      return hashtags.length ? `${texto}\n\n${hashtags.slice(0, 2).join(" ")}` : texto;
    case "youtube":
      return `${texto}\n\n${[...hashtags.slice(0, 2), "#Shorts"].join(" ")}`;
    case "google":
      return texto;
  }
}

export function variantesDe(texto: string, hashtags: string[], redes: Red[], estado: EstadoPieza): Variante[] {
  return redes.map((red) => ({ red, texto: textoParaRed(red, texto, hashtags), estado }));
}

/** El estado de la pieza sale de sus redes: una que falla la marca entera para revisar. */
export function estadoDeVariantes(variantes: Variante[], previo: EstadoPieza): EstadoPieza {
  if (variantes.some((v) => v.estado === "fallida")) return "fallida";
  if (variantes.length && variantes.every((v) => v.estado === "publicada")) return "publicada";
  return previo;
}

function sinTildes(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Los ángulos de la marca, primero los que más se parecen a lo que pidió. */
export function angulosPara(marcaId: string, prompt: string, soloVideo = false): Angulo[] {
  const todos = (BANCO[marcaId] ?? []).filter((a) => !soloVideo || a.tipo === "video");
  const p = sinTildes(prompt);
  const puntos = (a: Angulo) => a.claves.filter((c) => p.includes(sinTildes(c))).length;
  return todos
    .map((a, i) => ({ a, i, s: puntos(a) }))
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .map((x) => x.a);
}

/**
 * Qué idioma le toca a la pieza i de n para respetar el reparto: en un lote
 * 60/40 de cinco salen tres en español y dos en inglés, intercalados.
 */
export function idiomaDe(i: number, es: number): Idioma {
  // Redondeado: una sola pieza de una marca 60/40 sale en español.
  const antes = Math.round((i * es) / 100);
  const despues = Math.round(((i + 1) * es) / 100);
  return despues > antes ? "es" : "en";
}

export interface PedidoGeneracion {
  marca: Marca;
  texto: string;
  plantilla: Plantilla;
  idiomas: Record<Idioma, number>;
  redes?: Red[];
  /** Fotos de la biblioteca sobre las que escribir. */
  fotos?: string[];
  encargoId: string;
  actor: string;
  ahoraIso: string;
}

/** Arma las piezas de un encargo. Sin ángulos que repitan idioma mientras alcancen. */
export function generarPiezas(p: PedidoGeneracion): Pieza[] {
  const soloVideo = p.plantilla === "guion";
  const angulos = angulosPara(p.marca.id, p.texto, soloVideo);
  if (!angulos.length) return [];
  const n = CUANTAS[p.plantilla];
  const piezas: Pieza[] = [];
  for (let i = 0; i < n; i++) {
    const j = i % angulos.length;
    const a = angulos[j];
    const vuelta = Math.floor(i / angulos.length);
    // En la segunda vuelta cada ángulo va en el idioma que no usó en la
    // primera: el lote sale sin repetidos aunque el reparto quede parejo.
    let idioma = idiomaDe(j, p.idiomas.es);
    if (vuelta % 2 === 1) idioma = idioma === "es" ? "en" : "es";
    const t = a[idioma];
    const tipo = a.tipo;
    const redes = redesPara(tipo, p.marca, p.redes);
    const medios = tipo === "video" ? [] : p.fotos?.length ? p.fotos.slice(0, tipo === "carrusel" ? 3 : 1) : a.fotos;
    piezas.push({
      id: `${p.encargoId}-${i + 1}`,
      marcaId: p.marca.id,
      encargoId: p.encargoId,
      tipo,
      idioma,
      titulo: t.titulo,
      texto: t.texto,
      hashtags: t.hashtags,
      guion: t.guion,
      ideaImagen: a.idea,
      medios,
      duracion: a.duracion,
      redes,
      variantes: variantesDe(t.texto, t.hashtags, redes, "por_aprobar"),
      estado: "por_aprobar",
      fase: tipo === "video" ? "guion" : undefined,
      creada: p.ahoraIso,
      historial: [{ ts: p.ahoraIso, accion: "generada", actor: "Motor", nota: `Encargo de ${p.actor}` }],
    });
  }
  return piezas;
}

/** Otra versión de la misma pieza: el mismo ángulo en otro registro, o el siguiente ángulo. */
export function reescribir(pieza: Pieza, marca: Marca, motivo: string, ahoraIso: string): Pieza {
  const angulos = BANCO[marca.id] ?? [];
  const mismos = angulos.filter((a) => a.tipo === pieza.tipo);
  const actual = mismos.findIndex((a) => a[pieza.idioma].titulo === pieza.titulo);
  const otro = mismos[(actual + 1) % Math.max(1, mismos.length)] ?? mismos[0];
  const t = otro ? otro[pieza.idioma] : { titulo: pieza.titulo, texto: pieza.texto, hashtags: pieza.hashtags };
  return {
    ...pieza,
    titulo: t.titulo,
    texto: t.texto,
    hashtags: t.hashtags,
    guion: "guion" in t ? t.guion : pieza.guion,
    ideaImagen: otro?.idea ?? pieza.ideaImagen,
    medios: pieza.tipo === "video" ? pieza.medios : (otro?.fotos ?? pieza.medios),
    duracion: otro?.duracion ?? pieza.duracion,
    variantes: variantesDe(t.texto, t.hashtags, pieza.redes, "por_aprobar"),
    estado: "por_aprobar",
    historial: [...pieza.historial, { ts: ahoraIso, accion: "regenerada", actor: "Motor", nota: motivo || undefined }],
  };
}

export interface ReglaReparto {
  desde: string;
  /** 0 = lunes ... 6 = domingo. */
  dias: number[];
  horas: string[];
  /** Horas ya tomadas por la misma marca. */
  ocupadas: string[];
  /** Cuántos días hacia adelante buscar como máximo. */
  tope?: number;
}

/** Reparte piezas en los días y horas elegidos, sin pisar lo ya programado. */
export function repartir(ids: string[], regla: ReglaReparto): Record<string, string> {
  const fuera: Record<string, string> = {};
  const tomadas = new Set(regla.ocupadas);
  const horas = [...regla.horas].sort();
  let pendientes = [...ids];
  const tope = regla.tope ?? 90;
  for (let d = 0; d < tope && pendientes.length; d++) {
    const dia = sumarDias(regla.desde, d);
    if (!regla.dias.includes(diaSemana(dia))) continue;
    for (const h of horas) {
      if (!pendientes.length) break;
      const slot = `${dia}T${h}`;
      if (tomadas.has(slot)) continue;
      fuera[pendientes[0]] = slot;
      tomadas.add(slot);
      pendientes = pendientes.slice(1);
      // Una pieza por día y marca: el lote se estira en vez de amontonarse.
      break;
    }
  }
  return fuera;
}

const PESO_ETAPA: Record<Exclude<EtapaRender, "listo" | "fallo">, number> = { voz: 0.2, avatar: 0.6, edicion: 0.2 };

/** Dónde va un video según el tiempo que lleva. */
export function avanceRender(t: TrabajoRender, ahora: number): { etapa: EtapaRender; progreso: number; total: number } {
  if (t.etapa === "fallo") return { etapa: "fallo", progreso: 0, total: 0 };
  const total = Math.min(1, Math.max(0, (ahora - Date.parse(t.iniciado)) / (t.duracionSeg * 1000)));
  if (total >= 1) return { etapa: "listo", progreso: 100, total: 1 };
  let acumulado = 0;
  for (const etapa of ["voz", "avatar", "edicion"] as const) {
    const peso = PESO_ETAPA[etapa];
    if (total < acumulado + peso) {
      return { etapa, progreso: Math.round(((total - acumulado) / peso) * 100), total };
    }
    acumulado += peso;
  }
  return { etapa: "listo", progreso: 100, total: 1 };
}

// Tarifas de la MUESTRA, para que el tablero de costos tenga forma. Antes de
// ponerle precio a la reventa se reemplazan por lo que diga cada factura.
export const TARIFA = {
  textoPorPieza: 0.006,
  imagenPorGrafico: 0.04,
  vozPorMilCaracteres: 0.18,
  avatarPorMinuto: 1.0,
  edicionPorVideo: 0.1,
  edicionPorGrafico: 0.02,
};

export function costoTotal(uso: RegistroUso[]): number {
  return Math.round(uso.reduce((s, u) => s + u.costoUsd, 0) * 100) / 100;
}

export function costoPorServicio(uso: RegistroUso[]): Record<Servicio, number> {
  const fuera: Record<Servicio, number> = { texto: 0, imagen: 0, voz: 0, avatar: 0, edicion: 0, publicacion: 0 };
  for (const u of uso) fuera[u.servicio] += u.costoUsd;
  return fuera;
}

/** Costo por pieza de una marca: lo gastado entre las piezas que se generaron. */
export function costoPorPieza(uso: RegistroUso[], piezas: number): number {
  return piezas ? costoTotal(uso) / piezas : 0;
}

/** Ordena por hora: las de hoy arriba en el tablero. */
export function porHora(a: Pieza, b: Pieza): number {
  return (a.programadaPara ? instanteDe(a.programadaPara) : Infinity) - (b.programadaPara ? instanteDe(b.programadaPara) : Infinity);
}
