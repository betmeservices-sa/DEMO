// Frenos compartidos: cuántas veces pasó algo por una clave (una IP, un
// correo) y hasta cuándo está bloqueada.
//
// Antes cada ruta tenía su Map en memoria. En Vercel cada instancia tiene el
// suyo y se reinicia solo, así que quien probaba claves con paciencia nunca se
// topaba con el freno. Acá la cuenta vive en la tabla `frenos` de la base de la
// agencia y es una sola para todas las instancias. Sin base (prueba local, la
// suite) cae a memoria con la misma lógica.
//
// Dos usos:
//   - `golpe`: una ruta pública cuenta cada pedido y corta al pasar el tope.
//   - `fallo` / `segundosBloqueada` / `limpiar`: el login cuenta los intentos
//     fallidos por IP y por correo, y bloquea cada vez más tiempo.
//
// Si la base falla, el freno se abre y se anota en el log: un freno caído no
// puede dejar afuera a todo el mundo, y la base caída ya se nota sola.

import { NextResponse } from "next/server";
import { getSupabase } from "./supabase";

export interface Politica {
  /** Cuántos golpes caben en la ventana antes de cortar. */
  max: number;
  ventanaSeg: number;
}

/** Cuánto se cuentan los intentos fallidos de login antes de olvidarlos. */
export const VENTANA_LOGIN_SEG = 60 * 60;

/**
 * La escalera del login: con tantos fallos en la ventana, tantos segundos de
 * bloqueo. Cada fallo de más vuelve a aplicar el escalón más alto alcanzado.
 */
export const ESCALERA: ReadonlyArray<readonly [fallos: number, segundos: number]> = [
  [5, 60],
  [8, 5 * 60],
  [12, 30 * 60],
  [20, 4 * 60 * 60],
];

export function bloqueoPorFallos(fallos: number): number {
  let seg = 0;
  for (const [desde, s] of ESCALERA) if (fallos >= desde) seg = s;
  return seg;
}

interface Fila {
  cuenta: number;
  ventanaDesde: number;
  bloqueadoHasta: number | null;
}

const memoria = new Map<string, Fila>();

function tocarEnMemoria(clave: string, ventanaSeg: number, ahora = Date.now()): Fila {
  const previa = memoria.get(clave);
  const vencida = !previa || previa.ventanaDesde < ahora - ventanaSeg * 1000;
  const fila: Fila = vencida
    ? { cuenta: 1, ventanaDesde: ahora, bloqueadoHasta: previa?.bloqueadoHasta ?? null }
    : { ...previa, cuenta: previa.cuenta + 1 };
  memoria.set(clave, fila);
  return fila;
}

/** Un golpe más sobre la clave. null si la base falló (el freno se abre). */
async function tocar(clave: string, ventanaSeg: number): Promise<Fila | null> {
  const sb = getSupabase();
  if (!sb) return tocarEnMemoria(clave, ventanaSeg);
  try {
    const { data, error } = await sb.rpc("freno_tocar", { p_clave: clave, p_ventana_seg: ventanaSeg });
    if (error) throw new Error(error.message);
    const fila = (Array.isArray(data) ? data[0] : data) as { cuenta: number; bloqueado_hasta: string | null } | undefined;
    if (!fila) return null;
    return {
      cuenta: Number(fila.cuenta) || 0,
      ventanaDesde: Date.now(),
      bloqueadoHasta: fila.bloqueado_hasta ? Date.parse(fila.bloqueado_hasta) : null,
    };
  } catch (e) {
    console.error("[freno] tocar:", e instanceof Error ? e.message : e);
    return null;
  }
}

async function bloquear(clave: string, segundos: number): Promise<void> {
  const hasta = Date.now() + segundos * 1000;
  const sb = getSupabase();
  if (!sb) {
    const fila = memoria.get(clave);
    if (fila) fila.bloqueadoHasta = Math.max(fila.bloqueadoHasta ?? 0, hasta);
    return;
  }
  try {
    const { error } = await sb
      .from("frenos")
      .update({ bloqueado_hasta: new Date(hasta).toISOString(), actualizado: new Date().toISOString() })
      .eq("clave", clave);
    if (error) throw new Error(error.message);
  } catch (e) {
    console.error("[freno] bloquear:", e instanceof Error ? e.message : e);
  }
}

