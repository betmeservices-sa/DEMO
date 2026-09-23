// Perfiles por fecha de ingreso (hora de El Salvador), el link de Vocaroo y
// la decision Aprobado / Rechazado sobre el candidato.
import { describe, expect, it } from "vitest";
import { embedVocaroo, vocarooId } from "@/lib/talento/audio";
import { cambiarMotivo, decidir, deshacerDecision, destinoAprobado, estadoRevision } from "@/lib/talento/decision";
import { esNuevo, ordenarPerfiles, pasaFecha } from "@/lib/talento/perfiles";
import { reducirTalento } from "@/lib/talento/operaciones";
import { sembrarTalento } from "@/lib/talento/seed";

const AHORA = new Date("2026-09-23T16:00:00Z"); // miercoles 10:00 am en El Salvador
const s = sembrarTalento(AHORA);
const TS = AHORA.toISOString();

describe("Vocaroo", () => {
  it("entiende las dos formas del link y la del embed", () => {
    expect(vocarooId("https://vocaroo.com/1hQeB7vFzK2m")).toBe("1hQeB7vFzK2m");
    expect(vocarooId("https://voca.ro/12nYt6RzLx4W")).toBe("12nYt6RzLx4W");
    expect(vocarooId("voca.ro/12nYt6RzLx4W")).toBe("12nYt6RzLx4W");
    expect(vocarooId("www.vocaroo.com/1cPa8Wq3JmVd/")).toBe("1cPa8Wq3JmVd");
    expect(vocarooId(" https://vocaroo.com/embed/1cPa8Wq3JmVd?autoplay=0 ")).toBe("1cPa8Wq3JmVd");
  });
  it("rechaza lo que no es Vocaroo", () => {
    expect(vocarooId("https://youtube.com/watch?v=abc123")).toBeNull();
    expect(vocarooId("https://vocaroo.com/")).toBeNull();
    expect(vocarooId("https://vocaroo.com.evil.com/1hQeB7vFzK2m")).toBeNull();
    expect(vocarooId("")).toBeNull();
    expect(vocarooId(undefined)).toBeNull();
  });
  it("arma el embed", () => {
    expect(embedVocaroo("1hQeB7vFzK2m")).toBe("https://vocaroo.com/embed/1hQeB7vFzK2m?autoplay=0");
  });
  it("la semilla trae perfiles con audio y otros sin", () => {
    const con = s.candidatos.filter((c) => vocarooId(c.audioUrl));
    expect(con.length).toBeGreaterThan(10);
    expect(con.length).toBeLessThan(s.candidatos.length);
    expect(con.some((c) => c.audioUrl!.includes("voca.ro"))).toBe(true);
    expect(con.some((c) => c.audioUrl!.includes("vocaroo.com"))).toBe(true);
  });
});

describe("fecha de ingreso", () => {
  const c = (iso: string) => ({ creado: iso });
  it("hoy es el día de El Salvador, no el de UTC", () => {
    // 23 sep 01:00 UTC = 22 sep 7:00 pm en El Salvador
    expect(pasaFecha(c("2026-09-23T01:00:00Z"), { tipo: "hoy" }, AHORA)).toBe(false);
    expect(pasaFecha(c("2026-09-23T06:30:00Z"), { tipo: "hoy" }, AHORA)).toBe(true);
  });
  it("últimos 7 y 30 días cuentan hoy", () => {
    expect(pasaFecha(c("2026-09-17T15:00:00Z"), { tipo: "7" }, AHORA)).toBe(true);
    expect(pasaFecha(c("2026-09-16T15:00:00Z"), { tipo: "7" }, AHORA)).toBe(false);
    expect(pasaFecha(c("2026-08-25T15:00:00Z"), { tipo: "30" }, AHORA)).toBe(true);
    expect(pasaFecha(c("2026-08-24T15:00:00Z"), { tipo: "30" }, AHORA)).toBe(false);
  });
  it("el rango incluye los dos extremos y se entiende al revés", () => {
    const f = { tipo: "rango" as const, desde: "2026-09-10", hasta: "2026-09-20" };
    expect(pasaFecha(c("2026-09-10T15:00:00Z"), f, AHORA)).toBe(true);
    expect(pasaFecha(c("2026-09-21T05:00:00Z"), f, AHORA)).toBe(true); // 20 sep 11 pm en SV
    expect(pasaFecha(c("2026-09-21T15:00:00Z"), f, AHORA)).toBe(false);
    expect(pasaFecha(c("2026-09-15T15:00:00Z"), { tipo: "rango", desde: "2026-09-20", hasta: "2026-09-10" }, AHORA)).toBe(true);
    expect(pasaFecha(c("2026-09-01T15:00:00Z"), { tipo: "rango", desde: "2026-09-10" }, AHORA)).toBe(false);
  });
  it("nuevo es de las últimas 24 horas", () => {
    expect(esNuevo(c("2026-09-22T17:00:00Z"), AHORA)).toBe(true);
    expect(esNuevo(c("2026-09-22T15:00:00Z"), AHORA)).toBe(false);
    expect(s.candidatos.filter((x) => esNuevo(x, AHORA)).map((x) => x.id).sort()).toEqual(["c33", "c34"]);
  });
  it("ordena por fecha en los dos sentidos, por nombre y por match", () => {
    const l = s.candidatos.map((x, i) => ({ c: x, match: i }));
    const rec = ordenarPerfiles(l, "recientes").map((x) => x.c.creado);
    expect(rec).toEqual([...rec].sort().reverse());
    const ant = ordenarPerfiles(l, "antiguos").map((x) => x.c.creado);
    expect(ant).toEqual([...ant].sort());
    expect(ordenarPerfiles(l, "nombre")[0].c.nombre).toBe("Alejandra Cruz");
    expect(ordenarPerfiles(l, "match")[0].match).toBe(l.length - 1);
    expect(l[0].c.id).toBe("c01"); // no toca la lista original
  });
});

