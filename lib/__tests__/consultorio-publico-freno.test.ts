// Lo público del consultorio (registro por QR, turno en la entrada, portal del
// paciente) frena por IP con el freno compartido, y el portal contesta lo
// mismo exista o no el correo.
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

const registro = await import("@/app/api/consultorio/publico/registro/route");
const turnos = await import("@/app/api/consultorio/publico/turnos/route");
const portal = await import("@/app/api/consultorio/publico/portal/route");
const { _vaciarFrenos } = await import("@/lib/freno");

function post(url: string, cuerpo: unknown, ip = "8.8.8.8"): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(cuerpo),
  });
}

beforeEach(() => {
  _vaciarFrenos();
});

describe("freno por IP", () => {
  it("el registro corta al pedido 61 de la misma IP", async () => {
    for (let i = 0; i < 60; i++) {
      const r = await registro.POST(post("http://d/api/consultorio/publico/registro", { codigo: "nada" }));
      expect(r.status, `pedido ${i + 1}`).toBe(404);
    }
    expect((await registro.POST(post("http://d/api/consultorio/publico/registro", { codigo: "nada" }))).status).toBe(429);
    // Otra IP sigue entrando.
    expect((await registro.POST(post("http://d/api/consultorio/publico/registro", { codigo: "nada" }, "9.9.9.9"))).status).toBe(404);
  });

  it("el registro y los turnos comparten la cuenta de la IP", async () => {
    for (let i = 0; i < 60; i++) await registro.POST(post("http://d/api/consultorio/publico/registro", { codigo: "nada" }));
    expect((await turnos.POST(post("http://d/api/consultorio/publico/turnos", { codigo: "nada" }))).status).toBe(429);
  });

  it("el portal corta al intento 13", async () => {
    for (let i = 0; i < 12; i++) {
      expect((await portal.POST(post("http://d/api/consultorio/publico/portal", { correo: `p${i}@x.com` }))).status).toBe(200);
    }
    const r = await portal.POST(post("http://d/api/consultorio/publico/portal", { correo: "p@x.com" }));
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("600");
  });
});

describe("portal: respuesta uniforme", () => {
  it("un correo que no está contesta 200 con el portal vacío, no 404", async () => {
    const r = await portal.POST(post("http://d/api/consultorio/publico/portal", { correo: "nadie@x.com" }));
    expect(r.status).toBe(200);
    const j = (await r.json()) as { ok: boolean; portal: { documentos: unknown[]; secciones: unknown[] } };
    expect(j.ok).toBe(true);
    expect(j.portal.documentos).toEqual([]);
    expect(j.portal.secciones).toEqual([]);
  });

  it("un correo mal escrito sí es 400", async () => {
    expect((await portal.POST(post("http://d/api/consultorio/publico/portal", { correo: "esto no es" }))).status).toBe(400);
  });
});
