// La Caja de Credito de Chalatenango: que este bien enchufada al demo, que su
// bandeja se parta en las tres areas que pidio el cliente, que su agente de
// WhatsApp diga solo lo publicado, y que la agente de voz tenga el guion
// maestro con sus cuatro caminos y el estandar vigente de voz.
import { describe, expect, it } from "vitest";
import { DEMO_LOGINS, TENANTS, isTenantId, resolveTenantByLogin } from "@/lib/tenants";
import { assistantIdDeTenant, esDelTenant, tenantDeAssistant, veModuloVoz } from "@/lib/tenants/voz";
import { PANEL_AREAS, URGENTES } from "@/lib/tenants/chalatenango-panel";
import { MODULOS_CAJA } from "@/lib/modulos";
import { enArea } from "@/lib/area-shell";
import {
  CAMINOS,
  CHALATENANGO_ASSISTANT_ID,
  CONFIG_VAPI_CHALATENANGO,
  GUION_MAESTRO,
  NOMBRE_AGENTE,
  PRIMER_MENSAJE,
  armarGuion,
} from "@/lib/chalatenango-agente";

const caja = TENANTS.chalatenango;

describe("tenant chalatenango: acceso", () => {
  it("demoagentia / demochalate entra a la Caja", () => {
    expect(resolveTenantByLogin("demoagentia", "demochalate")).toBe("chalatenango");
    expect(isTenantId("chalatenango")).toBe(true);
    expect(caja.id).toBe("chalatenango");
  });

  it("no le roba la contraseña a nadie y cada clave abre un solo panel", () => {
    expect(resolveTenantByLogin("demoagentia", "miagentiacobros")).toBe("promerica");
    expect(resolveTenantByLogin("demoagentia", "demop")).toBe("pizzahut");
    const porClave = new Map<string, string>();
    for (const l of DEMO_LOGINS.filter((x) => x.usuario === "demoagentia")) {
      expect(porClave.has(l.password), l.password).toBe(false);
      porClave.set(l.password, l.tenant);
    }
  });
});

describe("tenant chalatenango: la bandeja en tres areas", () => {
  const ids = caja.seed.departments.map((d) => d.id);

  it("las areas son consultas generales, cobros y tarjetas de crédito, en ese orden", () => {
    expect(caja.areas).toEqual(["consultas", "cobranza", "tarjetas"]);
    expect(caja.seed.departments.map((d) => d.nombre)).toEqual([
      "Consultas generales",
      "Cobros",
      "Tarjetas de crédito",
    ]);
    expect(ids).toContain(caja.defaultDepartment);
  });

  it("cada área trae conversaciones de muestra, y entran por los tres canales", () => {
    for (const a of caja.areas!) {
      expect(caja.seed.conversations.filter((c) => c.departamento === a).length, a).toBeGreaterThanOrEqual(3);
    }
    expect(new Set(caja.seed.conversations.map((c) => c.canal))).toEqual(new Set(["whatsapp", "facebook", "instagram"]));
  });

  it("todo cuelga de algo que existe: contactos, departamentos y equipo", () => {
    const contactos = new Set(caja.seed.contacts.map((c) => c.id));
    const equipo = new Set(caja.seed.staff.map((s) => s.id));
    for (const c of caja.seed.conversations) {
      expect(contactos.has(c.contactId), c.id).toBe(true);
      expect(ids).toContain(c.departamento);
      if (c.asignadoA) expect(equipo.has(c.asignadoA), c.id).toBe(true);
    }
    for (const s of caja.seed.staff) expect(ids).toContain(s.departamento);
    for (const c of caja.seed.contacts) for (const t of c.tags ?? []) expect(caja.tags).toContain(t);
  });

  // Los telefonos de muestra van con 9 despues del 503, una serie que no se
  // asigna en El Salvador: ningun boton del demo puede escribirle a alguien.
  it("los teléfonos de muestra son de la serie que no se asigna", () => {
    const tels = [
      ...caja.seed.contacts.map((c) => c.telefono),
      ...caja.simulacion.contactos.map((c) => c.telefono),
    ].filter(Boolean) as string[];
    expect(tels.length).toBeGreaterThan(5);
    for (const t of tels) expect(t, t).toMatch(/^5039\d{7}$/);
  });

  it("el filtro de área deja pasar todo con 'todos' y solo lo suyo con un área", () => {
    expect(enArea("todos", "cobranza")).toBe(true);
    expect(enArea("cobranza", "cobranza")).toBe(true);
    expect(enArea("cobranza", "tarjetas")).toBe(false);
  });

  it("el tablero tiene una tarjeta por área y lo urgente apunta a contactos reales de la semilla", () => {
    expect(PANEL_AREAS.map((a) => a.id)).toEqual(caja.areas);
    for (const a of PANEL_AREAS) expect(a.serie).toHaveLength(7);
    const contactos = new Set(caja.seed.contacts.map((c) => c.id));
    for (const u of URGENTES) {
      expect(contactos.has(u.contactId), u.id).toBe(true);
      expect(caja.areas).toContain(u.area);
    }
    for (const a of caja.areas!) expect(URGENTES.some((u) => u.area === a), a).toBe(true);
  });

  it("usa su cara propia y un riel sin ajustes globales", () => {
    expect(caja.shell).toBe("flotante");
    expect(MODULOS_CAJA[0]).toBe("bandeja");
    expect(MODULOS_CAJA).not.toContain("settings");
    // Ningun otro panel cambia de cara.
    const flotantes = Object.values(TENANTS).filter((t) => t.shell === "flotante").map((t) => t.id);
    expect(flotantes).toEqual(["chalatenango"]);
  });

  it("su marca es la de la Caja, sin redes que publicar", () => {
    expect(caja.brand.nombre).toBe("Caja de Crédito de Chalatenango");
    expect(caja.brand.logoComponent).toBe("chalatenango");
    expect(caja.seed.socialPosts).toHaveLength(0);
  });
});

