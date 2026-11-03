// La hoja de Excel de los paquetes: cabecera y una fila por paquete, con sus
// 1.000 normales y 500 de Day Pass y lo usado de cada una.
import { describe, expect, it } from "vitest";
import { CABECERA_PAQUETES, fechaExcel, filasParaExcel } from "@/lib/paquetes-excel";
import type { FilaDePaquete } from "@/lib/plan-conversaciones";

describe("la hoja de paquetes", () => {
  const filas: FilaDePaquete[] = [
    {
      ciclo: "Octubre 2026",
      numero: 1,
      inicio: "2026-10-01T07:02:25.000Z",
      fin: "2026-10-13T21:29:26.000Z",
      usadas: 1000,
      incluidas: 1000,
      dayPassUsadas: 500,
      dayPassIncluidas: 500,
      estado: "lleno",
    },
    {
      ciclo: "Octubre 2026",
      numero: 3,
      inicio: "2026-10-28T15:20:52.000Z",
      fin: null,
      usadas: 315,
      incluidas: 1000,
      dayPassUsadas: 0,
      dayPassIncluidas: 500,
      estado: "cerrado",
    },
  ];

  it("fechas en hora de El Salvador, sin coma", () => {
    expect(fechaExcel("2026-10-13T21:29:26.000Z")).toBe("13/10/2026 15:29");
    expect(fechaExcel(null)).toBe("");
  });

  it("cabecera y una fila por paquete con normales y Day Pass", () => {
    const hoja = filasParaExcel(filas);
    expect(hoja[0]).toEqual([...CABECERA_PAQUETES]);
    expect(hoja[1]).toEqual(["Octubre 2026", 1, "01/10/2026 01:02", "13/10/2026 15:29", 1000, 1000, 500, 500, "Se acabó"]);
    expect(hoja[2]).toEqual(["Octubre 2026", 3, "28/10/2026 09:20", "", 315, 1000, 0, 500, "Cerró el mes sin llenarse"]);
  });
});
