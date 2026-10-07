// Lo que el tablero de la Caja muestra por area, y "lo urgente" del dia.
//
// Datos de DEMOSTRACION, como el resto de la semilla: las cifras de cada area,
// su tendencia de siete dias y los casos urgentes son inventados (los casos
// apuntan a contactos de la semilla, para que "abrir" lleve a su chat). Nada
// de esto dice cuanto cobra ni cuanto presta la Caja.

import type { DepartmentId } from "@/lib/data/types";

export interface KpiArea {
  label: string;
  valor: string | number;
}

export interface PanelArea {
  id: DepartmentId;
  /** La cifra principal del area, con su variacion contra la semana pasada. */
  principal: KpiArea & { delta: number };
  /** Los ultimos siete dias de la cifra principal, del mas viejo a hoy. */
  serie: number[];
  secundarios: KpiArea[];
}

export const PANEL_AREAS: PanelArea[] = [
  {
    id: "consultas",
    principal: { label: "Consultas hoy", valor: 86, delta: 12 },
    serie: [61, 58, 70, 66, 74, 79, 86],
    secundarios: [
      { label: "Resueltas por IA", valor: "71%" },
      { label: "Interés en crédito", valor: 14 },
    ],
  },
  {
    id: "cobranza",
    principal: { label: "Gestiones hoy", valor: 64, delta: 9 },
    serie: [41, 47, 52, 49, 58, 60, 64],
    secundarios: [
      { label: "Promesas de pago", valor: 38 },
      { label: "Monto prometido", valor: "$9,460" },
    ],
  },
  {
    id: "tarjetas",
    principal: { label: "Solicitudes en curso", valor: 27, delta: 15 },
    serie: [15, 18, 17, 21, 22, 24, 27],
    secundarios: [
      { label: "Bloqueos atendidos", valor: 6 },
      { label: "Viajes reportados", valor: 11 },
    ],
  },
];

export type TipoUrgente = "cuota" | "promesa" | "tarjeta" | "consulta";

export interface Urgente {
  id: string;
  area: DepartmentId;
  tipo: TipoUrgente;
  /** Que pasa, en pocas palabras. */
  titulo: string;
  persona: string;
  detalle: string;
  /** Para cuando, como se lee en la tarjeta. */
  cuando: string;
  /** El contacto de la semilla: si tiene conversacion, "abrir" lleva a ella. */
  contactId: string;
}

export const URGENTES: Urgente[] = [
  {
    id: "u1",
    area: "cobranza",
    tipo: "cuota",
    titulo: "Cuota vence hoy",
    persona: "Wilfredo Antonio Chávez",
    detalle: "Crédito de consumo · $112.40 · mensajes después de las 5",
    cuando: "Hoy",
    contactId: "c17",
  },
  {
    id: "u2",
    area: "cobranza",
    tipo: "cuota",
    titulo: "Pide su saldo",
    persona: "Nelson Alexander Pineda",
    detalle: "Falta verificar identidad",
    cuando: "Hace 10 min",
    contactId: "c8",
  },
  {
    id: "u3",
    area: "cobranza",
    tipo: "promesa",
    titulo: "Promesa de pago vence",
    persona: "Marta Lidia Galdámez",
    detalle: "Crédito popular · cuota semanal",
    cuando: "Vie 9 oct",
    contactId: "c5",
  },
  {
    id: "u4",
    area: "cobranza",
    tipo: "promesa",
    titulo: "Segunda promesa de pago",
    persona: "Glenda Marisol Orellana",
    detalle: "La del 30 de septiembre no se cumplió",
    cuando: "Sáb 10 oct",
    contactId: "c14",
  },
  {
    id: "u5",
    area: "tarjetas",
    tipo: "tarjeta",
    titulo: "Presolicitud sin contactar",
    persona: "Gabriel Eduardo Recinos",
    detalle: "Entró por el sitio; pregunta cuándo lo llaman",
    cuando: "Desde ayer",
    contactId: "c9",
  },
  {
    id: "u6",
    area: "tarjetas",
    tipo: "tarjeta",
    titulo: "Pide aumento de límite",
    persona: "Ruth Noemí Dubón",
    detalle: "Pasar a asesor de tarjetas",
    cuando: "Hoy",
    contactId: "c18",
  },
  {
    id: "u7",
    area: "consultas",
    tipo: "consulta",
    titulo: "Consulta sin respuesta",
    persona: "Yesenia Hernández",
    detalle: "Cuenta de ahorro infantil para su hija",
    cuando: "Hace 45 min",
    contactId: "c2",
  },
];
