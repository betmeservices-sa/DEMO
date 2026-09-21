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
const SIN_NUMERO = "Este cliente no tiene un número de WhatsApp conectado.";
/** Lo que contesta Meta en la próxima llamada. `null` = salió bien. */
let falla: string | null = null;
vi.mock("@/lib/wa-send", () => ({
  SIN_NUMERO,
  enviarPlantilla: async (to: string, name: string, _idioma: string, variables: string[]) => {
    if (falla) return { ok: false, error: falla };
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
  falla = null;
  process.env.CRON_SECRET = SECRETO;
  const g = globalThis as unknown as { __wa?: unknown };
  g.__wa = undefined;
  await import("@/lib/wa-store").then(async (m) => {
    m.clearHistory("grupoq");
    m.clearHistory("nissan");
  });
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

// ── El otro camino: la cita trae el mensaje adentro ──
//
// El seguimiento de Nissan nombra el carro por el que la persona preguntó, y
// eso solo se sabe al colgar. Así que el webhook decide el texto y lo deja
// escrito en la cita; acá lo único que se decide es si todavía hace falta.
describe("cuando el mensaje viene en la cita", () => {
  const NISSAN = "50370020002";
  const datosNissan = {
    plantilla: "nissan_seguimiento_llamada",
    idioma: "es",
    variables: ["Ana", "X-Trail"],
    texto: "Hola Ana, le saluda Sofía de Nissan.",
  };

  it("manda ESA plantilla, con ESAS variables", async () => {
    await agendarRecordatorio("nissan", NISSAN, -1, "plantilla", datosNissan);

    const d = (await (await pedir()).json()) as { enviados: number };
    expect(d.enviados).toBe(1);
    expect(enviadas[0].name).toBe("nissan_seguimiento_llamada");
    expect(enviadas[0].variables).toEqual(["Ana", "X-Trail"]);
  });

  it("no le escribe al que ya escribió él DESPUÉS de colgar", async () => {
    await agendarRecordatorio("nissan", NISSAN, -1, "plantilla", datosNissan);
    await addInbound({
      waId: "wamid.ya",
      from: NISSAN,
      texto: "sigo interesado",
      ts: new Date().toISOString(),
      tenant: "nissan",
    });

    const d = (await (await pedir()).json()) as { enviados: number };
    expect(d.enviados).toBe(0);
    expect(enviadas).toHaveLength(0);
  });

  it("pero lo que escribió ANTES de la llamada no lo frena", async () => {
    // Si el corte fuera "¿tiene algún mensaje?", a quien ya había escrito
    // alguna vez nunca le llegaría el seguimiento de su llamada.
    await addInbound({
      waId: "wamid.viejo",
      from: NISSAN,
      texto: "buenas, precio de la X-Trail?",
      ts: haceMin(45),
      tenant: "nissan",
    });
    await agendarRecordatorio("nissan", NISSAN, -1, "plantilla", datosNissan);

    const d = (await (await pedir()).json()) as { enviados: number };
    expect(d.enviados).toBe(1);
  });

  it("una cita vencida hace horas se CIERRA sin mandar nada", async () => {
    // "Gracias por su llamada" nueve horas tarde no es un seguimiento.
    await agendarRecordatorio("nissan", NISSAN, -9 * 60, "plantilla", datosNissan);

    const d = (await (await pedir()).json()) as { enviados: number; citas: number };
    expect(d.citas).toBe(1);
    expect(d.enviados).toBe(0);
    expect(enviadas).toHaveLength(0);
    expect(await citasVencidas(undefined, new Date()), "quedó abierta").toHaveLength(0);
  });

  it("atiende a los DOS clientes en la misma pasada", async () => {
    // La cola es una sola tabla con el cliente como columna. Si el barrido
    // fuera por cliente, cada cliente nuevo sería otro reloj que mantener.
    await addOutbound({
      waId: "wamid.req",
      to: TEL,
      texto: REQUISITOS.texto("Karla"),
      ts: haceMin(6),
      tenant: "grupoq",
    });
    await citaVencida();
    await agendarRecordatorio("nissan", NISSAN, -1, "plantilla", datosNissan);

    const d = (await (await pedir()).json()) as { citas: number; enviados: number };
    expect(d.citas).toBe(2);
    expect(d.enviados).toBe(2);
    expect(enviadas.map((e) => e.name).sort()).toEqual([
      "crediq_continuar_solicitud",
      "nissan_seguimiento_llamada",
    ]);
  });
});

// ── Cuando Meta dice que no ──
//
// Los dos "no" se parecen en el JSON y no se parecen en nada más: uno se pasa
// solo y el otro no se pasa nunca.
describe("qué se reintenta y qué no", () => {
  it("el cliente SIN NÚMERO conectado cierra la cita: reintentar no lo arregla", async () => {
    // Y cada reintento despierta a Vercel, que es lo que esta cola vino a
    // evitar: seis horas de esto son 360 invocaciones por una llamada.
    falla = SIN_NUMERO;
    await agendarRecordatorio("nissan", "50370020003", -1, "plantilla", {
      plantilla: "nissan_seguimiento_llamada",
      idioma: "es",
      variables: ["Ana", "X-Trail"],
      texto: "Hola Ana.",
    });

    const d = (await (await pedir()).json()) as { enviados: number; errores: number };
    expect(d.enviados).toBe(0);
    expect(d.errores, "no es un error nuestro, es configuración").toBe(0);
    expect(await citasVencidas(undefined, new Date()), "quedó abierta").toHaveLength(0);
  });

  it("un fallo cualquiera de Meta DEJA la cita viva para el siguiente intento", async () => {
    falla = "(#131047) Re-engagement message";
    await citaVencida();
    await addOutbound({
      waId: "wamid.req",
      to: TEL,
      texto: REQUISITOS.texto("Karla"),
      ts: haceMin(6),
      tenant: "grupoq",
    });

    const d = (await (await pedir()).json()) as { errores: number };
    expect(d.errores).toBe(1);
    expect(await citasVencidas("grupoq", new Date()), "se cerró y no debía").toHaveLength(1);
  });
});
