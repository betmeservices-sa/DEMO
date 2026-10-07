// Lo que se habló por teléfono le llega a la Sofía de WhatsApp: cómo se lee
// del payload de Vapi, cómo se guarda por panel y qué bloque ve el guion.
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getSupabase: () => null }));

import {
  bloqueContextoLlamada,
  contextoDeLlamadaPara,
  guardarContextoLlamada,
  leerContextoLlamada,
  transcriptDe,
} from "@/lib/llamada-contexto";

describe("la conversación de la llamada", () => {
  it("al colgar viene como texto: se nombra a Sofía y a la persona", () => {
    expect(transcriptDe({ transcript: "AI: Hola, soy Sofía\nUser: Tengo una clínica" })).toBe(
      "Sofía: Hola, soy Sofía\nPersona: Tengo una clínica",
    );
  });

  it("en plena llamada viene como mensajes: solo la conversación, sin herramientas", () => {
    const t = transcriptDe({
      messages: [
        { role: "system", message: "guion" },
        { role: "bot", message: "Hola, soy Sofía" },
        { role: "user", message: "Tengo una clínica dental" },
        { role: "tool_calls", message: "" },
        { role: "user", message: "Mejor seguimos por WhatsApp" },
      ],
    });
    expect(t).toBe("Sofía: Hola, soy Sofía\nPersona: Tengo una clínica dental\nPersona: Mejor seguimos por WhatsApp");
  });

  it("sin nada, nada", () => {
    expect(transcriptDe(undefined)).toBeNull();
    expect(transcriptDe({ messages: [] })).toBeNull();
  });
});

describe("el bloque para el guion de WhatsApp", () => {
  const ahora = Date.parse("2026-10-07T18:00:00Z");
  const base = {
    tenant: "comercial",
    telefono: "50375391721",
    callId: "c1",
    resumen: "Tiene una clínica dental y pierde mensajes de noche.",
    transcript: "Persona: Tengo una clínica",
    actualizado: "2026-10-07T17:50:00Z",
  };

  it("dice que es la misma Sofía y trae resumen y conversación", () => {
    const b = bloqueContextoLlamada(base, ahora);
    expect(b).toMatch(/LO QUE HABLASTE CON ESTA PERSONA POR TELÉFONO/);
    expect(b).toMatch(/eres la misma Sofía/);
    expect(b).toMatch(/clínica dental/);
    expect(b).toMatch(/Persona: Tengo una clínica/);
  });

  it("una llamada de hace más de dos semanas ya no cuenta", () => {
    expect(bloqueContextoLlamada({ ...base, actualizado: "2026-09-01T00:00:00Z" }, ahora)).toBe("");
  });

  it("una conversación larga se corta por el principio, no por el final", () => {
    const largo = "x".repeat(7000) + "FINAL";
    const b = bloqueContextoLlamada({ ...base, transcript: largo }, ahora);
    expect(b).toMatch(/FINAL$/);
    expect(b).toMatch(/\[\.\.\.\]/);
  });
});

describe("guardar y leer", () => {
  it("el resumen de la herramienta sobrevive aunque al colgar no venga resumen", async () => {
    await guardarContextoLlamada({ tenant: "comercial", telefono: "+50370000001", callId: "c9", resumen: "Le interesa voz" });
    await guardarContextoLlamada({ tenant: "comercial", telefono: "50370000001", callId: "c9", transcript: "Persona: hola" });
    const c = await leerContextoLlamada("comercial", "7000-0001");
    expect(c?.resumen).toBe("Le interesa voz");
    expect(c?.transcript).toBe("Persona: hola");
  });

  it("es por panel: otro panel no ve la llamada", async () => {
    await guardarContextoLlamada({ tenant: "comercial", telefono: "50370000002", resumen: "Hotel" });
    expect(await leerContextoLlamada("nissan", "50370000002")).toBeNull();
  });

  it("solo el panel comercial lo pega al guion", async () => {
    await guardarContextoLlamada({ tenant: "nissan", telefono: "50370000003", resumen: "X-Trail" });
    expect(await contextoDeLlamadaPara("nissan", "50370000003")).toBe("");
    await guardarContextoLlamada({ tenant: "comercial", telefono: "50370000003", resumen: "Restaurante" });
    expect(await contextoDeLlamadaPara("comercial", "50370000003")).toMatch(/Restaurante/);
  });
});
