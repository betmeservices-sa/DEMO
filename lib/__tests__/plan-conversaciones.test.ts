// El plan de conversaciones de Yali en su ciclo de facturación.
//
// Lo acordado: las primeras 1.000 conversaciones del ciclo (en orden, del tema
// que sean) son del plan, ya pagadas. Desde la 1.001 corre un paquete de 1.000
// generales y 500 de Day Pass; el Day Pass que pase de 500 cuenta en el
// general. Una conversación es una sesión de 24 horas, como dice la propuesta.
import { describe, expect, it } from "vitest";
import {
  cicloDelPlan,
  conversacionesDelCiclo,
  idDeConsumo,
  usoDelPlan,
  type Conversacion,
} from "@/lib/plan-conversaciones";

const plan = { plan: 1000, paquete: { generales: 1000, dayPass: 500 }, diaDeRenovacion: 1 };

/** n conversaciones de chats distintos, una por minuto a partir de `desdeMin`. */
const fila = (prefijo: string, n: number, desdeMin = 0): Conversacion[] =>
  Array.from({ length: n }, (_, i) => ({
    chat: `${prefijo}${i}`,
    inicio: new Date(Date.UTC(2026, 8, 1, 12, desdeMin + i)).toISOString(),
  }));

const chats = (cs: Conversacion[]) => new Set(cs.map((c) => c.chat));

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

describe("el plan y el paquete", () => {
  it("las primeras 1.000 son del plan aunque sean de Day Pass", () => {
    const dp = fila("dp", 300);
    const g = fila("g", 700, 300);
    const u = usoDelPlan([...dp, ...g], chats(dp), plan);
    expect(u.plan).toMatchObject({ usadas: 1000, incluidas: 1000, dayPass: 300 });
    expect(u.plan.llenoEl).toBe(g[g.length - 1].inicio);
    expect(u.paquete.total).toBe(0);
    expect(u.paquete.generales.usadas).toBe(0);
    expect(u.paquete.dayPass.usadas).toBe(0);
  });

  it("desde la 1.001: Day Pass a su cupo, lo demás al general", () => {
    const delPlan = fila("p", 1000);
    const dp = fila("dp", 245, 1000);
    const g = fila("g", 790, 1245);
    const u = usoDelPlan([...delPlan, ...dp, ...g], chats(dp), plan);
    expect(u.total).toBe(2035);
    expect(u.totalDayPass).toBe(245);
    expect(u.paquete.total).toBe(1035);
    expect(u.paquete.dayPass).toEqual({ usadas: 245, incluidas: 500, excedente: 0 });
    expect(u.paquete.generales).toEqual({ usadas: 790, incluidas: 1000, excedente: 0 });
  });

  it("el Day Pass sobre su cupo pasa al general, y el general puede pasarse", () => {
    const delPlan = fila("p", 1000);
    const dp = fila("dp", 560, 1000);
    const g = fila("g", 980, 1560);
    const u = usoDelPlan([...delPlan, ...dp, ...g], chats(dp), plan);
    expect(u.paquete.dayPassSobreCupo).toBe(60);
    expect(u.paquete.dayPass).toEqual({ usadas: 560, incluidas: 500, excedente: 60 });
    expect(u.paquete.generales).toEqual({ usadas: 1040, incluidas: 1000, excedente: 40 });
  });

  it("al arrancar el ciclo todo está en cero", () => {
    const u = usoDelPlan([], new Set(), plan);
    expect(u.total).toBe(0);
    expect(u.plan).toMatchObject({ usadas: 0, llenoEl: null });
    expect(u.paquete.generales).toEqual({ usadas: 0, incluidas: 1000, excedente: 0 });
    expect(u.paquete.dayPass).toEqual({ usadas: 0, incluidas: 500, excedente: 0 });
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
    expect(u.totalDayPass).toBe(2);
    expect(u.plan.dayPass).toBe(2);
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