describe("tenant chalatenango: agente de WhatsApp", () => {
  const p = caja.ai.systemPrompt;

  it("es Elena, con luna", () => {
    expect(caja.ai.modelo).toBe("luna");
    expect(caja.ai.nombre).toBe(NOMBRE_AGENTE);
    expect(p).toContain("Eres Elena");
  });

  it("dice lo publicado y manda lo demás a un asesor", () => {
    for (const dato of ["2362-2500", "2221-3333", "Chatbot Fede", "Fede Punto Vecino", "Plaza Suiza", "El Coyolito"]) {
      expect(p, dato).toContain(dato);
    }
    expect(p).toMatch(/NUNCA inventes tasas/);
    expect(p).toMatch(/los confirma un asesor/);
  });

  it("verifica antes de hablar de una cuenta y nunca pide claves", () => {
    expect(p).toMatch(/últimos cuatro dígitos del DUI/);
    expect(p).toMatch(/NUNCA pidas número completo de tarjeta, CVV, PIN/);
    expect(p).toMatch(/NUNCA amenaces/);
  });

  it("sin guiones largos", () => {
    expect(p).not.toContain("—");
    for (const t of caja.simulacion.turnos) {
      expect(t.entra).not.toContain("—");
      expect(t.responde).not.toContain("—");
    }
  });
});

