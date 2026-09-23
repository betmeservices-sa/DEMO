// El interruptor de la IA por NÚMERO de WhatsApp.
//
// El global es uno solo para todo el panel: prenderlo para Mia prendía a los
// agentes de Nissan, Grupo Q y el resto. Cada número conectado tiene el suyo
// (wa_connections.ia_activa), y el orden es: el chat, después el número,
// después el global.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getSupabase: () => null, todosLosClientes: () => [] }));

import { getChatAiActiva, setAiEnabled, setChatOverride } from "@/lib/ai-store";
import { guardarConexionWa, iaDeLosNumerosDe, olvidarConexionesWa } from "@/lib/wa-conexiones-store";

const numero = (tenant: string, phoneNumberId: string, iaActiva: boolean | null) => ({
  tenant,
  wabaId: "w",
  phoneNumberId,
  displayPhone: null,
  verifiedName: null,
  accessToken: "t",
  iaActiva,
});

describe("quién decide si la IA contesta", () => {
  beforeEach(async () => {
    await setAiEnabled(false);
    olvidarConexionesWa();
  });

  it("con el global apagado, el número encendido contesta", async () => {
    expect(await getChatAiActiva("503111", true)).toBe(true);
  });

  it("con el global encendido, un número apagado no contesta", async () => {
    await setAiEnabled(true);
    expect(await getChatAiActiva("503222", false)).toBe(false);
  });

  it("un número sin interruptor propio sigue al global, como siempre", async () => {
    expect(await getChatAiActiva("503333", null)).toBe(false);
    await setAiEnabled(true);
    expect(await getChatAiActiva("503333", null)).toBe(true);
  });

  it("el chat manda sobre el número", async () => {
    await setChatOverride("503444", false);
    expect(await getChatAiActiva("503444", true)).toBe(false);
  });
});

describe("el interruptor de los números de un cliente", () => {
  beforeEach(() => olvidarConexionesWa());

  it("sin número propio, o sin interruptor, sigue al global", async () => {
    expect(await iaDeLosNumerosDe("miagentia")).toBeNull();
    await guardarConexionWa(numero("miagentia", "1", null));
    expect(await iaDeLosNumerosDe("miagentia")).toBeNull();
  });

  it("encendido en su número, encendido; y no se le pega a otro cliente", async () => {
    await guardarConexionWa(numero("miagentia", "1", true));
    await guardarConexionWa(numero("betme", "2", null));
    expect(await iaDeLosNumerosDe("miagentia")).toBe(true);
    expect(await iaDeLosNumerosDe("betme")).toBeNull();
  });
});
