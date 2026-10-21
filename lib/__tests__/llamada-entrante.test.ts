// Quien llama al 2505 4610 (el número de MiAgentIA en WhatsApp y en voz) habla
// con la misma Sofía que le escribió: Vapi pregunta con quién contestar y se le
// responde con Sofía y lo que esa persona ya habló. Lo que no puede pasar es que
// la llamada se caiga por buscar ese contexto.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getSupabase: () => null }));
const mensajesAnteriores = vi.fn();
vi.mock("@/lib/wa-store", () => ({ mensajesAnteriores: (...a: unknown[]) => mensajesAnteriores(...a) }));
const leerContextoLlamada = vi.fn();
vi.mock("@/lib/llamada-contexto", async (orig) => ({
  ...(await orig<typeof import("@/lib/llamada-contexto")>()),
  leerContextoLlamada: (...a: unknown[]) => leerContextoLlamada(...a),
}));
const getContacto = vi.fn();
vi.mock("@/lib/contacts-store", () => ({ getContacto: (...a: unknown[]) => getContacto(...a) }));

import { atenderLlamadaEntrante, contextoEntrante, respuestaEntrante } from "@/lib/llamada-entrante";
import { SOFIA_COMERCIAL } from "@/lib/seguir-por-whatsapp";

const SOFIA = "54679e1f-c05a-4933-9ca0-1180b3df32cf";
const AHORA = new Date("2026-10-21T18:00:00Z").getTime();
const SECRETO = "secreto-de-prueba";

function pedido(numero: string | null, secreto: string | null = SECRETO) {
  return new Request("http://x/api/webhooks/vapi/comercial", {
    method: "POST",
    headers: { "content-type": "application/json", ...(secreto ? { "x-vapi-secret": secreto } : {}) },
    body: JSON.stringify({
      message: { type: "assistant-request", call: { customer: numero ? { number: numero } : {} } },
    }),
  });
}

describe("el contexto que se le pasa a la Sofía de voz", () => {
  it("junta el chat y la última llamada, lo más reciente al final", () => {
    const c = contextoEntrante({
      ahora: AHORA,
      chat: [
        { direction: "out", texto: "¡Hola! Soy Sofía...", ts: "2026-10-21T17:00:05Z" },
        { direction: "in", texto: "Tengo una clínica dental", ts: "2026-10-21T17:00:00Z" },
      ],
      llamada: {
        tenant: "comercial",
        telefono: "50375391721",
        callId: "c1",
        resumen: "Le interesa el agente de voz para su clínica.",
        transcript: null,
        actualizado: "2026-10-20T15:00:00Z",
      },
    });
    expect(c).toBe(
      "Por WhatsApp:\nCliente: Tengo una clínica dental\nNosotros: ¡Hola! Soy Sofía...\n\nEn la última llamada: Le interesa el agente de voz para su clínica.",
    );
  });

  it("lo de hace más de dos semanas ya no cuenta", () => {
    const c = contextoEntrante({
      ahora: AHORA,
      chat: [{ direction: "in", texto: "hola", ts: "2026-09-01T10:00:00Z" }],
      llamada: null,
    });
    expect(c).toBe("");
  });

  it("sin historia contesta Sofía con su saludo de siempre", () => {
    expect(respuestaEntrante(SOFIA, "", null)).toEqual({
      assistantId: SOFIA,
      assistantOverrides: { variableValues: { llamada_entrante: "si" } },
    });
  });

  it("con historia saluda como quien ya la conoce", () => {
    const r = respuestaEntrante(SOFIA, "Por WhatsApp:\nCliente: hola", "Ana López");
    expect(r.assistantOverrides).toMatchObject({
      firstMessage: "Hola, Ana, soy Sofía de MiAgentIA. Qué gusto hablar contigo otra vez. ¿En qué te ayudo?",
      variableValues: { llamada_entrante: "si", contexto: "Por WhatsApp:\nCliente: hola", nombre: "Ana López" },
    });
  });
});

describe("la ruta que contesta a Vapi", () => {
  beforeEach(() => {
    vi.stubEnv("VAPI_MEMORIA_SECRET", SECRETO);
    vi.useFakeTimers({ now: AHORA, toFake: ["Date"] });
    mensajesAnteriores.mockReset().mockResolvedValue({
      mensajes: [{ direccion: "in", texto: "quiero un agente para mi restaurante", ts: "2026-10-21T17:30:00Z" }],
      hayMas: false,
    });
    leerContextoLlamada.mockReset().mockResolvedValue(null);
    getContacto.mockReset().mockResolvedValue({ nombre: "Ana", tenant: "comercial" });
  });

  it("busca el chat de ESE teléfono en el panel comercial y se lo pasa a Sofía", async () => {
    const r = await (await atenderLlamadaEntrante(pedido("+50375391721"), SOFIA_COMERCIAL)).json();
    expect(mensajesAnteriores).toHaveBeenCalledWith("50375391721", null, 20, "comercial");
    expect(r.assistantId).toBe(SOFIA);
    expect(r.assistantOverrides.variableValues.contexto).toMatch(/Cliente: quiero un agente para mi restaurante/);
    expect(r.assistantOverrides.firstMessage).toMatch(/^Hola, Ana, soy Sofía/);
  });

  it("el nombre de la ficha de otro panel no se usa", async () => {
    getContacto.mockResolvedValue({ nombre: "Bryan", tenant: "nissan" });
    const r = await (await atenderLlamadaEntrante(pedido("+50375391721"), SOFIA_COMERCIAL)).json();
    expect(JSON.stringify(r)).not.toContain("Bryan");
  });

  it("sin secreto contesta Sofía, pero sin leer nada", async () => {
    const r = await (await atenderLlamadaEntrante(pedido("+50375391721", null), SOFIA_COMERCIAL)).json();
    expect(r.assistantId).toBe(SOFIA);
    expect(r.assistantOverrides.variableValues).toEqual({ llamada_entrante: "si" });
    expect(mensajesAnteriores).not.toHaveBeenCalled();
  });

  it("si la base falla, la llamada se atiende igual", async () => {
    mensajesAnteriores.mockRejectedValue(new Error("base caída"));
    const res = await atenderLlamadaEntrante(pedido("+50375391721"), SOFIA_COMERCIAL);
    expect(res.status).toBe(200);
    expect((await res.json()).assistantId).toBe(SOFIA);
  });

  it("si la base tarda, no espera más de la cuenta", async () => {
    vi.useRealTimers();
    mensajesAnteriores.mockImplementation(() => new Promise(() => {}));
    const inicio = Date.now();
    const r = await (await atenderLlamadaEntrante(pedido("+50375391721"), SOFIA_COMERCIAL)).json();
    expect(Date.now() - inicio).toBeLessThan(5000);
    expect(r.assistantId).toBe(SOFIA);
  }, 8000);

  it("sin número de quien llama, contesta Sofía sin contexto", async () => {
    const r = await (await atenderLlamadaEntrante(pedido(null), SOFIA_COMERCIAL)).json();
    expect(r.assistantId).toBe(SOFIA);
    expect(mensajesAnteriores).not.toHaveBeenCalled();
  });
});
