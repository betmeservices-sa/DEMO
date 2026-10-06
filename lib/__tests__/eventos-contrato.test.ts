// El mapeo del end-of-call-report de Daniela a una propuesta del tablero.
//
// El payload de abajo tiene la forma de lo que manda la plataforma de voz al
// colgar: `message.analysis.structuredData` con los campos del contrato,
// resumen, transcripción, grabación, número y horas. Se prueba también lo que
// el modelo suele mandar torcido ("5,000", "Sí", "Concierto") y el respaldo
// por `artifact.structuredOutputs`.
import { describe, expect, it } from "vitest";
import { mapearReporte, normalizarDatos, tipoDeMensaje, idDePropuesta } from "@/lib/eventos/contrato";
import { datosFaltantes } from "@/lib/eventos/prioridad";

const AHORA = "2026-10-06T18:00:00.000Z";

function reporte(structuredData: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    message: {
      type: "end-of-call-report",
      endedReason: "customer-ended-call",
      startedAt: "2026-10-06T17:51:00.000Z",
      endedAt: "2026-10-06T17:55:30.000Z",
      durationSeconds: 270,
      call: {
        id: "call-abc-123",
        assistantId: "87bbe17c-8851-41a2-b7bd-443b3554ad08",
        customer: { number: "+50391234567" },
      },
      analysis: {
        summary: "Organizador de un concierto en el Estadio Cuscatlán invita a Pizza Hut a vender.",
        structuredData,
      },
      artifact: {
        transcript: "AI: Gracias por llamar a Pizza Hut.\nUser: Buenas, le hablo por un concierto.",
        recordingUrl: "https://storage.example/recording.wav",
      },
      ...extra,
    },
  };
}

const COMPLETA = {
  tipo_evento: "concierto",
  nombre_evento: "Noche de Bandas",
  descripcion_evento: "Seis bandas nacionales",
  fecha_inicio: "2026-11-28",
  fecha_fin: "",
  horario: "4:00 p. m. a 12:00 a. m.",
  recinto: "Estadio Cuscatlán",
  municipio: "San Salvador",
  departamento: "San Salvador",
  espacio: "aire_libre",
  aforo_esperado: 18000,
  evento_recurrente: false,
  asistencia_anterior: 0,
  perfil_publico: "Jóvenes de 18 a 40",
  tipo_entrada: "con_boleto",
  precio_boleto: 25,
  modalidad: "venta_en_sitio",
  condicion_comercial: "cuota_mas_comision",
  monto_cuota: 2500,
  porcentaje_comision: 10,
  exclusividad_pizza: "si",
  otros_vendedores_comida: 14,
  tamano_espacio: "6 x 4 metros",
  energia_electrica: "incluida",
  agua: "no_incluida",
  toldo_mobiliario: "no_incluido",
  montaje: "Desde las 8:00",
  permisos_a_cargo_de: "organizador",
  medios_de_pago: "Efectivo y tarjeta",
  promocion_de_marca: "Logo en pantalla",
  fecha_limite_respuesta: "2026-10-20",
  contacto_nombre: "Diego Arévalo",
  contacto_cargo: "Productor",
  contacto_empresa: "Volcán Azul",
  contacto_telefono: "9120-4415",
  contacto_correo: "Diego@VolcanAzul.example",
  contacto_horario: "Mañanas",
  contacto_canal: "whatsapp",
  es_propuesta_de_evento: true,
  notas: "",
};

