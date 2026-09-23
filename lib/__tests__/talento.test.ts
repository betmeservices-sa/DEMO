// Reclutamiento de BetMe: el match, el lector de texto libre, las metricas y
// el reducer. Todo es puro y sin red: el match NO llama a ningun modelo.
import { describe, expect, it } from "vitest";
import { calcularMatch, nivelDeScore, PESOS, topCandidatos } from "@/lib/talento/matching";
import { leerCv, leerVacante, horarioEn, inglesEn, discEn } from "@/lib/talento/lector";
import { aceptacionDeOfertas, colocados, embudo, porFuente, tiempoPromedioContratacion } from "@/lib/talento/metricas";
import { desplazar, reducirTalento } from "@/lib/talento/operaciones";
import { sembrarTalento } from "@/lib/talento/seed";
import { diaSv, horaSv, isoDesdeSv, lunesDe } from "@/lib/talento/fechas";
import { ETAPAS, SKILL_POR_ID } from "@/lib/talento/catalogo";
import type { Candidato, Requisitos } from "@/lib/talento/tipos";

const AHORA = new Date("2026-09-23T16:00:00Z"); // miercoles 10:00 en El Salvador
const s = sembrarTalento(AHORA);

const base: Candidato = s.candidatos.find((c) => c.id === "c01")!;
const req: Requisitos = s.vacantes.find((v) => v.id === "v1")!.requisitos;

