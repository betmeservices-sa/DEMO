// Quién puede ESCRIBIR por cada ruta de la API.
//
// El proxy cierra la puerta grande: sin sesión firmada no entra nadie a /api.
// Pero adentro, hasta el 2026-10-12, casi todo lo que escribía o configuraba
// solo preguntaba de qué cliente era la sesión, no quién era. Una cuenta de
// recepción podía apagar la IA de todo el cliente, borrar el historial o
// cambiar el número con una petición a mano: el menú no se lo mostraba, y eso
// era toda la protección.
//
// Acá va el mismo mapa que usa el menú y el proxy para las páginas (`VE` en
// lib/modulos.ts): si el rol no ve el módulo, tampoco escribe en su API. Los
// logins de demostración entran con `gerente_marketing`, que ve todo, así que
// el demo sigue igual; lo que cambia es que una cuenta de persona con un rol
// chico ya no puede hacer de más.
//
// Uso en una ruta:
//   const p = await exigirModulo(req, "settings");
//   if (!p.ok) return p.respuesta;
//   ... p.sesion ...

import { NextResponse } from "next/server";
import { leerSesion, sesionDeCookieHeader, type Sesion } from "./session";
import { VE, type ModuleId } from "./modulos";
import type { RoleId } from "./data/types";

export type Permiso = { ok: true; sesion: Sesion } | { ok: false; respuesta: NextResponse };

const SIN_SESION = "No autenticado. Inicia sesion para acceder a estos datos.";
const SIN_PERMISO = "Tu perfil no puede hacer esto.";

function negado(status: 401 | 403, mensaje: string): Permiso {
  return { ok: false, respuesta: NextResponse.json({ ok: false, error: mensaje }, { status }) };
}

export async function sesionDe(req: Request): Promise<Sesion | null> {
  return leerSesion(sesionDeCookieHeader(req.headers.get("cookie")));
}

export function veModulo(sesion: Sesion, modulo: ModuleId): boolean {
  return (VE[sesion.rol] ?? []).includes(modulo);
}

/** Sesión válida cuyo rol ve este módulo. */
export async function exigirModulo(req: Request, modulo: ModuleId, mensaje = SIN_PERMISO): Promise<Permiso> {
  const sesion = await sesionDe(req);
  if (!sesion) return negado(401, SIN_SESION);
  if (!veModulo(sesion, modulo)) return negado(403, mensaje);
  return { ok: true, sesion };
}

/** Sesión válida con uno de estos roles. Para lo que no calza en un módulo. */
export async function exigirRoles(req: Request, roles: readonly RoleId[], mensaje = SIN_PERMISO): Promise<Permiso> {
  const sesion = await sesionDe(req);
  if (!sesion) return negado(401, SIN_SESION);
  if (!roles.includes(sesion.rol)) return negado(403, mensaje);
  return { ok: true, sesion };
}

/** Solo una cuenta de la agencia (la marca `todos` va dentro de la firma). */
export async function exigirAgencia(req: Request, mensaje = "Solo la agencia puede hacer esto."): Promise<Permiso> {
  const sesion = await sesionDe(req);
  if (!sesion) return negado(401, SIN_SESION);
  if (!sesion.todos) return negado(403, mensaje);
  return { ok: true, sesion };
}

/** Los roles que dirigen: dirección, gerencia y jefatura. */
export const DIRECCION: readonly RoleId[] = ["admin", "gerente_marketing", "jefe"];
