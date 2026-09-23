// Comparar candidatos: quien gana cada fila, el tope de tres y la etapa.
import { describe, expect, it } from "vitest";
import { avanceEtapa, comparar, mejoresDe, promedioScorecards, siguienteEtapa, vacanteSugerida, MAX_COMPARAR } from "@/lib/talento/comparar";
import { alternar } from "@/lib/talento/seleccion";
import { sembrarTalento } from "@/lib/talento/seed";

const s = sembrarTalento(new Date("2026-09-23T16:00:00Z"));
const v1 = s.vacantes.find((v) => v.id === "v1")!;

describe("mejoresDe", () => {
  it("gana el más alto y los empates ganan juntos", () => {
    expect(mejoresDe([3, 5, 1])).toEqual([1]);
    expect(mejoresDe([5, 5, 1])).toEqual([0, 1]);
  });
  it("si todos empatan o compite uno solo, no gana nadie", () => {
    expect(mejoresDe([4, 4, 4])).toEqual([]);
    expect(mejoresDe([4])).toEqual([]);
    expect(mejoresDe([4, null])).toEqual([]);
  });
  it("los null no compiten", () => {
    expect(mejoresDe([null, 2, 3])).toEqual([2]);
  });
});

describe("comparar contra una vacante", () => {
  const cmp = comparar(s, ["c01", "c02", "c31"], v1);
  const fila = (id: string) => cmp.filas.find((f) => f.id === id)!;

  it("tiene el match, el desglose por criterio y el perfil", () => {
    for (const id of ["match", "c-skills", "c-deseables", "c-ingles", "c-experiencia", "c-salario", "c-ubicacion", "c-disponibilidad", "c-disc", "requeridas", "deseables", "ingles", "experiencia", "pretension", "ubicacion", "disponibilidad", "disc", "scorecards", "etapa"]) {
      expect(fila(id), id).toBeDefined();
      expect(fila(id).celdas).toHaveLength(3);
    }
  });

  it("el match es el mismo puntaje del matching", () => {
    expect(fila("match").celdas.map((c) => c.valor)).toEqual(cmp.matches.map((m) => m.score));
  });

  it("gana inglés quien tiene el nivel más alto", () => {
    // c01 C1, c02 C2, c31 C2
    expect(fila("ingles").mejores).toEqual([1, 2]);
  });

  it("en pretensión gana quien pide menos", () => {
    // c01 $1050, c02 $1100, c31 $1100
    expect(fila("pretension").mejores).toEqual([0]);
    expect(fila("pretension").celdas[0].detalle).toBe("$50 bajo el tope");
  });

  it("separa las skills que cumple de las que faltan", () => {
    const c = fila("requeridas").celdas[0];
    expect(c.si!.length + c.no!.length).toBe(v1.requisitos.skills.length);
  });

  it("la etapa gana quien va más adelante; fuera del pipeline no compite", () => {
    // c01 entrevista, c02 prueba, c31 fuera
    expect(fila("etapa").celdas[2].texto).toBe("Fuera del pipeline");
    expect(fila("etapa").mejores).toEqual([1]);
  });

  it("scorecards promedia todas las notas", () => {
    expect(promedioScorecards(s, "c01")).toBe(4.6);
    expect(promedioScorecards(s, "c31")).toBeNull();
  });

  it("nunca compara más de tres", () => {
    expect(comparar(s, ["c01", "c02", "c31", "c06"], v1).candidatos).toHaveLength(MAX_COMPARAR);
  });
});

describe("etapas", () => {
  it("descartado no compite y contratado no avanza", () => {
    expect(avanceEtapa(null)).toBeNull();
    expect(avanceEtapa({ ...s.postulaciones[0], etapa: "descartado" })).toBeNull();
    expect(siguienteEtapa("oferta")).toBe("contratado");
    expect(siguienteEtapa("contratado")).toBeNull();
    expect(siguienteEtapa("descartado")).toBeNull();
  });
});

describe("selección", () => {
  it("se bloquea en tres y quitar libera el lugar", () => {
    let sel = { ids: [] as string[], vacanteId: null as string | null };
    for (const id of ["c01", "c02", "c03", "c04"]) sel = alternar(sel, id, "v1");
    expect(sel.ids).toEqual(["c01", "c02", "c03"]);
    expect(sel.vacanteId).toBe("v1");
    sel = alternar(sel, "c02");
    sel = alternar(sel, "c04");
    expect(sel.ids).toEqual(["c01", "c03", "c04"]);
  });
  it("al vaciarla se olvida la vacante", () => {
    const sel = alternar({ ids: ["c01"], vacanteId: "v1" }, "c01");
    expect(sel).toEqual({ ids: [], vacanteId: null });
  });
});

describe("vacante sugerida", () => {
  it("elige la vacante abierta donde mejor encajan juntos", () => {
    expect(vacanteSugerida(s, ["c07", "c08", "c35"])!.id).toBe("v2");
    expect(vacanteSugerida(s, ["c29", "c19"])!.id).toBe("v5");
  });
});
