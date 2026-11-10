// Lo que el agente busca en la base de su cliente (tabla ia_busquedas).
//
// Hoy solo el laboratorio: cada kb_buscar de Valeria queda anotado con sus
// primeros resultados. De ahí sale "de qué preguntan" en el dashboard del lab
// (ver lib/lab-panel.ts y la migración 20261110090000_ia_busquedas.sql).
//
// Anotar nunca puede romper una respuesta: si la tabla no está o la base
// falla, se sigue sin anotar.

import { getSupabase } from "./supabase";
import { latchDeTabla, tablaFaltante } from "./tabla-faltante";

/** Cuántos resultados se guardan por búsqueda. */
export const RESULTADOS_GUARDADOS = 3;

export interface ResultadoGuardado {
  tipo: string;
  id: string;
  nombre: string;
  score: number;
}

export interface Busqueda {
  from: string;
  consulta: string;
  resultados: ResultadoGuardado[];
  /** ISO. */
  creado: string;
}

const faltaTabla = latchDeTabla();

/** Lo que trae la respuesta de kb_buscar (el JSON que recibe el modelo), reducido a lo que se guarda. */
export function resultadosDeRespuesta(json: string): ResultadoGuardado[] {
  try {
    const r = JSON.parse(json) as { resultados?: Array<Partial<ResultadoGuardado>> };
    return (r.resultados ?? [])
      .slice(0, RESULTADOS_GUARDADOS)
      .filter((x) => x.tipo && x.id && x.nombre)
      .map((x) => ({ tipo: String(x.tipo), id: String(x.id), nombre: String(x.nombre), score: Number(x.score ?? 0) }));
  } catch {
    return [];
  }
}

export async function registrarBusqueda(
  tenant: string,
  waFrom: string,
  consulta: string,
  resultados: ResultadoGuardado[],
): Promise<void> {
  const q = consulta.replace(/\s+/g, " ").trim().slice(0, 200);
  if (!q || !waFrom) return;
  const sb = getSupabase(tenant);
  if (!sb || faltaTabla.activo()) return;
  try {
    const { error } = await sb.from("ia_busquedas").insert({ tenant, wa_from: waFrom, consulta: q, resultados });
    if (error) {
      if (tablaFaltante(error)) faltaTabla.marcar();
      else console.error("[ia_busquedas] anotar:", error.message);
    }
  } catch (e) {
    console.error("[ia_busquedas] anotar:", e instanceof Error ? e.message : e);
  }
}
