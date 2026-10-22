// NAWI Beach House: que esté bien enchufado al demo (login, menú de Porta
// Stays), que su libro de muestra dé una foto coherente, que confirmar o
// rechazar un apartado mueva el tablero como en Yali, que los tickets se
// muevan igual que en el tablero real, y que nada del panel hable de otro
// cliente.
import { describe, expect, it } from "vitest";
import { DEMO_LOGINS, TENANTS, isTenantId, resolveTenantByLogin, tenantsDelDemo } from "@/lib/tenants";
import { MODULOS_HOTEL_MUESTRA, MODULO_RUTA, VE, moduloDeRuta, puedeVerRuta } from "@/lib/modulos";
import { configTickets, veTickets } from "@/lib/tickets-tenant";
import { NAWI } from "@/lib/hotel-muestra/nawi";
import { esHotelMuestra, hotelMuestraDe, modulosDeHotelMuestra } from "@/lib/hotel-muestra/registro";
import { comentariosDeMuestra, paginasDeMuestra, publicacionesDeMuestra } from "@/lib/hotel-muestra/redes";
import { promocionesDeMuestra } from "@/lib/hotel-muestra/promos";
import { promocionesVigentes } from "@/lib/promos";
import { fotoHotel, hayLugar, libroDeMuestra, totalEstadia } from "@/lib/hotel-muestra/libro";
import { armarVista, reservaDeApartado } from "@/lib/hotel-muestra/vista";
import { cifrasIa } from "@/lib/hotel-muestra/ia";
import { diaSV, diasEntre, sumarDias } from "@/lib/hotel-muestra/fechas";
import type { Movimiento } from "@/lib/hotel-muestra/tipos";
import { nawiSeed } from "@/lib/tenants/seeds/nawi";

// Un miércoles a las 9:30 a. m. de El Salvador.
const AHORA = Date.parse("2026-10-21T15:30:00Z");
const HOY = diaSV(AHORA);
const nawi = TENANTS.nawi;

type SinSello<T> = T extends unknown ? Omit<T, "id" | "ts"> : never;

let seq = 0;
function mov(m: SinSello<Movimiento>, minutos = 1): Movimiento {
  seq += 1;
  return { ...m, id: `t${seq}`, ts: new Date(AHORA + minutos * 60_000).toISOString() } as Movimiento;
}

describe("tenant nawi: acceso y menú", () => {
  it("demoagentia / demonawi entra a NAWI, y es un panel del demo", () => {
    expect(resolveTenantByLogin("demoagentia", "demonawi")).toBe("nawi");
    expect(isTenantId("nawi")).toBe(true);
    expect(tenantsDelDemo()).toContain("nawi");
    expect(nawi.brand.nombre).toBe("NAWI Beach House");
    expect(nawi.brand.logoSrc).toBe("/brand/nawi/logo.svg");
  });

  it("cada clave abre un solo panel", () => {
    const vistas = new Set<string>();
    for (const l of DEMO_LOGINS.filter((x) => x.usuario === "demoagentia")) {
      expect(vistas.has(l.password), l.password).toBe(false);
      vistas.add(l.password);
    }
  });

  it("el menú es el de Porta Stays: bandeja, mis chats, tickets, contactos, chat interno, redes, comentarios, promociones, dashboard e IA Performance", () => {
    expect([...MODULOS_HOTEL_MUESTRA]).toEqual(["bandeja", "mis-chats", "tickets", "contactos", "interno", "dashboard", "ia"]);
    expect(modulosDeHotelMuestra("nawi")).toEqual([
      "bandeja", "mis-chats", "tickets", "contactos", "interno", "redes", "comentarios", "promociones", "dashboard", "ia",
    ]);
    // Tesoro no trae redes ni promociones de muestra: su menú sigue igual.
    expect(modulosDeHotelMuestra("tesoro")).toEqual([...MODULOS_HOTEL_MUESTRA]);
    expect(modulosDeHotelMuestra("yaly")).toEqual([]);
    expect(MODULO_RUTA.ia).toBe("/ia");
    expect(moduloDeRuta("/ia")).toBe("ia");
    // /inmobiliaria no existe, pero si existiera no sería IA Performance.
    expect(moduloDeRuta("/iamigo")).toBeNull();
  });

  it("gerencia y dirección ven todo su menú; jefatura ve IA Performance", () => {
    for (const m of modulosDeHotelMuestra("nawi")) {
      expect(VE.gerente_marketing, m).toContain(m);
      expect(VE.admin, m).toContain(m);
    }
    expect(puedeVerRuta("jefe", "/ia")).toBe(true);
    expect(puedeVerRuta("marketing", "/ia")).toBe(false);
  });

  it("es un hotel de muestra con tablero de tickets propio", () => {
    expect(esHotelMuestra("nawi")).toBe(true);
    expect(esHotelMuestra("yaly")).toBe(false);
    expect(esHotelMuestra("shopusa")).toBe(false);
    expect(veTickets("nawi")).toBe(true);
    const areas = configTickets("nawi").areas.map((a) => a.id);
    for (const t of NAWI.tickets) expect(areas, `#${t.numero}`).toContain(t.area);
  });

  it("la agente es Camila, con luna, y NO contesta sola", () => {
    expect(nawi.ai.nombre).toBe("Camila");
    expect(nawi.ai.modelo).toBe("luna");
    expect(nawi.ai.respondeSolo).toBe(false);
    expect(nawi.whatsapp?.plantillasDelNumeroDemo).toBe(false);
  });
});

