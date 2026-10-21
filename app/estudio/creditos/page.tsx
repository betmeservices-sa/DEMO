"use client";

import { CreditosEstudio } from "@/components/estudio/CreditosEstudio";
import { SoloEstudio } from "@/components/estudio/SoloEstudio";

// Los créditos de cada marca: lo usado del plan del mes, en qué se fue y lo
// que queda. Solo existe en el panel del motor de contenido.
export default function CreditosPage() {
  return (
    <SoloEstudio>
      <CreditosEstudio />
    </SoloEstudio>
  );
}
