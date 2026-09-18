// El tema de la sala de ventas Nissan: blanco y rojo.
//
// Estos tests leen globals.css y el embudo para que nadie baje el contraste ni
// le pise el bloque a otro tenant sin enterarse, y para dejar clavadas las dos
// decisiones de color que se toman solas cuando la marca ES roja: que el rojo
// de alarma no puede ser el mismo rojo de la marca, y que los tramos del embudo
// llevan texto blanco encima y por lo tanto no pueden aclararse a ojo.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ETAPAS, ETAPAS_ABIERTAS } from "@/lib/autos-pipeline";

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

  it("usa los colores que la marca declara: blanco, negro, rojo y gris", () => {
    expect(variable(n, "brand-blue")).toBe("#c3002f");
    expect(variable(n, "brand-accent")).toBe("#000000");
    expect(variable(n, "card")).toBe("#ffffff");
    expect(variable(n, "surface")).toBe("#efefef");
    expect(variable(n, "text")).toBe("#000000");
  });

  it("el rojo de alarma no es el rojo de la marca, y es más oscuro", () => {
    const marca = variable(n, "brand-accent-soft");
    const alarma = variable(n, "brand-red") as string;
    const primario = variable(n, "brand-blue") as string;
    expect(alarma).not.toBe(primario);
    expect(luminancia(alarma)).toBeLessThan(luminancia(primario));
    expect(marca).toBe("#efefef");
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

describe("los colores del embudo", () => {
  it("los tramos abiertos llevan texto blanco encima y lo aguantan", () => {
    for (const e of ETAPAS.filter((x) => ETAPAS_ABIERTAS.includes(x.id))) {
      expect(contraste(e.color, "#ffffff"), `${e.nombre} con texto blanco`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("lo cerrado se distingue del fondo aunque solo sea un punto de color", () => {
    for (const e of ETAPAS.filter((x) => !ETAPAS_ABIERTAS.includes(x.id))) {
      expect(contraste(e.color, "#efefef"), `${e.nombre} sobre el fondo`).toBeGreaterThanOrEqual(3);
    }
  });

  it("la venta se va cargando de color: cada tramo de la rampa es más oscuro", () => {
    // El ámbar de "sin respuesta" se sale de la rampa a propósito: no es un paso
    // adelante, es un desvío.
    const rampa = ETAPAS.filter((e) => ETAPAS_ABIERTAS.includes(e.id) && e.id !== "sin_respuesta");
    for (let i = 1; i < rampa.length; i++) {
      expect(luminancia(rampa[i].color), `${rampa[i].nombre} vs ${rampa[i - 1].nombre}`).toBeLessThan(
        luminancia(rampa[i - 1].color),
      );
    }
  });

  it("ningún tramo se confunde con el verde de entregado ni con el gris de perdido", () => {
    const entregados = ETAPAS.find((e) => e.id === "entregados")!.color;
    const perdidos = ETAPAS.find((e) => e.id === "perdidos")!.color;
    for (const e of ETAPAS.filter((x) => ETAPAS_ABIERTAS.includes(x.id))) {
      expect(e.color).not.toBe(entregados);
      expect(e.color).not.toBe(perdidos);
    }
  });
});
