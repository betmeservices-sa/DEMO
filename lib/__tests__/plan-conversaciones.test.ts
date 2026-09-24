// El plan de conversaciones con Day Pass aparte.
//
// Lo acordado con Yali: 1.000 generales al mes y 500 de Day Pass que NO cuentan
// en el general; pasadas las 500, cada Day Pass extra sí suma al general.
import { describe, expect, it } from "vitest";
import { idDeConsumo, mesDelPlan, usoDelPlan } from "@/lib/plan-conversaciones";

const plan = { generales: 1000, dayPass: 500 };
const ids = (prefijo: string, n: number) => Array.from({ length: n }, (_, i) => `${prefijo}${i}`);

describe("los dos contadores", () => {
  it("el Day Pass no gasta del general mientras no pase de 500", () => {
    const dp = ids("dp", 300);
    const u = usoDelPlan([...dp, ...ids("g", 700)], new Set(dp), plan);
    expect(u.dayPass).toEqual({ usadas: 300, incluidas: 500, excedente: 0 });
    expect(u.general).toEqual({ usadas: 700, incluidas: 1000, excedente: 0 });
    expect(u.dayPassAlGeneral).toBe(0);
  });

  it("pasadas las 500, el Day Pass extra suma al general", () => {
    const dp = ids("dp", 560);
    const u = usoDelPlan([...dp, ...ids("g", 1412)], new Set(dp), plan);
    expect(u.dayPass).toEqual({ usadas: 500, incluidas: 500, excedente: 0 });
    expect(u.dayPassAlGeneral).toBe(60);
    expect(u.general).toEqual({ usadas: 1472, incluidas: 1000, excedente: 472 });
    expect(u.total).toBe(1972);
  });

  it("una conversación cuenta una vez aunque tenga muchas respuestas", () => {
    const u = usoDelPlan(["a", "a", "a", "b"], new Set(["a"]), plan);
    expect(u.total).toBe(2);
    expect(u.dayPass.usadas).toBe(1);
    expect(u.general.usadas).toBe(1);
  });

  it("un Day Pass de otro mes que no se atendió este mes no cuenta", () => {
    const u = usoDelPlan(["g1"], new Set(["dp-viejo"]), plan);
    expect(u.dayPass.usadas).toBe(0);
    expect(u.general.usadas).toBe(1);
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
