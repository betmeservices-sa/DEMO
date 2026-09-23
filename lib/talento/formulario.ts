// El formulario de carreras de BetMe (HTML propio pegado en GHL) manda cada
// postulacion como JSON a /api/talento/postulacion. Aca se valida y se
// convierte en un perfil del banco de talento. Funciones puras.
//
// El formulario NO pregunta skills, nivel de ingles, anos de experiencia,
// jornada ni horario. Esos campos quedan marcados como "sin dato" y el match
// los cuenta como faltantes: no se inventan.

import { normalizar } from "./catalogo";
import { REQUISITOS_BASE } from "./lector";
import type { Candidato, DatoFaltante, Fuente, Pais, Vacante } from "./tipos";

export const LIMITE_BYTES = 20_000;
const MAX_CAMPO = 2000;

export const PUESTOS = [
  "Marketing and Operations VA",
  "Digital Marketing Specialist",
  "Project Coordinator",
  "Insurance VA (Life/Health)",
  "Real Estate VA",
  "Legal Assistant/ Paralegal",
  "Business Analyst",
  "Bookkeeper",
  "IT Specialist",
  "Others",
] as const;

/**
 * El puesto del formulario y la vacante abierta del tablero que le
 * corresponde. Los que no tienen vacante abierta quedan en Perfiles.
 */
export const VACANTE_DE_PUESTO: Record<string, string> = {
  "Marketing and Operations VA": "v3",
  "Project Coordinator": "v4",
  "Legal Assistant/ Paralegal": "v2",
  "Business Analyst": "v5",
};

const PREFIJO_FORMULARIO = "f-";

/**
 * La vacante donde entra una postulacion: la del tablero si el puesto tiene
 * una, y si no, la del puesto mismo ("f-digital-marketing-specialist").
 *
 * Antes los puestos sin vacante no creaban postulacion y la persona quedaba
 * solo en Perfiles: aparecia en el match de Vacantes pero nunca en el
 * Pipeline, que es donde el equipo trabaja.
 */
