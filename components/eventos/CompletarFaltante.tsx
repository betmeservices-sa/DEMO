"use client";

// Completar un dato que faltó en la llamada. El asesor lo escribe mientras
// habla con el organizador y la propuesta se recalcula (prioridad y
// faltantes) al instante.

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { DatosEvento } from "@/lib/eventos/tipos";
import type { Faltante } from "@/lib/eventos/prioridad";
import {
  NOMBRE_CONDICION,
  NOMBRE_ENTRADA,
  NOMBRE_ESPACIO,
  NOMBRE_MODALIDAD,
  NOMBRE_PERMISOS,
  NOMBRE_SERVICIO,
  NOMBRE_SINO,
  NOMBRE_TOLDO,
} from "@/lib/eventos/catalogo";

const OPCIONES: Partial<Record<keyof DatosEvento, Record<string, string>>> = {
  tipo_entrada: NOMBRE_ENTRADA,
  espacio: NOMBRE_ESPACIO,
  modalidad: NOMBRE_MODALIDAD,
  condicion_comercial: NOMBRE_CONDICION,
  exclusividad_pizza: NOMBRE_SINO,
  energia_electrica: NOMBRE_SERVICIO,
  agua: NOMBRE_SERVICIO,
  toldo_mobiliario: NOMBRE_TOLDO,
  permisos_a_cargo_de: NOMBRE_PERMISOS,
};

const NUMEROS = new Set<keyof DatosEvento>([
  "aforo_esperado",
  "monto_cuota",
  "porcentaje_comision",
  "otros_vendedores_comida",
  "asistencia_anterior",
  "precio_boleto",
]);
const FECHAS = new Set<keyof DatosEvento>(["fecha_inicio", "fecha_fin", "fecha_limite_respuesta"]);

export function CompletarFaltante({
  faltante,
  onGuardar,
}: {
  faltante: Faltante;
  onGuardar: (campo: keyof DatosEvento, valor: string | number) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState("");
  const opciones = OPCIONES[faltante.campo];
  const esNumero = NUMEROS.has(faltante.campo);
  const esFecha = FECHAS.has(faltante.campo);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title="Completar"
        className="rounded-md border border-dashed border-[var(--border-2)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--text-2)] transition hover:border-[var(--text)] hover:text-[var(--text)]"
      >
        {faltante.etiqueta}
      </button>
    );
  }

  function guardar() {
    const v = valor.trim();
    if (!v) return;
    onGuardar(faltante.campo, esNumero ? Number(v.replace(/[^\d.]/g, "")) || 0 : v);
    setAbierto(false);
    setValor("");
  }

  return (
    <form
      className="flex w-full items-center gap-1.5 rounded-lg border border-line bg-surface p-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <span className="shrink-0 pl-1 text-[11.5px] font-semibold text-[var(--text-2)]">{faltante.etiqueta}</span>
      {opciones ? (
        <select
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-line bg-card px-2 py-1 text-[12.5px]"
        >
          <option value="">Elegir</option>
          {Object.entries(opciones)
            .filter(([k]) => k && k !== "por_definir")
            .map(([k, nombre]) => (
              <option key={k} value={k}>
                {nombre}
              </option>
            ))}
        </select>
      ) : (
        <input
          autoFocus
          type={esFecha ? "date" : esNumero ? "number" : "text"}
          min={esNumero ? 0 : undefined}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-line bg-card px-2 py-1 text-[12.5px]"
        />
      )}
      <button type="submit" aria-label="Guardar" className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--brand-accent)] text-white">
        <Check size={14} />
      </button>
      <button type="button" aria-label="Cancelar" onClick={() => setAbierto(false)} className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-3)] hover:bg-card">
        <X size={14} />
      </button>
    </form>
  );
}
