import { describe, expect, it } from "vitest";
import { coincide, cuantos, filtrarAreas, normalizar } from "@/lib/consultorio/buscar";
import { leerPaciente, leerPersona } from "@/lib/consultorio/validar";
import type { AreaExamenes } from "@/lib/consultorio/examenes";

// El buscador de las listas de exámenes: el doctor, el mostrador y el paciente
// escriben una palabra y les quedan a la vista solo los que calzan.

const AREAS: AreaExamenes[] = [
  {
    id: "hematologia",
    nombre: "Hematología",
    examenes: [
      { id: "h1", codigo: "HE01", nombre: "Hemograma completo", precio: 12 },
      { id: "h2", codigo: "HE02", nombre: "Hemoglobina glicosilada (HbA1c)", precio: 22, nota: "Ayuno de 8 horas" },
    ],
  },
  {
    id: "hormonas",
    nombre: "Hormonas",
    examenes: [
      { id: "t1", codigo: "HO01", nombre: "TSH", precio: 14 },
      { id: "t2", codigo: "HO02", nombre: "T4 libre", precio: 14 },
    ],
  },
];

describe("buscar exámenes", () => {
  it("sin texto deja las áreas tal cual", () => {
    expect(filtrarAreas(AREAS, "")).toBe(AREAS);
    expect(filtrarAreas(AREAS, "   ")).toBe(AREAS);
  });

  it("calza por nombre sin importar tildes ni mayúsculas", () => {
    expect(normalizar("Glicosílada")).toBe("glicosilada");
    const r = filtrarAreas(AREAS, "GLICOSILADA");
    expect(cuantos(r)).toBe(1);
    expect(r[0].examenes[0].id).toBe("h2");
  });

  it("calza por código y por la nota de preparación", () => {
    expect(filtrarAreas(AREAS, "ho02")[0].examenes[0].id).toBe("t2");
    expect(filtrarAreas(AREAS, "ayuno")[0].examenes[0].id).toBe("h2");
  });

  it("varias palabras tienen que estar todas, en cualquier orden", () => {
    expect(coincide(AREAS[0].examenes[1], "hba1c hemoglobina")).toBe(true);
    expect(coincide(AREAS[0].examenes[1], "hemoglobina tsh")).toBe(false);
  });

  it("el nombre del área trae el área entera", () => {
    const r = filtrarAreas(AREAS, "hormonas");
    expect(r).toHaveLength(1);
    expect(r[0].examenes).toHaveLength(2);
  });

  it("lo que no calza con nada deja la lista vacía, sin reventar", () => {
    expect(filtrarAreas(AREAS, "resonancia")).toEqual([]);
    expect(cuantos([])).toBe(0);
  });
});

// La misma regla de entrada para el QR, el doctor y el mostrador.
describe("leer a quien entra", () => {
  it("exige nombre completo y teléfono de ocho dígitos", () => {
    expect(leerPersona({ nombre: "Al", telefono: "77112233" })).toEqual({
      ok: false,
      error: "Escribí el nombre completo.",
    });
    expect(leerPersona({ nombre: "Ana Pérez", telefono: "7711" }).ok).toBe(false);
  });

  it("limpia el teléfono y recorta el correo", () => {
    const r = leerPersona({ nombre: " Ana Pérez ", telefono: "7711-2233", correo: " ana@x.com " });
    expect(r).toEqual({
      ok: true,
      datos: { nombre: "Ana Pérez", telefono: "77112233", correo: "ana@x.com" },
    });
  });

  it("el paciente suma nacimiento, sexo, motivo y alergias; un sexo inventado queda en null", () => {
    const r = leerPaciente({
      nombre: "Ana Pérez",
      telefono: "77112233",
      sexo: "X",
      nacimiento: "",
      motivo: " control ",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.datos.sexo).toBeNull();
      expect(r.datos.nacimiento).toBeNull();
      expect(r.datos.motivo).toBe("control");
      expect(r.datos.alergias).toBe("");
    }
    const f = leerPaciente({ nombre: "Ana Pérez", telefono: "77112233", sexo: "F", nacimiento: "1990-01-02" });
    expect(f.ok && f.datos.sexo).toBe("F");
    expect(f.ok && f.datos.nacimiento).toBe("1990-01-02");
  });
});
