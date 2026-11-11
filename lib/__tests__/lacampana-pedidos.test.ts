import { describe, expect, it } from "vitest";
import {
  CAPACIDAD_COCINA,
  MINUTOS_POR_TURNO,
  avanzar,
  colaDe,
  enCocina,
  esperaEstimada,
  llenarCocina,
  pedidoEntrante,
  semillaPedidos,
  siguienteEtapa,
  totalPedido,
  type Pedido,
} from "@/lib/lacampana/pedidos";
import { ocupacion, semillaAgenda } from "@/lib/lacampana/agenda";
import { platoPorId } from "@/lib/lacampana/menu";
import { SUCURSALES_CAMPANA } from "@/lib/lacampana/sucursales";

const AHORA = Date.parse("2026-11-11T15:00:00-06:00");

function pedido(id: string, extra: Partial<Pedido> = {}): Pedido {
  const iso = new Date(AHORA).toISOString();
  return {
    id,
    numero: Number(id.replace(/\D/g, "")) || 1,
    cliente: "Prueba",
    telefono: "+503 0000 0000",
    origen: "whatsapp",
    sucursalId: "apopa",
    tipo: "domicilio",
    lineas: [{ platoId: "promo-burritos", cantidad: 1 }],
    pago: "efectivo",
    etapa: "cola",
    recibido: iso,
    desde: iso,
    porSofia: true,
    ...extra,
  };
}

describe("La Campana · la muestra", () => {
  it("cada pedido usa platos y sucursales que existen", () => {
    for (const p of semillaPedidos(AHORA)) {
      expect(SUCURSALES_CAMPANA.some((s) => s.id === p.sucursalId), p.id).toBe(true);
      for (const l of p.lineas) expect(platoPorId(l.platoId), `${p.id} ${l.platoId}`).toBeDefined();
    }
  });

  it("ninguna cocina arranca por encima de su capacidad", () => {
    const ps = semillaPedidos(AHORA);
    for (const s of SUCURSALES_CAMPANA) expect(enCocina(ps, s.id), s.id).toBeLessThanOrEqual(CAPACIDAD_COCINA);
  });

  it("los pedidos se toman solo por WhatsApp: el resto es dónde empezó la conversación", () => {
    const ps = [...semillaPedidos(AHORA), pedidoEntrante(semillaPedidos(AHORA), AHORA)];
    for (const p of ps) {
      expect(["whatsapp", "instagram", "facebook"], p.id).toContain(p.origen);
      expect(p, p.id).not.toHaveProperty("canal");
    }
  });

  it("la agenda no lleva pedidos: solo reservaciones y eventos", () => {
    for (const c of semillaAgenda(AHORA)) expect(["reserva", "evento"]).toContain(c.tipo);
  });

  it("el total suma precio por cantidad", () => {
    const p = pedido("P-1", { lineas: [{ platoId: "promo-burritos", cantidad: 2 }, { platoId: "soda-lata", cantidad: 1 }] });
    expect(totalPedido(p)).toBeCloseTo(9.75 * 2 + 1.55, 2);
  });
});

describe("La Campana · la cola de cocina", () => {
  it("con la cocina llena no deja pasar a nadie más", () => {
    const llenos = Array.from({ length: CAPACIDAD_COCINA }, (_, i) => pedido(`P-${i + 1}`, { etapa: "cocina" }));
    const esperando = pedido("P-9");
    const ps = [...llenos, esperando];
    expect(avanzar(ps, "P-9", AHORA)).toBe(ps);
    expect(esperaEstimada(esperando, ps, AHORA)).toBe(MINUTOS_POR_TURNO);
  });

  it("al terminar uno en cocina, entra el primero de la cola por orden de llegada", () => {
    const llenos = Array.from({ length: CAPACIDAD_COCINA }, (_, i) => pedido(`P-${i + 1}`, { etapa: "cocina" }));
    const viejo = pedido("P-10", { recibido: new Date(AHORA - 10 * 60_000).toISOString() });
    const nuevo = pedido("P-11", { recibido: new Date(AHORA - 2 * 60_000).toISOString() });
    const despues = avanzar([...llenos, nuevo, viejo], "P-1", AHORA, true);
    expect(despues.find((p) => p.id === "P-1")?.etapa).toBe("listo");
    expect(despues.find((p) => p.id === "P-10")?.etapa).toBe("cocina");
    expect(despues.find((p) => p.id === "P-11")?.etapa).toBe("cola");
    expect(enCocina(despues, "apopa")).toBe(CAPACIDAD_COCINA);
  });

  it("sin auto-cola, el lugar queda libre hasta que alguien lo pase", () => {
    const llenos = Array.from({ length: CAPACIDAD_COCINA }, (_, i) => pedido(`P-${i + 1}`, { etapa: "cocina" }));
    const despues = avanzar([...llenos, pedido("P-10")], "P-1", AHORA, false);
    expect(despues.find((p) => p.id === "P-10")?.etapa).toBe("cola");
    expect(enCocina(llenarCocina(despues, "apopa", AHORA), "apopa")).toBe(CAPACIDAD_COCINA);
  });

  it("un pedido programado espera su hora aunque haya lugar", () => {
    const prog = pedido("P-20", { programado: new Date(AHORA + 5 * 3_600_000).toISOString() });
    const ya = pedido("P-21", { recibido: new Date(AHORA + 1000).toISOString() });
    const ps = [prog, ya];
    expect(colaDe(ps, "apopa", AHORA).map((p) => p.id)).toEqual(["P-21", "P-20"]);
    expect(llenarCocina(ps, "apopa", AHORA).find((p) => p.id === "P-20")?.etapa).toBe("cola");
    expect(esperaEstimada(prog, ps, AHORA)).toBeGreaterThan(4 * 60);
  });

  it("las colas de cada sucursal no se mezclan", () => {
    const llenos = Array.from({ length: CAPACIDAD_COCINA }, (_, i) => pedido(`P-${i + 1}`, { etapa: "cocina" }));
    const otra = pedido("P-30", { sucursalId: "lourdes" });
    expect(esperaEstimada(otra, [...llenos, otra], AHORA)).toBe(0);
  });

  it("retiro salta 'en camino'; domicilio pasa por el motorista", () => {
    expect(siguienteEtapa(pedido("P-1", { etapa: "listo", tipo: "retiro" }))).toBe("entregado");
    expect(siguienteEtapa(pedido("P-2", { etapa: "listo", tipo: "domicilio" }))).toBe("camino");
    expect(siguienteEtapa(pedido("P-3", { etapa: "entregado" }))).toBeNull();
  });

  it("un pedido entrante nace en cola con número nuevo", () => {
    const ps = semillaPedidos(AHORA);
    const p = pedidoEntrante(ps, AHORA);
    expect(p.etapa).toBe("cola");
    expect(ps.some((x) => x.numero === p.numero)).toBe(false);
  });
});

describe("La Campana · agenda", () => {
  it("cuenta solo las citas que se traslapan y no las canceladas", () => {
    const citas = semillaAgenda(AHORA);
    const c = citas.find((x) => x.titulo === "Almuerzo familiar")!;
    const ocupadas = ocupacion(citas, c.sucursalId, new Date(c.inicio), 30);
    expect(ocupadas).toBeGreaterThanOrEqual(c.personas);
    const cancelada = citas.find((x) => x.estado === "cancelada")!;
    expect(ocupacion(citas, cancelada.sucursalId, new Date(cancelada.inicio), 30)).toBe(0);
  });
});
