import type { Metadata } from "next";
import { ElegirPanel } from "@/components/paneles/ElegirPanel";

export const metadata: Metadata = {
  title: "¿A qué panel entras? · MiAgentIA",
};

// La puerta de las cuentas de la agencia: con sesión, pero antes de elegir
// cliente. AppShell la pinta sin barra ni store (ver RUTA_PANELES).
export default function PanelesPage() {
  return <ElegirPanel />;
}
