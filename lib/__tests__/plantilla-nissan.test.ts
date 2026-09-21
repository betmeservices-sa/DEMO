// A quién se le escribe al minuto de colgar con Sofía de Nissan, y a quién no.
//
// Cada envío es un WhatsApp a una persona real y se cobra, así que lo que se
// prueba acá no es tanto el sí como los no: un "Hola ," o un mensaje a quien
// pidió que no lo molesten cuestan más que el mensaje que no sale.

import { describe, expect, it } from "vitest";
import {
  ACTIVA,
  PROPIA,
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
    expect(d.plantilla).toBe(ACTIVA.nombre);
    expect(d.variables[0]).toBe("Ana");
    expect(d.minutos).toBe(1);
  });

  it("también al que no dijo qué modelo: ahí es donde más falta hace", () => {
    const d = decidirSeguimiento({ ...base, modelos: [] });
    expect(d.enviar).toBe(true);
    if (!d.enviar) return;
    // Donde el modelo entra en el cuerpo, entra como "su consulta"; donde no
    // entra (la plantilla prestada) no aparece y tampoco estorba.
    expect(PROPIA.variables("Ana", SIN_MODELO)[1]).toBe(SIN_MODELO);
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

  it("el texto guardado es el mismo que se manda", () => {
    // Si estos dos se separan, el panel muestra un mensaje que la persona nunca
    // recibió, y nadie se entera hasta que alguien compara los dos teléfonos.
    const d = decidirSeguimiento(base);
    expect(d.enviar).toBe(true);
    if (!d.enviar) return;
    expect(d.texto).toBe(textoDe("Ana", "X-Trail"));
    expect(d.texto).toContain("Ana");
  });

  it("cada plantilla llena TODAS sus variables: Meta rechaza el envío si falta una", () => {
    for (const p of [PROPIA, ACTIVA]) {
      const vars = p.variables("Ana", "X-Trail");
      const pide = (p.texto("Ana", "X-Trail").match(/\{\{\d\}\}/g) ?? []).length;
      expect(pide, `${p.nombre} dejó un {{n}} sin reemplazar`).toBe(0);
      expect(vars.every((v) => v.trim() !== ""), `${p.nombre} manda una vacía`).toBe(true);
    }
  });

  it("la de Nissan sigue declarada, para volver cuando Meta la apruebe", () => {
    expect(PROPIA.nombre).toBe("nissan_seguimiento_llamada");
    expect(PROPIA.variables("Ana", "X-Trail")).toEqual(["Ana", "X-Trail"]);
  });
});
