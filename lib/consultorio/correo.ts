// Lo que se le manda al paciente por correo.
//
// El envío lo hace n8n: la app arma el contenido y se lo entrega ya escrito, en
// texto plano, al webhook. Es a propósito. Si la app mandara solo los datos
// sueltos, el flujo de n8n tendría que saber redactar una receta, y el día que
// cambie el formato habría que tocarlo allá. Así, n8n hace una sola cosa (poner
// eso en un correo y enviarlo) y el contenido vive con el resto del módulo.
//
// Nunca se manda "enviado" si no salió: la respuesta dice `simulado: true` y la
// pantalla lo repite con todas sus letras. Un visto bueno falso se descubre
// cuando el paciente llega a la farmacia sin la receta.

import { TODOS, NOMBRE_TIPO, conLado } from "./catalogos";
import type { Doctor, Documento, Paciente } from "./tipos";

export const CLINICA = "Centro Médico San Benito";

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" });

export interface CorreoDeDocumento {
  a: string;
  asunto: string;
  texto: string;
  clinica: string;
  codigo: string;
  tipo: Documento["tipo"];
  fecha: string;
  paciente: { nombre: string; telefono: string };
  doctor: { nombre: string; especialidad: string; registro: string; telefono: string };
}

/** El correo listo para enviar: asunto, cuerpo y los datos por si se necesitan. */
export function armarCorreo(
  doc: Documento,
  paciente: Paciente,
  doctor: Doctor,
): CorreoDeDocumento {
  const titulo = doc.tipo === "receta" ? "Receta médica" : NOMBRE_TIPO[doc.tipo];

  const cuerpo =
    doc.tipo === "receta"
      ? doc.medicamentos
          .map(
            (m, i) =>
              `${i + 1}. ${m.nombre}` +
              [m.dosis, m.frecuencia, m.duracion].filter(Boolean).map((x) => `\n   ${x}`).join(""),
          )
          .join("\n")
      : doc.examenes
          .map((id) => {
            const item = TODOS[id];
            const nota = item?.nota ? `\n   ${item.nota}` : "";
            return `- ${conLado(id, doc.lados)}${item?.codigo ? ` (${item.codigo})` : ""}${nota}`;
          })
          .join("\n");

  const lineas = [
    `${CLINICA}`,
    `${titulo}`,
    "",
    `Paciente: ${paciente.nombre}`,
    `Fecha: ${fecha(doc.fecha)}`,
    `Código: ${doc.codigo}`,
    "",
    cuerpo,
    doc.indicaciones ? `\nIndicaciones:\n${doc.indicaciones}` : "",
    doc.tipo !== "receta"
      ? `\nPresente este código en la recepción y le marcamos todo sin llenar nada: ${doc.codigo}`
      : "",
    "",
    `${doctor.nombre}`,
    `${doctor.especialidad} · ${doctor.registro}`,
    `${doctor.telefono}`,
  ];

  return {
    a: paciente.correo,
    asunto: `${titulo} de ${CLINICA} · ${doc.codigo}`,
    texto: lineas.filter((l) => l !== "").join("\n"),
    clinica: CLINICA,
    codigo: doc.codigo,
    tipo: doc.tipo,
    fecha: doc.fecha,
    paciente: { nombre: paciente.nombre, telefono: paciente.telefono },
    doctor: {
      nombre: doctor.nombre,
      especialidad: doctor.especialidad,
      registro: doctor.registro,
      telefono: doctor.telefono,
    },
  };
}

/**
 * Se lo entrega a n8n.
 *
 * La ruta es `<N8N_WEBHOOK_BASE>/consultorio-correo`, y el flujo del otro lado
 * solo tiene que tomar `a`, `asunto` y `texto`. Si no hay base configurada o
 * n8n contesta mal, devuelve false y el módulo dice que el correo NO salió.
 */
export async function mandarPorN8n(correo: CorreoDeDocumento): Promise<boolean> {
  const base = process.env.N8N_WEBHOOK_BASE;
  if (!base) return false;
  try {
    const r = await fetch(`${base.replace(/\/$/, "")}/consultorio-correo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(correo),
    });
    return r.ok;
  } catch {
    return false;
  }
}
