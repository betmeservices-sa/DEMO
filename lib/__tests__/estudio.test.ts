import { describe, expect, it } from "vitest";
import { BANCO, lecturaDeFoto } from "@/lib/estudio/banco";
import { diaSemana, horaEnZona, instanteDe, localSV, lunesDe, sumarDias } from "@/lib/estudio/fechas";
import {
  CANTIDADES,
  avanceRender,
  creditosTotal,
  creditosVideo,
  estimarCreditos,
  generarPiezas,
  idiomaDe,
  redesPara,
  repartir,
  reescribir,
} from "@/lib/estudio/generador";
import { LETRAS, letraDe, rotulosDe, sugerirLetras, urlFuentes } from "@/lib/estudio/letras";
import { conLectura } from "@/lib/estudio/proveedores";
import { MARCAS, semillaEstudio } from "@/lib/estudio/semilla";
import type { TrabajoRender } from "@/lib/estudio/tipos";
import { resolveTenantByLogin, TENANTS } from "@/lib/tenants";
import { moduloDeRuta, puedeVerRuta } from "@/lib/modulos";

const marca = (id: string) => MARCAS.find((m) => m.id === id)!;
// Miércoles 21 de octubre de 2026, 10:00 en El Salvador.
const AHORA = instanteDe("2026-10-21T10:00");

describe("horas del motor", () => {
  it("ida y vuelta entre instante y hora de El Salvador", () => {
    expect(localSV(instanteDe("2026-10-21T07:30"))).toBe("2026-10-21T07:30");
  });

  it("las 7:00 aquí son las 9:00 en Miami en octubre", () => {
    expect(horaEnZona("2026-10-21T07:00", "America/New_York")).toMatch(/^9:00/);
  });

  it("el lunes de la semana", () => {
    expect(lunesDe("2026-10-21")).toBe("2026-10-19");
    expect(diaSemana("2026-10-25")).toBe(6);
  });
});

describe("generar un encargo", () => {
  it("respeta el reparto de idiomas", () => {
    const n = 5;
    const es = Array.from({ length: n }, (_, i) => idiomaDe(i, 60)).filter((x) => x === "es").length;
    expect(es).toBe(3);
    expect(idiomaDe(0, 60)).toBe("es");
    expect(idiomaDe(0, 30)).toBe("en");
  });

  it("un lote sale todo en el formato pedido y sin repetir", () => {
    const piezas = generarPiezas({
      marca: marca("casanova"),
      texto: "Contenido de noviembre",
      formato: "imagen",
      cantidad: CANTIDADES.imagen[1],
      idiomas: { es: 60, en: 40 },
      encargoId: "enc-x",
      actor: "Mario G.",
      ahoraIso: new Date(AHORA).toISOString(),
    });
    expect(piezas).toHaveLength(5);
    expect(piezas.every((p) => p.tipo === "imagen" && p.medios.length === 1 && p.estado === "por_aprobar")).toBe(true);
    expect(new Set(piezas.map((p) => p.titulo)).size).toBe(5);
    expect(piezas.filter((p) => p.idioma === "es")).toHaveLength(3);
  });

  it("el carrusel lleva tres láminas y el anuncio su titular, su botón y Meta", () => {
    const base = { marca: marca("solano"), texto: "oferta", idiomas: { es: 100, en: 0 }, encargoId: "e", actor: "Mario G.", ahoraIso: new Date(AHORA).toISOString() };
    const [c] = generarPiezas({ ...base, formato: "carrusel", cantidad: 1 });
    expect(c.medios).toHaveLength(3);
    const [a] = generarPiezas({ ...base, formato: "anuncio", cantidad: 1 });
    expect(a.tipo).toBe("anuncio");
    expect(a.redes).toEqual(["facebook", "instagram"]);
    expect(a.anuncio?.cta).toBe("Pide tu estimado");
    expect(a.anuncio?.titular).toBe(a.titulo);
    expect(a.hashtags).toEqual([]);
    expect(a.variantes.every((v) => v.texto === a.texto)).toBe(true);
  });

  it("el guion de video sale en fase guion y sin medios", () => {
    const [p] = generarPiezas({
      marca: marca("solano"),
      texto: "video de rafael",
      formato: "video",
      cantidad: 1,
      idiomas: { es: 100, en: 0 },
      encargoId: "enc-v",
      actor: "Mario G.",
      ahoraIso: new Date(AHORA).toISOString(),
    });
    expect(p.tipo).toBe("video");
    expect(p.fase).toBe("guion");
    expect(p.medios).toEqual([]);
    expect(p.guion).toBeTruthy();
  });

  it("prioriza lo que pide el prompt", () => {
    const [p] = generarPiezas({
      marca: marca("keystone"),
      texto: "algo sobre financiamiento",
      formato: "texto",
      cantidad: 1,
      idiomas: { es: 0, en: 100 },
      encargoId: "enc-f",
      actor: "Mario G.",
      ahoraIso: new Date(AHORA).toISOString(),
    });
    expect(p.titulo).toBe("18-month financing");
  });

  it("solo las redes que la marca tiene, con la vencida incluida", () => {
    expect(redesPara("video", marca("solano"))).toEqual(["instagram", "tiktok", "facebook"]);
    expect(redesPara("texto", marca("casanova"))).toEqual(["facebook", "google"]);
  });

  it("reescribir cambia el texto y deja la pieza por aprobar", () => {
    const s = semillaEstudio(AHORA);
    const p = s.piezas.find((x) => x.id === "pz-casanova-cuarzo-en")!;
    const nueva = reescribir(p, marca("casanova"), "más corto", new Date(AHORA).toISOString());
    expect(nueva.titulo).not.toBe(p.titulo);
    expect(nueva.estado).toBe("por_aprobar");
    expect(nueva.historial.at(-1)?.accion).toBe("regenerada");
  });
});

