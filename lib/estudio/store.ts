"use client";

// El estado del motor de contenido en el navegador.
//
// Igual que ShopUSA: la muestra se arma al cargar y lo que se hace en el demo
// (aprobar, mover en el calendario, generar un lote) se guarda en localStorage
// con llave propia de este panel. Si la muestra guardada es de otra semana se
// vuelve a armar, para que el calendario de una presentación nunca se vea
// viejo. "Restablecer" vuelve a la muestra.
//
// Las llamadas que con el servicio conectado salen a la red (generar,
// reescribir, programar, armar el video) pasan por /api/estudio (ver api.ts);
// este store solo guarda lo que contestan.

import { useSyncExternalStore } from "react";
import { diaDe, localSV, lunesDe } from "./fechas";
import { avanceRender, estadoDeVariantes, usoDeVideo, variantesDe } from "./generador";
import { semillaEstudio } from "./semilla";
import type {
  DatosAnuncio,
  Encargo,
  EstadoEstudio,
  EventoPieza,
  Marca,
  Medio,
  Pieza,
  Red,
  RegistroUso,
  TrabajoRender,
} from "./tipos";

// v3: las piezas traen el texto encima de la foto, su lectura y, si la
// imagen se generó, lo que se le pidió al modelo.
const CLAVE = "estudio.estado.v3";
const CLAVE_MARCA = "estudio.marca";

/** Quien firma lo que se hace en el demo. */
export const ACTOR = "Mario G.";

let estado: EstadoEstudio | null = null;
let marcaActiva = "todas";
let cargado = false;
const oyentes = new Set<() => void>();

function lunesDeHoy(): string {
  return lunesDe(diaDe(localSV()));
}

function leer(): EstadoEstudio | null {
  try {
    const raw = window.localStorage.getItem(CLAVE);
    if (!raw) return null;
    const e = JSON.parse(raw) as EstadoEstudio;
    if (!e || !Array.isArray(e.piezas) || e.base !== lunesDeHoy()) return null;
    return e;
  } catch {
    return null;
  }
}

function guardar() {
  try {
    if (estado) window.localStorage.setItem(CLAVE, JSON.stringify(estado));
    window.localStorage.setItem(CLAVE_MARCA, marcaActiva);
  } catch {
    // Sin almacenamiento el demo sigue en memoria.
  }
}

function asegurarCarga() {
  if (cargado || typeof window === "undefined") return;
  cargado = true;
  estado = leer() ?? semillaEstudio();
  try {
    marcaActiva = window.localStorage.getItem(CLAVE_MARCA) || "todas";
  } catch {
    marcaActiva = "todas";
  }
  if (marcaActiva !== "todas" && !estado.marcas.some((m) => m.id === marcaActiva)) marcaActiva = "todas";
  window.addEventListener("storage", (e) => {
    if (e.key !== CLAVE && e.key !== CLAVE_MARCA) return;
    estado = leer() ?? estado;
    try {
      marcaActiva = window.localStorage.getItem(CLAVE_MARCA) || "todas";
    } catch {
      // nada
    }
    emitir();
  });
}

function emitir() {
  for (const f of oyentes) f();
}

function suscribir(f: () => void) {
  asegurarCarga();
  oyentes.add(f);
  return () => oyentes.delete(f);
}

let servidor: EstadoEstudio | null = null;
function obtenerServidor(): EstadoEstudio {
  if (!servidor) servidor = semillaEstudio();
  return servidor;
}

function obtener(): EstadoEstudio {
  asegurarCarga();
  return estado ?? obtenerServidor();
}

export function useEstudio(): EstadoEstudio {
  return useSyncExternalStore(suscribir, obtener, obtenerServidor);
}

export function useMarcaActiva(): string {
  return useSyncExternalStore(
    suscribir,
    () => {
      asegurarCarga();
      return marcaActiva;
    },
    () => "todas",
  );
}

export function elegirMarca(id: string) {
  asegurarCarga();
  marcaActiva = id;
  guardar();
  emitir();
}

/** Lo que se ve con el selector de marca puesto. */
export function deMarca<T extends { marcaId: string }>(xs: T[], marca: string): T[] {
  return marca === "todas" ? xs : xs.filter((x) => x.marcaId === marca);
}

function cambiar(f: (e: EstadoEstudio) => EstadoEstudio) {
  asegurarCarga();
  if (!estado) return;
  estado = f(estado);
  guardar();
  emitir();
}

