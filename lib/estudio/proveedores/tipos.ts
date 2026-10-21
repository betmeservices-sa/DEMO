// Lo que el motor le pide a cada servicio externo.
//
// Una interfaz por servicio, para cambiar de proveedor sin tocar las
// pantallas ni las rutas: el texto puede salir de Claude o de luna, el avatar
// de HeyGen o de Synthesia, y el render de Creatomate o de Remotion. Cada
// adaptador devuelve también lo que costó, que va a `usage_log`.

import type { Idioma, Marca, Pieza, Red, RegistroUso, TipoPieza } from "../tipos";

export interface PedidoTexto {
  marca: Marca;
  texto: string;
  formato: TipoPieza;
  cantidad: number;
  idiomas: Record<Idioma, number>;
  redes?: Red[];
  fotos?: string[];
  encargoId: string;
  actor: string;
}

export type UsoSinId = Omit<RegistroUso, "id">;

export interface ProveedorTexto {
  nombre: string;
  generar(pedido: PedidoTexto): Promise<{ piezas: Pieza[]; uso: UsoSinId[] }>;
  reescribir(pieza: Pieza, marca: Marca, motivo: string): Promise<{ pieza: Pieza; uso: UsoSinId[] }>;
}

export interface ProveedorAvatar {
  nombre: string;
  /** Arranca el video (voz + avatar + edición) y devuelve el id del trabajo. */
  armarVideo(pieza: Pieza, marca: Marca): Promise<{ trabajoId: string; minutos: number; uso: UsoSinId[] }>;
}

export interface Publicador {
  nombre: string;
  /** Un post por cuenta: cada red devuelve su propio id. */
  programar(pieza: Pieza, marca: Marca, cuando: string): Promise<{ postIds: Partial<Record<Red, string>>; errores: Partial<Record<Red, string>> }>;
}

export interface Proveedores {
  texto: ProveedorTexto;
  avatar: ProveedorAvatar;
  publicador: Publicador;
}
