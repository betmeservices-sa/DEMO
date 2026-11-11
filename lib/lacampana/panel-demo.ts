// Las cifras del panel de La Campana. TODAS SON DE DEMOSTRACIÓN.
//
// No hay POS ni sistema de pedidos conectado: los números salen de un
// generador con semilla fija, así el panel se ve igual cada vez que se abre
// (y no cambia entre una recarga y otra en medio de la presentación). Los
// platos, precios y sucursales sí son los reales del sitio del cliente.

import { MENU, platoPorId } from "./menu";
import { SUCURSALES_CAMPANA } from "./sucursales";

export type PeriodoCampana = 1 | 7 | 30;

export const PERIODOS_CAMPANA: Array<{ dias: PeriodoCampana; nombre: string }> = [
  { dias: 1, nombre: "Hoy" },
  { dias: 7, nombre: "7 días" },
  { dias: 30, nombre: "30 días" },
];

export interface PanelCampana {
  pedidos: number;
  ventas: number;
  ticketPromedio: number;
  /** Porcentaje de conversaciones que Sofía cerró sin pasar a una persona. */
  resueltasPorIa: number;
  /** Mediana del primer mensaje de respuesta, en segundos. */
  respuestaSeg: number;
  deltaPedidos: number;
  deltaVentas: number;
  porHora: Array<{ hora: string; pedidos: number }>;
  porSucursal: Array<{ id: string; nombre: string; ventas: number; pedidos: number }>;
  topPlatos: Array<{ id: string; nombre: string; foto?: string; unidades: number; ventas: number }>;
  porCanal: Array<{ canal: string; pedidos: number }>;
  motivos: Array<{ motivo: string; conversaciones: number }>;
  entrega: { domicilio: number; retiro: number };
}

// Generador con semilla (mulberry32): mismo número de entrada, misma serie.
function semilla(n: number) {
  return () => {
    n |= 0;
    n = (n + 0x6d2b79f5) | 0;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cuánto pesa cada sucursal en las ventas. Las de centro comercial grande
// venden más; es una forma creíble, no un dato del cliente.
const PESO_SUCURSAL: Record<string, number> = {
  "plaza-mundo-soyapango": 1.45,
  "metrocentro-santa-ana": 1.35,
  "unicentro-metropolis": 1.3,
  "plaza-centro": 1.2,
  "metrocentro-sonsonate": 1.15,
  "encuentro-san-marcos": 1.1,
  "plaza-mundo-usulutan": 1.05,
  lourdes: 1.0,
  apopa: 0.95,
};

const FAVORITOS = [
  "parrillada-para-2",
  "tacos-de-birria",
  "promo-burritos",
  "churrasco-campana",
  "campacheros",
  "mi-media-campana",
  "carne-tipica-campana",
  "nachos-campana",
  "quesobirria",
  "hamburguesa-la-texana",
];

// Pedidos por hora de un día típico (11:00 a 21:00), relativos.
const CURVA_HORA = [0.35, 0.95, 1.0, 0.7, 0.4, 0.35, 0.5, 0.85, 0.9, 0.6, 0.3];

export function panelCampana(dias: PeriodoCampana): PanelCampana {
  const r = semilla(1000 + dias);
  const pedidosDia = 1180;
  const pedidos = Math.round(pedidosDia * dias * (0.94 + r() * 0.1));
  const ticketPromedio = 14.2 + r() * 1.4;
  const ventas = pedidos * ticketPromedio;

  const pesoTotal = SUCURSALES_CAMPANA.reduce((t, s) => t + (PESO_SUCURSAL[s.id] ?? 0.75 + r() * 0.15), 0);
  const r2 = semilla(2000 + dias);
  const porSucursal = SUCURSALES_CAMPANA.map((s) => {
    const peso = (PESO_SUCURSAL[s.id] ?? 0.75 + r2() * 0.15) / pesoTotal;
    const p = Math.round(pedidos * peso);
    return { id: s.id, nombre: s.nombre, pedidos: p, ventas: p * (ticketPromedio * (0.92 + r2() * 0.16)) };
  }).sort((a, b) => b.ventas - a.ventas);

  const totalCurva = CURVA_HORA.reduce((a, b) => a + b, 0);
  const porHora = CURVA_HORA.map((w, i) => ({
    hora: `${11 + i}:00`,
    pedidos: Math.round((pedidos / dias) * (w / totalCurva) * (0.95 + r() * 0.1)),
  }));

  const topPlatos = FAVORITOS.map((id, i) => {
    const plato = platoPorId(id) ?? MENU[i];
    const unidades = Math.round(pedidos * (0.16 - i * 0.012) * (0.92 + r() * 0.12));
    return { id: plato.id, nombre: plato.nombre, foto: plato.foto, unidades, ventas: unidades * plato.precio };
  }).sort((a, b) => b.unidades - a.unidades);

  const canales: Array<[string, number]> = [
    ["WhatsApp", 0.46],
    ["Sitio web", 0.27],
    ["Instagram", 0.15],
    ["Facebook", 0.08],
    ["Llamada", 0.04],
  ];
  const porCanal = canales.map(([canal, w]) => ({ canal, pedidos: Math.round(pedidos * w) }));

  const conversaciones = Math.round(184 * dias * (0.95 + r() * 0.1));
  const motivos: Array<[string, number]> = [
    ["Hacer un pedido", 0.52],
    ["Menú y promos", 0.21],
    ["Estado del pedido", 0.11],
    ["Sucursales y horarios", 0.07],
    ["Quejas y comentarios", 0.05],
    ["Eventos y catering", 0.04],
  ];

  return {
    pedidos,
    ventas,
    ticketPromedio,
    resueltasPorIa: 78 + Math.round(r() * 6),
    respuestaSeg: 6 + Math.round(r() * 5),
    deltaPedidos: 6 + Math.round(r() * 9),
    deltaVentas: 8 + Math.round(r() * 9),
    porHora,
    porSucursal,
    topPlatos,
    porCanal,
    motivos: motivos.map(([motivo, w]) => ({ motivo, conversaciones: Math.round(conversaciones * w) })),
    entrega: { domicilio: 0.58, retiro: 0.42 },
  };
}

export function dinero(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
