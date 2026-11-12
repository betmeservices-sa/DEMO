// La base del laboratorio para el agente de voz (Vapi): misma búsqueda que el
// WhatsApp del lab, detrás del secreto compartido de Vapi.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/webhooks/vapi/laboratorio-kb/route";
import { respuestaDeBusqueda } from "@/lib/consultorio/lab-kb";
import { BASE_LAB } from "@/lib/consultorio/lab-kb-datos";

const SECRETO = "secreto-de-prueba-del-lab";
let antes: string | undefined;

beforeEach(() => {
  antes = process.env.VAPI_MEMORIA_SECRET;
  process.env.VAPI_MEMORIA_SECRET = SECRETO;
});
afterEach(() => {
  if (antes === undefined) delete process.env.VAPI_MEMORIA_SECRET;
  else process.env.VAPI_MEMORIA_SECRET = antes;
});

function llamada(consulta: unknown, secreto = SECRETO, nombre = "buscar_en_base"): Request {
  return new Request("http://panel.test/api/webhooks/vapi/laboratorio-kb", {
    method: "POST",
    headers: { "content-type": "application/json", "x-vapi-secret": secreto },
    body: JSON.stringify({
      message: {
        type: "tool-calls",
        toolCallList: [{ id: "call_1", type: "function", function: { name: nombre, arguments: { consulta } } }],
      },
    }),
  });
}

describe("base del laboratorio para la voz", () => {
  it("sin el secreto, 401", async () => {
    const res = await POST(llamada("glucosa", "otro-secreto"));
    expect(res.status).toBe(401);
  });

  it("devuelve el resultado de la búsqueda con el id de la llamada", async () => {
    const res = await POST(llamada("prueba de embarazo"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { results: { toolCallId: string; result: string }[] };
    expect(json.results).toHaveLength(1);
    expect(json.results[0].toolCallId).toBe("call_1");
    // Precio del Excel oficial del lab (2026-11-12): embarazo en sangre $20.10.
    expect(json.results[0].result).toContain("20.1");
  });

  it("acepta los argumentos como texto JSON", async () => {
    const req = new Request("http://panel.test/x", {
      method: "POST",
      headers: { "content-type": "application/json", "x-vapi-secret": SECRETO },
      body: JSON.stringify({
        message: {
          type: "tool-calls",
          toolCallList: [{ id: "c2", function: { name: "buscar_en_base", arguments: '{"consulta":"sucursal escalon"}' } }],
        },
      }),
    });
    const json = (await (await POST(req)).json()) as { results: { result: string }[] };
    expect(json.results[0].result.toLowerCase()).toContain("escal");
  });

  it("otra herramienta no se responde", async () => {
    const json = (await (await POST(llamada("glucosa", SECRETO, "consultar_historial"))).json()) as { results: unknown[] };
    expect(json.results).toEqual([]);
  });

  // Evaluaciones del 2026-11-09: la voz da el precio con aseguradora de la
  // lista del lab. El WhatsApp no lo ve: allá, con seguro, se abre un caso.
  it("la voz ve el precio con aseguradora y el WhatsApp no", async () => {
    const json = (await (await POST(llamada("lh"))).json()) as { results: { result: string }[] };
    expect(json.results[0].result).toContain("\"precioAseguradora\":53.33");
    const whatsapp = respuestaDeBusqueda(BASE_LAB, "lh", "2026-11-12");
    expect(whatsapp).toContain("56.1");
    expect(whatsapp).not.toContain("precioAseguradora");
  });
});
