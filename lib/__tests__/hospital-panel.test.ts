import { describe, it, expect } from "vitest";
import { armarPanelHospital, claveDiaSV, type MensajePanel } from "@/lib/hospital-panel";
import { RESPONSABLE_HOSPITAL } from "@/lib/tickets-tenant";

// "Ahora": 2026-10-07 18:30 en El Salvador (UTC-6) = 00:30Z del día 8.
const AHORA = new Date("2026-10-08T00:30:00Z");
const h = (hhmm: string, dia = "2026-10-07") => {
  // Hora local de El Salvador a ISO con zona.
  return new Date(`${dia}T${hhmm}:00-06:00`).toISOString();
};

function msg(from: string, direccion: "in" | "out", ts: string, extra: Partial<MensajePanel> = {}): MensajePanel {
  return { from, direccion, ts, manual: false, nombre: from === "1" ? "Ana" : null, texto: "hola", ...extra };
}

describe("el panel del hospital corta los días en hora de El Salvador", () => {
  it("las 11 de la noche en San Salvador siguen siendo ese día, aunque en UTC ya sea el siguiente", () => {
    expect(claveDiaSV("2026-10-08T05:30:00Z")).toBe("2026-10-07");
    expect(claveDiaSV("2026-10-08T06:00:00Z")).toBe("2026-10-08");
  });
});

describe("conversaciones y mensajes de hoy", () => {
  it("una conversación es un teléfono distinto que escribió hoy, no un mensaje", () => {
    const p = armarPanelHospital(
      [msg("1", "in", h("09:00")), msg("1", "in", h("09:01")), msg("2", "in", h("10:00")), msg("3", "in", h("17:00", "2026-10-06"))],
      [],
      [],
      AHORA,
    );
    expect(p.hoy.conversaciones).toBe(2);
    expect(p.hoy.mensajesEntrantes).toBe(3);
    // Ayer hubo 1, hoy 2: +100 %.
    expect(p.hoy.deltaPct).toBe(100);
  });

  it("separa lo que contestó Claudia de lo que contestó una persona", () => {
    const p = armarPanelHospital(
      [
        msg("1", "in", h("09:00")),
        msg("1", "out", h("09:01")),
        msg("2", "in", h("10:00")),
        msg("2", "out", h("10:05"), { manual: true }),
        msg("3", "in", h("11:00")),
      ],
      [],
      [],
      AHORA,
    );
    expect(p.hoy.respondidasPorIA).toBe(1);
    expect(p.hoy.atendidasPorPersona).toBe(1);
  });
});

describe("quién espera respuesta", () => {
  it("lista los chats cuyo último mensaje es de la persona, del que más lleva esperando al que menos", () => {
    const p = armarPanelHospital(
      [
        msg("1", "in", h("16:00")), // lleva 2 h 30
        msg("2", "in", h("18:00")), // 30 min
        msg("3", "in", h("12:00")),
        msg("3", "out", h("12:01")), // contestado: no espera
        msg("4", "in", h("18:29")), // 1 min: todavía no cuenta
      ],
      [],
      [],
      AHORA,
    );
    expect(p.esperan.map((e) => e.from)).toEqual(["1", "2"]);
    expect(p.esperan[0].minutos).toBe(150);
    expect(p.esperan[0].nombre).toBe("Ana");
  });

  it("un chat marcado como resuelto en el panel ya no espera", () => {
    const p = armarPanelHospital([msg("1", "in", h("16:00"))], [{ from: "1", estado: "resuelto", asignadoA: null }], [], AHORA);
    expect(p.esperan).toEqual([]);
  });
});

describe("tiempo de respuesta de Claudia", () => {
  it("es la mediana de lo que tarda en contestar cada mensaje, y una persona no cuenta", () => {
    const p = armarPanelHospital(
      [
        msg("1", "in", "2026-10-07T15:00:00.000Z"),
        msg("1", "out", "2026-10-07T15:00:10.000Z"),
        msg("2", "in", "2026-10-07T16:00:00.000Z"),
        msg("2", "out", "2026-10-07T16:00:20.000Z"),
        msg("3", "in", "2026-10-07T17:00:00.000Z"),
        msg("3", "out", "2026-10-07T17:00:30.000Z"),
        msg("4", "in", "2026-10-07T18:00:00.000Z"),
        msg("4", "out", "2026-10-07T18:40:00.000Z", { manual: true }), // una persona, 40 min: fuera
      ],
      [],
      [],
      AHORA,
    );
    expect(p.semana.respuestaMedianaSeg).toBe(20);
    expect(p.semana.pctIA).toBe(75);
  });
});

describe("por día y por hora", () => {
  it("trae 14 días siempre, con ceros, y cuenta los mensajes por hora local", () => {
    const p = armarPanelHospital([msg("1", "in", h("08:15")), msg("2", "in", h("08:45")), msg("3", "in", h("17:10"))], [], [], AHORA);
    expect(p.porDia).toHaveLength(14);
    expect(p.porDia.at(-1)).toMatchObject({ dia: "2026-10-07", conversaciones: 3, entrantes: 3 });
    expect(p.porDia[0].entrantes).toBe(0);
    expect(p.porHora[8]).toBe(2);
    expect(p.porHora[17]).toBe(1);
    expect(p.porHora.reduce((a, b) => a + b, 0)).toBe(3);
  });
});

describe("tickets", () => {
  it("cuenta los de la responsable, los sin tomar y los resueltos hoy", () => {
    const p = armarPanelHospital(
      [],
      [],
      [
        { estado: "asignado", tipo: "cita", asignadoA: RESPONSABLE_HOSPITAL, creado: h("09:00") },
        { estado: "en_proceso", tipo: "queja", asignadoA: RESPONSABLE_HOSPITAL, creado: h("09:30") },
        { estado: "abierto", tipo: "cita", asignadoA: null, creado: h("10:00") },
        { estado: "resuelto", tipo: "informacion", asignadoA: RESPONSABLE_HOSPITAL, creado: h("08:00"), resuelto: h("11:00") },
        { estado: "resuelto", tipo: "informacion", asignadoA: RESPONSABLE_HOSPITAL, creado: h("08:00", "2026-10-06"), resuelto: h("11:00", "2026-10-06") },
      ],
      AHORA,
    );
    expect(p.tickets).toMatchObject({ sinTomar: 1, deResponsable: 2, enProceso: 1, resueltosHoy: 1 });
    expect(p.tickets.abiertosPorTipo).toEqual([
      { tipo: "cita", label: "Cita", n: 2 },
      { tipo: "queja", label: "Queja", n: 1 },
    ]);
  });
});
