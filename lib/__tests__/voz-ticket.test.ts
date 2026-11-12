import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Sin base: el store de tickets trabaja en memoria.
vi.mock("@/lib/supabase", () => ({ getSupabase: () => null, todosLosClientes: () => [] }));

import { POST } from "@/app/api/webhooks/vapi/ticket/route";
import { _resetTicketsMem, listarTickets } from "@/lib/tickets-store";
import { RESPONSABLE_LAB } from "@/lib/tickets-tenant";
import { DESTINOS_VOZ, cierreDeCasoVoz, telefonoDelCaso, ticketDeLlamada } from "@/lib/voz-ticket";

// Evaluaciones de Valeria del 2026-11-09: "no creó ticket cuando correspondía"
// en 17 de 23 llamadas. La voz decía "tomo nota" y no tenía con qué abrir el
// caso; ahora tiene crear_ticket, igual que el WhatsApp del lab.

const SECRETO = "secreto-de-prueba-voz";
let antes: string | undefined;

beforeEach(() => {
  _resetTicketsMem();
  antes = process.env.VAPI_MEMORIA_SECRET;
  process.env.VAPI_MEMORIA_SECRET = SECRETO;
});
afterEach(() => {
  if (antes === undefined) delete process.env.VAPI_MEMORIA_SECRET;
  else process.env.VAPI_MEMORIA_SECRET = antes;
});

function llamada(args: Record<string, unknown>, panel = "laboratorio", numero = "+50325086064", secreto = SECRETO) {
  return new Request(`http://panel.test/api/webhooks/vapi/ticket?panel=${panel}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-vapi-secret": secreto },
    body: JSON.stringify({
      message: {
        type: "tool-calls",
        call: { id: "call_1", customer: { number: numero } },
        toolCallList: [{ id: "tc_1", function: { name: "crear_ticket", arguments: args } }],
      },
    }),
  });
}

async function resultado(res: Response): Promise<Record<string, unknown>> {
  const json = (await res.json()) as { results: { toolCallId: string; result: string }[] };
  expect(json.results[0].toolCallId).toBe("tc_1");
  return JSON.parse(json.results[0].result) as Record<string, unknown>;
}

describe("crear_ticket desde una llamada", () => {
  it("abre el caso en el lab, a nombre de Verónica, con el teléfono de la llamada", async () => {
    const r = await resultado(
      await POST(
        llamada({
          tipo: "resultados",
          titulo: "Pide sus resultados del hemograma del martes",
          detalle: "Paciente María López; se tomó el hemograma el martes en Escalón.",
          nombre: "María López",
        }),
      ),
    );
    expect(r.ok).toBe(true);
    expect(String(r.cierre)).toContain("le contacta a ese número");
    const [t] = await listarTickets("consultorio");
    expect(t.origen).toBe("llamada");
    expect(t.area).toBe("laboratorio");
    expect(t.asignadoA).toBe(RESPONSABLE_LAB);
    expect(t.estado).toBe("asignado");
    expect(t.contactoTelefono).toBe("50325086064");
    expect(t.contactoNombre).toBe("María López");
    expect(t.detalle).toContain("desde 50325086064");
  });

  it("si la persona dio otro número, el caso va a ese y conserva el de la llamada", async () => {
    await POST(llamada({ tipo: "cotizacion", titulo: "Cotizar con Mapfre", detalle: "Vitamina D con Mapfre.", telefono: "7123 4567" }));
    const [t] = await listarTickets("consultorio");
    expect(t.contactoTelefono).toBe("50371234567");
    expect(t.detalle).toContain("desde 50325086064");
  });

  it("un segundo llamado por lo mismo en la misma llamada va como nota, no como otro caso", async () => {
    await POST(llamada({ tipo: "queja", titulo: "Queja por demora", detalle: "Esperó dos horas." }));
    const r = await resultado(await POST(llamada({ tipo: "queja", titulo: "Queja por demora", detalle: "Se llama Ana." })));
    expect(r.ya_existia).toBe(true);
    const todos = await listarTickets("consultorio");
    expect(todos).toHaveLength(1);
    expect(todos[0].notas.map((n) => n.texto).join(" ")).toContain("Se llama Ana.");
  });

  it("Ultrasonografía abre el caso en el panel de Imagenología", async () => {
    await POST(llamada({ tipo: "resultados", titulo: "Resultados de su mamografía", detalle: "Mamografía del lunes." }, "imagenologia"));
    const [t] = await listarTickets("imagenologia");
    expect(t.area).toBe("recepcion");
    expect(await listarTickets("consultorio")).toHaveLength(0);
  });

  it("sin secreto 401 y con un panel desconocido 400", async () => {
    expect((await POST(llamada({ tipo: "otro" }, "laboratorio", "+50325086064", "malo"))).status).toBe(401);
    expect((await POST(llamada({ tipo: "otro" }, "hospital"))).status).toBe(400);
  });

  it("otra herramienta no abre nada", async () => {
    const req = new Request("http://panel.test/api/webhooks/vapi/ticket?panel=laboratorio", {
      method: "POST",
      headers: { "content-type": "application/json", "x-vapi-secret": SECRETO },
      body: JSON.stringify({ message: { type: "tool-calls", toolCallList: [{ id: "x", function: { name: "buscar_en_base", arguments: {} } }] } }),
    });
    expect(((await (await POST(req)).json()) as { results: unknown[] }).results).toEqual([]);
    expect(await listarTickets("consultorio")).toHaveLength(0);
  });
});

describe("piezas puras", () => {
  it("un tipo que no existe cae en 'otro' y sin título no queda vacío", () => {
    const t = ticketDeLlamada({ tipo: "inventado" }, DESTINOS_VOZ.laboratorio, "+50325086064");
    expect(t.tipo).toBe("otro");
    expect(t.titulo).toBe("Caso de una llamada");
    expect(t.contactoNombre).toBe("Sin nombre");
  });

  it("el teléfono: el dictado gana, si no el de la llamada; un número oculto queda sin teléfono", () => {
    expect(telefonoDelCaso("7539-1721", "+50325086064")).toBe("50375391721");
    expect(telefonoDelCaso("", "+50325086064")).toBe("50325086064");
    expect(telefonoDelCaso(undefined, "anonymous")).toBeUndefined();
  });

  it("el cierre dice desde cuándo fuera del horario de la sucursal (hora de El Salvador)", () => {
    const lab = DESTINOS_VOZ.laboratorio;
    // Jueves 12/11/2026: 10:00 a.m. SV = 16:00 UTC; 8:00 p.m. SV = 02:00 UTC del viernes.
    expect(cierreDeCasoVoz(lab, new Date("2026-11-12T16:00:00Z"))).toBe("Una compañera del laboratorio le contacta a ese número lo antes posible.");
    expect(cierreDeCasoVoz(lab, new Date("2026-11-13T02:00:00Z"))).toContain("mañana a partir de las seis");
    expect(cierreDeCasoVoz(lab, new Date("2026-11-12T10:00:00Z"))).toContain("a partir de las seis de la mañana");
  });
});