export function vacanteIdDePuesto(puesto: string): string {
  const mapeada = VACANTE_DE_PUESTO[puesto];
  if (mapeada) return mapeada;
  const slug = normalizar(puesto)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${PREFIJO_FORMULARIO}${slug || "sin-puesto"}`;
}

export function esVacanteDeFormulario(id: string): boolean {
  return id.startsWith(PREFIJO_FORMULARIO);
}

/** La vacante de un puesto del formulario, armada a partir de sus postulaciones. */
export function vacanteDeFormulario(id: string, puesto: string, creada: string): Vacante {
  return {
    id,
    titulo: puesto || "Sin puesto",
    cliente: "Postulaciones del formulario",
    area: "Formulario de carreras",
    descripcion: "Puesto tal como llega del formulario de carreras. Sin requisitos definidos.",
    requisitos: { ...REQUISITOS_BASE, skills: [], deseables: [] },
    estado: "abierta",
    plazas: 1,
    responsable: "me",
    creada,
    origen: "formulario",
  };
}

export interface EnvioFormulario {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  salary_expectation: string;
  voice_recording: string;
  how_did_you_hear: string;
  referred_by: string;
  resume: string;
  resume_file_url: string;
  additional_notes: string;
  source_page: string;
}

const CAMPOS: (keyof EnvioFormulario)[] = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "position",
  "salary_expectation",
  "voice_recording",
  "how_did_you_hear",
  "referred_by",
  "resume",
  "resume_file_url",
  "additional_notes",
  "source_page",
];

/** Todos los campos como string recortado; lo que no venga, vacio. */
export function limpiarEnvio(crudo: unknown): EnvioFormulario {
  const o = (crudo && typeof crudo === "object" ? crudo : {}) as Record<string, unknown>;
  const salida = {} as EnvioFormulario;
  for (const k of CAMPOS) {
    const v = o[k];
    salida[k] = typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, MAX_CAMPO) : "";
  }
  return salida;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validarEnvio(e: EnvioFormulario): string[] {
  const errores: string[] = [];
  if (!e.first_name) errores.push("Falta el nombre.");
  if (!EMAIL.test(e.email)) errores.push("El correo no es válido.");
  const digitos = e.phone.replace(/\D/g, "");
  if (!/^\+?[\d\s().-]+$/.test(e.phone) || digitos.length < 8 || digitos.length > 15) {
    errores.push("El teléfono no es válido.");
  }
  return errores;
}

// Prefijos largos primero: +50 no puede tragarse a +503.
const PREFIJOS: [string, Pais][] = [
  ["503", "SV"],
  ["502", "GT"],
  ["504", "HN"],
  ["505", "NI"],
  ["506", "CR"],
  ["507", "PA"],
  ["52", "MX"],
  ["57", "CO"],
];

export function paisDeTelefono(tel: string): Pais {
  const d = tel.replace(/\D/g, "");
  return PREFIJOS.find(([p]) => d.startsWith(p))?.[1] ?? "OT";
}

/**
 * La pretension en USD al mes a partir de texto libre ("$900", "900-1,100",
 * "1200 USD"). Con un rango toma el piso. Sin numero, null: no se inventa.
 */
export function pretensionDeTexto(t: string): number | null {
  const m = t.replace(/,(?=\d{3}\b)/g, "").match(/\d+(?:\.\d+)?\s*k?/i);
  if (!m) return null;
  let n = parseFloat(m[0]);
  if (/k/i.test(m[0])) n *= 1000;
  return n > 0 && n < 100_000 ? Math.round(n) : null;
}

export function fuenteDe(t: string): Fuente {
  const s = t.trim().toLowerCase();
  if (s === "linkedin") return "linkedin";
  if (s === "referral") return "referido";
  if (s === "instagram") return "instagram";
  if (s === "facebook") return "facebook";
  if (s === "google") return "google";
  return "otro";
}

/** Un perfil nuevo del banco a partir de un envio. */
export function candidatoDeEnvio(e: EnvioFormulario, id: string, ahora: string): Candidato {
  const pretension = pretensionDeTexto(e.salary_expectation);
  const sinDato: DatoFaltante[] = ["ingles", "experiencia", "jornada", "horarios", "disponibilidad", "ubicacion"];
  if (pretension === null) sinDato.push("pretension");
  const nombre = [e.first_name, e.last_name].filter(Boolean).join(" ");
  return {
    id,
    nombre,
    telefono: e.phone,
    correo: e.email.toLowerCase(),
    ubicacion: { pais: paisDeTelefono(e.phone) },
    titular: e.position || "Sin puesto",
    resumen: e.additional_notes,
    experiencia: [],
    aniosExperiencia: 0,
    educacion: "",
    skills: [],
    // Valores de relleno para que el tipo cierre; la ficha y el match leen
    // `sinDato` y los muestran como faltantes.
    ingles: "A2",
    pretension: pretension ?? 0,
    jornada: "completo",
    horarios: [],
    disponibilidad: "inmediata",
    fuente: fuenteDe(e.how_did_you_hear),
    referidoPor: e.referred_by || undefined,
    audioUrl: e.voice_recording || undefined,
    cvUrl: e.resume_file_url || e.resume || undefined,
    puesto: e.position || undefined,
    sinDato,
    origen: "formulario",
    creado: ahora,
    notas: [],
  };
}

/**
 * Reaplico: el perfil toma los datos nuevos del formulario y conserva lo que
 * el equipo ya trabajo (decision, notas, skills cargadas a mano, fecha de
 * ingreso original).
 */
export function actualizarConEnvio(previo: Candidato, e: EnvioFormulario): Candidato {
  const nuevo = candidatoDeEnvio(e, previo.id, previo.creado);
  const pretension = pretensionDeTexto(e.salary_expectation);
  const sinDato: DatoFaltante[] = (previo.sinDato ?? []).filter((d) => d !== "pretension");
  if (pretension === null && (previo.sinDato ?? []).includes("pretension")) sinDato.push("pretension");
  return {
    ...previo,
    nombre: nuevo.nombre || previo.nombre,
    telefono: nuevo.telefono,
    titular: nuevo.titular,
    puesto: nuevo.puesto ?? previo.puesto,
    resumen: nuevo.resumen || previo.resumen,
    pretension: pretension ?? previo.pretension,
    sinDato,
    fuente: nuevo.fuente,
    referidoPor: nuevo.referidoPor ?? previo.referidoPor,
    audioUrl: nuevo.audioUrl ?? previo.audioUrl,
    cvUrl: nuevo.cvUrl ?? previo.cvUrl,
    ubicacion: previo.ubicacion.departamento ? previo.ubicacion : nuevo.ubicacion,
  };
}
