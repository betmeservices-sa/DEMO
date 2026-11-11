"use client";

import { AgendaVista } from "@/components/lacampana/AgendaVista";
import { SoloCampana } from "@/components/lacampana/ui";

// Reservaciones y eventos de La Campana (sin pedidos). Solo existe en su menú.
export default function AgendaPage() {
  return (
    <SoloCampana>
      <AgendaVista />
    </SoloCampana>
  );
}
