"use client";

import { SoloEstudio } from "@/components/estudio/SoloEstudio";
import { VideosEstudio } from "@/components/estudio/VideosEstudio";

// Los videos con avatar del motor de contenido. Solo existe en su panel.
export default function VideosEstudioPage() {
  return (
    <SoloEstudio>
      <VideosEstudio />
    </SoloEstudio>
  );
}
