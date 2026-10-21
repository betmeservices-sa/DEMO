"use client";

import { CostosEstudio } from "@/components/estudio/CostosEstudio";
import { SoloEstudio } from "@/components/estudio/SoloEstudio";

// Lo que cuesta producir el contenido de cada marca. Solo existe en su panel.
export default function Page() {
  return (
    <SoloEstudio>
      <CostosEstudio />
    </SoloEstudio>
  );
}
