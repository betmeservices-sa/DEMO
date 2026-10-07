"use client";

// Leads de conferencia: quien dejo sus datos o pidio la llamada demo en las
// landings del QR (miagentia.com/sandra y /andrea). Se refresca sola cada 30
// segundos y al volver a la pestana, para tenerla abierta durante el evento.
//
// Solo en el panel comercial de MiAgentIA (lib/modulos: MODULOS_COMERCIAL).
// Los datos salen de /api/agencia/leads, que devuelve 403 a cualquier otro
// cliente.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, Loader2, Mail, MessageCircle, Phone, Search, UserPlus } from "lucide-react";
import { cn } from "@/lib/cn";
import { fechaHora, miles, TZ } from "@/lib/formato-agencia";
import {
  TIPO_LEAD,
  diaSV,
  filtrarLeads,
  leadsACsv,
  resumirLeads,
  telefonoDeLead,
  whatsappDe,
  type LeadConferencia,
  type TipoLead,
} from "@/lib/leads-conferencia";

interface Respuesta {
  ok: boolean;
  error?: string;
  leads?: LeadConferencia[];
}

const CADA_MS = 30_000;

const hora = new Intl.DateTimeFormat("es-SV", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });

function cuando(iso: string, hoy: string): string {
  return diaSV(iso) === hoy ? `Hoy, ${hora.format(new Date(iso))}` : fechaHora(iso);
}

