"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, RefreshCw } from "lucide-react";
import { AgenteCard } from "@/components/agentes/AgenteCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AgenteRecord } from "@/lib/vapi";

interface Respuesta {
  source: "vapi" | "demo";
  agentes: AgenteRecord[];
  sincronizadaEn?: string;
  error?: string;
}

export default function AgentesPage() {
  const [data, setData] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(true);

  const sincronizar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/agentes");
      setData((await res.json()) as Respuesta);
    } catch (err) {
      setData({
        source: "vapi",
        agentes: [],
        error: err instanceof Error ? err.message : "Error de red",
      });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void sincronizar();
  }, [sincronizar]);

  return (
    // Mismo patron que /llamadas: el <main> del AppShell es overflow-hidden, asi
    // que la pagina scrollea por su cuenta con el header fijo arriba.
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-5 py-3">
        <div>
          <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Agentes</h1>
          <p className="text-[12.5px] text-[var(--text-3)]">
            {!data
              ? "Cargando..."
              : `${data.agentes.length} agente${data.agentes.length === 1 ? "" : "s"} de voz ${
                  data.source === "demo" ? "(datos de demostración)" : "en Vapi"
                }`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void sincronizar()}
          disabled={cargando}
          className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-xs font-medium text-[var(--text)] hover:bg-surface disabled:opacity-50"
        >
          <RefreshCw size={14} className={cargando ? "animate-spin" : ""} />
          Sincronizar
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {data?.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
            <strong>No se pudo conectar con Vapi:</strong> {data.error}
          </div>
        )}

        {data?.source === "demo" && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
            <strong>Estás viendo agentes de ejemplo, no los reales.</strong> Falta la variable{" "}
            <code>VAPI_PRIVATE_KEY</code> en este entorno. El botón de llamar queda deshabilitado.
          </div>
        )}

        {data && data.agentes.length === 0 && !data.error ? (
          <EmptyState
            titulo="Sin agentes"
            descripcion="No hay assistants configurados en esta cuenta de Vapi."
            Icon={Bot}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {data?.agentes.map((a) => (
              <AgenteCard key={a.id} agente={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
