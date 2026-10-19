// Express Shopping: que esté bien enchufado al demo, que cobre igual que la
// calculadora de exs.sv, que la muestra cuente la línea completa de un
// paquete, que cada movimiento le mande su aviso al cliente y que la bandeja
// y el tablero digan lo mismo.
import { describe, expect, it } from "vitest";
import { DEMO_LOGINS, TENANTS, isTenantId, resolveTenantByLogin } from "@/lib/tenants";
import { MODULOS_EXS, MODULOS_PIZZAHUT, MODULOS_CAJA, MODULO_RUTA, VE, moduloDeRuta } from "@/lib/modulos";
import { cobroDe, costoEnvio, impuestoDe, librasCobradas, pasaElLimite, precioPorLibra } from "@/lib/exs/cobro";
import { CAPTURAS_PENDIENTES, CLIENTES, semillaExs } from "@/lib/exs/semilla";
import { aplicarMovimientos, totalDelVuelo } from "@/lib/exs/estado";
import { alertasDe, alertasDelPaquete, siguienteVuelo } from "@/lib/exs/alertas";
import { avisosDe, textoAviso } from "@/lib/exs/avisos";
import { armarVista, avisosDelDemo } from "@/lib/exs/vista";
import { ORDEN_ETAPAS, siguienteEtapa } from "@/lib/exs/catalogo";
import { diaDeVuelo, trackingLegible } from "@/lib/exs/formato";
import type { Movimiento, Paquete } from "@/lib/exs/tipos";

// Un lunes cualquiera a las 10:30 a. m. de El Salvador.
const AHORA = Date.parse("2026-10-19T16:30:00Z");
const exs = TENANTS.exs;

let seq = 0;
function mov(tipo: Movimiento["tipo"], objetivo: string, valor: Record<string, unknown> = {}, minutosDespues = 1): Movimiento {
  seq += 1;
  return { id: `t${seq}`, tipo, objetivo, valor, actor: "me", ts: new Date(AHORA + minutosDespues * 60_000).toISOString() };
}

describe("tenant exs: acceso y menú", () => {
  it("demoagentia / demoexs entra a Express Shopping", () => {
    expect(resolveTenantByLogin("demoagentia", "demoexs")).toBe("exs");
    expect(isTenantId("exs")).toBe(true);
    expect(exs.brand.nombre).toBe("Express Shopping");
  });

  it("cada clave abre un solo panel", () => {
    const vistas = new Set<string>();
    for (const l of DEMO_LOGINS.filter((x) => x.usuario === "demoagentia")) {
      expect(vistas.has(l.password), l.password).toBe(false);
      vistas.add(l.password);
    }
  });

  it("el menú es el tablero, la bandeja, paquetes, clientes y el chat del equipo, sin ajustes", () => {
    expect([...MODULOS_EXS]).toEqual(["dashboard", "bandeja", "paquetes", "clientes", "interno"]);
    expect(MODULOS_EXS).not.toContain("settings");
    expect(MODULO_RUTA.paquetes).toBe("/paquetes");
    expect(MODULO_RUTA.clientes).toBe("/clientes");
    expect(moduloDeRuta("/paquetes")).toBe("paquetes");
    expect(moduloDeRuta("/clientes")).toBe("clientes");
    expect(VE.gerente_marketing).toEqual(expect.arrayContaining(["paquetes", "clientes"]));
  });

  it("Paquetes y Clientes no se cuelan en los menús cerrados de otros clientes", () => {
    for (const lista of [MODULOS_PIZZAHUT, MODULOS_CAJA]) {
      expect(lista).not.toContain("paquetes");
      expect(lista).not.toContain("clientes");
    }
  });
});

