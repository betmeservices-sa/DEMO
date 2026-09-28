// El plan de conversaciones de Yali en su ciclo de facturación.
//
// Lo acordado (2026-09-28): sin Day Pass, el plan incluye 1.000 por ciclo y
// desde la 1.001 corre un paquete adicional; Day Pass va aparte desde la
// primera, con 500 incluidas y su paquete adicional desde la 501. Una
// conversación es una sesión de 24 horas, como dice la propuesta. El ciclo de
// Yali arranca el 1 de septiembre (mes calendario).
import { describe, expect, it } from "vitest";
import {
  PLANES,
  cicloDelPlan,
  cicloEnCurso,
  conversacionesDelCiclo,
  conversacionesQueArrancanEn,
  hayCicloAnterior,
  idDeConsumo,
  usoDelPlan,
  type Conversacion,
} from "@/lib/plan-conversaciones";

const plan = {
  incluidas: { generales: 1000, dayPass: 500 },
  adicional: { generales: 1000, dayPass: 500 },
  diaDeRenovacion: 1,
  inicio: "2026-09-01",
};

/** n conversaciones de chats distintos, una por minuto a partir de `desdeMin`. */
const fila = (prefijo: string, n: number, desdeMin = 0): Conversacion[] =>
  Array.from({ length: n }, (_, i) => ({
    chat: `${prefijo}${i}`,
    inicio: new Date(Date.UTC(2026, 8, 1, 12, desdeMin + i)).toISOString(),
  }));

const chats = (cs: Conversacion[]) => new Set(cs.map((c) => c.chat));

describe("el plan de Yali", () => {
  it("ciclo desde el 1, 1.000 sin Day Pass y 500 de Day Pass, más sus paquetes", () => {
    expect(PLANES.yaly).toEqual(plan);
  });
});

describe("qué es una conversación: una sesión de 24 horas", () => {
  const r = (waFrom: string, ts: string) => ({ waFrom, ts });

  it("varias respuestas dentro de las 24 h son una sola", () => {
    const c = conversacionesDelCiclo([
      r("a", "2026-09-01T10:00:00Z"),
      r("a", "2026-09-01T18:00:00Z"),
      r("a", "2026-09-02T09:59:00Z"),
    ]);
    expect(c).toEqual([{ chat: "a", inicio: "2026-09-01T10:00:00.000Z" }]);
  });

  it("pasadas las 24 h desde el INICIO es otra, aunque no haya habido pausa", () => {
    const c = conversacionesDelCiclo([
      r("a", "2026-09-01T10:00:00Z"),
      r("a", "2026-09-02T09:00:00Z"),
      r("a", "2026-09-02T10:00:00Z"),
    ]);
    expect(c.map((x) => x.inicio)).toEqual(["2026-09-01T10:00:00.000Z", "2026-09-02T10:00:00.000Z"]);
  });

  it("la misma persona que vuelve a los tres días es otra conversación", () => {
    const c = conversacionesDelCiclo([r("a", "2026-09-01T10:00:00Z"), r("a", "2026-09-04T10:00:00Z")]);
    expect(c).toHaveLength(2);
  });

  it("quedan en orden de inicio, mezclando chats", () => {
    const c = conversacionesDelCiclo([
      r("b", "2026-09-01T11:00:00Z"),
      r("a", "2026-09-01T12:00:00Z"),
      r("a", "2026-09-01T10:00:00Z"),
    ]);
    expect(c.map((x) => x.chat)).toEqual(["a", "b"]);
  });
});

describe("el corte del ciclo", () => {
  it("una sesión que viene abierta del ciclo anterior no se cuenta otra vez", () => {
    // Empezó el 31 de agosto 11 p.m. SV (1 sept 05:00 UTC) y siguió después
    // de medianoche: es de agosto. La de las 3 p.m. del 1 de septiembre (21:00
    // UTC) cae dentro de las 24 h, así que es la misma y tampoco cuenta.
    const c = conversacionesQueArrancanEn(
      [
        { waFrom: "a", ts: "2026-09-01T05:00:00Z" },
        { waFrom: "a", ts: "2026-09-01T07:00:00Z" },
        { waFrom: "a", ts: "2026-09-01T21:00:00Z" },
        { waFrom: "b", ts: "2026-09-01T07:00:00Z" },
      ],
      "2026-09-01T06:00:00.000Z",
    );
    expect(c).toEqual([{ chat: "b", inicio: "2026-09-01T07:00:00.000Z" }]);
  });

  it("no hay ciclo anterior hasta que el plan cumpla su primer ciclo", () => {
    expect(hayCicloAnterior(new Date("2026-09-28T17:00:00Z"), plan)).toBe(false);
    expect(hayCicloAnterior(new Date("2026-10-01T06:00:00Z"), plan)).toBe(true);
  });
});

