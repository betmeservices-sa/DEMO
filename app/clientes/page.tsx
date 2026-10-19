"use client";

import { ClientesVista } from "@/components/exs/ClientesVista";
import { SoloExs } from "@/components/exs/SoloExs";

// Los casilleros de Express Shopping. Solo existe en su menú y sus datos no se
// le muestran a ningún otro cliente.
export default function ClientesPage() {
  return (
    <SoloExs>
      <ClientesVista />
    </SoloExs>
  );
}
