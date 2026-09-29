// Quién cerró cada reserva y a qué hora pasó cada cosa.
//
// Esto se lee para decidir si el agente vale lo que cuesta, así que un número
// mal contado acá vale más caro que un bug de pantalla.

import { describe, expect, it } from "vitest";
import { comoSeCerro, resumirCierres, tandaDelCierre } from "@/lib/cierre-de-reserva";

const T = (dia: number, hora: number, min = 0) =>
  new Date(Date.UTC(2026, 8, dia, hora, min)).toISOString();

const huesped = (ts: string) => ({ direction: "in" as const, ts });
const sofia = (ts: string) => ({ direction: "out" as const, ts, staffId: "ia", staffNombre: "Sofía" });
const vero = (ts: string) => ({ direction: "out" as const, ts, staffId: "s2", staffNombre: "Verónica Viches" });
const CUENTAS = ["125265819"];
const cuentaDeSofia = (ts: string) => ({
  direction: "out" as const,
  ts,
  staffId: "ia",
  staffNombre: "Sofía",
  texto: "Puede transferir a BAC, cuenta corriente 125265819 a nombre de DIJOSA S.A. de C.V.",
});
const comprobante = (ts: string) => ({ direction: "in" as const, ts, imagen: true });

describe("cuándo empezó de verdad la conversación", () => {
  it("corta donde hubo un silencio largo", () => {
    // El caso real: alguien escribió en abril y volvió en septiembre. Tomar el
    // primer mensaje daría "tardó cinco meses en cerrar" y el trato se hizo en
    // dos días.
    const t = tandaDelCierre(
      [
        huesped(new Date(Date.UTC(2026, 3, 1, 17, 55)).toISOString()),
        sofia(new Date(Date.UTC(2026, 3, 1, 18, 0)).toISOString()),
        huesped(T(9, 14)),
        vero(T(9, 15)),
      ],
      T(9, 16),
    );
    expect(t).toHaveLength(2);
    expect(t[0].ts).toBe(T(9, 14));
  });

  it("sin silencios, la tanda es el hilo entero", () => {
    const hilo = [huesped(T(8, 12)), sofia(T(8, 13)), huesped(T(9, 9))];
    expect(tandaDelCierre(hilo, T(9, 10))).toHaveLength(3);
  });

  it("lo que se hablÓ DESPUÉS del cierre no cuenta", () => {
    // Si no, un "gracias, ahí nos vemos" del día siguiente movería la hora de
    // cierre y el reporte diría que tardó un día más.
    const t = tandaDelCierre([huesped(T(9, 9)), vero(T(9, 10)), huesped(T(9, 20))], T(9, 11));
    expect(t).toHaveLength(2);
  });

  it("sin mensajes, no hay tanda", () => {
    expect(tandaDelCierre([], T(9, 10))).toEqual([]);
  });

  it("las fechas rotas se descartan sin tumbar nada", () => {
    const t = tandaDelCierre([{ direction: "in", ts: "no es fecha" }, huesped(T(9, 9))], T(9, 10));
    expect(t).toHaveLength(1);
  });
});

