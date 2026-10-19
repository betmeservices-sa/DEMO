"use client";

// Lleva a la bandeja los avisos de WhatsApp de lo que se movió en el demo.
//
// Mover un paquete en el tablero (o despachar un vuelo, o crear la prealerta
// desde una captura) le manda su aviso al cliente. Ese aviso tiene que verse en
// el chat de esa persona, como se vería en su teléfono. La muestra ya trae los
// suyos escritos en la semilla; estos son los nuevos, y salen con el mismo id
// del movimiento, así que volver a la bandeja no los repite.

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { useExs } from "@/lib/exs/store";
import { avisosDelDemo } from "@/lib/exs/vista";

export function AvisosExs() {
  const vista = useExs();
  const { state, dispatch } = useStore();

  useEffect(() => {
    const ya = new Set(state.messages.map((m) => m.id));
    for (const a of avisosDelDemo(vista)) {
      if (ya.has(a.id)) continue;
      const cliente = vista.clientes.find((c) => c.id === a.clienteId);
      if (!cliente) continue;
      // Los avisos salen por WhatsApp: si el chat que ya tiene es de
      // Instagram o Messenger, van a uno de WhatsApp aparte, no a ese hilo.
      const suyo = state.conversations.find((c) => c.id === cliente.conversationId);
      const destino = suyo?.canal === "whatsapp" ? suyo.id : `exs-${cliente.id}`;
      const p = vista.paquetes.find((x) => x.id === a.paqueteId);
      // La confirmación de la prealerta la firma la agente que leyó la captura.
      const deLaIa = p?.historial.some((e) => e.movId && `av-${e.movId}` === a.id && e.tipo === "prealertado");
      dispatch({
        type: "AVISO_SALIENTE",
        id: a.id,
        conversationId: destino,
        texto: a.texto,
        ts: a.ts,
        ...(deLaIa ? { staffId: "ia" } : { staffNombre: "Aviso automático" }),
        nueva: { canal: "whatsapp", nombre: cliente.nombre, telefono: cliente.telefono, departamento: "atencion" },
      });
    }
    // Solo cuando cambian los paquetes: los mensajes nuevos que entran por la
    // bandeja no traen avisos que llevar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, dispatch]);

  return null;
}
