// El tenant de un pedido sale de la cookie de sesión SOLO si la firma es
// nuestra. Antes se leía el primer campo sin mirar la firma.
import { afterEach, describe, expect, it, vi } from "vitest";
import { crearSesion, SESSION_COOKIE } from "@/lib/session";
import { DEFAULT_TENANT } from "@/lib/tenants";
import { tenantDeCookieFirmada, tenantFromRequest } from "@/lib/tenants/server";

function pedido(cookie?: string): Request {
  return new Request("http://hub.test/api/x", cookie ? { headers: { cookie } } : {});
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tenantFromRequest", () => {
  it("una sesión firmada da su tenant", async () => {
    const s = await crearSesion("hospital", "recepcion", true, "ana@x.com");
    expect(tenantFromRequest(pedido(`otra=1; ${SESSION_COOKIE}=${s!.valor}`))).toBe("hospital");
  });

  it("una cookie con el tenant de otro y firma inventada NO da ese tenant", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const falsa = `hospital.admin.1.-.${exp}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    expect(tenantFromRequest(pedido(`${SESSION_COOKIE}=${falsa}`))).toBe(DEFAULT_TENANT);
    expect(tenantDeCookieFirmada(falsa)).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it("una sesión firmada pero vencida tampoco", async () => {
    const s = await crearSesion("hospital", "recepcion", true, "ana@x.com");
    const partes = s!.valor.split(".");
    partes[4] = String(Math.floor(Date.now() / 1000) - 10);
    expect(tenantDeCookieFirmada(partes.join("."))).toBeNull();
  });

  it("firmar otra cosa con el payload cambiado no vale", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const s = await crearSesion("yaly", "recepcion", true, "ana@x.com");
    const partes = s!.valor.split(".");
    partes[0] = "hospital";
    expect(tenantDeCookieFirmada(partes.join("."))).toBeNull();
  });

  it("sin cookie cae al tenant por defecto", () => {
    expect(tenantFromRequest(pedido())).toBe(DEFAULT_TENANT);
    expect(tenantFromRequest(pedido("otra=1"))).toBe(DEFAULT_TENANT);
    expect(tenantDeCookieFirmada("basura")).toBeNull();
  });
});
