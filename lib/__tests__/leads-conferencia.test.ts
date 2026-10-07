// Los leads de las landings de conferencia: las cuentas de la pantalla /leads.
import { describe, expect, it } from "vitest";
import { diaSV, filtrarLeads, leadsACsv, resumirLeads, telefonoDeLead, whatsappDe, type LeadConferencia } from "@/lib/leads-conferencia";

function lead(p: Partial<LeadConferencia>): LeadConferencia {
  return {
    id: p.id ?? Math.random().toString(36).slice(2),
    creado_en: "2026-10-07T15:00:00Z",
    tipo: "datos",
    asesora: "Sandra",
    landing: "/sandra",
    origen: "conferencia-qr",
    nombre: "María López",
    empresa: null,
    cargo: null,
    telefono: null,
    correo: null,
    interes: null,
    mensaje: null,
    consentimiento: true,
    utm: null,
    ...p,
  };
}

describe("diaSV", () => {
  it("cuenta el dia en El Salvador, no en UTC", () => {
    // 7 oct 02:30 UTC = 6 oct 8:30 p. m. en El Salvador (UTC-6).
    expect(diaSV("2026-10-07T02:30:00Z")).toBe("2026-10-06");
    expect(diaSV("2026-10-07T06:00:00Z")).toBe("2026-10-07");
  });
});

describe("resumirLeads", () => {
  it("separa hoy, tipos y asesoras", () => {
    const leads = [
      lead({ creado_en: "2026-10-07T15:00:00Z", asesora: "Andrea" }),
      lead({ creado_en: "2026-10-07T16:00:00Z", asesora: "Sandra", tipo: "llamada-demo" }),
      lead({ creado_en: "2026-10-07T17:00:00Z", asesora: "Andrea" }),
      // Noche del 6 en El Salvador aunque en UTC ya sea 7: no es de hoy.
      lead({ creado_en: "2026-10-07T03:00:00Z", asesora: null }),
    ];
    const r = resumirLeads(leads, "2026-10-07");
    expect(r).toEqual({
      total: 4,
      hoy: 3,
      datos: 3,
      llamadas: 1,
      porAsesora: [
        { asesora: "Andrea", total: 2 },
        { asesora: "Sandra", total: 1 },
      ],
    });
  });

  it("sin leads da ceros", () => {
    expect(resumirLeads([], "2026-10-07")).toEqual({ total: 0, hoy: 0, datos: 0, llamadas: 0, porAsesora: [] });
  });
});

describe("filtrarLeads", () => {
  const leads = [
    lead({ id: "a", asesora: "Andrea", nombre: "Carlos Pérez", empresa: "Hotel Sol", telefono: "+50370001111" }),
    lead({ id: "b", asesora: "Sandra", tipo: "llamada-demo", nombre: "Ana Ruiz", correo: "ana@clinica.com" }),
  ];

  it("por asesora y tipo", () => {
    expect(filtrarLeads(leads, { asesora: "Andrea", tipo: "todos", texto: "" }).map((l) => l.id)).toEqual(["a"]);
    expect(filtrarLeads(leads, { asesora: "todas", tipo: "llamada-demo", texto: "" }).map((l) => l.id)).toEqual(["b"]);
  });

  it("busca en nombre, empresa, telefono y correo sin importar mayusculas", () => {
    expect(filtrarLeads(leads, { asesora: "todas", tipo: "todos", texto: "hotel sol" }).map((l) => l.id)).toEqual(["a"]);
    expect(filtrarLeads(leads, { asesora: "todas", tipo: "todos", texto: "7000" }).map((l) => l.id)).toEqual(["a"]);
    expect(filtrarLeads(leads, { asesora: "todas", tipo: "todos", texto: "CLINICA" }).map((l) => l.id)).toEqual(["b"]);
    expect(filtrarLeads(leads, { asesora: "todas", tipo: "todos", texto: "7000-1111" }).map((l) => l.id)).toEqual(["a"]);
  });
});

describe("telefonoDeLead", () => {
  it("El Salvador sin codigo, el resto de Centroamerica con el suyo", () => {
    expect(telefonoDeLead("+50375391721")).toBe("7539-1721");
    expect(telefonoDeLead("+50257881234")).toBe("+502 5788-1234");
  });

  it("lo que no reconoce lo deja como vino", () => {
    expect(telefonoDeLead("+5215512345678")).toBe("+5215512345678");
    expect(telefonoDeLead(null)).toBe("");
  });
});

describe("whatsappDe", () => {
  it("deja solo los digitos con el codigo de pais", () => {
    expect(whatsappDe("+503 7539-1721")).toBe("50375391721");
  });

  it("sin numero util no arma enlace", () => {
    expect(whatsappDe(null)).toBeNull();
    expect(whatsappDe("+503")).toBeNull();
  });
});

describe("leadsACsv", () => {
  it("escapa comillas, pone la hora de El Salvador y el tipo legible", () => {
    const csv = leadsACsv([lead({ creado_en: "2026-10-07T16:05:00Z", nombre: 'Ana "La Jefa"', utm: { utm_source: "qr" } })]);
    const [cabecera, fila] = csv.split("\r\n");
    expect(cabecera.startsWith("fecha_sv,tipo,asesora,nombre")).toBe(true);
    expect(fila).toContain('"Ana ""La Jefa"""');
    expect(fila).toContain("10:05");
    expect(fila).toContain('"Dejó sus datos"');
    expect(fila).toContain('"{""utm_source"":""qr""}"');
  });
});
