// La tarifa de fin de semana de un hotel de muestra.
//
// Va sola y sin imports a propósito: la usan el libro de reservas (lo que
// muestra el tablero) y el guion de la recepcionista de voz, que se arma con
// Node directo desde scripts/tesoro/crear-agente.mjs. Si el recargo cambia acá,
// el tablero y lo que la agente dice por teléfono cambian juntos.

/** Las noches de viernes y sábado suben un 20 %. */
export const RECARGO_FINDE = 1.2;

export function tarifaFinde(tarifaNoche: number): number {
  return Math.round(tarifaNoche * RECARGO_FINDE);
}
