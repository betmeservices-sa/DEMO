// El embudo de la sala de ventas.
//
// Lo que se cuida aca es lo que haria mentir al tablero sin que nadie se de
// cuenta: que la etapa salga de los pasos y no de un campo suelto, que un lead
// sin llamar levante la alarma a las horas que dice el guion, que una cita que
// ya paso no se quede escondida, y que la plata del embudo sume solo lo que
// alguien escribio de verdad.
import { describe, expect, it } from "vitest";
import {
  alertasDe,
  avanceDe,
  citasVencidasDe,
  etapaDe,
  nivelDeAlerta,
  reporteAutos,
  siguienteVendedor,
  type Oportunidad,
  type Pasos,
  type Vendedor,
} from "@/lib/autos-pipeline";
import { rangoDePeriodo } from "@/lib/periodos";

const HORA = 3_600_000;
const AHORA = Date.parse("2026-09-17T15:00:00.000Z");

const hace = (h: number) => new Date(AHORA - h * HORA).toISOString();
const dentroDe = (h: number) => new Date(AHORA + h * HORA).toISOString();

function caso(over: Partial<Oportunidad> = {}): Oportunidad {
  return {
    tenant: "nissan",
    telefono: "50370030999",
    nombre: "Prueba Uno",
    modelo: "kicks",
    pasos: {},
    vendedor: "s2",
    creado: hace(10),
    contactado: null,
    cotizado: null,
    separado: null,
    asignado: hace(10),
    tomado: hace(9),
    cerrado: null,
    resultado: null,
    motivoCierre: null,
    avisado: null,
    escalado: null,
    monto: 25000,
    canal: "instagram",
    actualizado: hace(1),
    ...over,
  };
}

const hecho = (h = 2): Pasos[string] => ({ estado: "hecho", ts: hace(h) });

describe("la etapa sale de los pasos, no de un campo", () => {
  it("un lead sin contactar se queda en la primera columna", () => {
    expect(etapaDe(caso(), AHORA)).toBe("nuevos");
  });

  it("contactado y con movimiento reciente es un contactado", () => {
    expect(etapaDe(caso({ contactado: hace(8) }), AHORA)).toBe("contactados");
  });

  it("contactado y quieto varios dias pasa a sin respuesta", () => {
    expect(etapaDe(caso({ contactado: hace(100), actualizado: hace(96) }), AHORA)).toBe("sin_respuesta");
  });

  it("con la cotizacion enviada pasa a con cotizacion", () => {
    expect(etapaDe(caso({ contactado: hace(8), pasos: { cotizacion: hecho() } }), AHORA)).toBe("cotizados");
  });

  it("una prueba de manejo agendada ya mueve la tarjeta", () => {
    const pasos: Pasos = { cotizacion: hecho(), prueba: { estado: "agendado", fecha: dentroDe(24) } };
    expect(etapaDe(caso({ contactado: hace(8), pasos }), AHORA)).toBe("prueba");
  });

  it("la propuesta en firme gana aunque nunca haya venido a manejar", () => {
    const pasos: Pasos = { cotizacion: hecho(), propuesta: hecho() };
    expect(etapaDe(caso({ contactado: hace(8), pasos }), AHORA)).toBe("negociacion");
  });

  it("la prima separa la unidad y eso manda sobre todo lo demas", () => {
    const pasos: Pasos = { cotizacion: hecho(), prueba: hecho(), propuesta: hecho(), separacion: hecho() };
    expect(etapaDe(caso({ contactado: hace(8), pasos }), AHORA)).toBe("separados");
  });

  it("cerrado como venta es entregado, y como perdido es perdido", () => {
    expect(etapaDe(caso({ cerrado: hace(1), resultado: "venta" }), AHORA)).toBe("entregados");
    expect(etapaDe(caso({ cerrado: hace(1), resultado: "perdido" }), AHORA)).toBe("perdidos");
  });
});

describe("el avance de la venta", () => {
  it("el usado a cuenta no cuenta para el avance: no todos traen uno", () => {
    const a = avanceDe({ cotizacion: hecho() }, AHORA);
    const b = avanceDe({ cotizacion: hecho(), usado: hecho() }, AHORA);
    expect(a.total).toBe(5);
    expect(b.hechos).toBe(a.hechos);
  });

  it("un paso trabado pesa mas que uno pendiente y se dice en el resumen", () => {
    const avance = avanceDe(
      { cotizacion: hecho(), propuesta: { estado: "trabado", motivo: "presupuesto" } },
      AHORA,
    );
    expect(avance.trabados).toHaveLength(1);
    expect(avance.resumen).toContain("presupuesto");
  });

  it("con una cita puesta, el resumen dice cuando es", () => {
    const avance = avanceDe({ prueba: { estado: "agendado", fecha: dentroDe(20) } }, AHORA);
    expect(avance.resumen).toContain("prueba de manejo");
  });

  it("sin nada hecho, lo siguiente es la cotizacion", () => {
    expect(avanceDe({}, AHORA).siguiente?.id).toBe("cotizacion");
  });
});

