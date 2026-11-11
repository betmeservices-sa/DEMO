import type { Metadata } from "next";
import "./nutricion.css";
import { cookies } from "next/headers";
import { Shell } from "@/components/nutricion/Shell";
import { COOKIE, rolDeSesion } from "@/lib/nutricion/session";

export const metadata: Metadata = {
  title: "Balance Nutrición · Centro de Comunicación",
  description: "Demo MiAgentIA para agencias de nutrición: bandeja omnicanal, calendarios de consultas y entregas, menús personalizados, seguimiento, recordatorios y renovación de planes.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // El perfil con el que entró decide el menú; en /login todavía no hay.
  const rol = (await rolDeSesion((await cookies()).get(COOKIE)?.value)) ?? "secretaria";
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Shell rol={rol}>{children}</Shell>
      </body>
    </html>
  );
}