describe("cobro: igual que la calculadora de exs.sv/cotizar", () => {
  it("IVA 13% sobre el CIF (precio + 10% de flete + 1.5% de seguro)", () => {
    const i = impuestoDe(120);
    expect(i.flete).toBe(12);
    expect(i.seguro).toBe(1.8);
    expect(i.cif).toBe(133.8);
    expect(i.iva).toBe(17.39);
  });

  it("envío por tramo: $4.99 la libra hasta 5 lb y $4.49 desde 6 lb, todo el peso al precio del tramo", () => {
    expect(precioPorLibra(1)).toBe(4.99);
    expect(precioPorLibra(5)).toBe(4.99);
    expect(precioPorLibra(6)).toBe(4.49);
    expect(costoEnvio(5)).toBe(24.95);
    expect(costoEnvio(6)).toBe(26.94);
  });

  it("libra o fracción, mínimo una", () => {
    expect(librasCobradas(2.3)).toBe(3);
    expect(librasCobradas(2)).toBe(2);
    expect(librasCobradas(0.4)).toBe(1);
  });

  it("por volumen solo cuando excede el peso real en más de 30%", () => {
    // Monitor: 25 x 16 x 6 = 14.5 lb de volumen contra 9.8 reales.
    expect(librasCobradas(9.8, { largo: 25, ancho: 16, alto: 6 })).toBe(15);
    // Caja chica: el volumen no pasa del 30%.
    expect(librasCobradas(3.2, { largo: 10, ancho: 8, alto: 6 })).toBe(4);
  });

  it("el beneficio de solo IVA es hasta $299.99 por vuelo", () => {
    expect(pasaElLimite(299.99)).toBe(false);
    expect(pasaElLimite(300)).toBe(true);
  });

  it("el total del paquete es envío + IVA", () => {
    // La cafetera de Paola: 5.3 lb -> 6 lb a $4.49 = $26.94, IVA de $79.99 = $11.59.
    const c = cobroDe({ valor: 79.99, pesoLb: 5.3 });
    expect(c.envio).toBe(26.94);
    expect(c.impuesto.iva).toBe(11.59);
    expect(c.total).toBe(38.53);
  });
});

describe("la muestra", () => {
  const m = semillaExs(AHORA);

  it("tiene paquetes en todas las etapas, con ids y trackings únicos", () => {
    for (const e of ORDEN_ETAPAS) expect(m.paquetes.some((p) => p.etapa === e), e).toBe(true);
    expect(new Set(m.paquetes.map((p) => p.id)).size).toBe(m.paquetes.length);
    expect(new Set(m.paquetes.map((p) => p.tracking)).size).toBe(m.paquetes.length);
  });

  it("cada paquete es de un cliente que existe, y cada cliente tiene un casillero propio", () => {
    const ids = new Set(m.clientes.map((c) => c.id));
    for (const p of m.paquetes) expect(ids.has(p.clienteId), p.id).toBe(true);
    expect(new Set(m.clientes.map((c) => c.casillero)).size).toBe(m.clientes.length);
  });

  it("los teléfonos son de la serie 9 (no asignada en El Salvador) y no se repiten", () => {
    for (const c of CLIENTES) expect(c.telefono).toMatch(/^5039\d{7}$/);
    expect(new Set(CLIENTES.map((c) => c.telefono)).size).toBe(CLIENTES.length);
  });

  it("la bitácora de cada paquete va en orden y termina en su etapa", () => {
    for (const p of m.paquetes) {
      const ts = p.historial.map((e) => e.ts);
      expect([...ts].sort(), p.id).toEqual(ts);
      const etapas = p.historial.filter((e) => ORDEN_ETAPAS.includes(e.tipo as never));
      expect(etapas.at(-1)?.tipo, p.id).toBe(p.etapa);
    }
  });

  it("solo lo que ya se pesó en Miami tiene peso", () => {
    for (const p of m.paquetes) expect(p.pesoLb === undefined, p.id).toBe(p.etapa === "prealertado");
  });

  it("las alertas cuentan lo que el demo enseña: 2 retenidos, 1 sin prealerta, 1 por vencer y Diego sobre $300", () => {
    const a = alertasDe(m.paquetes, m.clientes, m.vuelos, AHORA);
    expect(a.retenidos.map((p) => p.id).sort()).toEqual(["P-24410", "P-24413"]);
    expect(a.sinPrealerta.map((p) => p.id)).toEqual(["P-24613"]);
    expect(a.porVencer.map((x) => x.paquete.id)).toEqual(["P-23810"]);
    expect(a.sobreLimite).toHaveLength(1);
    expect(a.sobreLimite[0].cliente.id).toBe("c10");
    expect(a.sobreLimite[0].total).toBe(309.97);
    // Lo que conviene mover es lo que lo deja debajo de $300 con menos valor: los juegos.
    expect(a.sobreLimite[0].sugerido?.id).toBe("P-24604");
  });

  it("al cliente se le dice el día del vuelo en palabras, sin coma ni hora", () => {
    const v = m.vuelos.find((x) => x.id === "EXS-1042")!;
    // Dos días después del lunes 19: el miércoles 21, a las 9:00 p. m.
    expect(diaDeVuelo(v)).toBe("miércoles 21 de octubre");
  });

  it("hay un vuelo en el aire, uno en aduana y dos programados", () => {
    const n = (e: string) => m.vuelos.filter((v) => v.estado === e).length;
    expect(n("en_vuelo")).toBe(1);
    expect(n("en_aduana")).toBe(1);
    expect(n("programado")).toBe(2);
    const enAire = m.vuelos.find((v) => v.estado === "en_vuelo")!;
    expect(Date.parse(enAire.sale)).toBeLessThan(AHORA);
    expect(Date.parse(enAire.llega)).toBeGreaterThan(AHORA);
  });
});

