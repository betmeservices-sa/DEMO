// El dashboard del laboratorio, con un caso armado a mano. Cada número de abajo
// se puede contar mirando el fixture.
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getSupabase: () => null, todosLosClientes: () => [] }));

import { armarPanelLab, categoriaDe, CATEGORIAS, esDePrueba, type EntradaPanelLab, type MensajeLab } from "@/lib/lab-panel";
import { TEMAS_LAB } from "@/lib/consultorio/lab-kb-negocio";

// Martes 10 de noviembre de 2026, 3:00 p.m. en El Salvador.
const AHORA = new Date("2026-11-10T15:00:00-06:00");
const A = "50370000001";
const B = "50370000002";
const C = "50370000003";
const E = "50370000005";
const PRUEBA = "50375391721";

let n = 0;
const msg = (from: string, cuando: string, direccion: "in" | "out", extra: Partial<MensajeLab> = {}): MensajeLab => ({
  from,
  ts: new Date(cuando).toISOString(),
  direccion,
  waId: `w${++n}`,
  texto: "hola",
  ...extra,
});

function entrada(): EntradaPanelLab {
  n = 0;
  const mensajes: MensajeLab[] = [
    // A ya había escrito el 1/11: en los 7 días no es nueva.
    msg(A, "2026-11-01T09:00:00-06:00", "in"),
    msg(A, "2026-11-09T10:00:00-06:00", "in"),
    msg(A, "2026-11-09T10:00:20-06:00", "out", { waId: "vA1" }),
    msg(A, "2026-11-09T10:05:00-06:00", "in"),
    msg(A, "2026-11-09T10:05:30-06:00", "out", { waId: "vA2" }),
    // B manda una foto; contesta Valeria y después Verónica desde el panel.
    msg(B, "2026-11-10T08:00:00-06:00", "in", { media: "image", texto: "[imagen]" }),
    msg(B, "2026-11-10T08:00:40-06:00", "out", { waId: "vB1" }),
    msg(B, "2026-11-10T09:00:00-06:00", "out", { staffNombre: "Verónica" }),
    // C escribe un domingo a las 10 p.m.: fuera de horario. Le abre un caso.
    msg(C, "2026-11-08T22:00:00-06:00", "in"),
    msg(C, "2026-11-08T22:00:10-06:00", "out", { waId: "vC1" }),
    // El número de pruebas de la agencia no cuenta.
    msg(PRUEBA, "2026-11-10T11:00:00-06:00", "in"),
    msg(PRUEBA, "2026-11-10T11:00:05-06:00", "out", { waId: "vP1" }),
    // E escribió hace 10 minutos y nadie le contestó.
    msg(E, "2026-11-10T14:50:00-06:00", "in", { nombre: "Ana", texto: "¿a qué hora cierran?" }),
  ];
  return {
    mensajes,
    idsValeria: new Set(["vA1", "vA2", "vB1", "vC1", "vP1"]),
    tickets: [
      { estado: "asignado", tipo: "resultados", asignadoA: "lab-veronica", creado: "2026-11-08T22:01:00-06:00", telefono: C },
      { estado: "abierto", tipo: "cotizacion", creado: "2026-11-10T11:01:00-06:00", telefono: PRUEBA },
    ],
    busquedas: [
      { from: A, consulta: "hemograma precio", creado: "2026-11-09T10:00:10-06:00", resultados: [{ tipo: "examen", id: "lab-hemograma", nombre: "Hemograma completo", score: 1 }] },
      { from: B, consulta: "mapfre", creado: "2026-11-10T08:00:30-06:00", resultados: [{ tipo: "convenio", id: "seg-mapfre", nombre: "MAPFRE", score: 1 }] },
      { from: C, consulta: "estado de resultados", creado: "2026-11-08T22:00:05-06:00", resultados: [{ tipo: "tema", id: "tema-estado-resultado", nombre: "Estado de mis resultados", score: 0.9 }] },
      { from: E, consulta: "Cigna", creado: "2026-11-10T14:50:30-06:00", resultados: [] },
      { from: PRUEBA, consulta: "glucosa", creado: "2026-11-10T11:00:02-06:00", resultados: [{ tipo: "examen", id: "lab-glucosa", nombre: "Glucosa", score: 1 }] },
    ],
  };
}

