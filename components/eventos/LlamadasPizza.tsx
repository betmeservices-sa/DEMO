"use client";

// Llamadas de la línea de eventos de Pizza Hut: todo lo que atendió Daniela,
// sea propuesta o no. El servidor ya filtró por el agente de este cliente; la
// muestra es determinista por día y lo real va encima con su insignia.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Moon, PartyPopper, PhoneIncoming, RefreshCw, Search, Timer, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { LlamadaEvento, MotivoLlamada } from "@/lib/eventos/tipos";
import { NOMBRE_MOTIVO, telefonoLegible } from "@/lib/eventos/catalogo";
import { diaHora, duracion } from "@/lib/eventos/fechas";
import { fueraDeHorario } from "@/lib/eventos/metricas";
import { transcripcionDeMuestra } from "@/lib/eventos/semilla";
import { LINEA_DANIELA } from "@/lib/tenants/pizzahut";
import { useEventos } from "./useEventos";
import { RealBadge, miles } from "./ui";
import { Transcripcion } from "./Transcripcion";

type FiltroMotivo = "" | MotivoLlamada;

export function LlamadasPizza() {
  const { datos, cargando, cargar } = useEventos();
  const [motivo, setMotivo] = useState<FiltroMotivo>("");
  const [soloReales, setSoloReales] = useState(false);
  const [soloFuera, setSoloFuera] = useState(false);
  const [q, setQ] = useState("");
  const [abierta, setAbierta] = useState<LlamadaEvento | null>(null);

  const llamadas = datos?.llamadas ?? [];
  const filtradas = useMemo(() => {
    const t = q.replace(/\D/g, "");
    return llamadas.filter(
      (l) =>
        (!motivo || l.motivo === motivo) &&
        (!soloReales || l.origen === "real") &&
        (!soloFuera || fueraDeHorario(l.inicio)) &&
        (!t || l.numero.replace(/\D/g, "").includes(t)),
    );
  }, [llamadas, motivo, soloReales, soloFuera, q]);

  const propuestas = llamadas.filter((l) => l.esPropuesta).length;
  const fuera = llamadas.filter((l) => fueraDeHorario(l.inicio)).length;
  const promedio = llamadas.length ? llamadas.reduce((n, l) => n + l.duracionSeg, 0) / llamadas.length : 0;
  const reales = llamadas.filter((l) => l.origen === "real").length;
  const nombreDe = (id?: string) => datos?.propuestas.find((p) => p.id === id)?.datos.nombre_evento;

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-card px-5 py-3">
        <div>
          <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Llamadas</h1>
          <p className="text-[12.5px] text-[var(--text-3)]">Línea de eventos {LINEA_DANIELA} · últimos 30 días</p>
        </div>
        <button
          type="button"
          onClick={() => void cargar()}
          disabled={cargando}
          className="ml-auto flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-xs font-medium text-[var(--text)] hover:bg-surface disabled:opacity-50"
        >
          <RefreshCw size={14} className={cargando ? "animate-spin" : ""} />
          Actualizar
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Mientras carga, puntos y no ceros: un 0 se lee como "no llamó nadie". */}
          <Cifra Icon={PhoneIncoming} valor={datos ? miles(llamadas.length) : "..."} label="Atendidas por Daniela" pie={reales ? `${reales} reales` : undefined} />
          <Cifra Icon={PartyPopper} valor={datos ? propuestas : "..."} label="Dejaron una propuesta" pie={llamadas.length ? `${Math.round((propuestas / llamadas.length) * 100)}% de las llamadas` : undefined} />
          <Cifra Icon={Moon} valor={datos ? fuera : "..."} label="Fuera de horario" pie="Noches y fines de semana" />
          <Cifra Icon={Timer} valor={datos ? duracion(promedio) : "..."} label="Duración promedio" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar número"
              className="w-44 rounded-lg border border-line bg-card py-1.5 pl-8 pr-2 text-[12.5px]"
            />
          </label>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as FiltroMotivo)}
            className="rounded-lg border border-line bg-card px-2 py-1.5 text-[12.5px] font-medium"
          >
            <option value="">Todos los motivos</option>
            {Object.entries(NOMBRE_MOTIVO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <Interruptor activo={soloFuera} onClick={() => setSoloFuera((x) => !x)} texto="Fuera de horario" />
          <Interruptor activo={soloReales} onClick={() => setSoloReales((x) => !x)} texto="Solo reales" />
          <span className="ml-auto text-[12px] text-[var(--text-3)]">{datos ? `${filtradas.length} llamadas` : "Cargando..."}</span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-line bg-card shadow-sm">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-line text-[11px] font-bold uppercase tracking-wide text-[var(--text-3)]">
                <th className="px-4 py-2.5">Hora</th>
                <th className="px-3 py-2.5">Número</th>
                <th className="px-3 py-2.5">Duración</th>
                <th className="px-3 py-2.5">Motivo</th>
                <th className="px-3 py-2.5">Resumen</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.slice(0, 300).map((l) => (
                <tr key={l.id} onClick={() => setAbierta(l)} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface/70">
                  <td className="whitespace-nowrap px-4 py-2.5 text-[12.5px] text-[var(--text)]">
                    <span className="flex items-center gap-1.5">
                      {diaHora(l.inicio)}
                      {fueraDeHorario(l.inicio) && <Moon size={12} className="text-[var(--text-3)]" aria-label="Fuera de horario" />}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[12px] text-[var(--text-2)]">{l.numero ? telefonoLegible(l.numero) : "Oculto"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[12.5px] text-[var(--text-2)]">{duracion(l.duracionSeg)}</td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-bold",
                          l.esPropuesta ? "bg-[var(--ph-rojo-fondo)] text-[var(--brand-blue-dark)]" : "bg-surface text-[var(--text-2)]",
                        )}
                      >
                        {l.esPropuesta ? "Propuesta" : NOMBRE_MOTIVO[l.motivo]}
                      </span>
                      {l.origen === "real" && <RealBadge />}
                    </span>
                  </td>
                  <td className="max-w-[420px] px-3 py-2.5">
                    <p className="truncate text-[12.5px] text-[var(--text-2)]">
                      {l.esPropuesta && nombreDe(l.propuestaId) ? <strong className="text-[var(--text)]">{nombreDe(l.propuestaId)}: </strong> : null}
                      {l.resumen || "Sin resumen"}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {abierta && (
        <DetalleLlamada
          llamada={abierta}
          propuesta={datos?.propuestas.find((p) => p.id === abierta.propuestaId)}
          onCerrar={() => setAbierta(null)}
        />
      )}
    </div>
  );
}

