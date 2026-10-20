// Lo que paga un envío: flete por libra, IVA, DAI o tarifa fija, y los cargos
// de los términos. Puro.
//
// Sigue la calculadora de envío de shopusa.la: libras redondeadas hacia arriba
// a $4.99 hasta 5 y a $4.40 desde 6, IVA 13% sobre la factura, y si la factura
// pasa de $300 el DAI de su categoría (o la tarifa fija de los electrónicos,
// que va siempre desde $100). Cada impuesto se redondea al centavo y el total
// es la suma de lo que se muestra, para que el desglose siempre cuadre.
//
// Lo que su calculadora no hace y los términos sí dicen, también va aquí:
// los paquetes de un mismo cliente en la misma carga se pesan juntos (un solo
// flete), y se suman los cargos por prealerta tardía, traslado, domicilio y
// almacenaje.

import type { Etapa, Medidas, Paquete } from "./tipos";
import {
  ALMACENAJE_POR_SEMANA,
  CARGO_DOMICILIO,
  CARGO_TRASLADO,
  DIAS_SIN_ALMACENAJE,
  DIVISOR_VOLUMEN,
  IVA,
  LIBRAS_TRAMO,
  LIMITE_DAI,
  RECARGO_SIN_PREALERTA,
  TARIFA_DESDE_6,
  TARIFA_HASTA_5,
  VECES_VOLUMEN,
  categoriaDef,
} from "./catalogo";

const DIA_MS = 86_400_000;
const aCentavos = (usd: number) => Math.round(usd * 100);
const aDolares = (cent: number) => cent / 100;

/** (largo x alto x ancho en pulgadas) / 166, en libras. */
export function pesoVolumetrico(m: Medidas): number {
  return (m.largo * m.ancho * m.alto) / DIVISOR_VOLUMEN;
}

/** true si el volumen supera 3 veces el peso real: se cobra el promedio. */
export function cobraPorVolumen(pesoLb: number, medidas?: Medidas): boolean {
  return Boolean(medidas) && pesoVolumetrico(medidas as Medidas) > pesoLb * VECES_VOLUMEN;
}

/** El peso que se cobra: el real, o el promedio entre real y volumétrico. */
export function pesoCobrable(pesoLb: number, medidas?: Medidas): number {
  return cobraPorVolumen(pesoLb, medidas) ? (pesoLb + pesoVolumetrico(medidas as Medidas)) / 2 : pesoLb;
}

/** Libra o fracción, mínimo una. */
export function librasCobradas(peso: number): number {
  // Un decimal de ruido (2.0000001) no puede sumar una libra entera.
  const redondeado = Math.round(peso * 1000) / 1000;
  return Math.max(1, Math.ceil(redondeado));
}

/** $4.99 hasta 5 lb, $4.40 desde 6 lb. */
export function tarifaPorLibra(libras: number): number {
  return libras <= LIBRAS_TRAMO ? TARIFA_HASTA_5 : TARIFA_DESDE_6;
}

/** Flete: todas las libras al precio del tramo. */
export function fleteDe(libras: number): number {
  return aDolares(libras * aCentavos(tarifaPorLibra(libras)));
}

export function ivaDe(valor: number): number {
  return aDolares(Math.round(aCentavos(valor) * IVA));
}

export interface Arancel {
  /** "fija" = tarifa fija de electrónicos; "dai" = factura de más de $300. */
  tipo: "ninguno" | "dai" | "fija";
  monto: number;
  /** El porcentaje de DAI de la categoría. */
  pct?: number;
}

/** El DAI o la tarifa fija de una factura, como lo calcula su calculadora. */
export function arancelDe(valor: number, categoria: string): Arancel {
  const cat = categoriaDef(categoria);
  if (cat?.fija?.length) {
    const tramo = [...cat.fija].sort((a, b) => b.desde - a.desde).find((t) => valor >= t.desde);
    return tramo ? { tipo: "fija", monto: tramo.monto } : { tipo: "ninguno", monto: 0 };
  }
  if (cat && aCentavos(valor) > aCentavos(LIMITE_DAI) && cat.dai > 0) {
    return { tipo: "dai", monto: aDolares(Math.round(aCentavos(valor) * (cat.dai / 100))), pct: cat.dai };
  }
  return { tipo: "ninguno", monto: 0 };
}

