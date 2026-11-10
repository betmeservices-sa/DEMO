import { describe, expect, it } from "vitest";
import { TENANTS } from "@/lib/tenants";

// 10/11/2026: en el panel real del lab alguien prendió "En vivo" y aparecieron
// chats inventados (otras sucursales, precios viejos, un Facebook que el lab no
// tiene) mezclados con los de verdad. El panel del lab no simula nada.
describe("el panel del laboratorio", () => {
  it("no tiene chats de simulación", () => {
    expect(TENANTS.consultorio.simulacion.turnos).toEqual([]);
    expect(TENANTS.consultorio.simulacion.contactos).toEqual([]);
  });

  it("los demos de venta siguen con su simulación", () => {
    expect(TENANTS.nissan.simulacion.turnos.length).toBeGreaterThan(0);
  });
});
