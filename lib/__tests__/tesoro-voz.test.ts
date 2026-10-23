// Marina por teléfono: la recepcionista de voz de Tesoro Beach. Que su guion
// diga lo mismo que muestra el panel (habitaciones y tarifas), que lo que
// anota de cada llamada llegue al tablero como apartado y ticket, y que su
// línea no se cruce con otro panel.
import { describe, expect, it } from "vitest";
import { TENANTS } from "@/lib/tenants";
import { assistantIdsDeTenant, soloDelTenant, tenantDeAssistant, veModuloVoz } from "@/lib/tenants/voz";
import { MODULOS_HOTEL_MUESTRA } from "@/lib/modulos";
import { modulosDeHotelMuestra } from "@/lib/hotel-muestra/registro";
import { TESORO } from "@/lib/hotel-muestra/tesoro";
import { NAWI } from "@/lib/hotel-muestra/nawi";
import { precioNoche, totalEstadia } from "@/lib/hotel-muestra/libro";
import { tarifaFinde } from "@/lib/hotel-muestra/tarifas";
import { armarVista } from "@/lib/hotel-muestra/vista";
import { diaSV, diaSemana, sumarDias } from "@/lib/hotel-muestra/fechas";
import {
  APARTADO_TELEFONO_MIN,
  datosDeLlamada,
  llamadaDeVapi,
  llamadasDeMuestra,
  type LlamadaHotel,
} from "@/lib/hotel-muestra/llamadas";
import {
  DESPEDIDA,
  FRASE_QUE_CUELGA,
  LINEA_MARINA,
  NOMBRE_ASISTENTE,
  NUMERO_MARINA,
  PRIMER_MENSAJE,
  TESORO_ASSISTANT_ID,
  armarGuion,
  configVapiTesoro,
} from "@/lib/tesoro-agente";
import type { VapiCall } from "@/lib/vapi";
import type { Movimiento } from "@/lib/hotel-muestra/tipos";

// Un miércoles a las 9:30 a. m. de El Salvador.
const AHORA = Date.parse("2026-10-21T15:30:00Z");
const HOY = diaSV(AHORA);
const GUION = armarGuion(TESORO.zonas, tarifaFinde);
const habs = TESORO.zonas.flatMap((z) => z.habitaciones);

/** Una llamada real como la devuelve Vapi, colgada hace `haceMin` minutos. */
function vapi(id: string, haceMin: number, structuredData: unknown, extra: Partial<VapiCall> = {}): VapiCall {
  const fin = AHORA - haceMin * 60_000;
  return {
    id,
    assistantId: TESORO_ASSISTANT_ID,
    status: "ended",
    customer: { number: "+50375391721" },
    startedAt: new Date(fin - 150_000).toISOString(),
    endedAt: new Date(fin).toISOString(),
    analysis: { summary: "Apartó una Doble.", structuredData },
    artifact: {
      messages: [
        { role: "system", message: "guion" },
        { role: "bot", message: "[curious] Hotel Tesoro Beach, le saluda Marina." },
        { role: "user", message: "Quiero una habitación." },
      ],
    },
    ...extra,
  };
}

const RESERVA_LINK = {
  motivo: "reserva",
  nombre: "Bryan Prueba",
  telefono: "7539-1721",
  fecha_llegada: "2026-10-27",
  fecha_salida: "2026-10-29",
  noches: 2,
  adultos: 2,
  habitacion: "doble",
  total_estimado: 170,
  forma_pago: "link_de_pago",
  reserva_apartada: true,
  requiere_asesor: true,
  siguiente_paso: "Llamarle para enviar el link de pago.",
  temas: ["precios", "pagos", "inventado"],
};

