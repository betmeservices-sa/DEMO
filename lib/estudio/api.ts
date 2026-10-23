"use client";

// Las llamadas de las pantallas al servidor del motor. Lo que contestan se
// guarda en el store; si el servidor no contesta, el error sube a la pantalla.

import { agregarEncargo, aprobar, programar, reemplazar, registrarUso, ACTOR } from "./store";
import type { Encargo, Idioma, Marca, OrigenImagen, Pieza, Red, RegistroUso, TipoPieza } from "./tipos";

type UsoSinId = Omit<RegistroUso, "id">;

async function post<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const r = await fetch(ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const j = (await r.json().catch(() => null)) as ({ ok: boolean; error?: string } & T) | null;
  if (!r.ok || !j?.ok) throw new Error(j?.error ?? "El servidor no contestó. Vuelve a intentar.");
  return j;
}

function conIds(uso: UsoSinId[]): RegistroUso[] {
  return uso.map((u, i) => ({ ...u, id: `uso-${Date.now().toString(36)}-${i}` }));
}

export interface NuevoEncargo {
  marca: Marca;
  texto: string;
  formato: TipoPieza;
  cantidad: number;
  idiomas: Record<Idioma, number>;
  redes: Red[];
  fotos?: string[];
  origenImagen?: OrigenImagen;
}

/** Genera el lote y lo deja en la cola de aprobación. Devuelve las piezas nuevas. */
export async function generar(n: NuevoEncargo): Promise<Pieza[]> {
  const encargoId = `enc-${Date.now().toString(36)}`;
  const r = await post<{ piezas: Pieza[]; uso: UsoSinId[] }>("/api/estudio/generar", {
    marca: n.marca,
    texto: n.texto,
    formato: n.formato,
    cantidad: n.cantidad,
    idiomas: n.idiomas,
    redes: n.redes,
    fotos: n.fotos,
    origenImagen: n.origenImagen,
    encargoId,
    actor: ACTOR,
  });
  const encargo: Encargo = {
    id: encargoId,
    marcaId: n.marca.id,
    texto: n.texto,
    formato: n.formato,
    cantidad: n.cantidad,
    origenImagen: n.origenImagen,
    idiomas: n.idiomas,
    redes: n.redes,
    creado: new Date().toISOString(),
    actor: ACTOR,
    piezas: r.piezas.map((p) => p.id),
  };
  agregarEncargo(encargo, r.piezas, conIds(r.uso));
  return r.piezas;
}

export async function regenerar(pieza: Pieza, marca: Marca, motivo: string): Promise<Pieza> {
  const r = await post<{ pieza: Pieza; uso: UsoSinId[] }>("/api/estudio/reescribir", { pieza, marca, motivo });
  reemplazar(r.pieza);
  registrarUso(conIds(r.uso));
  return r.pieza;
}

/** Aprueba. Si es el guion de un video, arranca el video en el servidor. */
export async function aprobarPieza(pieza: Pieza, marca: Marca): Promise<void> {
  if (pieza.tipo === "video" && pieza.fase === "guion") {
    const r = await post<{ trabajoId: string; minutos: number }>("/api/estudio/video", { pieza, marca });
    aprobar(pieza.id, r);
    return;
  }
  aprobar(pieza.id);
}

/** Programa en el planificador. Las redes con la cuenta vencida vuelven como error. */
export async function programarPieza(
  pieza: Pieza,
  marca: Marca,
  cuando: string,
): Promise<{ errores: Partial<Record<Red, string>> }> {
  const r = await post<{ postIds: Partial<Record<Red, string>>; errores: Partial<Record<Red, string>> }>(
    "/api/estudio/programar",
    { pieza, marca, cuando },
  );
  programar(pieza.id, cuando, r.postIds, r.errores);
  return { errores: r.errores };
}
