// El tablero de la agencia (miagentia) es solo metricas de clientes: la lista
// cerrada decide el menu, la portada y la puerta del servidor.
import { describe, expect, it } from "vitest";
import { MODULOS_AGENCIA, VE, agenciaVeRuta, destinoAgencia } from "@/lib/modulos";

describe("modulos de la agencia", () => {
  it("solo deja las metricas", () => {
    expect([...MODULOS_AGENCIA].sort()).toEqual(["costos", "dashboard", "llamadas", "reporte"]);
  });

  it("cierra la bandeja, redes y lo operativo", () => {
    for (const ruta of ["/", "/redes", "/comentarios", "/contactos", "/interno", "/tickets", "/qa", "/agentes", "/auditoria", "/settings"]) {
      expect(agenciaVeRuta("miagentia", ruta)).toBe(false);
    }
  });

  it("abre las metricas y las rutas sin modulo", () => {
    for (const ruta of ["/dashboard", "/reporte", "/costos", "/llamadas", "/privacy"]) {
      expect(agenciaVeRuta("miagentia", ruta)).toBe(true);
    }
  });

  it("no toca a los otros clientes", () => {
    expect(agenciaVeRuta("yaly", "/")).toBe(true);
    expect(agenciaVeRuta("grupoq", "/redes")).toBe(true);
  });

  it("la portada de la agencia es el tablero", () => {
    expect(destinoAgencia(VE.gerente_marketing)).toBe("dashboard");
    expect(destinoAgencia(VE.recepcion)).toBeNull();
  });
});
