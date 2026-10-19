"use client";

import { PaquetesVista } from "@/components/exs/PaquetesVista";
import { SoloExs } from "@/components/exs/SoloExs";

// Los paquetes de Express Shopping. Solo existe en su menú y sus datos no se
// le muestran a ningún otro cliente.
export default function PaquetesPage() {
  return (
    <SoloExs>
      <PaquetesVista />
    </SoloExs>
  );
}
