// El tema de ShopUSA: los colores REALES de shopusa.la, su tipografía, y
// contraste AA en todo el texto. Sus azules claros y su verde dan menos de
// 4.5:1 sobre blanco, así que este test existe también para que nadie los
// suba a color de texto "porque son más de la marca".
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

describe("tema de ShopUSA", () => {
  const t = bloque('[data-tenant="shopusa"]');

  it("usa el azul petróleo, el rojo del logo y los azules de shopusa.la", () => {
    expect(t).not.toBe("");
    expect(variable(t, "brand-blue")).toBe("#003d5c");
    expect(variable(t, "brand-blue-dark")).toBe("#002233");
    expect(variable(t, "brand-red")).toBe("#99132c");
    expect(variable(t, "susa-azul")).toBe("#0088cc");
    expect(variable(t, "susa-celeste")).toBe("#2aa1c4");
    expect(variable(t, "susa-hielo")).toBe("#bee7f3");
    expect(variable(t, "susa-verde")).toBe("#2fdd92");
  });

  it("va en claro, con Inter", () => {
    expect(variable(t, "card")).toBe("#ffffff");
    expect(variable(t, "font-app")).toContain("Inter");
    expect(CSS).toContain("family=Inter");
  });

  it("gana sobre la marca unificada, o se pintaría violeta", () => {
    expect(CSS.lastIndexOf('[data-tenant="shopusa"]')).toBeGreaterThan(CSS.indexOf("[data-tenant] {"));
  });

  it("todo el texto cumple AA sobre el fondo y sobre la tarjeta", () => {
    for (const superficie of [variable(t, "surface")!, variable(t, "card")!]) {
      for (const tinta of ["text", "text-2", "text-3", "brand-blue", "brand-blue-dark", "brand-accent", "brand-green", "brand-red", "susa-ambar"]) {
        expect(contraste(variable(t, tinta)!, superficie), tinta).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("el texto de las alertas y etiquetas cumple AA sobre su propio fondo", () => {
    expect(contraste(variable(t, "brand-red")!, variable(t, "susa-rojo-fondo")!)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(variable(t, "susa-ambar")!, variable(t, "susa-ambar-fondo")!)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(variable(t, "brand-accent")!, variable(t, "brand-accent-soft")!)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(variable(t, "brand-green")!, variable(t, "susa-verde-suave")!)).toBeGreaterThanOrEqual(4.5);
  });

  it("sus azules claros y su verde son relleno: no llegan a 4.5:1 sobre blanco", () => {
    for (const relleno of ["susa-azul", "susa-celeste", "susa-verde"]) {
      expect(contraste(variable(t, relleno)!, "#ffffff"), relleno).toBeLessThan(4.5);
    }
  });

  it("el blanco sobre el petróleo de los botones se lee", () => {
    expect(contraste("#ffffff", variable(t, "brand-blue")!)).toBeGreaterThanOrEqual(4.5);
    expect(contraste("#ffffff", variable(t, "brand-blue-dark")!)).toBeGreaterThanOrEqual(4.5);
  });
});
