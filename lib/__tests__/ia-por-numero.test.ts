// El interruptor de la IA por NÚMERO de WhatsApp.
//
// El global es uno solo para todo el panel: prenderlo para Mia prendía a los
// agentes de Nissan, Grupo Q y el resto. Cada número conectado tiene el suyo
// (wa_connections.ia_activa), y el orden es: el chat, después el número,
// después el Modo IA del panel. Todo por panel: nada se le pega a otro cliente.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getSupabase: () => null, todosLosClientes: () => [] }));

import { getAiEnabled, getChatAiActiva, getChatOverride, setAiEnabled, setChatOverride } from "@/lib/ai-store";
import { fijarIaDeLosNumerosDe, guardarConexionWa, iaDeLosNumerosDe, olvidarConexionesWa } from "@/lib/wa-conexiones-store";

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
    await setAiEnabled("nissan", false);
    olvidarConexionesWa();
  });

  it("con el Modo IA del panel apagado, el número encendido contesta", async () => {
    expect(await getChatAiActiva("nissan", "503111", true)).toBe(true);
  });

  it("con el Modo IA del panel encendido, un número apagado no contesta", async () => {
    await setAiEnabled("nissan", true);
    expect(await getChatAiActiva("nissan", "503222", false)).toBe(false);
  });

  it("un número sin interruptor propio sigue al Modo IA de su panel", async () => {
    expect(await getChatAiActiva("nissan", "503333", null)).toBe(false);
    await setAiEnabled("nissan", true);
    expect(await getChatAiActiva("nissan", "503333", null)).toBe(true);
  });

  it("el chat manda sobre el número", async () => {
    await setChatOverride("nissan", "503444", false);
    expect(await getChatAiActiva("nissan", "503444", true)).toBe(false);
  });
});

// Cada panel es independiente. El 2026-10-07 una prueba en un panel dejó la IA
// encendida para un teléfono, y Mia le contestó a ese mismo teléfono en el
// número comercial, que tenía la IA apagada.
describe("un panel no mueve a otro", () => {
  beforeEach(() => olvidarConexionesWa());

  it("encender la IA en un chat de un panel no la enciende en otro", async () => {
    await setChatOverride("nissan", "50375550001", true);
    expect(await getChatAiActiva("nissan", "50375550001", false)).toBe(true);
    expect(await getChatAiActiva("comercial", "50375550001", false)).toBe(false);
    expect(await getChatOverride("comercial", "50375550001")).toBeNull();
  });

  it("apagarla en un panel no la apaga en otro", async () => {
    await setChatOverride("grupoq", "50375550002", false);
    expect(await getChatAiActiva("betme", "50375550002", true)).toBe(true);
  });

  it("el Modo IA de un panel no enciende a los demás", async () => {
    await setAiEnabled("hospital", true);
    await setAiEnabled("excel", false);
    expect(await getChatAiActiva("hospital", "50375550003", null)).toBe(true);
    expect(await getChatAiActiva("excel", "50375550003", null)).toBe(false);
    expect(await getAiEnabled("pizzahut")).toBe(false);
  });

  it("encender la IA de los números de un cliente no toca los de otro", async () => {
    await guardarConexionWa(numero("comercial", "10", false));
    await guardarConexionWa(numero("nissan", "11", false));
    await fijarIaDeLosNumerosDe("comercial", true);
    expect(await iaDeLosNumerosDe("comercial")).toBe(true);
    expect(await iaDeLosNumerosDe("nissan")).toBe(false);
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