describe("nawi: redes, comentarios y promociones de muestra", () => {
  const hilo = (cs: ReturnType<typeof comentariosDeMuestra>, id: string) => cs.filter((c) => c.padreId === id);

  it("las publicaciones salen en hora de El Salvador, con sus fotos en public/", () => {
    const posts = publicacionesDeMuestra(NAWI, HOY);
    expect(posts.length).toBe(NAWI.redes!.publicaciones.length);
    const ig1 = posts.find((p) => p.id === "ig1")!;
    expect(ig1.fecha).toBe(`${sumarDias(HOY, -2)}T18:30:00`);
    for (const p of posts) {
      expect(p.fecha, p.id).not.toMatch(/Z$/);
      for (const img of p.imagenes ?? []) expect(img, p.id).toMatch(/^\/brand\/nawi\/redes\/[a-z-]+\.jpg$/);
      // Las publicadas traen sus números; las que faltan salir, no.
      expect(Boolean(p.engagement), p.id).toBe(p.estado === "publicado");
    }
    expect(nawiSeed.socialPosts.length).toBe(posts.length);
    expect(nawiSeed.socialStats.map((s) => s.red)).toEqual(["instagram", "facebook", "tiktok"]);
  });

  it("cada comentario cae sobre una publicación de Facebook o Instagram que ya salió, y después de que salió", () => {
    for (const c of NAWI.redes!.comentarios) {
      const p = NAWI.redes!.publicaciones.find((x) => x.id === c.publicacionId);
      expect(p, c.id).toBeDefined();
      expect(["facebook", "instagram"], c.id).toContain(p!.red);
      expect(p!.estado, c.id).toBe("publicado");
      // Lo menos que puede tener la publicación es si el demo se abre a medianoche.
      const [hh, mm] = p!.hora.split(":").map(Number);
      expect(c.haceMin, c.id).toBeLessThan(-p!.enDias * 24 * 60 - (hh * 60 + mm));
      for (const r of c.respuestas ?? []) expect(r.haceMin, c.id).toBeLessThan(c.haceMin);
    }
  });

  it("abre con cinco sin responder; el que contestó otra persona sigue en la cola", () => {
    const cs = comentariosDeMuestra(NAWI, [], AHORA);
    const pendientes = cs.filter((c) => !c.padreId && !c.respondido && !c.oculto).map((c) => c.id);
    expect(pendientes.sort()).toEqual(["nc1", "nc2", "nc5", "nc8", "nc9"]);
    const patricia = cs.find((c) => c.id === "nc9")!;
    expect(patricia.respuestas).toBe(1);
    expect(hilo(cs, "nc9")[0].nuestro).toBeUndefined();
    expect(cs.find((c) => c.id === "nc7")!.oculto).toBe(true);
    // Las respuestas del hotel salen con el nombre de la cuenta, no en blanco.
    expect(hilo(cs, "nc3")[0].autor).toBe("nawibeachhouse");
    expect(hilo(cs, "nc10")[0].autor).toBe("NAWI Beach House");
    expect(paginasDeMuestra(NAWI).map((p) => p.id)).toEqual(["nawi-instagram", "nawi-facebook"]);
    for (const c of cs) expect(["nawi-instagram", "nawi-facebook"]).toContain(c.pageId);
  });

  it("responder lo saca de la cola y cuelga la respuesta al final del hilo; si otra persona vuelve a escribir, no", () => {
    const cs = comentariosDeMuestra(
      NAWI,
      [
        mov({ tipo: "comentario.responder", comentarioId: "nc9", texto: "Los sábados no, Patricia: es de lunes a viernes.", actor: "Equipo" }),
        // Responder A UNA RESPUESTA va contra el comentario de arriba.
        mov({ tipo: "comentario.responder", comentarioId: "nc4-r1", texto: "¡Nos vemos!", actor: "Equipo" }),
        mov({ tipo: "comentario.responder", comentarioId: "nc8", texto: "Te escribo por privado", privado: true, actor: "Equipo" }),
      ],
      AHORA,
    );
    const nc9 = cs.find((c) => c.id === "nc9")!;
    expect(nc9.respondido).toBe(true);
    expect(nc9.respuestas).toBe(2);
    const h = hilo(cs, "nc9").sort((a, b) => (a.ts < b.ts ? -1 : 1));
    expect(h[h.length - 1].nuestro).toBe(true);
    expect(h[h.length - 1].autor).toBe("NAWI Beach House");
    expect(hilo(cs, "nc4")).toHaveLength(3);
    // Por privado no deja nada en el hilo público, pero ya no está en la cola.
    expect(hilo(cs, "nc8")).toHaveLength(0);
    expect(cs.find((c) => c.id === "nc8")!.respondido).toBe(true);
  });

  it("una respuesta guardada ayer no queda antes de lo que contesta", () => {
    const ayer: Movimiento = { id: "viejo", ts: new Date(AHORA - 24 * 60 * 60_000).toISOString(), tipo: "comentario.responder", comentarioId: "nc1", texto: "Solo el welcome drink.", actor: "Equipo" };
    const cs = comentariosDeMuestra(NAWI, [ayer], AHORA);
    const raiz = cs.find((c) => c.id === "nc1")!;
    expect(hilo(cs, "nc1")[0].ts > raiz.ts).toBe(true);
    expect(raiz.respondido).toBe(true);
  });

  it("ocultar y dar me gusta se aplican al comentario y se pueden deshacer", () => {
    const cs = comentariosDeMuestra(
      NAWI,
      [
        mov({ tipo: "comentario.ocultar", comentarioId: "nc12", oculto: true, actor: "Equipo" }),
        mov({ tipo: "comentario.ocultar", comentarioId: "nc7", oculto: false, actor: "Equipo" }),
        mov({ tipo: "comentario.megusta", comentarioId: "nc11", valor: true, actor: "Equipo" }),
        mov({ tipo: "comentario.megusta", comentarioId: "nc11", valor: true, actor: "Equipo" }),
      ],
      AHORA,
    );
    expect(cs.find((c) => c.id === "nc12")!.oculto).toBe(true);
    expect(cs.find((c) => c.id === "nc7")!.oculto).toBe(false);
    const nc11 = cs.find((c) => c.id === "nc11")!;
    expect(nc11.meGustaNuestro).toBe(true);
    // Dos clics del mismo lado no suman dos.
    expect(nc11.meGusta).toBe(9);
    expect(nc11.puedeMeGusta).toBe(true);
    expect(cs.find((c) => c.id === "nc1")!.puedeMeGusta).toBe(false);
  });

  it("promociones: el agente ofrece las vigentes; la apagada y la vencida no", () => {
    const ps = promocionesDeMuestra(NAWI, [], HOY);
    expect(ps.map((p) => p.id)).toEqual(NAWI.promociones!.map((p) => p.id));
    const vigentes = promocionesVigentes(ps, HOY).map((p) => p.id);
    expect(vigentes).toEqual(["np1", "np2", "np3", "np4"]);
    expect(ps.find((p) => p.id === "np6")!.hasta).toBe(sumarDias(HOY, -4));
    for (const p of ps) expect(p.tenant).toBe("nawi");
  });

  it("promociones: encender, editar, crear y borrar quedan en el demo", () => {
    const nueva = mov({ tipo: "promo.guardar", promo: { nombre: "Noche de luna llena", descripcion: "Cena en la playa", precio: "$95 por pareja", restricciones: "", desde: "", hasta: "", activa: true }, actor: "Equipo" });
    const ps = promocionesDeMuestra(
      NAWI,
      [
        mov({ tipo: "promo.guardar", promoId: "np5", promo: { activa: true }, actor: "Equipo" }),
        mov({ tipo: "promo.guardar", promoId: "np1", promo: { precio: "3x2 en los drinks de la lista" }, actor: "Equipo" }),
        mov({ tipo: "promo.borrar", promoId: "np6", actor: "Equipo" }),
        nueva,
      ],
      HOY,
    );
    expect(ps[0].id).toBe(nueva.id);
    expect(ps[0].nombre).toBe("Noche de luna llena");
    expect(ps.find((p) => p.id === "np5")!.activa).toBe(true);
    const np1 = ps.find((p) => p.id === "np1")!;
    expect(np1.precio).toBe("3x2 en los drinks de la lista");
    // Editar el precio no le borra el resto.
    expect(np1.nombre).toBe("Happy Hour 2x1");
    expect(ps.some((p) => p.id === "np6")).toBe(false);
  });

  it("la vista del hotel trae los comentarios y las promociones; Tesoro no tiene ninguno", () => {
    const v = armarVista(NAWI, [], AHORA, HOY);
    expect(v.comentarios.length).toBeGreaterThan(0);
    expect(v.promociones.length).toBe(NAWI.promociones!.length);
    const t = armarVista(hotelMuestraDe("tesoro")!, [], AHORA, HOY);
    expect(t.comentarios).toEqual([]);
    expect(t.promociones).toEqual([]);
  });
});

