// El tenant de la sala de ventas Nissan.
//
// Lo que se cuida aca es lo que se romperia sin ruido: que la contrasena nueva
// no le robe el dashboard a otro cliente, que el tablero de ventas no se le
// asome a los demas (ni el de credito a Nissan), y que el guion del agente siga
// hablando de vender carros y no de armar un expediente de credito.
import { describe, expect, it } from "vitest";
import { DEMO_LOGINS, TENANTS, isTenantId, resolveTenantByLogin } from "@/lib/tenants";
import { MODULO_RUTA, VE, moduloDeRuta } from "@/lib/modulos";
import { vendedoresDe, gerenteDe } from "@/lib/ventas-equipo";
import { MODELOS, PASOS_REQUERIDOS } from "@/lib/autos-catalogo";

describe("tenant nissan", () => {
  it("su contraseña entra a la sala de ventas", () => {
    expect(resolveTenantByLogin("demoagentia", "miagentianissan")).toBe("nissan");
  });

  it("no le roba la contraseña a ninguno de los otros", () => {
    expect(resolveTenantByLogin("demoagentia", "demoi")).toBe("grupoq");
    expect(resolveTenantByLogin("demoagentia", "demol")).toBe("consultorio");
    expect(resolveTenantByLogin("demoagentia", "miagentiayaly")).toBe("yaly");
    expect(resolveTenantByLogin("demoagentia", "miagentiacobros")).toBe("promerica");
  });

  it("usa el mismo usuario que los demás y una sola contraseña", () => {
    const suyas = DEMO_LOGINS.filter((l) => l.tenant === "nissan");
    expect(suyas).toHaveLength(1);
    expect(suyas[0].usuario).toBe("demoagentia");
  });

  it("está registrado como cliente de verdad", () => {
    expect(isTenantId("nissan")).toBe(true);
    expect(TENANTS.nissan.brand.nombre).toBe("Nissan El Salvador");
    expect(TENANTS.nissan.labels.contacto).toBe("cliente");
  });

  it("el equipo de la sala sale del staff, con su gerente aparte", () => {
    const vendedores = vendedoresDe("nissan");
    expect(vendedores.length).toBeGreaterThanOrEqual(3);
    expect(vendedores.map((v) => v.id)).not.toContain("s4");
    expect(gerenteDe("nissan")?.nombre).toBe("Alejandra Solís");
  });

  it("los roles se llaman como en un concesionario", () => {
    expect(TENANTS.nissan.roles.medico).toBe("Vendedor");
    expect(TENANTS.nissan.roles.jefe).toBe("Gerente de ventas");
  });

  it("clasifica los mensajes con etiquetas de sala de ventas", () => {
    const tags = TENANTS.nissan.tags;
    expect(tags).toContain("Prueba de manejo");
    expect(tags).toContain("Unidad separada");
    // Las etiquetas del embudo de credito no son suyas.
    expect(tags).not.toContain("Pendiente documentos");
    expect(tags).not.toContain("Pre-aprobado");
  });
});

describe("el guion vende carros, no créditos", () => {
  const prompt = TENANTS.nissan.ai.systemPrompt;

  it("el objetivo es que venga a manejar la unidad", () => {
    expect(prompt).toMatch(/prueba de manejo/i);
    expect(prompt).toMatch(/usado a cuenta|valuaci[óo]n/i);
  });

  it("no manda a pedir el expediente de crédito", () => {
    expect(prompt).not.toMatch(/constancia de salario/i);
    expect(prompt).not.toMatch(/dos referencias personales/i);
  });

  it("los precios del guion son los mismos del catálogo del tablero", () => {
    for (const m of MODELOS) {
      expect(prompt, m.nombre).toContain(`$${m.desde.toLocaleString("en-US")}`);
    }
  });
});

describe("el módulo de la sala de ventas", () => {
  it("vive en su propia ruta y la ruta apunta a su módulo", () => {
    expect(MODULO_RUTA.ventas).toBe("/ventas");
    expect(moduloDeRuta("/ventas")).toBe("ventas");
  });

  it("lo ven quienes trabajan la venta, no marketing", () => {
    expect(VE.medico).toContain("ventas");
    expect(VE.jefe).toContain("ventas");
    expect(VE.marketing).not.toContain("ventas");
  });

  it("la venta se mide en cinco pasos y el usado no es uno de ellos", () => {
    expect(PASOS_REQUERIDOS.map((p) => p.id)).toEqual([
      "cotizacion",
      "prueba",
      "propuesta",
      "separacion",
      "entrega",
    ]);
  });
});
