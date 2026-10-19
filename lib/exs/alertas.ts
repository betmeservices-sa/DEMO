// Lo que necesita a alguien hoy. Puro.
//
// Cuatro cosas que en un casillero se escapan si nadie las mira:
//   - lo que aduana retuvo (sin la factura no sale),
//   - lo que llegó a Miami sin prealerta (no se puede declarar ni mandar),
//   - lo que está por cumplir 30 días sin retirar (pasa a abandono),
//   - el cliente que pasa de $300 en un vuelo que todavía no sale: con un
//     paquete menos en ese vuelo paga solo IVA, y eso hay que decírselo antes
//     del corte, no cuando ya aterrizó.

import type { Cliente, Paquete, Vuelo } from "./tipos";
import { DIAS_AVISO_ABANDONO, LIMITE_VUELO } from "./catalogo";
import { limiteDeRetiro } from "./avisos";

const DIA_MS = 86_400_000;

export interface SobreLimite {
  vuelo: Vuelo;
  cliente: Cliente;
  total: number;
  paquetes: Paquete[];
  /** El paquete que conviene pasar al siguiente vuelo: el de menor valor que lo deja bajo $300. */
  sugerido?: Paquete;
}

export interface Alertas {
  retenidos: Paquete[];
  sinPrealerta: Paquete[];
  porVencer: { paquete: Paquete; dias: number; limite: string }[];
  sobreLimite: SobreLimite[];
}

export function alertasDe(
  paquetes: readonly Paquete[],
  clientes: readonly Cliente[],
  vuelos: readonly Vuelo[],
  ahora: number,
): Alertas {
  const retenidos = paquetes.filter((p) => p.etapa === "aduana" && p.retenido);
  const sinPrealerta = paquetes.filter((p) => p.etapa === "miami" && !p.prealerta);

  const porVencer = paquetes
    .filter((p) => p.etapa === "listo")
    .map((p) => {
      const limite = limiteDeRetiro(p);
      const dias = limite ? Math.ceil((Date.parse(limite) - ahora) / DIA_MS) : Infinity;
      return { paquete: p, dias, limite: limite ?? "" };
    })
    .filter((x) => x.limite && x.dias <= DIAS_AVISO_ABANDONO)
    .sort((a, b) => a.dias - b.dias);

  const sobreLimite: SobreLimite[] = [];
  for (const v of vuelos.filter((x) => x.estado === "programado")) {
    const delVuelo = paquetes.filter((p) => p.vueloId === v.id && p.etapa === "miami");
    const porCliente = new Map<string, Paquete[]>();
    for (const p of delVuelo) porCliente.set(p.clienteId, [...(porCliente.get(p.clienteId) ?? []), p]);
    for (const [clienteId, ps] of porCliente) {
      const totalCent = ps.reduce((n, p) => n + Math.round(p.valor * 100), 0);
      if (totalCent < LIMITE_VUELO * 100) continue;
      const cliente = clientes.find((c) => c.id === clienteId);
      if (!cliente) continue;
      const sugerido = [...ps]
        .sort((a, b) => a.valor - b.valor)
        .find((p) => totalCent - Math.round(p.valor * 100) < LIMITE_VUELO * 100);
      sobreLimite.push({ vuelo: v, cliente, total: totalCent / 100, paquetes: ps, sugerido });
    }
  }

  return { retenidos, sinPrealerta, porVencer, sobreLimite };
}

export type TipoAlerta = "retenido" | "sin_prealerta" | "vence" | "limite";

export interface AlertaPaquete {
  tipo: TipoAlerta;
  texto: string;
}

/** Las alertas de un paquete, para su tarjeta y su ficha. */
export function alertasDelPaquete(p: Paquete, a: Alertas): AlertaPaquete[] {
  const out: AlertaPaquete[] = [];
  if (p.etapa === "aduana" && p.retenido) out.push({ tipo: "retenido", texto: "Retenido" });
  if (p.etapa === "miami" && !p.prealerta) out.push({ tipo: "sin_prealerta", texto: "Sin prealerta" });
  const vence = a.porVencer.find((x) => x.paquete.id === p.id);
  if (vence) out.push({ tipo: "vence", texto: vence.dias <= 0 ? "Vence hoy" : `Vence en ${vence.dias} ${vence.dias === 1 ? "día" : "días"}` });
  if (a.sobreLimite.some((s) => s.paquetes.some((x) => x.id === p.id))) out.push({ tipo: "limite", texto: "Pasa de $300" });
  return out;
}

export function cuantasAlertas(a: Alertas): number {
  return a.retenidos.length + a.sinPrealerta.length + a.porVencer.length + a.sobreLimite.length;
}

/** El vuelo programado que sale después de este (para pasarle un paquete). */
export function siguienteVuelo(vuelos: readonly Vuelo[], vueloId: string): Vuelo | undefined {
  const actual = vuelos.find((v) => v.id === vueloId);
  if (!actual) return undefined;
  return [...vuelos]
    .filter((v) => v.estado === "programado" && v.sale > actual.sale)
    .sort((a, b) => a.sale.localeCompare(b.sale))[0];
}

/** El próximo vuelo que todavía no sale. */
export function proximoVuelo(vuelos: readonly Vuelo[]): Vuelo | undefined {
  return [...vuelos].filter((v) => v.estado === "programado").sort((a, b) => a.sale.localeCompare(b.sale))[0];
}

/** El que va en el aire, si hay. */
export function vueloEnElAire(vuelos: readonly Vuelo[]): Vuelo | undefined {
  return vuelos.find((v) => v.estado === "en_vuelo");
}
