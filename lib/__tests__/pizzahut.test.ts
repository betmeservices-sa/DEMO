// El tenant de Pizza Hut: login, menú, tema, muestra y reglas del tablero de
// eventos (prioridad, faltantes, plazo, reparto y movimientos).
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { DEMO_LOGINS, TENANTS, isTenantId, resolveTenantByLogin } from "@/lib/tenants";
import { assistantIdsDeTenant, veModuloVoz } from "@/lib/tenants/voz";
import { MODULOS_PIZZAHUT, MODULO_RUTA, VE, moduloDeRuta } from "@/lib/modulos";
import { llamadasDeMuestra, propuestasDeMuestra, transcripcionDeMuestra } from "@/lib/eventos/semilla";
import { asignarAsesor, calcularPrioridad, datosFaltantes, plazoPrimerContacto } from "@/lib/eventos/prioridad";
import { aplicarMovimientos, validarMovimiento } from "@/lib/eventos/estado";
import { datosVacios } from "@/lib/eventos/contrato";
import { resumirTablero, fueraDeHorario } from "@/lib/eventos/metricas";
import { diaSV, isoDeSV } from "@/lib/eventos/fechas";
import { ASESORES, telefonoLegible } from "@/lib/eventos/catalogo";

const CSS = fs.readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");

