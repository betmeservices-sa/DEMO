// MiAgentIA Comercial: el WhatsApp donde Sofía hace la demo a quien viene de la
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

describe("Sofía en modo demo", () => {
  it("es Sofía, la misma de la llamada, y sabe usar lo que se habló por teléfono", () => {
    expect(TENANTS.comercial.ai.nombre).toBe("Sofía");
    expect(guion).toMatch(/Eres Sofía, la asistente virtual de MiAgentIA/);
    expect(guion).toMatch(/eres la MISMA Sofía/);
    expect(guion).toMatch(/SI YA HABLASTE CON ESTA PERSONA POR TELÉFONO/);
    expect(guion.replace(/MiAgentIA/g, "")).not.toMatch(/Mia/);
  });

  it("sabe que quien escribe viene a probar la demo y la ofrece de entrada", () => {
    expect(guion).toMatch(/Esta conversación ES la demostración/);
    expect(guion).toMatch(/PRIMER MENSAJE/);
    expect(guion).toMatch(/¿Qué te gustaría ver\?/);
  });

  it("si el chat lo abrió la plantilla, no se vuelve a presentar", () => {
    expect(guion).toMatch(/SI EL CHAT EMPEZÓ CON NUESTRO MENSAJE/);
    expect(guion).toMatch(/NO te vuelvas a presentar/);
    expect(guion).toMatch(/"Atender a mis clientes"/);
  });

  it("ofrece CRM o solución a la medida, y no dice cuánto dura la reunión", () => {
    expect(guion).toMatch(/conectarnos a tu CRM/);
    expect(guion).toMatch(/solución nueva a la medida/);
    expect(guion).toMatch(/No digas cuánto dura la reunión/);
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
