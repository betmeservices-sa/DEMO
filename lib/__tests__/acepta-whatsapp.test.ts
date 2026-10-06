import { describe, expect, it } from "vitest";
import { aceptaWhatsapp } from "../acepta-whatsapp";

describe("aceptaWhatsapp", () => {
  it("el sí y el no expresos", () => {
    expect(aceptaWhatsapp("si")).toBe(true);
    expect(aceptaWhatsapp("Sí")).toBe(true);
    expect(aceptaWhatsapp(" no ")).toBe(false);
  });

  it("sin respuesta NO es un no: se le escribe igual", () => {
    expect(aceptaWhatsapp("sin_respuesta")).toBeUndefined();
    expect(aceptaWhatsapp("")).toBeUndefined();
    expect(aceptaWhatsapp(null)).toBeUndefined();
    expect(aceptaWhatsapp(undefined)).toBeUndefined();
  });

  it("sigue entendiendo el booleano del esquema viejo", () => {
    expect(aceptaWhatsapp(true)).toBe(true);
    expect(aceptaWhatsapp(false)).toBe(false);
  });
});
