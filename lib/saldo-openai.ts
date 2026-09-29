// El saldo de la cuenta de OpenAI con la que corre luna (el modelo de Sofía).
//
// OpenAI NO da el saldo prepagado por API: /dashboard/billing/credit_grants
// solo acepta la sesión del navegador (probado el 2026-09-29, 403 con llave
// secreta y con llave de admin). Lo que sí da, con una llave de ADMIN, es lo
// gastado por día (/v1/organization/costs). Entonces:
//
//   saldo = lo que se cargó (OPENAI_CREDITO_CARGADO, USD)
//           - lo gastado desde esa carga (OPENAI_CREDITO_DESDE, AAAA-MM-DD, El Salvador)
//
// Sin esas dos variables no se inventa un saldo: se muestra solo el gasto.
// Al recargar hay que actualizar las dos.
//
// Los costos de OpenAI llegan con uno o dos días de atraso y por día UTC; es
// la cifra oficial de cobro, no la de nuestros tokens.

import { inicioDeMes, medianocheSV } from "./periodos";

const URL_COSTOS = "https://api.openai.com/v1/organization/costs";

export interface SaldoOpenai {
  /** Gastado desde el día 1 del mes en curso (El Salvador). */
  gastoMes: number;
  /** Gastado desde la última carga; null si no está configurada. */
  gastoDesdeCarga: number | null;
  cargado: number | null;
  cargadoDesde: string | null;
  /** Lo que queda; null si no se sabe cuánto se cargó. */
  saldo: number | null;
  /** Promedio diario de los últimos 7 días, para estimar cuánto alcanza. */
  promedioDiario: number;
}

interface Bucket {
  start_time: number;
  results: { amount?: { value?: number } }[];
}

async function costosDesde(llave: string, desdeMs: number): Promise<Bucket[]> {
  const out: Bucket[] = [];
  let pagina: string | null = null;
  do {
    const q = new URLSearchParams({ start_time: String(Math.floor(desdeMs / 1000)), bucket_width: "1d", limit: "180" });
    if (pagina) q.set("page", pagina);
    const r = await fetch(`${URL_COSTOS}?${q}`, { headers: { Authorization: `Bearer ${llave}` }, cache: "no-store" });
    const j = (await r.json()) as { data?: Bucket[]; has_more?: boolean; next_page?: string | null; error?: { message?: string } };
    if (!r.ok) throw new Error(j.error?.message ?? `OpenAI respondió ${r.status}`);
    out.push(...(j.data ?? []));
    pagina = j.has_more ? (j.next_page ?? null) : null;
  } while (pagina);
  return out;
}

const suma = (bs: readonly Bucket[], desdeMs = 0) =>
  bs
    .filter((b) => b.start_time * 1000 >= desdeMs)
    .reduce((s, b) => s + b.results.reduce((t, x) => t + (x.amount?.value ?? 0), 0), 0);

const redondear = (n: number) => Math.round(n * 100) / 100;

/** "2026-09-22" (El Salvador) → ms UTC de esa medianoche. */
function medianocheDe(fecha: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha.trim());
  return m ? medianocheSV(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export async function saldoOpenai(ahora: Date = new Date()): Promise<SaldoOpenai | null> {
  const llave = process.env.OPENAI_ADMIN_KEY;
  if (!llave) return null;
  const cargado = Number(process.env.OPENAI_CREDITO_CARGADO);
  const desdeCarga = medianocheDe(process.env.OPENAI_CREDITO_DESDE ?? "");
  const hayCarga = Number.isFinite(cargado) && cargado > 0 && desdeCarga !== null;

  const t = ahora.getTime();
  const inicioMes = inicioDeMes(t);
  const hace7 = t - 7 * 86_400_000;
  // Se lee desde lo más viejo que haga falta, en una sola pasada.
  const buckets = await costosDesde(llave, Math.min(inicioMes, hace7, hayCarga ? desdeCarga! : Infinity));

  const gastoDesdeCarga = hayCarga ? redondear(suma(buckets, desdeCarga!)) : null;
  return {
    gastoMes: redondear(suma(buckets, inicioMes)),
    gastoDesdeCarga,
    cargado: hayCarga ? cargado : null,
    cargadoDesde: hayCarga ? process.env.OPENAI_CREDITO_DESDE!.trim() : null,
    saldo: hayCarga ? redondear(cargado - gastoDesdeCarga!) : null,
    promedioDiario: redondear(suma(buckets, hace7) / 7),
  };
}
