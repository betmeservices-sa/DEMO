// Lo que el filtro de periodo le hace al tablero de la agencia.
//
// El reclamo que lo originó: con "Hoy" cambiaba el consumo pero la plata y
// los tickets seguían mostrando 30 días. Estas pruebas cuidan que todo se corte
// con el mismo periodo y que los dos bloques de reservas cuadren entre sí.

import { describe, expect, it } from "vitest";
import {
  PERIODOS_AGENCIA,
  confirmadasDelPeriodo,
  enRango,
  origenDeReserva,
  reservasDelPeriodo,
  unaPorEstadia,
  ticketsDelPeriodo,
} from "@/lib/agencia-resumen";

// "Hoy" del 14 de septiembre en El Salvador: de 06:00 UTC a 06:00 UTC del 15.
const DESDE = "2026-09-14T06:00:00.000Z";
const HASTA = "2026-09-15T06:00:00.000Z";

const reserva = (estado: string, creada: string, total = 100, confirmadaTs: string | null = null) => ({
  estado,
  creada,
  total,
  confirmadaTs,
});

describe("los filtros del tablero", () => {
  it("son hoy, ayer, 7 días, 30 días y rango, en ese orden", () => {
    expect(PERIODOS_AGENCIA).toEqual(["hoy", "ayer", "7d", "30d", "rango"]);
  });
});

describe("enRango", () => {
  it("incluye el inicio y deja afuera el final", () => {
    expect(enRango(DESDE, DESDE, HASTA)).toBe(true);
    expect(enRango(HASTA, DESDE, HASTA)).toBe(false);
  });

  it("entiende la fecha como la devuelve la base, con +00:00", () => {
    expect(enRango("2026-09-14T06:00:00+00:00", DESDE, HASTA)).toBe(true);
    expect(enRango("2026-09-14T05:59:59+00:00", DESDE, HASTA)).toBe(false);
  });

  it("sin fecha no cuenta", () => {
    expect(enRango(null, DESDE, HASTA)).toBe(false);
    expect(enRango("no es fecha", DESDE, HASTA)).toBe(false);
  });
});