describe("quién se lleva el trato", () => {
  it("si una persona se metió antes del cierre, es de la persona", () => {
    const c = comoSeCerro([huesped(T(9, 9)), sofia(T(9, 9, 5)), vero(T(9, 10)), huesped(T(9, 11))], T(9, 12));
    expect(c.cerro).toBe("persona");
    expect(c.persona).toBe("Verónica Viches");
    expect(c.pasoAPersona).toBe(T(9, 10));
    expect(c.mensajesAgente).toBe(1);
    expect(c.mensajesPersona).toBe(1);
  });

  // La regla del usuario (2026-09-29): Sofía mandó la cuenta, el huésped
  // respondió con el comprobante y nadie del equipo escribió antes del pago.
  // Validar el comprobante y apretar "confirmar" no le quita el trato.
  it("Sofía mandó la cuenta y llegó el comprobante: la cerró Sofía", () => {
    const c = comoSeCerro(
      [huesped(T(9, 9)), cuentaDeSofia(T(9, 9, 5)), comprobante(T(9, 9, 30))],
      T(9, 10),
      CUENTAS,
    );
    expect(c.cerro).toBe("sofia");
    expect(c.cuentaDeSofia).toBe(T(9, 9, 5));
    expect(c.comprobante).toBe(T(9, 9, 30));
    expect(c.persona).toBeNull();
  });

  it("si el equipo escribe DESPUÉS del comprobante (validando), sigue siendo de Sofía", () => {
    const c = comoSeCerro(
      [huesped(T(9, 9)), cuentaDeSofia(T(9, 9, 5)), comprobante(T(9, 9, 30)), vero(T(9, 9, 40))],
      T(9, 10),
      CUENTAS,
    );
    expect(c.cerro).toBe("sofia");
  });

  it("si el equipo escribió ANTES del pago, aunque sea días antes, no es de Sofía", () => {
    // Caso CS-ARH9B: el equipo atendió el 20, Sofía retomó y cobró el 26.
    const c = comoSeCerro(
      [huesped(T(3, 9)), vero(T(3, 10)), huesped(T(9, 9)), cuentaDeSofia(T(9, 9, 5)), comprobante(T(9, 9, 30))],
      T(9, 10),
      CUENTAS,
    );
    expect(c.cerro).toBe("persona");
  });

  it("lo que el equipo escribió en una visita de meses atrás no cuenta", () => {
    // Caso YA-6QHME: un "Sí claro" del equipo en diciembre; la reserva es de septiembre.
    const c = comoSeCerro(
      [vero(T(1, 10)), huesped(T(9, 9)), cuentaDeSofia(T(9, 9, 5)), comprobante(T(9, 9, 30))],
      T(9, 10),
      CUENTAS,
      T(6, 9),
    );
    expect(c.cerro).toBe("sofia");
  });

  it("Sofía habló sola pero no cobró (no mandó la cuenta): no se afirma", () => {
    const c = comoSeCerro([huesped(T(9, 9)), sofia(T(9, 9, 5)), comprobante(T(9, 9, 30))], T(9, 10), CUENTAS);
    expect(c.cerro).toBe("sin_datos");
  });

  it("mandó la cuenta pero no llegó comprobante: no se afirma", () => {
    const c = comoSeCerro([huesped(T(9, 9)), cuentaDeSofia(T(9, 9, 5)), huesped(T(9, 9, 30))], T(9, 10), CUENTAS);
    expect(c.cerro).toBe("sin_datos");
  });

  it("una persona que escribe DESPUÉS de confirmar no le quita el trato a Sofía", () => {
    const c = comoSeCerro(
      [huesped(T(9, 9)), cuentaDeSofia(T(9, 9, 5)), comprobante(T(9, 9, 30)), vero(T(9, 14))],
      T(9, 10),
      CUENTAS,
    );
    expect(c.cerro).toBe("sofia");
  });

  it("las horas y los tiempos", () => {
    const c = comoSeCerro([huesped(T(9, 9)), sofia(T(9, 9, 10)), vero(T(9, 11))], T(9, 12, 30));
    expect(c.inicio).toBe(T(9, 9));
    expect(c.minutosHastaPersona).toBe(120);
    expect(c.minutosTotales).toBe(210);
  });

  it("sin hora de cierre no se inventa una duración", () => {
    const c = comoSeCerro([huesped(T(9, 9)), vero(T(9, 10))], null);
    expect(c.minutosTotales).toBeNull();
    expect(c.cerro).toBe("persona");
  });

  // El bug de las reservas de WhatsApp: el hilo no se leía, llegaba vacío y
  // el trato se le daba a Sofía por descarte.
  it("un hilo vacío no rompe y NO se le da a Sofía", () => {
    const c = comoSeCerro([], T(9, 10));
    expect(c.cerro).toBe("sin_datos");
    expect(c.inicio).toBeNull();
    expect(c.mensajesAgente).toBe(0);
  });
});

