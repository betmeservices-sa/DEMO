"use client";

import { useEffect, useState } from "react";
import { Bot, ChevronDown, ChevronRight, Copy, Hash, Pencil } from "lucide-react";
import { LlamarForm } from "./LlamarForm";
import type { AgenteRecord } from "@/lib/vapi";

// Varios assistants traen el firstMessage ya entrecomillado desde Vapi. Como la
// tarjeta le pone sus propias comillas, sin esto se ve doble ("" ... "").
function sinComillas(s: string): string {
  return s.trim().replace(/^["“”']+/, "").replace(/["“”']+$/, "").trim();
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface px-2 py-0.5 text-[10.5px] font-medium text-[var(--text-2)]">
      {children}
    </span>
  );
}

export function AgenteCard({ agente }: { agente: AgenteRecord }) {
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  // El script se guarda en estado local para reflejar la edicion sin re-pedir
  // toda la lista; se resincroniza si el padre trae uno nuevo.
  const [script, setScript] = useState(agente.script);
  const [borrador, setBorrador] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    setScript(agente.script);
  }, [agente.script]);

  const editando = borrador !== null;

  async function copiarScript() {
    try {
      await navigator.clipboard.writeText(script);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sin permiso de portapapeles no hay nada util que hacer: el script ya
      // esta visible y se puede seleccionar a mano.
    }
  }

  function empezarEdicion() {
    setBorrador(script);
    setErrorGuardar(null);
    setAbierto(true);
  }

  async function guardar() {
    if (borrador === null) return;
    setGuardando(true);
    setErrorGuardar(null);
    try {
      const res = await fetch("/api/agentes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistantId: agente.id, script: borrador }),
      });
      const data = (await res.json()) as { ok?: boolean; script?: string; error?: string };
      if (!res.ok || !data.ok) {
        setErrorGuardar(data.error ?? `Vapi respondió ${res.status}`);
        return;
      }
      setScript(data.script ?? borrador);
      setBorrador(null);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2200);
    } catch (err) {
      setErrorGuardar(err instanceof Error ? err.message : "Error de red");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm">
      <header className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Bot size={18} strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold text-[var(--text)]">{agente.nombre}</h2>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {agente.modelo && <Chip>{agente.modelo}</Chip>}
            {agente.voz && <Chip>{agente.voz}</Chip>}
          </div>
        </div>
      </header>

      <div>
        <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
          Número asignado
        </p>
        {agente.numeros.length === 0 ? (
          <p className="text-xs text-[var(--text-3)]">Sin número asignado</p>
        ) : (
          <ul className="space-y-0.5">
            {agente.numeros.map((n) => (
              <li key={n.id} className="flex items-center gap-1.5 text-xs text-[var(--text)]">
                <Hash size={12} className="text-[var(--text-3)]" />
                <span className="font-semibold">{n.numero}</span>
                {n.nombre && <span className="text-[var(--text-3)]">({n.nombre})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {agente.primerMensaje && (
        <div>
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
            Primer mensaje
          </p>
          <p className="text-xs italic leading-relaxed text-[var(--text-2)]">
            “{sinComillas(agente.primerMensaje)}”
          </p>
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-3)] transition hover:text-[var(--text)]"
          >
            {abierto ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Script
            <span className="font-normal normal-case tracking-normal">
              ({(editando ? borrador : script).length.toLocaleString("es-SV")} caracteres)
            </span>
          </button>
          <div className="flex items-center gap-1.5">
            {guardado && <span className="text-[10.5px] text-emerald-600">Guardado</span>}
            {!editando && (
              <button
                type="button"
                onClick={empezarEdicion}
                className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[10.5px] text-[var(--text-2)] transition hover:bg-surface"
              >
                <Pencil size={11} />
                Editar
              </button>
            )}
            {script && !editando && (
              <button
                type="button"
                onClick={() => void copiarScript()}
                className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[10.5px] text-[var(--text-2)] transition hover:bg-surface"
              >
                <Copy size={11} />
                {copiado ? "Copiado" : "Copiar"}
              </button>
            )}
          </div>
        </div>

        {editando ? (
          <div className="space-y-2">
            <textarea
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              spellCheck={false}
              aria-label={`Script de ${agente.nombre}`}
              className="h-72 w-full resize-y rounded-xl border border-line bg-surface p-3 font-mono text-[11px] leading-relaxed text-[var(--text)] outline-none focus:border-brand"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void guardar()}
                disabled={guardando || borrador.trim().length === 0}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {guardando ? "Guardando..." : "Guardar en Vapi"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBorrador(null);
                  setErrorGuardar(null);
                }}
                disabled={guardando}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-[var(--text-2)] transition hover:bg-surface disabled:opacity-40"
              >
                Cancelar
              </button>
              {borrador.trim().length === 0 && (
                <span className="text-[11px] text-[var(--text-3)]">No puede quedar vacío</span>
              )}
            </div>
            {errorGuardar && (
              <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-[11px] text-red-900">
                No se pudo guardar: {errorGuardar}
              </p>
            )}
          </div>
        ) : script ? (
          abierto ? (
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-surface p-3 text-[11px] leading-relaxed text-[var(--text-2)]">
              {script}
            </pre>
          ) : (
            <p className="line-clamp-2 text-[11px] leading-relaxed text-[var(--text-3)]">
              {script.slice(0, 200)}
            </p>
          )
        ) : (
          <p className="text-[11px] text-[var(--text-3)]">
            Este agente no tiene system prompt. Presioná Editar para escribirle uno.
          </p>
        )}
      </div>

      <div className="border-t border-line pt-3">
        <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
          Probar llamada
        </p>
        <LlamarForm assistantId={agente.id} numeros={agente.numeros} />
      </div>
    </article>
  );
}
