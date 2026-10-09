// Elena de la Caja de Chalatenango es la misma por voz y por WhatsApp:
//   - "llámeme" por WhatsApp marca la Elena de voz, de usted, avisando de qué
//     línea entra, y saluda con el nombre de la ficha de ESTE panel o sin nombre;
//   - "seguimos por WhatsApp" en la llamada manda elena_continuar_demo desde el
//     número de la Caja, solo para Elena, una vez por llamada;
//   - lo que se habló por teléfono le llega al guion de WhatsApp.
// Y Sofía del panel comercial sigue igual.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getSupabase: () => null }));

const enviarPlantilla = vi.fn();
vi.mock("@/lib/wa-send", () => ({ enviarPlantilla: (...a: unknown[]) => enviarPlantilla(...a) }));
const addOutbound = vi.fn();
vi.mock("@/lib/wa-store", () => ({ addOutbound: (...a: unknown[]) => addOutbound(...a) }));
const encenderIaSiNadieDecidio = vi.fn();
vi.mock("@/lib/ai-store", () => ({
  encenderIaSiNadieDecidio: (...a: unknown[]) => encenderIaSiNadieDecidio(...a),
}));

import { TENANTS } from "@/lib/tenants";
import { CHALATENANGO_ASSISTANT_ID, PLANTILLA_ELENA } from "@/lib/chalatenango-agente";
import {
  AVISO_LLAMANDO_YO,
  avisoConLinea,
  decidirLlamada,
  nombreDeFicha,
  type EntradaLlamada,
} from "@/lib/pedido-de-llamada";
import {
  ELENA_CHALATENANGO,
  RESPUESTA_ELENA,
  SOFIA_COMERCIAL,
  textoElena,
  variablesElena,
} from "@/lib/seguir-por-whatsapp";
import { atenderVapiSeguirPorWhatsApp } from "@/lib/seguir-por-whatsapp-webhook";
import {
  PANELES_CON_CONTEXTO,
  contextoDeLlamadaPara,
  guardarContextoLlamada,
  leerContextoLlamada,
  transcriptDe,
} from "@/lib/llamada-contexto";

const elena = TENANTS.chalatenango.voz?.mismaAgente;

const base: EntradaLlamada = {
  texto: "me puede llamar?",
  telefono: "50375391721",
  nombre: "Ana López",
  hilo: [{ direction: "in", texto: "me puede llamar?", ts: "2026-10-09T18:00:00Z" }],
  sinDueno: true,
  ahora: new Date("2026-10-09T18:00:05Z"),
  horaLocal: 12,
};

describe('"llámeme" por WhatsApp en la Caja: marca Elena, de usted', () => {
  it("el panel declara a Elena como la misma agente, de usted", () => {
    expect(elena).toEqual({ marca: "Caja de Crédito de Chalatenango", articulo: "la", agente: "Elena" });
    expect(elena?.tuteo).toBeFalsy();
  });

  it("la llamada se presenta como Elena, de la Caja, y avisa en primera persona", () => {
    const d = decidirLlamada({ ...base, presentacion: elena });
    if (!d.llamar) throw new Error("debía llamar");
    expect(d.primerMensaje).toBe(
      "Hola Ana, le habla Elena, de la Caja de Crédito de Chalatenango. Le llamo como me pidió por WhatsApp. ¿Puede hablar ahora?",
    );
    expect(d.aviso).toBe(`Ana, con gusto: ${AVISO_LLAMANDO_YO}.`);
    expect(d.primerMensaje).not.toMatch(/Sofía|CrediQ|\bte\b/);
  });

  it("sin nombre también saluda bien, y el aviso dice de qué línea entra", () => {
    const d = decidirLlamada({ ...base, nombre: null, presentacion: elena });
    if (!d.llamar) throw new Error("debía llamar");
    expect(d.primerMensaje).toBe(
      "Hola, le habla Elena, de la Caja de Crédito de Chalatenango. Le llamo como me pidió por WhatsApp. ¿Puede hablar ahora?",
    );
    expect(avisoConLinea(d.aviso, "+50325054608", elena?.tuteo)).toBe(
      "Con gusto: le estoy marcando ahora mismo. La llamada le va a entrar del 2505-4608.",
    );
  });

  it("no marca dos veces por el mismo mensaje con el aviso de primera persona", () => {
    const aviso = avisoConLinea(`Con gusto: ${AVISO_LLAMANDO_YO}.`, "+50325054608", false);
    const d = decidirLlamada({
      ...base,
      presentacion: elena,
      hilo: [...base.hilo, { direction: "out", texto: aviso, ts: "2026-10-09T18:00:03Z" }],
    });
    expect(d.llamar).toBe(false);
  });

  it("Nissan y el panel comercial siguen como antes", () => {
    const n = decidirLlamada({ ...base, presentacion: TENANTS.nissan.voz?.mismaAgente });
    if (!n.llamar) throw new Error("debía llamar");
    expect(n.primerMensaje).toBe("Hola Ana, le saluda Sofía de Nissan. Le marco como me pidió por WhatsApp. ¿Puede hablar ahora?");
    const c = decidirLlamada({ ...base, presentacion: TENANTS.comercial.voz?.mismaAgente });
    if (!c.llamar) throw new Error("debía llamar");
    expect(c.primerMensaje).toBe("Hola Ana, soy Sofía de MiAgentIA. Te llamo como me pediste por WhatsApp. ¿Puedes hablar ahora?");
  });
});

