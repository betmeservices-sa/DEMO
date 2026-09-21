// El recordatorio de WhatsApp tras la llamada de CrediQ.
//
// POR QUÉ EXISTE ESTA PRUEBA. La decisión (decidirRecordatorio) estaba probada
// y bien, y aun así en producción no salió ni un mensaje: el barrido leía
// `ultimoPorConversacion` como si devolviera la lista de conversaciones, y
// devuelve `{ ultimos, cursor }`. Salía limpio sin haber mirado a nadie. Un
// recorrido que sale limpio sin trabajar es indistinguible de uno que sí
// trabajó, y por eso hay que probar la ruta y no solo la decisión.
//
// QUÉ CAMBIÓ. Ya no hay barrido: la llamada agenda una cita con la hora exacta
// y la ruta consume esa cola. Lo que estas pruebas cuidan ahora es que sin
// citas no se mire nada (que es el ahorro), que las citas se cierren aunque la
// decisión diga que no (si no, quedan vencidas para siempre) y que los frenos
// de la decisión sigan valiendo aunque la cita haya vencido.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getSupabase: () => null }));

const enviadas: { to: string; name: string; variables: string[] }[] = [];
vi.mock("@/lib/wa-send", () => ({
  enviarPlantilla: async (to: string, name: string, _idioma: string, variables: string[]) => {
    enviadas.push({ to, name, variables });
    return { ok: true, id: `wamid.${enviadas.length}` };
  },
}));

const { GET } = await import("@/app/api/cron/plantilla-recordatorio/route");
const { addOutbound, addInbound } = await import("@/lib/wa-store");
const { upsertContacto } = await import("@/lib/contacts-store");
const { REQUISITOS } = await import("@/lib/plantilla-tras-llamada");
const { agendarRecordatorio, citasVencidas, limpiarAgendaEnMemoria } = await import(
  "@/lib/recordatorios-agenda"
);

const SECRETO = "secreto-de-prueba";
const TEL = "50370020001";
const haceMin = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

function pedir(qs = "") {
  return GET(
    new Request(`https://demo.miagentia.com/api/cron/plantilla-recordatorio${qs}`, {
      headers: { authorization: `Bearer ${SECRETO}` },
    }),
  );
}

/** Deja la cita vencida: agendar con minutos negativos es "hace un rato". */
const citaVencida = (tel = TEL) => agendarRecordatorio("grupoq", tel, -1);

beforeEach(async () => {
  enviadas.length = 0;
  process.env.CRON_SECRET = SECRETO;
  const g = globalThis as unknown as { __wa?: unknown };
  g.__wa = undefined;
  await import("@/lib/wa-store").then((m) => m.clearHistory("grupoq"));
  limpiarAgendaEnMemoria();
  await upsertContacto({ from: "70020001", tenant: "grupoq", nombre: "Karla", apellido: "Menjívar" });
});

describe("a quién le manda el recordatorio", () => {
  it("al que recibió los requisitos hace 6 minutos y no contestó", async () => {
    await addOutbound({
      waId: "wamid.req",
      to: TEL,
      texto: REQUISITOS.texto("Karla"),
      ts: haceMin(6),
      tenant: "grupoq",
    });
    await citaVencida();

    const d = (await (await pedir()).json()) as { enviados: number; citas: number };
    expect(d.citas, "no miró ninguna cita").toBeGreaterThan(0);
    expect(d.enviados).toBe(1);
    expect(enviadas).toHaveLength(1);
    expect(enviadas[0].name).toBe("crediq_continuar_solicitud");
    expect(enviadas[0].variables).toEqual(["Karla"]);
  });

  it("al que CONTESTÓ no le manda nada, aunque la cita haya vencido", async () => {
    await addOutbound({
      waId: "wamid.req",
      to: TEL,
      texto: REQUISITOS.texto("Karla"),
      ts: haceMin(6),
      tenant: "grupoq",
    });
    await addInbound({
      waId: "wamid.in",
      from: TEL,
      texto: "ok, ya se los mando",
      ts: haceMin(1),
      tenant: "grupoq",
    });
    await citaVencida();

    const d = (await (await pedir()).json()) as { enviados: number };
    expect(d.enviados).toBe(0);
    expect(enviadas).toHaveLength(0);
  });

  it("a quien nunca recibió los requisitos, no le manda nada", async () => {
    await addOutbound({
      waId: "wamid.x",
      to: TEL,
      texto: "Buenas, le saluda Sofía.",
      ts: haceMin(30),
      tenant: "grupoq",
    });
    await citaVencida();

    const d = (await (await pedir()).json()) as { enviados: number };
    expect(d.enviados).toBe(0);
  });
});

