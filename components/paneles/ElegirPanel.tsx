"use client";

// "¿A qué panel entras?": lo primero que ve una cuenta de la agencia al entrar.
//
// La cuenta no es de ningún cliente (marca `todos`), así que antes de pintar
// un panel se le pregunta cuál. Es una lista con buscador: con dos clientes se
// ve entera, con treinta se escribe el nombre y se filtra. Se mueve con las
// flechas y se entra con Enter, o con un clic.
//
// Al elegir se pide al servidor una sesión con ese cliente (cambiar-cliente),
// se fija el cliente activo del navegador y se recarga entera, igual que hace
// el login: los módulos leen el cliente al evaluarse.

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { LogOut, Search } from "lucide-react";
import { cerrarSesion } from "@/lib/auth";
import { TENANTS, isTenantId } from "@/lib/tenants";
import { setActiveTenant } from "@/lib/tenants/active";
import {
  filtrarPaneles,
  inicialesDe,
  ordenarPaneles,
  primerNombre,
  type PanelElegible,
} from "@/lib/paneles";

interface Sesion {
  ok?: boolean;
  todos?: boolean;
  nombre?: string | null;
  clientes?: { id: string; nombre: string }[];
}

// La lista la manda el servidor (solo los clientes de esta cuenta); el nombre
// completo y el corto salen de la marca de cada cliente.
function panelesDe(clientes: { id: string; nombre: string }[]): PanelElegible[] {
  const lista: PanelElegible[] = [];
  for (const c of clientes) {
    if (!isTenantId(c.id)) continue;
    const { brand } = TENANTS[c.id];
    lista.push({ id: c.id, nombre: brand.nombre, corto: brand.nombreCorto || c.nombre });
  }
  return ordenarPaneles(lista);
}

// A dónde cae cada panel al entrar: el comercial abre en sus leads, que es
// para lo que entran las asesoras (igual que el login).
function destinoDe(tenant: string): string {
  return tenant === "comercial" ? "/leads" : "/";
}

export function ElegirPanel({ destino = destinoDe }: { destino?: (tenant: string) => string }) {
  const [paneles, setPaneles] = useState<PanelElegible[] | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [marcado, setMarcado] = useState(0);
  const [entrando, setEntrando] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const buscador = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/auth/sesion", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Sesion>) : null))
      .then((d) => {
        if (!vivo) return;
        // Una cuenta de un solo cliente no elige: va directo a su panel.
        if (!d?.todos || !d.clientes?.length) {
          window.location.replace("/");
          return;
        }
        setPaneles(panelesDe(d.clientes));
        setNombre(d.nombre ?? null);
      })
      .catch(() => {
        if (vivo) window.location.replace("/");
      });
    return () => {
      vivo = false;
    };
  }, []);

  const visibles = useMemo(() => (paneles ? filtrarPaneles(paneles, texto) : []), [paneles, texto]);

  useEffect(() => {
    setMarcado(0);
  }, [texto]);

  useEffect(() => {
    if (paneles) buscador.current?.focus();
  }, [paneles]);

  async function entrar(id: string) {
    if (entrando || !isTenantId(id)) return;
    setEntrando(id);
    setError(false);
    try {
      const r = await fetch("/api/auth/cambiar-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant: id }),
      });
      const d = (await r.json().catch(() => ({ ok: false }))) as { ok?: boolean };
      if (!d.ok) throw new Error("No se pudo cambiar de cliente.");
      setActiveTenant(id);
      window.location.assign(destino(id));
    } catch {
      setError(true);
      setEntrando(null);
    }
  }

  function teclas(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMarcado((m) => Math.min(m + 1, Math.max(visibles.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMarcado((m) => Math.max(m - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const p = visibles[marcado];
      if (p) void entrar(p.id);
    }
  }

  const saludo = primerNombre(nombre);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05050A] px-4 py-10">
      {/* Glows de marca, los mismos del login */}
      <div className="pointer-events-none absolute -top-32 left-1/3 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.28),transparent_60%)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.20),transparent_62%)] blur-2xl" />

      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d18] shadow-2xl shadow-black/60">
          <div className="h-1 bg-gradient-to-r from-[#22d3ee] via-[#8b5cf6] to-[#e879f9]" />

          <div className="px-7 pb-7 pt-8">
            <div className="flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/miagentia-lockup.png" alt="MiAgentIA" className="h-10 w-auto" />
            </div>
            <h1 className="mt-6 text-center text-lg font-extrabold tracking-tight text-white">
              ¿A qué panel entras?
            </h1>
            <p className="mt-1 text-center text-[12.5px] text-white/40">
              {saludo ? `Hola, ${saludo}. ` : ""}Elige el cliente con el que vas a trabajar.
            </p>

            <label className="mt-6 block">
              <span className="sr-only">Buscar cliente</span>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#12121c] px-3.5 py-3 transition focus-within:border-[#8b5cf6] focus-within:bg-[#16161f] focus-within:shadow-[0_0_0_4px_rgba(139,92,246,0.12)]">
                <Search size={16} className="shrink-0 text-white/40" />
                <input
                  ref={buscador}
                  type="text"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={teclas}
                  placeholder="Buscar cliente"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="lista-de-paneles"
                  aria-autocomplete="list"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                />
              </div>
            </label>

            <ul
              id="lista-de-paneles"
              role="listbox"
              aria-label="Paneles"
              className="mt-3 max-h-[46vh] space-y-1 overflow-y-auto pr-0.5"
            >
              {paneles === null && (
                <li className="px-3 py-6 text-center text-[12.5px] text-white/40">Cargando tus paneles…</li>
              )}
              {paneles !== null && visibles.length === 0 && (
                <li className="px-3 py-6 text-center text-[12.5px] text-white/40">
                  Ningún cliente se llama así.
                </li>
              )}
              {visibles.map((p, i) => {
                const activo = i === marcado;
                const cargando = entrando === p.id;
                return (
                  <li key={p.id} role="option" aria-selected={activo}>
                    <button
                      type="button"
                      onClick={() => void entrar(p.id)}
                      onMouseEnter={() => setMarcado(i)}
                      disabled={entrando !== null}
                      data-panel={p.id}
                      className={
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition disabled:opacity-60 " +
                        (activo
                          ? "border-[#8b5cf6]/60 bg-[#8b5cf6]/15"
                          : "border-transparent hover:border-white/10 hover:bg-white/5")
                      }
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#22d3ee] via-[#8b5cf6] to-[#e879f9] text-[13px] font-extrabold text-white shadow-sm">
                        {inicialesDe(p.nombre)}
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-[14px] font-bold text-white">{p.nombre}</span>
                        {p.corto && p.corto !== p.nombre && (
                          <span className="block truncate text-[11.5px] text-white/40">{p.corto}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-[11.5px] font-semibold text-white/50">
                        {cargando ? "Entrando…" : "Entrar"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {error && (
              <p className="mt-3 text-center text-[12.5px] text-[#f87171]">
                No se pudo entrar a ese panel. Prueba de nuevo.
              </p>
            )}

            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="text-[11.5px] text-white/30">
                {paneles ? `${paneles.length} ${paneles.length === 1 ? "panel" : "paneles"}` : ""}
              </span>
              <button
                type="button"
                onClick={() => void cerrarSesion()}
                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white/50 transition hover:text-white"
              >
                <LogOut size={14} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
