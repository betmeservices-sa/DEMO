// En producción, un webhook sin secreto configurado se rechaza (401) en vez de
// aceptar cualquier cosa: abierto, cualquiera inventa mensajes de clientes y
// hace hablar a la IA. Fuera de producción (prueba local, esta suite) sigue
// aceptando sin firma, que es como se simulan mensajes.
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const VARIABLES = ["WHATSAPP_APP_SECRET", "META_APP_SECRET", "IG_APP_SECRET", "VERCEL"];
const guardado: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of VARIABLES) {
    guardado[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of VARIABLES) {
    if (guardado[k] === undefined) delete process.env[k];
    else process.env[k] = guardado[k];
  }
});

function post(cuerpo: unknown): Request {
  return new Request("http://panel.test/api/webhooks/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

describe("webhooks sin secreto configurado", () => {
  it("WhatsApp: en producción se rechaza con 401", async () => {
    process.env.VERCEL = "1";
    const { POST } = await import("@/app/api/webhooks/whatsapp/route");
    const res = await POST(post({ object: "whatsapp_business_account", entry: [] }));
    expect(res.status).toBe(401);
  });

  it("Meta: en producción se rechaza con 401", async () => {
    process.env.VERCEL = "1";
    const { POST } = await import("@/app/api/webhooks/meta/route");
    const res = await POST(post({ object: "page", entry: [] }));
    expect(res.status).toBe(401);
  });

  it("fuera de producción se acepta sin firma (prueba local)", async () => {
    const wa = await import("@/app/api/webhooks/whatsapp/route");
    const meta = await import("@/app/api/webhooks/meta/route");
    expect((await wa.POST(post({ object: "whatsapp_business_account", entry: [] }))).status).not.toBe(401);
    expect((await meta.POST(post({ object: "page", entry: [] }))).status).not.toBe(401);
  });

  it("con secreto y sin firma se rechaza, en cualquier ambiente", async () => {
    process.env.WHATSAPP_APP_SECRET = "s3creto";
    process.env.META_APP_SECRET = "s3creto";
    const wa = await import("@/app/api/webhooks/whatsapp/route");
    const meta = await import("@/app/api/webhooks/meta/route");
    expect((await wa.POST(post({ object: "whatsapp_business_account", entry: [] }))).status).toBe(401);
    expect((await meta.POST(post({ object: "page", entry: [] }))).status).toBe(401);
  });
});
