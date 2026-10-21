// La muestra de un hotel + lo que se movió en el demo = lo que ven las pantallas.
//
// Todo se arma con la fecha y la hora de cada carga: los apartados vencen "en
// 31 minutos" cada vez que se abre el demo y las llegadas son siempre de esta
// semana. Lo movido (confirmar, rechazar, tomar un ticket) se aplica encima, en
// el orden en que se hizo.

import type { NotaTicket, Ticket } from "@/lib/tickets";
import { ordenarCola } from "@/lib/tickets";
import type {
  ApartadoSemilla,
  EstadoApartado,
  GrupoPausa,
  HotelMuestra,
  Movimiento,
  ReservaMuestra,
} from "./tipos";
import { libroDeMuestra, habitacionDe, totalEstadia } from "./libro";
import { sumarDias } from "./fechas";

export interface Apartado {
  id: string;
  huesped: string;
  zonaId: string;
  zonaNombre: string;
  habitacionId: string;
  habitacionNombre: string;
  desde: string;
  hasta: string;
  noches: number;
  personas: number;
  total: number;
  estado: EstadoApartado;
  quedanMin: number;
  canal: ApartadoSemilla["canal"];
  nota?: string;
  conversacionId?: string;
}

export interface Cerrada {
  id: string;
  huesped: string;
  zonaNombre: string;
  habitacionNombre: string;
  desde: string;
  hasta: string;
  noches: number;
  personas: number;
  total: number;
  estado: "confirmada" | "rechazada";
  /** "Reserva NW-2033 · Andrea Ayala" o el motivo del rechazo. */
  detalle: string;
  nota?: string;
}

export interface EnPausa {
  huesped: string;
  desde: string;
  hasta: string;
  total: number;
  haceDias: number;
}

export interface VistaHotel {
  hoy: string;
  ahora: number;
  libro: ReservaMuestra[];
  apartados: Apartado[];
  cerradas: Cerrada[];
  pausa: Record<"esperando_pago" | GrupoPausa, EnPausa[]>;
  tickets: Ticket[];
}

const iso = (ms: number) => new Date(ms).toISOString();

function armarApartado(hotel: HotelMuestra, a: ApartadoSemilla, hoy: string): Apartado {
  const ref = habitacionDe(hotel, a.habitacionId);
  const desde = sumarDias(hoy, a.llegaEnDias);
  return {
    id: a.id,
    huesped: a.huesped,
    zonaId: a.zonaId,
    zonaNombre: ref?.zona.nombre ?? a.zonaId,
    habitacionId: a.habitacionId,
    habitacionNombre: ref?.hab.nombre ?? a.habitacionId,
    desde,
    hasta: sumarDias(desde, a.noches),
    noches: a.noches,
    personas: a.personas,
    total: ref ? totalEstadia(ref.hab, desde, a.noches) : 0,
    estado: a.estado,
    quedanMin: a.quedanMin,
    canal: a.canal,
    nota: a.nota,
    conversacionId: a.conversacionId,
  };
}

function ticketsDeMuestra(hotel: HotelMuestra, ahora: number): Ticket[] {
  return hotel.tickets.map((s) => {
    const creado = ahora - s.haceMin * 60_000;
    const asignado = s.tomadoEn !== undefined ? creado + s.tomadoEn * 60_000 : undefined;
    const resuelto = asignado !== undefined && s.resueltoEn !== undefined ? asignado + s.resueltoEn * 60_000 : undefined;
    return {
      id: `${hotel.tenant}-t${s.numero}`,
      tenant: hotel.tenant,
      numero: s.numero,
      titulo: s.titulo,
      detalle: s.detalle,
      tipo: s.tipo,
      estado: s.estado,
      prioridad: s.prioridad,
      origen: s.origen,
      creadoPor: s.origen === "chat" ? hotel.agente : "Recepción",
      contactoNombre: s.contactoNombre,
      area: s.area,
      asignadoA: s.asignadoA,
      conversacionId: s.conversacionId,
      creado: iso(creado),
      asignado: asignado !== undefined ? iso(asignado) : undefined,
      resuelto: resuelto !== undefined ? iso(resuelto) : undefined,
      notas: (s.notas ?? []).map(
        (n, i): NotaTicket => ({ id: `${hotel.tenant}-t${s.numero}-n${i}`, autor: n.autor, texto: n.texto, ts: iso(ahora - n.haceMin * 60_000) }),
      ),
    };
  });
}

/** Número de reserva de un apartado confirmado: el mismo número con el prefijo de reserva. */
export function reservaDeApartado(hotel: HotelMuestra, apartadoId: string): string {
  return apartadoId.replace(hotel.prefijoApartado, hotel.prefijoReserva);
}