/**
 * Cuántos segundos falta para que se libere alguna de estas claves. 0 si
 * ninguna está bloqueada (o si la base no contestó).
 */
export async function segundosBloqueada(claves: string[]): Promise<number> {
  const ahora = Date.now();
  const sb = getSupabase();
  let hastas: (number | null)[];
  if (!sb) {
    hastas = claves.map((c) => memoria.get(c)?.bloqueadoHasta ?? null);
  } else {
    try {
      const { data, error } = await sb.from("frenos").select("bloqueado_hasta").in("clave", claves);
      if (error) throw new Error(error.message);
      hastas = ((data ?? []) as { bloqueado_hasta: string | null }[]).map((f) =>
        f.bloqueado_hasta ? Date.parse(f.bloqueado_hasta) : null,
      );
    } catch (e) {
      console.error("[freno] consultar:", e instanceof Error ? e.message : e);
      return 0;
    }
  }
  const mayor = Math.max(0, ...hastas.map((h) => (h && h > ahora ? h - ahora : 0)));
  return Math.ceil(mayor / 1000);
}

/** Una ruta pública: cuenta el pedido y dice si ya se pasó del tope. */
export async function golpe(clave: string, politica: Politica): Promise<boolean> {
  const fila = await tocar(clave, politica.ventanaSeg);
  return fila !== null && fila.cuenta > politica.max;
}

/**
 * Un intento de login fallido sobre estas claves (la IP y el correo). Devuelve
 * los segundos de bloqueo que acaban de aplicarse (0 si todavía no toca).
 */
export async function fallo(claves: string[]): Promise<number> {
  let mayor = 0;
  for (const clave of claves) {
    const fila = await tocar(clave, VENTANA_LOGIN_SEG);
    if (!fila) continue;
    const seg = bloqueoPorFallos(fila.cuenta);
    if (seg > 0) {
      await bloquear(clave, seg);
      mayor = Math.max(mayor, seg);
    }
  }
  return mayor;
}

/** Entró bien: se olvida el historial de estas claves. */
export async function limpiar(claves: string[]): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    for (const c of claves) memoria.delete(c);
    return;
  }
  try {
    const { error } = await sb.from("frenos").delete().in("clave", claves);
    if (error) throw new Error(error.message);
  } catch (e) {
    console.error("[freno] limpiar:", e instanceof Error ? e.message : e);
  }
}

/** Desde dónde viene el pedido, como clave. Sin IP todos caen en la misma. */
export function claveIp(req: Request, ambito = "ip"): string {
  const xf = req.headers.get("x-forwarded-for");
  const ip = (xf ? xf.split(",")[0].trim() : req.headers.get("x-real-ip")) || "sin-ip";
  return `${ambito}:${ip}`;
}

export function claveCorreo(correo: string): string {
  return `correo:${correo.trim().toLowerCase()}`;
}

/** Cómo decirle a la persona cuánto esperar. */
export function textoEspera(segundos: number): string {
  if (segundos < 90) return "un minuto";
  if (segundos < 3600) return `${Math.ceil(segundos / 60)} minutos`;
  const horas = Math.ceil(segundos / 3600);
  return horas === 1 ? "una hora" : `${horas} horas`;
}

/** La respuesta de "demasiados intentos", con Retry-After para quien lo mire. */
export function respuestaBloqueado(segundos: number, cabeceras: Record<string, string> = {}): NextResponse {
  return NextResponse.json(
    { ok: false, error: `Demasiados intentos. Probá de nuevo en ${textoEspera(segundos)}.`, esperar: segundos },
    { status: 429, headers: { "retry-after": String(Math.max(1, segundos)), ...cabeceras } },
  );
}

/** Solo para pruebas. */
export function _vaciarFrenos(): void {
  memoria.clear();
}