describe("mapeo del end-of-call-report", () => {
  it("solo actúa en end-of-call-report", () => {
    expect(tipoDeMensaje({ message: { type: "status-update" } })).toBe("status-update");
    const r = mapearReporte({ message: { type: "status-update", call: { id: "x" } } }, AHORA);
    expect(r.llamada).toBeNull();
    expect(r.propuesta).toBeNull();
  });

  it("arma la llamada y la propuesta con los campos del contrato", () => {
    const r = mapearReporte(reporte(COMPLETA), AHORA);
    expect(r.llamada).toMatchObject({
      id: "call-abc-123",
      assistantId: "87bbe17c-8851-41a2-b7bd-443b3554ad08",
      numero: "+50391234567",
      duracionSeg: 270,
      esPropuesta: true,
      motivo: "propuesta",
      grabacion: true,
      fuente: "structuredData",
    });
    expect(r.llamada?.transcripcion).toContain("Pizza Hut");
    expect(r.urlsGrabacion).toEqual(["https://storage.example/recording.wav"]);

    const p = r.propuesta!;
    expect(p.id).toBe(idDePropuesta("call-abc-123"));
    expect(p.etapa).toBe("nueva");
    expect(p.canal).toBe("llamada");
    expect(p.creada).toBe("2026-10-06T17:55:30.000Z");
    expect(p.resumen).toContain("Estadio Cuscatlán");
    expect(p.datos.aforo_esperado).toBe(18000);
    expect(p.datos.contacto_telefono).toBe("91204415");
    expect(p.datos.contacto_correo).toBe("diego@volcanazul.example");
    expect(p.datos.condicion_comercial).toBe("cuota_mas_comision");
    expect(datosFaltantes(p.datos)).toEqual([]);
  });

  it("es idempotente por id: el mismo reporte da la misma propuesta", () => {
    const a = mapearReporte(reporte(COMPLETA), AHORA);
    const b = mapearReporte(reporte(COMPLETA), AHORA);
    expect(a.propuesta?.id).toBe(b.propuesta?.id);
    expect(a.llamada?.id).toBe(b.llamada?.id);
  });

  it("si no era propuesta, cuenta la llamada pero no crea propuesta", () => {
    const r = mapearReporte(
      reporte({ es_propuesta_de_evento: false }, { analysis: { summary: "Quería hacer un pedido a domicilio." } }),
      AHORA,
    );
    expect(r.llamada?.esPropuesta).toBe(false);
    expect(r.llamada?.motivo).toBe("pedido");
    expect(r.propuesta).toBeNull();
  });

  it("una llamada muy corta no crea propuesta", () => {
    const r = mapearReporte(reporte(COMPLETA, { durationSeconds: 8, startedAt: "2026-10-06T17:55:22.000Z" }), AHORA);
    expect(r.propuesta).toBeNull();
    expect(r.sinPropuesta).toMatch(/corta/);
    expect(r.llamada).not.toBeNull();
  });

  it("con datos a medias crea la propuesta igual y el teléfono vacío es el que llamó", () => {
    const r = mapearReporte(
      reporte({ es_propuesta_de_evento: true, tipo_evento: "fiesta_patronal", recinto: "Parque Libertad", contacto_telefono: "" }),
      AHORA,
    );
    const p = r.propuesta!;
    expect(p).not.toBeNull();
    expect(p.datos.contacto_telefono).toBe("91234567");
    const faltan = datosFaltantes(p.datos).map((f) => f.campo);
    expect(faltan).toContain("fecha_inicio");
    expect(faltan).toContain("aforo_esperado");
    expect(faltan).toContain("condicion_comercial");
    expect(faltan).not.toContain("contacto_telefono");
  });

  it("lee de artifact.structuredOutputs si structuredData viene vacío", () => {
    const body = reporte({});
    (body.message as Record<string, unknown>).artifact = {
      structuredOutputs: {
        "uuid-1": { name: "propuesta_evento", result: { tipo_evento: "deportivo", aforo_esperado: 3000, es_propuesta_de_evento: true } },
        "uuid-2": { name: "contacto_nombre", result: "Patricia Lemus" },
      },
    };
    const r = mapearReporte(body, AHORA);
    expect(r.llamada?.fuente).toBe("structuredOutputs");
    expect(r.propuesta?.datos.tipo_evento).toBe("deportivo");
    expect(r.propuesta?.datos.aforo_esperado).toBe(3000);
    expect(r.propuesta?.datos.contacto_nombre).toBe("Patricia Lemus");
  });

  it("marca la llamada de prueba por metadata", () => {
    const body = reporte(COMPLETA);
    (body.message.call as Record<string, unknown>).metadata = { prueba: true };
    const r = mapearReporte(body, AHORA);
    expect(r.llamada?.prueba).toBe(true);
    expect(r.propuesta?.prueba).toBe(true);
  });
});

describe("normalización defensiva", () => {
  it("entiende números, booleanos y opciones escritas de otra forma", () => {
    const d = normalizarDatos({
      tipo_evento: "Fiesta Patronal",
      aforo_esperado: "5,000",
      monto_cuota: "$1,200.50",
      porcentaje_comision: "150",
      evento_recurrente: "Sí",
      exclusividad_pizza: "SI",
      energia_electrica: "No incluida",
      fecha_inicio: "2026-11-31",
      contacto_telefono: "+503 7000-0000",
      espacio: "algo raro",
      modalidad: null,
    });
    expect(d.tipo_evento).toBe("fiesta_patronal");
    expect(d.aforo_esperado).toBe(5000);
    expect(d.monto_cuota).toBe(1200.5);
    expect(d.porcentaje_comision).toBe(100);
    expect(d.evento_recurrente).toBe(true);
    expect(d.exclusividad_pizza).toBe("si");
    expect(d.energia_electrica).toBe("no_incluida");
    expect(d.fecha_inicio).toBe("");
    expect(d.contacto_telefono).toBe("70000000");
    expect(d.espacio).toBe("");
    expect(d.modalidad).toBe("por_definir");
  });

  it("lo que no se entiende queda vacío y nunca revienta", () => {
    expect(() => normalizarDatos(undefined)).not.toThrow();
    const d = normalizarDatos({ aforo_esperado: "mucha gente", nombre_evento: "null" });
    expect(d.aforo_esperado).toBe(0);
    expect(d.nombre_evento).toBe("");
  });
});
