import { describe, expect, it } from "vitest";
import { conLoDelTraspaso } from "@/lib/memoria-webhook";

// Evaluaciones de CEGISA (6 y 7/11): cinco llamadas con traspaso entre las
// Valerias quedaron "sin nada que recordar", porque el reporte de fin de
// llamada lo arma el último agente y solo ve su parte. Lo que viajó en el
// traspaso está en las variables de la llamada y llena esos huecos.

describe("la memoria con lo que viajó en un traspaso", () => {
  it("llena nombre, motivo y resumen vacíos con las variables del traspaso", () => {
    const e = conLoDelTraspaso(
      { modelos: [] },
      { viene_de: "laboratorio", consulta: "precio de la mamografía", resumen: "Es para su mamá, tiene Asesuisa", nombre: "Karen" },
    );
    expect(e.nombre).toBe("Karen");
    expect(e.uso).toBe("precio de la mamografía");
    expect(e.resumen).toBe("Es para su mamá, tiene Asesuisa. precio de la mamografía");
  });

  it("lo que el agente extrajo manda", () => {
    const e = conLoDelTraspaso(
      { nombre: "Ana", uso: "ultra 4D", resumen: "Preguntó por la 4D" },
      { viene_de: "recepcion", consulta: "otra cosa", nombre: "Otra" },
    );
    expect(e).toEqual({ nombre: "Ana", uso: "ultra 4D", resumen: "Preguntó por la 4D" });
  });

  it("sin traspaso no cambia nada", () => {
    const vacio = { modelos: [] };
    expect(conLoDelTraspaso(vacio, { consulta: "algo" })).toBe(vacio);
    expect(conLoDelTraspaso(vacio, undefined)).toBe(vacio);
  });
});
