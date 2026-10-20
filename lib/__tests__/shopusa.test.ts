// ShopUSA: que esté bien enchufado al demo, que cobre igual que la
// calculadora de shopusa.la (y como dicen sus términos: consolidación,
// recargos, almacenaje), que la muestra cuente la línea completa de un
// paquete, que cada movimiento le mande su aviso al cliente y que la bandeja
// y el tablero digan lo mismo.
import { describe, expect, it } from "vitest";
import { DEMO_LOGINS, TENANTS, isTenantId, resolveTenantByLogin } from "@/lib/tenants";
import { MODULOS_SHOPUSA, MODULOS_PIZZAHUT, MODULOS_CAJA, MODULO_RUTA, VE, moduloDeRuta } from "@/lib/modulos";
import {
  arancelDe,
  cobraPorVolumen,
  cobroDe,
  cobroDeEnvio,
  cotizar,
  envioDe,
  fleteDe,
  ivaDe,
  librasCobradas,
  pesoCobrable,
  tarifaPorLibra,
} from "@/lib/shopusa/cobro";
import { CAPTURAS_PENDIENTES, CLIENTES, semillaShopusa } from "@/lib/shopusa/semilla";
import { aplicarMovimientos } from "@/lib/shopusa/estado";
import { alertasDe, alertasDelPaquete, etiquetasDelPaquete } from "@/lib/shopusa/alertas";
import { avisosDe, textoAviso } from "@/lib/shopusa/avisos";
import { armarVista, avisosDelDemo } from "@/lib/shopusa/vista";
import { CATEGORIAS, ORDEN_ETAPAS, categoriaDef, siguienteEtapa } from "@/lib/shopusa/catalogo";
import { diaDeCarga, trackingLegible } from "@/lib/shopusa/formato";
import type { Movimiento, Paquete } from "@/lib/shopusa/tipos";

// Un lunes cualquiera a las 10:30 a. m. de El Salvador.
const AHORA = Date.parse("2026-10-19T16:30:00Z");
const shopusa = TENANTS.shopusa;

let seq = 0;
function mov(tipo: Movimiento["tipo"], objetivo: string, valor: Record<string, unknown> = {}, minutosDespues = 1): Movimiento {
  seq += 1;
  return { id: `t${seq}`, tipo, objetivo, valor, actor: "me", ts: new Date(AHORA + minutosDespues * 60_000).toISOString() };
}

