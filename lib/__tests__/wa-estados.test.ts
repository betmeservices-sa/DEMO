import { describe, expect, it } from "vitest";
import { estadosDelWebhook } from "../wa-estados";

const webhook = (statuses: unknown[]) => ({
  entry: [{ changes: [{ value: { metadata: { phone_number_id: "1" }, statuses } }] }],
});

describe("estadosDelWebhook", () => {
  it("lee entregado y leído con su hora", () => {
    const e = estadosDelWebhook(
      webhook([
        { id: "wamid.A", status: "delivered", timestamp: "1791330000", recipient_id: "50375391721" },
        { id: "wamid.A", status: "read", timestamp: "1791330060", recipient_id: "50375391721" },
      ]),
    );
    expect(e).toHaveLength(2);
    expect(e[0]).toMatchObject({ waId: "wamid.A", estado: "delivered", destinatario: "50375391721" });
    expect(e[0].ts).toBe(new Date(1791330000 * 1000).toISOString());
  });

  it("un fallido trae el código y el motivo de Meta", () => {
    const [e] = estadosDelWebhook(
      webhook([
        {
          id: "wamid.B",
          status: "failed",
          timestamp: "1791330000",
          recipient_id: "50379227308",
          errors: [{ code: 131042, title: "Business eligibility payment issue" }],
        },
      ]),
    );
    expect(e).toMatchObject({ estado: "failed", errorCodigo: 131042, errorTitulo: "Business eligibility payment issue" });
  });

  it("un webhook de mensajes entrantes no trae estados", () => {
    expect(estadosDelWebhook({ entry: [{ changes: [{ value: { messages: [{ id: "x" }] } }] }] })).toEqual([]);
    expect(estadosDelWebhook(null)).toEqual([]);
  });
});
