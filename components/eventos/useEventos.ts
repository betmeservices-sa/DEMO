"use client";

// Los datos del tablero de eventos en la pantalla: los pide al servidor, y
// mueve etapas, notas y asesores al momento (optimista) mientras los guarda.

import { useCallback, useEffect, useState } from "react";
import type { LlamadaEvento, Movimiento, Propuesta } from "@/lib/eventos/tipos";
import { aplicarMovimientos } from "@/lib/eventos/estado";
import { useYo } from "@/lib/yo";

export interface DatosEventos {
  propuestas: Propuesta[];
  llamadas: LlamadaEvento[];
  ahora: number;
  guardaEn: "base" | "memoria";
  errorBase?: string;
}

export function useEventos() {
  const [datos, setDatos] = useState<DatosEventos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const yo = useYo();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await fetch("/api/eventos", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error ?? `Error ${r.status}`);
      setDatos({
        propuestas: d.propuestas,
        llamadas: d.llamadas,
        ahora: d.ahora,
        guardaEn: d.guardaEn,
        errorBase: d.errorBase,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** Mueve, anota o reasigna. Se ve al instante y se guarda detrás. */
  const mover = useCallback(
    async (propuestaId: string, tipo: Movimiento["tipo"], valor: Record<string, unknown> = {}) => {
      const local: Movimiento = {
        id: `local-${Date.now()}`,
        propuestaId,
        tipo,
        valor,
        actor: yo,
        ts: new Date().toISOString(),
      };
      setDatos((d) => (d ? { ...d, propuestas: aplicarMovimientos(d.propuestas, [local]) } : d));
      try {
        const r = await fetch("/api/eventos/movimiento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propuestaId, tipo, valor, actor: yo }),
        });
        const d = await r.json().catch(() => ({ ok: false }));
        if (!d.ok) throw new Error(d.error ?? "No se pudo guardar.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
        void cargar();
      }
    },
    [yo, cargar],
  );

  return { datos, error, cargando, cargar, mover, yo };
}