describe("match determinista", () => {
  it("los pesos suman 100", () => {
    expect(Object.values(PESOS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("quien cumple todo saca 100 y no tiene faltas", () => {
    const ideal: Candidato = {
      ...base,
      skills: [...req.skills, ...req.deseables],
      ingles: "C2",
      aniosExperiencia: 10,
      pretension: 900,
      horarios: ["este"],
      disc: { primario: "S" },
    };
    const m = calcularMatch(ideal, req);
    expect(m.score).toBe(100);
    expect(m.falta).toEqual([]);
  });

  it("explica lo que falta, criterio por criterio", () => {
    const flojo: Candidato = { ...base, skills: ["agenda"], ingles: "B1", aniosExperiencia: 1, pretension: 1500, horarios: ["pacifico"], disc: undefined };
    const m = calcularMatch(flojo, req);
    expect(m.score).toBeLessThan(40);
    expect(m.falta.join(" ")).toContain("GoHighLevel");
    expect(m.falta.join(" ")).toContain("Inglés C1 (tiene B1)");
    expect(m.falta.join(" ")).toContain("sobre el tope");
    expect(m.falta).toContain("Sin evaluación DISC");
  });

  it("un nivel de inglés abajo da la mitad; dos, nada", () => {
    const b2 = calcularMatch({ ...base, ingles: "B2" }, req).detalle.find((d) => d.criterio === "ingles")!;
    const b1 = calcularMatch({ ...base, ingles: "B1" }, req).detalle.find((d) => d.criterio === "ingles")!;
    expect(b2.puntos).toBe(PESOS.ingles / 2);
    expect(b1.puntos).toBe(0);
  });

  it("es estable: mismo banco, mismo orden", () => {
    const a = topCandidatos({ requisitos: req }, s.candidatos).map((m) => m.candidatoId);
    const b = topCandidatos({ requisitos: req }, [...s.candidatos].reverse()).map((m) => m.candidatoId);
    expect(a).toEqual(b);
  });

  it("para la vacante del broker, las asistentes ejecutivas encabezan", () => {
    const top = topCandidatos({ requisitos: req }, s.candidatos, { limite: 4 }).map((m) => m.candidatoId);
    expect(top).toContain("c31");
    expect(top).toContain("c02");
    expect(top).not.toContain("c19"); // el analista de datos no tiene nada que hacer ahi
  });

  it("para el Business Analyst sale el perfil de datos que aun no esta en el pipeline", () => {
    const ba = s.vacantes.find((v) => v.id === "v5")!;
    const top = topCandidatos(ba, s.candidatos, { limite: 3 });
    expect(top[0].candidatoId).toBe("c29");
    expect(nivelDeScore(top[0].score)).toBe("fuerte");
  });

  it("en una vacante híbrida pesa vivir cerca de la oficina", () => {
    const rec = s.vacantes.find((v) => v.id === "v6")!.requisitos;
    const cerca = calcularMatch({ ...base, ubicacion: { pais: "SV", departamento: "San Salvador" } }, rec);
    const vecino = calcularMatch({ ...base, ubicacion: { pais: "SV", departamento: "La Libertad" } }, rec);
    const lejos = calcularMatch({ ...base, ubicacion: { pais: "SV", departamento: "San Miguel" } }, rec);
    const u = (m: typeof cerca) => m.detalle.find((d) => d.criterio === "ubicacion")!.puntos;
    expect(u(cerca)).toBe(5);
    expect(u(vecino)).toBe(3);
    expect(u(lejos)).toBe(0);
  });

  it("excluye a quien se le pida (colocados o ya en la vacante)", () => {
    const top = topCandidatos({ requisitos: req }, s.candidatos, { excluir: new Set(["c31"]) });
    expect(top.map((m) => m.candidatoId)).not.toContain("c31");
  });
});

describe("lector de texto libre", () => {
  const texto = `Executive Assistant
Cliente: Firma de abogados en Chicago
Requisitos: 3+ años de experiencia, inglés C1, manejo de agenda e inbox, Google Workspace y Clio.
Remoto desde El Salvador o Guatemala, tiempo completo en hora Central (CST). Hasta $1,150 al mes.
Deseable: Canva y herramientas de IA. Perfil DISC S o C.`;

  it("saca título, cliente y requisitos", () => {
    const l = leerVacante(texto);
    expect(l.titulo).toBe("Executive Assistant");
    expect(l.cliente).toBe("Firma de abogados en Chicago");
    expect(l.requisitos.experiencia).toBe(3);
    expect(l.requisitos.ingles).toBe("C1");
    expect(l.requisitos.salarioMax).toBe(1150);
    expect(l.requisitos.horario).toBe("central");
    expect(l.requisitos.jornada).toBe("completo");
    expect(l.requisitos.modalidad).toBe("remoto");
    expect(l.requisitos.paises).toEqual(["SV", "GT"]);
    expect(l.requisitos.disc).toEqual(["S", "C"]);
  });

  it("separa requeridas de deseables", () => {
    const l = leerVacante(texto);
    expect(l.requisitos.skills).toEqual(expect.arrayContaining(["agenda", "correo", "workspace", "clio"]));
    expect(l.requisitos.deseables).toEqual(expect.arrayContaining(["canva", "ia"]));
    expect(l.requisitos.skills).not.toContain("canva");
  });

  it("no confunde palabras comunes con horarios ni con niveles de inglés", () => {
    expect(horarioEn("gestión de proyectos, este puesto es estable")).toBeNull();
    expect(horarioEn("horario EST")).toBe("este");
    expect(horarioEn("gestión de proyectos estable")).toBeNull();
    expect(inglesEn("Excel avanzado")).toBeNull();
    expect(inglesEn("español nativo")).toBeNull();
    expect(discEn("horario estable")).toEqual([]);
  });

  it("lee un CV pegado", () => {
    const cv = `Karen Alfaro
karen.alfaro@gmail.com · +503 7555 1234
Soyapango, San Salvador
Virtual Assistant con 4 años de experiencia. Inglés avanzado.
Manejo de agenda, correo electrónico, Canva y GoHighLevel. Pretensión: $950.`;
    const l = leerCv(cv);
    expect(l.nombre).toBe("Karen Alfaro");
    expect(l.correo).toBe("karen.alfaro@gmail.com");
    expect(l.departamento).toBe("San Salvador");
    expect(l.pais).toBe("SV");
    expect(l.ingles).toBe("C1");
    expect(l.anios).toBe(4);
    expect(l.pretension).toBe(950);
    expect(l.skills).toEqual(expect.arrayContaining(["agenda", "correo", "canva", "crm_ghl"]));
  });
});

describe("métricas", () => {
  it("el embudo baja o se mantiene en cada paso", () => {
    const e = embudo(s.postulaciones);
    for (let i = 1; i < e.length; i++) expect(e[i].cuantos).toBeLessThanOrEqual(e[i - 1].cuantos);
    expect(e[0].cuantos).toBe(s.postulaciones.length);
  });

  it("time to hire sale del historial", () => {
    // p07: 16 dias, p23: 22, p26: 20, p27: 21
    expect(tiempoPromedioContratacion(s.postulaciones)).toBe(20);
  });

  it("aceptación de ofertas: contratados sobre ofertas resueltas", () => {
    // Llegaron a oferta y se resolvieron: p07, p23, p26, p27 (contratados) y p28 (rechazo).
    expect(aceptacionDeOfertas(s.postulaciones)).toBe(80);
  });

  it("por fuente cuenta candidatos, entrevistados y contratados", () => {
    const f = porFuente(s);
    const total = f.reduce((n, x) => n + x.candidatos, 0);
    expect(total).toBe(s.candidatos.length);
    expect(f.find((x) => x.fuente === "carreras")!.contratados).toBeGreaterThan(0);
  });

  it("colocados son los contratados", () => {
    expect([...colocados(s.postulaciones)].sort()).toEqual(["c07", "c23", "c26", "c27"]);
  });
});

describe("reducer", () => {
  it("mover a contratado abre el onboarding una sola vez", () => {
    const a = reducirTalento(s, { type: "MOVER", postulacionId: "p06", etapa: "contratado", ts: AHORA.toISOString() });
    expect(a.postulaciones.find((p) => p.id === "p06")!.etapa).toBe("contratado");
    expect(a.onboarding.filter((o) => o.postulacionId === "p06")).toHaveLength(1);
    const b = reducirTalento(a, { type: "MOVER", postulacionId: "p06", etapa: "oferta", ts: AHORA.toISOString() });
    const c = reducirTalento(b, { type: "MOVER", postulacionId: "p06", etapa: "contratado", ts: AHORA.toISOString() });
    expect(c.onboarding.filter((o) => o.postulacionId === "p06")).toHaveLength(1);
  });

  it("mandar al pipeline no duplica a quien ya está en la vacante", () => {
    const a = reducirTalento(s, { type: "AL_PIPELINE", vacanteId: "v1", candidatoIds: ["c01", "c31"], ts: AHORA.toISOString() });
    expect(a.postulaciones.filter((p) => p.vacanteId === "v1" && p.candidatoId === "c01")).toHaveLength(1);
    expect(a.postulaciones.filter((p) => p.vacanteId === "v1" && p.candidatoId === "c31")).toHaveLength(1);
  });

  it("desplazar corre todas las fechas juntas", () => {
    const d = desplazar(s, 7);
    expect(d.sembradoEn).toBe("2026-09-30");
    const e0 = s.entrevistas[0].inicio;
    const e1 = d.entrevistas[0].inicio;
    expect(new Date(e1).getTime() - new Date(e0).getTime()).toBe(7 * 86400000);
  });
});

describe("semilla y fechas", () => {
  it("todas las referencias apuntan a algo que existe", () => {
    const cands = new Set(s.candidatos.map((c) => c.id));
    const vacs = new Set(s.vacantes.map((v) => v.id));
    const posts = new Set(s.postulaciones.map((p) => p.id));
    for (const p of s.postulaciones) {
      expect(cands.has(p.candidatoId), p.id).toBe(true);
      expect(vacs.has(p.vacanteId), p.id).toBe(true);
    }
    for (const e of s.entrevistas) expect(posts.has(e.postulacionId), e.id).toBe(true);
    for (const o of s.onboarding) expect(posts.has(o.postulacionId), o.postulacionId).toBe(true);
    for (const c of s.candidatos) for (const k of c.skills) expect(SKILL_POR_ID[k], `${c.id} ${k}`).toBeDefined();
    for (const v of s.vacantes) for (const k of [...v.requisitos.skills, ...v.requisitos.deseables]) expect(SKILL_POR_ID[k], `${v.id} ${k}`).toBeDefined();
  });

  it("las entrevistas que vienen caen en día hábil", () => {
    for (const e of s.entrevistas.filter((x) => x.estado === "programada")) {
      const [a, m, d] = diaSv(e.inicio).split("-").map(Number);
      const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
      expect(dow, e.id).toBeGreaterThanOrEqual(1);
      expect(dow, e.id).toBeLessThanOrEqual(5);
    }
  });

  it("la hora es la de El Salvador, no UTC", () => {
    const iso = isoDesdeSv("2026-09-23", 9, 30);
    expect(iso).toBe("2026-09-23T15:30:00.000Z");
    expect(horaSv(iso)).toBe("9:30 am");
    expect(diaSv("2026-09-24T03:00:00Z")).toBe("2026-09-23");
    expect(lunesDe("2026-09-27")).toBe("2026-09-21");
  });

  it("ningún texto usa guiones largos", () => {
    const todo = JSON.stringify(s);
    expect(todo.includes("—")).toBe(false);
  });

  it("las etapas llevan texto blanco encima y lo aguantan", () => {
    const lum = (hex: string) => {
      const v = hex.replace("#", "");
      const c = (i: number) => {
        const x = parseInt(v.slice(i * 2, i * 2 + 2), 16) / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * c(0) + 0.7152 * c(1) + 0.0722 * c(2);
    };
    for (const e of ETAPAS) expect((1.05) / (lum(e.color) + 0.05), e.id).toBeGreaterThanOrEqual(4.5);
  });
});
