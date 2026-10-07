"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";
import { departments } from "@/lib/data/seed";
import { activeTenantId } from "@/lib/tenants/active";
import { abrirConversacion } from "@/lib/flotante";
import { Avatar, inicialesDe } from "@/components/ui/Avatar";
import { usePopover } from "./usePopover";

function normal(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Busca entre las conversaciones por nombre, usuario o telefono, y abre la elegida. */
export function Busqueda() {
  const { state } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const { abierto, setAbierto, ref } = usePopover();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  // Ctrl+K (o Cmd+K) lleva el foco a la busqueda desde cualquier pantalla.
  useEffect(() => {
    function atajo(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAbierto(true);
        requestAnimationFrame(() => input.current?.focus());
      }
    }
    window.addEventListener("keydown", atajo);
    return () => window.removeEventListener("keydown", atajo);
  }, [setAbierto]);

  const resultados = useMemo(() => {
    const t = normal(q.trim());
    if (t.length < 2) return [];
    const digitos = q.replace(/\D/g, "");
    return state.conversations
      .map((c) => ({ c, contacto: state.contacts.find((x) => x.id === c.contactId) }))
      .filter(({ contacto }) => {
        if (!contacto) return false;
        if (normal(contacto.nombre).includes(t)) return true;
        if (contacto.handle && normal(contacto.handle).includes(t)) return true;
        return digitos.length >= 3 && (contacto.telefono ?? "").includes(digitos);
      })
      .slice(0, 6);
  }, [q, state.conversations, state.contacts]);

  function abrir(id: string, departamento: (typeof state.conversations)[number]["departamento"]) {
    abrirConversacion(activeTenantId(), id, departamento, pathname, (r) => router.push(r));
    setAbierto(false);
    setQ("");
  }

  return (
    <div ref={ref} className="relative">
      {/* Escritorio: el campo a la vista. Celular: la lupa, que abre el campo. */}
      <label className="hidden h-10 w-[230px] items-center gap-2 rounded-full bg-[var(--surface)] px-3.5 text-[var(--text-2)] ring-1 ring-transparent transition focus-within:bg-[var(--card)] focus-within:ring-[var(--brand-blue)] xl:flex">
        <Search size={16} className="shrink-0" />
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && resultados[0]) abrir(resultados[0].c.id, resultados[0].c.departamento);
          }}
          placeholder="Buscar cliente"
          aria-label="Buscar cliente por nombre o teléfono"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-3)]"
        />
        <kbd className="hidden rounded-md bg-[var(--card)] px-1.5 py-0.5 text-[10.5px] font-semibold text-[var(--text-3)] ring-1 ring-[var(--border)] 2xl:inline">
          Ctrl K
        </kbd>
      </label>
      <button
        type="button"
        onClick={() => {
          setAbierto((v) => !v);
          requestAnimationFrame(() => document.getElementById("caja-busqueda-movil")?.focus());
        }}
        aria-label="Buscar cliente"
        className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-2)] transition hover:bg-[var(--surface)] hover:text-[var(--text)] xl:hidden"
      >
        <Search size={18} />
      </button>

      {abierto && (
        <div
          className={cn(
            "caja-pop absolute right-0 top-[calc(100%+10px)] z-50 w-[min(92vw,340px)] overflow-hidden rounded-2xl bg-[var(--card)] p-2 shadow-xl ring-1 ring-[var(--border)]",
            // En escritorio el campo ya esta a la vista: el panel sale recien
            // cuando hay algo que mostrar.
            q.trim().length < 2 && "xl:hidden",
          )}
        >
          <label className="mb-1 flex h-10 items-center gap-2 rounded-xl bg-[var(--surface)] px-3 xl:hidden">
            <Search size={16} className="text-[var(--text-3)]" />
            <input
              id="caja-busqueda-movil"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && resultados[0]) abrir(resultados[0].c.id, resultados[0].c.departamento);
              }}
              placeholder="Buscar cliente"
              aria-label="Buscar cliente por nombre o teléfono"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-3)]"
            />
          </label>
          {q.trim().length < 2 ? (
            <p className="px-3 py-3 text-[12.5px] text-[var(--text-3)]">Nombre, usuario o teléfono.</p>
          ) : resultados.length === 0 ? (
            <p className="px-3 py-3 text-[12.5px] text-[var(--text-3)]">Sin coincidencias.</p>
          ) : (
            <ul>
              {resultados.map(({ c, contacto }) => {
                const d = departments.find((x) => x.id === c.departamento);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => abrir(c.id, c.departamento)}
                      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-[var(--surface)]"
                    >
                      <Avatar iniciales={inicialesDe(contacto!.nombre)} size={32} color={d?.color} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-[var(--text)]">{contacto!.nombre}</span>
                        <span className="block truncate text-[11.5px] text-[var(--text-3)]">{d?.nombre}</span>
                      </span>
                      {c.noLeidos > 0 && (
                        <span className={cn("h-2 w-2 shrink-0 rounded-full bg-[var(--brand-accent)]")} aria-label="Sin leer" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