function bloque(selector: string): string {
  const escapado = selector.replace(/[[\]="]/g, "\\$&");
  const partes = CSS.split(new RegExp(`(?:^|\\n)\\s*${escapado}\\s*\\{`));
  if (partes.length < 2) return "";
  return partes[partes.length - 1].split("}")[0];
}
function variable(cuerpo: string, nombre: string): string {
  return (cuerpo.match(new RegExp(`--${nombre}\\s*:\\s*([^;]+);`))?.[1] ?? "").trim();
}
function luminancia(hex: string): number {
  const v = hex.replace("#", "");
  const canal = (i: number) => {
    const c = parseInt(v.slice(i * 2, i * 2 + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}
function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Un martes a las 12:00 de El Salvador.
const AHORA = Date.parse("2026-10-06T18:00:00.000Z");

describe("tenant pizzahut", () => {
  it("entra con demoagentia / demop y no le roba la clave a nadie", () => {
    expect(resolveTenantByLogin("demoagentia", "demop")).toBe("pizzahut");
    expect(resolveTenantByLogin("demoagentia", "demob")).toBe("betme");
    expect(resolveTenantByLogin("demoagentia", "demon")).toBe("nissan");
    const claves = DEMO_LOGINS.map((l) => `${l.usuario}:${l.password}`);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("está registrado, habla de organizadores y tiene a Daniela en voz", () => {
    expect(isTenantId("pizzahut")).toBe(true);
    expect(TENANTS.pizzahut.brand.nombre).toBe("Pizza Hut El Salvador");
    expect(TENANTS.pizzahut.labels.contacto).toBe("organizador");
    expect(TENANTS.pizzahut.ai.nombre).toBe("Daniela");
    expect(TENANTS.pizzahut.ai.respondeSolo).toBe(false);
    expect(assistantIdsDeTenant("pizzahut")).toEqual(["87bbe17c-8851-41a2-b7bd-443b3554ad08"]);
    expect(veModuloVoz("pizzahut")).toBe(true);
  });

  it("su menú es cerrado y Eventos tiene ruta propia", () => {
    expect(MODULOS_PIZZAHUT).toEqual(["dashboard", "bandeja", "eventos", "llamadas", "contactos", "agentes", "settings"]);
    expect(MODULO_RUTA.eventos).toBe("/eventos");
    expect(moduloDeRuta("/eventos")).toBe("eventos");
    expect(VE.admin).toContain("eventos");
    expect(VE.medico).toContain("eventos");
  });

  it("la bandeja de muestra es simulada: ids sim- y teléfonos 9xxx", () => {
    const s = TENANTS.pizzahut.seed;
    for (const c of s.conversations) expect(c.id.startsWith("sim-")).toBe(true);
    for (const c of s.contacts) if (c.telefono) expect(c.telefono.replace(/\D/g, "")).toMatch(/^5039\d{7}$/);
    for (const c of TENANTS.pizzahut.simulacion.contactos) if (c.telefono) expect(c.telefono).toMatch(/^5039\d{7}$/);
  });
});

describe("tema de Pizza Hut", () => {
  const b = bloque('[data-tenant="pizzahut"]');

  it("usa los tokens de su sitio y Montserrat", () => {
    expect(variable(b, "brand-blue")).toBe("#c8102e");
    expect(variable(b, "brand-blue-dark")).toBe("#a50a23");
    expect(variable(b, "text")).toBe("#231f20");
    expect(variable(b, "brand-accent")).toBe("#231f20");
    expect(variable(b, "surface")).toBe("#f8f8f8");
    expect(variable(b, "font-app")).toContain("Montserrat");
    expect(CSS).toContain("family=Montserrat");
  });

  it("la alarma no es el rojo de la marca", () => {
    expect(variable(b, "brand-red")).not.toBe(variable(b, "brand-blue"));
    expect(variable(b, "brand-red")).not.toBe(variable(b, "brand-blue-dark"));
  });

  it("todo el texto pasa el 4.5:1 de WCAG AA sobre el fondo y la tarjeta", () => {
    const fondo = variable(b, "surface");
    const tarjeta = variable(b, "card");
    for (const n of ["text", "text-2", "text-3", "brand-blue", "brand-red", "brand-green", "brand-accent"]) {
      const c = variable(b, n);
      expect(contraste(c, fondo), `${n} sobre el fondo`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(c, tarjeta), `${n} sobre la tarjeta`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("va después de la marca unificada, para no pintarse violeta", () => {
    const unificada = CSS.indexOf("/* Marca unificada MiAgentIA");
    const propio = CSS.indexOf('[data-tenant="pizzahut"] {');
    expect(unificada).toBeGreaterThan(0);
    expect(propio).toBeGreaterThan(unificada);
  });
});

describe("muestra de eventos", () => {
  const ps = propuestasDeMuestra(AHORA);
  const hoy = diaSV(AHORA);

  it("trae entre 25 y 35 propuestas, pasadas y de uno a cuatro meses", () => {
    expect(ps.length).toBeGreaterThanOrEqual(25);
    expect(ps.length).toBeLessThanOrEqual(35);
    expect(ps.some((p) => p.datos.fecha_inicio < hoy)).toBe(true);
    expect(ps.some((p) => p.datos.fecha_inicio > hoy)).toBe(true);
    const lejos = ps.filter((p) => p.datos.fecha_inicio > hoy).map((p) => (Date.parse(p.datos.fecha_inicio) - AHORA) / 86_400_000);
    expect(Math.max(...lejos)).toBeLessThanOrEqual(125);
  });

  it("teléfonos en el rango 9xxx y correos que no existen", () => {
    for (const p of ps) {
      if (p.datos.contacto_telefono) expect(p.datos.contacto_telefono).toMatch(/^9\d{7}$/);
      if (p.datos.contacto_correo) expect(p.datos.contacto_correo).toMatch(/\.example$/);
    }
  });

  it("cubre todas las etapas, hay propuestas vencidas y dos confirmados el mismo día", () => {
    for (const e of ["nueva", "revision", "contactado", "negociacion", "confirmada", "descartada"]) {
      expect(ps.some((p) => p.etapa === e), e).toBe(true);
    }
    expect(ps.filter((p) => plazoPrimerContacto(p, AHORA).vencido).length).toBeGreaterThanOrEqual(2);
    // Cualquier día de la semana en que se enseñe.
    for (let i = 0; i < 7; i++) {
      const otro = AHORA + i * 86_400_000;
      const hoyOtro = diaSV(otro);
      const confirmadosPorDia = new Map<string, number>();
      for (const p of propuestasDeMuestra(otro).filter((x) => x.etapa === "confirmada" && x.datos.fecha_inicio > hoyOtro)) {
        confirmadosPorDia.set(p.datos.fecha_inicio, (confirmadosPorDia.get(p.datos.fecha_inicio) ?? 0) + 1);
      }
      expect([...confirmadosPorDia.values()].some((n) => n >= 2), `día ${i}`).toBe(true);
    }
  });

  it("los eventos de fin de semana caen en fin de semana", () => {
    for (let i = 0; i < 7; i++) {
      const otro = propuestasDeMuestra(AHORA + i * 86_400_000);
      for (const id of ["s02", "s03", "s07", "s08", "s13", "s22"]) {
        const p = otro.find((x) => x.id === id)!;
        expect(new Date(`${p.datos.fecha_inicio}T12:00:00Z`).getUTCDay(), `${id} día ${i}`).toBe(6);
      }
    }
  });

  it("las descartadas tienen motivo", () => {
    for (const p of ps.filter((x) => x.etapa === "descartada")) expect(p.motivoDescarte).toBeTruthy();
  });

  it("es determinista: la misma hora da la misma muestra", () => {
    expect(JSON.stringify(propuestasDeMuestra(AHORA))).toBe(JSON.stringify(propuestasDeMuestra(AHORA)));
    expect(JSON.stringify(llamadasDeMuestra(ps, AHORA))).toBe(JSON.stringify(llamadasDeMuestra(ps, AHORA)));
  });

  it("ningún texto de la muestra lleva guion largo ni la palabra vetada", () => {
    const todo = JSON.stringify({ ps, seed: TENANTS.pizzahut.seed, sim: TENANTS.pizzahut.simulacion, ia: TENANTS.pizzahut.ai.systemPrompt });
    expect(todo).not.toMatch(/[\u2014\u2013]/);
    expect(todo.toLowerCase()).not.toContain("agendamiento");
    const llamadas = llamadasDeMuestra(ps, AHORA);
    for (const l of llamadas.slice(0, 40)) {
      const t = transcripcionDeMuestra(l, ps.find((p) => p.id === l.propuestaId));
      expect(t).not.toMatch(/[\u2014\u2013]/);
    }
  });

  it("las llamadas que no fueron propuesta varían y siguen el guion", () => {
    const ls = llamadasDeMuestra(ps, AHORA);
    for (const m of ["seguimiento", "pedido", "sucursal"] as const) {
      const xs = ls.filter((l) => l.motivo === m).map((l) => l.resumen);
      // Dos seguidas del mismo motivo nunca dicen lo mismo.
      for (let i = 1; i < xs.length; i++) expect(xs[i], `${m} ${i}`).not.toBe(xs[i - 1]);
    }
    for (const l of ls.filter((x) => !x.esPropuesta)) {
      // Pedidos y sucursales van a la página web o la aplicación; nunca una dirección ni un teléfono.
      if (l.motivo === "pedido" || l.motivo === "sucursal") expect(l.resumen).toMatch(/página web o (en )?la aplicación/);
      expect(l.resumen.toLowerCase()).not.toMatch(/canales de pedidos|dirección|queda en/);
      // La transcripción es la de su propio resumen, no una genérica.
      expect(transcripcionDeMuestra(l).split("\n").length).toBeGreaterThan(1);
    }
  });

  it("los teléfonos se leen como 9255-4457", () => {
    expect(telefonoLegible("+50392554457")).toBe("9255-4457");
    expect(telefonoLegible("92554457")).toBe("9255-4457");
    expect(telefonoLegible("2505 4606")).toBe("2505-4606");
    expect(telefonoLegible("+14155550100")).toBe("+14155550100");
    expect(telefonoLegible("")).toBe("");
  });

  it("las llamadas de muestra no caen en el futuro y las de propuesta apuntan a una propuesta", () => {
    const ls = llamadasDeMuestra(ps, AHORA);
    expect(ls.length).toBeGreaterThan(30);
    for (const l of ls) expect(Date.parse(l.inicio)).toBeLessThanOrEqual(AHORA);
    for (const l of ls.filter((x) => x.esPropuesta)) expect(ps.some((p) => p.id === l.propuestaId)).toBe(true);
  });
});

describe("reglas del tablero", () => {
  it("la prioridad es pura y dice por qué", () => {
    const completa = propuestasDeMuestra(AHORA).find((x) => x.id === "s08")!.datos;
    const d = { ...completa, aforo_esperado: 15000, fecha_inicio: "2026-10-20", exclusividad_pizza: "si" as const, condicion_comercial: "sin_costo" as const };
    const p = calcularPrioridad(d, "2026-10-06");
    expect(p.nivel).toBe("alta");
    expect(p.puntos).toBe(p.razones.reduce((n, r) => n + r.puntos, 0));
    expect(p.razones.map((r) => r.texto).join(" | ")).toMatch(/15,000/);
    expect(calcularPrioridad(d, "2026-10-06")).toEqual(p);
    const baja = calcularPrioridad({ ...datosVacios(), aforo_esperado: 300 }, "2026-10-06");
    expect(baja.nivel).toBe("baja");
  });

  it("un evento que ya pasó baja de prioridad", () => {
    const d = { ...datosVacios(), aforo_esperado: 15000, fecha_inicio: "2026-09-01", exclusividad_pizza: "si" as const };
    expect(calcularPrioridad(d, "2026-10-06").razones.some((r) => r.puntos < 0 && /pasó/.test(r.texto))).toBe(true);
  });

  it("los datos faltantes piden el monto solo si la condición lo lleva", () => {
    const cuota = datosFaltantes({ ...datosVacios(), condicion_comercial: "cuota_fija" }).map((f) => f.campo);
    expect(cuota).toContain("monto_cuota");
    const sinCosto = datosFaltantes({ ...datosVacios(), condicion_comercial: "sin_costo" }).map((f) => f.campo);
    expect(sinCosto).not.toContain("monto_cuota");
    expect(sinCosto).not.toContain("porcentaje_comision");
  });

  it("el plazo de primer contacto es de 24 horas", () => {
    const creada = new Date(AHORA - 25 * 3_600_000).toISOString();
    expect(plazoPrimerContacto({ creada, primerContacto: null, etapa: "nueva" }, AHORA).vencido).toBe(true);
    expect(plazoPrimerContacto({ creada, primerContacto: creada, etapa: "nueva" }, AHORA).vencido).toBe(false);
    const reciente = new Date(AHORA - 3 * 3_600_000).toISOString();
    const e = plazoPrimerContacto({ creada: reciente, primerContacto: null, etapa: "nueva" }, AHORA);
    expect(e.vencido).toBe(false);
    expect(e.horas).toBeCloseTo(21, 0);
  });

  it("el reparto va al asesor con menos propuestas abiertas", () => {
    const carga = [
      { asesorId: "s2", etapa: "nueva" as const },
      { asesorId: "s2", etapa: "contactado" as const },
      { asesorId: "s3", etapa: "negociacion" as const },
      { asesorId: "s4", etapa: "nueva" as const },
      { asesorId: "s5", etapa: "confirmada" as const },
      { asesorId: "s5", etapa: "descartada" as const },
    ];
    expect(asignarAsesor(carga)).toBe("s5");
    expect(asignarAsesor([])).toBe(ASESORES[0].id);
  });

  it("los movimientos cambian etapa, nota, asesor, contacto y datos", () => {
    const [p] = propuestasDeMuestra(AHORA).filter((x) => x.etapa === "nueva");
    const ts = (n: number) => new Date(AHORA + n * 1000).toISOString();
    const [q] = aplicarMovimientos([p], [
      { id: "1", propuestaId: p.id, tipo: "etapa", valor: { a: "negociacion" }, actor: "s2", ts: ts(1) },
      { id: "2", propuestaId: p.id, tipo: "nota", valor: { texto: "Llamé y piden propuesta" }, actor: "s2", ts: ts(2) },
      { id: "3", propuestaId: p.id, tipo: "asesor", valor: { asesorId: "s4" }, actor: "me", ts: ts(3) },
      { id: "4", propuestaId: p.id, tipo: "dato", valor: { campo: "aforo_esperado", valor: "7,500" }, actor: "s4", ts: ts(4) },
      { id: "5", propuestaId: p.id, tipo: "etapa", valor: { a: "descartada", motivo: "El evento se canceló" }, actor: "s4", ts: ts(5) },
    ]);
    expect(q.etapa).toBe("descartada");
    expect(q.motivoDescarte).toBe("El evento se canceló");
    expect(q.primerContacto).toBe(ts(1));
    expect(q.asesorId).toBe("s4");
    expect(q.datos.aforo_esperado).toBe(7500);
    expect(q.notasInternas.at(-1)?.texto).toBe("Llamé y piden propuesta");
    expect(q.historial.slice(-2).map((h) => h.a)).toEqual(["negociacion", "descartada"]);
    // La original no se toca.
    expect(p.etapa).toBe("nueva");
  });

  it("descartar sin motivo no se acepta", () => {
    expect(validarMovimiento("etapa", { a: "descartada" })).toBeNull();
    expect(validarMovimiento("etapa", { a: "descartada", motivo: "Sin respuesta" })).not.toBeNull();
    expect(validarMovimiento("dato", { campo: "no_existe", valor: "x" })).toBeNull();
    expect(validarMovimiento("borrar", {})).toBeNull();
  });
});

describe("métricas del dashboard", () => {
  it("fuera de horario: noche, madrugada y fin de semana en hora de El Salvador", () => {
    expect(fueraDeHorario(isoDeSV("2026-10-06", 10))).toBe(false); // martes 10:00
    expect(fueraDeHorario(isoDeSV("2026-10-06", 19))).toBe(true); // martes 19:00
    expect(fueraDeHorario(isoDeSV("2026-10-10", 11))).toBe(true); // sábado
  });

  it("resume llamadas, cartera y embudo", () => {
    const ps = propuestasDeMuestra(AHORA);
    const ls = llamadasDeMuestra(ps, AHORA);
    const r = resumirTablero(ps, ls, AHORA);
    expect(r.llamadas).toBe(ls.filter((l) => Date.parse(l.inicio) >= AHORA - 30 * 86_400_000).length);
    expect(r.porDia).toHaveLength(30);
    expect(r.porHora).toHaveLength(24);
    expect(r.porDia.reduce((n, d) => n + d.total, 0)).toBe(r.llamadas);
    expect(r.tasaPropuesta).toBeGreaterThan(0);
    expect(r.tasaPropuesta).toBeLessThan(1);
    expect(r.aforoCartera).toBeGreaterThan(0);
    expect(r.proximos.every((p) => p.datos.fecha_inicio >= diaSV(AHORA))).toBe(true);
    expect(r.horasPrimerContacto).not.toBeNull();
  });
});
