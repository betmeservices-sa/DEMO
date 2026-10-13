// PROBAR A VALERIA DESDE EL DEMO NO TIENE GUION: REENVÍA AL HUB.
//
// Lo que se afirma: la ruta es solo de la clínica, sin secreto avisa que falta
// la conexión (503) en vez de inventar una respuesta, manda el historial al
// hub con el bearer, devuelve lo que Valeria dijo sin tokens ni costo, y el
// módulo "valeria" vive en el menú de la clínica y en ningún otro.
import { describe, expect, it, vi, beforeEach } from "vitest";

let permiso: { ok: true; sesion: unknown } | { ok: false; respuesta: Response } = {
  ok: true,
  sesion: { tenant: "consultorio", rol: "gerente_marketing", fijo: false, todos: false },
};
vi.mock("@/lib/permisos", () => ({ exigirModulo: vi.fn(async () => permiso) }));

let tenant = "consultorio";
vi.mock("@/lib/tenants/server", () => ({ tenantFromRequest: () => tenant }));

let bloqueado = false;
vi.mock("@/lib/freno", () => ({ golpe: vi.fn(async () => bloqueado) }));

const fetchSimulado = vi.fn();
vi.stubGlobal("fetch", fetchSimulado);

const { POST } = await import("@/app/api/consultorio/valeria/route");
const { cuerpoDePrueba, peticionAlHub, urlDelHub, claveDeFreno, FRENO_PRUEBA, SIN_CONEXION } = await import(
  "@/lib/consultorio/valeria"
);
const { MODULOS_CLINICA, VE, VE_CLINICA, moduloDeRuta, puedeVerRuta } = await import("@/lib/modulos");

const SECRETO = "s3cr3t0-de-prueba";
const golpe = vi.mocked((await import("@/lib/freno")).golpe);

function pedir(cuerpo: unknown) {
  return POST(
    new Request("http://demo.test/api/consultorio/valeria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    }),
  );
}

function hubResponde(cuerpo: unknown, status = 200) {
  fetchSimulado.mockResolvedValueOnce(
    new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } }),
  );
}

beforeEach(() => {
  fetchSimulado.mockReset();
  golpe.mockClear();
  tenant = "consultorio";
  bloqueado = false;
  permiso = { ok: true, sesion: { tenant: "consultorio", rol: "gerente_marketing", fijo: false, todos: false } };
  delete process.env.VALERIA_PRUEBA_SECRET;
  delete process.env.HUB_URL;
});

describe("lo que se arma sin red", () => {
  it("el cuerpo del navegador se limpia y el último mensaje tiene que ser del paciente", () => {
    expect(cuerpoDePrueba({ sesion: "ab c!1", mensajes: [{ autor: "cliente", texto: " hola " }] })).toEqual({
      sesion: "abc1",
      mensajes: [{ autor: "cliente", texto: "hola" }],
    });
    expect(cuerpoDePrueba({ mensajes: [{ autor: "cliente", texto: "hola" }] })?.sesion).toBe("sin-sesion");
    expect(cuerpoDePrueba({ mensajes: [{ autor: "cliente", texto: "hola" }, { autor: "agente", texto: "Buenos días" }] })).toBeNull();
    expect(cuerpoDePrueba({ mensajes: [{ autor: "otro", texto: "x" }, { autor: "cliente", texto: "" }] })).toBeNull();
    expect(cuerpoDePrueba({ mensajes: "hola" })).toBeNull();
    expect(cuerpoDePrueba(undefined)).toBeNull();
  });

  it("la petición al hub lleva el bearer y va a /api/hospital/probar", () => {
    const p = peticionAlHub({ sesion: "x", mensajes: [{ autor: "cliente", texto: "hola" }] }, SECRETO);
    expect(p?.url).toBe("https://hub.miagentia.com/api/hospital/probar");
    expect((p?.init.headers as Record<string, string>).Authorization).toBe(`Bearer ${SECRETO}`);
    expect(JSON.parse(String(p?.init.body))).toEqual({ sesion: "x", mensajes: [{ autor: "cliente", texto: "hola" }] });
    // Sin secreto no hay petición: el camino está cerrado.
    expect(peticionAlHub({ sesion: "x", mensajes: [] }, undefined)).toBeNull();
    expect(peticionAlHub({ sesion: "x", mensajes: [] }, "  ")).toBeNull();
  });

  it("HUB_URL cambia el destino (sin barra final repetida)", () => {
    expect(urlDelHub(undefined)).toBe("https://hub.miagentia.com/api/hospital/probar");
    expect(urlDelHub("http://localhost:3100/")).toBe("http://localhost:3100/api/hospital/probar");
  });

  it("el freno cuenta por conversación", () => {
    expect(claveDeFreno("abc")).toBe("valeria-demo:abc");
    expect(FRENO_PRUEBA.max).toBeGreaterThan(10);
  });
});

