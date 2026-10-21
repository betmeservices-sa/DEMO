// Hotel Tesoro Beach: el segundo hotel de muestra. Que esté bien enchufado al
// demo, que su muestra cuadre con su sitio (120 habitaciones) y con su bandeja,
// y que NAWI y Tesoro no se mezclen: comparten pantallas, no datos.
import { describe, expect, it } from "vitest";
import { TENANTS, isTenantId, resolveTenantByLogin, tenantsDelDemo } from "@/lib/tenants";
import { configTickets, veTickets } from "@/lib/tickets-tenant";
import { TESORO } from "@/lib/hotel-muestra/tesoro";
import { NAWI } from "@/lib/hotel-muestra/nawi";
import { esHotelMuestra, hotelMuestraDe } from "@/lib/hotel-muestra/registro";
import { fotoHotel, libroDeMuestra, totalEstadia } from "@/lib/hotel-muestra/libro";
import { armarVista } from "@/lib/hotel-muestra/vista";
import { diaSV, sumarDias } from "@/lib/hotel-muestra/fechas";
import { tesoroSeed } from "@/lib/tenants/seeds/tesoro";
import { nawiSeed } from "@/lib/tenants/seeds/nawi";

const AHORA = Date.parse("2026-10-21T15:30:00Z");
const HOY = diaSV(AHORA);
const tesoro = TENANTS.tesoro;

describe("tenant tesoro: acceso", () => {
  it("demoagentia / demotesoro entra a Tesoro Beach, y es un panel del demo", () => {
    expect(resolveTenantByLogin("demoagentia", "demotesoro")).toBe("tesoro");
    expect(isTenantId("tesoro")).toBe(true);
    expect(tenantsDelDemo()).toContain("tesoro");
    expect(tesoro.brand.nombre).toBe("Hotel Tesoro Beach");
    expect(tesoro.brand.wordmark?.logoSrc).toBe("/brand/tesoro/simbolo.png");
  });

  it("es un hotel de muestra con su propio tablero de tickets", () => {
    expect(esHotelMuestra("tesoro")).toBe(true);
    expect(hotelMuestraDe("tesoro")).toBe(TESORO);
    expect(veTickets("tesoro")).toBe(true);
    const areas = configTickets("tesoro").areas.map((a) => a.id);
    for (const t of TESORO.tickets) expect(areas, `#${t.numero}`).toContain(t.area);
  });

  it("la agente es Marina, con luna, y NO contesta sola", () => {
    expect(tesoro.ai.nombre).toBe("Marina");
    expect(tesoro.ai.modelo).toBe("luna");
    expect(tesoro.ai.respondeSolo).toBe(false);
    expect(tesoro.whatsapp?.plantillasDelNumeroDemo).toBe(false);
  });
});

describe("tesoro: lo que dice su sitio", () => {
  it("tiene 120 habitaciones, como publica", () => {
    expect(TESORO.zonas.flatMap((z) => z.habitaciones).reduce((s, h) => s + h.unidades, 0)).toBe(120);
  });

  it("el guion cita el Day Pass y las reglas de mascotas tal cual", () => {
    const g = tesoro.ai.systemPrompt;
    expect(g).toContain("Adultos $45");
    expect(g).toContain("niños $25");
    expect(g).toContain("hasta 10 kg");
    expect(g).toContain("2237-6310");
  });
});

describe("NAWI y Tesoro no se mezclan", () => {
  const DE_NAWI = /NAWI|Nawi|Camila|Mizata|Antiresort|Andrea Ayala|Ocean Tree|Lodge/;
  const DE_TESORO = /Tesoro|Marina|Costa del Sol|Herradura|Karla Orellana|Cuádruple/;
  const AJENOS = /Sof[ií]a|Yal[ií]|Porta|Ver[óo]nica|Sunzal|Sunsal|Olga|Jaime|ShopUSA|Claudia/;

  it("Tesoro no nombra nada de NAWI ni de otro cliente", () => {
    for (const x of [tesoro, tesoroSeed, TESORO]) {
      expect(JSON.stringify(x)).not.toMatch(DE_NAWI);
      expect(JSON.stringify(x)).not.toMatch(AJENOS);
    }
  });

  it("NAWI no nombra nada de Tesoro", () => {
    for (const x of [TENANTS.nawi, nawiSeed, NAWI]) expect(JSON.stringify(x)).not.toMatch(DE_TESORO);
  });

  it("lo que se mueve en un hotel no aparece en el otro (cada uno arma su vista)", () => {
    const vNawi = armarVista(NAWI, [], AHORA, HOY);
    const vTesoro = armarVista(TESORO, [], AHORA, HOY);
    expect(vNawi.tickets.every((t) => t.tenant === "nawi")).toBe(true);
    expect(vTesoro.tickets.every((t) => t.tenant === "tesoro")).toBe(true);
    expect(vTesoro.libro.every((r) => r.id.startsWith("TB-"))).toBe(true);
  });
});

describe("tesoro: la bandeja y el tablero cuentan lo mismo", () => {
  const convs = new Set(tesoroSeed.conversations.map((c) => c.id));
  const staff = new Set(tesoroSeed.staff.map((s) => s.id));

  it("cada 'Ver chat' abre una conversación que existe y cada ticket tiene dueño del equipo", () => {
    for (const a of TESORO.apartados) if (a.conversacionId) expect(convs, a.id).toContain(a.conversacionId);
    for (const t of TESORO.tickets) {
      if (t.conversacionId) expect(convs, `#${t.numero}`).toContain(t.conversacionId);
      if (t.asignadoA) expect(staff, `#${t.numero}`).toContain(t.asignadoA);
    }
  });

  it("el apartado y su chat citan el mismo precio", () => {
    const a = TESORO.apartados.find((x) => x.id === "AP-3112")!;
    const hab = TESORO.zonas.flatMap((z) => z.habitaciones).find((h) => h.id === a.habitacionId)!;
    const total = totalEstadia(hab, sumarDias(diaSV(), a.llegaEnDias), a.noches);
    const textos = tesoroSeed.messages.filter((m) => m.conversationId === a.conversacionId).map((m) => m.texto).join(" ");
    expect(textos).toContain(`$${total.toLocaleString("en-US")}`);
  });

  it("el rechazado cuesta lo mismo en 'Últimas cerradas' y en 'Se cayó por no pagar'", () => {
    const v = armarVista(TESORO, [], AHORA, HOY);
    const cerrada = v.cerradas.find((c) => c.huesped === "Mario Cruz")!;
    const pausa = v.pausa.se_cayo.find((p) => p.huesped === "Mario Cruz")!;
    expect(pausa.total).toBe(cerrada.total);
  });

  it("los números de contacto son inventados (serie 503 9xxx que no se asigna)", () => {
    for (const c of tesoroSeed.contacts) if (c.telefono) expect(c.telefono, c.nombre).toMatch(/^5039\d{7}$/);
  });
});

describe("tesoro: la foto del tablero", () => {
  it("cuadra y se llena más el fin de semana que entre semana", () => {
    const libro = libroDeMuestra(TESORO, HOY);
    const f = fotoHotel(TESORO, libro, HOY, 14);
    expect(f.total.unidades).toBe(120);
    expect(f.zonas.reduce((s, z) => s + z.ocupadasHoy, 0)).toBe(f.total.ocupadasHoy);
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
