// El tema de la sala de ventas Nissan.
//
// Estos tests leen globals.css para que nadie baje el contraste ni le pise el
// bloque a otro tenant sin enterarse, y para dejar clavada la decision de
// color: el rojo de la marca NO es el primario, porque en este panel el rojo ya
// significa que algo se esta cayendo.
import { describe, expect, it } from "vitest";
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

describe("tema de la sala de ventas Nissan", () => {
  const n = bloque('[data-tenant="nissan"]');

  it("el rojo de la marca es el acento, no el primario", () => {
    expect(variable(n, "brand-accent")).toBe("#c3002f");
    expect(variable(n, "brand-blue")).toBe("#1b1f23");
  });

  it("el rojo de estado es distinto del rojo de la marca", () => {
    expect(variable(n, "brand-red")).not.toBe(variable(n, "brand-accent"));
  });

  it("va en claro, como los otros tenants de tema claro", () => {
    expect(variable(n, "card")).toBe("#ffffff");
    expect(variable(n, "surface")).toBe("#f4f5f7");
  });

  it("todo el texto pasa el 4.5:1 de WCAG AA sobre el fondo y sobre la tarjeta", () => {
    const fondo = variable(n, "surface") as string;
    const tarjeta = variable(n, "card") as string;
    for (const nombre of ["text", "text-2", "text-3", "brand-blue", "brand-red", "brand-green", "brand-accent"]) {
      const color = variable(n, nombre) as string;
      expect(contraste(color, fondo), `${nombre} sobre el fondo`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(color, tarjeta), `${nombre} sobre la tarjeta`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("no le pisa el bloque a ningún otro cliente", () => {
    for (const otro of ["grupoq", "hotel", "promerica", "yaly", "consultorio"]) {
      expect(bloque(`[data-tenant="${otro}"]`).length).toBeGreaterThan(0);
    }
  });
});
