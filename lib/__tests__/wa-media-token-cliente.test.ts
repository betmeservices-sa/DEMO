import { afterEach, describe, expect, it, vi } from "vitest";

// 10/11/2026, WhatsApp del lab CEGISA (2247 1141): un papá mandó la foto de la
// orden y Valeria contestó "no puedo leer los exámenes de la imagen". La foto
// se bajaba con el token de la demo, que no tiene acceso a los archivos del
// número del lab. Tiene que bajarse con el token del cliente.

const { credencialesWa } = vi.hoisted(() => ({
  credencialesWa: vi.fn(async (tenant?: string) =>
    tenant === "consultorio"
      ? { token: "token-del-lab", phoneId: "lab", wabaId: null, origen: "cliente" as const }
      : { token: "token-de-la-demo", phoneId: "demo", wabaId: null, origen: "demo" as const },
  ),
}));
vi.mock("@/lib/wa-credenciales", () => ({ credencialesWa }));

import { descargarImagenParaIA } from "@/lib/wa-media";

afterEach(() => {
  vi.unstubAllGlobals();
  credencialesWa.mockClear();
});

describe("la foto que ve la IA", () => {
  it("se baja con el token del número del cliente, en los dos pasos", async () => {
    const tokens: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        tokens.push(String((init?.headers as Record<string, string>).Authorization));
        if (url.startsWith("https://graph.facebook.com/")) {
          return new Response(JSON.stringify({ url: "https://cdn.meta.test/foto", mime_type: "image/jpeg" }));
        }
        return new Response(new Uint8Array([1, 2, 3]));
      }),
    );

    const img = await descargarImagenParaIA("media123", "consultorio");

    expect(credencialesWa).toHaveBeenCalledWith("consultorio");
    expect(tokens).toEqual(["Bearer token-del-lab", "Bearer token-del-lab"]);
    expect(img).toMatchObject({ mime: "image/jpeg", bytes: 3 });
  });
});
