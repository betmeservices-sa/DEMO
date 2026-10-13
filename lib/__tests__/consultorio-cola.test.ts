// La segunda flecha del circuito doctor → laboratorio → doctor: quien pagó
// sus exámenes hoy le aparece al doctor como la persona que sigue, y lo que la
// clínica sabe de un teléfono se junta en su ficha de Contactos.
//
// Lo que se cuida: que la cola no muestre a quien pagó ayer ni a quien es de
// otro doctor, que salga de la cola cuando el doctor ya la atendió, y que la
// nota de la consulta (interna) no se le enseñe al paciente ni abra nada en el
// mostrador.
import { beforeEach, describe, expect, it } from "vitest";
import { armarCola, esHoySV, pacienteDeTurno, ultimos8 } from "@/lib/consultorio/cola";
import { armarHistorial } from "@/lib/consultorio/historial";
import { armarPortal } from "@/lib/consultorio/portal";
import {
  crearTurno,
  documentoPorCodigo,
  guardarDocumento,
  listarDoctores,
  listarSucursales,
  registrarPaciente,
} from "@/lib/consultorio/almacen";
import type { Documento, Paciente, Turno } from "@/lib/consultorio/tipos";

const SUCURSALES = listarSucursales();
const DOCTORES = listarDoctores();

// Un martes a las 10:30 de la mañana en El Salvador (UTC-6).
const AHORA = new Date("2026-10-13T16:30:00.000Z");

const paciente = (id: string, doctorId: string, telefono: string, creado = "2026-10-13T14:00:00.000Z"): Paciente => ({
  id,
  doctorId,
  nombre: `Paciente ${id}`,
  telefono,
  correo: "",
  nacimiento: null,
  sexo: null,
  motivo: "Control",
  alergias: "",
  creado,
});

const turno = (id: string, extra: Partial<Turno>): Turno => ({
  id,
  sucursalId: "suc_escalon",
  numero: 1,
  nombre: "Alguien",
  telefono: "77112233",
  correo: "",
  examenes: ["e01001", "e01002"],
  hechos: ["e01001", "e01002"],
  codigo: "ABCDE-123456",
  estado: "atendido",
  creado: "2026-10-13T15:00:00.000Z",
  abierto: null,
  segundos: 120,
  cerrado: "2026-10-13T15:40:00.000Z",
  monto: 18,
  factura: "ES-261013-001",
  pacienteId: null,
  ...extra,
});

const nota = (pacienteId: string, fecha: string, doctorId = "dr_moran"): Documento => ({
  id: `nota_${pacienteId}_${fecha}`,
  tipo: "nota",
  pacienteId,
  doctorId,
  fecha,
  codigo: "NOTAX-000001",
  texto: "Llegó con resultados. Todo en rango.",
  enviado: null,
});

beforeEach(() => {
  (globalThis as unknown as { __consultorio?: unknown }).__consultorio = {
    pacientes: [],
    documentos: [],
    turnos: [],
  };
});

describe("la cola del doctor", () => {
  it("quien pagó hoy y es del doctor aparece como siguiente", () => {
    const p = paciente("pac_1", "dr_moran", "77112233");
    const cola = armarCola("dr_moran", [turno("t1", { pacienteId: "pac_1" })], [p], [], SUCURSALES, AHORA);
    expect(cola).toHaveLength(1);
    expect(cola[0].paciente.id).toBe("pac_1");
    expect(cola[0].factura).toBe("ES-261013-001");
    expect(cola[0].unidad).toBe("Laboratorio Escalón");
    expect(cola[0].examenes).toHaveLength(2);
  });

  it("sin expediente amarrado, lo encuentra por teléfono aunque lo escriban distinto", () => {
    const p = paciente("pac_1", "dr_moran", "+503 7711 2233");
    const cola = armarCola("dr_moran", [turno("t1", { telefono: "77112233" })], [p], [], SUCURSALES, AHORA);
    expect(cola.map((c) => c.paciente.id)).toEqual(["pac_1"]);
    expect(pacienteDeTurno(turno("t2", { telefono: "50377112233" }), [p])?.id).toBe("pac_1");
    expect(ultimos8("+503 7711-2233")).toBe("77112233");
  });

  it("no mete al que pagó ayer ni al que todavía no pagó", () => {
    const p = paciente("pac_1", "dr_moran", "77112233");
    const ayer = turno("t1", { pacienteId: "pac_1", cerrado: "2026-10-12T20:00:00.000Z" });
    const pendiente = turno("t2", { pacienteId: "pac_1", estado: "pendiente", factura: null });
    expect(armarCola("dr_moran", [ayer, pendiente], [p], [], SUCURSALES, AHORA)).toEqual([]);
  });

  it("el día es el de El Salvador: las 11 de la noche de hoy todavía es hoy", () => {
    // 2026-10-14T05:30Z son las 11:30 p. m. del 13 en El Salvador.
    expect(esHoySV("2026-10-14T05:30:00.000Z", AHORA)).toBe(true);
    expect(esHoySV("2026-10-14T06:30:00.000Z", AHORA)).toBe(false);
  });

  it("no mete al paciente de otro doctor", () => {
    const p = paciente("pac_1", "dr_rivas", "77112233");
    expect(armarCola("dr_moran", [turno("t1", { pacienteId: "pac_1" })], [p], [], SUCURSALES, AHORA)).toEqual([]);
  });

  it("sale de la cola cuando el doctor le deja algo escrito después de pagar", () => {
    const p = paciente("pac_1", "dr_moran", "77112233");
    const t = turno("t1", { pacienteId: "pac_1" });
    const antes = nota("pac_1", "2026-10-13T14:30:00.000Z");
    const despues = nota("pac_1", "2026-10-13T16:00:00.000Z");
    expect(armarCola("dr_moran", [t], [p], [antes], SUCURSALES, AHORA)).toHaveLength(1);
    expect(armarCola("dr_moran", [t], [p], [despues], SUCURSALES, AHORA)).toEqual([]);
    // Lo que le escribió OTRO doctor no cuenta como atendido.
    expect(armarCola("dr_moran", [t], [p], [nota("pac_1", "2026-10-13T16:00:00.000Z", "dr_rivas")], SUCURSALES, AHORA)).toHaveLength(1);
  });

  it("el que pagó primero va primero", () => {
    const a = paciente("pac_a", "dr_moran", "77000001");
    const b = paciente("pac_b", "dr_moran", "77000002");
    const cola = armarCola(
      "dr_moran",
      [
        turno("t_b", { pacienteId: "pac_b", cerrado: "2026-10-13T16:10:00.000Z", factura: "ES-261013-002" }),
        turno("t_a", { pacienteId: "pac_a", cerrado: "2026-10-13T15:50:00.000Z" }),
      ],
      [a, b],
      [],
      SUCURSALES,
      AHORA,
    );
    expect(cola.map((c) => c.paciente.id)).toEqual(["pac_a", "pac_b"]);
  });

  it("el turno que nace de una orden queda amarrado al expediente", async () => {
    const { paciente: p } = await registrarPaciente({
      doctorId: "dr_moran",
      nombre: "Marta Guzmán",
      telefono: "77124455",
      correo: "",
      nacimiento: null,
      sexo: null,
      motivo: "",
      alergias: "",
    });
    const t = await crearTurno({
      sucursalId: "suc_escalon",
      nombre: p.nombre,
      telefono: p.telefono,
      correo: "",
      examenes: ["e01001"],
      pacienteId: p.id,
    });
    expect(t.pacienteId).toBe(p.id);
    // Y sin orden, queda en null: se resuelve por teléfono al armar la cola.
    const suelto = await crearTurno({
      sucursalId: "suc_escalon",
      nombre: "Otro",
      telefono: "70000000",
      correo: "",
      examenes: ["e01001"],
    });
    expect(suelto.pacienteId).toBeNull();
  });
});

