"use client";

// Los comentarios de un hotel de muestra, con la misma forma que devuelve
// /api/meta/comentarios. Las acciones quedan como movimientos del demo.

import type { Comentario } from "@/lib/meta-comentarios";
import { registrar, vistaDe } from "./store";

export function leerComentariosMuestra(tenant: string): { comentarios: Comentario[] } | null {
  const vista = vistaDe(tenant);
  return vista ? { comentarios: vista.comentarios } : null;
}

/** Lo mismo que hace el POST de /api/meta/comentarios. */
export function accionarComentarioMuestra(id: string, cuerpo: Record<string, unknown>, actor: string): string | null {
  if (typeof cuerpo.texto === "string") {
    if (!cuerpo.texto.trim()) return "Escribe la respuesta.";
    registrar({ tipo: "comentario.responder", comentarioId: id, texto: cuerpo.texto.trim(), privado: cuerpo.privado === true, actor });
  } else if (typeof cuerpo.ocultar === "boolean") {
    registrar({ tipo: "comentario.ocultar", comentarioId: id, oculto: cuerpo.ocultar, actor });
  } else if (typeof cuerpo.meGusta === "boolean") {
    registrar({ tipo: "comentario.megusta", comentarioId: id, valor: cuerpo.meGusta, actor });
  }
  return null;
}