describe("las reservas del periodo", () => {
  // "Ahora": 14 de septiembre, 9 p.m. en El Salvador (15 sept 03:00 UTC).
  const AHORA = Date.parse("2026-09-15T03:00:00Z");
  const sofia = (estado: string, creada: string, extra: Record<string, unknown> = {}) => ({
    estado,
    creada,
    total: 100,
    clave: "wa:50370000000",
    vence: new Date(Date.parse(creada) + 3_600_000).toISOString(),
    notas: null,
    motivoRechazo: null,
    ...extra,
  });
  const reservas = [
    reserva("confirmada", "2026-09-14T15:00:00+00:00", 250.4),
    reserva("confirmada", "2026-09-13T15:00:00+00:00", 999),
    // Apartado de Sofía todavía dentro de su hora.
    sofia("pendiente_pago", "2026-09-15T02:30:00+00:00", { total: 80 }),
    // Apartado de Sofía al que se le pasó la hora y nadie cerró.
    sofia("pendiente_pago", "2026-09-14T16:00:00+00:00", { total: 90 }),
    reserva("comprobante_recibido", "2026-09-14T17:00:00+00:00", 120),
    sofia("rechazada", "2026-09-14T18:00:00+00:00", { motivoRechazo: "No pagó", total: 60 }),
    sofia("rechazada", "2026-09-14T18:10:00+00:00", { motivoRechazo: "Pagó en hotel" }),
    sofia("rechazada", "2026-09-14T18:20:00+00:00", { motivoRechazo: "reemplazada por un apartado nuevo" }),
    sofia("rechazada", "2026-09-14T18:30:00+00:00", { motivoRechazo: "Cambio de fecha" }),
    // Las de prueba no cuentan en nada.
    { ...sofia("pendiente_pago", "2026-09-14T19:00:00+00:00"), clave: "prueba:abc" },
    sofia("rechazada", "2026-09-14T19:10:00+00:00", { motivoRechazo: "Prueba" }),
  ];

  it("solo cuenta lo que se creó dentro del periodo, y las de prueba nunca", () => {
    const r = reservasDelPeriodo(reservas, DESDE, HASTA, AHORA);
    expect(r.confirmadas).toMatchObject({ n: 1, total: 250 });
    expect(r.rechazadas).toBe(1);
  });

  it("abiertas: el apartado sigue en su hora, o pagó y falta verificar", () => {
    const r = reservasDelPeriodo(reservas, DESDE, HASTA, AHORA);
    expect(r.abiertas).toEqual({ n: 2, total: 200, enSuHora: 1, porVerificar: 1 });
  });

  it("vencidas: la hora de apartado pasó sin pago, cerrada o no", () => {
    const r = reservasDelPeriodo(reservas, DESDE, HASTA, AHORA);
    expect(r.vencidas).toEqual({ n: 2, total: 150, sinCerrar: 1, cerradas: 1 });
  });

  it("lo que se hizo por otra vía y lo reemplazado no son pérdidas", () => {
    const r = reservasDelPeriodo(reservas, DESDE, HASTA, AHORA);
    expect(r.otraVia).toBe(1);
    expect(r.reemplazadas).toBe(1);
  });

  it("los motivos que escribe el equipo, como los escribe", () => {
    const rechazada = (motivoRechazo: string) => ({ estado: "rechazada", creada: "2026-09-14T18:00:00+00:00", total: 10, motivoRechazo });
    const r = reservasDelPeriodo(
      [
        rechazada("Se ingresó de manera manual"),
        rechazada("Se ingresó manual"),
        rechazada("rechazada por Verónica Viches"),
        rechazada("Cambio de fecha"),
        rechazada("No contestó"),
      ],
      DESDE,
      HASTA,
      AHORA,
    );
    expect(r.otraVia).toBe(2);
    expect(r.rechazadas).toBe(2);
    expect(r.sinMotivo).toBe(1);
    expect(r.vencidas.cerradas).toBe(1);
  });

  // La detección volvía a crear la tarjeta de una estadía ya rechazada y el
  // tablero la contaba tres veces (caso real del 19 de septiembre).
  it("una estadía cuenta una sola vez, con lo más lejos que llegó", () => {
    const fila = (estado: string, motivoRechazo: string | null, creada: string) => ({
      estado,
      creada,
      total: 135,
      clave: "wa:50370000000",
      desde: "2026-09-20",
      hasta: "2026-09-21",
      motivoRechazo,
    });
    const tres = [
      fila("rechazada", "No pagó", "2026-09-14T16:49:00+00:00"),
      fila("rechazada", "rechazada por Verónica Viches", "2026-09-15T00:01:00+00:00"),
      fila("rechazada", "rechazada por Verónica Viches", "2026-09-15T01:00:00+00:00"),
    ];
    const r = reservasDelPeriodo(tres, DESDE, HASTA, AHORA);
    expect(r.vencidas).toMatchObject({ n: 1, total: 135, cerradas: 1 });
    expect(r.rechazadas).toBe(0);
    // Si alguna de las filas quedó confirmada, la estadía es confirmada.
    const conConfirmada = [...tres, fila("confirmada", null, "2026-09-14T20:00:00+00:00")];
    expect(unaPorEstadia(conConfirmada)).toHaveLength(1);
    expect(reservasDelPeriodo(conConfirmada, DESDE, HASTA, AHORA).confirmadas.n).toBe(1);
  });

  it("sin fechas no se puede saber si es la misma: cuenta sola", () => {
    const sinFechas = [
      { estado: "rechazada", creada: DESDE, clave: "wa:1", motivoRechazo: "No pagó" },
      { estado: "rechazada", creada: DESDE, clave: "wa:1", motivoRechazo: "No pagó" },
    ];
    expect(unaPorEstadia(sinFechas)).toHaveLength(2);
  });

  it("un pendiente sin hora de apartado (detectado de un chat) vence a la hora de creado", () => {
    const detectada = {
      estado: "pendiente_pago",
      creada: "2026-09-14T16:00:00+00:00",
      total: 50,
      notas: "Detectada del chat (atendió el equipo).",
      vence: null,
    };
    const r = reservasDelPeriodo([detectada], DESDE, HASTA, AHORA);
    expect(r.vencidas.sinCerrar).toBe(1);
    expect(r.abiertas.n).toBe(0);
  });

  it("quién cerró cuenta las mismas confirmadas que el bloque de la plata", () => {
    const r = reservasDelPeriodo(reservas, DESDE, HASTA, AHORA);
    expect(confirmadasDelPeriodo(reservas, DESDE, HASTA)).toHaveLength(r.confirmadas.n);
  });

  it("la confirmada más reciente va primero", () => {
    const c = confirmadasDelPeriodo(
      [
        reserva("confirmada", "2026-09-14T08:00:00+00:00", 1, "2026-09-14T09:00:00+00:00"),
        reserva("confirmada", "2026-09-14T07:00:00+00:00", 2, "2026-09-14T20:00:00+00:00"),
      ],
      DESDE,
      HASTA,
    );
    expect(c.map((x) => x.total)).toEqual([2, 1]);
  });
});

