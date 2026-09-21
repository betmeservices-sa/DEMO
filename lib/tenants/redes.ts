// Quién PUBLICA en Redes y quién solo MIRA.
//
// Son dos tableros distintos con el mismo nombre. El que publica trae composer,
// vista previa por red y columnas por cuenta; el que mira trae los números de
// la semana y el muro con las publicaciones como se ven en la red.
//
// Y el que solo mira tampoco modera: Comentarios es para contestar lo que
// escriben debajo del post, y quien no publica desde acá no tiene por qué
// hacerlo acá. Ese módulo se ata a esta misma pregunta a propósito, porque
// cuando eran dos reglas sueltas Nissan salió con una y sin la otra.

import type { TenantId } from "./types";

/**
 * Los clientes que a Redes vienen a MIRAR: su mercadeo publica por su cuenta.
 *
 * Nissan está acá porque su tablero es el espejo del de Grupo Q. Estaba
 * afuera, y se notaba: le salía el botón de "Nueva publicación" que Grupo Q no
 * tiene, le faltaba el muro con las publicaciones, y le sobraba Comentarios.
 */
export function soloMiraRedes(tenant: TenantId): boolean {
  return tenant === "grupoq" || tenant === "nissan";
}
