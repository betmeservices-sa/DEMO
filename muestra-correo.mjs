// Una muestra del correo, para verlo en el navegador antes de conectarlo.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

// Se compila el módulo con tsx para poder llamarlo tal cual está en el repo.
const codigo = `
import { armarHtml } from "./lib/consultorio/correo-html";
const doctor = { id: "dr_moran", nombre: "Dra. Alejandra Morán", especialidad: "Medicina interna", registro: "JVPM 12458", telefono: "+503 2245 8890", correo: "", codigo: "AM4K2P" };
const paciente = { id: "p1", doctorId: "dr_moran", nombre: "Marta Elena Guzmán", telefono: "77124455", correo: "marta@correo.sv", nacimiento: "1968-03-14", sexo: "F", motivo: "Control de diabetes", alergias: "Penicilina", creado: new Date().toISOString() };
const receta = { id: "r1", tipo: "receta", pacienteId: "p1", doctorId: "dr_moran", fecha: new Date().toISOString(), codigo: "QEWXN-953243", medicamentos: [{ nombre: "Metformina 850 mg", dosis: "1 tableta", frecuencia: "cada 12 horas", duracion: "3 meses" }, { nombre: "Losartán 50 mg", dosis: "1 tableta", frecuencia: "cada mañana", duracion: "3 meses" }], indicaciones: "Tomar la metformina con las comidas. Control en tres meses.", enviado: null };
const orden = { id: "o1", tipo: "imagen", pacienteId: "p1", doctorId: "dr_moran", fecha: new Date().toISOString(), codigo: "WCNWL-638508", examenes: ["rx505", "us108", "us103"], lados: { rx505: "izq" }, diagnostico: "Gonalgia izquierda", indicaciones: "Traer estudios previos si los tiene.", enviado: null };
process.stdout.write(armarHtml(receta as never, paciente as never, doctor, "Centro Médico San Benito") + "\n<!--CORTE-->\n" + armarHtml(orden as never, paciente as never, doctor, "Centro Médico San Benito"));
`;
writeFileSync("muestra-correo.ts", codigo);
const salida = execSync("npx tsx muestra-correo.ts", { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
const [receta, orden] = salida.split("<!--CORTE-->");
writeFileSync("C:/Users/ADMIN/Downloads/correo-receta.html", receta);
writeFileSync("C:/Users/ADMIN/Downloads/correo-orden.html", orden);
console.log("muestras en Descargas: correo-receta.html y correo-orden.html");
