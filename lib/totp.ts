// TOTP (2FA por aplicación de autenticador) del lado del SERVIDOR.
//
// Segundo factor del login: además de la contraseña (que decide el tenant), se
// pide un código de 6 dígitos de una app tipo Google Authenticator o Authy.
//
// El secreto vive en variables de entorno (nunca en el repo, que es público):
//   TOTP_SECRETS="hospital:BASE32,grupoq:BASE32"   por tenant (tiene prioridad)
//   TOTP_SECRET="BASE32"                            global: aplica a todos
// Si un tenant no tiene secreto configurado, NO se le pide 2FA (opt-in): el
// login por contraseña sigue protegiendo, y el segundo factor se enciende con
// solo poner la variable. Así se puede activar por cliente sin tocar código.
//
// Usa Web Crypto (crypto.subtle), igual que session.ts, para no depender de
// node:crypto y correr en cualquier runtime.

import type { TenantId } from "./tenants/types";

const PASO_SEG = 30; // ventana TOTP estándar (RFC 6238)
const DIGITOS = 6;
const TOLERANCIA = 1; // acepta la ventana anterior/siguiente (desfase de reloj)

function secretosPorTenant(): Map<string, string> | null {
  const raw = process.env.TOTP_SECRETS;
  if (!raw) return null;
  const mapa = new Map<string, string>();
  for (const par of raw.split(",")) {
    const i = par.indexOf(":");
    if (i <= 0) continue;
    const tenant = par.slice(0, i).trim();
    const secreto = par
      .slice(i + 1)
      .trim()
      .replace(/\s/g, "")
      .toUpperCase();
    if (tenant && secreto) mapa.set(tenant, secreto);
  }
  return mapa.size > 0 ? mapa : null;
}

// Secreto Base32 del tenant, o null si ese tenant no usa 2FA.
function secretoDe(tenant: TenantId): string | null {
  const porTenant = secretosPorTenant();
  if (porTenant && porTenant.has(tenant)) return porTenant.get(tenant) ?? null;
  const global = process.env.TOTP_SECRET?.replace(/\s/g, "").toUpperCase();
  return global && global.length > 0 ? global : null;
}

/** true si el tenant tiene 2FA configurado (y por lo tanto hay que pedir código). */
export function tenantRequiere2FA(tenant: TenantId): boolean {
  return secretoDe(tenant) !== null;
}

// Base32 (RFC 4648) -> bytes. Devuelve null si hay un carácter inválido.
function base32Decode(s: string): Uint8Array<ArrayBuffer> | null {
  const alfa = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const limpio = s.replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let valor = 0;
  const out: number[] = [];
  for (const ch of limpio) {
    const idx = alfa.indexOf(ch);
    if (idx === -1) return null;
    valor = (valor << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((valor >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

// HOTP(secreto, contador) -> código de 6 dígitos (HMAC-SHA1 + truncado dinámico).
async function hotp(secreto: Uint8Array<ArrayBuffer>, contador: number): Promise<string> {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  // Contador de 8 bytes big-endian, partido en dos 32-bit (JS no maneja bien
  // enteros de 64 bits; para fechas realistas el valor cabe en 53 bits).
  view.setUint32(0, Math.floor(contador / 2 ** 32));
  view.setUint32(4, contador >>> 0);
  const key = await crypto.subtle.importKey(
    "raw",
    secreto,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
  const off = sig[sig.length - 1] & 0x0f;
  const bin =
    ((sig[off] & 0x7f) << 24) |
    ((sig[off + 1] & 0xff) << 16) |
    ((sig[off + 2] & 0xff) << 8) |
    (sig[off + 3] & 0xff);
  return (bin % 10 ** DIGITOS).toString().padStart(DIGITOS, "0");
}

function igualesEnTiempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

/**
 * Verifica un código de 6 dígitos contra el secreto del tenant, con tolerancia
 * de una ventana para el desfase de reloj. Devuelve false si el tenant no usa
 * 2FA, si el formato es inválido, o si no coincide.
 */
export async function verificarTotp(tenant: TenantId, token: string): Promise<boolean> {
  const secretoB32 = secretoDe(tenant);
  if (!secretoB32) return false;
  const limpio = (token || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(limpio)) return false;
  const secreto = base32Decode(secretoB32);
  if (!secreto || secreto.length === 0) return false;
  const contador = Math.floor(Date.now() / 1000 / PASO_SEG);
  for (let d = -TOLERANCIA; d <= TOLERANCIA; d++) {
    const codigo = await hotp(secreto, contador + d);
    if (igualesEnTiempoConstante(codigo, limpio)) return true;
  }
  return false;
}
