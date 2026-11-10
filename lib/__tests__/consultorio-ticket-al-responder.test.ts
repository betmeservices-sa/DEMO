import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Sin base ni WhatsApp de verdad: el store de tickets trabaja en memoria y el
// envío sale "bien" sin tocar Meta.
vi.mock("@/lib/supabase", () => ({ getSupabase: () => null, todosLosClientes: () => [] }));
vi.mock("@/lib/wa-send", () => ({ enviarTextoWa: vi.fn(async () => ({ ok: true, id: "wamid.prueba" })) }));
const { addOutbound } = vi.hoisted(() => ({ addOutbound: vi.fn(async (_m: Record<string, unknown>) => {}) }));
vi.mock("@/lib/wa-store", () => ({ addOutbound }));
vi.mock("@/lib/ai-store", () => ({ setChatOverride: vi.fn(async () => {}) }));

import { POST } from "@/app/api/whatsapp/send/route";
import { crearSesion, SESSION_COOKIE } from "@/lib/session";
import { _resetTicketsMem, crearTicket, listarTickets } from "@/lib/tickets-store";
import type { TenantId } from "@/lib/tenants/types";

// 2026-11-09, pedido del usuario con el tablero del lab en pantalla: los casos
// de Verónica quedaban "Asignado" aunque ya le hubiera contestado a la persona,
// porque cerrarlos era ir a otra pantalla. En el lab, contestar cierra el caso.

const TEL = "50361528463";
const OTRO = "50370001111";
const ORIGINAL = { ...process.env };

beforeEach(() => {
  _resetTicketsMem();
  process.env.USUARIOS_PRUEBA = "vero@lab.test|x|consultorio|recepcion|Verónica";
});
afterEach(() => {
  process.env = { ...ORIGINAL };
});

async function caso(tenant: string, telefono: string) {
  return crearTicket(tenant, {
    titulo: "Cuál prueba de embarazo en sangre es más certera",
    detalle: "",
    tipo: "informacion",
    origen: "chat",
    creadoPor: "Valeria",
    contactoNombre: "Paciente",
    contactoTelefono: telefono,
    area: "laboratorio",
    asignadoA: "lab-veronica",
  });
}

async function contestar(tenant: TenantId, cuerpo: Record<string, unknown>) {
  const s = await crearSesion(tenant, "recepcion", true, "vero@lab.test");
  const r = await POST(
    new Request("http://demo.test/api/whatsapp/send", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `${SESSION_COOKIE}=${s!.valor}` },
      body: JSON.stringify(cuerpo),
    }),
  );
  return (await r.json()) as { ok: boolean; casosCerrados?: number[] };
}

const estadoDe = async (tenant: string, id: string) => (await listarTickets(tenant)).find((t) => t.id === id)!;

describe("contestar desde el panel del lab", () => {
  it("cierra el caso de esa persona, con una nota de quién y por qué", async () => {
    const t = await caso("consultorio", TEL);
    const d = await contestar("consultorio", { to: TEL, text: "La cuantitativa es la más certera.", manual: true });
    expect(d.ok).toBe(true);
    expect(d.casosCerrados).toEqual([t.numero]);
    const ahora = await estadoDe("consultorio", t.id);
    expect(ahora.estado).toBe("resuelto");
    expect(ahora.resuelto).toBeTruthy();
    expect(ahora.notas.at(-1)).toMatchObject({ autor: "Verónica", texto: "Se le respondió en el chat." });
    // Y el mensaje queda a su nombre: el dashboard separa a Valeria del equipo.
    expect(addOutbound.mock.calls.at(-1)![0]).toMatchObject({ to: TEL, staffNombre: "Verónica" });
  });

  it("no toca los casos de otra persona", async () => {
    const ajeno = await caso("consultorio", OTRO);
    await caso("consultorio", TEL);
    await contestar("consultorio", { to: TEL, text: "Listo.", manual: true });
    expect((await estadoDe("consultorio", ajeno.id)).estado).toBe("asignado");
  });

  it("un envío que no escribió una persona no cierra nada", async () => {
    const t = await caso("consultorio", TEL);
    const d = await contestar("consultorio", { to: TEL, text: "Hola" });
    expect(d.casosCerrados).toEqual([]);
    expect((await estadoDe("consultorio", t.id)).estado).toBe("asignado");
  });

  it("en el resto de paneles contestar no cierra casos", async () => {
    const t = await caso("hospital", TEL);
    const d = await contestar("hospital", { to: TEL, text: "Hola", manual: true });
    expect(d.casosCerrados).toEqual([]);
    expect((await estadoDe("hospital", t.id)).estado).toBe("asignado");
  });
});
