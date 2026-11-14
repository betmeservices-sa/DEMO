import { describe, expect, it } from "vitest";
import { BASE_LAB } from "@/lib/consultorio/lab-kb-datos";

// 2026-11-13: tres exámenes de la base se habían cruzado con la fila vecina del
// Excel. El hemograma completo salía a $6.00 (que es el recuento de plaquetas
// solo) y el látex RA con el precio del látex L.E. El hub los tenía bien.
const ex = (id: string) => BASE_LAB.examenes.find((e) => e.id === id);

describe("cruces del Excel del lab", () => {
  it("hemograma completo $9.75 y el recuento de plaquetas aparte a $6.00", () => {
    expect(ex("lab-hemograma")?.precio).toBe(9.75);
    expect(ex("lab-hemograma")?.sinonimos).not.toContain("plaquetas");
    expect(ex("lab-xl-01004")?.precio).toBe(6);
    expect(ex("lab-xl-01001")).toBeUndefined();
  });

  it("látex RA $11.40 y látex L.E. aparte a $12.10", () => {
    expect(ex("lab-latex-ra")?.precio).toBe(11.4);
    expect(ex("lab-xl-05006")?.precio).toBe(12.1);
  });

  it("el CA 15-3 sale una sola vez, al precio del hub", () => {
    expect(ex("lab-ca153")?.precio).toBe(87.72);
    expect(ex("lab-xl-07005")).toBeUndefined();
  });
});
