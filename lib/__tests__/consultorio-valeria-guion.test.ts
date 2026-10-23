// EL GUION DE VALERIA DEL LABORATORIO LLEVA REGLAS, NO DATOS.
//
// Lo que se afirma: ningún monto en dólares vive en el guion (los precios los
// trae kb_buscar, y un precio en el guion se queda viejo sin que nadie lo
// vea); el tenant del lab contesta con luna y con este guion; sus herramientas
// son las de la base y el caso, sin agenda (el lab atiende por orden de
// llegada); y cada herramienta que el guion nombra existe.
import { describe, expect, it } from "vitest";
import { VALERIA_LAB } from "@/lib/consultorio/valeria-guion";
import { TENANTS } from "@/lib/tenants";
import { herramientasDeTenant, ejecutarHerramienta } from "@/lib/ai";

describe("el guion del laboratorio", () => {
  it("no trae montos en dólares", () => {
    expect(VALERIA_LAB).not.toMatch(/\$\s?\d/);
  });

  it("no usa guiones largos ni formato que WhatsApp no muestra", () => {
    expect(VALERIA_LAB).not.toMatch(/—/);
    expect(VALERIA_LAB).not.toMatch(/\*\*/);
  });

  it("es el del tenant consultorio, con luna y con el nombre de Valeria", () => {
    const ai = TENANTS.consultorio.ai;
    expect(ai.systemPrompt).toBe(VALERIA_LAB);
    expect(ai.modelo).toBe("luna");
    expect(ai.nombre).toBe("Valeria");
  });

  it("sus herramientas son la base y el caso, sin agenda", () => {
    const h = herramientasDeTenant("consultorio");
    expect(h).toEqual(expect.arrayContaining(["kb_buscar", "crear_ticket", "guardar_datos_contacto", "reaccionar"]));
    expect(h).not.toContain("confirmar_cita");
    expect(h).not.toContain("consultar_disponibilidad");
    for (const nombre of VALERIA_LAB.match(/\b(kb_buscar|crear_ticket|guardar_datos_contacto|reaccionar)\b/g) ?? []) {
      expect(h).toContain(nombre);
    }
  });
});

describe("las herramientas del laboratorio", () => {
  it("kb_buscar contesta con la base del lab y sin la consulta de vuelta", async () => {
    const r = JSON.parse(await ejecutarHerramienta("kb_buscar", { consulta: "hemograma" }, undefined, { tenantId: "consultorio" }));
    expect(Array.isArray(r.resultados)).toBe(true);
    expect(r.resultados.length).toBeGreaterThan(0);
    expect(JSON.stringify(r)).not.toMatch(/"consulta"|"fuente"|"notas"/);
  });

  it("en la prueba, crear_ticket no abre nada: cuenta el caso y devuelve el cierre", async () => {
    const casos: unknown[] = [];
    const r = JSON.parse(
      await ejecutarHerramienta(
        "crear_ticket",
        { tipo: "resultados", titulo: "Pide sus resultados", detalle: "Hemograma del lunes" },
        { onCaso: (c) => void casos.push(c) },
        { tenantId: "consultorio", clave: "prueba:abc" },
      ),
    );
    expect(r.ok).toBe(true);
    expect(r.cierre).toMatch(/compañera del laboratorio/);
    expect(casos).toEqual([{ tipo: "resultados", titulo: "Pide sus resultados" }]);
  });
});
