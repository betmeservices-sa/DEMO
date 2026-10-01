// El costo de cada conversación del agente (lib/costos-conversacion.ts).
import { describe, expect, it } from "vitest";
import {
  ARRANQUE_DEL_AGENTE,
  canalDeChat,
  costosPorConversacion,
  resumenDeCostos,
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

describe("una conversación: sus respuestas, sus mensajes y su costo", () => {
  it("suma el costo de sus respuestas y cuenta los mensajes de cada quien", () => {
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
    expect(f.respuestas).toBe(2);
    expect(f.mensajes).toEqual({ huesped: 2, agente: 3, equipo: 1, total: 6 });
    expect(f.costo).toBe(0.005);
    expect(f.porMensajeAgente).toBeCloseTo(0.005 / 3, 9);
    expect(f.porMensaje).toBeCloseTo(0.005 / 6, 9);
  });

  it("el mensaje que disparó la conversación cuenta aunque llegue antes de la respuesta, hasta 2 horas antes", () => {
    const filas = costosPorConversacion(
      [R("a", "2026-09-29T15:00:00Z", 0.001)],
      [M("a", "2026-09-29T13:30:00Z", "huesped"), M("a", "2026-09-29T12:00:00Z", "huesped")],
      DESDE,
    );
    // El de 1 h 30 antes es suyo; el de 3 h antes no es de ninguna.
    expect(filas[0]!.mensajes.huesped).toBe(1);
  });

  it("pasadas las 24 h es otra conversación, con sus propios mensajes y costo", () => {
    const filas = costosPorConversacion(
      [R("a", "2026-09-29T15:00:00Z", 0.001), R("a", "2026-09-30T16:00:00Z", 0.004)],
      [M("a", "2026-09-29T15:00:00Z", "agente"), M("a", "2026-09-30T15:55:00Z", "huesped"), M("a", "2026-09-30T16:00:00Z", "agente")],
      DESDE,
    );
    expect(filas.map((f) => [f.inicio, f.costo, f.mensajes.total])).toEqual([
      ["2026-09-30T16:00:00.000Z", 0.004, 2],
      ["2026-09-29T15:00:00.000Z", 0.001, 1],
    ]);
  });

  it("un mensaje dentro de las 24 h de una sesión es de esa, aunque la siguiente arranque cerca", () => {
    // Sesión 1 a las 15:00 del 29 (vence 15:00 del 30); sesión 2 a las 15:30 del 30.
    const filas = costosPorConversacion(
      [R("a", "2026-09-29T15:00:00Z", 0.001), R("a", "2026-09-30T15:30:00Z", 0.001)],
      [M("a", "2026-09-30T14:50:00Z", "huesped"), M("a", "2026-09-30T15:10:00Z", "huesped")],
      DESDE,
    );
    const [segunda, primera] = filas;
    expect(primera!.mensajes.huesped).toBe(1); // 14:50, todavía en la primera
    expect(segunda!.mensajes.huesped).toBe(1); // 15:10, ya fuera: dispara la segunda
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

describe("el resumen", () => {
  it("suma todo y saca los promedios", () => {
    const filas = costosPorConversacion(
      [R("a", "2026-09-29T15:00:00Z", 0.002), R("b", "2026-09-29T16:00:00Z", 0.004)],
      [M("a", "2026-09-29T15:00:00Z", "agente"), M("b", "2026-09-29T16:00:00Z", "agente"), M("b", "2026-09-29T15:59:00Z", "huesped")],
      DESDE,
    );
    const r = resumenDeCostos(filas);
    expect(r.conversaciones).toBe(2);
    expect(r.costo).toBe(0.006);
    expect(r.mensajes).toEqual({ huesped: 1, agente: 2, equipo: 0, total: 3 });
    expect(r.porConversacion).toBeCloseTo(0.003, 9);
    expect(r.porMensajeAgente).toBeCloseTo(0.003, 9);
    expect(r.porMensaje).toBeCloseTo(0.002, 9);
  });

  it("sin conversaciones no hay promedios", () => {
    const r = resumenDeCostos([]);
    expect([r.porConversacion, r.porMensajeAgente, r.porMensaje]).toEqual([null, null, null]);
  });
});
