// La memoria del agente de voz entre llamadas.
//
// Lo que se protege acá es que el agente no suene a fichero. Un dato mal
// fundido (un modelo que se pierde, un "no especificado" que se cuela) termina
// saliendo por el parlante en una llamada real.
import { describe, it, expect } from "vitest";
import {
  contextoParaAgente,
  FRASES_HOSPITAL,
  fundir,
  normalizarTelefono,
  type MemoriaLlamada,
} from "@/lib/memoria-llamadas";
import { extraerHospital, notaHospital } from "@/lib/memoria-hospital";

const AHORA = Date.parse("2026-08-21T18:00:00.000Z");
const hace = (dias: number) => new Date(AHORA - dias * 86_400_000).toISOString();

describe("el teléfono como llave", () => {
  it("la misma persona es la misma venga como venga marcada", () => {
    const esperado = "75391721";
    expect(normalizarTelefono("+50375391721")).toBe(esperado);
    expect(normalizarTelefono("50375391721")).toBe(esperado);
    expect(normalizarTelefono("7539-1721")).toBe(esperado);
    expect(normalizarTelefono("7539 1721")).toBe(esperado);
    expect(normalizarTelefono("(503) 7539 1721")).toBe(esperado);
  });

  it("no explota con basura", () => {
    expect(normalizarTelefono("")).toBe("");
    expect(normalizarTelefono("anonimo")).toBe("");
  });
});

describe("fundir lo nuevo con lo viejo", () => {
  const previo: MemoriaLlamada = {
    tenant: "toyota",
    telefono: "75391721",
    nombre: "Roberto Mendoza",
    modelos: ["Rav cuatro"],
    uso: "la familia",
    pago: "financiamiento",
    agendo: false,
    resumen: "Preguntó precios y quedó de pensarlo.",
    llamadas: 1,
    ultima: hace(3),
  };

  it("cuenta la visita y pone los modelos nuevos adelante", () => {
    const m = fundir(previo, { modelos: ["Corolla Cross"] }, { tenant: "toyota", telefono: "75391721", ahora: hace(0) });
    expect(m.llamadas).toBe(2);
    expect(m.modelos).toEqual(["Corolla Cross", "Rav cuatro"]);
  });

  it("un campo vacío NO borra lo que ya se sabía", () => {
    // Que en esta llamada no se hable del uso no significa que haya dejado de
    // ser para la familia.
    const m = fundir(previo, { modelos: ["Hilux"] }, { tenant: "toyota", telefono: "75391721" });
    expect(m.uso).toBe("la familia");
    expect(m.nombre).toBe("Roberto Mendoza");
    expect(m.pago).toBe("financiamiento");
  });

  it("lo nuevo pisa a lo viejo cuando de verdad viene", () => {
    const m = fundir(previo, { uso: "el trabajo", pago: "contado" }, { tenant: "toyota", telefono: "75391721" });
    expect(m.uso).toBe("el trabajo");
    expect(m.pago).toBe("contado");
  });

  it("no repite un modelo que ya estaba", () => {
    const m = fundir(previo, { modelos: ["Rav cuatro"] }, { tenant: "toyota", telefono: "75391721" });
    expect(m.modelos).toEqual(["Rav cuatro"]);
  });

  it("recorta la cola: nadie necesita ocho modelos de hace meses", () => {
    const cargado = { ...previo, modelos: ["A", "B", "C", "D"] };
    const m = fundir(cargado, { modelos: ["E"] }, { tenant: "toyota", telefono: "75391721" });
    expect(m.modelos).toHaveLength(4);
    expect(m.modelos[0]).toBe("E");
  });

  it("la cita agendada no se pierde en la llamada siguiente", () => {
    const conCita = { ...previo, agendo: true };
    const m = fundir(conCita, { modelos: ["Yaris"] }, { tenant: "toyota", telefono: "75391721" });
    expect(m.agendo).toBe(true);
  });

  it("la primera llamada de un número desconocido arranca en uno", () => {
    const m = fundir(null, { nombre: "Ana", modelos: ["Raize"] }, { tenant: "toyota", telefono: "75391721" });
    expect(m.llamadas).toBe(1);
    expect(m.nombre).toBe("Ana");
  });
});

