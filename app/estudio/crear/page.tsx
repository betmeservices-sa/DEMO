"use client";

import { CrearEstudio } from "@/components/estudio/CrearEstudio";
import { SoloEstudio } from "@/components/estudio/SoloEstudio";

// Crear contenido: el encargo se vuelve piezas para aprobar. Solo existe en su panel.
export default function CrearPage() {
  return (
    <SoloEstudio>
      <CrearEstudio />
    </SoloEstudio>
  );
}