describe("movimientos y avisos", () => {
  const base = semillaExs(AHORA);

  it("mover de etapa deja el evento y el aviso al cliente", () => {
    const m = mov("etapa", "P-24288", { a: "entregado" });
    const { paquetes } = aplicarMovimientos(base, [m]);
    const p = paquetes.find((x) => x.id === "P-24288")!;
    expect(p.etapa).toBe("entregado");
    const v = armarVista(base, [m]);
    const nuevos = avisosDelDemo(v);
    expect(nuevos).toHaveLength(1);
    expect(nuevos[0].id).toBe(`av-${m.id}`);
    expect(nuevos[0].texto).toContain("Entregamos tu paquete");
  });

  it("despachar un vuelo mueve todo lo que estaba en Miami y le avisa a cada cliente", () => {
    const m = mov("despacho", "EXS-1042", { estado: "en_vuelo" });
    const antes = base.paquetes.filter((p) => p.vueloId === "EXS-1042" && p.etapa === "miami").length;
    const v = armarVista(base, [m]);
    expect(v.paquetes.filter((p) => p.vueloId === "EXS-1042" && p.etapa === "en_vuelo")).toHaveLength(antes);
    expect(v.vuelos.find((x) => x.id === "EXS-1042")?.estado).toBe("en_vuelo");
    expect(avisosDelDemo(v)).toHaveLength(antes);
  });

  it("cuando aduana libera un vuelo, los retenidos se quedan", () => {
    const v = armarVista(base, [mov("despacho", "EXS-1040", { estado: "liberado" })]);
    expect(v.paquetes.find((p) => p.id === "P-24410")?.etapa).toBe("aduana");
    expect(v.paquetes.find((p) => p.id === "P-24416")?.etapa).toBe("listo");
  });

  it("liberar un retenido lo deja listo y le manda el total", () => {
    const v = armarVista(base, [mov("liberar", "P-24410")]);
    const p = v.paquetes.find((x) => x.id === "P-24410")!;
    expect(p.etapa).toBe("listo");
    expect(p.retenido).toBeUndefined();
    const total = cobroDe(p, totalDelVuelo(v.paquetes, p.clienteId, p.vueloId)).total;
    expect(avisosDelDemo(v)[0].texto).toContain(`$${total.toFixed(2)}`);
  });

  it("pasar los juegos de Diego al siguiente vuelo le quita la alerta de $300", () => {
    const sig = siguienteVuelo(base.vuelos, "EXS-1042")!;
    expect(sig.id).toBe("EXS-1043");
    const v = armarVista(base, [mov("vuelo", "P-24604", { vueloId: sig.id })]);
    expect(v.alertas.sobreLimite).toHaveLength(0);
    expect(avisosDelDemo(v)[0].texto).toContain("pagas solo IVA");
  });

  it("la captura pendiente se vuelve prealerta una sola vez, y la confirmación repite lo leído", () => {
    const cap = CAPTURAS_PENDIENTES[0];
    const cliente = base.clientes.find((c) => c.id === cap.clienteId)!;
    const paquete: Paquete = {
      id: "P-24801",
      clienteId: cliente.id,
      tracking: cap.lectura.tracking,
      tienda: cap.lectura.tienda,
      transportista: cap.lectura.transportista,
      contenido: cap.lectura.contenido,
      categoria: cap.lectura.categoria,
      valor: cap.lectura.valor,
      etapa: "prealertado",
      prealerta: { origen: "captura", ts: new Date(AHORA).toISOString(), lectura: cap.lectura, conversationId: cap.conversationId },
      entrega: { tipo: "sucursal", sucursal: cliente.sucursal },
      pagado: false,
      historial: [],
      creado: new Date(AHORA).toISOString(),
    };
    const m = mov("prealerta", paquete.id, { paquete });
    const v = armarVista(base, [m, { ...m, id: "repetido" }]);
    expect(v.paquetes.filter((p) => p.tracking === cap.lectura.tracking)).toHaveLength(1);
    expect(v.capturasPendientes).toHaveLength(0);
    const aviso = avisosDelDemo(v)[0].texto;
    expect(aviso).toContain("Leí tu captura");
    expect(aviso).toContain("$69.98");
    // El tracking de USPS va en grupos de cuatro, para que el cliente lo lea.
    expect(aviso).toContain(trackingLegible(cap.lectura.tracking));
    expect(trackingLegible(cap.lectura.tracking)).toBe("9400 1118 9956 2503 3188 67");
  });

  it("un movimiento sobre una etapa que no aplica no hace nada", () => {
    const v = armarVista(base, [mov("liberar", "P-24701"), mov("vuelo", "P-24288", { vueloId: "EXS-1043" })]);
    expect(avisosDelDemo(v)).toHaveLength(0);
  });

  it("los avisos van de tú, sin guiones largos, y el de 'listo' trae el mismo total que la ficha", () => {
    const v = armarVista(base, []);
    for (const p of v.paquetes) {
      const c = v.clientes.find((x) => x.id === p.clienteId)!;
      const xs = avisosDe(p, { cliente: c, vuelos: v.vuelos, totalDelVuelo: totalDelVuelo(v.paquetes, p.clienteId, p.vueloId) });
      for (const a of xs) {
        expect(a.texto, a.id).not.toMatch(/—/);
        expect(a.texto, a.id).not.toMatch(/\busted\b/i);
        // Una hora que termina en "p. m." no lleva otro punto pegado.
        expect(a.texto, a.id).not.toMatch(/m\.\./);
      }
      const listo = p.historial.find((e) => e.tipo === "listo");
      if (listo) {
        const texto = textoAviso(listo, p, { cliente: c, vuelos: v.vuelos, totalDelVuelo: totalDelVuelo(v.paquetes, p.clienteId, p.vueloId) })!;
        const total = cobroDe(p, totalDelVuelo(v.paquetes, p.clienteId, p.vueloId)).total;
        expect(texto, p.id).toContain(`$${total.toFixed(2)}`);
      }
    }
  });

  it("un paquete listo no tiene a dónde avanzar más que a entregado", () => {
    expect(siguienteEtapa("listo")).toBe("entregado");
    expect(siguienteEtapa("entregado")).toBeNull();
    const p = base.paquetes.find((x) => x.id === "P-24291")!;
    expect(alertasDelPaquete(p, alertasDe(base.paquetes, base.clientes, base.vuelos, AHORA))).toEqual([]);
  });
});

