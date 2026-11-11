import { doctorActual } from "@/lib/consultorio/actual";
import {
  colaDelDoctor,
  documentosDeDoctor,
  listarDoctores,
  pacientesDe,
} from "@/lib/consultorio/almacen";
import { TablaPacientes } from "@/components/consultorio/TablaPacientes";
import { CambiarEscritorio } from "@/components/consultorio/Escritorio";

export const dynamic = "force-dynamic";

export default async function PaginaPacientes() {
  const doctor = await doctorActual();
  const documentos = await documentosDeDoctor(doctor.id);
  // Cuántos documentos tiene cada quien, contado una sola vez acá en vez de
  // recorrer la lista completa por cada fila de la tabla.
  const porPaciente: Record<string, { recetas: number; ordenes: number; notas: number }> = {};
  for (const d of documentos) {
    const c = (porPaciente[d.pacienteId] ??= { recetas: 0, ordenes: 0, notas: 0 });
    if (d.tipo === "receta") c.recetas += 1;
    else if (d.tipo === "nota") c.notas += 1;
    else c.ordenes += 1;
  }

  return (
    <TablaPacientes
      codigo={doctor.codigo}
      iniciales={await pacientesDe(doctor.id)}
      cola={await colaDelDoctor(doctor.id)}
      documentos={porPaciente}
      escritorio={
        <CambiarEscritorio
          que="doctor"
          actual={doctor.id}
          volverA="/consultorio"
          opciones={listarDoctores().map((d) => ({
            id: d.id,
            nombre: d.nombre,
            detalle: d.especialidad,
          }))}
        />
      }
    />
  );
}