describe("la nota de la consulta", () => {
  it("el portal no se la enseña al paciente", () => {
    const p = paciente("pac_1", "dr_moran", "77112233");
    const receta: Documento = {
      id: "rec_1",
      tipo: "receta",
      pacienteId: "pac_1",
      doctorId: "dr_moran",
      fecha: "2026-10-13T15:00:00.000Z",
      codigo: "RECET-000001",
      medicamentos: [{ nombre: "Metformina", dosis: "", frecuencia: "", duracion: "" }],
      indicaciones: "",
      enviado: null,
    };
    const portal = armarPortal([p], [nota("pac_1", "2026-10-13T16:00:00.000Z"), receta], DOCTORES, SUCURSALES);
    expect(portal.documentos.map((d) => d.tipo)).toEqual(["receta"]);
    expect(portal.secciones.map((s) => s.id)).toEqual(["receta"]);
  });

  it("su código no abre nada en el mostrador", async () => {
    await guardarDocumento(nota("pac_1", "2026-10-13T16:00:00.000Z"));
    expect(await documentoPorCodigo("NOTAX-000001")).toBeNull();
  });
});

describe("el historial del paciente", () => {
  it("junta registros, exámenes, facturas y documentos del mismo teléfono", () => {
    const p = paciente("pac_1", "dr_moran", "+503 7711 2233", "2026-10-01T14:00:00.000Z");
    const ajeno = paciente("pac_2", "dr_rivas", "70000000");
    const t = turno("t1", { telefono: "77112233" });
    const deOtro = turno("t2", { telefono: "70000000", factura: "ES-261013-002" });
    const h = armarHistorial(
      "77112233",
      [p, ajeno],
      [t, deOtro],
      [nota("pac_1", "2026-10-13T16:00:00.000Z"), nota("pac_2", "2026-10-13T16:00:00.000Z")],
      DOCTORES,
      SUCURSALES,
    );
    expect(h.registros).toEqual([{ doctor: "Dra. Alejandra Morán", creado: p.creado, motivo: "Control" }]);
    expect(h.examenes).toHaveLength(1);
    expect(h.examenes[0].unidad).toBe("Laboratorio Escalón");
    expect(h.examenes[0].examenes).toHaveLength(2);
    expect(h.examenes[0].pendientes).toBe(0);
    expect(h.facturas).toEqual([
      { fecha: t.cerrado, numero: "ES-261013-001", monto: 18, unidad: "Laboratorio Escalón" },
    ]);
    expect(h.documentos).toHaveLength(1);
    expect(h.documentos[0].tipo).toBe("nota");
    expect(h.documentos[0].resumen).toBe("Llegó con resultados. Todo en rango.");
    expect(h.documentos[0].codigo).toBe("");
  });

  it("sin nada, las tres listas van vacías", () => {
    const h = armarHistorial("77112233", [], [], [], DOCTORES, SUCURSALES);
    expect(h).toEqual({ registros: [], examenes: [], facturas: [], documentos: [] });
  });
});