describe("tenant shopusa: acceso y menú", () => {
  it("demoagentia / demoshopusa entra a ShopUSA, y la clave vieja ya no abre nada", () => {
    expect(resolveTenantByLogin("demoagentia", "demoshopusa")).toBe("shopusa");
    expect(resolveTenantByLogin("demoagentia", "demoexs")).toBeNull();
    expect(isTenantId("shopusa")).toBe(true);
    expect(isTenantId("exs")).toBe(false);
    expect(shopusa.brand.nombre).toBe("ShopUSA");
    expect(shopusa.brand.logoSrc).toBe("/brand/shopusa/logo.png");
  });

  it("cada clave abre un solo panel", () => {
    const vistas = new Set<string>();
    for (const l of DEMO_LOGINS.filter((x) => x.usuario === "demoagentia")) {
      expect(vistas.has(l.password), l.password).toBe(false);
      vistas.add(l.password);
    }
  });

  it("el menú es el tablero, la bandeja, paquetes, clientes y el chat del equipo, sin ajustes", () => {
    expect([...MODULOS_SHOPUSA]).toEqual(["dashboard", "bandeja", "paquetes", "clientes", "interno"]);
    expect(MODULOS_SHOPUSA).not.toContain("settings");
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

describe("cobro: igual que la calculadora de shopusa.la", () => {
  it("flete por tramo: $4.99 la libra hasta 5 lb y $4.40 desde 6 lb, todo el peso al precio del tramo", () => {
    expect(tarifaPorLibra(1)).toBe(4.99);
    expect(tarifaPorLibra(5)).toBe(4.99);
    expect(tarifaPorLibra(6)).toBe(4.4);
    expect(fleteDe(5)).toBe(24.95);
    expect(fleteDe(6)).toBe(26.4);
  });

  it("libra o fracción, mínimo una", () => {
    expect(librasCobradas(2.3)).toBe(3);
    expect(librasCobradas(2)).toBe(2);
    expect(librasCobradas(0.4)).toBe(1);
  });

  it("IVA 13% sobre la factura", () => {
    expect(ivaDe(120)).toBe(15.6);
    expect(ivaDe(199.99)).toBe(26);
    expect(ivaDe(629)).toBe(81.77);
  });

  it("DAI solo si la factura pasa de $300, con el porcentaje de su categoría", () => {
    expect(arancelDe(300, "Prendas de vestir")).toEqual({ tipo: "ninguno", monto: 0 });
    expect(arancelDe(300.01, "Prendas de vestir")).toEqual({ tipo: "dai", monto: 45, pct: 15 });
    expect(arancelDe(329.99, "Juguetes y artículos infantiles")).toEqual({ tipo: "dai", monto: 49.5, pct: 15 });
    expect(arancelDe(450, "Libros")).toEqual({ tipo: "ninguno", monto: 0 });
    expect(categoriaDef("Azúcar")?.dai).toBe(40);
  });

  it("tarifa fija en electrónicos desde $100 de factura", () => {
    expect(arancelDe(629, "Celulares y smartphones")).toEqual({ tipo: "fija", monto: 25 });
    expect(arancelDe(99.99, "Celulares y smartphones")).toEqual({ tipo: "ninguno", monto: 0 });
    expect(arancelDe(549, "Laptops y notebooks")).toEqual({ tipo: "fija", monto: 50 });
    expect(arancelDe(139.99, "Tablets")).toEqual({ tipo: "fija", monto: 35 });
    expect(arancelDe(149.99, "Kindles y lectores electrónicos")).toEqual({ tipo: "fija", monto: 35 });
    expect(arancelDe(120, "Relojes y smartwatch")).toEqual({ tipo: "fija", monto: 15 });
    expect(arancelDe(150, "Relojes y smartwatch")).toEqual({ tipo: "fija", monto: 25 });
  });

  it("por volumen solo cuando supera 3 veces el peso real, y entonces cobra el promedio", () => {
    // Edredón: 22 x 16 x 12 = 25.4 lb de volumen contra 4.2 reales.
    expect(cobraPorVolumen(4.2, { largo: 22, ancho: 16, alto: 12 })).toBe(true);
    expect(librasCobradas(pesoCobrable(4.2, { largo: 22, ancho: 16, alto: 12 }))).toBe(15);
    // Un monitor: 14.5 lb de volumen no llega a 3 veces sus 9.8 reales.
    expect(cobraPorVolumen(9.8, { largo: 25, ancho: 16, alto: 6 })).toBe(false);
  });

  it("cotiza como su calculadora: flete + IVA + DAI o tarifa fija", () => {
    expect(cotizar(120, "Calzado", 3)).toMatchObject({ libras: 3, flete: 14.97, iva: 15.6, total: 30.57 });
    expect(cotizar(629, "Celulares y smartphones", 1)).toMatchObject({ flete: 4.99, iva: 81.77, total: 111.76 });
  });

  it("los paquetes del mismo cliente en la misma carga se pesan juntos: un solo flete", () => {
    const m = semillaShopusa(AHORA);
    const juegos = m.paquetes.find((p) => p.id === "P-24604")!;
    const envio = envioDe(juegos, m.paquetes);
    expect(envio.map((p) => p.id)).toEqual(["P-24601", "P-24604"]);
    const c = cobroDeEnvio(envio);
    // 2.1 + 0.5 = 2.6 lb -> 3 lb ($14.97), contra 3 lb + 1 lb por separado ($19.96).
    expect(c.libras).toBe(3);
    expect(c.flete).toBe(14.97);
    expect(c.fleteSeparado).toBe(19.96);
    expect(c.ahorro).toBe(4.99);
    expect(c.iva).toBe(40.3);
    expect(c.total).toBe(55.27);
  });

  it("suma los cargos de los términos: sin prealerta, domicilio y almacenaje", () => {
    const m = semillaShopusa(AHORA);
    const cobro = (id: string) => cobroDe(m.paquetes.find((p) => p.id === id)!, m.paquetes, AHORA);
    // Llegó sin prealerta: 3.4 lb -> 4 lb + $1.50.
    expect(cobro("P-24613")).toMatchObject({ recargos: 1.5, total: 21.46 });
    // El edredón de Luis va a domicilio en Santa Tecla (área metropolitana).
    expect(cobro("P-24291")).toMatchObject({ libras: 15, flete: 66, iva: 11.7, domicilio: 3.5, total: 81.2 });
    // La silla de Edwin lleva más de 30 días: una semana de almacenaje, 10%.
    expect(cobro("P-23702")).toMatchObject({ semanasAlmacenaje: 1, almacenaje: 12.38, total: 136.18 });
  });
});

describe("la muestra", () => {
  const m = semillaShopusa(AHORA);

  it("tiene paquetes en todas las etapas, con ids y trackings únicos", () => {
    for (const e of ORDEN_ETAPAS) expect(m.paquetes.some((p) => p.etapa === e), e).toBe(true);
    expect(new Set(m.paquetes.map((p) => p.id)).size).toBe(m.paquetes.length);
    expect(new Set(m.paquetes.map((p) => p.tracking)).size).toBe(m.paquetes.length);
  });

  it("cada paquete es de un cliente que existe y de una categoría de la calculadora", () => {
    const ids = new Set(m.clientes.map((c) => c.id));
    const categorias = new Set(CATEGORIAS.map((c) => c.nombre));
    for (const p of m.paquetes) {
      expect(ids.has(p.clienteId), p.id).toBe(true);
      expect(categorias.has(p.categoria), `${p.id}: ${p.categoria}`).toBe(true);
    }
    for (const cap of CAPTURAS_PENDIENTES) expect(categorias.has(cap.lectura.categoria)).toBe(true);
    expect(new Set(m.clientes.map((c) => c.codigo)).size).toBe(m.clientes.length);
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
    for (const p of m.paquetes) expect(p.pesoLb === undefined, p.id).toBe(p.etapa === "pendiente");
  });

  it("las alertas cuentan lo que el demo enseña: 2 selectivos, 1 sin prealerta y 2 por almacenaje", () => {
    const a = alertasDe(m.paquetes, AHORA);
    expect(a.selectivos.map((p) => p.id).sort()).toEqual(["P-24410", "P-24413"]);
    expect(a.sinPrealerta.map((p) => p.id)).toEqual(["P-24613"]);
    expect(a.almacenaje.map((x) => [x.paquete.id, x.estado])).toEqual([
      ["P-23702", "cobrando"],
      ["P-23810", "por_vencer"],
    ]);
    // Quedó lista hace 27.8 días: le quedan 2.2 para empezar a cobrar.
    expect(a.almacenaje[1].dias).toBe(3);
  });

  it("las etiquetas explican el cobro: DAI, tarifa fija y consolidado", () => {
    const tipos = (id: string) => etiquetasDelPaquete(m.paquetes.find((p) => p.id === id)!, m.paquetes).map((e) => e.texto);
    expect(tipos("P-24628")).toEqual(["DAI 15%"]);
    expect(tipos("P-24526")).toEqual(["Tarifa fija $25.00"]);
    expect(tipos("P-24601")).toEqual(["Consolidado"]);
    expect(tipos("P-24288")).toEqual([]);
  });

  it("al cliente se le dice el día de la carga en palabras, sin coma ni hora", () => {
    const c = m.cargas.find((x) => x.id === "1042")!;
    // El lunes 19 a las 10:30 a. m., la carga de esa noche.
    expect(diaDeCarga(c)).toBe("lunes 19 de octubre");
  });

  it("hay una carga en el aire, una en aduana y una programada", () => {
    const n = (e: string) => m.cargas.filter((c) => c.estado === e).length;
    expect(n("en_transito")).toBe(1);
    expect(n("en_aduana")).toBe(1);
    expect(n("programada")).toBe(1);
    const enAire = m.cargas.find((c) => c.estado === "en_transito")!;
    expect(Date.parse(enAire.sale)).toBeLessThan(AHORA);
    expect(Date.parse(enAire.llega)).toBeGreaterThan(AHORA);
  });
});

describe("movimientos y avisos", () => {
  const base = semillaShopusa(AHORA);

  it("mover de etapa deja el evento y el aviso al cliente", () => {
    const m = mov("etapa", "P-24288", { a: "entregado" });
    const { paquetes } = aplicarMovimientos(base, [m]);
    expect(paquetes.find((x) => x.id === "P-24288")!.etapa).toBe("entregado");
    const nuevos = avisosDelDemo(armarVista(base, [m]));
    expect(nuevos).toHaveLength(1);
    expect(nuevos[0].id).toBe(`av-${m.id}`);
    expect(nuevos[0].texto).toContain("Entregamos tu paquete");
  });

  it("despachar una carga mueve todo lo que estaba en Miami y le avisa a cada paquete", () => {
    const m = mov("despacho", "1042", { estado: "en_transito" });
    const antes = base.paquetes.filter((p) => p.cargaId === "1042" && p.etapa === "miami").length;
    const v = armarVista(base, [m]);
    expect(v.paquetes.filter((p) => p.cargaId === "1042" && p.etapa === "transito")).toHaveLength(antes);
    expect(v.cargas.find((c) => c.id === "1042")?.estado).toBe("en_transito");
    expect(avisosDelDemo(v)).toHaveLength(antes);
  });

  it("cuando aduana libera una carga, los de selectivo rojo se quedan", () => {
    const v = armarVista(base, [mov("despacho", "1040", { estado: "liberada" })]);
    expect(v.paquetes.find((p) => p.id === "P-24410")?.etapa).toBe("aduana");
    expect(v.paquetes.find((p) => p.id === "P-24416")?.etapa).toBe("listo");
  });

  it("liberar un selectivo lo deja listo y le manda el total", () => {
    const v = armarVista(base, [mov("liberar", "P-24410")]);
    const p = v.paquetes.find((x) => x.id === "P-24410")!;
    expect(p.etapa).toBe("listo");
    expect(p.selectivo).toBeUndefined();
    // Reloj tradicional de $185: 1 lb ($4.99) + IVA ($24.05).
    expect(avisosDelDemo(v)[0].texto).toContain("Total: $29.04");
  });

  it("los dos paquetes de Diego salen juntos: un solo aviso de listo y un solo cobro", () => {
    const movs = [
      mov("despacho", "1042", { estado: "en_transito" }, 1),
      mov("despacho", "1042", { estado: "en_aduana" }, 2),
      mov("despacho", "1042", { estado: "liberada" }, 3),
    ];
    const v = armarVista(base, movs);
    const listos = avisosDelDemo(v).filter((a) => a.clienteId === "c10" && /list[oa]s?/.test(a.texto) && a.texto.includes("Total"));
    expect(listos).toHaveLength(1);
    expect(listos[0].texto).toContain("¡Tus 2 paquetes están listos, Diego!");
    expect(listos[0].texto).toContain("Total: $55.27");

    const pago = mov("pagado", "P-24604", {}, 4);
    const v2 = armarVista(base, [...movs, pago]);
    expect(v2.paquetes.filter((p) => p.clienteId === "c10" && p.cargaId === "1042").every((p) => p.pagado)).toBe(true);
    const pagos = avisosDelDemo(v2).filter((a) => a.texto.startsWith("Recibimos tu pago"));
    expect(pagos).toHaveLength(1);
    expect(pagos[0].texto).toContain("$55.27");
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
      etapa: "pendiente",
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
    expect(aviso).toContain("la sucursal Metro Sur");
    // El tracking de USPS va en grupos de cuatro, para que el cliente lo lea.
    expect(aviso).toContain(trackingLegible(cap.lectura.tracking));
    expect(trackingLegible(cap.lectura.tracking)).toBe("9400 1118 9956 2503 3188 67");
  });

  it("la confirmación de la prealerta avisa la tarifa fija o el DAI antes de que llegue", () => {
    const v = armarVista(base, []);
    const iphone = v.avisos.get("P-24526")!.find((a) => a.texto.startsWith("¡Listo"))!;
    expect(iphone.texto).toContain("Por ser un celular de más de $100, lleva tarifa fija de $25.00 más el 13% de IVA.");
    const sinPrealerta = v.avisos.get("P-24613")![0].texto;
    expect(sinPrealerta).toContain("no tiene prealerta");
    expect(sinPrealerta).toContain("$1.50");
  });

  it("cambiar de sucursal: gratis si se prealertó a tiempo, $2.50 si no", () => {
    const v = armarVista(base, [mov("traslado", "P-24288", { sucursal: "soyapango" }), mov("traslado", "P-24613", { sucursal: "santa_ana" })]);
    const gratis = v.paquetes.find((p) => p.id === "P-24288")!;
    expect(gratis.entrega).toEqual({ tipo: "sucursal", sucursal: "soyapango" });
    expect(gratis.traslado).toEqual({ cobra: false });
    const conCargo = v.paquetes.find((p) => p.id === "P-24613")!;
    expect(cobroDe(conCargo, v.paquetes).traslado).toBe(2.5);
    const textos = avisosDelDemo(v).map((a) => a.texto);
    expect(textos.some((t) => t.includes("Soyapango") && t.includes("no tiene costo"))).toBe(true);
    expect(textos.some((t) => t.includes("Santa Ana") && t.includes("$2.50"))).toBe(true);
  });

  it("el selectivo rojo y la salida a domicilio dejan su aviso", () => {
    const v = armarVista(base, [mov("selectivo", "P-24419", { motivo: "Aduana revisa el contenido del paquete" }), mov("en_camino", "P-24291")]);
    const textos = avisosDelDemo(v).map((a) => a.texto);
    expect(textos.some((t) => t.includes("selectivo rojo") && t.includes("termine la revisión"))).toBe(true);
    expect(textos.some((t) => t.includes("va en camino a tu casa en Santa Tecla"))).toBe(true);
  });

  it("un movimiento que no aplica no hace nada", () => {
    const v = armarVista(base, [mov("liberar", "P-24701"), mov("en_camino", "P-24288"), mov("traslado", "P-24288", { sucursal: "santa_tecla" })]);
    expect(avisosDelDemo(v)).toHaveLength(0);
  });

  it("los avisos van de tú, sin guiones largos, y el de 'listo' trae el mismo total que el cobro de ese momento", () => {
    const v = armarVista(base, []);
    for (const p of v.paquetes) {
      const c = v.clientes.find((x) => x.id === p.clienteId)!;
      const ctx = { cliente: c, cargas: v.cargas, paquetes: v.paquetes };
      for (const a of avisosDe(p, ctx)) {
        expect(a.texto, a.id).not.toMatch(/—/);
        expect(a.texto, a.id).not.toMatch(/\busted\b/i);
        // Una hora que termina en "p. m." no lleva otro punto pegado.
        expect(a.texto, a.id).not.toMatch(/m\.\./);
      }
      const listo = p.historial.find((e) => e.tipo === "listo");
      if (listo) {
        const texto = textoAviso(listo, p, ctx)!;
        const total = cobroDeEnvio([p], Date.parse(listo.ts)).total;
        expect(texto, p.id).toContain(`$${total.toFixed(2)}`);
      }
    }
  });

  it("un paquete listo no tiene a dónde avanzar más que a entregado", () => {
    expect(siguienteEtapa("listo")).toBe("entregado");
    expect(siguienteEtapa("entregado")).toBeNull();
    const p = base.paquetes.find((x) => x.id === "P-24288")!;
    expect(alertasDelPaquete(p, alertasDe(base.paquetes, AHORA))).toEqual([]);
  });
});

describe("la bandeja de ShopUSA", () => {
  const s = shopusa.seed;

  it("cada mensaje es de una conversación que existe, y cada conversación de un contacto que existe", () => {
    const convs = new Set(s.conversations.map((c) => c.id));
    const contactos = new Set(s.contacts.map((c) => c.id));
    expect(convs.size).toBe(s.conversations.length);
    for (const m of s.messages) expect(convs.has(m.conversationId), m.id).toBe(true);
    for (const c of s.conversations) expect(contactos.has(c.contactId), c.id).toBe(true);
  });

  it("los departamentos de los chats son los de su semilla", () => {
    const deptos = new Set(s.departments.map((d) => d.id));
    expect(deptos.has(shopusa.defaultDepartment)).toBe(true);
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
    expect(shopusa.ai.systemPrompt).not.toMatch(/—/);
  });

  it("las capturas de la muestra se sirven del propio demo", () => {
    const conImagen = s.messages.filter((m) => m.media);
    expect(conImagen.length).toBeGreaterThanOrEqual(3);
    for (const m of conImagen) expect(m.media?.url).toMatch(/^\/demo\/shopusa\/.+\.svg$/);
  });

  it("la cotización y la consolidación del chat salen de la misma cuenta que el panel", () => {
    const texto = (conv: string) => s.messages.filter((m) => m.conversationId === conv).map((m) => m.texto).join("\n");
    expect(texto("x3")).toContain("Total aproximado: $30.57");
    expect(texto("x3")).toContain("$111.76");
    expect(texto("x10")).toContain("Te ahorras $4.99");
  });
});

describe("la agente de ShopUSA", () => {
  const ai = shopusa.ai;

  it("va con luna, ve las capturas y no contesta sola", () => {
    expect(ai.nombre).toBe("Lucía");
    expect(ai.modelo).toBe("luna");
    expect(ai.imagenes).toBe(true);
    expect(ai.respondeSolo).toBe(false);
  });

  it("dice las tarifas y reglas publicadas en shopusa.la", () => {
    for (const dato of [
      "$4.99",
      "$4.40",
      "13%",
      "$300",
      "$1.50",
      "$2.50",
      "$3.50",
      "$7.00",
      "30 días",
      "60 días",
      "7 días hábiles",
      "DUI",
      "shopusa.la/registro",
      "7858-0444",
      "Medley",
      "33195",
      "selectivo rojo",
    ]) {
      expect(ai.systemPrompt, dato).toContain(dato);
    }
  });

  it("no tiene plantillas de marketing, y todas firman como ShopUSA", () => {
    for (const t of shopusa.waTemplates) {
      expect(t.category).toBe("UTILITY");
      expect(t.components.find((c) => c.type === "FOOTER")?.text).toBe("ShopUSA");
    }
  });
});
