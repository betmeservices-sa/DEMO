// Postulaciones reales del formulario de carreras de BetMe: validacion,
// conversion a perfil (sin inventar datos), dedup por correo, entrada al
// pipeline por puesto y la ruta publica con CORS. Sin llave de base, el
// servidor usa su respaldo en memoria (solo fuera de produccion).
import { describe, expect, it } from "vitest";
import {
  actualizarConEnvio,
  candidatoDeEnvio,
  fuenteDe,
  limpiarEnvio,
  paisDeTelefono,
  pretensionDeTexto,
  validarEnvio,
  VACANTE_DE_PUESTO,
  vacanteIdDePuesto,
} from "@/lib/talento/formulario";
import { calcularMatch } from "@/lib/talento/matching";
import { sembrarTalento } from "@/lib/talento/seed";
import { leerReal } from "@/lib/talento/servidor";
import { mezclarReales, postulacionesDelTablero } from "@/lib/talento/mezcla";
import { OPTIONS, POST } from "@/app/api/talento/postulacion/route";

const ENVIO = {
  first_name: "Karla",
  last_name: "Pineda",
  email: "Karla.Pineda@Example.com",
  phone: "+503 7123 4567",
  position: "Project Coordinator",
  salary_expectation: "$900 - 1,100",
  voice_recording: "https://voca.ro/1hQeB7vFzK2m",
  how_did_you_hear: "Referral",
  referred_by: "Mónica Castillo",
  resume: "",
  resume_file_url: "https://example.supabase.co/storage/v1/object/public/resumes/cv.pdf",
  additional_notes: "Disponible por las mañanas.",
  source_page: "BetMe Careers Page",
};

describe("validación", () => {
  it("acepta un envío completo", () => {
    expect(validarEnvio(limpiarEnvio(ENVIO))).toEqual([]);
  });
  it("pide nombre, correo válido y teléfono", () => {
    const e = limpiarEnvio({ ...ENVIO, first_name: " ", email: "no-es-correo", phone: "12" });
    expect(validarEnvio(e)).toHaveLength(3);
    expect(validarEnvio(limpiarEnvio({ ...ENVIO, phone: "+503 abc 4567" }))).toHaveLength(1);
  });
  it("todo llega como texto recortado y lo que falta queda vacío", () => {
    const e = limpiarEnvio({ first_name: "  Ana  ", email: 5, extra: "x" });
    expect(e.first_name).toBe("Ana");
    expect(e.email).toBe("5");
    expect(e.position).toBe("");
    expect(Object.keys(e)).not.toContain("extra");
  });
});

describe("conversión a perfil", () => {
  it("país por el código del teléfono", () => {
    expect(paisDeTelefono("+503 7000 0000")).toBe("SV");
    expect(paisDeTelefono("+502 5000 0000")).toBe("GT");
    expect(paisDeTelefono("+504 9000 0000")).toBe("HN");
    expect(paisDeTelefono("+52 55 1234 5678")).toBe("MX");
    expect(paisDeTelefono("+1 305 555 0000")).toBe("OT");
  });
  it("pretensión de texto libre; sin número, sin dato", () => {
    expect(pretensionDeTexto("$900 - 1,100")).toBe(900);
    expect(pretensionDeTexto("1,200 USD")).toBe(1200);
    expect(pretensionDeTexto("1.5k")).toBe(1500);
    expect(pretensionDeTexto("negociable")).toBeNull();
  });
  it("fuente", () => {
    expect(fuenteDe("LinkedIn")).toBe("linkedin");
    expect(fuenteDe("Referral")).toBe("referido");
    expect(fuenteDe("Google")).toBe("google");
    expect(fuenteDe("Other")).toBe("otro");
  });
  it("el perfil no inventa inglés, experiencia, jornada ni skills", () => {
    const c = candidatoDeEnvio(limpiarEnvio(ENVIO), "r-1", "2026-09-23T16:00:00.000Z");
    expect(c.nombre).toBe("Karla Pineda");
    expect(c.correo).toBe("karla.pineda@example.com");
    expect(c.pretension).toBe(900);
    expect(c.skills).toEqual([]);
    expect(c.sinDato).toEqual(expect.arrayContaining(["ingles", "experiencia", "jornada", "horarios", "disponibilidad"]));
    expect(c.sinDato).not.toContain("pretension");
    expect(c.audioUrl).toBe(ENVIO.voice_recording);
    expect(c.cvUrl).toBe(ENVIO.resume_file_url);
    expect(c.puesto).toBe("Project Coordinator");
    expect(c.referidoPor).toBe("Mónica Castillo");
    expect(c.creado).toBe("2026-09-23T16:00:00.000Z");
    expect(c.decision).toBeUndefined();
  });
  it("el match no suma lo que no se sabe", () => {
    const c = candidatoDeEnvio(limpiarEnvio(ENVIO), "r-1", "2026-09-23T16:00:00.000Z");
    const v = sembrarTalento().vacantes.find((x) => x.id === "v4")!;
    const m = calcularMatch(c, v.requisitos);
    expect(m.falta).toEqual(expect.arrayContaining(["Inglés sin dato", "Experiencia sin dato", "Jornada sin dato", "Horario sin dato"]));
    expect(m.detalle.find((d) => d.criterio === "ingles")!.puntos).toBe(0);
    expect(m.score).toBeLessThan(40);
  });
  it("al reaplicar conserva decisión, notas y fecha de ingreso", () => {
    const c = candidatoDeEnvio(limpiarEnvio(ENVIO), "r-1", "2026-09-01T16:00:00.000Z");
    const trabajado = { ...c, decision: { resultado: "aprobado" as const, por: "s3", ts: "x", movimientos: [] }, notas: [{ id: "n", autor: "s3", texto: "hola", ts: "x" }] };
    const nuevo = actualizarConEnvio(trabajado, limpiarEnvio({ ...ENVIO, position: "Business Analyst", salary_expectation: "1300" }));
    expect(nuevo.id).toBe("r-1");
    expect(nuevo.creado).toBe("2026-09-01T16:00:00.000Z");
    expect(nuevo.decision?.resultado).toBe("aprobado");
    expect(nuevo.notas).toHaveLength(1);
    expect(nuevo.puesto).toBe("Business Analyst");
    expect(nuevo.pretension).toBe(1300);
  });
  it("los puestos con vacante abierta apuntan a vacantes que existen y están abiertas", () => {
    const vs = sembrarTalento().vacantes;
    for (const id of Object.values(VACANTE_DE_PUESTO)) expect(vs.find((v) => v.id === id)?.estado, id).toBe("abierta");
  });
});

