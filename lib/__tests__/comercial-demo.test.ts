// MiAgentIA Comercial: el WhatsApp donde Mia hace la demo a quien viene de la
// conferencia. Lo que no puede pasar: que agende en una agenda real, que dé
// precios, o que arranque como una venta general en vez de la demostración.
import { describe, expect, it } from "vitest";
import { TENANTS, resolveTenantByLogin } from "@/lib/tenants";
import { MODULOS_AGENCIA, MODULOS_COMERCIAL } from "@/lib/modulos";

const guion = TENANTS.comercial.ai.systemPrompt;

describe("el panel comercial", () => {
  it("entra con demoa y no con demok", () => {
    expect(resolveTenantByLogin("demoagentia", "demoa")).toBe("comercial");
    expect(resolveTenantByLogin("demoagentia", "demok")).toBe("miagentia");
  });

  it("tiene sus leads, su bandeja y sus contactos; la agencia no ve los leads", () => {
    expect([...MODULOS_COMERCIAL]).toEqual(["leads", "bandeja", "contactos"]);
    expect(MODULOS_AGENCIA).not.toContain("leads");
  });

  it("habla por su propio número", () => {
    expect(TENANTS.comercial.whatsapp?.phoneNumberId).toBe("1344094815455988");
  });
});

describe("Mia en modo demo", () => {
  it("sabe que quien escribe viene a probar la demo y la ofrece de entrada", () => {
    expect(guion).toMatch(/Esta conversación ES la demostración/);
    expect(guion).toMatch(/PRIMER MENSAJE/);
    expect(guion).toMatch(/¿Qué le gustaría ver\?/);
  });

  it("no da precios y marca los datos de ejemplo", () => {
    expect(guion).toMatch(/NUNCA des precios/);
    expect(guion).toMatch(/datos de ejemplo/);
  });

  it("no usa las herramientas de agenda: en la demo se agenda de mentira", () => {
    expect(guion).not.toMatch(/consultar_disponibilidad|confirmar_cita/);
  });

  it("no lleva guiones largos", () => {
    expect(guion).not.toContain("—");
  });
});