describe("las dos filas: sin Day Pass y Day Pass", () => {
  it("el Day Pass va aparte desde la primera: no gasta de las 1.000", () => {
    const dp = fila("dp", 300);
    const g = fila("g", 700, 300);
    const u = usoDelPlan([...dp, ...g], chats(dp), plan);
    expect(u.total).toBe(1000);
    expect(u.generales.plan).toEqual({ usadas: 700, incluidas: 1000, excedente: 0 });
    expect(u.dayPass.plan).toEqual({ usadas: 300, incluidas: 500, excedente: 0 });
    expect(u.generales.adicional.usadas).toBe(0);
    expect(u.dayPass.adicional.usadas).toBe(0);
    expect(u.generales.llenoEl).toBeNull();
  });

  it("sin Day Pass: desde la 1.001 corre el paquete adicional", () => {
    const g = fila("g", 1842);
    const u = usoDelPlan(g, new Set(), plan);
    expect(u.generales.total).toBe(1842);
    expect(u.generales.plan).toEqual({ usadas: 1000, incluidas: 1000, excedente: 0 });
    expect(u.generales.adicional).toEqual({ usadas: 842, incluidas: 1000, excedente: 0 });
    // Se llenó con la conversación 1.000, no con la 1.001.
    expect(u.generales.llenoEl).toBe(g[999].inicio);
  });

  it("Day Pass: desde la 501 corre su paquete adicional", () => {
    const dp = fila("dp", 771);
    const u = usoDelPlan(dp, chats(dp), plan);
    expect(u.dayPass.plan).toEqual({ usadas: 500, incluidas: 500, excedente: 0 });
    expect(u.dayPass.adicional).toEqual({ usadas: 271, incluidas: 500, excedente: 0 });
    expect(u.dayPass.llenoEl).toBe(dp[499].inicio);
    expect(u.generales.total).toBe(0);
  });

  it("el paquete adicional también puede pasarse", () => {
    const u = usoDelPlan(fila("g", 2040), new Set(), plan);
    expect(u.generales.adicional).toEqual({ usadas: 1040, incluidas: 1000, excedente: 40 });
  });

  it("al arrancar el ciclo todo está en cero", () => {
    const u = usoDelPlan([], new Set(), plan);
    expect(u.total).toBe(0);
    expect(u.generales.plan.usadas).toBe(0);
    expect(u.dayPass.plan.usadas).toBe(0);
    expect(u.generales.llenoEl).toBeNull();
  });

  it("un chat de Day Pass: todas sus conversaciones del ciclo son de Day Pass", () => {
    const u = usoDelPlan(
      [
        { chat: "a", inicio: "2026-09-01T10:00:00Z" },
        { chat: "a", inicio: "2026-09-05T10:00:00Z" },
        { chat: "b", inicio: "2026-09-06T10:00:00Z" },
      ],
      new Set(["a", "de-otro-ciclo"]),
      plan,
    );
    expect(u.dayPass.total).toBe(2);
    expect(u.generales.total).toBe(1);
  });
});

describe("los ids del análisis y del consumo", () => {
  it("redes: metac-<canal>-<página>-<persona> es <canal>:<persona>", () => {
    expect(idDeConsumo("metac-facebook-334822829710741-28396926209958")).toBe("facebook:28396926209958");
    expect(idDeConsumo("metac-instagram-108604138639295-1081081354381463")).toBe("instagram:1081081354381463");
  });

  it("WhatsApp: el teléfono es el mismo", () => {
    expect(idDeConsumo("50375391721")).toBe("50375391721");
  });
});

describe("el ciclo de facturación", () => {
  it("el ciclo en curso y el anterior, desde el 1 (hoy 28 de septiembre, 5 p.m. en El Salvador)", () => {
    const ahora = new Date("2026-09-28T23:00:00Z");
    expect(cicloEnCurso(ahora, 1)).toEqual({
      desde: "2026-09-01T06:00:00.000Z",
      hasta: "2026-10-01T06:00:00.000Z",
      etiqueta: "Septiembre 2026",
    });
    expect(cicloEnCurso(ahora, 1, true).etiqueta).toBe("Agosto 2026");
  });

  it("de noche en El Salvador el 30 de septiembre sigue siendo septiembre", () => {
    // 30 sept 11 p.m. SV = 1 oct 5 a.m. UTC.
    expect(cicloEnCurso(new Date("2026-10-01T05:00:00Z"), 1).etiqueta).toBe("Septiembre 2026");
    expect(cicloEnCurso(new Date("2026-10-01T06:00:00Z"), 1).etiqueta).toBe("Octubre 2026");
  });

  it("con renovación el 1, es el mes calendario, cortado en hora de El Salvador", () => {
    const c = cicloDelPlan("2026-09-25T06:00:00.000Z", 1);
    expect(c).toEqual({
      desde: "2026-09-01T06:00:00.000Z",
      hasta: "2026-10-01T06:00:00.000Z",
      etiqueta: "Septiembre 2026",
    });
  });

  it("con renovación el 27: del 27 al 26 del mes siguiente", () => {
    // Hoy 27 de septiembre: ya arrancó el ciclo nuevo.
    expect(cicloDelPlan("2026-09-28T06:00:00.000Z", 27)).toEqual({
      desde: "2026-09-27T06:00:00.000Z",
      hasta: "2026-10-27T06:00:00.000Z",
      etiqueta: "27 sept al 26 oct",
    });
    // El 26 todavía es el ciclo anterior.
    expect(cicloDelPlan("2026-09-27T06:00:00.000Z", 27).desde).toBe("2026-08-27T06:00:00.000Z");
  });

  it("una renovación el 31 cae el último día de los meses cortos, como Stripe", () => {
    // El 29 de septiembre sigue el ciclo que arrancó el 31 de agosto...
    const c = cicloDelPlan("2026-09-30T06:00:00.000Z", 31);
    expect(c.desde).toBe("2026-08-31T06:00:00.000Z");
    expect(c.hasta).toBe("2026-09-30T06:00:00.000Z");
    // ...y el 30 (último día de septiembre) ya arranca el siguiente.
    expect(cicloDelPlan("2026-10-01T06:00:00.000Z", 31).desde).toBe("2026-09-30T06:00:00.000Z");
    expect(cicloDelPlan("2026-10-02T06:00:00.000Z", 31).desde).toBe("2026-09-30T06:00:00.000Z");
  });

  it("el ciclo de diciembre cruza el año", () => {
    const c = cicloDelPlan("2026-12-20T06:00:00.000Z", 15);
    expect(c.hasta).toBe("2027-01-15T06:00:00.000Z");
    expect(c.etiqueta).toBe("15 dic al 14 ene 2027");
  });
});
