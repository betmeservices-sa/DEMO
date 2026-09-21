// Lo que la llamada deja en el embudo de la sala de ventas.
//
// POR QUÉ SE PRUEBA. El síntoma no era un error sino un silencio: alguien
// llamaba, decía que anda viendo la Frontier, la llamada quedaba guardada, y en
// el tablero de ventas no había nada. Un caso que no aparece no se lo reclama
// nadie, así que esto tiene que estar cubierto por una prueba y no por la
// memoria de quien lo revisó una vez.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getSupabase: () => null }));

const { anotarLlamadaEnEmbudo, modeloDicho } = await import("@/lib/llamada-a-oportunidad");
const { leerOportunidad, listarOportunidades, fijarModelo } = await import("@/lib/autos-store");

const TEL = "70030001";

beforeEach(() => {
  // Los stores caen a memoria del proceso: sin esto, un caso de una prueba se
  // filtra a la siguiente.
  const g = globalThis as unknown as Record<string, unknown>;
  for (const k of Object.keys(g)) if (k.startsWith("__ventas")) g[k] = undefined;
});

describe("el modelo que se rescata de lo que se habló", () => {
  it("toma el primero que el catálogo RECONOCE, no el primero dicho", () => {
    // El agente devuelve todo lo que se habló. Guardar el primero a secas
    // dejaba el caso con una frase donde va un modelo.
    expect(modeloDicho(["un carro familiar", "la X-Trail"])).toBe("xtrail");
  });

  it("lo reconoce aunque venga con artículo: nadie dice el nombre pelado", () => {
    expect(modeloDicho(["la X-Trail"])).toBe("xtrail");
    expect(modeloDicho(["el Kicks"])).toBe("kicks");
    expect(modeloDicho(["una X-Trail e-POWER"])).toBe("xtrail-epower");
  });

  it("no adivina la versión cuando la familia tiene dos", () => {
    // "Frontier" son Doble Cabina y Cabina Simple, con $5.000 de diferencia.
    // Elegir una le inventa al caso una versión que nadie dijo.
    expect(modeloDicho(["la Frontier"])).toBe("Frontier");
  });

  it("si no reconoce ninguno guarda el primero tal cual: mejor eso que nada", () => {
    expect(modeloDicho(["algo economico"])).toBe("algo economico");
  });

  it("sin modelos, null", () => {
    expect(modeloDicho([])).toBeNull();
    expect(modeloDicho(undefined)).toBeNull();
  });
});

describe("la llamada en el embudo", () => {
  it("mete al que nunca había escrito, con modelo y con dueño", async () => {
    const r = await anotarLlamadaEnEmbudo({
      tenant: "nissan",
      telefono: TEL,
      nombre: "Ana Reyes",
      modelos: ["X-Trail"],
    });

    expect(r.modelo).toBe("xtrail");
    const caso = await leerOportunidad("nissan", TEL);
    expect(caso, "no entró al embudo").not.toBeNull();
    expect(caso?.modelo).toBe("xtrail");
    expect(caso?.nombre).toBe("Ana Reyes");
    expect(caso?.vendedor, "un caso sin dueño no lo trabaja nadie").toBeTruthy();
    expect(caso?.contactado, "la llamada ES el primer contacto").toBeTruthy();
  });

  it("le pone el precio de lista al caso que venía en cero", async () => {
    // El gerente proyecta con esa cifra. Un caso sin valor no suma en el
    // tablero aunque la persona ya haya dicho qué quiere.
    await anotarLlamadaEnEmbudo({ tenant: "nissan", telefono: TEL, modelos: ["Kicks"] });
    const caso = await leerOportunidad("nissan", TEL);
    expect(caso?.monto).toBeGreaterThan(0);
  });

  it("una SEGUNDA llamada con otro carro pisa el modelo", async () => {
    // Pregunta por la Frontier, ve la cuota y termina en Kicks. Lo que dijo
    // recién es más nuevo que lo anotado, y el cambio queda en la bitácora.
    await anotarLlamadaEnEmbudo({ tenant: "nissan", telefono: TEL, modelos: ["Frontier"] });
    const r = await anotarLlamadaEnEmbudo({ tenant: "nissan", telefono: TEL, modelos: ["Kicks"] });

    expect(r.resumen).toContain("Kicks");
    expect((await leerOportunidad("nissan", TEL))?.modelo).toBe("kicks");
  });

  it("no duplica el caso: dos llamadas, una fila", async () => {
    await anotarLlamadaEnEmbudo({ tenant: "nissan", telefono: TEL, modelos: ["Frontier"] });
    await anotarLlamadaEnEmbudo({ tenant: "nissan", telefono: TEL, modelos: ["Frontier"] });
    expect((await listarOportunidades("nissan")).filter((o) => o.telefono === TEL)).toHaveLength(1);
  });

  it("la llamada SIN modelo igual mete al caso al embudo", async () => {
    // Llamó y colgó sin decir qué anda viendo. Sigue siendo un prospecto, y si
    // no entra acá no lo vuelve a tocar nadie.
    const r = await anotarLlamadaEnEmbudo({ tenant: "nissan", telefono: TEL, nombre: "Ana" });
    expect(r.modelo).toBeNull();
    expect(r.resumen).toContain("no nombró");
    expect(await leerOportunidad("nissan", TEL)).not.toBeNull();
  });

  it("no le pisa al vendedor el modelo que él mismo corrigió por el MISMO", async () => {
    // Si el modelo no cambia no se escribe nada: sin esto, cada llamada dejaba
    // un renglón repetido en la bitácora del caso.
    await anotarLlamadaEnEmbudo({ tenant: "nissan", telefono: TEL, modelos: ["Frontier"] });
    await fijarModelo("nissan", TEL, "frontier", "vendedor");
    const r = await anotarLlamadaEnEmbudo({ tenant: "nissan", telefono: TEL, modelos: ["la Frontier"] });
    expect(r.resumen).toContain("ya tenía");
  });
});
