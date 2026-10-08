import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// El tipo de SupabaseClient lleva el esquema como parametro, y por defecto es
// "public". Como aca el esquema se decide en tiempo de ejecucion, se afloja ese
// parametro: si no, TypeScript rechaza al cliente de yali por no ser "public".
type Cliente = SupabaseClient<any, any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// Cliente de Supabase (server-side). Usa la publishable key. Si no hay env de
// Supabase, devuelve null y el resto del código cae al store en memoria.
//
// ── POR QUÉ RECIBE EL TENANT ──
// Cada cliente puede vivir en tres lugares: el esquema `public` del proyecto
// compartido (los demos), un esquema propio dentro del compartido (lo que fue
// Yali antes de mudarse), o su PROPIO proyecto de Supabase (ver abajo). Quien
// llama no tiene que saber cuál: pide el cliente de ese tenant y ya.
//
// Si el esquema no está en "Exposed schemas" de Supabase, PostgREST no lo ve y
// devuelve CERO FILAS SIN ERROR. Por eso los stores tienen su latch de "estoy
// cayendo a memoria": es la única señal de que pasó.

/** Qué clientes leen de un esquema propio. El resto sigue en public. */
const ESQUEMA_POR_TENANT: Record<string, string> = {
  yaly: "yali",
};

const cache = new Map<string, Cliente | null>();

export function esquemaDeTenant(tenant?: string): string {
  return (tenant && ESQUEMA_POR_TENANT[tenant]) || "public";
}

/**
 * Clientes que viven en su PROPIO proyecto de Supabase. Dos modos:
 *
 * - `escribe`: este panel es su app. Lee y escribe con la llave secreta del
 *   proyecto, por las variables `SUPABASE_URL__<TENANT>` y
 *   `SUPABASE_SECRET_KEY__<TENANT>` (el tenant en mayúsculas). Así se mudó el
 *   hospital el 2026-10-08: sus conversaciones dejaron de compartir tabla con
 *   los demos. Sin las dos variables, el cliente sigue en el compartido.
 *
 * - solo lectura: su app es otra (Yali vive en hub.miagentia.com). Desde aquí
 *   el tablero de la agencia lo lee con el rol `lector_agencia`: ve sus
 *   números, pero no puede escribirle ni ver sus tokens ni contraseñas.
 */
interface ProyectoPropio {
  url: string;
  key: string;
  jwt?: string;
  escribe: boolean;
}

const PREFIJO_URL = "SUPABASE_URL__";

function sufijoEnv(tenant: string): string {
  return tenant.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

function proyectoPropio(tenant?: string): ProyectoPropio | null {
  if (!tenant) return null;
  const url = process.env[`${PREFIJO_URL}${sufijoEnv(tenant)}`];
  const key = process.env[`SUPABASE_SECRET_KEY__${sufijoEnv(tenant)}`];
  if (url && key) return { url, key, escribe: true };
  if (tenant === "yaly") {
    const url = process.env.YALI_SUPABASE_URL;
    const key = process.env.YALI_SUPABASE_PUBLISHABLE_KEY;
    const jwt = process.env.YALI_SUPABASE_LECTOR_JWT;
    return url && key && jwt ? { url, key, jwt, escribe: false } : null;
  }
  return null;
}

function clienteDeProyectoPropio(tenant: string, esquema: string): Cliente | null {
  const p = proyectoPropio(tenant);
  if (!p) return null;
  const clave = `${tenant}@${esquema}`;
  const guardado = cache.get(clave);
  if (guardado) return guardado;
  const cliente = createClient(p.url, p.key, {
    auth: { persistSession: false },
    db: { schema: esquema },
    ...(p.jwt ? { global: { headers: { Authorization: `Bearer ${p.jwt}` } } } : {}),
  });
  cache.set(clave, cliente);
  return cliente;
}

/** Los tenants con proyecto propio, para excluir sus filas viejas del compartido. */
export function tenantsConProyectoPropio(): string[] {
  const porEnv = Object.keys(process.env)
    .filter((k) => k.startsWith(PREFIJO_URL))
    .map((k) => k.slice(PREFIJO_URL.length).toLowerCase());
  const candidatos = new Set([...porEnv, ...Object.keys(ESQUEMA_POR_TENANT)]);
  return [...candidatos].filter((t) => proyectoPropio(t));
}

/** Los que este panel atiende (lee y escribe) desde su propio proyecto. */
export function tenantsConProyectoEscribible(): string[] {
  return tenantsConProyectoPropio().filter((t) => proyectoPropio(t)?.escribe);
}

/** El `public` del proyecto propio de un cliente (accesos, actividad). */
export function publicoDeProyectoPropio(tenant: string): Cliente | null {
  return clienteDeProyectoPropio(tenant, "public");
}

/**
 * Donde ESCRIBIR lo de un cliente que no lleva tenant en la consulta (accesos,
 * actividad): su propio proyecto si este panel lo atiende, si no null y quien
 * llama usa el compartido.
 */
export function publicoDeProyectoEscribible(tenant: string): Cliente | null {
  return proyectoPropio(tenant)?.escribe ? clienteDeProyectoPropio(tenant, "public") : null;
}

export function getSupabase(tenant?: string): Cliente | null {
  const esquema = esquemaDeTenant(tenant);
  if (tenant && proyectoPropio(tenant)) return clienteDeProyectoPropio(tenant, esquema);
  const guardado = cache.get(esquema);
  if (guardado !== undefined) return guardado;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const cliente =
    url && key
      ? createClient(url, key, {
          auth: { persistSession: false },
          db: { schema: esquema },
        })
      : null;
  cache.set(esquema, cliente);
  return cliente;
}

/**
 * Un cliente por cada lugar donde puede vivir un tenant que este panel atiende.
 *
 * Lo necesita el webhook: cuando entra un mensaje sabemos el numero o la
 * pagina a la que llego, no de que cliente es. Averiguarlo es justamente el
 * motivo de la consulta, asi que hay que buscar en todos lados. Es la
 * excepcion, no la regla: el resto del codigo ya sabe con quien esta hablando.
 */
export function todosLosClientes(): Cliente[] {
  const esquemas = ["public", ...new Set(Object.values(ESQUEMA_POR_TENANT))];
  const out: Cliente[] = [];
  for (const e of esquemas) {
    // Un cliente de solo lectura no se atiende desde aquí: su webhook es de su
    // app, y este lado solo lo mira.
    if (proyectoPropio(inversa(e))) continue;
    const c = getSupabase(inversa(e));
    if (c) out.push(c);
  }
  // Los que viven en su propio proyecto pero cuyo webhook cae ACÁ (el
  // hospital): si no entraran, su numero no se encontraria y el mensaje caeria
  // en el cliente del interruptor global.
  for (const t of tenantsConProyectoEscribible()) {
    const c = getSupabase(t);
    if (c) out.push(c);
  }
  return out;
}

/** Solo para pruebas: olvida los clientes creados. */
export function olvidarClientesSupabase(): void {
  cache.clear();
}

/** El tenant de un esquema, para poder pedir su cliente. */
function inversa(esquema: string): string | undefined {
  if (esquema === "public") return undefined;
  return Object.keys(ESQUEMA_POR_TENANT).find((t) => ESQUEMA_POR_TENANT[t] === esquema);
}
