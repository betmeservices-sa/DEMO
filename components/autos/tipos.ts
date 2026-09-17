// Lo que las pantallas de la sala de ventas reciben de la API, en un solo lugar.
//
// Son los tipos del dominio (lib/autos-pipeline) mas lo que el servidor ya dejo
// calculado, para que ningun componente vuelva a deducir la etapa ni el avance.

import type {
  Alerta,
  CitaVencida,
  EtapaId,
  Oportunidad,
  PasoConEstado,
  ReporteAutos,
  Vendedor,
} from "@/lib/autos-pipeline";

export interface Venta extends Oportunidad {
  etapa: EtapaId;
  avance: {
    hechos: number;
    total: number;
    resumen: string;
    /** El id del paso que toca mover. */
    siguiente: string | null;
    trabado: boolean;
    /** La cita mas proxima, si hay alguna puesta. */
    cita: string | null;
  };
  detalle: PasoConEstado[];
}

export interface EventoVenta {
  ts: string;
  tipo: string;
  actor: string | null;
  detalle: string | null;
}

export interface RespuestaTablero {
  ok: boolean;
  error?: string;
  oportunidades: Venta[];
  vendedores: Vendedor[];
  gerente: Vendedor | null;
  alertas: Alerta[];
  citasVencidas: CitaVencida[];
}

export type RespuestaReporte = ReporteAutos & { ok: boolean; error?: string; gerente: Vendedor | null };
