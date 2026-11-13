import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { agenteDePagina, buscarEnBaseDelHospital } from "@/lib/redes-hospital";
import { systemDeTurno } from "@/lib/ai";

// 2026-11-13: el Facebook y el Instagram del Centro Ginecológico los contesta la
// Valeria experta en todo el hospital (la de la base de hub); los WhatsApp del
// lab y de Imagenología siguen con la suya.

let antes: string | undefined;
beforeEach(() => {
  antes = process.env.VAPI_MEMORIA_SECRET;
  process.env.VAPI_MEMORIA_SECRET = "secreto";
});
afterEach(() => {
  if (antes === undefined) delete process.env.VAPI_MEMORIA_SECRET;
  else process.env.VAPI_MEMORIA_SECRET = antes;
});

describe("Valeria de las redes del hospital", () => {
  it("solo la página del hospital usa el agente de redes", () => {
    expect(agenteDePagina("547852531898434")).toBe("redes-hospital");
    expect(agenteDePagina("108604138639295")).toBeUndefined();
    expect(agenteDePagina(undefined)).toBeUndefined();
  });

  it("su guion es el de la Valeria con base, para Facebook e Instagram", async () => {
    const s = await systemDeTurno({ tenantId: "consultorio", agente: "redes-hospital" });
    expect(s).toContain("Atiendes el Facebook y el Instagram del hospital");
    expect(s).toContain("kb_buscar");
    expect(s).not.toContain("número de este WhatsApp");
    // Sin el agente de redes, el lab sigue con su guion.
    expect(await systemDeTurno({ tenantId: "consultorio" })).not.toContain("Atiendes el Facebook y el Instagram del hospital");
  });

  it("kb_buscar va a la base del hospital de hub con el secreto", async () => {
    const llamadas: { url: string; init: RequestInit }[] = [];
    const falso = (async (url: string, init: RequestInit) => {
      llamadas.push({ url, init });
      return new Response(JSON.stringify({ resultados: [{ nombre: "Mamografía convencional", datos: { precio: 45 } }] }));
    }) as unknown as typeof fetch;
    const r = await buscarEnBaseDelHospital({ consulta: "mamografía" }, falso);
    expect(r).toContain("45");
    expect(llamadas[0].url).toBe("https://hub.miagentia.com/api/webhooks/kb-buscar");
    expect((llamadas[0].init.headers as Record<string, string>)["x-vapi-secret"]).toBe("secreto");
  });

  it("si hub no contesta, no deja inventar datos", async () => {
    const caido = (async () => {
      throw new Error("timeout");
    }) as unknown as typeof fetch;
    expect(await buscarEnBaseDelHospital({ consulta: "mamografía" }, caido)).toContain("No des precios");
  });
});