describe("el nombre del saludo sale solo de la ficha de este panel", () => {
  it("la ficha de Nissan no le presta el nombre a la Caja", () => {
    const ficha = { nombre: "Bryan", apellido: null, tenant: "nissan" };
    expect(nombreDeFicha(ficha, "chalatenango")).toBeNull();
    expect(nombreDeFicha(ficha, "nissan")).toBe("Bryan");
  });

  it("sin ficha o sin panel, sin nombre", () => {
    expect(nombreDeFicha(null, "chalatenango")).toBeNull();
    expect(nombreDeFicha({ nombre: "Bryan", tenant: null }, "chalatenango")).toBeNull();
    expect(nombreDeFicha({ nombre: "Marta", apellido: "Rivas", tenant: "chalatenango" }, "chalatenango")).toBe("Marta Rivas");
  });
});

describe("la plantilla elena_continuar_demo", () => {
  it("nombre, idioma y texto en una sola constante, sin botones", () => {
    expect(PLANTILLA_ELENA.nombre).toBe("elena_continuar_demo");
    expect(PLANTILLA_ELENA.idioma).toBe("es");
    expect(PLANTILLA_ELENA.pie).toBe("Demo de MiAgentIA");
    expect(PLANTILLA_ELENA).not.toHaveProperty("botones");
    expect(PLANTILLA_ELENA.cuerpo.match(/\{\{\d\}\}/g)).toEqual(["{{1}}"]);
  });

  it("{{1}} es el primer nombre, o 'de nuevo'; nunca el cliente del juego de roles", () => {
    expect(variablesElena("bryan pérez")).toEqual(["Bryan"]);
    expect(variablesElena(undefined)).toEqual(["de nuevo"]);
    expect(variablesElena("no disponible")).toEqual(["de nuevo"]);
    expect(variablesElena("Alex Ramírez")).toEqual(["de nuevo"]);
    expect(textoElena("Bryan")).toBe(
      "Hola Bryan, le escribe Elena, de la Caja de Crédito de Chalatenango. Como lo pidió en la llamada, continuamos la demo por este chat. ¿Qué desea probar?",
    );
    expect(textoElena("")).toMatch(/^Hola de nuevo, le escribe Elena/);
  });

  it("lo que le contesta a la Elena de voz va de usted", () => {
    expect(RESPUESTA_ELENA.enviado).toContain('"Listo, le acabo de enviar un WhatsApp; ahí seguimos con la demo."');
    expect(RESPUESTA_ELENA.sinNumero).toContain('"¿A qué número le escribo?"');
    expect(RESPUESTA_ELENA.fallo).toContain('"En un momento le escribimos por WhatsApp"');
  });
});

