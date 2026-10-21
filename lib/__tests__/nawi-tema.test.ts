// El tema de NAWI Beach House: los colores de su logo y su sitio, su
// tipografía, y contraste AA en todo el texto. El turquesa y el naranja de su
// marca dan menos de 4.5:1 sobre blanco, así que este test existe también para
// que nadie los suba a color de texto "porque son más de la marca".
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

describe("tema de NAWI", () => {
  const t = bloque('[data-tenant="nawi"]');

  it("usa el morado de su logo para lo principal", () => {
    expect(t).not.toBe("");
    expect(variable(t, "brand-blue")).toBe("#5c56eb");
  });

  it("va en claro, con Commissioner", () => {
    expect(variable(t, "card")).toBe("#ffffff");
    expect(variable(t, "font-app")).toContain("Commissioner");
    expect(CSS).toContain("family=Commissioner");
  });

  it("gana sobre la marca unificada, o se pintaría violeta genérico", () => {
    expect(CSS.lastIndexOf('[data-tenant="nawi"]')).toBeGreaterThan(CSS.indexOf("[data-tenant] {"));
  });

  it("todo el texto cumple AA sobre el fondo y sobre la tarjeta", () => {
    for (const superficie of [variable(t, "surface")!, variable(t, "card")!]) {
      for (const tinta of ["text", "text-2", "text-3", "brand-blue", "brand-blue-dark", "brand-accent", "brand-green", "brand-red"]) {
        expect(contraste(variable(t, tinta)!, superficie), tinta).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("el blanco de los botones se lee sobre el morado", () => {
    expect(contraste("#ffffff", variable(t, "brand-blue")!)).toBeGreaterThanOrEqual(4.5);
  });

  it("el turquesa y el naranja de la marca NO son texto", () => {
    expect(contraste("#029fa3", "#ffffff")).toBeLessThan(4.5);
    expect(contraste("#ff881e", "#ffffff")).toBeLessThan(4.5);
    expect(variable(t, "brand-green")).not.toBe("#029fa3");
    expect(variable(t, "brand-accent")).not.toBe("#ff881e");
  });
});
