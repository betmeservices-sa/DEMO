// A quién se le escribe al minuto de colgar con Sofía de Nissan, y a quién no.
//
// Cada envío es un WhatsApp a una persona real y se cobra, así que lo que se
// prueba acá no es tanto el sí como los no: un "Hola ," o un mensaje a quien
// pidió que no lo molesten cuestan más que el mensaje que no sale.

import { describe, expect, it } from "vitest";
import {
  SEGUIMIENTO,
  SIN_MODELO,
  comoSeLlama,
  decidirSeguimiento,
  primerNombre,
  textoDe,
} from "@/lib/plantilla-nissan";

const TEL = "50370020001";
const base = { nombre: "Ana Beatriz Reyes", modelos: ["X-Trail"], telefono: TEL };

describe("a quién se le escribe", () => {
  it("al que llamó preguntando por un modelo", () => {
    const d = decidirSeguimiento(base);
    expect(d.enviar).toBe(true);
    if (!d.enviar) return;
    expect(d.plantilla).toBe(SEGUIMIENTO);
    expect(d.variables).toEqual(["Ana", "X-Trail"]);
    expect(d.minutos).toBe(1);
  });

  it("también al que no dijo qué modelo: ahí es donde más falta hace", () => {
    const d = decidirSeguimiento({ ...base, modelos: [] });
    expect(d.enviar).toBe(true);
    if (!d.enviar) return;
    expect(d.variables[1]).toBe(SIN_MODELO);
  });

  it("y al que NO contestó la pregunta de si le escribimos", () => {
    // `undefined` es "no se llegó a preguntar", que es casi siempre el que no
    // contestó el teléfono: justo a quien hay que seguir por escrito.
    const d = decidirSeguimiento({ ...base, acepta: undefined });
    expect(d.enviar).toBe(true);
  });
});

describe("a quién NO", () => {
  it("al que dijo expresamente que no", () => {
    const d = decidirSeguimiento({ ...base, acepta: false });
    expect(d.enviar).toBe(false);
    if (d.enviar) return;
    expect(d.motivo).toContain("no le escribiéramos");
  });

  it("al que no sabemos cómo se llama: la plantilla exige el nombre", () => {
    const d = decidirSeguimiento({ ...base, nombre: null });
    expect(d.enviar).toBe(false);
  });

  it("al número que no es marcable", () => {
    const d = decidirSeguimiento({ ...base, telefono: "123" });
    expect(d.enviar).toBe(false);
  });
});

describe("cómo queda el mensaje", () => {
  it("el nombre es el primero y va con mayúscula", () => {
    expect(primerNombre("  ana BEATRIZ reyes ")).toBe("Ana");
    expect(primerNombre(null)).toBe("");
  });

  it("del catálogo se nombra UNO: dos ya suena a folleto", () => {
    expect(comoSeLlama(["Kicks", "Qashqai"])).toBe("Kicks");
    expect(comoSeLlama(["  ", "Frontier"])).toBe("Frontier");
    expect(comoSeLlama([])).toBe(SIN_MODELO);
  });

  it("el texto guardado es el mismo que se manda, variable por variable", () => {
    // Si estos dos se separan, el panel muestra un mensaje que la persona nunca
    // recibió, y nadie se entera hasta que alguien compara los dos teléfonos.
    const d = decidirSeguimiento(base);
    expect(d.enviar).toBe(true);
    if (!d.enviar) return;
    expect(d.texto).toBe(textoDe(d.variables[0], d.variables[1]));
    expect(d.texto).toContain("Ana");
    expect(d.texto).toContain("X-Trail");
  });
});
