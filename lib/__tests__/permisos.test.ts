// La puerta de rol de las rutas que escriben: el mismo mapa del menú, pero
// exigido en el servidor.
import { describe, expect, it } from "vitest";
import { crearSesion, SESSION_COOKIE } from "@/lib/session";
import { DIRECCION, exigirAgencia, exigirModulo, exigirRoles } from "@/lib/permisos";
import type { RoleId } from "@/lib/data/types";

async function pedidoDe(rol: RoleId, fijo = true, todos = false): Promise<Request> {
  const s = await crearSesion("yaly", rol, fijo, "alguien@x.com", todos);
  return new Request("http://hub.test/api/x", {
    method: "POST",
    headers: { cookie: `${SESSION_COOKIE}=${s!.valor}` },
  });
}

describe("exigirModulo", () => {
  it("sin sesión es 401", async () => {
    const p = await exigirModulo(new Request("http://hub.test/api/x", { method: "POST" }), "settings");
    expect(p.ok).toBe(false);
    if (!p.ok) expect(p.respuesta.status).toBe(401);
  });

  it("recepción no toca los ajustes, dirección sí", async () => {
    const r = await exigirModulo(await pedidoDe("recepcion"), "settings");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.respuesta.status).toBe(403);
      expect(((await r.respuesta.json()) as { error: string }).error).toMatch(/perfil/);
    }
    const a = await exigirModulo(await pedidoDe("admin"), "settings");
    expect(a.ok).toBe(true);
    if (a.ok) expect(a.sesion.rol).toBe("admin");
  });

  it("recepción sí escribe en lo suyo", async () => {
    expect((await exigirModulo(await pedidoDe("recepcion"), "tickets")).ok).toBe(true);
    expect((await exigirModulo(await pedidoDe("recepcion"), "contactos")).ok).toBe(true);
  });

  it("los logins de demo entran como gerente y ven todo", async () => {
    expect((await exigirModulo(await pedidoDe("gerente_marketing", false), "settings")).ok).toBe(true);
  });

  it("una cookie inventada no abre nada", async () => {
    const req = new Request("http://hub.test/api/x", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE}=yaly.admin.1.-.9999999999.firma-falsa` },
    });
    const p = await exigirModulo(req, "bandeja");
    expect(p.ok).toBe(false);
    if (!p.ok) expect(p.respuesta.status).toBe(401);
  });
});

describe("exigirRoles y exigirAgencia", () => {
  it("dirección, gerencia y jefatura pasan; atención no", async () => {
    expect((await exigirRoles(await pedidoDe("jefe"), DIRECCION)).ok).toBe(true);
    expect((await exigirRoles(await pedidoDe("gerente_marketing"), DIRECCION)).ok).toBe(true);
    const a = await exigirRoles(await pedidoDe("atencion"), DIRECCION);
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.respuesta.status).toBe(403);
  });

  it("la agencia es la marca `todos` de la firma, no el rol", async () => {
    expect((await exigirAgencia(await pedidoDe("admin", true, false))).ok).toBe(false);
    expect((await exigirAgencia(await pedidoDe("atencion", true, true))).ok).toBe(true);
  });
});
