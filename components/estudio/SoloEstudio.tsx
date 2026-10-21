"use client";

// El motor de contenido vive en el navegador (la muestra y lo hecho en el
// demo), así que la frontera va aquí: quien escribe /estudio desde otro
// cliente no ve nada de este panel.

import type { ReactNode } from "react";
import { activeTenantId } from "@/lib/tenants/active";

export function SoloEstudio({ children }: { children: ReactNode }) {
  if (activeTenantId() !== "estudio") {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-[13px] text-[var(--text-3)]">
        Este módulo no está habilitado en este panel.
      </div>
    );
  }
  return <>{children}</>;
}