/** true si la factura pasa de $300 (el límite para pagar solo IVA). */
export function pasaDe300(valor: number): boolean {
  return aCentavos(valor) > aCentavos(LIMITE_DAI);
}

/** Cuándo llegó a la bodega de Miami (la primera vez). */
export function llegadaAMiami(p: Paquete): string | undefined {
  return p.historial.find((e) => e.tipo === "miami")?.ts;
}

/** Llegó a Miami sin prealerta, o la prealerta llegó después: cargo de $1.50. */
export function sinPrealertaATiempo(p: Paquete): boolean {
  const llego = llegadaAMiami(p);
  if (!llego) return false;
  return !p.prealerta || p.prealerta.ts > llego;
}

/** Cuándo quedó listo para entregar (la última vez). */
export function listoDesde(p: Paquete): string | undefined {
  return [...p.historial].reverse().find((e) => e.tipo === "listo")?.ts;
}

/** Semanas de almacenaje: cada semana (o fracción) después de los 30 días. */
export function semanasDeAlmacenaje(desde: string | undefined, ahora: number): number {
  if (!desde) return 0;
  const dias = (ahora - Date.parse(desde)) / DIA_MS;
  return dias > DIAS_SIN_ALMACENAJE ? Math.ceil((dias - DIAS_SIN_ALMACENAJE) / 7) : 0;
}

const DESPUES_DE_ADUANA: readonly Etapa[] = ["listo", "entregado"];

/**
 * Los paquetes que se cobran juntos: los del mismo cliente en la misma carga
 * (se consolidan), que van en el mismo tramo de la línea. Si aduana detiene
 * uno, los demás salen y se cobran sin él.
 */
export function envioDe(p: Paquete, todos: readonly Paquete[]): Paquete[] {
  if (!p.cargaId) return [p];
  const despues = DESPUES_DE_ADUANA.includes(p.etapa);
  const grupo = todos.filter(
    (x) =>
      x.clienteId === p.clienteId &&
      x.cargaId === p.cargaId &&
      DESPUES_DE_ADUANA.includes(x.etapa) === despues &&
      (x.etapa !== "aduana" || Boolean(x.selectivo) === Boolean(p.selectivo)),
  );
  return grupo.length ? grupo.sort((a, b) => a.id.localeCompare(b.id)) : [p];
}

export interface LineaCobro {
  paquete: Paquete;
  pesoCobrable: number;
  porVolumen: boolean;
  iva: number;
  arancel: Arancel;
  /** $1.50 por llegar sin prealerta. */
  recargo: number;
  /** $2.50 por cambio de sucursal. */
  traslado: number;
}

export interface Cobro {
  /** Todos pesados en Miami: si no, el flete todavía no se sabe. */
  pesado: boolean;
  lineas: LineaCobro[];
  /** Más de un paquete del cliente en la misma carga: un solo flete. */
  consolidado: boolean;
  libras: number;
  precioLibra: number;
  flete: number;
  /** Lo que costaría el flete pesando cada paquete por separado. */
  fleteSeparado: number;
  ahorro: number;
  iva: number;
  arancel: number;
  impuestos: number;
  recargos: number;
  traslado: number;
  domicilio: number;
  semanasAlmacenaje: number;
  almacenaje: number;
  total: number;
}

/**
 * El cobro de un envío (uno o varios paquetes que se cobran juntos). `ahora`
 * cuenta el almacenaje de lo que lleva más de 30 días esperando.
 */