describe("créditos", () => {
  it("un video de 30 s cuesta voz, avatar y edición", () => {
    const c = creditosVideo("x".repeat(300), 30);
    expect(c).toEqual({ voz: 3, avatar: 10, edicion: 3, total: 16 });
  });

  it("el estimado de Crear separa lo de ahora y lo de aprobar el video", () => {
    expect(estimarCreditos("imagen", 5)).toEqual({ ahora: 10, alAprobar: 0 });
    expect(estimarCreditos("anuncio", 1)).toEqual({ ahora: 6, alAprobar: 0 });
    expect(estimarCreditos("video", 2).alAprobar).toBeGreaterThan(0);
  });

  it("ninguna marca de la muestra pasa su plan del mes", () => {
    const s = semillaEstudio(AHORA);
    for (const m of s.marcas) {
      const usado = creditosTotal(s.uso.filter((u) => u.marcaId === m.id && localSV(Date.parse(u.fecha)).startsWith("2026-10")));
      expect(usado, m.id).toBeGreaterThan(0);
      expect(usado, m.id).toBeLessThan(m.creditosPlan);
    }
  });
});

describe("repartir en el calendario", () => {
  it("una por día, solo en los días elegidos, sin pisar lo tomado", () => {
    const r = repartir(["a", "b", "c"], {
      desde: "2026-10-19",
      dias: [0, 2, 4],
      horas: ["16:00", "07:00"],
      ocupadas: ["2026-10-19T07:00"],
    });
    expect(r).toEqual({ a: "2026-10-19T16:00", b: "2026-10-21T07:00", c: "2026-10-23T07:00" });
  });
});

describe("avance de un video", () => {
  const t: TrabajoRender = {
    id: "rd",
    piezaId: "p",
    marcaId: "m",
    etapa: "voz",
    progreso: 0,
    iniciado: new Date(AHORA).toISOString(),
    duracionSeg: 100,
    minutos: 0.5,
  };
  it("pasa por voz, avatar y edición", () => {
    expect(avanceRender(t, AHORA + 10_000).etapa).toBe("voz");
    expect(avanceRender(t, AHORA + 50_000).etapa).toBe("avatar");
    expect(avanceRender(t, AHORA + 90_000).etapa).toBe("edicion");
    expect(avanceRender(t, AHORA + 120_000)).toMatchObject({ etapa: "listo", progreso: 100 });
  });
});

