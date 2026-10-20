// Lo que necesita a alguien hoy, y lo que conviene saber de un paquete. Puro.
//
// Tres cosas que en ShopUSA se escapan si nadie las mira:
//   - lo que tiene selectivo rojo en aduana (sin la factura no sale),
//   - lo que llegó a Miami sin prealerta (sin factura, Aduana lo valora con
//     precios de referencia, y lleva cargo de $1.50),
//   - lo que lleva casi 30 días sin retirarse (después cobra 10% por semana de
//     almacenaje, y a los 60 días cae en abandono).
// Aparte, las etiquetas que explican su cobro: si paga DAI, si lleva tarifa
// fija, si va consolidado con otros paquetes del cliente.

import type { Carga, Paquete } from "./tipos";
import { DIAS_AVISO_ALMACENAJE } from "./catalogo";
import { arancelDe, dinero, envioDe, listoDesde, semanasDeAlmacenaje } from "./cobro";
import { fechaDeAbandono, limiteSinAlmacenaje } from "./avisos";

const DIA_MS = 86_400_000;

export interface EnSucursal {
  paquete: Paquete;
  /** "por_vencer" = todavía sin costo; "cobrando" = ya corre el almacenaje. */
  estado: "por_vencer" | "cobrando";
  /** Días que faltan para el almacenaje (por_vencer) o para el abandono (cobrando). */
  dias: number;
  semanas: number;
  limite: string;
  abandono: string;
}

export interface Alertas {
  selectivos: Paquete[];
  sinPrealerta: Paquete[];
  almacenaje: EnSucursal[];
}

export function alertasDe(paquetes: readonly Paquete[], ahora: number): Alertas {
  const selectivos = paquetes.filter((p) => p.etapa === "aduana" && p.selectivo);
  const sinPrealerta = paquetes.filter((p) => p.etapa === "miami" && !p.prealerta);

  const almacenaje: EnSucursal[] = [];
  for (const p of paquetes) {
    if (p.etapa !== "listo") continue;
    const limite = limiteSinAlmacenaje(p);
    const abandono = fechaDeAbandono(p);
    if (!limite || !abandono) continue;
    const semanas = semanasDeAlmacenaje(listoDesde(p), ahora);
    if (semanas > 0) {
      almacenaje.push({ paquete: p, estado: "cobrando", dias: Math.ceil((Date.parse(abandono) - ahora) / DIA_MS), semanas, limite, abandono });
      continue;
    }
    const dias = Math.ceil((Date.parse(limite) - ahora) / DIA_MS);
    if (dias <= DIAS_AVISO_ALMACENAJE) almacenaje.push({ paquete: p, estado: "por_vencer", dias, semanas: 0, limite, abandono });
  }
  almacenaje.sort((a, b) => (a.estado === b.estado ? a.dias - b.dias : a.estado === "cobrando" ? -1 : 1));

  return { selectivos, sinPrealerta, almacenaje };
}

export type TipoAlerta = "selectivo" | "sin_prealerta" | "almacenaje";

export interface AlertaPaquete {
  tipo: TipoAlerta;
  texto: string;
}

function dias(n: number): string {
  return `${n} ${n === 1 ? "día" : "días"}`;
}

/** Lo que dice el chip de almacenaje. */
export function textoAlmacenaje(x: EnSucursal): string {
  if (x.estado === "cobrando") return `Almacenaje: ${x.semanas} ${x.semanas === 1 ? "semana" : "semanas"}`;
  return x.dias <= 0 ? "Almacenaje desde hoy" : `Almacenaje en ${dias(x.dias)}`;
}

/** Las alertas de un paquete, para su tarjeta y su ficha. */
export function alertasDelPaquete(p: Paquete, a: Alertas): AlertaPaquete[] {
  const out: AlertaPaquete[] = [];
  if (p.etapa === "aduana" && p.selectivo) out.push({ tipo: "selectivo", texto: "Selectivo rojo" });
  if (p.etapa === "miami" && !p.prealerta) out.push({ tipo: "sin_prealerta", texto: "Sin prealerta" });
  const x = a.almacenaje.find((y) => y.paquete.id === p.id);
  if (x) out.push({ tipo: "almacenaje", texto: textoAlmacenaje(x) });
  return out;
}

export function cuantasAlertas(a: Alertas): number {
  return a.selectivos.length + a.sinPrealerta.length + a.almacenaje.length;
}

export type TipoEtiqueta = "dai" | "fija" | "consolidado";

export interface EtiquetaPaquete {
  tipo: TipoEtiqueta;
  texto: string;
}

/** Lo que explica su cobro, sin ser urgente: DAI, tarifa fija, consolidado. */
export function etiquetasDelPaquete(p: Paquete, todos: readonly Paquete[]): EtiquetaPaquete[] {
  const out: EtiquetaPaquete[] = [];
  const a = arancelDe(p.valor, p.categoria);
  if (a.tipo === "dai") out.push({ tipo: "dai", texto: `DAI ${a.pct}%` });
  if (a.tipo === "fija") out.push({ tipo: "fija", texto: `Tarifa fija ${dinero(a.monto)}` });
  if (p.etapa !== "entregado" && envioDe(p, todos).length > 1) out.push({ tipo: "consolidado", texto: "Consolidado" });
  return out;
}

/** La próxima carga que todavía no sale. */
export function proximaCarga(cargas: readonly Carga[]): Carga | undefined {
  return [...cargas].filter((c) => c.estado === "programada").sort((a, b) => a.sale.localeCompare(b.sale))[0];
}

/** La que va en el aire, si hay. */
export function cargaEnTransito(cargas: readonly Carga[]): Carga | undefined {
  return cargas.find((c) => c.estado === "en_transito");
}
