// Lectura de `public.miagentia_leads` (los leads de las landings de
// conferencia de miagentia.com). SOLO SERVIDOR.
//
// Por que una llave aparte: la tabla tiene RLS encendido y SIN politicas a
// proposito, para que la llave publica (la que usa el resto de este panel) no
// alcance nombres, telefonos y correos de gente real. Se lee con la llave
// secreta del proyecto (`SUPABASE_LEADS_SECRET_KEY`, sb_secret_...), que se salta
// RLS. Nunca sale de aca: la ruta que llama esto ya exige sesion de la agencia.

import type { LeadConferencia } from "./leads-conferencia";

const COLUMNAS =
  "id,creado_en,tipo,asesora,landing,origen,nombre,empresa,cargo,telefono,correo,interes,mensaje,consentimiento,utm";

export function hayLlaveLeads(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_LEADS_SECRET_KEY);
}

export async function leerLeadsConferencia(limite = 2000): Promise<LeadConferencia[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_LEADS_SECRET_KEY;
  if (!url || !key) throw new Error("Falta SUPABASE_LEADS_SECRET_KEY en este entorno.");
  const r = await fetch(`${url}/rest/v1/miagentia_leads?select=${COLUMNAS}&order=creado_en.desc&limit=${limite}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase respondio ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()) as LeadConferencia[];
}
