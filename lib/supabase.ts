import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// El tipo de SupabaseClient lleva el esquema como parametro, y por defecto es
// "public". Como aca el esquema se decide en tiempo de ejecucion, se afloja ese
// parametro: si no, TypeScript rechaza al cliente de yali por no ser "public".
type Cliente = SupabaseClient<any, any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// Cliente de Supabase (server-side). Usa la publishable key. Si no hay env de
// Supabase, devuelve null y el resto del código cae al store en memoria.
//
// ── POR QUÉ RECIBE EL TENANT ──
// Yali tiene sus tablas en un esquema propio dentro del MISMO proyecto. No es
// aislamiento de verdad (la app entra con una sola llave para todos, así que
// esa llave alcanza los dos esquemas): es organización, y es el paso previo a
// mudarlo a su propio proyecto. Lo que se gana hoy es que las conversaciones de
// huéspedes reales dejan de vivir en la misma tabla que las de los demos, y que
// el día de la mudanza se lleva un esquema entero en vez de filtrar fila por
// fila.
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
 * Clientes que ya viven en su PROPIO proyecto de Supabase. Desde aquí se leen
 * con un rol de solo lectura (`lector_agencia`): el tablero de la agencia ve
 * sus números, pero no puede escribirles ni ver sus tokens ni contraseñas.
 * Sin las tres variables, el cliente sigue leyéndose del proyecto compartido.
 */
function proyectoPropio(tenant?: string): { url: string; key: string; jwt: string } | null {
  if (tenant !== "yaly") return null;
  const url = process.env.YALI_SUPABASE_URL;
  const key = process.env.YALI_SUPABASE_PUBLISHABLE_KEY;
  const jwt = process.env.YALI_SUPABASE_LECTOR_JWT;
  return url && key && jwt ? { url, key, jwt } : null;
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
    global: { headers: { Authorization: `Bearer ${p.jwt}` } },
  });
  cache.set(clave, cliente);
  return cliente;
}

/** Los tenants con proyecto propio, para excluir sus filas viejas del compartido. */
export function tenantsConProyectoPropio(): string[] {
  return Object.keys(ESQUEMA_POR_TENANT).filter((t) => proyectoPropio(t));
}

/** El `public` del proyecto propio de un cliente (accesos, actividad). */
export function publicoDeProyectoPropio(tenant: string): Cliente | null {
  return clienteDeProyectoPropio(tenant, "public");
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
 * Un cliente por cada esquema que exista, empezando por public.
 *
 * Lo necesita el webhook de Meta: cuando entra un mensaje sabemos el id de la
 * pagina, no de que cliente es. Averiguarlo es justamente el motivo de la
 * consulta, asi que hay que buscar en todos lados. Es la excepcion, no la
 * regla: el resto del codigo ya sabe con quien esta hablando.
 */
export function todosLosClientes(): Cliente[] {
  const esquemas = ["public", ...new Set(Object.values(ESQUEMA_POR_TENANT))];
  const out: Cliente[] = [];
  for (const e of esquemas) {
    // Un cliente con proyecto propio no se atiende desde aquí: su webhook es
    // de su app, y este lado solo lo lee.
    if (proyectoPropio(inversa(e))) continue;
    const c = getSupabase(inversa(e));
    if (c) out.push(c);
  }
  return out;
}

/** El tenant de un esquema, para poder pedir su cliente. */
function inversa(esquema: string): string | undefined {
  if (esquema === "public") return undefined;
  return Object.keys(ESQUEMA_POR_TENANT).find((t) => ESQUEMA_POR_TENANT[t] === esquema);
}
