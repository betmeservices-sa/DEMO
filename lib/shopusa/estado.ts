// El estado vivo de ShopUSA = la muestra + lo que se hizo encima en el demo
// (movimientos). Puro, para probarlo sin navegador.
//
// Los movimientos se aplican en orden. Cada uno deja su evento en la bitácora
// del paquete con el id del movimiento, y de ahí sale el aviso de WhatsApp que
// la bandeja le muestra al cliente (lib/shopusa/avisos.ts).

import type { Carga, Etapa, EstadoCarga, EventoPaquete, Movimiento, Paquete } from "./tipos";
import { esEtapa, esSucursal } from "./catalogo";
import { envioDe, llegadaAMiami } from "./cobro";

const DURACION_VUELO_MS = (2 * 60 + 35) * 60_000;

/** Las etapas que una carga entera hace avanzar, y a dónde lleva cada estado. */
const ETAPA_POR_ESTADO: Record<Exclude<EstadoCarga, "programada">, { desde: Etapa; a: Etapa }> = {
  en_transito: { desde: "miami", a: "transito" },
  en_aduana: { desde: "transito", a: "aduana" },
  liberada: { desde: "aduana", a: "listo" },
};

export function esEstadoDespacho(v: unknown): v is Exclude<EstadoCarga, "programada"> {
  return v === "en_transito" || v === "en_aduana" || v === "liberada";
}

/** Se prealertó antes de llegar a Miami (o todavía no llega): el traslado no se cobra. */
export function prealertoATiempo(p: Paquete): boolean {
  if (!p.prealerta) return false;
  const llego = llegadaAMiami(p);
  return !llego || p.prealerta.ts <= llego;
}

function conEvento(p: Paquete, ev: EventoPaquete): Paquete {
  return { ...p, historial: [...p.historial, ev] };
}

function aEtapa(p: Paquete, a: Etapa, m: Movimiento): Paquete {
  if (p.etapa === a) return p;
  const sigue = conEvento(p, { ts: m.ts, tipo: a, actor: m.actor, movId: m.id });
  // Lo que sale de aduana ya no tiene selectivo.
  const selectivo = a === "aduana" ? p.selectivo : undefined;
  return { ...sigue, etapa: a, selectivo, entregadoA: a === "entregado" ? p.entregadoA : undefined };
}

function aplicarAPaquete(p: Paquete, m: Movimiento): Paquete {
  switch (m.tipo) {
    case "etapa":
      return esEtapa(m.valor.a) ? aEtapa(p, m.valor.a, m) : p;
    case "selectivo": {
      const motivo = typeof m.valor.motivo === "string" ? m.valor.motivo.trim() : "";
      if (!motivo || p.etapa !== "aduana" || p.selectivo) return p;
      return { ...conEvento(p, { ts: m.ts, tipo: "selectivo", actor: m.actor, movId: m.id, detalle: motivo }), selectivo: { motivo, desde: m.ts } };
    }
    case "liberar":
      return p.etapa === "aduana" ? aEtapa(p, "listo", m) : p;
    case "en_camino":
      if (p.etapa !== "listo" || p.entrega.tipo !== "domicilio" || p.historial.some((e) => e.tipo === "en_camino")) return p;
      return conEvento(p, { ts: m.ts, tipo: "en_camino", actor: m.actor, movId: m.id });
    case "traslado": {
      const destino = m.valor.sucursal;
      if (!esSucursal(destino) || p.etapa === "entregado") return p;
      if (p.entrega.tipo === "sucursal" && p.entrega.sucursal === destino) return p;
      return {
        ...conEvento(p, { ts: m.ts, tipo: "traslado", actor: m.actor, movId: m.id, detalle: destino }),
        entrega: { tipo: "sucursal", sucursal: destino },
        traslado: { cobra: !prealertoATiempo(p) },
      };
    }
    case "recordatorio":
      return p.etapa === "listo" ? conEvento(p, { ts: m.ts, tipo: "recordatorio", actor: m.actor, movId: m.id }) : p;
    default:
      return p;
  }
}

export interface EstadoShopusa {
  paquetes: Paquete[];
  cargas: Carga[];
}

