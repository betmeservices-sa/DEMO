// Lo que la llamada deja en el embudo de la sala de ventas.
//
// POR QUÉ EXISTE. La llamada guardaba el modelo en la memoria del agente y en
// la nota de la ficha, y el tablero de ventas no se enteraba: alguien decía por
// teléfono que anda viendo la Frontier y en el embudo no aparecía, o aparecía
// sin modelo y sin valor. El gerente proyecta con esos números, así que un caso
// sin modelo es plata que el tablero no cuenta.
//
// Es el gemelo de lib/ventas-llamada.ts, que hace lo mismo para el embudo de
// crédito. Son dos y no uno porque el vocabulario es distinto: allá la llamada
// existe para sacar el MONTO de la solicitud, acá para saber QUÉ CARRO quiere.
// La misma función sirviendo a los dos terminaría con banderas por tablero.
//
// EL MODELO SÍ SE PISA, y es a propósito. En crédito el monto no se toca si ya
// estaba, porque lo negocia el vendedor. Acá el modelo es lo que dijo el
// cliente, y quien acaba de hablar dijo algo más nuevo que lo que hubiera
// anotado: pregunta por la Frontier, ve la cuota y termina en Kicks. El cambio
// queda en la bitácora del caso, así que no se pierde lo anterior.

import { modeloDe } from "./autos-catalogo";
import { asegurarOportunidad, fijarModelo, marcarContactado } from "./autos-store";
import { vendedoresDe } from "./ventas-equipo";

export interface LlamadaEnEmbudo {
  /** Frase corta para la respuesta del webhook: qué quedó y qué no. */
  resumen: string;
  /** Lo que quedó guardado en el caso, o null si la llamada no nombró ninguno. */
  modelo: string | null;
}

/**
 * Nadie dice "X-Trail" a secas por teléfono: dice "la X-Trail".
 *
 * El catálogo compara contra el nombre pelado, así que el artículo bastaba para
 * que no reconociera nada y el caso quedara con una frase donde va un modelo.
 */
const ARTICULO = /^(?:la|el|los|las|un|una|unos|unas|mi)\s+/i;

/**
 * El modelo que nombró la llamada, como id del catálogo cuando se reconoce.
 *
 * Se prefiere el primero RECONOCIDO y no el primero dicho: el agente devuelve
 * todo lo que se habló ("un carro familiar", "la X-Trail"), y quedarse con el
 * primero dejaba el caso con una frase en vez de un modelo.
 *
 * LO QUE NO SE RECONOCE NO SE ADIVINA. "Frontier" son dos modelos distintos en
 * el catálogo (Doble Cabina y Cabina Simple) con $5.000 de diferencia; elegir
 * uno sería inventarle al caso una versión que nadie dijo, y encima moverle la
 * proyección al gerente. Se guarda tal como lo dijo, la pantalla lo muestra
 * así, y el vendedor lo precisa cuando hable con la persona.
 */
export function modeloDicho(modelos?: string[]): string | null {
  const dichos = (modelos ?? [])
    .map((m) => m.trim().replace(ARTICULO, "").trim())
    .filter(Boolean);
  for (const d of dichos) {
    const m = modeloDe(d);
    if (m) return m.id;
  }
  return dichos[0] ?? null;
}

/** Si son el mismo, sin pelearse por mayúsculas ni por el artículo. */
function mismoModelo(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

/**
 * Mete la llamada al embudo y le deja el modelo.
 *
 * Nunca tira: si el embudo falla, la llamada ya pasó y la memoria y la ficha se
 * guardaron igual. Quien llama decide qué hacer con el resumen.
 */
export async function anotarLlamadaEnEmbudo(opciones: {
  tenant: string;
  telefono: string;
  nombre?: string | null;
  modelos?: string[];
  actor?: string;
}): Promise<LlamadaEnEmbudo> {
  const { tenant, telefono } = opciones;
  const actor = opciones.actor ?? "llamada";
  const modelo = modeloDicho(opciones.modelos);
  const nombre = opciones.nombre?.trim() || undefined;

  // Si la persona nunca pasó por el CSV ni escribió, la llamada la mete al
  // embudo, con dueño y todo: un caso sin vendedor no sale en las barras por
  // vendedor ni cuenta para los plazos, o sea que existe y no lo ve nadie.
  const previa = await asegurarOportunidad(tenant, telefono, { nombre, modelo }, vendedoresDe(tenant));

  const cambios: string[] = [];

  // `asegurarOportunidad` solo escribe el modelo cuando CREA el caso. Si ya
  // existía, hay que ponerlo acá, y de paso esto es lo que le pone el precio de
  // lista al caso que venía en cero.
  if (modelo && !mismoModelo(previa.modelo, modelo)) {
    await fijarModelo(tenant, telefono, modelo, actor);
    cambios.push(`modelo ${modeloDe(modelo)?.nombre ?? modelo}`);
  }

  // La llamada ES el primer contacto. Es idempotente: una segunda llamada no
  // mueve la fecha.
  await marcarContactado(tenant, telefono, actor);

  const resumen =
    cambios.length > 0
      ? `anotado en el embudo: ${cambios.join(" · ")}`
      : modelo
        ? "el caso ya tenía ese modelo"
        : "la llamada no nombró ningún modelo";

  return { resumen, modelo };
}
