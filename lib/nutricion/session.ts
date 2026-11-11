// Sesión del demo: una cookie httpOnly "rol.firma" con una firma HMAC del rol.
// Prueba que quien la tiene escribió la clave de ese perfil. Funciona igual en
// el proxy (edge) y en las rutas de API (Web Crypto).

import { ACCESOS, ROLES, ROL_INFO, USUARIO_GENERAL, type Acceso } from "./roles";

export const COOKIE = "nutri_sesion";
export const DURACION_S = 60 * 60 * 24 * 7;

// Fija a propósito: en el repo DEMO, DEMO_PASSWORD es de los otros demos.
export const CLAVE = "demonutri";
const SECRETO = process.env.SESSION_SECRET ?? "balance-demo-secreto-local";

/** Acceso que corresponde a un usuario, o null si no existe. */
export function rolDeUsuario(usuario: string): Acceso | null {
  const u = usuario.trim().toLowerCase();
  if (u === USUARIO_GENERAL) return "general";
  return ROLES.find((r) => ROL_INFO[r].usuario === u) ?? null;
}

async function firma(rol: Acceso): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRETO), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`nutri-demo:${rol}:${CLAVE}`));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function firmaSesion(rol: Acceso): Promise<string> {
  return `${rol}.${await firma(rol)}`;
}

/** Acceso de una cookie válida, o null. */
export async function rolDeSesion(valor: string | undefined): Promise<Acceso | null> {
  if (!valor) return null;
  const [rol, sig] = valor.split(".");
  if (!ACCESOS.includes(rol as Acceso)) return null;
  return sig === (await firma(rol as Acceso)) ? (rol as Acceso) : null;
}
