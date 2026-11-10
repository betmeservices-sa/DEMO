import { beforeEach, describe, expect, it, vi } from "vitest";

// Lo que Valeria busca en la base del lab queda anotado (dashboard, "de qué
// preguntan"), solo en los chats reales.
const { registrarBusqueda } = vi.hoisted(() => ({ registrarBusqueda: vi.fn(async () => {}) }));
vi.mock("@/lib/ia-busquedas", async (original) => ({
  ...(await original<typeof import("@/lib/ia-busquedas")>()),
  registrarBusqueda,
}));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => null, todosLosClientes: () => [] }));

import { ejecutarHerramienta } from "@/lib/ai";
import { resultadosDeRespuesta } from "@/lib/ia-busquedas";

beforeEach(() => registrarBusqueda.mockClear());

describe("las búsquedas de Valeria", () => {
  it("en un chat real se anotan con sus primeros resultados", async () => {
    await ejecutarHerramienta("kb_buscar", { consulta: "hemograma" }, undefined, { tenantId: "consultorio", telefono: "50370000001" });
    expect(registrarBusqueda).toHaveBeenCalledTimes(1);
    const [tenant, tel, consulta, resultados] = registrarBusqueda.mock.calls[0] as unknown as [string, string, string, Array<{ nombre: string }>];
    expect([tenant, tel, consulta]).toEqual(["consultorio", "50370000001", "hemograma"]);
    expect(resultados[0].nombre).toMatch(/Hemograma/);
    expect(resultados.length).toBeLessThanOrEqual(3);
  });

  it("lo que no está en la base se anota sin resultados", async () => {
    await ejecutarHerramienta("kb_buscar", { consulta: "xyzzy qwerty" }, undefined, { tenantId: "consultorio", telefono: "50370000001" });
    expect((registrarBusqueda.mock.calls[0] as unknown[])[3]).toEqual([]);
  });

  it("las pruebas y Probar a Valeria no cuentan", async () => {
    await ejecutarHerramienta("kb_buscar", { consulta: "hemograma" }, undefined, { tenantId: "consultorio", clave: "prueba:qa-1" });
    await ejecutarHerramienta("kb_buscar", { consulta: "hemograma" }, undefined, { tenantId: "consultorio", telefono: "50370000001", clave: "prueba:x" });
    expect(registrarBusqueda).not.toHaveBeenCalled();
  });

  it("de la respuesta se guarda lo justo", () => {
    const json = JSON.stringify({ resultados: [{ tipo: "examen", id: "a", nombre: "A", score: 1, datos: { precio: 9 } }] });
    expect(resultadosDeRespuesta(json)).toEqual([{ tipo: "examen", id: "a", nombre: "A", score: 1 }]);
    expect(resultadosDeRespuesta("no es json")).toEqual([]);
  });
});