describe("el párrafo que recibe el agente", () => {
  it("con un número nuevo le dice explícitamente que no mencione historial", () => {
    const t = contextoParaAgente(null);
    expect(t).toContain("primera vez");
    expect(t).toContain("no menciones");
  });

  it("arma una frase natural, no una ficha de campos", () => {
    const t = contextoParaAgente(
      {
        tenant: "toyota",
        telefono: "75391721",
        nombre: "Roberto Mendoza",
        modelos: ["Rav cuatro"],
        uso: "la familia",
        pago: "financiamiento",
        agendo: false,
        resumen: "Quedó de pensarlo.",
        llamadas: 2,
        ultima: hace(3),
      },
      AHORA,
    );
    expect(t).toContain("Ya llamó 2 veces");
    expect(t).toContain("hace 3 días");
    expect(t).toContain("Roberto Mendoza");
    expect(t).toContain("Rav cuatro");
    expect(t).toContain("para la familia");
    // Y sobre todo: le recuerda que no lo recite.
    expect(t).toContain("no para que lo recites");
    // Nada de sintaxis de base de datos, que es lo que dispara el tono robótico.
    expect(t).not.toMatch(/[:|]\s*(familia|financiamiento)/);
  });

  it("dice el tiempo como lo diría una persona", () => {
    const base: MemoriaLlamada = {
      tenant: "toyota", telefono: "1", nombre: undefined, modelos: [], uso: undefined,
      pago: undefined, agendo: false, resumen: "", llamadas: 1, ultima: hace(0),
    };
    expect(contextoParaAgente({ ...base, ultima: hace(0) }, AHORA)).toContain("hoy mismo");
    expect(contextoParaAgente({ ...base, ultima: hace(1) }, AHORA)).toContain("ayer");
    expect(contextoParaAgente({ ...base, ultima: hace(4) }, AHORA)).toContain("hace 4 días");
    expect(contextoParaAgente({ ...base, ultima: hace(10) }, AHORA)).toContain("hace una semana");
    expect(contextoParaAgente({ ...base, ultima: hace(70) }, AHORA)).toContain("meses");
  });

  it("cuenta los días por calendario de El Salvador y reconoce al que volvió a marcar", () => {
    const base: MemoriaLlamada = {
      tenant: "gineco", telefono: "1", modelos: [], agendo: false, resumen: "", llamadas: 1, ultima: hace(0),
    };
    // AHORA es mediodía en El Salvador. Anoche a las 11:30 p. m. es AYER,
    // aunque hayan pasado menos de 24 horas.
    expect(contextoParaAgente({ ...base, ultima: "2026-08-21T05:30:00.000Z" }, AHORA)).toContain("ayer");
    // Esta mañana a las 8 es hoy, y no "hace un rato".
    const manana = contextoParaAgente({ ...base, ultima: "2026-08-21T14:00:00.000Z" }, AHORA);
    expect(manana).toContain("hoy mismo");
    expect(manana).not.toContain("hace un rato");
    // Se cortó hace 40 minutos y volvió a marcar.
    expect(contextoParaAgente({ ...base, ultima: new Date(AHORA - 40 * 60_000).toISOString() }, AHORA)).toContain(
      "hoy mismo, hace un rato",
    );
  });

  it("en el hospital nombra todo lo que consultó y le dice cómo retomarlo", () => {
    const t = contextoParaAgente(
      {
        tenant: "gineco", telefono: "75391721", modelos: ["hemograma", "prueba de embarazo en sangre"], agendo: false,
        resumen: "Preguntó al laboratorio por el hemograma y la prueba de embarazo en sangre; se cortó la llamada.",
        llamadas: 1, ultima: new Date(AHORA - 60 * 60_000).toISOString(),
      },
      AHORA,
      FRASES_HOSPITAL,
    );
    expect(t).toContain("hace un rato");
    expect(t).toContain("hemograma y prueba de embarazo en sangre");
    expect(t).toContain("De la última llamada");
    expect(t).toContain("le sigue interesando");
    expect(t).toContain("búscalos otra vez");
    expect(t).not.toContain("como mucho UNA cosa");
  });

  it("omite lo que no sabe en vez de inventar un hueco", () => {
    const t = contextoParaAgente(
      {
        tenant: "toyota", telefono: "1", modelos: ["Hilux"], agendo: false,
        resumen: "", llamadas: 1, ultima: hace(2),
      } as MemoriaLlamada,
      AHORA,
    );
    expect(t).toContain("Hilux");
    expect(t).not.toContain("undefined");
    expect(t).not.toContain("Se llama");
    expect(t).not.toContain("La quería para");
  });

  it("con dos modelos nombra los dos, no una lista larga", () => {
    const t = contextoParaAgente(
      {
        tenant: "toyota", telefono: "1", modelos: ["Rav cuatro", "Corolla Cross", "Hilux"],
        agendo: false, resumen: "", llamadas: 3, ultima: hace(5),
      } as MemoriaLlamada,
      AHORA,
    );
    expect(t).toContain("Rav cuatro y Corolla Cross");
    expect(t).not.toContain("Hilux");
  });
});

describe("lo que guardan los agentes de voz del hospital", () => {
  it("se queda con los estudios concretos, no con categorías", () => {
    // En Ultras y en el Lab `temas` son "precio" u "horario": no sirven para retomar.
    const e = extraerHospital({ temas: ["precio"], estudios: ["hemograma", "prueba de embarazo en sangre"] });
    expect(e.modelos).toEqual(["hemograma", "prueba de embarazo en sangre"]);
    // Recepción, antes del cambio, solo mandaba `temas`.
    expect(extraerHospital({ temas: ["control prenatal"] }).modelos).toEqual(["control prenatal"]);
  });

  it("una llamada que se cortó sin consulta no pisa el resumen de la anterior", () => {
    expect(extraerHospital({}, "La persona colgó sin decir nada.").resumen).toBeUndefined();
    expect(extraerHospital({ estudios: ["ultra 4D"] }, "Preguntó el precio de la ultra 4D.").resumen).toBe(
      "Preguntó el precio de la ultra 4D.",
    );
  });

  it("la nota de la ficha habla del hospital, no de pagar un carro", () => {
    const n = notaHospital({ modelos: ["hemograma", "TSH"], pago: "la doctora Rivas" });
    expect(n).toBe("Consultó por hemograma, TSH; se atiende con la doctora Rivas.");
    expect(notaHospital({})).toBeUndefined();
  });
});
