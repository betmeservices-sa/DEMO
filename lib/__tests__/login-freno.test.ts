// El login frena a quien prueba claves: cinco fallos y queda afuera un rato,
// por correo y por IP. Entrar bien limpia el correo.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getSupabaseAgencia: () => null, getSupabase: () => null, haySupabase: () => false }));
vi.mock("@/lib/auth-server", () => ({
  validarCredenciales: async (usuario: string, password: string) =>
    password === "buena" ? { tenant: "yaly", rol: "recepcion", fijo: true, usuario, nombre: "Ana" } : null,
}));

const { POST } = await import("@/app/api/auth/login/route");
const { _vaciarFrenos } = await import("@/lib/freno");

function login(usuario: string, password: string, ip = "1.1.1.1"): Request {
  return new Request("http://hub.test/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ usuario, password }),
  });
}

beforeEach(() => {
  _vaciarFrenos();
  delete process.env.TOTP_2FA;
});

describe("freno del login", () => {
  it("cinco fallos seguidos y el sexto intento es 429, aunque la clave sea la buena", async () => {
    for (let i = 0; i < 5; i++) expect((await POST(login("ana@x.com", "mala"))).status).toBe(401);
    const r = await POST(login("ana@x.com", "buena"));
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("60");
    expect(((await r.json()) as { error: string }).error).toMatch(/Demasiados intentos/);
  });

  it("el bloqueo por correo sigue aunque cambie la IP", async () => {
    for (let i = 0; i < 5; i++) await POST(login("ana@x.com", "mala", `9.9.9.${i}`));
    expect((await POST(login("ana@x.com", "buena", "7.7.7.7"))).status).toBe(429);
  });

  it("el bloqueo por IP sigue aunque cambie el correo", async () => {
    for (let i = 0; i < 5; i++) await POST(login(`u${i}@x.com`, "mala"));
    expect((await POST(login("otra@x.com", "buena"))).status).toBe(429);
  });

  it("entrar bien antes del bloqueo limpia el correo", async () => {
    for (let i = 0; i < 4; i++) await POST(login("ana@x.com", "mala", "2.2.2.2"));
    expect((await POST(login("ana@x.com", "buena", "3.3.3.3"))).status).toBe(200);
    // Cuatro más desde otra IP: si no se hubiera limpiado, ya serían ocho.
    for (let i = 0; i < 4; i++) await POST(login("ana@x.com", "mala", "4.4.4.4"));
    expect((await POST(login("ana@x.com", "buena", "5.5.5.5"))).status).toBe(200);
  });
});
