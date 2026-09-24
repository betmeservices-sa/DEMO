// El plan de conversaciones: las primeras pagadas y, desde la siguiente, Day
// Pass (con su cupo) separado del resto.
//
// Lo acordado con Yali: 1.000 conversaciones al mes ya pagadas, en orden
// cronológico y de cualquier tema. Desde la 1.001, las de Day Pass van a un
// cupo de 500 y las demás son excedente; el Day Pass sobre su cupo también.
import { describe, expect, it } from "vitest";
import { conversacionesDelMes, idDeConsumo, mesDelPlan, usoDelPlan } from "@/lib/plan-conversaciones";

const plan = { incluidas: 1000, dayPass: 500 };

/** n conversaciones en fila, una por minuto a partir de `desdeMin`. */
const fila = (prefijo: string, n: number, desdeMin = 0) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${prefijo}${i}`,
    primera: new Date(Date.UTC(2026, 8, 1, 12, desdeMin + i)).toISOString(),
  }));

describe("las pagadas y lo que viene después", () => {
  it("las primeras 1.000 están pagadas aunque sean de Day Pass", () => {
    const dp = fila("dp", 300);
    const g = fila("g", 700, 300);
    const u = usoDelPlan([...dp, ...g], new Set(dp.map((c) => c.id)), plan);
    expect(u.pagadas).toMatchObject({ usadas: 1000, incluidas: 1000, excedente: 0, dayPass: 300 });
    expect(u.pagadas.llenoEl).toBe(g[g.length - 1].primera);
    expect(u.despues).toEqual({
      dayPass: { usadas: 0, incluidas: 500, excedente: 0 },
      sinDayPass: 0,
      dayPassSobreCupo: 0,
      excedente: 0,
    });
  });

  it("desde la 1.001 se separan Day Pass y el resto", () => {
    const pagadas = fila("p", 1000);
    const dp = fila("dp", 245, 1000);
    const g = fila("g", 790, 1245);
    const u = usoDelPlan([...pagadas, ...dp, ...g], new Set(dp.map((c) => c.id)), plan);
    expect(u.despues.dayPass).toEqual({ usadas: 245, incluidas: 500, excedente: 0 });
    expect(u.despues.sinDayPass).toBe(790);
    expect(u.despues.excedente).toBe(790);
    expect(u.total).toBe(2035);
  });

  it("el Day Pass que pasa de su cupo también es excedente", () => {
    const pagadas = fila("p", 1000);
    const dp = fila("dp", 560, 1000);
    const g = fila("g", 100, 1560);
    const u = usoDelPlan([...pagadas, ...dp, ...g], new Set(dp.map((c) => c.id)), plan);
    expect(u.despues.dayPass).toEqual({ usadas: 560, incluidas: 500, excedente: 60 });
    expect(u.despues.dayPassSobreCupo).toBe(60);
    expect(u.despues.excedente).toBe(160);
  });

  it("sin llegar a 1.000 no hay nada después", () => {
    const u = usoDelPlan(fila("g", 40), new Set(["g1"]), plan);
    expect(u.pagadas).toMatchObject({ usadas: 40, dayPass: 1, llenoEl: null });
    expect(u.despues.excedente).toBe(0);
  });

  it("un Day Pass de otro mes que no se atendió este mes no cuenta", () => {
    const u = usoDelPlan(fila("g", 1), new Set(["dp-viejo"]), plan);
    expect(u.totalDayPass).toBe(0);
  });
});

describe("el orden de la fila", () => {
  it("una conversación cuenta una vez, en el lugar de su PRIMERA respuesta", () => {
    const c = conversacionesDelMes([
      { waFrom: "b", ts: "2026-09-02T10:00:00Z" },
      { waFrom: "a", ts: "2026-09-03T10:00:00Z" },
      { waFrom: "a", ts: "2026-09-01T10:00:00Z" },
      { waFrom: "b", ts: "2026-09-05T10:00:00Z" },
    ]);
    expect(c).toEqual([
      { id: "a", primera: "2026-09-01T10:00:00Z" },
      { id: "b", primera: "2026-09-02T10:00:00Z" },
    ]);
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

describe("qué mes se mira", () => {
  it("el mes en que termina el periodo, cortado en hora de El Salvador", () => {
    // "7 días" el 24 de septiembre termina a la medianoche del 25 (SV).
    const m = mesDelPlan("2026-09-25T06:00:00.000Z");
    expect(m.etiqueta).toBe("Septiembre 2026");
    expect(m.desde).toBe("2026-09-01T06:00:00.000Z");
    expect(m.hasta).toBe("2026-10-01T06:00:00.000Z");
  });

  it("un rango que termina el 31 de agosto es agosto", () => {
    expect(mesDelPlan("2026-09-01T06:00:00.000Z").etiqueta).toBe("Agosto 2026");
  });
});