describe("la ruta de Elena en Vapi", () => {
  const SECRETO = "secreto-de-prueba";
  const pedir = (cuerpo: unknown, secreto = SECRETO) =>
    new Request("https://demo.miagentia.com/api/webhooks/vapi/chalatenango", {
      method: "POST",
      headers: { "content-type": "application/json", "x-vapi-secret": secreto },
      body: JSON.stringify(cuerpo),
    });
  const herramienta = (callId: string, assistantId = CHALATENANGO_ASSISTANT_ID, args: Record<string, unknown> = {}) => ({
    message: {
      type: "tool-calls",
      call: { id: callId, assistantId, customer: { number: "+50375391721" } },
      toolCallList: [
        { id: "tc1", function: { name: "seguir_por_whatsapp", arguments: { resumen: "Probó cobros.", ...args } } },
      ],
      artifact: { messages: [{ role: "bot", message: "Hola, soy Elena" }, { role: "user", message: "Sigamos por WhatsApp" }] },
    },
  });

  beforeEach(() => {
    vi.stubEnv("VAPI_MEMORIA_SECRET", SECRETO);
    enviarPlantilla.mockReset().mockResolvedValue({ ok: true, id: "wamid.1" });
    addOutbound.mockReset();
    encenderIaSiNadieDecidio.mockReset();
  });

  it("sin el secreto no pasa nadie", async () => {
    const r = await atenderVapiSeguirPorWhatsApp(pedir(herramienta("c0"), "otro"), ELENA_CHALATENANGO);
    expect(r.status).toBe(401);
    expect(enviarPlantilla).not.toHaveBeenCalled();
  });

  it("manda elena_continuar_demo desde el número de la Caja, deja el hilo y guarda lo hablado", async () => {
    const r = await atenderVapiSeguirPorWhatsApp(pedir(herramienta("c1", undefined, { nombre: "Bryan" })), ELENA_CHALATENANGO);
    const j = (await r.json()) as { results: { toolCallId: string; result: string }[] };
    expect(j.results[0]).toEqual({ toolCallId: "tc1", result: RESPUESTA_ELENA.enviado });
    expect(enviarPlantilla).toHaveBeenCalledWith("50375391721", "elena_continuar_demo", "es", ["Bryan"], {
      tenant: "chalatenango",
    });
    expect(addOutbound).toHaveBeenCalledWith(
      expect.objectContaining({ to: "50375391721", tenant: "chalatenango", texto: textoElena("Bryan") }),
    );
    expect(encenderIaSiNadieDecidio).toHaveBeenCalledWith("chalatenango", "50375391721");
    const ctx = await leerContextoLlamada("chalatenango", "50375391721");
    expect(ctx?.resumen).toBe("Probó cobros.");
    expect(ctx?.transcript).toBe("Elena: Hola, soy Elena\nPersona: Sigamos por WhatsApp");
  });

  it("una sola plantilla por llamada", async () => {
    await atenderVapiSeguirPorWhatsApp(pedir(herramienta("c2")), ELENA_CHALATENANGO);
    const r = await atenderVapiSeguirPorWhatsApp(pedir(herramienta("c2")), ELENA_CHALATENANGO);
    const j = (await r.json()) as { results: { result: string }[] };
    expect(j.results[0].result).toBe(RESPUESTA_ELENA.repetido);
    expect(enviarPlantilla).toHaveBeenCalledTimes(1);
  });

  it("la ruta de Elena no le sirve a Sofía, ni la de Sofía a Elena", async () => {
    const r1 = await atenderVapiSeguirPorWhatsApp(pedir(herramienta("c3", SOFIA_COMERCIAL.assistantId)), ELENA_CHALATENANGO);
    expect(((await r1.json()) as { results: { result: string }[] }).results[0].result).toBe(RESPUESTA_ELENA.otroAgente);
    const r2 = await atenderVapiSeguirPorWhatsApp(pedir(herramienta("c4")), SOFIA_COMERCIAL);
    expect(((await r2.json()) as { results: { result: string }[] }).results[0].result).toBe(SOFIA_COMERCIAL.respuestas.otroAgente);
    expect(enviarPlantilla).not.toHaveBeenCalled();
  });

  it("al colgar guarda el resumen y la conversación de Elena, en su panel", async () => {
    await atenderVapiSeguirPorWhatsApp(
      pedir({
        message: {
          type: "end-of-call-report",
          call: { id: "c5", assistantId: CHALATENANGO_ASSISTANT_ID, customer: { number: "75390000" } },
          analysis: { summary: "Probó cobros y tarjeta." },
          artifact: { transcript: "AI: Hola, soy Elena\nUser: Quiero ver cobros" },
        },
      }),
      ELENA_CHALATENANGO,
    );
    const ctx = await leerContextoLlamada("chalatenango", "50375390000");
    expect(ctx?.resumen).toBe("Probó cobros y tarjeta.");
    expect(ctx?.transcript).toBe("Elena: Hola, soy Elena\nPersona: Quiero ver cobros");
    expect(await leerContextoLlamada("comercial", "50375390000")).toBeNull();
  });
});

describe("lo que se habló por teléfono le llega a la Elena de WhatsApp", () => {
  it("la Caja es de los paneles con contexto, con su Elena", () => {
    expect(PANELES_CON_CONTEXTO.get("chalatenango")).toBe("Elena");
    expect(PANELES_CON_CONTEXTO.get("comercial")).toBe("Sofía");
  });

  it("el bloque dice que es la misma Elena", async () => {
    await guardarContextoLlamada({
      tenant: "chalatenango",
      telefono: "50370001111",
      callId: "c9",
      resumen: "Probó cobros.",
      transcript: transcriptDe({ transcript: "AI: Hola\nUser: cobros" }, "Elena"),
    });
    const b = await contextoDeLlamadaPara("chalatenango", "50370001111");
    expect(b).toMatch(/LO QUE HABLASTE CON ESTA PERSONA POR TELÉFONO/);
    expect(b).toMatch(/eres la misma Elena/);
    expect(b).toMatch(/Elena: Hola\nPersona: cobros/);
    expect(await contextoDeLlamadaPara("nissan", "50370001111")).toBe("");
  });
});
