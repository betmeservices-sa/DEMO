// MiAgentIA Comercial: el WhatsApp de MiAgentIA (2505 4610), donde Sofía atiende
// a quien llegue (anuncios, la página, redes, recomendados) y ofrece la demo en
// vivo. Lo que no puede pasar: que agende en una agenda real, que dé precios, o
// que dé por hecho de dónde viene la persona.
import { describe, expect, it } from "vitest";
import { TENANTS, resolveTenantByLogin } from "@/lib/tenants";
import { MODULOS_AGENCIA, MODULOS_COMERCIAL } from "@/lib/modulos";

const guion = TENANTS.comercial.ai.systemPrompt;

describe("el panel comercial", () => {
  it("entra con demoa y no con demok", () => {
    expect(resolveTenantByLogin("demoagentia", "demoa")).toBe("comercial");
    expect(resolveTenantByLogin("demoagentia", "demok")).toBe("miagentia");
  });

  it("tiene sus leads, su bandeja, sus contactos y el alta en vivo; la agencia no ve los leads", () => {
    expect([...MODULOS_COMERCIAL]).toEqual(["leads", "bandeja", "contactos", "alta-numero"]);
    expect(MODULOS_AGENCIA).not.toContain("leads");
  });

  it("el alta de numero en vivo es solo de este panel", () => {
    // Es la demo que ensena la agencia: da de alta un numero de WhatsApp de
    // verdad. Ningun panel de cliente tiene por que verla.
    expect(MODULOS_AGENCIA).not.toContain("alta-numero");
  });

  it("su número es el 2505 4610, el mismo de voz", () => {
    expect(TENANTS.comercial.whatsapp?.phoneNumberId).toBe("1370050652861744");
    expect(TENANTS.comercial.whatsapp?.numeroPublico).toBe("50325054610");
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

  it("atiende a quien llegue, sin dar por hecho de dónde viene, y ofrece la demo", () => {
    expect(guion).toMatch(/un anuncio en Facebook o Instagram, nuestra página web/);
    expect(guion).toMatch(/No des por hecho de dónde viene cada persona ni se lo preguntes/);
    expect(guion).not.toMatch(/conferencia/i);
    expect(guion).toMatch(/PRIMER MENSAJE/);
    expect(guion).toMatch(/¿Qué te gustaría ver\?/);
  });

  it("si pregunta algo concreto de entrada, primero le responde", () => {
    expect(guion).toMatch(/respóndele eso primero, en corto, y después ofrécele la demostración/);
  });

  it("las llamadas son al 2505-4610 aunque le escriban por el 7560 5872", () => {
    expect(guion).toMatch(/puede llamar al 2505-4610 y contestas tú/);
    expect(guion).toMatch(/si te escriben por otro de nuestros números de WhatsApp, atiendes igual/);
    expect(guion).not.toMatch(/este mismo número/i);
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

describe("Sofía también llama", () => {
  it("sabe que si le piden 'llámame' el sistema marca, y no dice que no puede", () => {
    expect(guion).toMatch(/si la persona escribe que la llames, el sistema le marca/);
    expect(guion).toMatch(/te estoy marcando ahora mismo/);
    expect(guion).toMatch(/Nunca digas que no puedes hacer llamadas/);
  });
});