function evento(accion: EventoPieza["accion"], nota?: string, actor = ACTOR): EventoPieza {
  return { ts: new Date().toISOString(), accion, actor, nota };
}

function conPieza(id: string, f: (p: Pieza, e: EstadoEstudio) => Pieza) {
  cambiar((e) => ({ ...e, piezas: e.piezas.map((p) => (p.id === id ? f(p, e) : p)) }));
}

function nuevoId(prefijo: string): string {
  try {
    return `${prefijo}-${crypto.randomUUID().slice(0, 8)}`;
  } catch {
    return `${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }
}

/** Un video de la demo tarda poco más de un minuto en armarse. */
const DURACION_RENDER_DEMO = 75;

export function aprobar(id: string, video?: { trabajoId: string; minutos: number }) {
  cambiar((e) => {
    const p = e.piezas.find((x) => x.id === id);
    if (!p) return e;
    // Guion aprobado: arranca el video. Vuelve a la cola cuando esté armado.
    if (p.tipo === "video" && p.fase === "guion") {
      const trabajo: TrabajoRender = {
        id: video?.trabajoId ?? nuevoId("rd"),
        piezaId: p.id,
        marcaId: p.marcaId,
        etapa: "voz",
        progreso: 0,
        iniciado: new Date().toISOString(),
        duracionSeg: DURACION_RENDER_DEMO,
        minutos: video?.minutos ?? Math.round(((p.duracion ?? 30) / 60) * 100) / 100,
      };
      return {
        ...e,
        trabajos: [trabajo, ...e.trabajos],
        uso: [...usoDeVideo(p, trabajo.minutos, trabajo.iniciado).map((u) => ({ ...u, id: nuevoId("uso") })), ...e.uso],
        piezas: e.piezas.map((x) =>
          x.id === id ? { ...x, estado: "aprobada", historial: [...x.historial, evento("aprobada", "Guion")] } : x,
        ),
      };
    }
    return {
      ...e,
      piezas: e.piezas.map((x) =>
        x.id === id
          ? {
              ...x,
              estado: "aprobada",
              variantes: x.variantes.map((v) => ({ ...v, estado: "aprobada" })),
              historial: [...x.historial, evento("aprobada", x.tipo === "video" ? "Video" : undefined)],
            }
          : x,
      ),
    };
  });
}

export function rechazar(id: string, nota: string) {
  conPieza(id, (p) => ({
    ...p,
    estado: "rechazada",
    programadaPara: undefined,
    variantes: p.variantes.map((v) => ({ ...v, estado: "rechazada", postId: undefined })),
    historial: [...p.historial, evento("rechazada", nota.trim() || undefined)],
  }));
}

export function editar(
  id: string,
  cambios: { texto?: string; hashtags?: string[]; guion?: string; titulo?: string; anuncio?: DatosAnuncio; rotulos?: string[] },
) {
  conPieza(id, (p) => {
    const texto = cambios.texto ?? p.texto;
    const hashtags = cambios.hashtags ?? p.hashtags;
    const variantes = variantesDe(texto, hashtags, p.redes, p.estado, p.tipo).map((v) => ({
      ...v,
      postId: p.variantes.find((x) => x.red === v.red)?.postId,
    }));
    return {
      ...p,
      ...cambios,
      texto,
      hashtags,
      variantes,
      historial: [...p.historial, evento("editada")],
    };
  });
}

/** La letra del texto encima de la foto. No toca el texto ni las variantes. */
export function elegirLetra(id: string, letra: string) {
  conPieza(id, (p) => ({ ...p, letra }));
}

/** La versión nueva que devolvió el motor reemplaza a la anterior. */
export function reemplazar(pieza: Pieza) {
  conPieza(pieza.id, () => pieza);
}

export function programar(
  id: string,
  cuando: string,
  postIds: Partial<Record<Red, string>> = {},
  errores: Partial<Record<Red, string>> = {},
) {
  conPieza(id, (p) => ({
    ...p,
    estado: "programada",
    programadaPara: cuando,
    // La red que el planificador no aceptó queda marcada con su error; las
    // demás salen a su hora.
    variantes: p.variantes.map((v) =>
      errores[v.red]
        ? { ...v, estado: "fallida" as const, error: errores[v.red], postId: undefined }
        : { ...v, estado: "programada" as const, error: undefined, postId: postIds[v.red] ?? v.postId },
    ),
    historial: [...p.historial, evento(p.programadaPara ? "reprogramada" : "programada", cuando.replace("T", " "))],
  }));
}

export function desprogramar(id: string) {
  conPieza(id, (p) => ({
    ...p,
    estado: "aprobada",
    programadaPara: undefined,
    variantes: p.variantes.map((v) => ({ ...v, estado: "aprobada", postId: undefined })),
    historial: [...p.historial, evento("reprogramada", "Sin fecha")],
  }));
}

/**
 * Vuelve a intentar las redes que fallaron (después de reconectar la cuenta).
 * Si la hora ya pasó se publica ya; si no, queda programada para su hora.
 */
export function reintentar(id: string) {
  conPieza(id, (p) => {
    const futura = Boolean(p.programadaPara && p.programadaPara > localSV());
    const variantes = p.variantes.map((v) =>
      v.estado === "fallida"
        ? { ...v, estado: futura ? ("programada" as const) : ("publicada" as const), error: undefined, postId: `sp_${Date.now().toString(36)}` }
        : v,
    );
    return {
      ...p,
      variantes,
      estado: futura ? "programada" : estadoDeVariantes(variantes, "publicada"),
      historial: [...p.historial, evento(futura ? "programada" : "publicada", "Reintento")],
    };
  });
}

export function agregarEncargo(encargo: Encargo, piezas: Pieza[], uso: RegistroUso[]) {
  cambiar((e) => ({
    ...e,
    encargos: [encargo, ...e.encargos],
    piezas: [...piezas, ...e.piezas],
    uso: [...uso, ...e.uso],
  }));
}

export function registrarUso(uso: RegistroUso[]) {
  if (!uso.length) return;
  cambiar((e) => ({ ...e, uso: [...uso, ...e.uso] }));
}

export function actualizarMarca(marca: Marca) {
  cambiar((e) => ({ ...e, marcas: e.marcas.map((m) => (m.id === marca.id ? marca : m)) }));
}

export function conectarRed(marcaId: string, red: Red) {
  cambiar((e) => ({
    ...e,
    marcas: e.marcas.map((m) =>
      m.id === marcaId
        ? {
            ...m,
            redes: m.redes.map((r) =>
              r.red === red
                ? { ...r, estado: "conectada", cuenta: r.cuenta || `@${m.nombre.toLowerCase().replace(/[^a-z0-9]/g, "")}` }
                : r,
            ),
          }
        : m,
    ),
  }));
}

export function agregarMedio(medio: Medio) {
  cambiar((e) => ({ ...e, medios: [medio, ...e.medios] }));
}

/**
 * Avanza los videos que se están armando. Cuando uno termina, la pieza vuelve
 * a la cola con el video adjunto. Lo llama el shell cada pocos segundos.
 */
export function tick(ahora: number = Date.now()) {
  asegurarCarga();
  if (!estado) return;
  const terminados = estado.trabajos.filter(
    (t) => t.etapa !== "listo" && t.etapa !== "fallo" && avanceRender(t, ahora).etapa === "listo",
  );
  if (!terminados.length) return;
  const ids = new Set(terminados.map((t) => t.id));
  cambiar((e) => {
    const piezasListas = new Set(terminados.map((t) => t.piezaId));
    const nuevosMedios: Medio[] = [];
    const piezas = e.piezas.map((p) => {
      if (!piezasListas.has(p.id)) return p;
      const marca = e.marcas.find((m) => m.id === p.marcaId);
      const poster = marca?.avatar?.foto ?? p.medios[0] ?? "";
      nuevosMedios.push({
        id: nuevoId("md"),
        marcaId: p.marcaId,
        url: poster,
        tipo: "video",
        titulo: p.titulo,
        fecha: new Date(ahora).toISOString(),
        usos: 1,
      });
      return {
        ...p,
        fase: "video" as const,
        estado: "por_aprobar" as const,
        medios: [poster],
        variantes: p.variantes.map((v) => ({ ...v, estado: "por_aprobar" as const })),
        historial: [...p.historial, evento("generada", "Video armado", "Motor")],
      };
    });
    return {
      ...e,
      piezas,
      medios: [...nuevosMedios, ...e.medios],
      trabajos: e.trabajos.map((t) => (ids.has(t.id) ? { ...t, etapa: "listo", progreso: 100 } : t)),
    };
  });
}

/** Vuelve a la muestra: borra todo lo hecho en este navegador. */
export function restablecer() {
  asegurarCarga();
  estado = semillaEstudio();
  guardar();
  emitir();
}
