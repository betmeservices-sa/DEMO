// Contestar desde el panel cierra los casos de esa persona, en los negocios que
// lo piden (cerrarAlResponder en lib/tickets-tenant.ts; hoy, el laboratorio).
//
// Lo llaman las rutas por donde sale lo que escribe una PERSONA del equipo:
// texto, archivo y plantilla. Las respuestas de la IA no pasan por ahí, así
// que lo que conteste Valeria no cierra nada.

import { leerSesion, sesionDeCookieHeader } from "./session";
import { cerrarTicketsDeChat } from "./tickets-store";
import { configTickets } from "./tickets-tenant";
import { cuentaDeUsuario } from "./usuarios";

/** Los números de los casos que se cerraron. Si algo falla, el mensaje ya salió igual. */
export async function cerrarCasosAlResponder(req: Request, tenant: string, telefono: string): Promise<number[]> {
  if (!configTickets(tenant).cerrarAlResponder) return [];
  try {
    const sesion = await leerSesion(sesionDeCookieHeader(req.headers.get("cookie")));
    const nombre = sesion?.usuario ? cuentaDeUsuario(sesion.usuario)?.nombre : undefined;
    const cerrados = await cerrarTicketsDeChat(tenant, telefono, nombre || "Equipo");
    return cerrados.map((t) => t.numero);
  } catch (e) {
    console.error("[tickets] cerrar al responder:", e instanceof Error ? e.message : e);
    return [];
  }
}
