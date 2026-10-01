// El plan de conversaciones de Yali en su ciclo de facturación.
//
// Lo acordado (2026-10-01): por PAQUETES de 1.000 conversaciones sin Day Pass
// y 500 de Day Pass; el plan del mes es el primero. Los paquetes se llenan en
// orden: cada conversación usa el más viejo que tenga lugar de su tipo, y la que
// no cabe en ninguno abre otro. Una conversación es una sesión de 24 horas,
// como dice la propuesta.
// El ciclo de Yali arranca el 1 de septiembre (mes calendario).
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

describe("los paquetes se llenan en orden", () => {
  /** Mezcla dos filas en orden de inicio, como llegan del ciclo. */
  const mezcla = (...filas: Conversacion[][]) =>
    filas.flat().sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio) || a.chat.localeCompare(b.chat));

  /** Una secuencia en orden: "G" = normal, "D" = Day Pass, una por minuto. */
  const secuencia = (patron: string) => {
    const convs: Conversacion[] = [...patron].map((t, i) => ({
      chat: `${t}${i}`,
      inicio: new Date(Date.UTC(2026, 8, 1, 12, i)).toISOString(),
    }));
    const dp = new Set(convs.filter((c) => c.chat.startsWith("D")).map((c) => c.chat));
    return { convs, dp, de: (t: "G" | "D") => convs.filter((c) => c.chat.startsWith(t)) };
  };
  const chico = { ...plan, incluidas: { generales: 10, dayPass: 5 }, adicional: { generales: 10, dayPass: 5 } };

  it("dentro del plan: un tipo no gasta del otro", () => {
    const dp = fila("dp", 300);
    const g = fila("g", 700, 300);
    const u = usoDelPlan(mezcla(dp, g), chats(dp), plan);
    expect([u.total, u.generales, u.dayPass, u.consumidos]).toEqual([1000, 700, 300, 0]);
    expect(u.paquetes).toHaveLength(1);
    expect(u.paquetes[0]).toEqual({
      numero: 1,
      abre: null,
      abrioPor: null,
      generales: { usadas: 700, incluidas: 1000, llenoEl: null, delOtroAlLlenarse: null },
      dayPass: { usadas: 300, incluidas: 500, llenoEl: null, delOtroAlLlenarse: null },
    });
    expect(u.enUso).toEqual({ generales: 1, dayPass: 1 });
  });

  it("se acaban las normales: abre el paquete 2, pero el Day Pass sigue saliendo del plan hasta llenarlo", () => {
    // Plan: 10 normales y 3 de Day Pass; la normal 11 abre el 2; después
    // 2 de Day Pass llenan el plan y 1 más ya sale del 2.
    const { convs, dp, de } = secuencia("DDD" + "G".repeat(10) + "G" + "DD" + "D" + "GG");
    const u = usoDelPlan(convs, dp, chico);
    expect(u.consumidos).toBe(1);
    const [p1, p2] = u.paquetes;
    // Cuando se llenaron sus normales, el plan llevaba 3 de Day Pass; cuando se
    // llenó su Day Pass, ya tenía las 10 normales.
    expect(p1!.generales).toEqual({ usadas: 10, incluidas: 10, llenoEl: de("G")[9]!.inicio, delOtroAlLlenarse: 3 });
    expect(p1!.dayPass).toEqual({ usadas: 5, incluidas: 5, llenoEl: de("D")[4]!.inicio, delOtroAlLlenarse: 10 });
    expect(p2).toMatchObject({ numero: 2, abre: de("G")[10]!.inicio, abrioPor: "generales" });
    expect(p2!.generales).toEqual({ usadas: 3, incluidas: 10, llenoEl: null, delOtroAlLlenarse: null });
    expect(p2!.dayPass).toEqual({ usadas: 1, incluidas: 5, llenoEl: null, delOtroAlLlenarse: null });
    expect(u.enUso).toEqual({ generales: 2, dayPass: 2 });
  });

  it("mientras al plan le quede Day Pass, el Day Pass sale del plan aunque ya corra el paquete 2", () => {
    const { convs, dp } = secuencia("DD" + "G".repeat(11) + "D");
    const u = usoDelPlan(convs, dp, chico);
    expect(u.paquetes[0]!.dayPass.usadas).toBe(3);
    expect(u.paquetes[1]!.dayPass.usadas).toBe(0);
    expect(u.enUso).toEqual({ generales: 2, dayPass: 1 });
  });

  it("si se acaba primero el Day Pass, es lo mismo al revés: las normales siguen saliendo del plan", () => {
    const { convs, dp, de } = secuencia("GGG" + "D".repeat(5) + "D" + "GG");
    const u = usoDelPlan(convs, dp, chico);
    expect(u.consumidos).toBe(1);
    expect(u.paquetes[1]).toMatchObject({ numero: 2, abre: de("D")[5]!.inicio, abrioPor: "dayPass" });
    expect(u.paquetes[0]!.generales.usadas).toBe(5);
    expect(u.paquetes[1]!.generales.usadas).toBe(0);
    expect(u.paquetes[1]!.dayPass.usadas).toBe(1);
    expect(u.enUso).toEqual({ generales: 1, dayPass: 2 });
  });

  it("septiembre de Yali en chico: el plan y el paquete 2 se acaban por las normales y el mes cierra en el 3", () => {
    // Plan: 4 de Day Pass y 10 normales; la normal 11 abre el 2. Un Day Pass
    // llena el plan; 9 normales más llenan el 2; la normal 21 abre el 3. Después
    // 2 de Day Pass salen del 2, que todavía tiene lugar.
    const { convs, dp, de } = secuencia("DDDD" + "G".repeat(10) + "G" + "D" + "G".repeat(9) + "G" + "GG" + "DD");
    const u = usoDelPlan(convs, dp, chico);
    expect([u.generales, u.dayPass, u.consumidos]).toEqual([23, 7, 2]);
    expect(u.paquetes.map((x) => [x.numero, x.abrioPor, x.abre])).toEqual([
      [1, null, null],
      [2, "generales", de("G")[10]!.inicio],
      [3, "generales", de("G")[20]!.inicio],
    ]);
    expect(u.paquetes[0]!.generales.llenoEl).toBe(de("G")[9]!.inicio);
    expect(u.paquetes[0]!.dayPass.llenoEl).toBe(de("D")[4]!.inicio);
    expect(u.paquetes[1]!.generales.llenoEl).toBe(de("G")[19]!.inicio);
    expect(u.paquetes[1]!.dayPass).toEqual({ usadas: 2, incluidas: 5, llenoEl: null, delOtroAlLlenarse: null });
    expect(u.paquetes[2]!.generales).toEqual({ usadas: 3, incluidas: 10, llenoEl: null, delOtroAlLlenarse: null });
    expect(u.paquetes[2]!.dayPass).toEqual({ usadas: 0, incluidas: 5, llenoEl: null, delOtroAlLlenarse: null });
    expect(u.enUso).toEqual({ generales: 3, dayPass: 2 });
  });

  it("si el paquete adicional no trae de ese tipo, queda de más en el último", () => {
    const sinAdicional = { ...plan, adicional: { generales: 0, dayPass: 0 } };
    const u = usoDelPlan(fila("g", 1040), new Set(), sinAdicional);
    expect(u.paquetes).toHaveLength(1);
    expect(u.paquetes[0]!.generales.usadas).toBe(1040);
  });

  it("al arrancar el ciclo todo está en cero", () => {
    const u = usoDelPlan([], new Set(), plan);
    expect(u.total).toBe(0);
    expect(u.consumidos).toBe(0);
    expect(u.paquetes).toEqual([
      {
        numero: 1,
        abre: null,
        abrioPor: null,
        generales: { usadas: 0, incluidas: 1000, llenoEl: null, delOtroAlLlenarse: null },
        dayPass: { usadas: 0, incluidas: 500, llenoEl: null, delOtroAlLlenarse: null },
      },
    ]);
    expect(u.enUso).toEqual({ generales: 1, dayPass: 1 });
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
    expect(u.dayPass).toBe(2);
    expect(u.generales).toBe(1);
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
