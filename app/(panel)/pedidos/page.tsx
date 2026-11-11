"use client";

import { PedidosVista } from "@/components/lacampana/PedidosVista";
import { SoloCampana } from "@/components/lacampana/ui";

// La cola de pedidos de La Campana. Solo existe en su menú.
export default function PedidosPage() {
  return (
    <SoloCampana>
      <PedidosVista />
    </SoloCampana>
  );
}
