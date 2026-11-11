"use client";

import { BibliotecaEstudio } from "@/components/estudio/BibliotecaEstudio";
import { SoloEstudio } from "@/components/estudio/SoloEstudio";

// La biblioteca de fotos, gráficos y videos de cada marca. Solo existe en su panel.
export default function Page() {
  return (
    <SoloEstudio>
      <BibliotecaEstudio />
    </SoloEstudio>
  );
}
