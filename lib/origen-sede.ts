// De qué hotel viene el contacto, SIN preguntárselo.
//
// ── EL PROBLEMA ──
// Yali tiene tres perfiles de Instagram (uno por hotel) pero un solo WhatsApp.
// Cuando alguien toca "Enviar mensaje" desde la bio, WhatsApp NO le dice al
// negocio de qué perfil salió: llega un número y ya. Por eso el agente abre
// preguntando a cuál sede escribe.
//
// ── LO QUE SÍ SE PUEDE ──
// 1. LINK CON MENSAJE PRELLENADO (funciona hoy, sin API, sin pauta). En la bio
//    de cada perfil va un `wa.me/<numero>?text=...` distinto, con el nombre de
//    ESE hotel adentro. El huésped toca, WhatsApp le abre el chat con el texto
//    escrito y solo aprieta enviar. El primer mensaje llega diciendo de dónde
//    viene y el agente se salta la pregunta. Si el huésped borra el texto,
//    caemos en la pregunta de siempre: no se pierde nada.
// 2. REFERRAL DE ANUNCIO (exacto, pero solo con pauta). Si el clic viene de un
//    anuncio de click to WhatsApp, Meta manda un bloque `referral` en el
//    webhook con el id del anuncio, su titular y su cuerpo. Ahí la sede se
//    deduce con certeza.
// 3. UN NÚMERO POR HOTEL (lo único 100% infalible). El webhook ya sabe enrutar
//    por `phone_number_id`; falta que el hotel tenga tres números.
//
// Este archivo cubre 1 y 2. La 3 es una decisión del cliente, no código.

import { interpretarSucursal } from "./sucursal-gate";
import type { SucursalTenant, TenantSucursales } from "./tenants/types";

/** Bloque `referral` de WhatsApp Cloud API (solo llega en clics desde anuncios). */
export interface ReferralWa {
  source_id?: string;
  source_url?: string;
  source_type?: string;
  headline?: string;
  body?: string;
  ctwa_clid?: string;
}

/** El texto que va prellenado en el link de la bio de cada perfil. */
export function fraseBio(sede: SucursalTenant): string {
  return `Hola, quiero información de ${sede.nombre}`;
}

/**
 * Link para la bio de un perfil. El número va sin signos ni espacios, con
 * código de país (wa.me lo exige así).
 */
export function linkBio(numero: string, sede: SucursalTenant): string {
  const limpio = numero.replace(/\D/g, "");
  return `https://wa.me/${limpio}?text=${encodeURIComponent(fraseBio(sede))}`;
}

/**
 * Sede de la que viene el contacto, o null si no se puede saber (ahí sí toca
 * preguntar). Se mira primero el anuncio, que es dato de Meta, y después el
 * texto, que lo pudo haber editado el huésped.
 */
export function sedeDeOrigen(
  entrada: { texto?: string; referral?: ReferralWa | null },
  sucursales?: TenantSucursales,
): SucursalTenant | null {
  if (!sucursales) return null;

  const r = entrada.referral;
  if (r) {
    // El titular y el cuerpo del anuncio nombran el hotel; la URL suele traer
    // el slug de su página. Se prueban en ese orden, del más explícito al menos.
    for (const campo of [r.headline, r.body, urlLegible(r.source_url)]) {
      if (!campo) continue;
      const sede = interpretarSucursal(campo, sucursales);
      if (sede) return sede;
    }
  }

  if (entrada.texto) {
    const sede = interpretarSucursal(entrada.texto, sucursales);
    if (sede) return sede;
  }
  return null;
}

// "https://www.yalihospitality.com/costa-del-surf" -> "costa del surf", para que
// el mismo comparador de alias pueda leerla.
function urlLegible(url?: string): string {
  if (!url) return "";
  try {
    return decodeURIComponent(new URL(url).pathname).replace(/[-_/]+/g, " ").trim();
  } catch {
    return url.replace(/[-_/]+/g, " ");
  }
}
