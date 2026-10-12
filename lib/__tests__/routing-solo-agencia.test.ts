// Cambiar a dónde entra el número de WhatsApp es de la agencia. Una cuenta de
// un cliente, aunque sea dirección, no lo mueve.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => null,
  publicoDeProyectoEscribible: () => null,
  publicoDeProyectoPropio: () => null,
  tenantsConProyectoPropio: () => [],
  tenantsConProyectoEscribible: () => [],
  todosLosClientes: () => [],
  esquemaDeTenant: () => "public",
  olvidarClientesSupabase: () => {},
}));

const { GET, POST } = await import("@/app/api/whatsapp/routing/route");
const { crearSesion, SESSION_COOKIE } = await import("@/lib/session");

async function cambiar(tenant: string, sesion: { rol: "admin" | "gerente_marketing"; todos: boolean } | null) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (sesion) {
    const s = await crearSesion("grupoq", sesion.rol, true, "alguien@x.com", sesion.todos);
    headers.cookie = `${SESSION_COOKIE}=${s!.valor}`;
  }
  return POST(new Request("http://demo.test/api/whatsapp/routing", { method: "POST", headers, body: JSON.stringify({ tenant }) }));
}

async function actual(): Promise<string> {
  return ((await (await GET()).json()) as { tenant: string }).tenant;
}

describe("POST /api/whatsapp/routing", () => {
  beforeEach(async () => {
    await cambiar("hospital", { rol: "admin", todos: true });
  });

  it("sin sesión es 401 y no mueve nada", async () => {
    expect((await cambiar("excel", null)).status).toBe(401);
    expect(await actual()).toBe("hospital");
  });

  it("la dirección de un cliente es 403 y no mueve nada", async () => {
    const r = await cambiar("excel", { rol: "admin", todos: false });
    expect(r.status).toBe(403);
    expect(((await r.json()) as { error: string }).error).toMatch(/agencia/);
    expect(await actual()).toBe("hospital");
  });

  it("la agencia sí lo mueve", async () => {
    expect((await cambiar("excel", { rol: "gerente_marketing", todos: true })).status).toBe(200);
    expect(await actual()).toBe("excel");
  });
});