describe("nawi: nada de otro cliente", () => {
  const AJENOS = /Sof[ií]a|Yal[ií]|Porta|Ver[óo]nica|Sunzal|Sunsal|Olga|Jaime|ShopUSA|Claudia|Valeria \(IA\)/;

  it("ni la configuración, ni la bandeja, ni la muestra nombran a otro cliente o a su gente", () => {
    expect(JSON.stringify(nawi)).not.toMatch(AJENOS);
    expect(JSON.stringify(nawiSeed)).not.toMatch(AJENOS);
    expect(JSON.stringify(NAWI)).not.toMatch(AJENOS);
  });
});

describe("nawi: la bandeja y el tablero cuentan lo mismo", () => {
  const convs = new Set(nawiSeed.conversations.map((c) => c.id));
  const staff = new Set(nawiSeed.staff.map((s) => s.id));

  it("cada 'Ver chat' de un apartado abre una conversación que existe", () => {
    for (const a of NAWI.apartados) if (a.conversacionId) expect(convs, a.id).toContain(a.conversacionId);
    for (const t of NAWI.tickets) if (t.conversacionId) expect(convs, `#${t.numero}`).toContain(t.conversacionId);
  });

  it("cada ticket asignado está en manos de alguien del equipo de Nawi", () => {
    for (const t of NAWI.tickets) if (t.asignadoA) expect(staff, `#${t.numero}`).toContain(t.asignadoA);
  });

  it("los apartados y las conversaciones citan el mismo precio", () => {
    const a = NAWI.apartados.find((x) => x.id === "AP-2041")!;
    const hab = NAWI.zonas.flatMap((z) => z.habitaciones).find((h) => h.id === a.habitacionId)!;
    const total = totalEstadia(hab, sumarDias(diaSV(), a.llegaEnDias), a.noches);
    const textos = nawiSeed.messages.filter((m) => m.conversationId === a.conversacionId).map((m) => m.texto).join(" ");
    expect(textos).toContain(`$${total.toLocaleString("en-US")}`);
  });

  it("los números de contacto son inventados (serie 503 9xxx que no se asigna, o 555 en EE. UU.)", () => {
    for (const c of nawiSeed.contacts) if (c.telefono) expect(c.telefono, c.nombre).toMatch(/^(5039\d{7}|1\d{3}555\d{4})$/);
  });
});