/**
 * Aplica los movimientos a la muestra. Un "despacho" mueve la carga entera:
 * cada paquete que estaba en la etapa anterior pasa a la siguiente, con su
 * propio evento (y su propio aviso), y la carga toma la hora real del clic.
 */
export function aplicarMovimientos(base: { paquetes: Paquete[]; cargas: Carga[] }, movimientos: readonly Movimiento[]): EstadoShopusa {
  let paquetes = base.paquetes.map((p) => ({ ...p, historial: [...p.historial] }));
  let cargas = base.cargas.map((c) => ({ ...c }));
  const orden = [...movimientos].sort((a, b) => a.ts.localeCompare(b.ts) || a.id.localeCompare(b.id));

  for (const m of orden) {
    if (m.tipo === "prealerta") {
      const nuevo = m.valor.paquete as Paquete | undefined;
      if (!nuevo || paquetes.some((p) => p.id === nuevo.id || p.tracking === nuevo.tracking)) continue;
      paquetes = [
        ...paquetes,
        { ...nuevo, historial: [{ ts: m.ts, tipo: "pendiente", actor: m.actor, movId: m.id }], creado: m.ts },
      ];
      continue;
    }

    if (m.tipo === "despacho") {
      const estado = m.valor.estado;
      if (!esEstadoDespacho(estado)) continue;
      const c = cargas.find((x) => x.id === m.objetivo);
      if (!c) continue;
      const paso = ETAPA_POR_ESTADO[estado];
      cargas = cargas.map((x) => {
        if (x.id !== c.id) return x;
        if (estado === "en_transito") {
          return { ...x, estado, sale: m.ts, llega: new Date(Date.parse(m.ts) + DURACION_VUELO_MS).toISOString() };
        }
        if (estado === "en_aduana") return { ...x, estado, llega: m.ts };
        return { ...x, estado };
      });
      paquetes = paquetes.map((p, i) => {
        if (p.cargaId !== c.id || p.etapa !== paso.desde) return p;
        // Los que tienen selectivo rojo no salen de aduana con el resto de la carga.
        if (estado === "liberada" && p.selectivo) return p;
        // Un id por paquete: el aviso de cada cliente es suyo.
        return aEtapa(p, paso.a, { ...m, id: `${m.id}-${i}` });
      });
      continue;
    }

    if (m.tipo === "pagado") {
      // Un envío consolidado se cobra una vez: se paga junto con sus hermanos.
      const objetivo = paquetes.find((p) => p.id === m.objetivo);
      if (!objetivo || objetivo.pagado || !["listo", "entregado"].includes(objetivo.etapa)) continue;
      const envio = envioDe(objetivo, paquetes).filter((p) => !p.pagado);
      const ids = new Set(envio.map((p) => p.id));
      paquetes = paquetes.map((p) => {
        if (!ids.has(p.id)) return p;
        const principal = p.id === objetivo.id;
        return {
          ...conEvento(p, {
            ts: m.ts,
            tipo: "pagado",
            actor: m.actor,
            movId: principal ? m.id : `${m.id}-${p.id}`,
            ...(principal ? {} : { acompana: objetivo.id }),
          }),
          pagado: true,
        };
      });
      continue;
    }

    paquetes = paquetes.map((p) => (p.id === m.objetivo ? aplicarAPaquete(p, m) : p));
  }

  return { paquetes, cargas };
}

/** Valida lo que llega de la pantalla antes de guardarlo. */
export function movimientoValido(m: Pick<Movimiento, "tipo" | "objetivo" | "valor">): boolean {
  if (!m.objetivo) return false;
  const v = m.valor ?? {};
  switch (m.tipo) {
    case "etapa":
      return esEtapa(v.a);
    case "selectivo":
      return typeof v.motivo === "string" && v.motivo.trim().length > 0;
    case "traslado":
      return esSucursal(v.sucursal);
    case "despacho":
      return esEstadoDespacho(v.estado);
    case "prealerta":
      return Boolean(v.paquete && typeof v.paquete === "object");
    case "liberar":
    case "pagado":
    case "en_camino":
    case "recordatorio":
      return true;
    default:
      return false;
  }
}
