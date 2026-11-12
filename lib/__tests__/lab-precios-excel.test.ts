import { describe, expect, it } from "vitest";
import { respuestaDeBusqueda } from "@/lib/consultorio/lab-kb";
import { BASE_LAB } from "@/lib/consultorio/lab-kb-datos";

// 2026-11-12: Valeria seguía dando precios mal. Los precios oficiales son los
// del Excel "precios - IA Valeria" del lab, y las campañas dan su precio
// especial solo cuando preguntan por ese examen.

function primero(consulta: string, hoy = "2026-11-12") {
  const r = JSON.parse(respuestaDeBusqueda(BASE_LAB, consulta, hoy)) as { resultados: { tipo: string; datos: Record<string, unknown> }[] };
  return r.resultados.find((x) => x.tipo === "examen")!.datos;
}

describe("precios oficiales del Excel del lab", () => {
  it.each([
    ["insulina en ayunas", 48],
    ["hdl", 14.7],
    ["vldl", 14],
    ["prolactina", 46.8],
    ["colesterol total", 9],
    ["trigliceridos", 11.5],
    ["tsh", 35],
    ["t4 libre", 21.1],
    ["t4", 17.5],
    ["vitamina b12", 65.5],
    ["tolerancia de insulina 3 horas", 192],
  ])("%s cuesta $%s", (consulta, precio) => {
    expect(primero(consulta).precio).toBe(precio);
  });

  it("ningún examen sale dos veces con el mismo nombre", () => {
    const nombres = BASE_LAB.examenes.map((e) => e.nombre.toLowerCase());
    expect(nombres.length).toBe(new Set(nombres).size);
  });
});

describe("precios especiales de campaña", () => {
  it("las cinco campañas salen con su precio especial", () => {
    expect(primero("psa")).toMatchObject({ precio: 40, precioEspecial: 40, precioRegular: 59.6 });
    expect(primero("perfil diabetico")).toMatchObject({ precio: 68, precioEspecial: 68, precioRegular: 76 });
    expect(primero("perfil respiratorio ampliado")).toMatchObject({ precio: 75, precioEspecial: 75, precioRegular: 90 });
    expect(primero("perfil de rutina")).toMatchObject({ precio: 63, precioEspecial: 63, precioRegular: 70.2 });
    expect(primero("perfil gastrointestinal")).toMatchObject({ precio: 50, precioEspecial: 50, precioRegular: 55 });
  });

  it("fuera de las fechas de la campaña vuelve el precio normal", () => {
    const psa = primero("psa", "2026-12-01");
    expect(psa.precio).toBe(59.6);
    expect(psa.precioEspecial).toBeUndefined();
  });
});
