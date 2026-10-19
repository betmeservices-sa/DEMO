// Lo que paga un paquete: envío por libra e IVA de aduana. Puro.
//
// Sigue la calculadora publicada en exs.sv/cotizar al centavo: trabaja en
// centavos y redondea cada componente por separado (flete, seguro, CIF, IVA),
// como su script, para que el total del panel sea el mismo que el cliente ve
// en la página.

import type { Medidas, Paquete } from "./tipos";
import {
  DIVISOR_VOLUMEN,
  FLETE_ADUANA,
  HOLGURA_VOLUMEN,
  IVA,
  LIMITE_VUELO,
  SEGURO_ADUANA,
  TARIFAS,
} from "./catalogo";

const aCentavos = (usd: number) => Math.round(usd * 100);
const aDolares = (cent: number) => cent / 100;

/** (largo x ancho x alto en pulgadas) / 166, en libras. */
export function pesoVolumetrico(m: Medidas): number {
  return (m.largo * m.ancho * m.alto) / DIVISOR_VOLUMEN;
}

/**
 * Libras que se cobran: enteras ("libra o fracción"), mínimo 1. Si el
 * volumen excede el peso real en más de 30%, se cobra el volumen.
 */
export function librasCobradas(pesoLb: number, medidas?: Medidas): number {
  let base = pesoLb;
  if (medidas) {
    const vol = pesoVolumetrico(medidas);
    if (vol > pesoLb * HOLGURA_VOLUMEN) base = vol;
  }
  // Un decimal de ruido (2.0000001) no puede sumar una libra entera.
  const redondeado = Math.round(base * 1000) / 1000;
  return Math.max(1, Math.ceil(redondeado));
}

/** true si se le cobra por volumen y no por peso. */
export function cobraPorVolumen(pesoLb: number, medidas?: Medidas): boolean {
  return Boolean(medidas) && pesoVolumetrico(medidas as Medidas) > pesoLb * HOLGURA_VOLUMEN;
}

/** Precio por libra del tramo que corresponde a ese peso. */
export function precioPorLibra(libras: number): number {
  let precio = TARIFAS[0].precio;
  for (const t of TARIFAS) if (libras >= t.desde) precio = t.precio;
  return precio;
}

/** Envío: todas las libras al precio del tramo. */
export function costoEnvio(libras: number): number {
  return aDolares(libras * aCentavos(precioPorLibra(libras)));
}

export interface Impuesto {
  flete: number;
  seguro: number;
  cif: number;
  iva: number;
}

/** IVA 13% sobre el CIF: precio + 10% de flete + 1.5% de seguro. */
export function impuestoDe(valor: number): Impuesto {
  const precio = aCentavos(valor);
  const flete = Math.round(precio * FLETE_ADUANA);
  const seguro = Math.round(precio * SEGURO_ADUANA);
  const cif = precio + flete + seguro;
  const iva = Math.round(cif * IVA);
  return { flete: aDolares(flete), seguro: aDolares(seguro), cif: aDolares(cif), iva: aDolares(iva) };
}

/** true si lo que el cliente trae en un vuelo ya no entra en el beneficio. */
export function pasaElLimite(totalDelVuelo: number): boolean {
  return aCentavos(totalDelVuelo) >= aCentavos(LIMITE_VUELO);
}

export interface Cobro {
  /** Sin pesar todavía (prealertado): no hay envío que calcular. */
  pesado: boolean;
  libras: number;
  porVolumen: boolean;
  precioLibra: number;
  envio: number;
  impuesto: Impuesto;
  /** El cliente pasa de $300 en ese vuelo: aduana liquida IVA + DAI. */
  conDai: boolean;
  /** Envío + IVA. Con DAI, falta lo que liquide aduana. */
  total: number;
}

/**
 * El cobro de un paquete. `totalDelVuelo` es lo que el mismo cliente trae en
 * ese vuelo, este paquete incluido: el beneficio de los $300 es por vuelo.
 */
export function cobroDe(p: Pick<Paquete, "valor" | "pesoLb" | "medidas">, totalDelVuelo = p.valor): Cobro {
  const impuesto = impuestoDe(p.valor);
  const conDai = pasaElLimite(totalDelVuelo);
  if (p.pesoLb === undefined) {
    return { pesado: false, libras: 0, porVolumen: false, precioLibra: 0, envio: 0, impuesto, conDai, total: 0 };
  }
  const libras = librasCobradas(p.pesoLb, p.medidas);
  const envio = costoEnvio(libras);
  return {
    pesado: true,
    libras,
    porVolumen: cobraPorVolumen(p.pesoLb, p.medidas),
    precioLibra: precioPorLibra(libras),
    envio,
    impuesto,
    conDai,
    total: aDolares(aCentavos(envio) + aCentavos(impuesto.iva)),
  };
}

/** "$1,234.50" */
export function dinero(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "2.4 lb" / "12 lb" */
export function libras(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${Number.isInteger(r) ? r : r.toFixed(1)} lb`;
}
