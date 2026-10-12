// Los clientes de verdad que reporta el tablero de la agencia. Lo que se fija:
// solo Yali vende (el hospital no tiene reservas que contar), cada uno cuenta
// los casos con el nombre de SU agente, y la gente del cliente sale de las dos
// listas de cuentas sin repetirse.
import { describe, expect, it } from "vitest";
import { CLIENTES_AGENCIA, clienteDeLaAgencia, personasDelCliente } from "@/lib/agencia-clientes";
import { TENANTS } from "@/lib/tenants";

describe("los clientes del tablero", () => {
  it("Yali y el hospital, los dos clientes de verdad", () => {
    expect(CLIENTES_AGENCIA.map((c) => c.id)).toEqual(["yaly", "hospital"]);
    for (const c of CLIENTES_AGENCIA) expect(TENANTS[c.id]).toBeDefined();
  });

  it("solo Yali vende: el hospital no tiene reservas ni 'Quién cerró'", () => {
    expect(clienteDeLaAgencia("yaly")?.vende).toBe(true);
    expect(clienteDeLaAgencia("hospital")?.vende).toBe(false);
  });

  it("cada uno con el nombre de su agente", () => {
    expect(clienteDeLaAgencia("yaly")?.agentes).toEqual(["Sofía"]);
    expect(clienteDeLaAgencia("hospital")?.agentes).toEqual(["Valeria", "Claudia"]);
  });

  it("un demo no es cliente del tablero", () => {
    expect(clienteDeLaAgencia("grupoq")).toBeNull();
  });
});

describe("la gente del cliente", () => {
  it("junta las cuentas del panel y las del directorio de hub, sin repetir", () => {
    const personas = personasDelCliente(
      [{ usuario: "veronica@yali.com", nombre: "Verónica", rol: "atencion" }],
      [
        { usuario: "Veronica@Yali.com", nombre: "Verónica Viches", rol: "admin" },
        { usuario: "olga@yali.com", nombre: "Olga", rol: "atencion" },
      ],
    );
    // La del panel manda: así la pestaña de Yali no cambia por el directorio.
    expect(personas).toEqual([
      { usuario: "veronica@yali.com", nombre: "Verónica", rol: "atencion" },
      { usuario: "olga@yali.com", nombre: "Olga", rol: "atencion" },
    ]);
  });

  it("un cliente que solo existe en hub sale entero del directorio", () => {
    const personas = personasDelCliente([], [{ usuario: "marielos@cegisa.com", nombre: "Marielos", rol: "atencion" }]);
    expect(personas.map((p) => p.usuario)).toEqual(["marielos@cegisa.com"]);
  });
});
