// El costo de cada conversación del agente (lib/costos-conversacion.ts).
// Solo cuentan los mensajes del agente; el resto del chat no entra.
import { describe, expect, it } from "vitest";
import {
  ARRANQUE_DEL_AGENTE,
  canalDeChat,
  costosPorConversacion,
  resumenDeCostos,
  resumenPorCanal,
  type MensajeDelChat,
  type RespuestaConCosto,
} from "@/lib/costos-conversacion";

const R = (chat: string, ts: string, costo: number): RespuestaConCosto => ({ chat, ts, costo });
const M = (chat: string, ts: string, quien: MensajeDelChat["quien"], nombre?: string): MensajeDelChat => ({ chat, ts, quien, nombre });
const DESDE = "2026-09-28T16:07:00.000Z";

describe("Yali se reporta desde que Sofía arrancó con luna", () => {
  it("el lunes 28 de septiembre a las 10:07 a. m. de El Salvador", () => {
    expect(ARRANQUE_DEL_AGENTE.yaly!.desde).toBe(DESDE);
  });
});

describe("una conversación: los mensajes de Sofía y su costo", () => {
  it("suma el costo de sus respuestas y cuenta solo los mensajes del agente", () => {
    const filas = costosPorConversacion(
      [R("50370000001", "2026-09-29T15:00:10Z", 0.002), R("50370000001", "2026-09-29T15:05:00Z", 0.003)],
      [
        M("50370000001", "2026-09-29T14:59:50Z", "huesped", "Ana"),
        M("50370000001", "2026-09-29T15:00:10Z", "agente"),
        M("50370000001", "2026-09-29T15:04:40Z", "huesped", "Ana López"),
        M("50370000001", "2026-09-29T15:05:00Z", "agente"),
        M("50370000001", "2026-09-29T15:05:01Z", "agente"),
        M("50370000001", "2026-09-29T16:00:00Z", "equipo"),
      ],
      DESDE,
    );
    expect(filas).toHaveLength(1);
    const f = filas[0]!;
    expect(f.inicio).toBe("2026-09-29T15:00:10.000Z");
    expect(f.canal).toBe("whatsapp");
    expect(f.nombre).toBe("Ana López");
    expect(f.mensajes).toBe(3);
    expect(f.costo).toBe(0.005);
    expect(f.porMensaje).toBeCloseTo(0.005 / 3, 9);
  });

  it("lo que Sofía mandó justo antes de la primera respuesta con modelo también es suyo (el menú de hotel)", () => {
    const filas = costosPorConversacion(
      [R("a", "2026-09-29T15:00:00Z", 0.001)],
      [M("a", "2026-09-29T14:58:00Z", "agente"), M("a", "2026-09-29T14:59:59Z", "agente"), M("a", "2026-09-29T15:00:00Z", "agente")],
      DESDE,
    );
    expect(filas[0]!.mensajes).toBe(3);
  });

  it("pasadas las 24 h es otra conversación, con sus propios mensajes y costo", () => {
    const filas = costosPorConversacion(
      [R("a", "2026-09-29T15:00:00Z", 0.001), R("a", "2026-09-30T16:00:00Z", 0.004)],
      [M("a", "2026-09-29T15:00:00Z", "agente"), M("a", "2026-09-30T16:00:00Z", "agente"), M("a", "2026-09-30T16:01:00Z", "agente")],
      DESDE,
    );
    expect(filas.map((f) => [f.inicio, f.costo, f.mensajes])).toEqual([
      ["2026-09-30T16:00:00.000Z", 0.004, 2],
      ["2026-09-29T15:00:00.000Z", 0.001, 1],
    ]);
  });

  it("si Sofía no mandó mensajes no hay costo por mensaje", () => {
    const [f] = costosPorConversacion([R("a", "2026-09-29T15:00:00Z", 0.001)], [], DESDE);
    expect(f!.mensajes).toBe(0);
    expect(f!.porMensaje).toBeNull();
  });

  it("no cuenta las conversaciones que arrancaron antes del arranque del agente", () => {
    const filas = costosPorConversacion(
      [R("a", "2026-09-28T15:00:00Z", 0.01), R("a", "2026-09-28T17:00:00Z", 0.002), R("b", "2026-09-28T17:00:00Z", 0.002)],
      [],
      DESDE,
    );
    // La de "a" arrancó a las 9:00 SV (antes de luna) y sigue abierta a las 11:00: no es nueva.
    expect(filas.map((f) => f.chat)).toEqual(["b"]);
  });

  it("los chats de redes se reconocen por su canal", () => {
    expect(canalDeChat("instagram:123")).toBe("instagram");
    expect(canalDeChat("facebook:456")).toBe("facebook");
    expect(canalDeChat("50370000001")).toBe("whatsapp");
  });
});

describe("el resumen general y por canal", () => {
  const filas = costosPorConversacion(
    [
      R("50370000001", "2026-09-29T15:00:00Z", 0.002),
      R("50370000002", "2026-09-29T16:00:00Z", 0.004),
      R("instagram:9", "2026-09-29T17:00:00Z", 0.003),
    ],
    [
      M("50370000001", "2026-09-29T15:00:00Z", "agente"),
      M("50370000002", "2026-09-29T16:00:00Z", "agente"),
      M("50370000002", "2026-09-29T16:01:00Z", "agente"),
      M("instagram:9", "2026-09-29T17:00:00Z", "agente"),
    ],
    DESDE,
  );

  it("el general suma todo y saca los promedios", () => {
    const r = resumenDeCostos(filas);
    expect(r.conversaciones).toBe(3);
    expect(r.mensajes).toBe(4);
    expect(r.costo).toBe(0.009);
    expect(r.porConversacion).toBeCloseTo(0.003, 9);
    expect(r.porMensaje).toBeCloseTo(0.00225, 9);
  });

  it("cada canal con lo suyo, del que más consume al que menos, y su parte del costo", () => {
    const c = resumenPorCanal(filas);
    expect(c.map((x) => x.canal)).toEqual(["whatsapp", "instagram"]);
    expect(c[0]).toMatchObject({ conversaciones: 2, mensajes: 3, costo: 0.006 });
    expect(c[0]!.porConversacion).toBeCloseTo(0.003, 9);
    expect(c[0]!.porMensaje).toBeCloseTo(0.002, 9);
    expect(c[0]!.parteDelCosto).toBeCloseTo(2 / 3, 9);
    expect(c[1]).toMatchObject({ conversaciones: 1, mensajes: 1, costo: 0.003 });
    expect(c[1]!.parteDelCosto).toBeCloseTo(1 / 3, 9);
  });

  it("sin conversaciones no hay promedios ni canales", () => {
    const r = resumenDeCostos([]);
    expect([r.porConversacion, r.porMensaje]).toEqual([null, null]);
    expect(resumenPorCanal([])).toEqual([]);
  });
});