describe("nawi: el libro y la foto del tablero", () => {
  const libro = libroDeMuestra(NAWI, HOY);

  it("es repetible: la misma fecha arma el mismo libro", () => {
    expect(libroDeMuestra(NAWI, HOY)).toEqual(libro);
  });

  it("ninguna habitación se vende dos veces la misma noche", () => {
    for (const z of NAWI.zonas) {
      for (const h of z.habitaciones) {
        for (let i = -8; i < 40; i++) {
          const dia = sumarDias(HOY, i);
          const n = libro.filter((r) => r.habitacionId === h.id && r.desde <= dia && dia < r.hasta).length;
          expect(n, `${h.id} ${dia}`).toBeLessThanOrEqual(h.unidades);
        }
      }
    }
  });

  it("la foto cuadra: unidades, ocupación de hoy y KPIs por zona suman el total", () => {
    const f = fotoHotel(NAWI, libro, HOY, 7);
    const unidades = NAWI.zonas.flatMap((z) => z.habitaciones).reduce((s, h) => s + h.unidades, 0);
    expect(f.total.unidades).toBe(unidades);
    expect(f.fechas).toHaveLength(14);
    expect(f.total.ocupacionHoyPct).toBeGreaterThan(0);
    expect(f.total.ocupacionHoyPct).toBeLessThanOrEqual(100);
    expect(f.zonas.reduce((s, z) => s + z.ocupadasHoy, 0)).toBe(f.total.ocupadasHoy);
    expect(f.zonas.reduce((s, z) => s + z.reservasVentana, 0)).toBe(f.total.reservasVentana);
    expect(f.total.porCanal.reduce((s, c) => s + c.reservas, 0)).toBe(f.total.reservasVentana);
    expect(f.total.reservasDelAgente).toBeGreaterThan(0);
    for (const l of f.total.llegadas) {
      expect(diasEntre(HOY, l.desde)).toBeGreaterThanOrEqual(0);
      expect(diasEntre(HOY, l.desde)).toBeLessThan(7);
    }
  });

  it("el fin de semana se llena más que entre semana", () => {
    const f = fotoHotel(NAWI, libro, HOY, 14);
    let finde = 0;
    let semana = 0;
    let nf = 0;
    let ns = 0;
    f.fechas.forEach((d, i) => {
      const ocup = f.zonas.flatMap((z) => z.filas).reduce((s, fila) => s + fila.ocupadasPorNoche[i], 0);
      const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
      if (dow === 5 || dow === 6) {
        finde += ocup;
        nf++;
      } else {
        semana += ocup;
        ns++;
      }
    });
    expect(finde / nf).toBeGreaterThan(semana / ns);
  });
});

