// Clientes en vivo (hospital, Yalí): su panel está en hub.miagentia.com con
// sus datos reales. El demo los conoce pero no los abre por ninguna puerta.
// Se prueba con ganas porque el modo de fallar es que alguien vea pacientes o
// huéspedes reales desde un sitio de demos.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_LOGINS, EN_HUB, TENANTS, esDelDemo, resolveTenantByLogin, tenantsDelDemo } from "@/lib/tenants";

const ORIGINAL = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL };
  delete process.env.USUARIOS;
  delete process.env.LOGIN_PASSWORDS;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("los clientes en vivo no se abren desde el demo", () => {
  it("son el hospital y Yalí, y el resto sí es del demo", () => {
    expect([...EN_HUB].sort()).toEqual(["hospital", "yaly"]);
    expect(esDelDemo("hospital")).toBe(false);
    expect(esDelDemo("yaly")).toBe(false);
    expect(esDelDemo("grupoq")).toBe(true);
    expect(esDelDemo("nissan")).toBe(true);
  });

  it("la lista de paneles del demo no los trae, y trae a los demás", () => {
    const lista = tenantsDelDemo();
    expect(lista).not.toContain("hospital");
    expect(lista).not.toContain("yaly");
    expect(lista.length).toBe(Object.keys(TENANTS).length - EN_HUB.length);
    for (const id of ["grupoq", "nissan", "excel", "comercial", "chalatenango"]) expect(lista).toContain(id);
  });

  it("ninguna clave de demo lleva a un panel en vivo", () => {
    for (const l of DEMO_LOGINS) expect(esDelDemo(l.tenant), `${l.usuario}:${l.password}`).toBe(true);
    expect(resolveTenantByLogin("demoagentia", "demoh")).toBeNull();
    expect(resolveTenantByLogin("demoagentia", "miagentiayaly")).toBeNull();
    expect(resolveTenantByLogin("hospital@demo.com", "demo1234")).toBeNull();
  });

  it("las claves de los demos siguen entrando", async () => {
    const { validarCredenciales } = await import("@/lib/auth-server");
    expect((await validarCredenciales("demoagentia", "demon"))?.tenant).toBe("nissan");
    expect((await validarCredenciales("demoagentia", "demoi"))?.tenant).toBe("grupoq");
    expect(await validarCredenciales("demoagentia", "demoh")).toBeNull();
    expect(await validarCredenciales("demoagentia", "miagentiayaly")).toBeNull();
  });

  it("una cuenta de persona de un cliente en vivo no existe para el demo", async () => {
    process.env.USUARIOS = [
      "marielos@cegisa.com|clave1|hospital|atencion|Marielos|s2",
      "veronica@yalihospitality.com|clave2|yaly|atencion|Verónica",
      "alex@miagentia.com|alex123|*|admin|Alex (MiAgentIA)|",
    ].join(",");
    const { validarCredenciales } = await import("@/lib/auth-server");
    const { cuentas } = await import("@/lib/usuarios");

    expect(cuentas().map((c) => c.usuario)).toEqual(["alex@miagentia.com"]);
    expect(await validarCredenciales("marielos@cegisa.com", "clave1")).toBeNull();
    expect(await validarCredenciales("veronica@yalihospitality.com", "clave2")).toBeNull();

    const alex = await validarCredenciales("alex@miagentia.com", "alex123");
    expect(alex?.todos).toBe(true);
    expect(alex?.rol).toBe("admin");
  });

  it("LOGIN_PASSWORDS tampoco abre un panel en vivo", async () => {
    process.env.LOGIN_PASSWORDS = "hospital:secreta1,nissan:secreta2";
    const { validarCredenciales } = await import("@/lib/auth-server");
    expect(await validarCredenciales("demoagentia", "secreta1")).toBeNull();
    expect((await validarCredenciales("demoagentia", "secreta2"))?.tenant).toBe("nissan");
  });
});