export function armarVista(hotel: HotelMuestra, movimientos: Movimiento[], ahora: number, hoy: string): VistaHotel {
  const libro = libroDeMuestra(hotel, hoy);
  let apartados = hotel.apartados.map((a) => armarApartado(hotel, a, hoy));

  const cerradas: Cerrada[] = hotel.cerradas.map((c) => {
    const ref = habitacionDe(hotel, c.habitacionId);
    const desde = sumarDias(hoy, c.llegaEnDias);
    return {
      id: c.id,
      huesped: c.huesped,
      zonaNombre: ref?.zona.nombre ?? c.zonaId,
      habitacionNombre: ref?.hab.nombre ?? c.habitacionId,
      desde,
      hasta: sumarDias(desde, c.noches),
      noches: c.noches,
      personas: c.personas,
      total: ref ? totalEstadia(ref.hab, desde, c.noches) : 0,
      estado: c.estado,
      detalle:
        c.estado === "confirmada"
          ? `Reserva ${reservaDeApartado(hotel, c.id)} · ${c.porQuien ?? hotel.confirmaReservas}`
          : (c.nota ?? "Rechazada"),
      nota: c.estado === "confirmada" ? c.nota : undefined,
    };
  });

  const pausa: VistaHotel["pausa"] = { esperando_pago: [], dijo_si: [], se_cayo: [] };
  for (const p of hotel.pausa) {
    const desde = sumarDias(hoy, p.llegaEnDias);
    pausa[p.grupo].push({ huesped: p.huesped, desde, hasta: sumarDias(desde, p.noches), total: p.total, haceDias: p.haceDias });
  }

  let tickets = ticketsDeMuestra(hotel, ahora);

  for (const m of movimientos) {
    if (m.tipo === "apartado.confirmar" || m.tipo === "apartado.rechazar") {
      const a = apartados.find((x) => x.id === m.apartadoId);
      if (!a) continue;
      apartados = apartados.filter((x) => x.id !== a.id);
      if (m.tipo === "apartado.confirmar") {
        libro.push({
          id: reservaDeApartado(hotel, a.id),
          zonaId: a.zonaId,
          habitacionId: a.habitacionId,
          huesped: a.huesped,
          desde: a.desde,
          hasta: a.hasta,
          huespedes: a.personas,
          total: a.total,
          canal: a.canal === "Messenger" ? "Facebook" : a.canal,
          origen: "agente",
        });
        cerradas.unshift({
          id: a.id,
          huesped: a.huesped,
          zonaNombre: a.zonaNombre,
          habitacionNombre: a.habitacionNombre,
          desde: a.desde,
          hasta: a.hasta,
          noches: a.noches,
          personas: a.personas,
          total: a.total,
          estado: "confirmada",
          detalle: `Reserva ${reservaDeApartado(hotel, a.id)} · ${m.actor}`,
          nota: a.nota,
        });
      } else {
        cerradas.unshift({
          id: a.id,
          huesped: a.huesped,
          zonaNombre: a.zonaNombre,
          habitacionNombre: a.habitacionNombre,
          desde: a.desde,
          hasta: a.hasta,
          noches: a.noches,
          personas: a.personas,
          total: a.total,
          estado: "rechazada",
          detalle: `La rechazó ${m.actor}. No pagó en la hora del apartado.`,
        });
        pausa.se_cayo.unshift({ huesped: a.huesped, desde: a.desde, hasta: a.hasta, total: a.total, haceDias: 0 });
      }
    } else if (m.tipo === "reserva.nueva") {
      libro.push(m.reserva);
    } else if (m.tipo === "ticket.nuevo") {
      const numero = tickets.reduce((n, t) => Math.max(n, t.numero), 100) + 1;
      tickets = [
        ...tickets,
        {
          id: m.id,
          tenant: hotel.tenant,
          numero,
          titulo: m.ticket.titulo,
          detalle: m.ticket.detalle,
          tipo: m.ticket.tipo,
          // Si nace con dueño, nace asignado, igual que en el tablero real.
          estado: m.ticket.asignadoA ? "asignado" : "abierto",
          prioridad: m.ticket.prioridad,
          origen: m.ticket.origen,
          creadoPor: m.ticket.creadoPor,
          contactoNombre: m.ticket.contactoNombre,
          contactoTelefono: m.ticket.contactoTelefono,
          area: m.ticket.area,
          asignadoA: m.ticket.asignadoA,
          conversacionId: m.ticket.conversacionId,
          creado: m.ts,
          asignado: m.ticket.asignadoA ? m.ts : undefined,
          notas: [],
        },
      ];
    } else if (m.tipo === "ticket.asignar") {
      tickets = tickets.map((t) =>
        t.id !== m.ticketId
          ? t
          : {
              ...t,
              asignadoA: m.staffId || undefined,
              // La hora de atención se sella la primera vez nada más.
              asignado: t.asignado ?? (m.staffId ? m.ts : undefined),
              estado: t.estado === "abierto" && m.staffId ? "asignado" : t.estado,
            },
      );
    } else if (m.tipo === "ticket.estado") {
      tickets = tickets.map((t) =>
        t.id !== m.ticketId
          ? t
          : {
              ...t,
              estado: m.estado,
              asignado: t.asignado ?? (m.estado !== "abierto" ? m.ts : undefined),
              resuelto: m.estado === "resuelto" ? (t.resuelto ?? m.ts) : undefined,
            },
      );
    } else if (m.tipo === "ticket.nota") {
      tickets = tickets.map((t) =>
        t.id !== m.ticketId ? t : { ...t, notas: [...t.notas, { id: `${m.id}-n`, autor: m.actor, texto: m.texto, ts: m.ts }] },
      );
    }
  }

  // Lo que el agente apartó y no se pagó todavía también está "en pausa".
  pausa.esperando_pago = apartados.map((a) => ({ huesped: a.huesped, desde: a.desde, hasta: a.hasta, total: a.total, haceDias: 0 }));

  return { hoy, ahora, libro, apartados, cerradas, pausa, tickets: ordenarCola(tickets) };
}
