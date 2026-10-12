// Resolución del tenant en el SERVIDOR (route handlers).
//
// El tenant sale de la cookie de sesión FIRMADA (`lib/session.ts`), no de una
// cookie suelta: antes cualquiera podía escribir `ccg_tenant=hospital` en su
// navegador y leer los datos de otro cliente.
//
// El proxy ya verificó la firma y la expiración antes de que el handler corra,
// pero acá se vuelve a verificar igual. Hasta el 2026-10-12 esto leía el
// primer campo de la cookie sin mirar la firma, confiando en el proxy: una
// ruta que quedara fuera de su matcher, o un proxy que no corriera, servía los
// datos del cliente que dijera la cookie. Defensa en profundidad: una cookie
// que no está firmada por nosotros no nombra a ningún cliente.
//
// Se verifica con node:crypto, de forma síncrona, para que las decenas de
// rutas que llaman `tenantFromRequest` sigan sin esperar. Misma firma que
// `lib/session.ts` (HMAC-SHA256 en base64url), que usa Web Crypto porque
// también corre en el proxy.
//
// El webhook de Meta NO usa esto: ese enruta por phone_number_id (ver
// resolveTenantByPhoneNumberId) y valida la firma de Meta por su cuenta.

import { createHmac, timingSafeEqual } from "node:crypto";
import { DEFAULT_TENANT, isTenantId } from "./index";
import { SESSION_COOKIE, secretoDeSesion } from "../session";
import type { TenantId } from "./types";

function firmaValida(payload: string, firma: string): boolean {
  const secreto = secretoDeSesion();
  if (!secreto) return false;
  const esperada = createHmac("sha256", secreto).update(payload).digest("base64url");
  if (esperada.length !== firma.length) return false;
  return timingSafeEqual(Buffer.from(esperada), Buffer.from(firma));
}

/**
 * El tenant de una cookie de sesión, solo si la firma es nuestra y no venció.
 * Acepta los dos formatos que emite `crearSesion`: el de seis campos y el
 * viejo de tres (tenant.exp.firma).
 */
export function tenantDeCookieFirmada(valor: string | null | undefined): TenantId | null {
  if (!valor) return null;
  const partes = valor.split(".");
  if (partes.length !== 6 && partes.length !== 3) return null;
  const tenant = partes[0];
  if (!isTenantId(tenant)) return null;
  const exp = Number(partes[partes.length - 2]);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  const payload = partes.slice(0, -1).join(".");
  if (!firmaValida(payload, partes[partes.length - 1])) {
    console.warn(`[tenant] cookie de sesión con firma inválida: se ignora (decía "${tenant}")`);
    return null;
  }
  return tenant;
}

export function tenantFromCookieHeader(cookieHeader: string | null): TenantId {
  if (cookieHeader) {
    const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
    const tenant = m ? tenantDeCookieFirmada(m[1]) : null;
    if (tenant) return tenant;
  }
  return DEFAULT_TENANT;
}

export function tenantFromRequest(req: Request): TenantId {
  return tenantFromCookieHeader(req.headers.get("cookie"));
}