function Cifra({ Icon, valor, label, pie }: { Icon: typeof Moon; valor: string | number; label: string; pie?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ph-rojo-fondo)] text-brand">
        <Icon size={18} />
      </span>
      <p className="mt-3 text-[24px] font-extrabold leading-none tracking-tight text-[var(--text)]">{valor}</p>
      <p className="mt-1.5 text-[12.5px] font-semibold text-[var(--text-2)]">{label}</p>
      {pie && <p className="text-[11.5px] text-[var(--text-3)]">{pie}</p>}
    </div>
  );
}

function Interruptor({ activo, onClick, texto }: { activo: boolean; onClick: () => void; texto: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold transition",
        activo ? "border-[var(--brand-accent)] bg-[var(--brand-accent)] text-white" : "border-line bg-card text-[var(--text-2)] hover:bg-surface",
      )}
    >
      {texto}
    </button>
  );
}

function DetalleLlamada({
  llamada,
  propuesta,
  onCerrar,
}: {
  llamada: LlamadaEvento;
  propuesta?: Parameters<typeof transcripcionDeMuestra>[1];
  onCerrar: () => void;
}) {
  const [texto, setTexto] = useState<string | null>(null);
  const real = llamada.origen === "real";

  useEffect(() => {
    if (!real) {
      setTexto(transcripcionDeMuestra(llamada, propuesta));
      return;
    }
    let vivo = true;
    fetch(`/api/eventos/llamadas/${encodeURIComponent(llamada.id)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => vivo && setTexto(d.ok ? d.transcripcion || "" : ""))
      .catch(() => vivo && setTexto(""));
    return () => {
      vivo = false;
    };
  }, [llamada, propuesta, real]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onCerrar}>
      <aside className="flex h-full w-full max-w-[560px] flex-col bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog">
        <header className="flex items-start gap-3 border-b border-line bg-card px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-wide text-brand">
              {llamada.esPropuesta ? "Propuesta de evento" : NOMBRE_MOTIVO[llamada.motivo]}
              {real && <RealBadge />}
            </p>
            <h2 className="text-[17px] font-extrabold text-[var(--text)]">{llamada.numero ? telefonoLegible(llamada.numero) : "Número oculto"}</h2>
            <p className="text-[12.5px] text-[var(--text-2)]">
              {diaHora(llamada.inicio)} · {duracion(llamada.duracionSeg)}
              {fueraDeHorario(llamada.inicio) ? " · fuera de horario" : ""}
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-surface">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {llamada.resumen && <p className="rounded-xl border border-line bg-card px-3.5 py-3 text-[13px] leading-relaxed text-[var(--text)]">{llamada.resumen}</p>}
          {llamada.esPropuesta && llamada.propuestaId && (
            <Link
              href={`/eventos?id=${encodeURIComponent(llamada.propuestaId)}`}
              className="flex items-center justify-between rounded-xl border border-line bg-card px-3.5 py-2.5 text-[12.5px] font-semibold text-[var(--text)] hover:border-[var(--text)]"
            >
              Ver la propuesta{propuesta?.datos.nombre_evento ? `: ${propuesta.datos.nombre_evento}` : ""}
              <PartyPopper size={15} className="text-brand" />
            </Link>
          )}
          {real && llamada.grabacion ? (
            <audio controls preload="none" className="h-9 w-full" src={`/api/eventos/llamadas/${encodeURIComponent(llamada.id)}/grabacion`} />
          ) : !real ? (
            <p className="rounded-lg bg-card px-3 py-2 text-[12px] text-[var(--text-3)]">Llamada de muestra: sin audio.</p>
          ) : null}
          {texto === null ? (
            <p className="text-[12.5px] text-[var(--text-3)]">Cargando la transcripción...</p>
          ) : texto ? (
            <Transcripcion texto={texto} quienLlama={llamada.esPropuesta ? "Organizador" : "Cliente"} />
          ) : (
            <p className="text-[12.5px] text-[var(--text-3)]">Esta llamada no dejó transcripción.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
