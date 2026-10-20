"use client";

import { PaquetesVista } from "@/components/shopusa/PaquetesVista";
import { SoloShopusa } from "@/components/shopusa/SoloShopusa";

// Los paquetes de ShopUSA. Solo existe en su menú y sus datos no se
// le muestran a ningún otro cliente.
export default function PaquetesPage() {
  return (
    <SoloShopusa>
      <PaquetesVista />
    </SoloShopusa>
  );
}
