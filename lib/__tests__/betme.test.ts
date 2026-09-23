// El tenant de BetMe: que su contrasena no le robe el dashboard a nadie, que
// sus pantallas de reclutamiento no se le asomen a otros clientes, que no
// publique en redes y que el tema claro aguante el contraste.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { DEMO_LOGINS, TENANTS, isTenantId, resolveTenantByLogin } from "@/lib/tenants";
import { MODULO_RUTA, VE, moduloDeRuta } from "@/lib/modulos";

const CSS = fs.readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");

function bloque(selector: string): string {
  const escapado = selector.replace(/[[\]="]/g, "\\$&");
  const partes = CSS.split(new RegExp(`(?:^|\\n)\\s*${escapado}\\s*\\{`));
  if (partes.length < 2) return "";
  return partes[partes.length - 1].split("}")[0];
}
function variable(cuerpo: string, nombre: string): string {
  return (cuerpo.match(new RegExp(`--${nombre}\\s*:\\s*([^;]+);`))?.[1] ?? "").trim();
}
function luminancia(hex: string): number {
  const v = hex.replace("#", "");
  const canal = (i: number) => {
    const c = parseInt(v.slice(i * 2, i * 2 + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}
function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

describe("tenant betme", () => {
  it("su contraseña entra al centro de reclutamiento", () => {
    expect(resolveTenantByLogin("demoagentia", "demob")).toBe("betme");
  });

  it("no le roba la contraseña a ninguno de los otros", () => {
    expect(resolveTenantByLogin("demoagentia", "demoh")).toBe("hospital");
    expect(resolveTenantByLogin("demoagentia", "demoi")).toBe("grupoq");
    expect(resolveTenantByLogin("demoagentia", "demon")).toBe("nissan");
    expect(resolveTenantByLogin("demoagentia", "demol")).toBe("consultorio");
    const claves = DEMO_LOGINS.map((l) => `${l.usuario}:${l.password}`);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("está registrado y habla de candidatos", () => {
    expect(isTenantId("betme")).toBe(true);
    expect(TENANTS.betme.brand.nombre).toBe("BetMe Services");
    expect(TENANTS.betme.labels.contacto).toBe("candidato");
  });

  it("las rutas de /talento van a sus módulos", () => {
    expect(moduloDeRuta("/talento")).toBe("talento");
    expect(moduloDeRuta("/talento/vacantes")).toBe("vacantes");
    expect(moduloDeRuta("/talento/perfiles")).toBe("perfiles");
    expect(moduloDeRuta("/talento/entrevistas")).toBe("entrevistas");
    expect(moduloDeRuta("/talento/onboarding")).toBe("onboarding");
    expect(MODULO_RUTA.vacantes).toBe("/talento/vacantes");
  });

  it("el reclutador ve el pipeline y las vacantes; marketing no", () => {
    expect(VE.medico).toEqual(expect.arrayContaining(["talento", "vacantes", "perfiles", "entrevistas"]));
    expect(VE.marketing).not.toContain("talento");
    expect(VE.admin).toEqual(expect.arrayContaining(["talento", "vacantes", "perfiles", "entrevistas", "onboarding"]));
  });

  it("no publica en redes", () => {
    expect(TENANTS.betme.seed.socialPosts).toEqual([]);
  });

  it("el agente no da cifras de salario ni usa guiones largos", () => {
    const g = TENANTS.betme.ai.systemPrompt;
    expect(g).toMatch(/NUNCA des cifras de salario/);
    expect(g.includes("—")).toBe(false);
    for (const t of TENANTS.betme.waTemplates) {
      for (const c of t.components) expect((c.text ?? "").includes("—"), t.name).toBe(false);
    }
  });

  it("no dice Agendamiento en ningún lado", () => {
    const todo = JSON.stringify(TENANTS.betme);
    expect(todo.toLowerCase()).not.toContain("agendamiento");
  });
});

describe("tema de BetMe", () => {
  const b = bloque('[data-tenant="betme"]');

  it("usa el marino de la marca", () => {
    expect(variable(b, "brand-blue")).toBe("#1b2a4a");
    expect(variable(b, "surface")).toBe("#f5f8fc");
  });

  it("todo el texto pasa el 4.5:1 de WCAG AA sobre el fondo y la tarjeta", () => {
    const fondo = variable(b, "surface");
    const tarjeta = variable(b, "card");
    for (const n of ["text", "text-2", "text-3", "brand-blue", "brand-red", "brand-green", "brand-accent"]) {
      const color = variable(b, n);
      expect(contraste(color, fondo), `${n} sobre el fondo`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(color, tarjeta), `${n} sobre la tarjeta`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("no le pisa el bloque a otro cliente", () => {
    for (const otro of ["grupoq", "nissan", "consultorio", "yaly"]) {
      expect(bloque(`[data-tenant="${otro}"]`).length).toBeGreaterThan(0);
    }
  });
});
