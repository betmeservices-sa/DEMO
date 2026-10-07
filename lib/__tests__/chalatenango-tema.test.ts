// El tema de la Caja de Credito de Chalatenango: los dos colores REALES de su
// sitio, su tipografia, y contraste AA en todo el texto. El lima de la marca
// da 1.6:1 sobre blanco, asi que este test existe tambien para que nadie lo
// suba a color de texto "porque es mas de la marca".
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const CSS = fs.readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");

function bloque(selector: string): string {
  const escapado = selector.replace(/[[\]="]/g, "\\$&");
  const partes = CSS.split(new RegExp(`(?:^|\\n)\\s*${escapado}\\s*\\{`));
  if (partes.length < 2) return "";
  return partes[partes.length - 1].split("}")[0];
}

function variable(cuerpo: string, nombre: string): string | null {
  const m = cuerpo.match(new RegExp(`--${nombre}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
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

describe("tema de la Caja de Crédito de Chalatenango", () => {
  const t = bloque('[data-tenant="chalatenango"]');

  it("usa el verde y el lima de cajachalatenango.com.sv", () => {
    expect(t).not.toBe("");
    expect(variable(t, "brand-blue")).toBe("#006341");
    expect(variable(t, "caja-lima")).toBe("#c4d600");
  });

  it("va en claro, con Open Sans", () => {
    expect(variable(t, "card")).toBe("#ffffff");
    expect(variable(t, "surface")).toBe("#f1f5ef");
    expect(variable(t, "font-app")).toContain("Open Sans");
    expect(CSS).toContain("family=Open+Sans");
  });

  it("gana sobre la marca unificada, o se pintaría violeta", () => {
    expect(CSS.lastIndexOf('[data-tenant="chalatenango"]')).toBeGreaterThan(CSS.indexOf("[data-tenant] {"));
  });

  it("todo el texto cumple AA sobre el fondo y sobre la tarjeta", () => {
    for (const superficie of [variable(t, "surface")!, variable(t, "card")!]) {
      for (const tinta of ["text", "text-2", "text-3", "brand-blue", "brand-blue-dark", "brand-accent", "brand-green", "brand-red", "caja-ambar", "caja-azul"]) {
        expect(contraste(variable(t, tinta)!, superficie), tinta).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("el blanco sobre los colores de marca y de estado se lee", () => {
    for (const tinta of ["brand-blue", "brand-blue-dark", "brand-green", "brand-red", "brand-accent", "caja-ambar", "caja-azul"]) {
      expect(contraste("#ffffff", variable(t, tinta)!), tinta).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("el activo del riel (verde oscuro sobre lima) se lee", () => {
    expect(contraste(variable(t, "brand-blue-dark")!, variable(t, "caja-lima")!)).toBeGreaterThanOrEqual(4.5);
  });

  it("el lima nunca es color de texto", () => {
    for (const tinta of ["text", "text-2", "text-3", "brand-blue", "brand-blue-dark", "brand-accent", "brand-green"]) {
      expect(variable(t, tinta)?.toLowerCase()).not.toBe("#c4d600");
    }
  });

  it("los colores de las áreas se leen como texto sobre blanco", async () => {
    const { TENANTS } = await import("@/lib/tenants");
    for (const d of TENANTS.chalatenango.seed.departments) {
      expect(contraste(d.color, "#ffffff"), d.nombre).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("el shell flotante solo cuelga de su atributo: los demás paneles no heredan nada", () => {
    const reglas = CSS.split("── Shell \"flotante\"")[1] ?? "";
    expect(reglas).not.toBe("");
    const selectores = reglas.match(/^[^\s/@}][^{]*\{/gm) ?? [];
    for (const s of selectores) expect(s, s).toContain('[data-shell="flotante"]');
  });
});
