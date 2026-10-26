// Lo puro del motor: armar piezas, sus variantes por red, repartir un lote en
// el calendario, el avance de un video y las cuentas de créditos. Sin red ni
// navegador, para probarlo con vitest.

import { BANCO, type Angulo, type TextoAngulo } from "./banco";
import { diaSemana, instanteDe, sumarDias } from "./fechas";
import { llevaImagen, origenDe } from "./imagen";
import { llevaRotulo } from "./letras";
import type {
  DatosAnuncio,
  EstadoPieza,
  EtapaRender,
  Idioma,
  Marca,
  OrigenImagen,
  Pieza,
  Red,
  RegistroUso,
  Servicio,
  TipoPieza,
  TrabajoRender,
  Variante,
} from "./tipos";

/** Cuántas piezas se pueden pedir de cada formato. El video es más caro: lotes chicos. */
export const CANTIDADES: Record<TipoPieza, number[]> = {
  imagen: [1, 5, 12],
  carrusel: [1, 5, 12],
  video: [1, 2, 4],
  anuncio: [1, 3, 6],
  texto: [1, 5, 12],
};

const REDES_POR_TIPO: Record<TipoPieza, Red[]> = {
  video: ["instagram", "tiktok", "youtube", "facebook"],
  imagen: ["instagram", "facebook", "linkedin", "google"],
  carrusel: ["instagram", "facebook", "linkedin"],
  // El anuncio corre en la cuenta publicitaria de Meta: sale en las dos.
  anuncio: ["facebook", "instagram"],
  texto: ["facebook", "linkedin", "google"],
};

/** Las redes donde sale una pieza: las de su formato que la marca tiene conectadas (o vencidas). */
export function redesPara(tipo: TipoPieza, marca: Marca, pedidas?: Red[]): Red[] {
  const tiene = new Set(marca.redes.filter((r) => r.estado !== "sin_conectar").map((r) => r.red));
  return REDES_POR_TIPO[tipo].filter((r) => tiene.has(r) && (!pedidas || pedidas.length === 0 || pedidas.includes(r)));
}

/** Las redes posibles de un formato, para el selector de Crear. */
export function redesDelFormato(tipo: TipoPieza): Red[] {
  return REDES_POR_TIPO[tipo];
}

