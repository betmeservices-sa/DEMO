// "Llámame" por WhatsApp en el panel comercial, donde Sofía es la misma por
// voz y por chat: la llamada se presenta como Sofía de MiAgentIA, de tú, y no
// se marca dos veces por el mismo mensaje. Sin presentación, como siempre.
import { describe, expect, it } from "vitest";
import {
  AVISO_LLAMANDO,
  AVISO_LLAMANDO_TU,
  PREGUNTA_VOLVER_TU,
  avisoConLinea,
  decidirLlamada,
  lineaLegible,
  type EntradaLlamada,
} from "@/lib/pedido-de-llamada";
import { TENANTS } from "@/lib/tenants";
import { assistantCampanasDeTenant, esDelTenant } from "@/lib/tenants/voz";

const base: EntradaLlamada = {
  texto: "me puedes llamar?",
  telefono: "50375391721",
  nombre: "Ana López",
  hilo: [{ direction: "in", texto: "me puedes llamar?", ts: "2026-10-07T18:00:00Z" }],
  sinDueno: true,
  ahora: new Date("2026-10-07T18:00:05Z"),
  horaLocal: 12,
};
const comercial = { marca: "MiAgentIA", tuteo: true };

describe("el panel comercial marca con su Sofía", () => {
  it("tiene agente de voz: la Sofía de la conferencia", () => {
    const id = assistantCampanasDeTenant("comercial");
    expect(id).toBe("54679e1f-c05a-4933-9ca0-1180b3df32cf");
    expect(esDelTenant(id, "comercial")).toBe(true);
    expect(TENANTS.comercial.voz?.mismaAgente).toEqual(comercial);
  });

  it("se presenta como la misma Sofía, de tú, y avisa por escrito", () => {
    const d = decidirLlamada({ ...base, presentacion: comercial });
    expect(d.llamar).toBe(true);
    if (!d.llamar) return;
    expect(d.primerMensaje).toBe("Hola Ana, soy Sofía de MiAgentIA. Te llamo como me pediste por WhatsApp. ¿Puedes hablar ahora?");
    expect(d.aviso).toBe(`Ana, con gusto: ${AVISO_LLAMANDO_TU}.`);
    expect(d.contexto).toMatch(/me puedes llamar/);
  });

  it("sin nombre también saluda bien", () => {
    const d = decidirLlamada({ ...base, nombre: null, presentacion: comercial });
    if (!d.llamar) throw new Error("debía llamar");
    expect(d.primerMensaje).toMatch(/^Hola, soy Sofía de MiAgentIA\./);
    expect(d.aviso).toBe(`Con gusto: ${AVISO_LLAMANDO_TU}.`);
  });

  it("no marca dos veces por el mismo mensaje con el aviso de tú", () => {
    const d = decidirLlamada({
      ...base,
      presentacion: comercial,
      hilo: [
        ...base.hilo,
        { direction: "out", texto: `Ana, con gusto: ${AVISO_LLAMANDO_TU}.`, ts: "2026-10-07T18:00:03Z" },
      ],
    });
    expect(d.llamar).toBe(false);
  });

  it("la llamada que se cortó se ofrece de tú, y el sí la dispara", () => {
    const p = decidirLlamada({ ...base, texto: "se cortó la llamada", presentacion: comercial });
    expect(p.llamar).toBe(false);
    if (p.llamar) return;
    expect(p.pregunta).toBe(`No te preocupes, Ana. ${PREGUNTA_VOLVER_TU}`);
    const si = decidirLlamada({
      ...base,
      texto: "sí, por favor",
      presentacion: comercial,
      hilo: [
        { direction: "in", texto: "se cortó la llamada", ts: "2026-10-07T17:59:00Z" },
        { direction: "out", texto: p.pregunta ?? "", ts: "2026-10-07T17:59:30Z" },
        { direction: "in", texto: "sí, por favor", ts: "2026-10-07T18:00:00Z" },
      ],
    });
    expect(si.llamar).toBe(true);
  });
});

describe("sin presentación, todo igual que antes", () => {
  it("CrediQ sigue de usted", () => {
    const d = decidirLlamada(base);
    if (!d.llamar) throw new Error("debía llamar");
    expect(d.primerMensaje).toMatch(/le saluda Sofía de CrediQ/);
    expect(d.aviso).toBe(`Ana, con gusto: ${AVISO_LLAMANDO}.`);
  });
});

describe("el aviso dice de qué número entra la llamada", () => {
  it("la línea de Vapi se escribe como se lee en El Salvador", () => {
    expect(lineaLegible("+50325054607")).toBe("2505-4607");
    expect(lineaLegible("25054607")).toBe("2505-4607");
  });

  it("de tú en el panel comercial", () => {
    expect(avisoConLinea(`Ana, con gusto: ${AVISO_LLAMANDO_TU}.`, "+50325054607", true)).toBe(
      `Ana, con gusto: ${AVISO_LLAMANDO_TU}. La llamada te va a entrar del 2505-4607.`,
    );
  });

  it("sin línea, el aviso tal cual; y sigue sirviendo de marca para no marcar dos veces", () => {
    expect(avisoConLinea("Con gusto: x.", null, true)).toBe("Con gusto: x.");
    const conLinea = avisoConLinea(`Ana, con gusto: ${AVISO_LLAMANDO_TU}.`, "+50325054607", true);
    const d = decidirLlamada({
      ...base,
      presentacion: comercial,
      hilo: [...base.hilo, { direction: "out", texto: conLinea, ts: "2026-10-07T18:00:03Z" }],
    });
    expect(d.llamar).toBe(false);
  });

  it("el guion de WhatsApp también lo sabe", () => {
    expect(TENANTS.comercial.ai.systemPrompt).toMatch(/desde el 2505-4607/);
  });
});
