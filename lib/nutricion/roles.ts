// Los tres perfiles del demo. Cada uno entra con su usuario y ve solo sus
// pantallas: el proxy bloquea las demás y el menú lateral cambia por perfil.

export type Rol = "secretaria" | "nutricionista" | "chef";

export const ROLES: Rol[] = ["secretaria", "nutricionista", "chef"];

/**
 * Con qué se entra: uno de los tres perfiles, o la vista general, que abre
 * todas las pantallas y deja cambiar de perfil desde la barra de arriba.
 */
export type Acceso = Rol | "general";
export const ACCESOS: Acceso[] = [...ROLES, "general"];
export const USUARIO_GENERAL = "demonutricion";

export const ROL_INFO: Record<Rol, { usuario: string; nombre: string; cargo: string; correo: string; inicio: string; color: string }> = {
  secretaria: { usuario: "secretaria", nombre: "Gabriela Ruiz", cargo: "Secretaria · atención al cliente", correo: "gabriela.ruiz@balancenutricion.com.sv", inicio: "/demonutricion", color: "#7c3aed" },
  nutricionista: { usuario: "nutricionista", nombre: "Lda. Andrea Morales", cargo: "Nutricionista dietista", correo: "andrea.morales@balancenutricion.com.sv", inicio: "/demonutricion/pacientes", color: "#15803d" },
  chef: { usuario: "chef", nombre: "Chef Marcos Aguilar", cargo: "Chef · cocina y producción", correo: "marcos.aguilar@balancenutricion.com.sv", inicio: "/demonutricion/cocina", color: "#c2410c" },
};

/** Rutas (prefijos) que puede abrir cada perfil. */
const RUTAS: Record<Rol, string[]> = {
  secretaria: ["/demonutricion", "/demonutricion/recordatorios", "/demonutricion/reactivacion", "/demonutricion/seguimiento", "/demonutricion/publicaciones", "/demonutricion/plantillas", "/demonutricion/pacientes", "/demonutricion/dashboard", "/demonutricion/agendas", "/demonutricion/conocimiento"],
  nutricionista: ["/demonutricion/pacientes", "/demonutricion/herramientas", "/demonutricion/seguimiento", "/demonutricion/recordatorios", "/demonutricion/agendas", "/demonutricion/conocimiento", "/demonutricion/cocina/menus"],
  chef: ["/demonutricion/cocina", "/demonutricion/agendas"],
};

export function puedeVer(acceso: Acceso, pathname: string): boolean {
  if (acceso === "general") return true;
  return RUTAS[acceso].some((r) => (r === "/demonutricion" ? pathname === "/demonutricion" : pathname === r || pathname.startsWith(`${r}/`)));
}

/** Calendarios que ve cada perfil en la barra de arriba. */
export const CALENDARIOS_DE: Record<Rol, ("consultas" | "entregas")[]> = {
  secretaria: ["consultas", "entregas"],
  nutricionista: ["consultas"],
  chef: ["entregas"],
};
