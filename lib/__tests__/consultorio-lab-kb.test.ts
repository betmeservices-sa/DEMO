// LA BÚSQUEDA DE LA BASE DEL LABORATORIO.
//
// Lo que se afirma: la gente escribe como le sale y aun así se encuentra el
// examen; las siglas cortas no se cuelan dentro de otras palabras ("mañana" no
// es ANA); lo que no está confirmado viaja sin precio; las promociones vencidas
// no existen; y la fuente y las notas nunca le llegan al modelo.
import { describe, expect, it } from "vitest";
import {
  buscarEnBase,
  datosParaElModelo,
  limpiarKb,
  puntaje,
  respuestaDeBusqueda,
  type BaseLab,
} from "@/lib/consultorio/lab-kb";
import { BASE_LAB } from "@/lib/consultorio/lab-kb-datos";

const BASE: BaseLab = {
  examenes: [
    {
      id: "glucosa",
      tipo: "examen",
      nombre: "Glucosa en ayunas",
      sinonimos: ["glucosa", "glicemia", "azucar en sangre"],
      estado: "vigente",
      precio: 7,
      preparacion: "Ayuno de 8 a 12 horas.",
      fuente: "prueba",
      notas: "interna",
    },
    {
      id: "ana",
      tipo: "examen",
      nombre: "Anticuerpos antinucleares",
      sinonimos: ["ana", "antinucleares"],
      estado: "vigente",
      precio: 30,
      fuente: "prueba",
    },
    {
      id: "trigliceridos",
      tipo: "examen",
      nombre: "Triglicéridos",
      sinonimos: ["trigliceridos"],
      estado: "por_confirmar",
      precio: 9,
      preguntaAclaracion: "¿Lo necesita solo o con el perfil lipídico?",
      fuente: "prueba",
    },
  ],
  sucursales: [
    {
      id: "escalon",
      nombre: "Sucursal Escalón",
      sinonimos: ["escalon", "colonia escalon"],
      direccion: "83 Avenida Sur",
      horario: "Lunes a viernes",
      fuente: "prueba",
    },
  ],
  convenios: [],
  temas: [
    {
      id: "pago",
      nombre: "Formas de pago",
      sinonimos: ["tarjeta", "efectivo", "transferencia"],
      respuesta: "Efectivo y tarjeta.",
      fuente: "prueba",
    },
  ],
  promociones: [
    {
      id: "promo-oct",
      campana: "Promociones de octubre",
      sinonimos: ["promociones", "promocion", "ofertas", "descuentos"],
      detalle: "Perfil a precio especial.",
      desde: "2026-10-01",
      hasta: "2026-10-31",
      fuente: "prueba",
    },
  ],
};

describe("cómo se limpia lo que escriben", () => {
  it("las muletillas se van y queda lo que buscan", () => {
    expect(limpiarKb("Buenas tardes, cuánto cuesta la glucosa por favor")).toBe("glucosa");
    expect(limpiarKb("¿Qué precio tiene el examen de TRIGLICÉRIDOS?")).toBe("trigliceridos");
  });

  it("las siglas cortas cuentan solo como palabra completa", () => {
    expect(puntaje("ana", "mañana temprano")).toBe(0);
    expect(puntaje("ana", "prueba ana")).toBeGreaterThan(0.8);
  });
});

describe("lo que encuentra", () => {
  it("encuentra el examen aunque venga mal escrito", () => {
    const r = buscarEnBase(BASE, "cuanto sale la glucoza", "2026-10-23");
    expect(r[0]?.id).toBe("glucosa");
    expect(r[0]?.datos.precio).toBe(7);
  });

  it("encuentra temas y sucursales por cómo los nombran", () => {
    expect(buscarEnBase(BASE, "aceptan tarjeta?", "2026-10-23")[0]?.id).toBe("pago");
    expect(buscarEnBase(BASE, "la de la escalon", "2026-10-23")[0]?.id).toBe("escalon");
  });

  it("lo que no se parece a nada no devuelve un examen cualquiera", () => {
    expect(buscarEnBase(BASE, "resonancia magnética de rodilla", "2026-10-23")).toEqual([]);
    expect(JSON.parse(respuestaDeBusqueda(BASE, "resonancia magnética", "2026-10-23")).nota).toMatch(/No está/);
  });
});

describe("lo que nunca le llega al modelo", () => {
  it("un dato por confirmar viaja sin precio, con su pregunta de aclaración", () => {
    const r = buscarEnBase(BASE, "trigliceridos", "2026-10-23")[0];
    expect(r?.estado).toBe("por_confirmar");
    expect(r?.datos.precio).toBeUndefined();
    expect(r?.datos.preguntaAclaracion).toBeTruthy();
    expect(datosParaElModelo("no_se_realiza", { nombre: "x", precio: 5 })).toEqual({ nombre: "x" });
  });

  it("un examen que se hace pero sin precio confirmado lo dice, y trae lo demás", () => {
    const base: BaseLab = {
      ...BASE,
      examenes: [{ id: "curva", tipo: "examen", nombre: "Curva de glucosa", sinonimos: [], estado: "vigente", preparacion: "Ayuno.", fuente: "prueba" }],
    };
    const r = buscarEnBase(base, "curva de glucosa", "2026-10-23")[0];
    expect(r?.datos.precio).toBe("sin confirmar");
    expect(r?.datos.preparacion).toBe("Ayuno.");
  });

  it("la fuente, las notas y los sinónimos no salen", () => {
    const r = buscarEnBase(BASE, "glucosa", "2026-10-23")[0];
    expect(r?.datos.fuente).toBeUndefined();
    expect(r?.datos.notas).toBeUndefined();
    expect(r?.datos.sinonimos).toBeUndefined();
  });

  it("una promoción vencida no existe", () => {
    expect(buscarEnBase(BASE, "promociones", "2026-10-23")[0]?.id).toBe("promo-oct");
    expect(buscarEnBase(BASE, "promociones", "2026-11-01")).toEqual([]);
  });

  it("la base real no le dice al paciente que una prueba se manda a otro laboratorio", () => {
    // Pedido del laboratorio: eso va solo en notas. "Punto de referencia" de una dirección sí vale.
    const visible = [
      ...BASE_LAB.examenes,
      ...BASE_LAB.sucursales,
      ...BASE_LAB.convenios,
      ...BASE_LAB.temas,
      ...BASE_LAB.promociones,
    ].map((x) => JSON.stringify(datosParaElModelo("vigente", Object.fromEntries(Object.entries(x).filter(([k]) => !["fuente", "notas", "sinonimos"].includes(k))))));
    for (const texto of visible) {
      expect(texto).not.toMatch(/(laboratorio|prueba|pruebas|examen|ex[aá]menes) de referencia|(env[ií]a|manda|procesa)n? (en|a) otro laboratorio|env[ií]o de la muestra/i);
    }
  });
});
