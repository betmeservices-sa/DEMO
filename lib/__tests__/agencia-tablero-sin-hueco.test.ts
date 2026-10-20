// El tablero de la agencia no puede dejar un hueco mudo.
//
// El 2026-10-20 el usuario abrió la pestaña Centro Ginecológico y no vio
// estadísticas: ni cifras, ni "cargando", ni error. Los datos existían (563
// respuestas en 7 días); lo que fallaba era la pantalla. Al cambiar de cliente
// se quedaba el reporte del anterior, que no se pinta porque el id no coincide,
// y el "cargando" estaba atado a no tener NINGÚN reporte.
import { describe, expect, it } from "vitest";
import { queMostrarEnTablero } from "@/lib/agencia-consumo";

describe("qué se pinta debajo del filtro", () => {
  it("al cambiar de cliente se espera, no se deja el hueco", () => {
    // Lo exacto que pasó: se venía de Yali y se abrió el hospital.
    expect(queMostrarEnTablero({ reporteDe: "yaly", cliente: "hospital", cargando: true, error: null })).toBe(
      "cargando",
    );
  });

  it("el reporte de otro cliente nunca cuenta como tener datos", () => {
    expect(queMostrarEnTablero({ reporteDe: "yaly", cliente: "hospital", cargando: false, error: null })).toBe(
      "cargando",
    );
  });

  it("con el reporte del cliente que se mira, se pintan sus números", () => {
    expect(queMostrarEnTablero({ reporteDe: "hospital", cliente: "hospital", cargando: false, error: null })).toBe(
      "datos",
    );
  });

  it("mientras se refresca el que ya está, sus cifras no parpadean", () => {
    expect(queMostrarEnTablero({ reporteDe: "hospital", cliente: "hospital", cargando: true, error: null })).toBe(
      "datos",
    );
  });

  it("si falló y ya no se espera nada, manda el error de arriba", () => {
    expect(
      queMostrarEnTablero({ reporteDe: null, cliente: "hospital", cargando: false, error: "No se pudo leer." }),
    ).toBe("solo-error");
  });

  it("al entrar, antes de la primera respuesta, se espera", () => {
    expect(queMostrarEnTablero({ reporteDe: null, cliente: "yaly", cargando: true, error: null })).toBe("cargando");
  });
});