describe("nawi: apartados, como en el tablero de Yali", () => {
  it("abre con tres por confirmar, uno con comprobante, y las últimas cerradas", () => {
    const v = armarVista(NAWI, [], AHORA, HOY);
    expect(v.apartados).toHaveLength(3);
    expect(v.apartados.filter((a) => a.estado === "comprobante")).toHaveLength(1);
    expect(v.cerradas.length).toBeGreaterThan(0);
    expect(v.pausa.esperando_pago).toHaveLength(3);
  });

  it("confirmar mete la reserva al libro, la pone primera en las cerradas y la saca de la pausa", () => {
    const antes = armarVista(NAWI, [], AHORA, HOY);
    const v = armarVista(NAWI, [mov({ tipo: "apartado.confirmar", apartadoId: "AP-2039", actor: "Andrea Ayala" })], AHORA, HOY);
    expect(v.apartados.map((a) => a.id)).not.toContain("AP-2039");
    expect(v.libro).toHaveLength(antes.libro.length + 1);
    const r = v.libro.find((x) => x.id === reservaDeApartado(NAWI, "AP-2039"))!;
    expect(r.id).toBe("NW-2039");
    expect(r.origen).toBe("agente");
    expect(v.cerradas[0].estado).toBe("confirmada");
    expect(v.cerradas[0].detalle).toBe("Reserva NW-2039 · Andrea Ayala");
    expect(v.pausa.esperando_pago).toHaveLength(2);
  });

  it("rechazar no toca el libro y lo pasa a 'se cayó por no pagar'", () => {
    const antes = armarVista(NAWI, [], AHORA, HOY);
    const v = armarVista(NAWI, [mov({ tipo: "apartado.rechazar", apartadoId: "AP-2037", actor: "Andrea Ayala" })], AHORA, HOY);
    expect(v.libro).toHaveLength(antes.libro.length);
    expect(v.cerradas[0].estado).toBe("rechazada");
    expect(v.pausa.se_cayo[0].huesped).toBe("Jason Miller");
  });

  it("una reserva a mano ocupa su noche y no deja vender de más", () => {
    const desde = sumarDias(HOY, 3);
    const v0 = armarVista(NAWI, [], AHORA, HOY);
    const r = { id: "NW-PRUEBA", zonaId: "lodge", habitacionId: "lodge", huesped: "Prueba", desde, hasta: sumarDias(desde, 1), huespedes: 4, total: 210, canal: "Directo", origen: "manual" as const };
    const v = armarVista(NAWI, [mov({ tipo: "reserva.nueva", reserva: r, actor: "me" })], AHORA, HOY);
    expect(v.libro).toHaveLength(v0.libro.length + 1);
    // Llenando la Lodge esa noche, ya no hay lugar.
    let libro = v.libro;
    for (let i = 0; i < 10; i++) libro = [...libro, { ...r, id: `x${i}` }];
    expect(hayLugar(NAWI, libro, "lodge", desde, 1)).toBe(false);
  });
});

