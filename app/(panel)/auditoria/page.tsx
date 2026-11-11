"use client";

// Audit logs: quién entró al panel de cada cliente, cuándo y desde dónde.
//
// Solo para la agencia. Antes era la sección "Accesos al panel" al fondo del
// tablero de la agencia; se mudó a su propia página para que el tablero quede
// en lo que se factura y lo que hace el agente. Los datos salen de
// /api/agencia/accesos, que devuelve 403 a cualquiera que no sea la agencia:
// esa es la protección real (la página sola no alcanza, ver lib/modulos).

import { useEffect, useState } from "react";
import { Loader2, ScrollText } from "lucide-react";
import { cn } from "@/lib/cn";
import { ROL, fechaHora, miles } from "@/lib/formato-agencia";
import type { Periodo } from "@/lib/periodos";

interface Fila {
  ts: string;
  tenant: string;
  cliente: string;
  usuario: string;
  nombre: string | null;
  rol: string | null;
  host: string | null;
  ip: string | null;
  activo: boolean;
}

interface Respuesta {
  ok: boolean;
  error?: string;
  accesos: Fila[];
  clientes: { id: string; nombre: string }[];
  truncado: boolean;
}

const PERIODOS: { clave: Periodo; etiqueta: string }[] = [
  { clave: "hoy", etiqueta: "Hoy" },
  { clave: "ayer", etiqueta: "Ayer" },
  { clave: "7d", etiqueta: "7 días" },
  { clave: "30d", etiqueta: "30 días" },
];

export default function AuditoriaPage() {
  const [periodo, setPeriodo] = useState<Periodo>("7d");
  const [cliente, setCliente] = useState<string>("");
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    const q = `periodo=${periodo}${cliente ? `&cliente=${encodeURIComponent(cliente)}` : ""}`;
    fetch(`/api/agencia/accesos?${q}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Respuesta) => {
        if (vivo) setDatos(d);
      })
      .catch(() => {
        if (vivo) setDatos({ ok: false, error: "No se pudo leer el registro.", accesos: [], clientes: [], truncado: false });
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [periodo, cliente]);

  const filas = datos?.accesos ?? [];

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-5 py-3">
        <div>
          <h1 className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-brand">
            <ScrollText size={17} /> Audit logs
          </h1>
          <p className="text-[12.5px] text-[var(--text-3)]">Quién entró al panel de cada cliente, cuándo y desde dónde</p>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
            {PERIODOS.map((p) => (
              <button
                key={p.clave}
                type="button"
                onClick={() => setPeriodo(p.clave)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition",
                  periodo === p.clave ? "bg-brand text-white shadow-sm" : "text-[var(--text-2)] hover:bg-card",
                )}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
            {[{ id: "", nombre: "Todos" }, ...(datos?.clientes ?? [])].map((c) => (
              <button
                key={c.id || "todos"}
                type="button"
                onClick={() => setCliente(c.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition",
                  cliente === c.id ? "bg-brand text-white shadow-sm" : "text-[var(--text-2)] hover:bg-card",
                )}
              >
                {c.nombre}
              </button>
            ))}
          </div>
          {datos?.ok && (
            <span className="ml-auto text-[12px] text-[var(--text-3)]">
              {miles(filas.length)} {filas.length === 1 ? "acceso" : "accesos"}
            </span>
          )}
        </div>

        {datos && !datos.ok && (
          <p className="rounded-xl border border-[var(--brand-red)]/40 bg-[var(--brand-red)]/10 px-3.5 py-2.5 text-[12.5px]">
            {datos.error ?? "No se pudo leer el registro."}
          </p>
        )}

        <section className="rounded-2xl border border-line bg-card p-5">
          {cargando && !datos ? (
            <p className="flex items-center gap-2 text-[13px] text-[var(--text-3)]">
              <Loader2 size={15} className="animate-spin text-brand" /> Leyendo el registro
            </p>
          ) : filas.length === 0 ? (
            <p className="text-[12.5px] text-[var(--text-3)]">Nadie entró al panel en este periodo.</p>
          ) : (
            <div className={cn("overflow-x-auto", cargando && "opacity-60")}>
              <table className="w-full text-[12.5px]">
                <thead className="text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                  <tr className="text-left">
                    <th className="py-1.5 pr-3 font-semibold">Cuándo</th>
                    <th className="py-1.5 pr-3 font-semibold">Cliente</th>
                    <th className="py-1.5 pr-3 font-semibold">Quién</th>
                    <th className="py-1.5 pr-3 font-semibold">Desde</th>
                    <th className="py-1.5 font-semibold">Ahora</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((a, i) => (
                    <tr key={`${a.ts}-${a.usuario}-${i}`} className="border-t border-line">
                      <td className="whitespace-nowrap py-2 pr-3 text-[var(--text-2)]">{fechaHora(a.ts)}</td>
                      <td className="py-2 pr-3 text-[var(--text-2)]">{a.cliente}</td>
                      <td className="py-2 pr-3">
                        <span className="font-semibold text-[var(--text)]">{a.nombre ?? a.usuario}</span>
                        <span className="block text-[11px] text-[var(--text-3)]">
                          {a.usuario}
                          {a.rol ? ` · ${ROL[a.rol] ?? a.rol}` : ""}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-[var(--text-3)]">{[a.host, a.ip].filter(Boolean).join(" · ") || "sin dato"}</td>
                      <td className="py-2">
                        {a.activo ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[#2f9e2f]">Activo</span>
                        ) : (
                          <span className="text-[var(--text-3)]">·</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {datos?.truncado && (
            <p className="mt-3 text-[11.5px] text-[var(--text-3)]">Se leyeron los accesos más recientes; puede haber más en este periodo.</p>
          )}
        </section>
      </div>
    </div>
  );
}
