"use client";

// La tabla de paquetes del plan, desde que arrancó: mes, paquete, de cuándo a
// cuándo fueron sus 1.000 conversaciones y cuántas lleva. Lo pidió la agencia
// el 2026-11-03 ("paquete #, fecha de inicio y fecha de fin, una tablita
// rápida en excel"): el bloque del plan muestra el ciclo que corre, y acá se
// ve todo el historial de una, sin selector. Se baja como CSV para Excel.
//
// Sale de /api/agencia/plan?ciclo=todos (lib/plan-conversaciones.ts:
// tablaDePaquetes), así que cuenta igual que el bloque del plan.

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { TZ, fechaHora, miles } from "@/lib/formato-agencia";
import { tablaDePaquetes, type CicloDelPlan, type FilaDePaquete, type UsoDelPlan } from "@/lib/plan-conversaciones";

interface Leido {
  cliente: string;
  filas: FilaDePaquete[];
}

/** "13/10/2026 14:22", que Excel lee como fecha. */
const FECHA_EXCEL = new Intl.DateTimeFormat("es-SV", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const fechaExcel = (iso: string | null) => (iso ? FECHA_EXCEL.format(new Date(iso)).replace(",", "") : "");

const ESTADO: Record<FilaDePaquete["estado"], string> = {
  lleno: "Se acabó",
  en_curso: "En curso",
  cerrado: "Cerró el mes sin llenarse",
};

/** El CSV para Excel: con BOM y "sep=," para que abra en columnas en cualquier idioma. */
export function csvDePaquetes(filas: readonly FilaDePaquete[]): string {
  const celda = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cabecera = [
    "Mes",
    "Paquete",
    "Inicio",
    "Fin",
    "Normales usadas",
    "Normales del paquete",
    "Day Pass usadas",
    "Day Pass del paquete",
    "Estado",
  ];
  const lineas = filas.map((f) =>
    [
      f.ciclo,
      f.numero,
      fechaExcel(f.inicio),
      fechaExcel(f.fin),
      f.usadas,
      f.incluidas,
      f.dayPassUsadas,
      f.dayPassIncluidas,
      ESTADO[f.estado],
    ]
      .map(celda)
      .join(","),
  );
  return "﻿sep=,\n" + [cabecera.join(","), ...lineas].join("\n");
}

export function TablaDePaquetes({ cliente }: { cliente: string }) {
  const [datos, setDatos] = useState<Leido | null>(null);
  const [sinPlan, setSinPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setError(null);
    const leer = () =>
      fetch(`/api/agencia/plan?cliente=${encodeURIComponent(cliente)}&ciclo=todos`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { ok: boolean; error?: string; plan?: unknown; ciclos?: { ciclo: CicloDelPlan; uso: UsoDelPlan }[] }) => {
          if (!vivo) return;
          if (!d.ok) {
            setError(d.error ?? "No se pudo leer el plan.");
            return;
          }
          setSinPlan(!d.plan);
          setError(null);
          if (d.plan && d.ciclos) setDatos({ cliente, filas: tablaDePaquetes(d.ciclos, new Date()) });
        })
        .catch(() => {
          if (vivo) setError("No se pudo leer el plan.");
        });
    void leer();
    const t = setInterval(leer, 60_000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [cliente]);

  if (sinPlan) return null;
  const vigente = datos && datos.cliente === cliente ? datos : null;

  const descargar = () => {
    if (!vigente) return;
    const blob = new Blob([csvDePaquetes(vigente.filas)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paquetes-${cliente}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text)]">Paquetes desde que arrancó el plan</h2>
          <p className="text-[12px] text-[var(--text-3)]">
            Cada paquete trae {vigente?.filas[0] ? miles(vigente.filas[0].incluidas) : "1,000"} normales y{" "}
            {vigente?.filas[0] ? miles(vigente.filas[0].dayPassIncluidas) : "500"} de Day Pass · inicio = la primera normal que se
            contó en él · fin = cuando se usó la última normal · hora de El Salvador
          </p>
        </div>
        <button
          type="button"
          onClick={descargar}
          disabled={!vigente}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-2)] transition hover:bg-card disabled:opacity-50"
        >
          <Download size={13} /> Descargar Excel
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-[var(--brand-red)]/40 bg-[var(--brand-red)]/10 px-3 py-2 text-[12px]">
          {error}
          {vigente ? " Se muestra lo último que se leyó." : ""}
        </p>
      )}

      {!vigente ? (
        !error && (
          <p className="mt-4 flex items-center gap-2 text-[13px] text-[var(--text-3)]">
            <Loader2 size={15} className="animate-spin text-brand" /> Contando los paquetes de cada mes
          </p>
        )
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="text-left text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                <th className="pb-2 pr-4 font-semibold">Mes</th>
                <th className="pb-2 pr-4 font-semibold">Paquete</th>
                <th className="pb-2 pr-4 font-semibold">Inicio</th>
                <th className="pb-2 pr-4 font-semibold">Fin</th>
                <th className="pb-2 pr-4 text-right font-semibold">Normales</th>
                <th className="pb-2 text-right font-semibold">Day Pass</th>
              </tr>
            </thead>
            <tbody>
              {vigente.filas.map((f, i) => {
                const primeraDelMes = i === 0 || vigente.filas[i - 1]!.ciclo !== f.ciclo;
                return (
                  <tr
                    key={`${f.ciclo}-${f.numero}`}
                    className={primeraDelMes && i > 0 ? "border-t border-line" : ""}
                  >
                    <td className="py-2 pr-4 font-semibold text-[var(--text)]">{primeraDelMes ? f.ciclo : ""}</td>
                    <td className="py-2 pr-4 text-[var(--text)]">
                      {f.numero}
                      {f.numero === 1 && <span className="text-[var(--text-3)]"> · el plan</span>}
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-[var(--text-2)]">{f.inicio ? fechaHora(f.inicio) : "·"}</td>
                    <td className="py-2 pr-4 tabular-nums text-[var(--text-2)]">
                      {f.fin ? fechaHora(f.fin) : <span className="text-[var(--text-3)]">{ESTADO[f.estado]}</span>}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-[var(--text)]">
                      <b className="font-extrabold">{miles(f.usadas)}</b>
                      <span className="text-[var(--text-3)]"> de {miles(f.incluidas)}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-[var(--text)]">
                      <b className="font-extrabold">{miles(f.dayPassUsadas)}</b>
                      <span className="text-[var(--text-3)]"> de {miles(f.dayPassIncluidas)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