describe("cuando no se sabe quién mandó", () => {
  // WhatsApp guarda quién mandó cada saliente desde el 17 de septiembre de
  // 2026. Antes de eso el saliente viene sin id y sin nombre.
  const sinMarca = (ts: string) => ({ direction: "out" as const, ts, staffId: null, staffNombre: null });

  it("con salientes sin marca y ninguna persona identificada, no se sabe", () => {
    const c = comoSeCerro([huesped(T(9, 9)), sinMarca(T(9, 10)), sofia(T(9, 11))], T(9, 12));
    expect(c.cerro).toBe("sin_datos");
  });

  it("si una persona identificada se metió, es de la persona aunque haya salientes sin marca", () => {
    const c = comoSeCerro([huesped(T(9, 9)), sinMarca(T(9, 10)), vero(T(9, 11))], T(9, 12));
    expect(c.cerro).toBe("persona");
  });

  it("'Equipo' sin id (desde la app de Facebook) es una persona", () => {
    const equipo = { direction: "out" as const, ts: T(9, 10), staffId: null, staffNombre: "Equipo" };
    const c = comoSeCerro([huesped(T(9, 9)), sofia(T(9, 9, 30)), equipo], T(9, 12));
    expect(c.cerro).toBe("persona");
    expect(c.persona).toBe("Equipo");
  });
});

describe("el titular", () => {
  const cierre = (cerro: "sofia" | "persona" | "sin_datos", persona: string | null, minutos: number | null) => ({
    inicio: T(9, 9),
    pasoAPersona: persona ? T(9, 10) : null,
    persona,
    cerro,
    mensajesAgente: 3,
    mensajesPersona: persona ? 5 : 0,
    minutosTotales: minutos,
    minutosHastaPersona: persona ? 60 : null,
    cuentaDeSofia: null,
    comprobante: null,
  });

  const reservas = [
    { total: 100, cierre: cierre("persona", "Verónica Viches", 120) },
    { total: 55, cierre: cierre("persona", "Verónica Viches", 60) },
    { total: 170, cierre: cierre("persona", "Jaime Quintanilla", 300) },
    { total: 65, cierre: cierre("sofia", null, 30) },
  ];

  it("parte la plata entre el agente y la gente", () => {
    const r = resumirCierres(reservas);
    expect(r.total).toBe(4);
    expect(r.sofia).toEqual({ n: 1, total: 65 });
    expect(r.persona).toEqual({ n: 3, total: 325 });
  });

  it("dice quién cerró cuánto, de la que más a la que menos", () => {
    const r = resumirCierres(reservas);
    expect(r.porPersona).toEqual([
      { nombre: "Verónica Viches", n: 2, total: 155 },
      { nombre: "Jaime Quintanilla", n: 1, total: 170 },
    ]);
  });

  it("la mediana de lo que tarda un trato", () => {
    expect(resumirCierres(reservas).medianaMinutos).toBe(120);
  });

  it("las que no se sabe se cuentan aparte, no se reparten", () => {
    const r = resumirCierres([...reservas, { total: 80, cierre: cierre("sin_datos", null, null) }]);
    expect(r.total).toBe(5);
    expect(r.sofia).toEqual({ n: 1, total: 65 });
    expect(r.sinDatos).toEqual({ n: 1, total: 80 });
  });

  it("sin reservas no inventa nada", () => {
    const r = resumirCierres([]);
    expect(r.total).toBe(0);
    expect(r.medianaMinutos).toBeNull();
    expect(r.porPersona).toEqual([]);
  });

  it("una reserva sin monto suma cero, no rompe", () => {
    const r = resumirCierres([{ cierre: cierre("sofia", null, 10) }]);
    expect(r.sofia).toEqual({ n: 1, total: 0 });
  });

  it("una persona sin nombre no desaparece del reporte", () => {
    const r = resumirCierres([{ total: 40, cierre: cierre("persona", null, 10) }]);
    expect(r.porPersona).toEqual([{ nombre: "El equipo", n: 1, total: 40 }]);
  });
});