describe("nawi: tickets, con las mismas reglas que el tablero real", () => {
  it("abre con casos sin tomar, en proceso y resueltos", () => {
    const v = armarVista(NAWI, [], AHORA, HOY);
    expect(v.tickets.filter((t) => t.estado === "abierto" && !t.asignadoA).length).toBeGreaterThanOrEqual(3);
    expect(v.tickets.some((t) => t.estado === "en_proceso")).toBe(true);
    expect(v.tickets.some((t) => t.estado === "resuelto")).toBe(true);
    for (const t of v.tickets.filter((x) => x.estado === "resuelto")) {
      expect(t.asignado! <= t.resuelto!).toBe(true);
      expect(t.creado <= t.asignado!).toBe(true);
    }
  });

  it("tomar sella la hora una sola vez; reasignar no reinicia el reloj", () => {
    const v1 = armarVista(NAWI, [mov({ tipo: "ticket.asignar", ticketId: "nawi-t113", staffId: "s2", actor: "Andrea Ayala" }, 5)], AHORA, HOY);
    const t1 = v1.tickets.find((t) => t.numero === 113)!;
    expect(t1.estado).toBe("asignado");
    const v2 = armarVista(
      NAWI,
      [
        mov({ tipo: "ticket.asignar", ticketId: "nawi-t113", staffId: "s2", actor: "Andrea Ayala" }, 5),
        mov({ tipo: "ticket.asignar", ticketId: "nawi-t113", staffId: "s3", actor: "Andrea Ayala" }, 9),
      ],
      AHORA,
      HOY,
    );
    const t2 = v2.tickets.find((t) => t.numero === 113)!;
    expect(t2.asignadoA).toBe("s3");
    expect(t2.asignado).toBe(t1.asignado);
  });

  it("un ticket nuevo toma el número siguiente y, con dueño, nace asignado", () => {
    const v = armarVista(
      NAWI,
      [
        mov({
          tipo: "ticket.nuevo",
          actor: "Mostrador",
          ticket: { titulo: "Prueba", detalle: "", tipo: "otro", prioridad: "normal", origen: "manual", creadoPor: "Mostrador", contactoNombre: "Alguien", area: "reservas", asignadoA: "s2" },
        }),
      ],
      AHORA,
      HOY,
    );
    const nuevo = v.tickets.find((t) => t.titulo === "Prueba")!;
    expect(nuevo.numero).toBe(Math.max(...NAWI.tickets.map((t) => t.numero)) + 1);
    expect(nuevo.estado).toBe("asignado");
  });
});

describe("nawi: IA Performance", () => {
  it("las cifras cuadran entre sí y hoy va a medias", () => {
    const v = armarVista(NAWI, [], AHORA, HOY);
    const c = cifrasIa(NAWI, HOY, 7, 9, v.libro);
    expect(c.serie).toHaveLength(7);
    expect(c.serie[6].dia).toBe(HOY);
    expect(c.resueltas + c.abiertas).toBe(c.conversaciones);
    expect(c.delAgente + c.delEquipo).toBe(c.respuestas);
    expect(c.porCanal.whatsapp + c.porCanal.facebook + c.porCanal.instagram).toBe(c.mensajes);
    const ayer = c.serie[5];
    const hoy = c.serie[6];
    expect(hoy.whatsapp + hoy.facebook + hoy.instagram).toBeLessThan(ayer.whatsapp + ayer.facebook + ayer.instagram);
    expect(c.temas[0].tema).toBe("Disponibilidad y precio");
    expect(c.fechas.length).toBeGreaterThan(0);
  });

  it("el registro devuelve la muestra de Nawi y nada para los demás", () => {
    expect(hotelMuestraDe("nawi")).toBe(NAWI);
    expect(hotelMuestraDe("hotel")).toBeNull();
  });
});
