// Los períodos del dashboard del laboratorio. Aparte de lib/lab-panel.ts para
// que la pantalla (cliente) no arrastre el código que lee la base.

export type PeriodoLab = "hoy" | "7d" | "30d" | "todo";

export const PERIODOS: Array<{ id: PeriodoLab; label: string }> = [
  { id: "hoy", label: "Hoy" },
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "todo", label: "Todo" },
];

export function esPeriodo(v: unknown): v is PeriodoLab {
  return PERIODOS.some((p) => p.id === v);
}
