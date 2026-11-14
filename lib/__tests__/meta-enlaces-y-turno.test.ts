import { describe, expect, it } from "vitest";
import { textoDeMensajeGraph } from "@/lib/meta-sondeo-messenger";
import { compartidoDeTexto } from "@/lib/meta-texto-mensaje";
import { reclamarTurnoMeta } from "@/lib/meta-conversaciones";

// 2026-11-13, Facebook del hospital: el botón "Enviar mensaje" del saludo
// automático de Meta salía como "[compartió un enlace]" (sin enlace), y Valeria
// contestaba dos y tres veces el mismo mensaje.

describe("lo compartido en Messenger", () => {
  it("el botón del saludo automático no se muestra como enlace", () => {
    const t = textoDeMensajeGraph({ id: "m1", message: "", shares: { data: [{ name: "Enviar mensaje" }] } } as never);
    expect(t).toBe('[saludo automático de Meta: botón "Enviar mensaje"]');
  });

  it("un enlace de verdad trae la URL y la burbuja la puede abrir", () => {
    const t = textoDeMensajeGraph({
      id: "m2",
      message: "",
      shares: { data: [{ name: "Resultados en línea", link: "https://centroginecologico.com.sv/resultados" }] },
    } as never)!;
    expect(t).toBe("[compartió un enlace] Resultados en línea\nhttps://centroginecologico.com.sv/resultados");
    expect(compartidoDeTexto(t)).toMatchObject({
      rotulo: "Compartió un enlace",
      titulo: "Resultados en línea",
      url: "https://centroginecologico.com.sv/resultados",
    });
  });
});

describe("un solo turno por mensaje", () => {
  it("el mismo mensaje lo toma un solo turno; uno nuevo se vuelve a tomar", async () => {
    const clave = "facebook:547852531898434:123456789";
    const r = await Promise.all([1, 2, 3].map(() => reclamarTurnoMeta("prueba-turno", clave, "m_a")));
    expect(r.filter(Boolean)).toHaveLength(1);
    expect(await reclamarTurnoMeta("prueba-turno", clave, "m_a")).toBe(false);
    expect(await reclamarTurnoMeta("prueba-turno", clave, "m_b")).toBe(true);
  });
});
