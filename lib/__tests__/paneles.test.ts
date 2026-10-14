// La pantalla "¿A qué panel entras?" de las cuentas de la agencia: lo que se
// fija es que la lista sale ordenada por nombre y que la búsqueda encuentra
// aunque se escriba sin tildes, en mayúsculas, por el nombre corto o por el id.
import { describe, expect, it } from "vitest";
import { PANELES_EXTERNOS, filtrarPaneles, inicialesDe, ordenarPaneles, primerNombre, sinTildes } from "@/lib/paneles";
import { isTenantId } from "@/lib/tenants";

const LISTA = [
  { id: "yaly", nombre: "YALÍ Hotel & Resort", corto: "YALÍ" },
  { id: "hospital", nombre: "Hospital Centro Ginecológico", corto: "Centro Ginecológico" },
  { id: "nissan", nombre: "Nissan El Salvador", corto: "Nissan" },
];

describe("elegir panel", () => {
  it("ordena por nombre", () => {
    expect(ordenarPaneles(LISTA).map((p) => p.id)).toEqual(["hospital", "nissan", "yaly"]);
  });

  it("busca sin tildes ni mayúsculas", () => {
    expect(filtrarPaneles(LISTA, "ginecologico").map((p) => p.id)).toEqual(["hospital"]);
    expect(filtrarPaneles(LISTA, "YALI").map((p) => p.id)).toEqual(["yaly"]);
    expect(filtrarPaneles(LISTA, "yalí").map((p) => p.id)).toEqual(["yaly"]);
  });

  it("busca por el nombre corto y por el id", () => {
    expect(filtrarPaneles(LISTA, "centro").map((p) => p.id)).toEqual(["hospital"]);
    expect(filtrarPaneles(LISTA, "yaly").map((p) => p.id)).toEqual(["yaly"]);
  });

  it("sin texto devuelve todos; sin coincidencia, nada", () => {
    expect(filtrarPaneles(LISTA, "   ")).toHaveLength(3);
    expect(filtrarPaneles(LISTA, "banco")).toHaveLength(0);
  });

  // Los demos externos entran a la misma lista que los tenants: si un id
  // chocara con un tenant, el mosaico equivocado abriría la app de afuera.
  it("los demos externos tienen url https, no chocan con tenants y se encuentran buscando", () => {
    for (const d of PANELES_EXTERNOS) {
      expect(d.url).toMatch(/^https:\/\//);
      expect(isTenantId(d.id)).toBe(false);
      expect(d.nombre.length).toBeGreaterThan(0);
    }
    const lista = [...LISTA, ...PANELES_EXTERNOS];
    expect(filtrarPaneles(lista, "vet").map((p) => p.id)).toEqual(["vets"]);
  });

  it("normaliza, saluda por el primer nombre y saca iniciales", () => {
    expect(sinTildes("  Ginecológico ")).toBe("ginecologico");
    expect(primerNombre("Alex (MiAgentIA)")).toBe("Alex");
    expect(primerNombre("Verónica Viches")).toBe("Verónica");
    expect(primerNombre(null)).toBe("");
    expect(inicialesDe("Hospital Centro Ginecológico")).toBe("HC");
    expect(inicialesDe("Nissan")).toBe("N");
    expect(inicialesDe("YALÍ Hotel & Resort")).toBe("YH");
  });
});