describe("tesoro: la línea de voz en el panel", () => {
  it("el menú suma Llamadas y Agentes después del chat interno; NAWI no", () => {
    expect(modulosDeHotelMuestra("tesoro")).toEqual([
      "bandeja", "mis-chats", "tickets", "contactos", "interno", "llamadas", "agentes", "dashboard", "ia",
    ]);
    expect(modulosDeHotelMuestra("nawi")).not.toContain("llamadas");
    expect([...MODULOS_HOTEL_MUESTRA]).not.toContain("llamadas");
  });

  it("Marina es SU agente: solo Tesoro ve sus llamadas", () => {
    expect(TESORO_ASSISTANT_ID).toMatch(/^[0-9a-f-]{36}$/);
    expect(TENANTS.tesoro.voz?.assistantId).toBe(TESORO_ASSISTANT_ID);
    expect(assistantIdsDeTenant("tesoro")).toEqual([TESORO_ASSISTANT_ID]);
    expect(tenantDeAssistant(TESORO_ASSISTANT_ID)).toBe("tesoro");
    expect(veModuloVoz("tesoro")).toBe(true);
    expect(veModuloVoz("nawi")).toBe(false);
    const mezcla = [{ assistantId: TESORO_ASSISTANT_ID }, { assistantId: "otro" }];
    expect(soloDelTenant(mezcla, "tesoro")).toHaveLength(1);
    expect(soloDelTenant(mezcla, "nawi")).toHaveLength(0);
  });

  it("la línea es la 2505-4620 en los dos formatos", () => {
    expect(TESORO.voz?.linea).toBe(LINEA_MARINA);
    expect(NUMERO_MARINA.replace("+503", "").replace(/(\d{4})(\d{4})/, "$1-$2")).toBe(LINEA_MARINA);
  });
});

describe("tesoro: el guion de Marina", () => {
  it("cita cada habitación con la tarifa del panel, entre semana y en fin de semana", () => {
    const martes = "2026-10-27";
    const viernes = "2026-10-30";
    for (const h of habs) {
      expect(GUION, h.nombre).toContain(
        `- ${h.nombre}: hasta ${h.capacidad} personas. $${precioNoche(h, martes)} la noche de domingo a jueves; $${precioNoche(h, viernes)} la noche de viernes o sábado.`,
      );
    }
  });

  it("responde lo que pidió el hotel: check in y check out, mascotas, comida de afuera, reservar y cómo se paga", () => {
    for (const s of [
      "Check in desde las tres de la tarde. Check out hasta las doce del mediodía.",
      "MASCOTAS",
      "COMIDA Y BEBIDAS DE AFUERA",
      "CÓMO SE TOMA UNA RESERVA",
      "transferencia bancaria o con tarjeta por medio de un link de pago",
      "un asesor de reservas le contacta a la brevedad posible para enviarle el link de pago y confirmar su reserva",
      "NUNCA pides ni aceptas números de tarjeta",
    ]) {
      expect(GUION, s).toContain(s);
    }
  });

  it("habla neutro: sin modismos ni guiones largos", () => {
    expect(GUION).not.toMatch(/—/);
    // "de una" como muletilla ("¡de una!"), no "el pago de una reserva".
    for (const m of [/cipote/, /chivo/, /pisto/, /simón/, /cabal/, /de una[,.!]/, /fíjese,/]) {
      expect(GUION.toLowerCase(), String(m)).not.toMatch(m);
    }
  });

  it("cuelga solo con la despedida: el saludo no la contiene", () => {
    expect(DESPEDIDA.toLowerCase()).toContain(FRASE_QUE_CUELGA);
    expect(PRIMER_MENSAJE.toLowerCase()).not.toContain(FRASE_QUE_CUELGA);
    expect(GUION).toContain(DESPEDIDA);
  });

  it("lo que se sube a Vapi: estándar de voz, nombre que entra en 40 y habitaciones con los ids del panel", () => {
    const c = configVapiTesoro(TESORO.zonas, tarifaFinde);
    expect(NOMBRE_ASISTENTE.length).toBeLessThanOrEqual(40);
    expect(c.model.model).toBe("gpt-5.6-luna");
    expect(c.voice).toMatchObject({ provider: "11labs", model: "eleven_v4_turbo", voiceId: "cQ7rlUiVL3ishf4Oo7t2" });
    expect(c.transcriber).toMatchObject({ provider: "deepgram", model: "nova-3", language: "es-419" });
    expect(c.endCallPhrases).toEqual([FRASE_QUE_CUELGA]);
    expect(c.analysisPlan.structuredDataPlan.schema.properties.habitacion.enum).toEqual([...habs.map((h) => h.id), ""]);
  });
});

