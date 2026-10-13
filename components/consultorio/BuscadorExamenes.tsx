"use client";

// La caja de buscar de una lista de exámenes. Es la misma en la hoja del
// doctor, en el mostrador y en el teléfono del paciente: escribir y que
// queden a la vista solo los que calzan.

import { Search, X } from "lucide-react";

export function BuscadorExamenes({
  valor,
  cambiar,
  placeholder = "Buscar examen",
  className = "",
  autoFocus = false,
}: {
  valor: string;
  cambiar: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className={`relative block ${className}`}>
      <Search
        size={15}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--texto-3)]"
      />
      <input
        type="search"
        value={valor}
        autoFocus={autoFocus}
        onChange={(e) => cambiar(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="campo campo-icono pr-8"
      />
      {valor && (
        <button
          type="button"
          onClick={() => cambiar("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--texto-3)] hover:text-[var(--texto)]"
        >
          <X size={14} />
        </button>
      )}
    </label>
  );
}
