// Cómo se escriben números y fechas en las pantallas de la agencia (el tablero,
// el plan de conversaciones y el registro de accesos). Siempre en hora de El
// Salvador: los timestamps de la base vienen en UTC.

export const TZ = "America/El_Salvador";

export function miles(n: number): string {
  return n.toLocaleString("en-US");
}

/** "18 sept, 10:24 a. m." */
export function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-SV", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** "18 sept" */
export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleString("es-SV", { timeZone: TZ, day: "numeric", month: "short" });
}

/** El rol de cada cuenta, como se lee en las pantallas de la agencia. */
export const ROL: Record<string, string> = {
  admin: "Administrador",
  jefe: "Dirección",
  gerente_marketing: "Gerente",
  atencion: "Atención",
  marketing: "Marketing",
  recepcion: "Recepción",
  medico: "Médico",
};