describe("POST /api/consultorio/valeria", () => {
  it("reenvía al hub con el bearer y devuelve lo que dijo Valeria, sin tokens ni costo", async () => {
    process.env.VALERIA_PRUEBA_SECRET = SECRETO;
    hubResponde({ ok: true, respuesta: "La prueba de embarazo en sangre cuesta $20.20.", uso: { input_tokens: 9 } });
    const r = await pedir({ sesion: "abc", mensajes: [{ autor: "cliente", texto: "cuánto cuesta la prueba de embarazo" }] });
    const d = await r.json();
    expect(r.status).toBe(200);
    expect(d).toEqual({ ok: true, respuesta: "La prueba de embarazo en sangre cuesta $20.20." });
    expect(JSON.stringify(d)).not.toMatch(/token|costo/i);

    const [url, init] = fetchSimulado.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://hub.miagentia.com/api/hospital/probar");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${SECRETO}`);
    expect(JSON.parse(String(init.body))).toEqual({
      sesion: "abc",
      mensajes: [{ autor: "cliente", texto: "cuánto cuesta la prueba de embarazo" }],
    });
    expect(golpe.mock.calls[0][0]).toBe("valeria-demo:abc");
  });

  it("otro tenant, 404 y no toca el hub", async () => {
    process.env.VALERIA_PRUEBA_SECRET = SECRETO;
    tenant = "hospital";
    const r = await pedir({ sesion: "abc", mensajes: [{ autor: "cliente", texto: "hola" }] });
    expect(r.status).toBe(404);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("sin el secreto configurado, 503 con el aviso de conexión", async () => {
    const r = await pedir({ sesion: "abc", mensajes: [{ autor: "cliente", texto: "hola" }] });
    expect(r.status).toBe(503);
    expect((await r.json()).error).toBe(SIN_CONEXION);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("sin mensaje del paciente, 400", async () => {
    process.env.VALERIA_PRUEBA_SECRET = SECRETO;
    const r = await pedir({ sesion: "abc", mensajes: [] });
    expect(r.status).toBe(400);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("con el freno pasado, 429 antes de molestar al hub", async () => {
    process.env.VALERIA_PRUEBA_SECRET = SECRETO;
    bloqueado = true;
    const r = await pedir({ sesion: "abc", mensajes: [{ autor: "cliente", texto: "hola" }] });
    expect(r.status).toBe(429);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("si el hub dice que no, se pasa su error y su estado", async () => {
    process.env.VALERIA_PRUEBA_SECRET = SECRETO;
    hubResponde({ ok: false, error: "Muchos mensajes seguidos. Espera unos minutos y vuelve a probar." }, 429);
    const r = await pedir({ sesion: "abc", mensajes: [{ autor: "cliente", texto: "hola" }] });
    expect(r.status).toBe(429);
    expect((await r.json()).error).toMatch(/Espera unos minutos/);
  });

  it("si el hub no responde, un aviso corto", async () => {
    process.env.VALERIA_PRUEBA_SECRET = SECRETO;
    fetchSimulado.mockRejectedValueOnce(new Error("se cayó"));
    const r = await pedir({ sesion: "abc", mensajes: [{ autor: "cliente", texto: "hola" }] });
    const d = await r.json();
    expect(d.ok).toBe(false);
    expect(d.error).toBe("Valeria no respondió. Intenta de nuevo.");
  });

  it("sin permiso, lo que diga la puerta", async () => {
    process.env.VALERIA_PRUEBA_SECRET = SECRETO;
    permiso = { ok: false, respuesta: new Response("no", { status: 401 }) };
    const r = await pedir({ sesion: "abc", mensajes: [{ autor: "cliente", texto: "hola" }] });
    expect(r.status).toBe(401);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });
});

describe("el módulo valeria", () => {
  it("es de la clínica y está en su menú, antes que /consultorio en el ruteo", () => {
    expect(moduloDeRuta("/consultorio/valeria")).toBe("valeria");
    expect(moduloDeRuta("/consultorio")).toBe("consultorio");
    expect(MODULOS_CLINICA).toContain("valeria");
    expect(VE_CLINICA).toContain("valeria");
  });

  it("lo ve todo el que ve el consultorio", () => {
    for (const rol of ["recepcion", "medico", "jefe", "admin", "gerente_marketing"] as const) {
      expect(puedeVerRuta(rol, "/consultorio/valeria"), rol).toBe(true);
    }
    expect(VE.atencion).not.toContain("valeria");
    expect(VE.marketing).not.toContain("valeria");
  });
});
