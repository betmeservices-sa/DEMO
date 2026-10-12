// El freno compartido, en su modo de memoria (sin base). La lógica es la
// misma que con la tabla: la escalera, la ventana y la limpieza.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getSupabaseAgencia: () => null, getSupabase: () => null, haySupabase: () => false }));

const freno = await import("@/lib/freno");

beforeEach(() => {
  freno._vaciarFrenos();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-12T10:00:00-06:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("golpe (rutas públicas)", () => {
  it("deja pasar hasta el tope y corta después", async () => {
    const politica = { max: 3, ventanaSeg: 60 };
    expect(await freno.golpe("ip:1", politica)).toBe(false);
    expect(await freno.golpe("ip:1", politica)).toBe(false);
    expect(await freno.golpe("ip:1", politica)).toBe(false);
    expect(await freno.golpe("ip:1", politica)).toBe(true);
    // Otra clave no se entera.
    expect(await freno.golpe("ip:2", politica)).toBe(false);
  });

  it("vencida la ventana vuelve a contar de cero", async () => {
    const politica = { max: 1, ventanaSeg: 60 };
    await freno.golpe("ip:1", politica);
    expect(await freno.golpe("ip:1", politica)).toBe(true);
    vi.advanceTimersByTime(61_000);
    expect(await freno.golpe("ip:1", politica)).toBe(false);
  });
});

describe("escalera del login", () => {
  it("con cuatro fallos no bloquea, con cinco bloquea un minuto", async () => {
    const claves = ["login-ip:1", "correo:ana@x.com"];
    for (let i = 0; i < 4; i++) expect(await freno.fallo(claves)).toBe(0);
    expect(await freno.segundosBloqueada(claves)).toBe(0);
    expect(await freno.fallo(claves)).toBe(60);
    expect(await freno.segundosBloqueada(claves)).toBe(60);
  });

  it("el bloqueo vence solo y después sigue la escalera", async () => {
    const claves = ["correo:ana@x.com"];
    for (let i = 0; i < 5; i++) await freno.fallo(claves);
    vi.advanceTimersByTime(61_000);
    expect(await freno.segundosBloqueada(claves)).toBe(0);
    // Fallos 6, 7 y 8: el octavo sube a cinco minutos.
    await freno.fallo(claves);
    await freno.fallo(claves);
    expect(await freno.fallo(claves)).toBe(5 * 60);
  });

  it("entrar bien limpia el correo pero no la IP", async () => {
    for (let i = 0; i < 5; i++) await freno.fallo(["login-ip:1", "correo:ana@x.com"]);
    await freno.limpiar(["correo:ana@x.com"]);
    expect(await freno.segundosBloqueada(["correo:ana@x.com"])).toBe(0);
    expect(await freno.segundosBloqueada(["login-ip:1"])).toBe(60);
  });

  it("la tabla de la escalera", () => {
    expect(freno.bloqueoPorFallos(0)).toBe(0);
    expect(freno.bloqueoPorFallos(4)).toBe(0);
    expect(freno.bloqueoPorFallos(5)).toBe(60);
    expect(freno.bloqueoPorFallos(8)).toBe(300);
    expect(freno.bloqueoPorFallos(12)).toBe(1800);
    expect(freno.bloqueoPorFallos(20)).toBe(14_400);
    expect(freno.bloqueoPorFallos(50)).toBe(14_400);
  });
});

describe("claves y respuesta", () => {
  it("la IP sale del primer x-forwarded-for", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } });
    expect(freno.claveIp(req, "login-ip")).toBe("login-ip:1.2.3.4");
    expect(freno.claveIp(new Request("http://x"))).toBe("ip:sin-ip");
    expect(freno.claveCorreo("  Ana@X.com ")).toBe("correo:ana@x.com");
  });

  it("la respuesta 429 trae Retry-After y cuánto esperar en palabras", async () => {
    const r = freno.respuestaBloqueado(300);
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("300");
    const j = (await r.json()) as { error: string; esperar: number };
    expect(j.error).toContain("5 minutos");
    expect(j.esperar).toBe(300);
    expect(freno.textoEspera(60)).toBe("un minuto");
    expect(freno.textoEspera(3600)).toBe("una hora");
    expect(freno.textoEspera(14_400)).toBe("4 horas");
  });
});
