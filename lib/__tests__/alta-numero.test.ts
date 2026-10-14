import { describe, expect, it } from "vitest";
import {
  LINEAS_DEMO,
  PASOS,
  avanzar,
  codigoDeTranscript,
  codigoValido,
  conError,
  corridaNueva,
  lineaLegible,
  lineasDisponibles,
  normalizarLinea,
  segundos,
  waMe,
} from "@/lib/alta-numero";

describe("el codigo que dicta Meta", () => {
  it("lo saca del transcript real de la llamada del 2026-10-14", () => {
    // Tal cual lo transcribio Deepgram en la llamada de verificacion al
    // +503 2505 4609. La grabacion lo dice dos veces y el reconocedor mete
    // espacios y un punto en medio, asi que un \d{6} no encuentra nada.
    const real = "User: Tu código de verificación es 4 0 6 3 1 7. Su código de verificación es 4. 0 6 3 1 7.";
    expect(codigoDeTranscript(real)).toBe("406317");
  });

  it("acepta una sola lectura, sin repeticion", () => {
    expect(codigoDeTranscript("Tu código es 9 1 8 2 7 3")).toBe("918273");
  });

  it("se queda con la primera cuando las dos lecturas no coinciden", () => {
    expect(codigoDeTranscript("es 1 2 3 4 5 6. Repito: 1 2 3 4 5 9.")).toBe("123456");
  });

  it("no cuenta los numeros que diga el agente", () => {
    const t = ["AI: Le marco en 2 minutos al 7539 1721.", "User: Tu código es 4 0 6 3 1 7."].join("\n");
    expect(codigoDeTranscript(t)).toBe("406317");
  });

  it("devuelve null cuando no hay seis digitos", () => {
    expect(codigoDeTranscript("Hola, no hay nadie.")).toBeNull();
    expect(codigoDeTranscript("Son 1 2 3")).toBeNull();
    expect(codigoDeTranscript(null)).toBeNull();
    expect(codigoDeTranscript("")).toBeNull();
  });

  it("solo valida seis digitos exactos", () => {
    expect(codigoValido("406317")).toBe(true);
    expect(codigoValido("40631")).toBe(false);
    expect(codigoValido("4063177")).toBe(false);
    expect(codigoValido("40631a")).toBe(false);
    expect(codigoValido(null)).toBe(false);
  });
});

describe("las lineas de la demo", () => {
  it("normaliza lo que venga, mientras sea de la serie", () => {
    expect(normalizarLinea("+50325054610")).toBe("+50325054610");
    expect(normalizarLinea("+503 2505 4610")).toBe("+50325054610");
    expect(normalizarLinea("25054610")).toBe("+50325054610");
    expect(normalizarLinea("2505-4610")).toBe("+50325054610");
  });

  it("rechaza lo que no es de la serie", () => {
    // El celular de pruebas del usuario no es una linea de la demo.
    expect(normalizarLinea("+50375391721")).toBeNull();
    expect(normalizarLinea("+50325054700")).toBeNull();
    expect(normalizarLinea("")).toBeNull();
    expect(normalizarLinea("hola")).toBeNull();
  });

  it("ofrece solo las que estan listas en Vapi y libres en WhatsApp", () => {
    const enVapi = ["+50325054610", "+50325054611", "+50325054612"];
    const yaEnWhatsApp = ["+503 2505 4611"];
    expect(lineasDisponibles(enVapi, yaEnWhatsApp)).toEqual(["+50325054610", "+50325054612"]);
  });

  it("no ofrece una linea sin agente en Vapi, aunque este libre en WhatsApp", () => {
    // Es la regla que importa: sin agente colgado, la llamada de Meta entra a
    // un numero muerto y el codigo se gasta.
    expect(lineasDisponibles([], [])).toEqual([]);
    expect(lineasDisponibles(["+50325054610"], [])).toEqual(["+50325054610"]);
  });

  it("nunca ofrece una linea fuera de la lista de la demo", () => {
    expect(lineasDisponibles(["+50325054607"], [])).toEqual([]);
    expect(LINEAS_DEMO).not.toContain("+50325054607");
  });

  it("las escribe como las lee la gente", () => {
    expect(lineaLegible("+50325054610")).toBe("+503 2505 4610");
    expect(waMe("+503 2505 4610")).toBe("https://wa.me/50325054610");
  });
});

describe("la corrida", () => {
  it("arranca corriendo, en el primer paso", () => {
    const c = corridaNueva("id-1", "+50325054610", new Date("2026-10-14T20:00:00Z"));
    expect(c.paso).toBe("linea");
    expect(c.estado).toBe("corriendo");
    expect(c.codigo).toBeNull();
    expect(c.marcas.linea).toBe("2026-10-14T20:00:00.000Z");
  });

  it("queda lista al llegar al ultimo paso", () => {
    let c = corridaNueva("id-2", "+50325054610");
    for (const p of PASOS) c = avanzar(c, p);
    expect(c.paso).toBe("conectado");
    expect(c.estado).toBe("listo");
    expect(c.terminadoEn).not.toBeNull();
  });

  it("no retrocede: los avisos de Vapi pueden llegar fuera de orden", () => {
    let c = corridaNueva("id-3", "+50325054610");
    c = avanzar(c, "verificado");
    c = avanzar(c, "alta");
    expect(c.paso).toBe("verificado");
  });

  it("cuenta los segundos desde que arranco y los congela al terminar", () => {
    const inicio = new Date("2026-10-14T20:00:00Z");
    let c = corridaNueva("id-4", "+50325054610", inicio);
    expect(segundos(c, Date.parse("2026-10-14T20:00:48Z"))).toBe(48);
    c = { ...c, terminadoEn: "2026-10-14T20:00:48.000Z" };
    expect(segundos(c, Date.parse("2026-10-14T21:00:00Z"))).toBe(48);
  });

  it("guarda el motivo cuando algo falla", () => {
    const c = conError(corridaNueva("id-5", "+50325054610"), "Meta dijo que no");
    expect(c.estado).toBe("error");
    expect(c.error).toBe("Meta dijo que no");
    expect(c.terminadoEn).not.toBeNull();
  });
});
