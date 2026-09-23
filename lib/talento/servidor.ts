// Candidatos REALES de BetMe en Supabase (tablas talento_*, esquema public).
// Solo servidor.
//
// Entra con una llave secreta propia (SUPABASE_TALENTO_SECRET_KEY) porque las
// tablas tienen RLS sin policies: la llave publicable no ve nada, a proposito.
//
// Sin la llave: en desarrollo local cae a memoria (para probar sin tocar la
// base); en produccion NO cae a memoria, falla fuerte. Caer en silencio seria
// perder postulaciones reales sin que nadie se entere.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { actualizarConEnvio, candidatoDeEnvio, VACANTE_DE_PUESTO, type EnvioFormulario } from "./formulario";
import type { Candidato, Postulacion } from "./tipos";

const TENANT = "betme";

type Cliente = SupabaseClient<any, any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
let cliente: Cliente | null | undefined;

export function enProduccion(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

function db(): Cliente | null {
  if (cliente !== undefined) return cliente;
  const url = process.env.SUPABASE_URL || "https://pfzxpidlbuxxtlycdwaj.supabase.co";
  const key = process.env.SUPABASE_TALENTO_SECRET_KEY;
  cliente = key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return cliente;
}

export class SinBase extends Error {}

// --- Respaldo en memoria, solo desarrollo ---
const g = globalThis as unknown as {
  __talento?: { candidatos: Map<string, Candidato>; postulaciones: Map<string, Postulacion>; envios: unknown[] };
};
const mem = (g.__talento ??= { candidatos: new Map(), postulaciones: new Map(), envios: [] as unknown[] });

function base(): Cliente | null {
  const c = db();
  if (!c && enProduccion()) throw new SinBase("Falta SUPABASE_TALENTO_SECRET_KEY");
  return c;
}

export interface EstadoReal {
  candidatos: Candidato[];
  postulaciones: Postulacion[];
}

export async function leerReal(): Promise<EstadoReal> {
  const c = base();
  if (!c) return { candidatos: [...mem.candidatos.values()], postulaciones: [...mem.postulaciones.values()] };
  const [a, b] = await Promise.all([
    c.from("talento_candidatos").select("perfil").eq("tenant", TENANT).order("creado", { ascending: false }),
    c.from("talento_postulaciones").select("datos").eq("tenant", TENANT),
  ]);
  if (a.error) throw a.error;
  if (b.error) throw b.error;
  return {
    candidatos: (a.data ?? []).map((r) => r.perfil as Candidato),
    postulaciones: (b.data ?? []).map((r) => r.datos as Postulacion),
  };
}

async function buscarPorEmail(email: string): Promise<Candidato | null> {
  const c = base();
  if (!c) return [...mem.candidatos.values()].find((x) => x.correo === email) ?? null;
  const r = await c.from("talento_candidatos").select("perfil").eq("tenant", TENANT).eq("email", email).maybeSingle();
  if (r.error) throw r.error;
  return (r.data?.perfil as Candidato) ?? null;
}

async function guardarCandidato(x: Candidato, nuevo: boolean): Promise<void> {
  const c = base();
  if (!c) {
    mem.candidatos.set(x.id, x);
    return;
  }
  const fila = { id: x.id, tenant: TENANT, email: x.correo ? x.correo.toLowerCase() : null, perfil: x, actualizado: new Date().toISOString() };
  const r = nuevo
    ? await c.from("talento_candidatos").insert({ ...fila, creado: x.creado })
    : await c.from("talento_candidatos").upsert(fila, { onConflict: "id" });
  if (r.error) throw r.error;
}

async function guardarPostulacion(p: Postulacion): Promise<void> {
  const c = base();
  if (!c) {
    mem.postulaciones.set(p.id, p);
    return;
  }
  const r = await c.from("talento_postulaciones").upsert(
    { id: p.id, tenant: TENANT, candidato_id: p.candidatoId, vacante_id: p.vacanteId, datos: p, creada: p.creada, actualizado: new Date().toISOString() },
    { onConflict: "id" },
  );
  if (r.error) throw r.error;
}

export interface ResultadoEnvio {
  candidatoId: string;
  nuevo: boolean;
  postulacionId: string | null;
}

/** Registra un envio del formulario: perfil (nuevo o actualizado), el envio crudo y, si aplica, su postulacion. */
export async function registrarEnvio(e: EnvioFormulario, origen: string | null, ahora: string): Promise<ResultadoEnvio> {
  const email = e.email.toLowerCase();
  const previo = await buscarPorEmail(email);
  const candidato = previo ? actualizarConEnvio(previo, e) : candidatoDeEnvio(e, `r-${crypto.randomUUID()}`, ahora);
  await guardarCandidato(candidato, !previo);

  const c = base();
  if (c) {
    const r = await c.from("talento_envios").insert({ tenant: TENANT, candidato_id: candidato.id, email, puesto: e.position, origen, payload: e, recibido: ahora });
    if (r.error) throw r.error;
  } else {
    mem.envios.push({ candidato_id: candidato.id, payload: e, recibido: ahora });
  }

  // Entra al pipeline de la vacante de su puesto, si hay una y no esta ya.
  const vacanteId = VACANTE_DE_PUESTO[e.position];
  let postulacionId: string | null = null;
  if (vacanteId) {
    const { postulaciones } = await leerReal();
    const ya = postulaciones.find((p) => p.candidatoId === candidato.id && p.vacanteId === vacanteId);
    if (!ya) {
      const p: Postulacion = {
        id: `rp-${crypto.randomUUID()}`,
        candidatoId: candidato.id,
        vacanteId,
        etapa: "nuevo",
        historial: [{ etapa: "nuevo", ts: ahora }],
        creada: ahora,
      };
      await guardarPostulacion(p);
      postulacionId = p.id;
    }
  }
  return { candidatoId: candidato.id, nuevo: !previo, postulacionId };
}

/** Lo que cambio el equipo desde el panel: perfiles, postulaciones y las que se borraron. */
export async function guardarCambios(candidatos: Candidato[], postulaciones: Postulacion[], borrar: string[]): Promise<void> {
  for (const x of candidatos) await guardarCandidato(x, false);
  for (const p of postulaciones) await guardarPostulacion(p);
  if (borrar.length) {
    const c = base();
    if (!c) {
      for (const id of borrar) mem.postulaciones.delete(id);
    } else {
      const r = await c.from("talento_postulaciones").delete().eq("tenant", TENANT).in("id", borrar);
      if (r.error) throw r.error;
    }
  }
}
