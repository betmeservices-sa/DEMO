// "Llámeme" por el WhatsApp de la Caja de Chalatenango, de punta a punta y sin
// red: el aviso sale de usted y dice de qué línea entra, marca la Elena de voz
// desde SU línea (2505-4608) con el chat encima, y el nombre sale solo de la
// ficha de este panel.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getSupabase: () => null }));

const enviarTextoWa = vi.fn();
vi.mock("@/lib/wa-send", () => ({ enviarTextoWa: (...a: unknown[]) => enviarTextoWa(...a) }));
const addOutbound = vi.fn();
const mensajesAnteriores = vi.fn();
vi.mock("@/lib/wa-store", () => ({
  addOutbound: (...a: unknown[]) => addOutbound(...a),
  mensajesAnteriores: (...a: unknown[]) => mensajesAnteriores(...a),
}));
const getContacto = vi.fn();
vi.mock("@/lib/contacts-store", () => ({ getContacto: (...a: unknown[]) => getContacto(...a) }));
vi.mock("@/lib/conv-store", () => ({ getConversaciones: async () => [] }));
const lanzarLlamadaVapi = vi.fn();
vi.mock("@/lib/vapi", () => ({
  hayLlaveVapi: () => true,
  // Lo que devuelve Vapi hoy: Elena con su línea, Sofía con la suya.
  fetchVapiAgentes: async () => [
    { id: "54679e1f-c05a-4933-9ca0-1180b3df32cf", nombre: "Sofia", script: "", numeros: [{ id: "4bbfd3c5", numero: "+50325054607" }] },
    { id: "ea7b527e-f0ed-46ce-9ae4-e8b7b4feaca4", nombre: "Elena", script: "", numeros: [{ id: "b0d261fd-b037-4ff6-9ab9-2f05689b021c", numero: "+50325054608" }] },
  ],
  lanzarLlamadaVapi: (...a: unknown[]) => lanzarLlamadaVapi(...a),
}));

import { atenderPedidoDeLlamada } from "@/lib/llamar-por-pedido";

const TEL = "50375391721";

describe('"llámeme" en el WhatsApp de la Caja', () => {
  beforeEach(() => {
    // Mediodía en El Salvador (18:00 UTC), dentro de la franja para marcar.
    vi.useFakeTimers({ now: new Date("2026-10-09T18:00:00Z"), toFake: ["Date"] });
    enviarTextoWa.mockReset().mockResolvedValue({ ok: true, id: "wamid.aviso" });
    addOutbound.mockReset();
    lanzarLlamadaVapi.mockReset().mockResolvedValue({ id: "call-1" });
    mensajesAnteriores.mockReset().mockResolvedValue({
      mensajes: [
        { direccion: "in", texto: "Hola", ts: "2026-10-09T17:58:00Z" },
        { direccion: "out", texto: "Hola, soy Elena... ¿Qué quiere probar?", ts: "2026-10-09T17:58:10Z" },
        { direccion: "in", texto: "mejor llámeme", ts: "2026-10-09T17:59:50Z" },
      ],
      hayMas: false,
    });
    // La ficha de ese teléfono es de OTRO panel (Nissan).
    getContacto.mockReset().mockResolvedValue({ wa_from: "75391721", nombre: "Bryan", tenant: "nissan" });
  });

  it("avisa de usted con la línea, y marca Elena desde la suya con el chat encima, sin el nombre de Nissan", async () => {
    const r = await atenderPedidoDeLlamada({ tenant: "chalatenango", telefono: TEL, texto: "mejor llámeme" });
    expect(r).toBe("llamando");

    expect(enviarTextoWa).toHaveBeenCalledWith(
      TEL,
      "Con gusto: le estoy marcando ahora mismo. La llamada le va a entrar del 2505-4608.",
      { tenant: "chalatenango" },
    );
    expect(lanzarLlamadaVapi).toHaveBeenCalledTimes(1);
    const llamada = lanzarLlamadaVapi.mock.calls[0][0] as {
      assistantId: string;
      phoneNumberId: string;
      numero: string;
      variables: Record<string, string>;
      primerMensaje: string;
    };
    expect(llamada.assistantId).toBe("ea7b527e-f0ed-46ce-9ae4-e8b7b4feaca4");
    expect(llamada.phoneNumberId).toBe("b0d261fd-b037-4ff6-9ab9-2f05689b021c");
    expect(llamada.numero).toBe("+50375391721");
    expect(llamada.primerMensaje).toBe(
      "Hola, le habla Elena, de la Caja de Crédito de Chalatenango. Le llamo como me pidió por WhatsApp. ¿Puede hablar ahora?",
    );
    expect(llamada.variables.pidio_llamada).toBe("si");
    expect(llamada.variables.nombre).toBe("no disponible");
    expect(llamada.variables.contexto).toMatch(/Cliente: mejor llámeme/);
    expect(JSON.stringify(llamada)).not.toContain("Bryan");
  });

  it("con ficha propia del panel, saluda por el nombre", async () => {
    getContacto.mockResolvedValue({ wa_from: "75391721", nombre: "Marta", apellido: "Rivas", tenant: "chalatenango" });
    await atenderPedidoDeLlamada({ tenant: "chalatenango", telefono: TEL, texto: "mejor llámeme" });
    expect(enviarTextoWa.mock.calls[0][1]).toBe("Marta, con gusto: le estoy marcando ahora mismo. La llamada le va a entrar del 2505-4608.");
    const llamada = lanzarLlamadaVapi.mock.calls[0][0] as { primerMensaje: string; variables: Record<string, string> };
    expect(llamada.primerMensaje).toMatch(/^Hola Marta, le habla Elena, de la Caja/);
    expect(llamada.variables.nombre).toBe("Marta Rivas");
  });
});
