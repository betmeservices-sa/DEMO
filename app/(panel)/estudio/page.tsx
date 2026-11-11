"use client";

import { ResumenEstudio } from "@/components/estudio/ResumenEstudio";
import { SoloEstudio } from "@/components/estudio/SoloEstudio";

// El resumen del motor de contenido. Solo existe en su panel.
export default function EstudioPage() {
  return (
    <SoloEstudio>
      <ResumenEstudio />
    </SoloEstudio>
  );
}
