"use client";

// Los tickets de un hotel de muestra, con la misma forma que devuelve
// /api/tickets. Así el tablero de tickets es el mismo para todos: cambia de
// dónde lee (la muestra del navegador en vez de la base) y nada más.

import type { EstadoTicket, OrigenTicket, PrioridadTicket, Ticket, TipoTicket } from "@/lib/tickets";
import { calcularMetricas, type MetricasTickets } from "@/lib/tickets-metricas";
import { horarioDeArea } from "@/lib/tickets-tenant";
import { registrar, vistaDe } from "./store";

export interface RespuestaTicketsMuestra {
  ok: true;
  tickets: Ticket[];
  metricas: MetricasTickets;
}

export function leerTicketsMuestra(tenant: string): RespuestaTicketsMuestra | null {
  const vista = vistaDe(tenant);
  if (!vista) return null;
  return {
    ok: true,
    tickets: vista.tickets,
    metricas: calcularMetricas(vista.tickets, {
      horario: (t) => horarioDeArea(tenant, t.area),
    }),
  };
}

/** Lo mismo que hace el PATCH de /api/tickets, en el mismo orden. */
export function cambiarTicketMuestra(id: string, cambios: Record<string, unknown>) {
  const actor = typeof cambios.autor === "string" ? cambios.autor : "Equipo";
  if (typeof cambios.asignadoA === "string") registrar({ tipo: "ticket.asignar", ticketId: id, staffId: cambios.asignadoA, actor });
  if (typeof cambios.estado === "string") registrar({ tipo: "ticket.estado", ticketId: id, estado: cambios.estado as EstadoTicket, actor });
  if (typeof cambios.nota === "string" && cambios.nota.trim()) registrar({ tipo: "ticket.nota", ticketId: id, texto: cambios.nota.trim(), actor });
}

export function crearTicketMuestra(form: {
  titulo: string;
  detalle: string;
  contactoNombre: string;
  contactoTelefono?: string;
  tipo: TipoTicket;
  area: string;
  prioridad: string;
  origen: string;
  asignadoA?: string;
  creadoPor: string;
}): string | null {
  if (!form.titulo.trim()) return "El ticket necesita un título.";
  if (!form.contactoNombre.trim()) return "Falta a nombre de quién es.";
  registrar({
    tipo: "ticket.nuevo",
    actor: form.creadoPor,
    ticket: {
      titulo: form.titulo.trim(),
      detalle: form.detalle,
      tipo: form.tipo,
      prioridad: form.prioridad as PrioridadTicket,
      origen: form.origen as OrigenTicket,
      creadoPor: form.creadoPor,
      contactoNombre: form.contactoNombre.trim(),
      contactoTelefono: form.contactoTelefono || undefined,
      area: form.area,
      asignadoA: form.asignadoA || undefined,
    },
  });
  return null;
}