/** El texto de cada red: hashtags donde se usan, sin ellos donde estorban. */
export function textoParaRed(red: Red, texto: string, hashtags: string[], tipo?: TipoPieza): string {
  // El texto de un anuncio es el mismo en las dos redes y no lleva hashtags.
  if (tipo === "anuncio") return texto;
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

export function variantesDe(
  texto: string,
  hashtags: string[],
  redes: Red[],
  estado: EstadoPieza,
  tipo?: TipoPieza,
): Variante[] {
  return redes.map((red) => ({ red, texto: textoParaRed(red, texto, hashtags, tipo), estado }));
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

/**
 * Los ángulos de la marca que sirven para el formato, primero los que más se
 * parecen a lo que pidió y los que nacieron en ese formato. El video necesita
 * guion; cualquier otro ángulo puede salir como imagen, carrusel, texto o anuncio.
 */
export function angulosPara(marcaId: string, prompt: string, formato?: TipoPieza): Angulo[] {
  const todos = (BANCO[marcaId] ?? []).filter((a) => (formato === "video" ? a.tipo === "video" : a.tipo !== "video" || !formato));
  const p = sinTildes(prompt);
  const puntos = (a: Angulo) => a.claves.filter((c) => p.includes(sinTildes(c))).length * 2 + (a.tipo === formato ? 1 : 0);
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

/** Las fotos de la marca que no son retratos, para completar un carrusel. */
function fotosDeMarca(marcaId: string): string[] {
  const vistas = new Set<string>();
  for (const a of BANCO[marcaId] ?? []) for (const f of a.fotos) if (!f.includes("retrato-")) vistas.add(f);
  return [...vistas];
}

/** Cuántas láminas lleva un carrusel. */
export const LAMINAS_CARRUSEL = 3;

function mediosPara(formato: TipoPieza, a: Angulo, marcaId: string, fotos?: string[]): string[] {
  if (formato === "video") return [];
  const base = fotos?.length ? fotos : a.fotos.filter((f) => !f.includes("retrato-"));
  const propias = base.length ? base : fotosDeMarca(marcaId).slice(0, 1);
  if (formato !== "carrusel") return propias.slice(0, 1);
  const extra = fotosDeMarca(marcaId).filter((f) => !propias.includes(f));
  return [...propias, ...extra].slice(0, LAMINAS_CARRUSEL);
}

/**
 * El texto encima de cada foto: el título en la portada y, en un carrusel,
 * el de cada lámina que trae el ángulo. Las láminas de más van sin texto.
 */
export function rotulosDeAngulo(tipo: TipoPieza, t: TextoAngulo, laminas: number): string[] | undefined {
  if (!llevaRotulo(tipo)) return undefined;
  if (tipo !== "carrusel") return [t.titulo];
  const textos = [t.titulo, ...(t.laminas ?? [])];
  return Array.from({ length: Math.max(1, laminas) }, (_, i) => textos[i] ?? "");
}

/**
 * El titular, la línea corta y el botón de un anuncio. La línea corta va
 * debajo del titular, donde Meta muestra quién anuncia: la marca y su ciudad,
 * no otra vez el texto principal.
 */
export function anuncioDe(titulo: string, marca: Marca, idioma: Idioma): DatosAnuncio {
  return { titular: titulo, descripcion: `${marca.nombre} · ${marca.ciudad}`, cta: marca.cta[idioma] };
}

export interface PedidoGeneracion {
  marca: Marca;
  texto: string;
  formato: TipoPieza;
  cantidad: number;
  idiomas: Record<Idioma, number>;
  redes?: Red[];
  /** Fotos de la biblioteca sobre las que escribir. */
  fotos?: string[];
  /** Si la imagen la genera el modelo o sale de las fotos de obra. Con fotos elegidas, es obra. */
  origenImagen?: OrigenImagen;
  encargoId: string;
  actor: string;
  ahoraIso: string;
}

/**
 * Arma las piezas de un encargo, todas del formato pedido y sin repetir ángulo e idioma mientras alcancen.
 * Sin `escritos` los ángulos salen del banco de la marca; con ellos (los que escribió el modelo, uno por
 * pieza y ya en el idioma de `idiomaDe`) se usan esos.
 */
export function generarPiezas(p: PedidoGeneracion, escritos?: Angulo[]): Pieza[] {
  const angulos = escritos ?? angulosPara(p.marca.id, p.texto, p.formato);
  if (!angulos.length) return [];
  const n = Math.max(1, Math.min(p.cantidad, 12));
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
    const tipo = p.formato;
    const redes = redesPara(tipo, p.marca, p.redes);
    const medios = mediosPara(tipo, a, p.marca.id, p.fotos);
    const origenImagen = llevaImagen(tipo) ? (p.fotos?.length ? "obra" : p.origenImagen) : undefined;
    piezas.push({
      id: `${p.encargoId}-${i + 1}`,
      marcaId: p.marca.id,
      encargoId: p.encargoId,
      tipo,
      idioma,
      titulo: t.titulo,
      texto: t.texto,
      hashtags: tipo === "anuncio" ? [] : t.hashtags,
      guion: tipo === "video" ? t.guion : undefined,
      ideaImagen: a.idea,
      medios,
      rotulos: rotulosDeAngulo(tipo, t, medios.length),
      origenImagen,
      duracion: tipo === "video" ? a.duracion : undefined,
      anuncio: tipo === "anuncio" ? anuncioDe(t.titulo, p.marca, idioma) : undefined,
      redes,
      variantes: variantesDe(t.texto, t.hashtags, redes, "por_aprobar", tipo),
      estado: "por_aprobar",
      fase: tipo === "video" ? "guion" : undefined,
      creada: p.ahoraIso,
      historial: [{ ts: p.ahoraIso, accion: "generada", actor: "Motor", nota: `Encargo de ${p.actor}` }],
    });
  }
  return piezas;
}

/** Otra versión de la misma pieza, en el mismo formato: la que escribió el modelo o el siguiente ángulo del banco. */
export function reescribir(pieza: Pieza, marca: Marca, motivo: string, ahoraIso: string, escrito?: Angulo): Pieza {
  const sirven = escrito ? [] : angulosPara(marca.id, "", pieza.tipo);
  const actual = sirven.findIndex((a) => a[pieza.idioma].titulo === pieza.titulo);
  const otro = escrito ?? sirven[(actual + 1) % Math.max(1, sirven.length)] ?? sirven[0];
  if (!otro) return pieza;
  const t = otro[pieza.idioma];
  const hashtags = pieza.tipo === "anuncio" ? [] : t.hashtags;
  // Regenerar es el texto: una imagen generada se queda (rehacerla se cobra aparte).
  const generada = llevaImagen(pieza.tipo) && origenDe(pieza) === "ia" && Boolean(pieza.pedidosImagen?.length);
  const medios = pieza.tipo === "video" || generada ? pieza.medios : mediosPara(pieza.tipo, otro, marca.id);
  return {
    ...pieza,
    titulo: t.titulo,
    texto: t.texto,
    hashtags,
    guion: pieza.tipo === "video" ? t.guion : pieza.guion,
    // La imagen generada se queda, y con ella la escena que se le pidió.
    ideaImagen: generada ? pieza.ideaImagen : otro.idea,
    medios,
    // Fotos nuevas: la letra se vuelve a sugerir con lo que se lea de ellas.
    rotulos: rotulosDeAngulo(pieza.tipo, t, medios.length),
    letra: generada ? pieza.letra : undefined,
    lectura: generada ? pieza.lectura : undefined,
    duracion: pieza.tipo === "video" ? otro.duracion : pieza.duracion,
    anuncio: pieza.tipo === "anuncio" ? anuncioDe(t.titulo, marca, pieza.idioma) : pieza.anuncio,
    variantes: variantesDe(t.texto, t.hashtags, pieza.redes, "por_aprobar", pieza.tipo),
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

// Lo que cuesta cada cosa en créditos. Es lo que ve la marca: el precio del
// crédito se fija aparte, con lo que facturan los proveedores (costoUsd).
export const CREDITOS = {
  /** Escribir o reescribir una pieza. */
  texto: 1,
  /** Titular, texto y botón de un anuncio. */
  textoAnuncio: 2,
  /** Una imagen generada desde cero. */
  imagen: 4,
  /** Poner la marca (logo, colores, titular) sobre una foto, por lámina. */
  grafico: 1,
  /** La voz, por cada 100 caracteres del guion. */
  vozPor100: 1,
  /** El avatar, por minuto de video. */
  avatarPorMinuto: 20,
  /** Subtítulos, logo y música sobre el video. */
  edicionVideo: 3,
  publicacion: 0,
};

/** Créditos de armar un video con su guion: voz + avatar + edición. */
export function creditosVideo(guion: string, duracionSeg: number): { voz: number; avatar: number; edicion: number; total: number } {
  const voz = Math.max(1, Math.ceil(guion.length / 100)) * CREDITOS.vozPor100;
  const avatar = Math.ceil((duracionSeg / 60) * CREDITOS.avatarPorMinuto);
  const edicion = CREDITOS.edicionVideo;
  return { voz, avatar, edicion, total: voz + avatar + edicion };
}

/** Lo que gasta generar una pieza del formato (sin el video, que se cobra al aprobar el guion). */
/** Una imagen generada por lámina; con fotos de obra no se paga imagen. */
function creditosImagen(formato: TipoPieza, laminas: number, origen?: OrigenImagen): number {
  if (!llevaImagen(formato)) return 0;
  return origenDe({ tipo: formato, origenImagen: origen }) === "ia" ? CREDITOS.imagen * (formato === "carrusel" ? laminas : 1) : 0;
}

export function creditosPieza(formato: TipoPieza, laminas = 1, origen?: OrigenImagen): number {
  const imagen = creditosImagen(formato, laminas, origen);
  switch (formato) {
    case "texto":
      return CREDITOS.texto;
    case "imagen":
      return CREDITOS.texto + CREDITOS.grafico + imagen;
    case "carrusel":
      return CREDITOS.texto + CREDITOS.grafico * laminas + imagen;
    case "anuncio":
      return CREDITOS.textoAnuncio + imagen;
    case "video":
      return CREDITOS.texto;
  }
}

/**
 * Lo que va a gastar un encargo, para mostrarlo antes de generar. En video se
 * suma lo que costará armar cada uno si se aprueba el guion (30 s de promedio).
 */
export function estimarCreditos(formato: TipoPieza, cantidad: number, origen?: OrigenImagen): { ahora: number; alAprobar: number } {
  const ahora = creditosPieza(formato, 3, origen) * cantidad;
  const alAprobar = formato === "video" ? creditosVideo("x".repeat(420), 30).total * cantidad : 0;
  return { ahora, alAprobar };
}

export function creditosTotal(uso: RegistroUso[]): number {
  return uso.reduce((s, u) => s + u.creditos, 0);
}

export function creditosPorServicio(uso: RegistroUso[]): Record<Servicio, number> {
  const fuera: Record<Servicio, number> = { texto: 0, imagen: 0, voz: 0, avatar: 0, edicion: 0, publicacion: 0 };
  for (const u of uso) fuera[u.servicio] += u.creditos;
  return fuera;
}

// Lo que factura cada proveedor en la MUESTRA (interno). Sirve para ver el
// margen del crédito; las pantallas solo muestran créditos.
export const TARIFA = {
  textoPorPieza: 0.006,
  imagenPorGrafico: 0.04,
  vozPorMilCaracteres: 0.18,
  avatarPorMinuto: 1.0,
  edicionPorVideo: 0.1,
  edicionPorGrafico: 0.02,
};

/** Ordena por hora: las de hoy arriba en el tablero. */
export function porHora(a: Pieza, b: Pieza): number {
  return (a.programadaPara ? instanteDe(a.programadaPara) : Infinity) - (b.programadaPara ? instanteDe(b.programadaPara) : Infinity);
}

type UsoSinId = Omit<RegistroUso, "id">;

/** Lo que se descuenta al generar una pieza, por servicio. */
export function usoDeGeneracion(p: Pieza, fecha: string, proveedorTexto = "Claude"): UsoSinId[] {
  const base = { marcaId: p.marcaId, fecha, piezaId: p.id };
  const fuera: UsoSinId[] = [
    {
      ...base,
      servicio: "texto",
      proveedor: proveedorTexto,
      unidades: 1,
      unidad: "pieza",
      creditos: p.tipo === "anuncio" ? CREDITOS.textoAnuncio : CREDITOS.texto,
      costoUsd: TARIFA.textoPorPieza,
    },
  ];
  const laminas = p.tipo === "carrusel" ? Math.max(1, p.medios.length) : 1;
  if (llevaImagen(p.tipo) && origenDe(p) === "ia") {
    fuera.push({
      ...base,
      servicio: "imagen",
      proveedor: "OpenAI",
      unidades: laminas,
      unidad: laminas === 1 ? "imagen" : "imágenes",
      creditos: CREDITOS.imagen * laminas,
      costoUsd: TARIFA.imagenPorGrafico * laminas,
    });
  }
  if (p.tipo === "imagen" || p.tipo === "carrusel") {
    fuera.push({ ...base, servicio: "edicion", proveedor: "Creatomate", unidades: laminas, unidad: laminas === 1 ? "lámina" : "láminas", creditos: CREDITOS.grafico * laminas, costoUsd: TARIFA.edicionPorGrafico * laminas });
  }
  return fuera;
}

/** Lo que se descuenta al armar un video: voz, avatar y edición. */
export function usoDeVideo(p: Pieza, minutos: number, fecha: string): UsoSinId[] {
  const base = { marcaId: p.marcaId, fecha, piezaId: p.id };
  const caracteres = p.guion?.length ?? 0;
  const c = creditosVideo(p.guion ?? "", p.duracion ?? Math.round(minutos * 60));
  return [
    { ...base, servicio: "voz", proveedor: "ElevenLabs", unidades: caracteres, unidad: "caracteres", creditos: c.voz, costoUsd: (caracteres / 1000) * TARIFA.vozPorMilCaracteres },
    { ...base, servicio: "avatar", proveedor: "HeyGen", unidades: minutos, unidad: "min", creditos: c.avatar, costoUsd: minutos * TARIFA.avatarPorMinuto },
    { ...base, servicio: "edicion", proveedor: "Creatomate", unidades: 1, unidad: "video", creditos: c.edicion, costoUsd: TARIFA.edicionPorVideo },
  ];
}