const TIPOS: { clave: TipoLead | "todos"; etiqueta: string }[] = [
  { clave: "todos", etiqueta: "Todo" },
  { clave: "datos", etiqueta: "Dejaron datos" },
  { clave: "llamada-demo", etiqueta: "Llamada demo" },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadConferencia[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoy, setHoy] = useState(() => diaSV(new Date()));
  const [actualizado, setActualizado] = useState<string | null>(null);
  const [asesora, setAsesora] = useState<string>("todas");
  const [tipo, setTipo] = useState<TipoLead | "todos">("todos");
  const [texto, setTexto] = useState("");

  const cargar = useCallback(async () => {
    try {
      const r = await fetch("/api/agencia/leads", { cache: "no-store" });
      const d = (await r.json()) as Respuesta;
      if (!d.ok || !d.leads) throw new Error(d.error ?? "No se pudieron leer los leads.");
      setLeads(d.leads);
      setError(null);
      const ahora = new Date();
      setHoy(diaSV(ahora));
      setActualizado(hora.format(ahora));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron leer los leads.");
      setLeads((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    // Primera carga y sondeo. La primera va en un timeout para no llamar
    // setState de forma sincrona dentro del efecto.
    const primera = setTimeout(cargar, 0);
    const t = setInterval(cargar, CADA_MS);
    const alVolver = () => {
      if (!document.hidden) cargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearTimeout(primera);
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargar]);

  const r = useMemo(() => resumirLeads(leads ?? [], hoy), [leads, hoy]);
  const filas = useMemo(() => filtrarLeads(leads ?? [], { asesora, tipo, texto }), [leads, asesora, tipo, texto]);

  const descargar = () => {
    const blob = new Blob(["﻿" + leadsACsv(filas)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leads-conferencia-${hoy}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const chip = (activo: boolean) =>
    cn(
      "rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition",
      activo ? "bg-brand text-white shadow-sm" : "text-[var(--text-2)] hover:bg-card",
    );

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-5 py-3">
        <div>
          <h1 className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-brand">
            <UserPlus size={17} /> Leads de conferencia
          </h1>
          <p className="text-[12.5px] text-[var(--text-3)]">
            Lo que dejan en miagentia.com/sandra y /andrea
            {actualizado ? `. Actualizado ${actualizado}` : ""}
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {error && (
          <p className="rounded-xl border border-[var(--brand-red)]/40 bg-[var(--brand-red)]/10 px-3.5 py-2.5 text-[12.5px]">
            {error}
            {leads && leads.length > 0 ? " Se muestra lo último que cargó y se reintenta solo." : ""}
          </p>
        )}

        {!leads ? (
          <p className="flex items-center gap-2 text-[13px] text-[var(--text-3)]">
            <Loader2 size={15} className="animate-spin text-brand" /> Leyendo los leads
          </p>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Dato titulo="Total" valor={miles(r.total)} />
              <Dato titulo="Hoy" valor={miles(r.hoy)} destacado />
              <Dato titulo="Dejaron datos" valor={miles(r.datos)} />
              <Dato titulo="Pidieron llamada" valor={miles(r.llamadas)} />
            </section>

            <section className="rounded-2xl border border-line bg-card p-4 md:p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {r.porAsesora.length > 0 && (
                  <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
                    <button type="button" onClick={() => setAsesora("todas")} className={chip(asesora === "todas")}>
                      Todas <Cuenta n={r.total} activo={asesora === "todas"} />
                    </button>
                    {r.porAsesora.map((a) => (
                      <button key={a.asesora} type="button" onClick={() => setAsesora(a.asesora)} className={chip(asesora === a.asesora)}>
                        {a.asesora} <Cuenta n={a.total} activo={asesora === a.asesora} />
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
                  {TIPOS.map((t) => (
                    <button key={t.clave} type="button" onClick={() => setTipo(t.clave)} className={chip(tipo === t.clave)}>
                      {t.etiqueta}
                    </button>
                  ))}
                </div>
                <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5">
                  <Search size={14} className="shrink-0 text-[var(--text-3)]" />
                  <input
                    type="search"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="Buscar nombre, empresa, teléfono…"
                    className="w-full bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-3)]"
                  />
                </label>
                <button
                  type="button"
                  onClick={descargar}
                  disabled={filas.length === 0}
                  className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text-2)] hover:bg-card disabled:opacity-40"
                >
                  <Download size={14} /> Descargar CSV
                </button>
              </div>

              {filas.length === 0 ? (
                <p className="py-6 text-center text-[12.5px] text-[var(--text-3)]">
                  {leads.length ? "Nada coincide con ese filtro." : "Todavía no hay leads. Esta pantalla se actualiza sola."}
                </p>
              ) : (
                <>
                  {/* Escritorio: tabla */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-[12.5px]">
                      <thead className="text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                        <tr className="text-left">
                          <th className="py-1.5 pr-3 font-semibold">Cuándo</th>
                          <th className="py-1.5 pr-3 font-semibold">Persona</th>
                          <th className="py-1.5 pr-3 font-semibold">Contacto</th>
                          <th className="py-1.5 pr-3 font-semibold">Interés</th>
                          <th className="py-1.5 pr-3 font-semibold">Asesora</th>
                          <th className="py-1.5 font-semibold">Qué hizo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filas.map((l) => (
                          <tr key={l.id} className="border-t border-line align-top">
                            <td className="whitespace-nowrap py-2.5 pr-3 tabular-nums text-[var(--text-2)]">{cuando(l.creado_en, hoy)}</td>
                            <td className="py-2.5 pr-3">
                              <span className="font-semibold text-[var(--text)]">{l.nombre}</span>
                              {(l.empresa || l.cargo) && (
                                <span className="block text-[11.5px] text-[var(--text-3)]">{[l.empresa, l.cargo].filter(Boolean).join(" · ")}</span>
                              )}
                              {l.mensaje && <span className="mt-1 block text-[11.5px] text-[var(--text-2)]">{l.mensaje}</span>}
                            </td>
                            <td className="py-2.5 pr-3">
                              <Contacto l={l} />
                            </td>
                            <td className="py-2.5 pr-3 text-[var(--text-2)]">{l.interes ?? "·"}</td>
                            <td className="py-2.5 pr-3 text-[var(--text-2)]">{l.asesora ?? "·"}</td>
                            <td className="py-2.5">
                              <Tipo t={l.tipo} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Teléfono: tarjetas */}
                  <ul className="space-y-2.5 md:hidden">
                    {filas.map((l) => (
                      <li key={l.id} className="rounded-xl border border-line bg-surface p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[14.5px] font-bold text-[var(--text)]">{l.nombre}</p>
                            {(l.empresa || l.cargo) && (
                              <p className="truncate text-[12px] text-[var(--text-3)]">{[l.empresa, l.cargo].filter(Boolean).join(" · ")}</p>
                            )}
                          </div>
                          <span className="shrink-0 text-[11.5px] tabular-nums text-[var(--text-3)]">{cuando(l.creado_en, hoy)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Tipo t={l.tipo} />
                          {l.asesora && <Pastilla>{l.asesora}</Pastilla>}
                          {l.interes && <Pastilla>{l.interes}</Pastilla>}
                        </div>
                        <div className="mt-2.5">
                          <Contacto l={l} />
                        </div>
                        {l.mensaje && <p className="mt-2 text-[12px] text-[var(--text-2)]">{l.mensaje}</p>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Dato({ titulo, valor, destacado = false }: { titulo: string; valor: string; destacado?: boolean }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4", destacado ? "border-brand" : "border-line")}>
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-3)]">{titulo}</p>
      <p className={cn("mt-1 text-[22px] font-extrabold leading-none tracking-tight tabular-nums", destacado ? "text-brand" : "text-[var(--text)]")}>
        {valor}
      </p>
    </div>
  );
}

function Cuenta({ n, activo }: { n: number; activo: boolean }) {
  return <span className={cn("tabular-nums", activo ? "text-white/80" : "text-[var(--text-3)]")}>{miles(n)}</span>;
}

function Pastilla({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-[var(--text-2)]">{children}</span>;
}

function Tipo({ t }: { t: TipoLead }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        t === "datos" ? "bg-brand text-white" : "border border-brand text-brand",
      )}
    >
      {TIPO_LEAD[t]}
    </span>
  );
}

function Contacto({ l }: { l: LeadConferencia }) {
  const wa = whatsappDe(l.telefono);
  if (!l.telefono && !l.correo) return <span className="text-[var(--text-3)]">·</span>;
  return (
    <div className="flex flex-col gap-1 text-[12.5px]">
      {l.telefono && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <a href={`tel:${l.telefono}`} className="flex items-center gap-1 tabular-nums text-[var(--text)] hover:underline">
            <Phone size={12} className="text-[var(--text-3)]" /> {telefonoDeLead(l.telefono)}
          </a>
          {wa && (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-semibold text-brand hover:underline"
            >
              <MessageCircle size={12} /> WhatsApp
            </a>
          )}
        </div>
      )}
      {l.correo && (
        <a href={`mailto:${l.correo}`} className="flex items-center gap-1 break-all text-[var(--text)] hover:underline">
          <Mail size={12} className="shrink-0 text-[var(--text-3)]" /> {l.correo}
        </a>
      )}
    </div>
  );
}
