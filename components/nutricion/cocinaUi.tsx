import { CircleDashed, ClipboardCheck, Flame, PackageCheck, Truck, type LucideIcon } from "lucide-react";
import { conflictos, enCocina, plato } from "@/lib/nutricion/cocina";
import { cliente } from "@/lib/nutricion/seed";
import type { DiaOrden, EstadoOrden, Orden, PlanAlimentacion } from "@/lib/nutricion/types";

// Piezas de cocina que comparten la cola, la producción y los perfiles.

export const ESTADO_ORDEN: Record<EstadoOrden, { label: string; className: string; Icon: LucideIcon }> = {
  nueva: { label: "Nueva", className: "bg-amber-50 text-amber-800 ring-amber-300/60", Icon: CircleDashed },
  confirmada: { label: "Confirmada", className: "bg-sky-50 text-sky-700 ring-sky-300/60", Icon: ClipboardCheck },
  preparacion: { label: "En preparación", className: "bg-violet-50 text-violet-700 ring-violet-300/60", Icon: Flame },
  lista: { label: "Lista", className: "bg-emerald-50 text-emerald-700 ring-emerald-300/60", Icon: PackageCheck },
  despachada: { label: "Con el repartidor", className: "bg-slate-100 text-slate-600 ring-slate-300/60", Icon: Truck },
};

export const ESTADO_DIA: Record<DiaOrden["estado"], { label: string; className: string }> = {
  pendiente: { label: "Por preparar", className: "bg-amber-50 text-amber-800" },
  lista: { label: "Lista", className: "bg-emerald-50 text-emerald-700" },
  entregada: { label: "Entregada", className: "bg-slate-100 text-slate-600" },
};

/** Platos de cocina con un alérgeno del paciente y sin ajuste escrito (no debería haber ninguno). */
export function pendientesDeAlergia(o: Orden, p?: PlanAlimentacion) {
  const alergias = p?.alergias ?? cliente(o.clienteId).alergias ?? [];
  return o.dias.flatMap((d) => d.items.filter((i) => enCocina(i.tiempo, o.plan) && !i.ajuste?.trim() && conflictos(plato(i.platoId), alergias).length));
}

/** Platos que prepara la cocina en el paquete (días × tiempos, sin meriendas). */
export function comidasDe(o: Orden): number {
  return o.dias.reduce((n, d) => n + d.items.filter((i) => enCocina(i.tiempo, o.plan)).length, 0);
}
