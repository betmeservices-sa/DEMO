"use client";

import { ClientesVista } from "@/components/shopusa/ClientesVista";
import { SoloShopusa } from "@/components/shopusa/SoloShopusa";

// Los clientes de ShopUSA. Solo existe en su menú y sus datos no se
// le muestran a ningún otro cliente.
export default function ClientesPage() {
  return (
    <SoloShopusa>
      <ClientesVista />
    </SoloShopusa>
  );
}
