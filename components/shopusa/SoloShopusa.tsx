"use client";

// Paquetes y Clientes viven en el navegador (la muestra y lo movido en el
// demo), así que no hay una API que le diga que no a otro panel. La frontera
// va aquí: quien escribe /paquetes desde otro cliente no ve nada de ShopUSA.

import type { ReactNode } from "react";
import { activeTenantId } from "@/lib/tenants/active";

export function SoloShopusa({ children }: { children: ReactNode }) {
  if (activeTenantId() !== "shopusa") {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-[13px] text-[var(--text-3)]">
        Este módulo no está habilitado en este panel.
      </div>
    );
  }
  return <>{children}</>;
}