describe("los plazos de la primera llamada", () => {
  it("a las cuatro horas sin tomarlo avisa, y al dia lo da por vencido", () => {
    expect(nivelDeAlerta(caso({ asignado: hace(1), tomado: null }), AHORA)).toBeNull();
    expect(nivelDeAlerta(caso({ asignado: hace(5), tomado: null }), AHORA)).toBe("aviso");
    expect(nivelDeAlerta(caso({ asignado: hace(30), tomado: null }), AHORA)).toBe("vencido");
  });

  it("si ya lo tomo o ya se cerro, no hay alerta", () => {
    expect(nivelDeAlerta(caso({ asignado: hace(30), tomado: hace(29) }), AHORA)).toBeNull();
    expect(nivelDeAlerta(caso({ asignado: hace(30), tomado: null, cerrado: hace(2) }), AHORA)).toBeNull();
  });

  it("las alertas salen ordenadas por quien lleva mas esperando", () => {
    const alertas = alertasDe(
      [
        caso({ telefono: "1", asignado: hace(6), tomado: null }),
        caso({ telefono: "2", asignado: hace(40), tomado: null }),
      ],
      AHORA,
    );
    expect(alertas.map((a) => a.telefono)).toEqual(["2", "1"]);
    expect(alertas[0].nivel).toBe("vencido");
  });
});

describe("las citas que se caen", () => {
  it("una cita que ya paso y nadie marco sale a la luz", () => {
    const vencidas = citasVencidasDe(
      [
        caso({ telefono: "1", pasos: { prueba: { estado: "agendado", fecha: hace(30) } } }),
        caso({ telefono: "2", pasos: { prueba: { estado: "agendado", fecha: dentroDe(30) } } }),
      ],
      AHORA,
    );
    expect(vencidas).toHaveLength(1);
    expect(vencidas[0].telefono).toBe("1");
    expect(vencidas[0].pasoNombre).toBe("Prueba de manejo");
  });
});

describe("el reparto de leads", () => {
  it("le toca al que menos casos activos tiene", () => {
    const equipo: Vendedor[] = [
      { id: "s2", nombre: "Diana", iniciales: "D" },
      { id: "s3", nombre: "Kevin", iniciales: "K" },
    ];
    const cartera = [
      caso({ telefono: "1", vendedor: "s2" }),
      caso({ telefono: "2", vendedor: "s2" }),
      caso({ telefono: "3", vendedor: "s3" }),
    ];
    expect(siguienteVendedor(equipo, cartera)?.id).toBe("s3");
  });
});

describe("el reporte del gerente", () => {
  const equipo: Vendedor[] = [
    { id: "s2", nombre: "Diana Escobar", iniciales: "DE" },
    { id: "s3", nombre: "Kevin Rivera", iniciales: "KR" },
  ];
  const rango = rangoDePeriodo("30d", new Date(AHORA));
  const cartera: Oportunidad[] = [
    caso({ telefono: "1", asignado: hace(6), tomado: null }),
    caso({
      telefono: "2",
      modelo: "frontier-dc",
      monto: 40000,
      contactado: hace(8),
      pasos: { cotizacion: hecho(), propuesta: { estado: "trabado", motivo: "presupuesto" } },
    }),
    caso({
      telefono: "3",
      vendedor: "s3",
      modelo: "kicks",
      monto: 24800,
      contactado: hace(300),
      cerrado: hace(48),
      resultado: "venta",
      pasos: { cotizacion: hecho(300), prueba: hecho(200), propuesta: hecho(100), separacion: hecho(60), entrega: hecho(48) },
    }),
    caso({ telefono: "4", vendedor: null, monto: null, contactado: hace(5) }),
  ];
  const r = reporteAutos(cartera, equipo, rango, new Date(AHORA));

  it("el embudo reparte a cada quien en una sola etapa", () => {
    expect(r.embudo.reduce((n, e) => n + e.n, 0)).toBe(cartera.length);
    expect(r.embudo.find((e) => e.etapa === "entregados")?.n).toBe(1);
  });

  it("solo suma la plata que alguien escribio", () => {
    const nuevos = r.embudo.find((e) => e.etapa === "nuevos");
    // Entran el lead sin precio y el de 25,000: el que no tiene vale cero.
    expect(nuevos?.n).toBe(1);
    expect(nuevos?.monto).toBe(25000);
  });

  it("cuenta la venta del periodo con su facturacion", () => {
    expect(r.movimiento.ventas).toBe(1);
    expect(r.movimiento.monto).toBe(24800);
  });

  it("dice donde se traba la venta", () => {
    expect(r.pasos.trabas).toEqual([{ motivo: "presupuesto", nombre: "Se le pasa del presupuesto", n: 1 }]);
  });

  it("separa lo que se pide de lo que se entrega", () => {
    const kicks = r.modelos.find((m) => m.id === "kicks");
    expect(kicks?.vendidos).toBe(1);
    // Los dos leads vivos de Kicks (el sin llamar y el sin vendedor), no el entregado.
    expect(kicks?.interesados).toBe(2);
  });

  it("cada venta viva espera UN paso, no todos los que le faltan", () => {
    const vivas = cartera.filter((o) => !o.cerrado).length;
    expect(r.pasos.pendientes.reduce((n, p) => n + p.n, 0)).toBe(vivas);
  });

  it("marca al lead que nadie esta trabajando", () => {
    expect(r.sinAsignar).toBe(1);
    expect(r.alertas).toHaveLength(1);
  });
});
