// De qué hotel viene el contacto sin preguntárselo. Lo que cuidan estas pruebas:
//   - que el link de la bio de cada perfil traiga SU hotel adentro;
//   - que el referral de un anuncio identifique la sede;
//   - que si el primer mensaje ya dice el hotel, el agente NO lo vuelva a
//     preguntar (era la queja: tres perfiles de Instagram, un solo WhatsApp);
//   - que cuando NO se puede saber, se siga preguntando en vez de adivinar.
import { describe, it, expect } from "vitest";
import { fraseBio, linkBio, sedeDeOrigen } from "@/lib/origen-sede";
import { decidirTurno } from "@/lib/sucursal-gate";
import { yalySucursales } from "@/lib/tenants/yaly-sucursales";

const [YALI, COSTA, LINDA] = yalySucursales.opciones;
const NUMERO = "+503 7629 4980";

describe("link para la bio de cada perfil", () => {
  it("apunta al mismo número pero con el hotel escrito adentro", () => {
    const links = yalySucursales.opciones.map((s) => linkBio(NUMERO, s));
    for (const l of links) expect(l.startsWith("https://wa.me/50376294980?text=")).toBe(true);
    expect(new Set(links).size).toBe(3); // los tres son distintos
  });

  it("el texto prellenado nombra la sede y el agente lo entiende", () => {
    for (const sede of yalySucursales.opciones) {
      const frase = fraseBio(sede);
      expect(frase).toContain(sede.nombre);
      expect(sedeDeOrigen({ texto: frase }, yalySucursales)?.id).toBe(sede.id);
    }
  });

  it("el número viaja sin signos ni espacios, como pide wa.me", () => {
    expect(linkBio("+503 7629-4980", YALI)).toContain("wa.me/50376294980?");
  });
});

describe("origen por anuncio (referral de Meta)", () => {
  it("lo saca del titular del anuncio", () => {
    const sede = sedeDeOrigen(
      { texto: "Hola", referral: { headline: "Escapate a Costa del Surf este fin de semana" } },
      yalySucursales,
    );
    expect(sede?.id).toBe(COSTA.id);
  });

  it("lo saca de la URL del anuncio si el texto no dice nada", () => {
    const sede = sedeDeOrigen(
      { texto: "Hola", referral: { source_url: "https://www.yalihospitality.com/playa-linda" } },
      yalySucursales,
    );
    expect(sede?.id).toBe(LINDA.id);
  });

  it("el anuncio manda sobre el texto, que el huésped pudo editar", () => {
    const sede = sedeDeOrigen(
      {
        texto: "Hola, quiero información de Yalí, Playa El Sunzal",
        referral: { headline: "Costa del Surf, Playa Las Flores" },
      },
      yalySucursales,
    );
    expect(sede?.id).toBe(COSTA.id);
  });

  it("un anuncio que no nombra ninguna sede no inventa una", () => {
    expect(sedeDeOrigen({ referral: { headline: "Vacaciones frente al mar" } }, yalySucursales)).toBeNull();
  });
});

describe("cuándo NO se puede saber", () => {
  it("un saludo suelto no identifica nada", () => {
    expect(sedeDeOrigen({ texto: "Hola, buenas tardes" }, yalySucursales)).toBeNull();
  });

  it("sin sedes declaradas no hay nada que deducir", () => {
    expect(sedeDeOrigen({ texto: "Hola, quiero información de Yalí" }, undefined)).toBeNull();
  });
});

describe("la baranda de apertura respeta lo que ya sabemos", () => {
  const base = {
    sucursales: yalySucursales,
    limite: 10,
    mensajesAgente: 0,
    mensajesSucursal: 0,
    sucursalId: null,
    intentos: 0,
  };

  it("si el primer mensaje ya dice el hotel, no lo vuelve a preguntar", () => {
    const d = decidirTurno({ ...base, textoCliente: fraseBio(LINDA) });
    expect(d.tipo).toBe("responder_ia");
    if (d.tipo === "responder_ia") {
      expect(d.sucursal?.id).toBe(LINDA.id);
      expect(d.recienElegida).toBe(true);
    }
  });

  it("con la sede deducida del anuncio tampoco pregunta", () => {
    const d = decidirTurno({ ...base, textoCliente: "Hola", origenSede: YALI });
    expect(d.tipo).toBe("responder_ia");
    if (d.tipo === "responder_ia") expect(d.sucursal?.id).toBe(YALI.id);
  });

  it("si el primer mensaje no dice nada, sigue preguntando como siempre", () => {
    const d = decidirTurno({ ...base, textoCliente: "Hola, buenas" });
    expect(d.tipo).toBe("preguntar_sucursal");
  });
});