describe("la cola", () => {
  it("SIN CITAS no mira ninguna conversación: ese es el ahorro", async () => {
    // El hilo está listo para que le toque, pero nadie llamó. Antes esto
    // costaba una pasada por todas las conversaciones; ahora cuesta cero.
    await addOutbound({
      waId: "wamid.req",
      to: TEL,
      texto: REQUISITOS.texto("Karla"),
      ts: haceMin(6),
      tenant: "grupoq",
    });

    const d = (await (await pedir()).json()) as { citas: number; enviados: number };
    expect(d.citas).toBe(0);
    expect(d.enviados).toBe(0);
    expect(enviadas).toHaveLength(0);
  });

  it("la cita TODAVÍA NO VENCIDA no se toca", async () => {
    await addOutbound({
      waId: "wamid.req",
      to: TEL,
      texto: REQUISITOS.texto("Karla"),
      ts: haceMin(6),
      tenant: "grupoq",
    });
    await agendarRecordatorio("grupoq", TEL, 5);

    const d = (await (await pedir()).json()) as { citas: number; enviados: number };
    expect(d.citas).toBe(0);
    expect(enviadas).toHaveLength(0);
  });

  it("la cita se CIERRA aunque la decisión diga que no", async () => {
    // Sin esto la cita queda vencida para siempre y se vuelve a mirar en cada
    // pasada: exactamente el desperdicio que vinimos a quitar.
    await addOutbound({
      waId: "wamid.req",
      to: TEL,
      texto: REQUISITOS.texto("Karla"),
      ts: haceMin(6),
      tenant: "grupoq",
    });
    await addInbound({ waId: "wamid.in", from: TEL, texto: "gracias", ts: haceMin(1), tenant: "grupoq" });
    await citaVencida();

    await pedir();
    expect(await citasVencidas("grupoq", new Date()), "quedó abierta").toHaveLength(0);
  });

  it("dos llamadas seguidas dejan UNA sola cita", async () => {
    await agendarRecordatorio("grupoq", TEL, 1);
    await agendarRecordatorio("grupoq", TEL, 1);
    const todas = await citasVencidas("grupoq", new Date(Date.now() + 10 * 60_000));
    expect(todas).toHaveLength(1);
  });
});

describe("las dos puertas", () => {
  it("sin el secreto no pasa nadie", async () => {
    const r = await GET(new Request("https://demo.miagentia.com/api/cron/plantilla-recordatorio"));
    expect(r.status).toBe(401);
  });

  it("en seco dice a quién le tocaría y NO manda nada", async () => {
    await addOutbound({
      waId: "wamid.req",
      to: TEL,
      texto: REQUISITOS.texto("Karla"),
      ts: haceMin(6),
      tenant: "grupoq",
    });
    await citaVencida();

    const d = (await (await pedir("?seco=1")).json()) as {
      seco: boolean;
      enviados: number;
      detalle: string[];
    };
    expect(d.seco).toBe(true);
    expect(d.enviados).toBe(1);
    expect(d.detalle[0]).toContain("[SECO]");
    expect(enviadas, "en seco NO se manda").toHaveLength(0);
    expect(await citasVencidas("grupoq", new Date()), "en seco la cita NO se cierra").toHaveLength(1);
  });
});
