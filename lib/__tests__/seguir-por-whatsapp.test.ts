// "Seguimos por WhatsApp" desde la llamada de Sofía: a quién se le manda, con
// qué nombre, y que el texto del hilo sea el de la plantilla aprobada.
import { describe, expect, it } from "vitest";
import { numeroWhatsApp, primerNombre, textoMia, variablesMia } from "@/lib/seguir-por-whatsapp";

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
    expect(variablesMia("CARLOS PÉREZ")).toEqual(["Carlos"]);
  });

  it("sin nombre saluda 'de nuevo', nunca vacío", () => {
    expect(variablesMia(undefined)).toEqual(["de nuevo"]);
    expect(variablesMia("no disponible")).toEqual(["de nuevo"]);
    expect(textoMia("")).toMatch(/^Hola de nuevo, soy Mia/);
  });
});

describe("el texto del hilo", () => {
  it("es el de la plantilla mia_continuar_demo, sin asesoras", () => {
    const t = textoMia("Ana");
    expect(t).toMatch(/^Hola Ana, soy Mia, el agente de IA de MiAgentIA\. Estoy aquí para continuar con la demo por WhatsApp\./);
    expect(t).toMatch(/¿Qué te gustaría probar\?/);
    expect(t).not.toMatch(/asesor/i);
  });
});