describe("tesoro: de Vapi al panel", () => {
  it("lo anotado se revisa campo por campo: lo raro se descarta", () => {
    const d = datosDeLlamada({ ...RESERVA_LINK, motivo: "chisme", fecha_salida: "29/10", noches: -1 });
    expect(d.motivo).toBeUndefined();
    expect(d.fecha_salida).toBeUndefined();
    expect(d.noches).toBeUndefined();
    expect(d.telefono).toBe("75391721");
    expect(d.temas).toEqual(["precios", "pagos"]);
    expect(datosDeLlamada(null)).toEqual({});
    expect(datosDeLlamada("texto")).toEqual({});
  });

  it("la llamada trae su duración, su resumen y la conversación sin marcas de voz ni mensajes del sistema", () => {
    const l = llamadaDeVapi(vapi("c1", 5, RESERVA_LINK))!;
    expect(l.origen).toBe("real");
    expect(l.duracionSeg).toBe(150);
    expect(l.resumen).toBe("Apartó una Doble.");
    expect(l.enCurso).toBe(false);
    expect(l.turnos).toEqual([
      { quien: "agente", texto: "Hotel Tesoro Beach, le saluda Marina." },
      { quien: "cliente", texto: "Quiero una habitación." },
    ]);
  });

  it("una llamada que sigue en curso no deja ticket todavía", () => {
    const l = llamadaDeVapi(vapi("c2", 0, undefined, { status: "in-progress", endedAt: undefined, analysis: undefined }))!;
    expect(l.enCurso).toBe(true);
    const v = armarVista(TESORO, [], AHORA, HOY, [l]);
    expect(v.tickets.some((t) => t.id === "tesoro-ll-c2")).toBe(false);
  });

  it("una reserva por teléfono con link de pago deja el apartado y el ticket para el asesor", () => {
    const l = llamadaDeVapi(vapi("c3", 10, RESERVA_LINK))!;
    const v = armarVista(TESORO, [], AHORA, HOY, [l]);
    const a = v.apartados.find((x) => x.llamadaId === "c3")!;
    expect(a).toMatchObject({ canal: "Llamada", estado: "esperando_pago", huesped: "Bryan Prueba", habitacionId: "doble", desde: "2026-10-27", hasta: "2026-10-29", personas: 2 });
    expect(a.total).toBe(totalEstadia(habs.find((h) => h.id === "doble")!, "2026-10-27", 2));
    expect(a.quedanMin).toBe(APARTADO_TELEFONO_MIN - 10);
    expect(a.nota).toContain("link");
    const t = v.tickets.find((x) => x.id === "tesoro-ll-c3")!;
    expect(t).toMatchObject({ origen: "llamada", tipo: "pago", prioridad: "alta", area: "reservas", estado: "abierto", creadoPor: "Marina", contactoTelefono: "75391721" });
    expect(t.titulo).toContain("link de pago");
    expect(t.detalle).toContain("Siguiente paso:");
  });

  it("pasado un día el apartado se cae, pero el ticket sigue en la cola la semana", () => {
    const l = llamadaDeVapi(vapi("c4", APARTADO_TELEFONO_MIN + 5, RESERVA_LINK))!;
    const v = armarVista(TESORO, [], AHORA, HOY, [l]);
    expect(v.apartados.some((x) => x.llamadaId === "c4")).toBe(false);
    expect(v.tickets.some((x) => x.id === "tesoro-ll-c4")).toBe(true);
    const vieja = llamadaDeVapi(vapi("c5", 8 * 24 * 60, RESERVA_LINK))!;
    expect(armarVista(TESORO, [], AHORA, HOY, [vieja]).tickets.some((x) => x.id === "tesoro-ll-c5")).toBe(false);
  });

  it("confirmar el apartado telefónico mete la reserva al libro con su canal", () => {
    const l = llamadaDeVapi(vapi("c6", 3, RESERVA_LINK))!;
    const a = armarVista(TESORO, [], AHORA, HOY, [l]).apartados.find((x) => x.llamadaId === "c6")!;
    const m: Movimiento = { id: "m1", ts: new Date(AHORA).toISOString(), tipo: "apartado.confirmar", apartadoId: a.id, actor: "Karla Orellana" };
    const v = armarVista(TESORO, [m], AHORA, HOY, [l]);
    expect(v.apartados.some((x) => x.id === a.id)).toBe(false);
    expect(v.libro.find((r) => r.id === a.id.replace("AP-", "TB-"))).toMatchObject({ canal: "Llamada", origen: "agente", huesped: "Bryan Prueba" });
  });

  it("una consulta que no pide nada al equipo no deja apartado ni ticket", () => {
    const l = llamadaDeVapi(vapi("c7", 3, { motivo: "consulta", temas: ["check_in_out", "mascotas"], mascota: true }))!;
    const v = armarVista(TESORO, [], AHORA, HOY, [l]);
    expect(v.apartados.some((x) => x.llamadaId === "c7")).toBe(false);
    expect(v.tickets.some((x) => x.id === "tesoro-ll-c7")).toBe(false);
    expect(v.llamadas[0].id).toBe("c7");
  });
});

