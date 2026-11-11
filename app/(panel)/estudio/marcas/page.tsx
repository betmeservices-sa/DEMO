"use client";

import { MarcasEstudio } from "@/components/estudio/MarcasEstudio";
import { SoloEstudio } from "@/components/estudio/SoloEstudio";

// El perfil de cada marca que el motor lee antes de escribir. Solo existe en su panel.
export default function Page() {
  return (
    <SoloEstudio>
      <MarcasEstudio />
    </SoloEstudio>
  );
}
