import { describe, it, expect, beforeEach, vi } from "vitest";

// Sin base: el store de tickets trabaja en memoria y la conversación no se toca.
vi.mock("@/lib/supabase", () => ({ getSupabase: () => null, todosLosClientes: () => [] }));
vi.mock("@/lib/conv-store", () => ({ upsertConversacion: vi.fn(async () => ({})) }));

import { ejecutarHerramienta } from "@/lib/ai";
import { _resetTicketsMem, cambiarEstado, listarTickets, ticketAbiertoDe } from "@/lib/tickets-store";

// El 2026-10-08 una paciente preguntó por un estudio, después dio su nombre y
// después el día: Claudia llamó crear_ticket cuatro veces y a Marielos le
// quedaron cuatro casos iguales en once minutos.

const TEL = "50375212154";
const ctx = { telefono: TEL, tenantId: "hospital" as const };

async function abrir(input: Record<string, unknown>) {
  return JSON.parse(await ejecutarHerramienta("crear_ticket", input, undefined, ctx)) as {
    ok: boolean;
    numero: number;
    ya_existia?: boolean;
  };
}

async function deLaPaciente() {
  return (await listarTickets("hospital")).filter((t) => t.contactoTelefono === TEL);
}

beforeEach(() => _resetTicketsMem());

describe("un asunto, un caso", () => {
  it("la segunda llamada con el mismo teléfono y tipo no abre otro: lo nuevo va como nota del primero", async () => {
    const r1 = await abrir({
      tipo: "informacion",
      titulo: "Pregunta si hacen radiografía de tórax",
      detalle: "Pregunta si hacen radiografía de tórax y electrocardiograma.",
    });
    const r2 = await abrir({
      tipo: "informacion",
      titulo: "Radiografía de tórax para el lunes 12",
      detalle: "Ana Gloria Perez la quiere para el lunes 12 de octubre.",
      nombre: "Ana Gloria Perez",
    });
    expect(r1.ok).toBe(true);
    expect(r2).toMatchObject({ ok: true, numero: r1.numero, ya_existia: true });

    const tickets = await deLaPaciente();
    expect(tickets).toHaveLength(1);
    expect(tickets[0].notas.map((n) => n.texto)).toEqual(["Ana Gloria Perez la quiere para el lunes 12 de octubre."]);
    expect(tickets[0].notas[0].autor).toBe("Claudia");
  });

  it("otro tipo de caso del mismo teléfono sí es otro caso", async () => {
    await abrir({ tipo: "informacion", titulo: "Pregunta por un estudio", detalle: "x" });
    const r = await abrir({ tipo: "queja", titulo: "Se queja de la espera", detalle: "y" });
    expect(r.ya_existia).toBeUndefined();
    expect(await deLaPaciente()).toHaveLength(2);
  });

  it("un caso ya resuelto no frena uno nuevo del mismo tipo", async () => {
    const r1 = await abrir({ tipo: "informacion", titulo: "Pregunta por un estudio", detalle: "x" });
    const primero = (await deLaPaciente()).find((t) => t.numero === r1.numero)!;
    await cambiarEstado("hospital", primero.id, "resuelto");
    const r2 = await abrir({ tipo: "informacion", titulo: "Pregunta por otro estudio", detalle: "z" });
    expect(r2.ya_existia).toBeUndefined();
    expect(r2.numero).not.toBe(r1.numero);
    expect(await ticketAbiertoDe("hospital", TEL, "informacion")).toMatchObject({ numero: r2.numero });
  });

  it("sin teléfono (una simulación) no busca repetidos y abre el caso", async () => {
    const r = JSON.parse(
      await ejecutarHerramienta("crear_ticket", { tipo: "informacion", titulo: "a", detalle: "b" }, undefined, {
        tenantId: "hospital",
      }),
    ) as { ok: boolean; ya_existia?: boolean };
    expect(r.ok).toBe(true);
    expect(r.ya_existia).toBeUndefined();
  });
});
