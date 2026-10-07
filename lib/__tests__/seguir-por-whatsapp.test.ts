// "Seguimos por WhatsApp" desde la llamada de Sofía: a quién se le manda, con
// qué nombre, y que el texto del hilo sea el de la plantilla aprobada.
import { describe, expect, it } from "vitest";
import { PLANTILLA_SOFIA, numeroWhatsApp, primerNombre, textoSofia, variablesSofia } from "@/lib/seguir-por-whatsapp";

describe("el número", () => {
  it("acepta el de Vapi con +, y completa el 503 si vino local", () => {
    expect(numeroWhatsApp("+50375391721")).toBe("50375391721");
    expect(numeroWhatsApp("7539-1721")).toBe("50375391721");
    expect(numeroWhatsApp("+502 5788 1234")).toBe("50257881234");
  });

  it("sin número útil no manda nada", () => {
    expect(numeroWhatsApp("")).toBeNull();
    expect(numeroWhatsApp(undefined)).toBeNull();
    expect(numeroWhatsApp("12345")).toBeNull();
  });
});

describe("el nombre del saludo", () => {
  it("usa el primer nombre, bien escrito", () => {
    expect(primerNombre("maría josé lópez")).toBe("María");
    expect(variablesSofia("CARLOS PÉREZ")).toEqual(["Carlos"]);
  });

  it("sin nombre saluda 'de nuevo', nunca vacío", () => {
    expect(variablesSofia(undefined)).toEqual(["de nuevo"]);
    expect(variablesSofia("no disponible")).toEqual(["de nuevo"]);
    expect(textoSofia("")).toMatch(/^Hola de nuevo, soy Sofía/);
  });
});

describe("la plantilla", () => {
  it("es la de Sofía, la misma de la llamada, sin asesoras", () => {
    expect(PLANTILLA_SOFIA).toBe("sofia_continuar_demo");
    const t = textoSofia("Ana");
    expect(t).toMatch(
      /^Hola Ana, soy Sofía, la asistente virtual de MiAgentIA\. Como quedamos en la llamada, sigo contigo por aquí para continuar la demo\./,
    );
    expect(t).toMatch(/¿Qué te gustaría probar\?/);
    expect(t).not.toMatch(/asesor|Mia\b/i);
  });
});
