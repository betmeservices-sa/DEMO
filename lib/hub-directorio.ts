// Las cuentas de un cliente en el directorio de hub (esquema `hub` del proyecto
// compartido). Ahí viven las de la gente que entra por hub.miagentia.com: las
// del hospital (Marielos, Sandra, Andrea) no están en la variable USUARIOS de
// este panel. Solo lectura, y sin la huella de la clave.

import type { Persona } from "./agencia-clientes";
import { directorioDeHub } from "./supabase";

export async function cuentasDeHub(cliente: string): Promise<Persona[]> {
  const sb = directorioDeHub();
  if (!sb) return [];
  const { data, error } = await sb
    .from("usuarios")
    .select("correo, nombre, rol, activo")
    .eq("cliente_id", cliente)
    .eq("todos", false);
  if (error) {
    console.error("[hub-directorio] cuentas de", cliente, error.message);
    return [];
  }
  return ((data ?? []) as { correo: string; nombre: string | null; rol: string | null; activo: boolean | null }[])
    .filter((c) => c.activo !== false)
    .map((c) => ({ usuario: c.correo, nombre: c.nombre?.trim() || c.correo, rol: c.rol ?? "atencion" }));
}