describe("los tickets del periodo", () => {
  const ticket = (creado: string, estado: string, extra: { resuelto?: string; creadoPor?: string; tipo?: string } = {}) => ({
    creado,
    estado,
    resuelto: extra.resuelto,
    creadoPor: extra.creadoPor ?? "Verónica",
    tipo: extra.tipo ?? "pago",
  });

  const tickets = [
    ticket("2026-09-14T10:00:00+00:00", "abierto", { creadoPor: "Sofía", tipo: "pago" }),
    ticket("2026-09-14T11:00:00+00:00", "resuelto", { resuelto: "2026-09-14T11:30:00+00:00", tipo: "pago" }),
    ticket("2026-09-14T12:00:00+00:00", "resuelto", { resuelto: "2026-09-14T13:00:00+00:00", creadoPor: "sofia ", tipo: "queja" }),
    ticket("2026-09-10T10:00:00+00:00", "abierto", { creadoPor: "Sofía" }),
  ];

  it("un ticket de otro día no entra en ninguna cuenta", () => {
    const t = ticketsDelPeriodo(tickets, DESDE, HASTA);
    expect(t.periodo).toBe(3);
    expect(t.abiertos).toBe(1);
    expect(t.resueltos).toBe(2);
    expect(t.porSofia).toBe(2);
  });

  it("la mediana sale de los resueltos del periodo", () => {
    expect(ticketsDelPeriodo(tickets, DESDE, HASTA).medianaMinutos).toBe(30);
  });

  it("los tipos van del más repetido al menos", () => {
    expect(ticketsDelPeriodo(tickets, DESDE, HASTA).porTipo).toEqual([
      { tipo: "pago", n: 2 },
      { tipo: "queja", n: 1 },
    ]);
  });
});

describe("quién creó cada reserva", () => {
  it("las huellas de cada camino", () => {
    expect(origenDeReserva({ estado: "confirmada", creada: "x", clave: "prueba:1" })).toBe("prueba");
    expect(origenDeReserva({ estado: "rechazada", creada: "x", motivoRechazo: "reset de la prueba" })).toBe("prueba");
    expect(origenDeReserva({ estado: "confirmada", creada: "x", clave: "manual:k3j2" })).toBe("manual");
    expect(
      origenDeReserva({ estado: "confirmada", creada: "x", clave: "wa:503", notas: "Reserva tomada a mano por Verónica." }),
    ).toBe("manual");
    expect(origenDeReserva({ estado: "confirmada", creada: "x", clave: "wa:503", vence: "2026-09-14T17:00:00Z" })).toBe("sofia");
    // Una de Sofía que la detección sobrescribió después sigue siendo de Sofía.
    expect(
      origenDeReserva({ estado: "confirmada", creada: "x", vence: "2026-09-14T17:00:00Z", notas: "Detectada del chat (atendió el equipo)." }),
    ).toBe("sofia");
    expect(origenDeReserva({ estado: "confirmada", creada: "x", notas: "Detectada del chat (atendió el equipo)." })).toBe("detectada");
    expect(origenDeReserva({ estado: "confirmada", creada: "x" })).toBe("otro");
  });

  it("las confirmadas dicen de dónde vinieron", () => {
    const r = reservasDelPeriodo(
      [
        { estado: "confirmada", creada: DESDE, total: 10, vence: "2026-09-14T08:00:00Z" },
        { estado: "confirmada", creada: DESDE, total: 10, notas: "Detectada del chat." },
        { estado: "confirmada", creada: DESDE, total: 10, clave: "manual:1" },
      ],
      DESDE,
      HASTA,
    );
    expect(r.confirmadas.porOrigen).toEqual({ sofia: 1, detectada: 1, manual: 1, otro: 0 });
  });
});
