"use client";

import { CalendarioEstudio } from "@/components/estudio/CalendarioEstudio";
import { SoloEstudio } from "@/components/estudio/SoloEstudio";

// El calendario de publicación del motor de contenido. Solo existe en su panel.
export default function CalendarioEstudioPage() {
  return (
    <SoloEstudio>
      <CalendarioEstudio />
    </SoloEstudio>
  );
}
