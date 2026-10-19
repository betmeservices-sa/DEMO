// El estado vivo de Express Shopping = la muestra + lo que se hizo encima en
// el demo (movimientos). Puro, para probarlo sin navegador.
//
// Los movimientos se aplican en orden. Cada uno deja su evento en la bitácora
// del paquete con el id del movimiento, y de ahí sale el aviso de WhatsApp que
// la bandeja le muestra al cliente (lib/exs/avisos.ts).

import type { Etapa, EventoPaquete, EstadoVuelo, Movimiento, Paquete, Vuelo } from "./tipos";
import { esEtapa } from "./catalogo";

const DURACION_VUELO_MS = (2 * 60 + 35) * 60_000;

/** Las etapas que un vuelo entero hace avanzar, y a dónde lleva cada estado. */
const ETAPA_POR_ESTADO: Record<Exclude<EstadoVuelo, "programado">, { desde: Etapa; a: Etapa }> = {
  en_vuelo: { desde: "miami", a: "en_vuelo" },
  en_aduana: { desde: "en_vuelo", a: "aduana" },
  liberado: { desde: "aduana", a: "listo" },
};

export function esEstadoDespacho(v: unknown): v is Exclude<EstadoVuelo, "programado"> {
  return v === "en_vuelo" || v === "en_aduana" || v === "liberado";
}

function conEvento(p: Paquete, ev: EventoPaquete): Paquete {
  return { ...p, historial: [...p.historial, ev] };
}

function aEtapa(p: Paquete, a: Etapa, m: Movimiento): Paquete {
  if (p.etapa === a) return p;
  const sigue = conEvento(p, { ts: m.ts, tipo: a, actor: m.actor, movId: m.id });
  // Lo que sale de aduana ya no está retenido.
  const retenido = a === "aduana" ? p.retenido : undefined;
  return { ...sigue, etapa: a, retenido, entregadoA: a === "entregado" ? p.entregadoA : undefined };
}

function aplicarAPaquete(p: Paquete, m: Movimiento): Paquete {
  switch (m.tipo) {
    case "etapa":
      return esEtapa(m.valor.a) ? aEtapa(p, m.valor.a, m) : p;
    case "retener": {
      const motivo = typeof m.valor.motivo === "string" ? m.valor.motivo.trim() : "";
      if (!motivo || p.etapa !== "aduana" || p.retenido) return p;
      return { ...conEvento(p, { ts: m.ts, tipo: "retenido", actor: m.actor, movId: m.id, detalle: motivo }), retenido: { motivo, desde: m.ts } };
    }
    case "liberar":
      return p.etapa === "aduana" ? aEtapa(p, "listo", m) : p;
    case "pagado":
      return p.pagado ? p : { ...conEvento(p, { ts: m.ts, tipo: "pagado", actor: m.actor, movId: m.id }), pagado: true };
    case "vuelo": {
      const vueloId = typeof m.valor.vueloId === "string" ? m.valor.vueloId : "";
      if (!vueloId || vueloId === p.vueloId || p.etapa !== "miami") return p;
      return { ...conEvento(p, { ts: m.ts, tipo: "cambio_vuelo", actor: m.actor, movId: m.id, detalle: vueloId }), vueloId };
    }
    case "recordatorio":
      return p.etapa === "listo" ? conEvento(p, { ts: m.ts, tipo: "recordatorio", actor: m.actor, movId: m.id }) : p;
    default:
      return p;
  }
}

export interface EstadoExs {
  paquetes: Paquete[];
  vuelos: Vuelo[];
}

/**
 * Aplica los movimientos a la muestra. Un "despacho" mueve el vuelo entero:
 * cada paquete que estaba en la etapa anterior pasa a la siguiente, con su
 * propio evento (y su propio aviso), y el vuelo toma la hora real del clic.
 */
export function aplicarMovimientos(base: { paquetes: Paquete[]; vuelos: Vuelo[] }, movimientos: readonly Movimiento[]): EstadoExs {
  let paquetes = base.paquetes.map((p) => ({ ...p, historial: [...p.historial] }));
  let vuelos = base.vuelos.map((v) => ({ ...v }));
  const orden = [...movimientos].sort((a, b) => a.ts.localeCompare(b.ts) || a.id.localeCompare(b.id));

  for (const m of orden) {
    if (m.tipo === "prealerta") {
      const nuevo = m.valor.paquete as Paquete | undefined;
      if (!nuevo || paquetes.some((p) => p.id === nuevo.id)) continue;
      paquetes = [
        ...paquetes,
        { ...nuevo, historial: [{ ts: m.ts, tipo: "prealertado", actor: m.actor, movId: m.id }], creado: m.ts },
      ];
      continue;
    }

    if (m.tipo === "despacho") {
      const estado = m.valor.estado;
      if (!esEstadoDespacho(estado)) continue;
      const v = vuelos.find((x) => x.id === m.objetivo);
      if (!v) continue;
      const paso = ETAPA_POR_ESTADO[estado];
      vuelos = vuelos.map((x) => {
        if (x.id !== v.id) return x;
        if (estado === "en_vuelo") {
          return { ...x, estado, sale: m.ts, llega: new Date(Date.parse(m.ts) + DURACION_VUELO_MS).toISOString() };
        }
        if (estado === "en_aduana") return { ...x, estado, llega: m.ts };
        return { ...x, estado };
      });
      paquetes = paquetes.map((p, i) => {
        if (p.vueloId !== v.id || p.etapa !== paso.desde) return p;
        // Los retenidos no salen de aduana con el resto del vuelo.
        if (estado === "liberado" && p.retenido) return p;
        // Un id por paquete: el aviso de cada cliente es suyo.
        return aEtapa(p, paso.a, { ...m, id: `${m.id}-${i}`, actor: m.actor });
      });
      continue;
    }

    paquetes = paquetes.map((p) => (p.id === m.objetivo ? aplicarAPaquete(p, m) : p));
  }

  return { paquetes, vuelos };
}

/** Lo que trae un cliente en un vuelo (suma de lo declarado). */
export function totalDelVuelo(paquetes: readonly Paquete[], clienteId: string, vueloId?: string): number {
  if (!vueloId) return 0;
  const cent = paquetes
    .filter((p) => p.clienteId === clienteId && p.vueloId === vueloId)
    .reduce((n, p) => n + Math.round(p.valor * 100), 0);
  return cent / 100;
}

/** Valida lo que llega de la pantalla antes de guardarlo. null = no vale. */
export function movimientoValido(m: Pick<Movimiento, "tipo" | "objetivo" | "valor">): boolean {
  if (!m.objetivo) return false;
  const v = m.valor ?? {};
  switch (m.tipo) {
    case "etapa":
      return esEtapa(v.a);
    case "retener":
      return typeof v.motivo === "string" && v.motivo.trim().length > 0;
    case "vuelo":
      return typeof v.vueloId === "string" && v.vueloId.length > 0;
    case "despacho":
      return esEstadoDespacho(v.estado);
    case "prealerta":
      return Boolean(v.paquete && typeof v.paquete === "object");
    case "liberar":
    case "pagado":
    case "recordatorio":
      return true;
    default:
      return false;
  }
}
