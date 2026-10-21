// "Llámame" por el WhatsApp de MiAgentIA: Sofía marca desde el MISMO número del
// chat. Desde el 2026-10-21 el 2505 4610 es el número de MiAgentIA en WhatsApp y
// en voz, y Sofía de voz quedó colgada de dos líneas (el 4607 de antes y el
// 4610). Vapi las devuelve en cualquier orden: sin elegir, la llamada podía
// entrar del 4607 aunque la persona estuviera escribiendo al 4610.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getSupabase: () => null }));

const enviarTextoWa = vi.fn();
vi.mock("@/lib/wa-send", () => ({ enviarTextoWa: (...a: unknown[]) => enviarTextoWa(...a) }));
const mensajesAnteriores = vi.fn();
vi.mock("@/lib/wa-store", () => ({
  addOutbound: vi.fn(),
  mensajesAnteriores: (...a: unknown[]) => mensajesAnteriores(...a),
}));
vi.mock("@/lib/contacts-store", () => ({ getContacto: async () => null }));
vi.mock("@/lib/conv-store", () => ({ getConversaciones: async () => [] }));
const lanzarLlamadaVapi = vi.fn();
vi.mock("@/lib/vapi", () => ({
  hayLlaveVapi: () => true,
  // El 4607 primero: es el orden que hacía marcar desde la línea equivocada.
  fetchVapiAgentes: async () => [
    {
      id: "54679e1f-c05a-4933-9ca0-1180b3df32cf",
      nombre: "Sofia",
      script: "",
      numeros: [
        { id: "4bbfd3c5", numero: "+50325054607" },
        { id: "dedfc577", numero: "+50325054610" },
      ],
    },
  ],
  lanzarLlamadaVapi: (...a: unknown[]) => lanzarLlamadaVapi(...a),
}));

import { atenderPedidoDeLlamada } from "@/lib/llamar-por-pedido";

const TEL = "50375391721";

describe('"llámame" en el WhatsApp de MiAgentIA', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-21T18:00:00Z"), toFake: ["Date"] });
    enviarTextoWa.mockReset().mockResolvedValue({ ok: true, id: "wamid.aviso" });
    lanzarLlamadaVapi.mockReset().mockResolvedValue({ id: "call-1" });
    mensajesAnteriores.mockReset().mockResolvedValue({
      mensajes: [
        { direccion: "in", texto: "Hola, vi su anuncio", ts: "2026-10-21T17:58:00Z" },
        { direccion: "in", texto: "mejor llámame", ts: "2026-10-21T17:59:50Z" },
      ],
      hayMas: false,
    });
  });

  it("marca desde el 2505 4610, el número del chat, y el aviso lo dice", async () => {
    const r = await atenderPedidoDeLlamada({ tenant: "comercial", telefono: TEL, texto: "mejor llámame" });
    expect(r).toBe("llamando");
    expect(lanzarLlamadaVapi).toHaveBeenCalledTimes(1);
    expect((lanzarLlamadaVapi.mock.calls[0][0] as { phoneNumberId: string }).phoneNumberId).toBe("dedfc577");
    expect(enviarTextoWa.mock.calls[0][1]).toMatch(/La llamada te va a entrar del 2505-4610\./);
  });
});