describe("la muestra", () => {
  const s = semillaEstudio(AHORA);

  it("lo de antes de ahora salió y lo de después está programado", () => {
    for (const p of s.piezas) {
      if (!p.programadaPara) continue;
      if (instanteDe(p.programadaPara) > AHORA) expect(p.estado).toBe("programada");
      else expect(["publicada", "fallida"]).toContain(p.estado);
    }
  });

  it("la publicación de TikTok con la cuenta vencida falló, las otras redes salieron", () => {
    const p = s.piezas.find((x) => x.id === "pz-solano-manos-en")!;
    expect(p.estado).toBe("fallida");
    expect(p.variantes.find((v) => v.red === "tiktok")?.estado).toBe("fallida");
    expect(p.variantes.filter((v) => v.red !== "tiktok").every((v) => v.estado === "publicada")).toBe(true);
  });

  it("cada pieza tiene una variante por red y la semana empieza en lunes", () => {
    expect(s.base).toBe(sumarDias("2026-10-21", -2));
    for (const p of s.piezas) expect(p.variantes.map((v) => v.red)).toEqual(p.redes);
  });

  it("los clones tienen consentimiento firmado", () => {
    for (const m of s.marcas) if (m.avatar?.tipo === "clon") expect(m.avatar.consentimiento?.firmado).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("el copy no lleva guiones largos", () => {
    const textos = Object.values(BANCO)
      .flat()
      .flatMap((a) => [a.idea, a.es.titulo, a.es.texto, a.es.guion ?? "", a.en.titulo, a.en.texto, a.en.guion ?? ""]);
    const largo = String.fromCharCode(0x2014);
    for (const t of textos) expect(t).not.toContain(largo);
  });
});

describe("el panel en el demo", () => {
  it("entra con su clave y abre su módulo", () => {
    expect(resolveTenantByLogin("demoagentia", "demoestudio")).toBe("estudio");
    expect(TENANTS.estudio.shell).toBe("estudio");
    expect(moduloDeRuta("/estudio/calendario")).toBe("estudio");
    expect(puedeVerRuta("gerente_marketing", "/estudio")).toBe(true);
    expect(puedeVerRuta("atencion", "/estudio")).toBe(false);
  });
});

describe("la letra del texto en la foto", () => {
  const encargo = (formato: "imagen" | "carrusel" | "video" | "anuncio", texto: string, id = "solano") =>
    generarPiezas({
      marca: marca(id),
      texto,
      formato,
      cantidad: 1,
      idiomas: { es: 100, en: 0 },
      encargoId: "enc-letra",
      actor: "Prueba",
      ahoraIso: new Date(AHORA).toISOString(),
    });

  it("el catálogo no trae letras de sistema y todas salen de Google Fonts", () => {
    for (const l of LETRAS) {
      expect(l.familia).not.toMatch(/arial|helvetica|times|verdana|system/i);
      expect(urlFuentes()).toContain(`family=${l.pedido}`);
    }
  });

  it("una fachada clásica sugiere primero la clásica; una obra, la de obra", () => {
    const clasica = sugerirLetras({ lectura: { estilo: "clasica", tono: "claro", zona: "arriba" }, textos: ["Interior terminado"] });
    expect(clasica[0].id).toBe("fraunces");
    const obra = sugerirLetras({ lectura: { estilo: "obra", tono: "claro", zona: "abajo" }, textos: ["Por qué se pela"] });
    expect(obra[0].id).toBe("big-shoulders");
    expect(clasica).toHaveLength(3);
  });

  it("la letra de la marca entra entre las sugeridas", () => {
    const s = sugerirLetras({ lectura: { estilo: "calida", tono: "claro", zona: "arriba" }, marca: { letra: "montserrat" }, textos: ["Hola"] });
    expect(s.map((l) => l.id)).toContain("montserrat");
  });

  it("un texto largo deja fuera la letra a brocha", () => {
    const largo = "Antes y después de la fachada completa en Coral Gables";
    const s = sugerirLetras({ lectura: { estilo: "obra", tono: "medio", zona: "abajo" }, textos: [largo] });
    expect(s.map((l) => l.id)).not.toContain("caveat-brush");
    expect(s.every((l) => largo.length <= l.maximo)).toBe(true);
  });

  it("una oferta sube las letras que aguantan un porcentaje grande", () => {
    const s = sugerirLetras({ lectura: { estilo: "moderna", tono: "claro", zona: "arriba" }, textos: ["15% en encimeras"] });
    expect(s[0].oferta).toBe(true);
  });

  it("el carrusel trae el texto de cada lámina; el video y el anuncio, ninguno", async () => {
    const [carrusel] = encargo("carrusel", "3 errores al elegir color");
    expect(carrusel.rotulos).toEqual(["3 errores al elegir color", "Elegirlo con la luz de la tienda", "Probarlo en un cuadrito de 5 cm"]);
    expect(encargo("video", "video de Rafael")[0].rotulos).toBeUndefined();
    expect(rotulosDe(encargo("anuncio", "oferta")[0])).toEqual([]);
    const { piezas } = await conLectura([carrusel]);
    expect(piezas[0].lectura).toEqual(lecturaDeFoto(carrusel.medios[0]));
    expect(letraDe(piezas[0], marca("solano")).vaCon).toContain(piezas[0].lectura!.estilo);
  });

  it("la letra elegida manda sobre la sugerida", () => {
    const [p] = encargo("imagen", "pintura que se pela");
    expect(letraDe({ ...p, letra: "bodoni-moda" }).id).toBe("bodoni-moda");
    expect(letraDe({ ...p, letra: "arial" }).id).not.toBe("arial");
  });

  it("toda foto de la muestra tiene su lectura", () => {
    const fotos = new Set(Object.values(BANCO).flatMap((as) => as.flatMap((a) => a.fotos)).filter((f) => !f.includes("retrato-")));
    for (const f of fotos) expect(lecturaDeFoto(f), f).toBeDefined();
    const conTexto = semillaEstudio(AHORA).piezas.filter((p) => rotulosDe(p).length);
    expect(conTexto.length).toBeGreaterThan(0);
    for (const p of conTexto) expect(p.lectura, p.id).toBeDefined();
  });
});