describe("Aprobado / Rechazado", () => {
  const post = (st: typeof s, id: string) => st.postulaciones.find((p) => p.id === id)!;
  const cand = (id: string) => s.candidatos.find((c) => c.id === id)!;

  it("la semilla deja pendientes a los del banco y a los que siguen en Nuevo", () => {
    expect(estadoRevision(cand("c31"))).toBe("pendiente");
    expect(estadoRevision(cand("c04"))).toBe("pendiente");
    expect(estadoRevision(cand("c02"))).toBe("aprobado");
    expect(estadoRevision(cand("c05"))).toBe("aprobado"); // pasó filtrado antes del descarte
    expect(estadoRevision(cand("c25"))).toBe("rechazado");
  });

  it("aprobado desde Nuevo pasa a Filtrado", () => {
    expect(destinoAprobado(s, "c04")).toEqual({ tipo: "mover", postulacionId: "p04", vacanteId: "v1", etapa: "filtrado" });
    const a = decidir(s, "c04", "aprobado", "s3", TS, "pNueva");
    expect(post(a, "p04").etapa).toBe("filtrado");
    expect(a.candidatos.find((c) => c.id === "c04")!.decision).toMatchObject({ resultado: "aprobado", por: "s3", ts: TS });
  });

  it("aprobado sin vacante entra a su mejor vacante abierta, ya en Filtrado", () => {
    expect(destinoAprobado(s, "c29")).toEqual({ tipo: "crear", vacanteId: "v5", etapa: "filtrado" });
    const a = decidir(s, "c29", "aprobado", "s3", TS, "pNueva");
    expect(post(a, "pNueva")).toMatchObject({ candidatoId: "c29", vacanteId: "v5", etapa: "filtrado" });
  });

  it("nunca lo lleva a Contratado", () => {
    expect(destinoAprobado(s, "c06").tipo).toBe("nada"); // c06 va en oferta
  });

  it("rechazado lo descarta sin motivo prellenado y el motivo se edita", () => {
    const a = decidir(s, "c04", "rechazado", "s3", TS, "pNueva");
    expect(post(a, "p04").etapa).toBe("descartado");
    expect(post(a, "p04").motivoDescarte).toBeUndefined();
    const b = cambiarMotivo(a, "c04", "No se presentó a la entrevista");
    expect(post(b, "p04").motivoDescarte).toBe("No se presentó a la entrevista");
    expect(b.candidatos.find((c) => c.id === "c04")!.decision!.motivo).toBe("No se presentó a la entrevista");
  });

  it("deshacer deja el pipeline como estaba", () => {
    for (const [cid, res] of [["c04", "aprobado"], ["c29", "aprobado"], ["c04", "rechazado"]] as const) {
      const a = deshacerDecision(decidir(s, cid, res, "s3", TS, "pNueva"), cid);
      expect(a.postulaciones).toEqual(s.postulaciones);
      expect(a.candidatos.find((c) => c.id === cid)!.decision).toBeUndefined();
    }
  });

  it("deshacer no pisa lo que se movió a mano después", () => {
    const a = decidir(s, "c04", "aprobado", "s3", TS, "pNueva");
    const b = reducirTalento(a, { type: "MOVER", postulacionId: "p04", etapa: "entrevista", ts: "2026-09-23T17:00:00Z" });
    expect(post(deshacerDecision(b, "c04"), "p04").etapa).toBe("entrevista");
  });

  it("el reducer despacha decidir y deshacer", () => {
    const a = reducirTalento(s, { type: "DECIDIR", candidatoId: "c16", resultado: "aprobado", por: "s3", ts: TS, idNueva: "x" });
    expect(post(a, "p16").etapa).toBe("filtrado");
    expect(post(reducirTalento(a, { type: "DECISION_DESHACER", candidatoId: "c16" }), "p16").etapa).toBe("nuevo");
  });
});