export function cobroDeEnvio(paquetes: readonly Paquete[], ahora?: number): Cobro {
  const lineas: LineaCobro[] = paquetes.map((p) => {
    const peso = p.pesoLb === undefined ? 0 : pesoCobrable(p.pesoLb, p.medidas);
    return {
      paquete: p,
      pesoCobrable: peso,
      porVolumen: p.pesoLb !== undefined && cobraPorVolumen(p.pesoLb, p.medidas),
      iva: ivaDe(p.valor),
      arancel: arancelDe(p.valor, p.categoria),
      recargo: sinPrealertaATiempo(p) ? RECARGO_SIN_PREALERTA : 0,
      traslado: p.traslado?.cobra ? CARGO_TRASLADO : 0,
    };
  });
  const pesado = paquetes.length > 0 && paquetes.every((p) => p.pesoLb !== undefined);
  const libras = pesado ? librasCobradas(lineas.reduce((n, l) => n + l.pesoCobrable, 0)) : 0;
  const flete = pesado ? fleteDe(libras) : 0;
  const fleteSeparadoCent = pesado ? lineas.reduce((n, l) => n + aCentavos(fleteDe(librasCobradas(l.pesoCobrable))), 0) : 0;

  const ivaCent = lineas.reduce((n, l) => n + aCentavos(l.iva), 0);
  const arancelCent = lineas.reduce((n, l) => n + aCentavos(l.arancel.monto), 0);
  const recargosCent = lineas.reduce((n, l) => n + aCentavos(l.recargo), 0);
  const trasladoCent = lineas.reduce((n, l) => n + aCentavos(l.traslado), 0);
  const casa = paquetes.find((p) => p.entrega.tipo === "domicilio")?.entrega;
  const domicilioCent = casa?.tipo === "domicilio" ? aCentavos(CARGO_DOMICILIO[casa.area]) : 0;

  const base = aCentavos(flete) + ivaCent + arancelCent + recargosCent + trasladoCent + domicilioCent;
  // El almacenaje corre para lo que sigue en la sucursal, desde el primero que quedó listo.
  const esperando = paquetes.every((p) => p.etapa === "listo");
  const desde = esperando ? paquetes.map(listoDesde).filter((x): x is string => Boolean(x)).sort()[0] : undefined;
  const semanas = ahora === undefined ? 0 : semanasDeAlmacenaje(desde, ahora);
  const almacenajeCent = Math.round(base * ALMACENAJE_POR_SEMANA * semanas);

  return {
    pesado,
    lineas,
    consolidado: paquetes.length > 1,
    libras,
    precioLibra: pesado ? tarifaPorLibra(libras) : 0,
    flete,
    fleteSeparado: aDolares(fleteSeparadoCent),
    ahorro: aDolares(Math.max(0, fleteSeparadoCent - aCentavos(flete))),
    iva: aDolares(ivaCent),
    arancel: aDolares(arancelCent),
    impuestos: aDolares(ivaCent + arancelCent),
    recargos: aDolares(recargosCent),
    traslado: aDolares(trasladoCent),
    domicilio: aDolares(domicilioCent),
    semanasAlmacenaje: semanas,
    almacenaje: aDolares(almacenajeCent),
    total: aDolares(base + almacenajeCent),
  };
}

/** El cobro del envío al que pertenece un paquete. */
export function cobroDe(p: Paquete, todos: readonly Paquete[], ahora?: number): Cobro {
  return cobroDeEnvio(envioDe(p, todos), ahora);
}

/** Lo que falta cobrar de lo listo para entregar, envío por envío (sin contar dos veces un flete). */
export function porCobrar(paquetes: readonly Paquete[], ahora?: number): number {
  const vistos = new Set<string>();
  let cent = 0;
  for (const p of paquetes) {
    if (p.etapa !== "listo" || p.pagado || vistos.has(p.id)) continue;
    const envio = envioDe(p, paquetes).filter((x) => x.etapa === "listo" && !x.pagado);
    for (const x of envio) vistos.add(x.id);
    cent += aCentavos(cobroDeEnvio(envio, ahora).total);
  }
  return aDolares(cent);
}

export interface Cotizacion {
  libras: number;
  precioLibra: number;
  flete: number;
  iva: number;
  arancel: Arancel;
  total: number;
}

/** Lo que diría su calculadora con un peso, un valor de factura y una categoría. */
export function cotizar(valor: number, categoria: string, pesoLb: number, medidas?: Medidas): Cotizacion {
  const libras = librasCobradas(pesoCobrable(pesoLb, medidas));
  const flete = fleteDe(libras);
  const iva = ivaDe(valor);
  const arancel = arancelDe(valor, categoria);
  return {
    libras,
    precioLibra: tarifaPorLibra(libras),
    flete,
    iva,
    arancel,
    total: aDolares(aCentavos(flete) + aCentavos(iva) + aCentavos(arancel.monto)),
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
