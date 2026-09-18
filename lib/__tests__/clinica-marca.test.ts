// La marca del Centro Ginecológico en el módulo de la clínica.
//
// Lo que se cuida acá es lo que se rompe callado: que el nombre viejo no
// reviva en un pie de correo, que el logotipo del correo salga con URL
// absoluta (una ruta relativa dentro de un correo no apunta a ningún lado) y
// que cada barra reciba el archivo del color que puede mostrar.
import { describe, expect, it } from "vitest";
import { TENANTS } from "@/lib/tenants";
import { CLINICA, LOGO, LOGO_CORREO, SIMBOLO } from "@/lib/consultorio/marca";
import { armarCorreo } from "@/lib/consultorio/correo";
import type { Doctor, Documento, Paciente } from "@/lib/consultorio/tipos";

const DOCTOR: Doctor = {
  id: "doc1",
  nombre: "Dra. Alejandra Morán",
  especialidad: "Medicina interna",
  registro: "JVPM 12458",
  telefono: "+503 2245 8890",
  correo: "alejandra.moran@centroginecologico.com",
  codigo: "AM4K2P",
};

const PACIENTE: Paciente = {
  id: "pac1",
  doctorId: "doc1",
  nombre: "Marta Elena Solórzano",
  telefono: "77124408",
  correo: "marta@gmail.com",
  creado: "2026-09-18T15:00:00.000Z",
  nacimiento: "",
  sexo: null,
  motivo: "Control anual",
  alergias: "",
};

const RECETA: Documento = {
  id: "rec1",
  pacienteId: "pac1",
  doctorId: "doc1",
  fecha: "2026-09-18T15:00:00.000Z",
  codigo: "WUMLS-803143",
  tipo: "receta",
  medicamentos: [{ nombre: "Ácido fólico 5 mg", dosis: "1 tableta", frecuencia: "cada día", duracion: "por 3 meses" }],
  indicaciones: "",
  enviado: null,
};

describe("la marca de la clínica", () => {
  it("el cliente es el Centro Ginecológico en todas partes", () => {
    expect(CLINICA).toBe("Centro Ginecológico");
    expect(TENANTS.consultorio.brand.nombre).toBe(CLINICA);
    expect(TENANTS.consultorio.brand.tagline).toBe("Somos parte de tu vida");
  });

  it("cada barra recibe el archivo del color que puede mostrar", () => {
    // La de la clínica es clara y la del hospital es oscura: el mismo archivo
    // en el color equivocado desaparece.
    expect(TENANTS.consultorio.brand.wordmark?.logoSrc).toBe(SIMBOLO.azul);
    expect(TENANTS.hospital.brand.wordmark?.logoSrc).toBe(SIMBOLO.blanco);
  });

  it("el guion del agente se presenta con el nombre nuevo", () => {
    expect(TENANTS.consultorio.ai.systemPrompt).toContain("Centro Ginecológico");
    expect(TENANTS.consultorio.ai.systemPrompt).not.toContain("San Benito");
  });
});

describe("el logotipo del correo", () => {
  const correo = armarCorreo(RECETA, PACIENTE, DOCTOR, "https://demo.miagentia.com/portal");

  it("va en PNG y con URL absoluta, que es lo único que pinta un correo", () => {
    expect(correo.html).toContain(`https://demo.miagentia.com${LOGO_CORREO}`);
    expect(LOGO_CORREO.endsWith(".png")).toBe(true);
    // El SVG se queda para la pantalla: Gmail no lo pinta.
    expect(correo.html).not.toContain(LOGO.azul);
  });

  it("la receta se lee entera aunque el correo bloquee las imágenes", () => {
    expect(correo.html).toContain("Ácido fólico 5 mg");
    expect(correo.html).toContain(DOCTOR.nombre);
    expect(correo.texto).toContain("Ácido fólico 5 mg");
  });

  it("sin dominio confiable sale sin logo, antes que con una imagen rota", () => {
    const suelto = armarCorreo(RECETA, PACIENTE, DOCTOR);
    expect(suelto.html).not.toContain("<img");
    expect(suelto.html).toContain(DOCTOR.nombre);
  });
});
