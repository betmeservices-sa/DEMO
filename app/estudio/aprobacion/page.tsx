"use client";

import { AprobacionEstudio } from "@/components/estudio/AprobacionEstudio";
import { SoloEstudio } from "@/components/estudio/SoloEstudio";

// La cola de aprobación: nada sale sin un sí. Solo existe en su panel.
export default function AprobacionPage() {
  return (
    <SoloEstudio>
      <AprobacionEstudio />
    </SoloEstudio>
  );
}
