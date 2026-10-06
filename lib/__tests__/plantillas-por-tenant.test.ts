// Un cliente sin número propio NO hereda las plantillas de otra cuenta.
//
// Antes, sin conexión propia, el listado caía a la WABA del entorno (la de
// Grupo Q): Pizza Hut y el hospital veían las plantillas de CrediQ, y desde su
// panel se podía crear o borrar en esa cuenta. Ahora se listan con las mismas
// credenciales con que se envía: el número propio, o el de la demo solo para
// el cliente del interruptor (wa_routing).
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getSupabase: () => null, todosLosClientes: () => [] }));

import { eliminarTemplate, listarTemplates, crearTemplate } from "@/lib/wa-templates";
import { guardarConexionWa, olvidarConexionesWa } from "@/lib/wa-conexiones-store";
import { setWaTenant } from "@/lib/wa-routing";
import { TENANTS } from "@/lib/tenants";

const ENV_WABA = "waba-env-grupoq";
const NISSAN_WABA = "waba-nissan";

const PLANTILLAS: Record<string, string[]> = {
  [ENV_WABA]: ["crediq_seguimiento_llamada", "crediq_continuar_solicitud", "hello_world"],
  [NISSAN_WABA]: ["nissan_solicitud_registrada"],
};

const llamadas: { url: string; metodo: string }[] = [];
const fetchOriginal = globalThis.fetch;
const envOriginal = { ...process.env };

beforeEach(async () => {
  llamadas.length = 0;
  olvidarConexionesWa();
  process.env.WHATSAPP_ACCESS_TOKEN = "token-env";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-env";
  process.env.WHATSAPP_WABA_ID = ENV_WABA;
  // El número de la demo hoy está apuntado a Grupo Q.
  await setWaTenant("grupoq");
  globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    llamadas.push({ url: u, metodo: init?.method ?? "GET" });
    const waba = Object.keys(PLANTILLAS).find((w) => u.includes(`/${w}/`));
    const data = (waba ? PLANTILLAS[waba] : []).map((name) => ({
      id: name,
      name,
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [],
    }));
    return new Response(JSON.stringify({ data, success: true }), { status: 200 });
  }) as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = fetchOriginal;
  process.env = envOriginal;
});

const nombres = (xs: { name: string }[]) => xs.map((t) => t.name);

describe("plantillas por cliente", () => {
  it("Pizza Hut no ve las plantillas de otra cuenta: solo las suyas (hoy ninguna)", async () => {
    const r = await listarTemplates("pizzahut");
    expect(r.ok).toBe(true);
    expect(r.demo).toBe(true);
    expect(r.sinNumero).toBe(true);
    expect(nombres(r.templates)).toEqual(nombres(TENANTS.pizzahut.waTemplates));
    expect(nombres(r.templates).some((n) => n.startsWith("crediq_") || n === "hello_world")).toBe(false);
    expect(llamadas.some((l) => l.url.includes(ENV_WABA))).toBe(false);
  });

  it("Grupo Q, dueño del número de la demo, sigue viendo las de CrediQ", async () => {
    const r = await listarTemplates("grupoq");
    expect(r.demo).toBe(false);
    expect(nombres(r.templates)).toEqual(PLANTILLAS[ENV_WABA]);
  });

  it("Nissan sigue viendo las de su propia cuenta", async () => {
    await guardarConexionWa({
      tenant: "nissan",
      wabaId: NISSAN_WABA,
      phoneNumberId: "phone-nissan",
      displayPhone: null,
      verifiedName: null,
      accessToken: "token-nissan",
      iaActiva: null,
    });
    const r = await listarTemplates("nissan");
    expect(r.demo).toBe(false);
    expect(nombres(r.templates)).toEqual(PLANTILLAS[NISSAN_WABA]);
  });

  it("otro cliente sin número tampoco hereda las de la demo", async () => {
    const r = await listarTemplates("hospital");
    expect(nombres(r.templates)).toEqual(nombres(TENANTS.hospital.waTemplates));
    expect(llamadas.some((l) => l.url.includes(ENV_WABA))).toBe(false);
  });

  it("si el interruptor cambia de cliente, el número (y sus plantillas) se va con él", async () => {
    await setWaTenant("hospital");
    expect((await listarTemplates("hospital")).demo).toBe(false);
    expect((await listarTemplates("grupoq")).demo).toBe(true);
  });

  it("Pizza Hut no las ve ni con el interruptor apuntándole el número de la demo", async () => {
    await setWaTenant("pizzahut");
    const r = await listarTemplates("pizzahut");
    expect(nombres(r.templates)).toEqual(nombres(TENANTS.pizzahut.waTemplates));
    expect(llamadas.some((l) => l.url.includes(ENV_WABA))).toBe(false);
  });

  it("desde Pizza Hut no se crea ni se borra nada en la cuenta de otro", async () => {
    await eliminarTemplate("crediq_seguimiento_llamada", "pizzahut");
    await crearTemplate({ name: "prueba_pizza", language: "es", category: "UTILITY", body: "Hola" }, "pizzahut");
    expect(llamadas.filter((l) => l.metodo !== "GET")).toEqual([]);
  });
});
