// PROBAR A VALERIA DESDE EL DEMO: LA DEL LABORATORIO CORRE AQUÍ, LA DEL HOSPITAL SE REENVÍA AL HUB.
//
// Lo que se afirma: la ruta es solo de la clínica; sin guion pedido contesta
// la Valeria del laboratorio con el tenant del lab, como conversación de
// prueba, y devuelve los casos que habría abierto sin tokens ni costo; con el
// guion "hospital", sin secreto avisa que falta la conexión (503) en vez de
// inventar una respuesta, manda el historial al hub con el bearer y devuelve
// lo que Valeria dijo; y el módulo "valeria" vive en el menú de la clínica y
// en ningún otro.
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

const generarRespuesta = vi.fn();
vi.mock("@/lib/ai", () => ({ generarRespuesta: (...a: unknown[]) => generarRespuesta(...a) }));

const fetchSimulado = vi.fn();
vi.stubGlobal("fetch", fetchSimulado);

const { POST } = await import("@/app/api/consultorio/valeria/route");
const { cuerpoDePrueba, peticionAlHub, urlDelHub, claveDeFreno, FRENO_PRUEBA, SIN_CONEXION, guionDePrueba, cierreDeCaso } = await import(
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
  generarRespuesta.mockReset();
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

describe("la prueba del laboratorio, sin red", () => {
  it("el guion es el del laboratorio salvo que pidan el del hospital", () => {
    expect(guionDePrueba({ guion: "hospital" })).toBe("hospital");
    expect(guionDePrueba({ guion: "otro" })).toBe("laboratorio");
    expect(guionDePrueba(null)).toBe("laboratorio");
  });

  it("el cierre de un caso sigue el horario de Escalón, en hora de El Salvador", () => {
    // 2026-10-21 es miércoles; El Salvador es UTC-6.
    expect(cierreDeCaso(new Date("2026-10-21T15:00:00Z"))).toMatch(/lo antes posible/); // 9:00 a.m.
    expect(cierreDeCaso(new Date("2026-10-22T01:30:00Z"))).toMatch(/mañana a partir de las 6:00/); // 7:30 p.m.
    expect(cierreDeCaso(new Date("2026-10-21T10:00:00Z"))).toMatch(/^Una compañera .* a partir de las 6:00/); // 4:00 a.m.
    // Domingo 25: abre hasta las 12:00 m.
    expect(cierreDeCaso(new Date("2026-10-25T17:00:00Z"))).toMatch(/lo antes posible/); // 11:00 a.m.
    expect(cierreDeCaso(new Date("2026-10-25T19:00:00Z"))).toMatch(/mañana/); // 1:00 p.m.
  });
});

describe("POST /api/consultorio/valeria", () => {
  it("reenvía al hub con el bearer y devuelve lo que dijo Valeria, sin tokens ni costo", async () => {
    process.env.VALERIA_PRUEBA_SECRET = SECRETO;
    hubResponde({ ok: true, respuesta: "La prueba de embarazo en sangre cuesta $20.20.", uso: { input_tokens: 9 } });
    const r = await pedir({ sesion: "abc", guion: "hospital", mensajes: [{ autor: "cliente", texto: "cuánto cuesta la prueba de embarazo" }] });
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
    const r = await pedir({ sesion: "abc", guion: "hospital", mensajes: [{ autor: "cliente", texto: "hola" }] });
    expect(r.status).toBe(404);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("sin el secreto configurado, 503 con el aviso de conexión", async () => {
    const r = await pedir({ sesion: "abc", guion: "hospital", mensajes: [{ autor: "cliente", texto: "hola" }] });
    expect(r.status).toBe(503);
    expect((await r.json()).error).toBe(SIN_CONEXION);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("sin mensaje del paciente, 400", async () => {
    process.env.VALERIA_PRUEBA_SECRET = SECRETO;
    const r = await pedir({ sesion: "abc", guion: "hospital", mensajes: [] });
    expect(r.status).toBe(400);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("con el freno pasado, 429 antes de molestar al hub", async () => {
    process.env.VALERIA_PRUEBA_SECRET = SECRETO;
    bloqueado = true;
    const r = await pedir({ sesion: "abc", guion: "hospital", mensajes: [{ autor: "cliente", texto: "hola" }] });
    expect(r.status).toBe(429);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("si el hub dice que no, se pasa su error y su estado", async () => {
    process.env.VALERIA_PRUEBA_SECRET = SECRETO;
    hubResponde({ ok: false, error: "Muchos mensajes seguidos. Espera unos minutos y vuelve a probar." }, 429);
    const r = await pedir({ sesion: "abc", guion: "hospital", mensajes: [{ autor: "cliente", texto: "hola" }] });
    expect(r.status).toBe(429);
    expect((await r.json()).error).toMatch(/Espera unos minutos/);
  });

  it("si el hub no responde, un aviso corto", async () => {
    process.env.VALERIA_PRUEBA_SECRET = SECRETO;
    fetchSimulado.mockRejectedValueOnce(new Error("se cayó"));
    const r = await pedir({ sesion: "abc", guion: "hospital", mensajes: [{ autor: "cliente", texto: "hola" }] });
    const d = await r.json();
    expect(d.ok).toBe(false);
    expect(d.error).toBe("Valeria no respondió. Intenta de nuevo.");
  });

  it("sin permiso, lo que diga la puerta", async () => {
    process.env.VALERIA_PRUEBA_SECRET = SECRETO;
    permiso = { ok: false, respuesta: new Response("no", { status: 401 }) };
    const r = await pedir({ sesion: "abc", guion: "hospital", mensajes: [{ autor: "cliente", texto: "hola" }] });
    expect(r.status).toBe(401);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });
});

describe("POST /api/consultorio/valeria, la Valeria del laboratorio", () => {
  it("sin guion pedido contesta la del lab, como prueba, sin tocar el hub", async () => {
    generarRespuesta.mockImplementationOnce(async (_h: unknown, acciones: { onCaso?: (c: unknown) => void }) => {
      acciones.onCaso?.({ tipo: "resultados", titulo: "Pide sus resultados" });
      return { texto: "Gracias. **Una compañera** le escribe por aquí.", uso: { input_tokens: 9 }, modelo: "gpt-6-luna" };
    });
    const r = await pedir({
      sesion: "lab1",
      mensajes: [
        { autor: "cliente", texto: "ya estan mis resultados?" },
        { autor: "agente", texto: "¿Me indica su nombre completo?" },
        { autor: "cliente", texto: "Ana Pérez" },
      ],
    });
    const d = await r.json();
    expect(r.status).toBe(200);
    expect(d).toEqual({
      ok: true,
      respuesta: "Gracias. Una compañera le escribe por aquí.",
      casos: [{ tipo: "resultados", titulo: "Pide sus resultados" }],
    });
    expect(JSON.stringify(d)).not.toMatch(/token|costo|luna/i);
    expect(fetchSimulado).not.toHaveBeenCalled();

    const [historial, , contexto] = generarRespuesta.mock.calls[0];
    expect(historial).toEqual([
      { autor: "cliente", texto: "ya estan mis resultados?" },
      { autor: "staff", texto: "¿Me indica su nombre completo?" },
      { autor: "cliente", texto: "Ana Pérez" },
    ]);
    expect(contexto).toEqual({ tenantId: "consultorio", clave: "prueba:lab1" });
  });

  it("no necesita el secreto del hub", async () => {
    generarRespuesta.mockResolvedValueOnce({ texto: "Buenos días", uso: {}, modelo: "x" });
    const r = await pedir({ sesion: "lab2", mensajes: [{ autor: "cliente", texto: "hola" }] });
    expect(r.status).toBe(200);
    expect((await r.json()).ok).toBe(true);
  });

  it("si el modelo falla, un aviso corto", async () => {
    generarRespuesta.mockRejectedValueOnce(new Error("sin llave"));
    const r = await pedir({ sesion: "lab3", mensajes: [{ autor: "cliente", texto: "hola" }] });
    expect(await r.json()).toEqual({ ok: false, error: "Valeria no respondió. Intenta de nuevo." });
  });

  it("con el freno pasado, 429 sin llamar al modelo", async () => {
    bloqueado = true;
    const r = await pedir({ sesion: "lab4", mensajes: [{ autor: "cliente", texto: "hola" }] });
    expect(r.status).toBe(429);
    expect(generarRespuesta).not.toHaveBeenCalled();
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