describe("el dashboard del lab, últimos 7 días", () => {
  const p = armarPanelLab(entrada(), "7d", AHORA);

  it("cuenta conversaciones, nuevas y mensajes, sin el número de pruebas", () => {
    expect(p.desde).toBe("2026-11-04");
    expect(p.resumen.conversaciones).toBe(4); // A, B, C, E
    expect(p.resumen.nuevas).toBe(3); // B, C, E
    expect(p.resumen.mensajesRecibidos).toBe(5);
    expect(p.resumen.fotos).toBe(1);
  });

  it("separa lo que contestó Valeria de lo que contestó el equipo", () => {
    expect(p.resumen.respuestasValeria).toBe(4);
    expect(p.resumen.respuestasEquipo).toBe(1);
    expect(p.resumen.conversacionesConEquipo).toBe(1);
    expect(p.equipo).toEqual([{ nombre: "Verónica", respuestas: 1 }]);
    // Solo A: B tuvo al equipo, C tiene caso y a E nadie le contestó.
    expect(p.resumen.resueltasSoloValeria).toBe(1);
    expect(p.resumen.pctSoloValeria).toBe(25);
  });

  it("mide lo que tarda Valeria en contestar", () => {
    // 20 s, 30 s, 40 s y 10 s.
    expect(p.resumen.respuestaMedianaSeg).toBe(25);
    expect(p.resumen.respuestaP90Seg).toBe(40);
  });

  it("cuenta lo que entró con el laboratorio cerrado", () => {
    expect(p.resumen.fueraDeHorario).toBe(1); // el domingo a las 10 p.m.
    expect(p.resumen.pctFueraDeHorario).toBe(20);
  });

  it("arma los días, los días con más mensajes, la semana y la hora", () => {
    expect(p.porDia.map((d) => d.dia)).toEqual([
      "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10",
    ]);
    expect(p.porDia.at(-1)).toMatchObject({ conversaciones: 2, recibidos: 2, valeria: 1, equipo: 1 });
    // Empate en mensajes: gana el día con más conversaciones.
    expect(p.topDias.map((d) => d.dia)).toEqual(["2026-11-10", "2026-11-09", "2026-11-08"]);
    expect(p.porDiaSemana.find((d) => d.dia === "lun")!.recibidos).toBe(2);
    expect(p.porDiaSemana.find((d) => d.dia === "dom")!.recibidos).toBe(1);
    expect(p.calor[6][22]).toBe(1); // domingo, 10 p.m.
  });

  it("saca los temas de lo que Valeria buscó en la base", () => {
    const cat = Object.fromEntries(p.temas.categorias.map((c) => [c.id, c.conversaciones]));
    expect(cat).toEqual({ precios: 1, seguros: 1, resultados: 1 });
    expect(p.temas.examenes[0]).toMatchObject({ label: "Hemograma completo", conversaciones: 1 });
    expect(p.temas.seguros[0]).toMatchObject({ label: "MAPFRE" });
    expect(p.temas.sinResultado).toEqual([{ consulta: "Cigna", veces: 1 }]);
    expect(p.temas.busquedas).toBe(4);
  });

  it("los casos, sin el del número de pruebas", () => {
    expect(p.casos.creados).toBe(1);
    expect(p.casos.porTipo).toEqual([{ id: "resultados", label: "Resultados", n: 1 }]);
    expect(p.casos.porPersona).toEqual([{ id: "lab-veronica", nombre: "Verónica", asignados: 1, resueltos: 0 }]);
  });

  it("quién está esperando respuesta ahora", () => {
    expect(p.esperan).toEqual([{ from: E, nombre: "Ana", texto: "¿a qué hora cierran?", minutos: 10 }]);
  });
});

describe("hoy y todo", () => {
  it("hoy: solo lo de hoy, contra ayer", () => {
    const p = armarPanelLab(entrada(), "hoy", AHORA);
    expect(p.resumen.conversaciones).toBe(2); // B y E
    expect(p.resumen.deltaConversacionesPct).toBe(100); // ayer solo A
    expect(p.porDia).toHaveLength(1);
  });

  it("todo: desde el primer mensaje, sin comparación", () => {
    const p = armarPanelLab(entrada(), "todo", AHORA);
    expect(p.desde).toBe("2026-11-01");
    expect(p.porDia).toHaveLength(10);
    expect(p.resumen.deltaConversacionesPct).toBeNull();
  });

  it("sin mensajes no se rompe", () => {
    const p = armarPanelLab({ mensajes: [], idsValeria: new Set(), tickets: [], busquedas: [] }, "7d", AHORA);
    expect(p.resumen.conversaciones).toBe(0);
    expect(p.resumen.pctSoloValeria).toBeNull();
    expect(p.temas.desde).toBeNull();
  });
});

describe("las categorías de los temas", () => {
  it("cada tema de la base del lab tiene su categoría", () => {
    // Si se agrega un tema a la base, hay que decir en qué categoría cuenta.
    const sueltos = TEMAS_LAB.filter((t) => categoriaDe({ tipo: "tema", id: t.id }) === "otros").map((t) => t.id);
    expect(sueltos).toEqual(["tema-encuesta"]);
  });

  it("exámenes, seguros y sucursales van a la suya", () => {
    expect(categoriaDe({ tipo: "examen", id: "x" })).toBe("precios");
    expect(categoriaDe({ tipo: "convenio", id: "x" })).toBe("seguros");
    expect(categoriaDe({ tipo: "sucursal", id: "x" })).toBe("horarios");
    expect(CATEGORIAS.map((c) => c.id)).toContain("otros");
  });

  it("el número de pruebas se reconoce con o sin código de país", () => {
    expect(esDePrueba("50375391721")).toBe(true);
    expect(esDePrueba("7539-1721")).toBe(true);
    expect(esDePrueba("50370000001")).toBe(false);
  });
});