describe("agente de voz de la Caja (Elena, demo)", () => {
  const guion = armarGuion();

  it("es del panel de la Caja y de nadie más", () => {
    expect(assistantIdDeTenant("chalatenango")).toBe(CHALATENANGO_ASSISTANT_ID);
    expect(CHALATENANGO_ASSISTANT_ID).toMatch(/^[0-9a-f-]{36}$/);
    expect(veModuloVoz("chalatenango")).toBe(true);
    expect(tenantDeAssistant(CHALATENANGO_ASSISTANT_ID)).toBe("chalatenango");
    expect(esDelTenant(CHALATENANGO_ASSISTANT_ID, "promerica")).toBe(false);
  });

  it("abre ofreciendo los cuatro papeles y la demo", () => {
    expect(PRIMER_MENSAJE.startsWith("Hola, soy Elena, de la Caja de Crédito de Chalatenango.")).toBe(true);
    for (const papel of ["gestora de cobros", "asesora de tarjeta de crédito", "consultas generales", "ofrecer crédito"]) {
      expect(PRIMER_MENSAJE).toContain(papel);
    }
    expect(PRIMER_MENSAJE).toMatch(/¿Quiere que hagamos una demo\?/);
  });

  it("un guion maestro y cuatro caminos, cada uno con su guion", () => {
    expect(CAMINOS.map((c) => c.id)).toEqual(["cobros", "tarjeta", "consultas", "credito"]);
    for (const c of CAMINOS) {
      expect(c.guion).toMatch(/^CAMINO /);
      expect(c.guion).toMatch(/Escena/);
      expect(c.guion).toMatch(/CIERRE DE LA ESCENA/);
      expect(guion).toContain(c.guion);
    }
    expect(guion.startsWith(GUION_MAESTRO)).toBe(true);
    expect(GUION_MAESTRO).toMatch(/SI LA PERSONA SE SALE DEL PAPEL/);
    expect(GUION_MAESTRO).toMatch(/AL CERRAR UN CAMINO/);
  });

  // Las muletillas solo pueden aparecer en la regla que las prohibe; las mas
  // coloquiales ni eso.
  it("tono neutro: sin modismos fuera de la regla que los prohíbe", () => {
    const sinRegla = guion.replace(/nada de "va", "vaya", "fíjese", "rapidito" ni "pues" de relleno/, "");
    for (const w of ["va", "vaya", "fíjese", "rapidito", "pues"]) {
      expect(sinRegla, w).not.toMatch(new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, "iu"));
    }
    for (const w of ["simón", "cipote", "chivo", "de una", "cabal", "pisto"]) {
      expect(guion, w).not.toMatch(new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, "iu"));
    }
    expect(guion).not.toContain("—");
  });

  it("los teléfonos van de dos en dos y las marcas como se pronuncian", () => {
    expect(guion).toContain("veintitrés, sesenta y dos, veinticinco, cero cero");
    expect(guion).toContain("veintidós, veintiuno, treinta y tres, treinta y tres");
    expect(guion).toMatch(/CÓMO SE DICEN LAS MARCAS/);
    expect(guion).not.toMatch(/FEDECR[ÉE]DITO|FEDE BANKING|FEDE M[ÓO]VIL/);
  });

  it("no inventa tasas ni usa datos reales en la demo", () => {
    expect(guion).toMatch(/NUNCA inventes tasas/);
    expect(guion).toMatch(/En la demo NO se usan datos reales/);
    expect(guion).not.toMatch(/\d+(\.\d+)?\s?%/);
  });

  it("cuelga solo con su frase de cierre, que no se dice en ninguna escena", () => {
    const frase = CONFIG_VAPI_CHALATENANGO.endCallPhrases[0];
    expect(frase).toBe("gracias por probar la demo");
    expect(PRIMER_MENSAJE.toLowerCase()).not.toContain(frase);
    expect(guion.toLowerCase().split(frase).length - 1).toBe(1);
    for (const c of CAMINOS) expect(c.guion.toLowerCase()).not.toContain(frase);
  });

  it("settings del estándar vigente (luna + eleven_v4_turbo + Eli Salvadoran)", () => {
    const c = CONFIG_VAPI_CHALATENANGO;
    expect(c.name.length).toBeLessThanOrEqual(40);
    expect(c.model.provider).toBe("openai");
    expect(c.model.model).toBe("gpt-5.6-luna");
    expect("temperature" in c.model).toBe(false);
    expect("maxTokens" in c.model).toBe(false);
    expect(c.voice).toMatchObject({ provider: "11labs", model: "eleven_v4_turbo", voiceId: "cQ7rlUiVL3ishf4Oo7t2" });
    expect(c.transcriber).toMatchObject({ provider: "deepgram", model: "nova-3", language: "es-419" });
    expect(c.transcriber.keyterm).toContain("Chalatenango");
    expect(c.maxDurationSeconds).toBe(900);
    expect(c.messagePlan.idleMessages.length).toBeGreaterThan(0);
    expect(c.voicemailMessage).toMatch(/Caja de Crédito de Chalatenango/);
    expect("server" in c).toBe(false);
  });
});