describe("tesoro: las llamadas de la muestra", () => {
  const muestra = llamadasDeMuestra(TESORO, AHORA);
  const por = (id: string) => muestra.find((l) => l.id === id) as LlamadaHotel;

  it("son repetibles y caen en el día de la semana que dicen", () => {
    expect(llamadasDeMuestra(TESORO, AHORA)).toEqual(muestra);
    expect(diaSemana(por("lls1").datos.fecha_llegada!)).toBe(5);
    expect(diaSemana(por("lls3").datos.fecha_llegada!)).toBe(0);
    expect(diaSemana(por("lls8").datos.fecha_llegada!)).toBe(2);
    for (const l of muestra) if (l.datos.fecha_llegada) expect(l.datos.fecha_llegada > HOY, l.id).toBe(true);
  });

  it("el total que dice la conversación es el del panel", () => {
    for (const l of muestra) {
      const d = l.datos;
      if (!d.habitacion || !d.fecha_llegada || !d.noches) continue;
      const total = totalEstadia(habs.find((h) => h.id === d.habitacion)!, d.fecha_llegada, d.noches);
      expect(d.total_estimado, l.id).toBe(total);
      expect(d.fecha_salida).toBe(sumarDias(d.fecha_llegada, d.noches));
    }
    expect(por("lls1").turnos.map((t) => t.texto).join(" ")).toContain("trescientos doce dólares");
    expect(por("lls1").datos.total_estimado).toBe(312);
    expect(por("lls3").datos.total_estimado).toBe(640);
  });

  it("los teléfonos son inventados (serie 503 9xxx que no se asigna)", () => {
    for (const l of muestra) expect(l.numero, l.id).toMatch(/^\+5039\d{7}$/);
  });

  it("abren el tablero con dos apartados por teléfono y cinco pendientes en Tickets, numerados después de la muestra", () => {
    const v = armarVista(TESORO, [], AHORA, HOY);
    expect(v.llamadas).toHaveLength(muestra.length);
    expect(v.apartados.filter((a) => a.canal === "Llamada").map((a) => a.llamadaId)).toEqual(["lls1", "lls3"]);
    const deLlamadas = v.tickets.filter((t) => t.id.startsWith("tesoro-ll-"));
    expect(deLlamadas.map((t) => t.id.replace("tesoro-ll-", "")).sort()).toEqual(["lls1", "lls3", "lls5", "lls6", "lls7"]);
    const maxMuestra = Math.max(...TESORO.tickets.map((t) => t.numero));
    expect(Math.min(...deLlamadas.map((t) => t.numero))).toBe(maxMuestra + 1);
    expect(new Set(v.tickets.map((t) => t.numero)).size).toBe(v.tickets.length);
    expect(deLlamadas.find((t) => t.id.endsWith("lls5"))?.area).toBe("eventos");
    expect(deLlamadas.find((t) => t.id.endsWith("lls6"))?.area).toBe("mantenimiento");
  });

  it("NAWI no tiene línea de voz: su vista no trae llamadas", () => {
    expect(armarVista(NAWI, [], AHORA, HOY).llamadas).toEqual([]);
  });
});
