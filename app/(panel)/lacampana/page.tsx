import type { Metadata, Viewport } from "next";
import { PortalCampana } from "@/components/lacampana/PortalCampana";

// El portal del cliente del demo de La Campana: menú real, carrito con entrega
// o retiro, las 21 sucursales y un chat con Sofía de muestra.
//
// Pública y sin sesión (AppShell la deja pasar sin barra ni login), como la
// abriría un comensal desde el enlace de WhatsApp. Fuera de los buscadores.
export const metadata: Metadata = {
  title: "La Campana · Pedidos",
  description: "Menú, promos, pedidos a domicilio y retiro en sucursal de Restaurante La Campana (demo).",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#05050a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function PaginaCampana() {
  return (
    <div className="portal-campana">
      <PortalCampana />
    </div>
  );
}
