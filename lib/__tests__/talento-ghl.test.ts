// Tags de GHL al decidir sobre un candidato. Todo con fetch simulado: estas
// pruebas nunca llaman a GHL.
import { describe, expect, it, vi } from "vitest";
import { buscarContacto, configGhl, marcarEnGhl, type ConfigGhl } from "@/lib/talento/ghl";

const CFG: ConfigGhl = { pit: "pit-x", location: "LOC1", tagAprobado: "talento aprobado", tagRechazado: "talento rechazado" };

interface Llamada {
  url: string;
  method: string;
  body?: unknown;
  headers: Record<string, string>;
}

/** Un GHL de mentira: contactos por correo o telefono, y respuestas forzadas. */
function ghlFalso(opts: { porEmail?: string | null; porTelefono?: string | null; fallaTags?: number } = {}) {
  const llamadas: Llamada[] = [];
  const f = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    const method = init?.method ?? "GET";
    llamadas.push({ url: u, method, body: init?.body ? JSON.parse(String(init.body)) : undefined, headers: init?.headers as Record<string, string> });
    if (u.includes("/contacts/search/duplicate")) {
      const id = u.includes("email=") ? opts.porEmail : opts.porTelefono;
      return new Response(JSON.stringify({ contact: id ? { id } : null }), { status: 200 });
    }
    if (u.includes("/tags")) {
      if (opts.fallaTags) return new Response("boom", { status: opts.fallaTags });
      return new Response(JSON.stringify({ tags: [] }), { status: 201 });
    }
    return new Response("{}", { status: 404 });
  });
  return { f: f as unknown as typeof fetch, llamadas };
}

describe("configuración", () => {
  it("sin las cuatro env no hay GHL", () => {
    expect(configGhl({})).toBeNull();
    expect(configGhl({ GHL_TALENTO_PIT: "x", GHL_TALENTO_LOCATION: "y", GHL_TALENTO_TAG_APROBADO: "a" })).toBeNull();
    expect(
      configGhl({ GHL_TALENTO_PIT: " x ", GHL_TALENTO_LOCATION: "y", GHL_TALENTO_TAG_APROBADO: "a", GHL_TALENTO_TAG_RECHAZADO: "r" }),
    ).toEqual({ pit: "x", location: "y", tagAprobado: "a", tagRechazado: "r" });
  });
});

describe("buscar el contacto", () => {
  it("por correo primero, con la API v2 y la location", async () => {
    const { f, llamadas } = ghlFalso({ porEmail: "C1" });
    expect(await buscarContacto(CFG, { email: "Ana@Mail.com", telefono: "+503 7000 0000" }, f)).toBe("C1");
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].url).toBe("https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=LOC1&email=ana%40mail.com");
    expect(llamadas[0].headers).toMatchObject({ Authorization: "Bearer pit-x", Version: "2021-07-28" });
  });
  it("si el correo no aparece, por teléfono", async () => {
    const { f, llamadas } = ghlFalso({ porEmail: null, porTelefono: "C2" });
    expect(await buscarContacto(CFG, { email: "x@y.com", telefono: "+503 7000-0000" }, f)).toBe("C2");
    expect(llamadas[1].url).toContain("number=%2B50370000000");
  });
});

describe("marcar la decisión", () => {
  it("aprobado pone su tag y quita el de rechazado", async () => {
    const { f, llamadas } = ghlFalso({ porEmail: "C1" });
    const r = await marcarEnGhl(CFG, { email: "a@b.com" }, "aprobado", undefined, f);
    expect(r).toEqual({ ok: true, contactoId: "C1", puso: "talento aprobado", quito: "talento rechazado" });
    const tags = llamadas.filter((l) => l.url.endsWith("/contacts/C1/tags"));
    expect(tags.map((l) => [l.method, l.body])).toEqual([
      ["POST", { tags: ["talento aprobado"] }],
      ["DELETE", { tags: ["talento rechazado"] }],
    ]);
  });
  it("rechazado, al revés", async () => {
    const { f, llamadas } = ghlFalso({ porEmail: "C1" });
    await marcarEnGhl(CFG, { email: "a@b.com" }, "rechazado", undefined, f);
    const tags = llamadas.filter((l) => l.url.includes("/tags"));
    expect(tags.map((l) => [l.method, l.body])).toEqual([
      ["POST", { tags: ["talento rechazado"] }],
      ["DELETE", { tags: ["talento aprobado"] }],
    ]);
  });
  it("deshacer quita el tag que se había puesto y nada más", async () => {
    const { f, llamadas } = ghlFalso({ porEmail: "C1" });
    const r = await marcarEnGhl(CFG, { email: "a@b.com" }, "deshacer", "aprobado", f);
    expect(r).toEqual({ ok: true, contactoId: "C1", quito: "talento aprobado" });
    expect(llamadas.filter((l) => l.url.includes("/tags")).map((l) => [l.method, l.body])).toEqual([["DELETE", { tags: ["talento aprobado"] }]]);
  });
  it("si no encuentra el contacto, lo dice sin tocar tags", async () => {
    const { f, llamadas } = ghlFalso({ porEmail: null, porTelefono: null });
    const r = await marcarEnGhl(CFG, { email: "a@b.com", telefono: "+50370000000" }, "aprobado", undefined, f);
    expect(r.ok).toBe(false);
    expect(llamadas.some((l) => l.url.includes("/tags"))).toBe(false);
  });
  it("si GHL falla, devuelve el error en vez de reventar", async () => {
    const { f } = ghlFalso({ porEmail: "C1", fallaTags: 403 });
    const r = await marcarEnGhl(CFG, { email: "a@b.com" }, "aprobado", undefined, f);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("403");
  });
  it("si la red se cae, también", async () => {
    const f = (async () => {
      throw new Error("sin red");
    }) as unknown as typeof fetch;
    const r = await marcarEnGhl(CFG, { email: "a@b.com" }, "rechazado", undefined, f);
    expect(r).toEqual({ ok: false, error: "sin red" });
  });
});

describe("ruta /api/talento/ghl sin configurar", () => {
  it("no llama a GHL y responde ok", async () => {
    const espia = vi.spyOn(globalThis, "fetch");
    const { POST } = await import("@/app/api/talento/ghl/route");
    const { crearSesion, SESSION_COOKIE } = await import("@/lib/session");
    const valor = (await crearSesion("betme", "gerente_marketing"))!.valor;
    const r = await POST(
      new Request("http://x/api/talento/ghl", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `${SESSION_COOKIE}=${valor}` },
        body: JSON.stringify({ candidatoId: "r-1", accion: "aprobado" }),
      }),
    );
    expect(await r.json()).toEqual({ ok: true, omitido: true });
    expect(espia).not.toHaveBeenCalled();
    espia.mockRestore();
  });
});