describe("la bandeja de Express Shopping", () => {
  const s = exs.seed;

  it("cada mensaje es de una conversación que existe, y cada conversación de un contacto que existe", () => {
    const convs = new Set(s.conversations.map((c) => c.id));
    const contactos = new Set(s.contacts.map((c) => c.id));
    expect(convs.size).toBe(s.conversations.length);
    for (const m of s.messages) expect(convs.has(m.conversationId), m.id).toBe(true);
    for (const c of s.conversations) expect(contactos.has(c.contactId), c.id).toBe(true);
  });

  it("los departamentos de los chats son los de su semilla", () => {
    const deptos = new Set(s.departments.map((d) => d.id));
    expect(deptos.has(exs.defaultDepartment)).toBe(true);
    for (const c of s.conversations) expect(deptos.has(c.departamento), c.id).toBe(true);
  });

  it("cada conversación de la muestra es de un cliente con su chat enlazado", () => {
    for (const c of CLIENTES.filter((x) => x.conversationId)) {
      const conv = s.conversations.find((x) => x.id === c.conversationId);
      expect(conv, c.id).toBeDefined();
      expect(conv?.contactId).toBe(c.id);
    }
  });

  it("ningún texto lleva guiones largos ni puntos dobles", () => {
    for (const m of s.messages) expect(m.texto, m.id).not.toMatch(/—|m\.\./);
    for (const m of s.internalMessages) expect(m.texto, m.id).not.toMatch(/—/);
    expect(exs.ai.systemPrompt).not.toMatch(/—/);
  });

  it("las capturas de la muestra se sirven del propio demo", () => {
    const conImagen = s.messages.filter((m) => m.media);
    expect(conImagen.length).toBeGreaterThanOrEqual(3);
    for (const m of conImagen) expect(m.media?.url).toMatch(/^\/demo\/exs\/.+\.svg$/);
  });
});

describe("la agente de Express Shopping", () => {
  const ai = exs.ai;

  it("va con luna, ve las capturas y no contesta sola", () => {
    expect(ai.nombre).toBe("Lucía");
    expect(ai.modelo).toBe("luna");
    expect(ai.imagenes).toBe(true);
    expect(ai.respondeSolo).toBe(false);
  });

  it("dice las tarifas y reglas publicadas en exs.sv", () => {
    for (const dato of ["$4.99", "$4.49", "13%", "$300", "10% de flete", "1.5% de seguro", "30 días", "DUI", "casillero.exs.sv/registro", "2213-1270"]) {
      expect(ai.systemPrompt).toContain(dato);
    }
  });

  it("no tiene plantillas de marketing", () => {
    for (const t of exs.waTemplates) expect(t.category).toBe("UTILITY");
  });
});
