import { describe, it, expect, beforeEach, vi } from "vitest";

// Sin base: el store de tickets trabaja en memoria y la conversación no se toca.
vi.mock("@/lib/supabase", () => ({ getSupabase: () => null, todosLosClientes: () => [] }));
vi.mock("@/lib/conv-store", () => ({ upsertConversacion: vi.fn(async () => ({})) }));

import { ejecutarHerramienta } from "@/lib/ai";
import { _resetTicketsMem, listarTickets } from "@/lib/tickets-store";
import { RESPONSABLE_LAB } from "@/lib/tickets-tenant";

// 2026-11-09: el panel del lab es solo del laboratorio y Verónica es la
// encargada. Antes los casos de Valeria nacían "Sin tomar" con el área
// "Laboratorio" (la etiqueta), y el filtro de área, que compara con el id, no
// los encontraba.

const TEL = "50377001122";
const ctx = { telefono: TEL, tenantId: "consultorio" as const };

beforeEach(() => _resetTicketsMem());

describe("los casos que abre Valeria en el WhatsApp del lab", () => {
  it("nacen asignados a Verónica, en el área laboratorio", async () => {
    const r = JSON.parse(
      await ejecutarHerramienta(
        "crear_ticket",
        { tipo: "cotizacion", titulo: "Cotización de vitamina D con ACSA", detalle: "Tiene ACSA." },
        undefined,
        ctx,
      ),
    ) as { ok: boolean };
    expect(r.ok).toBe(true);
    const t = (await listarTickets("consultorio")).find((x) => x.contactoTelefono === TEL)!;
    expect(t.asignadoA).toBe(RESPONSABLE_LAB);
    expect(t.estado).toBe("asignado");
    expect(t.area).toBe("laboratorio");
  });
});