describe("ruta pública /api/talento/postulacion", () => {
  const pedir = (body: unknown, origin = "https://betmeservices.com") =>
    POST(
      new Request("http://x/api/talento/postulacion", {
        method: "POST",
        headers: { "content-type": "application/json", origin, "x-forwarded-for": "10.0.0.1" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
    );

  it("responde el preflight con CORS al origen que llega", async () => {
    const r = await OPTIONS(new Request("http://x", { method: "OPTIONS", headers: { origin: "https://link.msgsndr.com" } }));
    expect(r.status).toBe(204);
    expect(r.headers.get("access-control-allow-origin")).toBe("https://link.msgsndr.com");
    expect(r.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
    expect(r.headers.get("access-control-allow-headers")).toBe("content-type");
  });

  it("guarda, entra al pipeline por puesto y deduplica por correo", async () => {
    const r1 = await pedir(ENVIO);
    expect(r1.status).toBe(200);
    expect(await r1.json()).toEqual({ ok: true, nuevo: true });
    expect(r1.headers.get("access-control-allow-origin")).toBe("https://betmeservices.com");

    let s = await leerReal();
    const c = s.candidatos.find((x) => x.correo === "karla.pineda@example.com")!;
    expect(c).toBeDefined();
    expect(s.postulaciones.filter((p) => p.candidatoId === c.id)).toMatchObject([{ vacanteId: "v4", etapa: "nuevo" }]);

    // Reaplica con otro puesto y el correo en mayúsculas: mismo perfil, nueva postulación.
    const r2 = await pedir({ ...ENVIO, email: "KARLA.PINEDA@EXAMPLE.COM", position: "Business Analyst" });
    expect(await r2.json()).toEqual({ ok: true, nuevo: false });
    s = await leerReal();
    expect(s.candidatos.filter((x) => x.correo === "karla.pineda@example.com")).toHaveLength(1);
    expect(s.postulaciones.filter((p) => p.candidatoId === c.id).map((p) => p.vacanteId).sort()).toEqual(["v4", "v5"]);

    // Un puesto sin vacante del tablero entra a la vacante de su puesto.
    await pedir({ ...ENVIO, email: "otra@example.com", position: "IT Specialist" });
    s = await leerReal();
    const otra = s.candidatos.find((x) => x.correo === "otra@example.com")!;
    expect(s.postulaciones.filter((p) => p.candidatoId === otra.id)).toMatchObject([{ vacanteId: "f-it-specialist", etapa: "nuevo" }]);
  });

  // El bug del 23 de septiembre: una postulacion real a "Digital Marketing
  // Specialist" (puesto sin vacante en el tablero) aparecia en el match de
  // Vacantes pero no en el Pipeline, porque no se le creaba postulacion y
  // porque el Pipeline solo pinta vacantes que el navegador conoce.
  it("toda postulación del formulario aparece en el Pipeline", async () => {
    await pedir({ ...ENVIO, email: "ktherine@example.com", first_name: "Katherine", position: "Digital Marketing Specialist" });
    const real = await leerReal();
    const c = real.candidatos.find((x) => x.correo === "ktherine@example.com")!;
    const estado = mezclarReales(sembrarTalento(), real);
    const vacante = estado.vacantes.find((v) => v.id === "f-digital-marketing-specialist")!;
    expect(vacante).toMatchObject({ titulo: "Digital Marketing Specialist", estado: "abierta", origen: "formulario" });
    const enTablero = postulacionesDelTablero(estado, "todas").filter((p) => p.candidatoId === c.id);
    expect(enTablero).toHaveLength(1);
    expect(enTablero[0].etapa).toBe("nuevo");
    expect(postulacionesDelTablero(estado, vacante.id).map((p) => p.candidatoId)).toContain(c.id);
    // Y las de puestos con vacante del tablero siguen apareciendo en la suya.
    expect(postulacionesDelTablero(estado, "v4").length).toBeGreaterThan(0);
    // En modo real no se ven los de ejemplo.
    expect(estado.candidatos.some((x) => /^c\d\d$/.test(x.id))).toBe(false);
  });

  it("la vacante de un puesto del formulario no se ofrece para el match", () => {
    expect(vacanteIdDePuesto("Project Coordinator")).toBe("v4");
    expect(vacanteIdDePuesto("Insurance VA (Life/Health)")).toBe("f-insurance-va-life-health");
    expect(vacanteIdDePuesto("")).toBe("f-sin-puesto");
  });

  it("rechaza lo inválido, lo enorme y lo que no es JSON", async () => {
    expect((await pedir({ ...ENVIO, email: "mal" })).status).toBe(400);
    expect((await pedir("no es json")).status).toBe(400);
    expect((await pedir({ ...ENVIO, additional_notes: "x".repeat(30_000) })).status).toBe(413);
  });
});
