// El tema del Hotel Tesoro Beach: el turquesa de su sitio y el verde azulado
// de su logo, su tipografía, y contraste AA en todo el texto. Su turquesa
// #02C7D9 da menos de 2:1 sobre blanco, así que este test existe también para
// que nadie lo suba a color de texto o de botón "porque es el de la marca".
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

describe("tema de Tesoro Beach", () => {
  const t = bloque('[data-tenant="tesoro"]');

  it("usa el verde azulado de su logo como oscuro de la marca", () => {
    expect(t).not.toBe("");
    expect(variable(t, "brand-blue-dark")).toBe("#0f2c30");
  });

  it("va en claro, con Raleway", () => {
    expect(variable(t, "card")).toBe("#ffffff");
    expect(variable(t, "font-app")).toContain("Raleway");
    expect(CSS).toContain("family=Raleway");
  });

  it("gana sobre la marca unificada, o se pintaría violeta genérico", () => {
    expect(CSS.lastIndexOf('[data-tenant="tesoro"]')).toBeGreaterThan(CSS.indexOf("[data-tenant] {"));
  });

  it("todo el texto cumple AA sobre el fondo y sobre la tarjeta", () => {
    for (const superficie of [variable(t, "surface")!, variable(t, "card")!]) {
      for (const tinta of ["text", "text-2", "text-3", "brand-blue", "brand-blue-dark", "brand-accent", "brand-green", "brand-red"]) {
        expect(contraste(variable(t, tinta)!, superficie), tinta).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("el blanco de los botones se lee sobre el color principal", () => {
    expect(contraste("#ffffff", variable(t, "brand-blue")!)).toBeGreaterThanOrEqual(4.5);
  });

  it("el turquesa del sitio NO es texto ni botón", () => {
    expect(contraste("#02c7d9", "#ffffff")).toBeLessThan(4.5);
    expect(variable(t, "brand-blue")).not.toBe("#02c7d9");
  });
});
