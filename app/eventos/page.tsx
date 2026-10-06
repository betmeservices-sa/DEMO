"use client";

import { EventosVista } from "@/components/eventos/EventosVista";

// Las propuestas de eventos de Pizza Hut. Solo existe en su menú; el servidor
// tampoco le entrega estos datos a ningún otro cliente (/api/eventos).
export default function EventosPage() {
  return <EventosVista />;
}
