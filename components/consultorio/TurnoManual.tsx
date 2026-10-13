"use client";

// Meter a alguien en la fila a mano, desde el mostrador.
//
// Para quien llega sin teléfono inteligente, sin datos o con el QR borrado:
// recepción escribe su nombre y su teléfono, marca lo que se va a hacer y la
// persona queda en la fila como cualquier otra, con su turno, su código y su
// ficha en Contactos.

import { useMemo, useState } from "react";
import { Modal } from "@/components/consultorio/Modal";
import { BuscadorExamenes } from "@/components/consultorio/BuscadorExamenes";
import { areasDe, valorTotal, type TipoOrden } from "@/lib/consultorio/catalogos";
import { cuantos, filtrarAreas } from "@/lib/consultorio/buscar";
import type { Sucursal, Turno } from "@/lib/consultorio/tipos";

const dinero = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TurnoManual({
  unidad,
  tipoOrden,
  cerrar,
  creado,
}: {
  unidad: Sucursal;
  tipoOrden: TipoOrden;
  cerrar: () => void;
  /** Con el turno ya en la fila. El mostrador decide si lo abre de una vez. */
  creado: (turno: Turno) => void;
}) {
  const AREAS = areasDe(tipoOrden);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [marcados, setMarcados] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibles = useMemo(() => filtrarAreas(AREAS, busca), [AREAS, busca]);

  function marcar(id: string) {
    setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const r = await fetch("/api/consultorio/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unidad: unidad.id, nombre, telefono, correo, examenes: marcados }),
      });
      const d = await r.json();
      if (!d.ok) {
        setError(d.error ?? "No se pudo meter en la fila.");
        setGuardando(false);
        return;
      }
      creado(d.turno as Turno);
      cerrar();
    } catch {
      setError("No se pudo meter en la fila: falló la conexión.");
      setGuardando(false);
    }
  }

  const titulo =
    tipoOrden === "imagen"
      ? "¿Qué estudio se va a hacer?"
      : tipoOrden === "proceso"
        ? "¿Qué se le va a hacer?"
        : "¿Qué exámenes se va a hacer?";

  return (
    <Modal
      titulo="Turno a mano"
      detalle={`Para quien no escaneó el QR. Entra a la fila de ${unidad.nombre} como los demás.`}
      cerrar={cerrar}
      ancho="max-w-3xl"
    >
      <form onSubmit={guardar} className="flex max-h-[inherit] flex-col">
        <div className="px-6 pt-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_1fr_1fr]">
            <label className="block">
              <span className="block text-[13px] font-semibold text-[var(--texto-2)]">
                Nombre completo
              </span>
              <input
                required
                autoFocus
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="campo mt-1 font-serif text-[15.5px]"
              />
            </label>
            <label className="block">
              <span className="block text-[13px] font-semibold text-[var(--texto-2)]">Teléfono</span>
              <input
                required
                type="tel"
                inputMode="tel"
                placeholder="7777 7777"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="campo mt-1"
              />
            </label>
            <label className="block">
              <span className="block text-[13px] font-semibold text-[var(--texto-2)]">
                Correo <span className="font-normal text-[var(--texto-3)]">opcional</span>
              </span>
              <input
                type="email"
                inputMode="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="campo mt-1"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-serif text-[17px] text-[var(--texto)]">{titulo}</h3>
            <BuscadorExamenes valor={busca} cambiar={setBusca} className="w-full sm:w-[280px]" />
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto border-y border-[var(--linea)] px-6 py-3">
          {cuantos(visibles) === 0 ? (
            <p className="py-8 text-center text-[14px] text-[var(--texto-2)]">
              Nada calza con “{busca}”.
            </p>
          ) : (
            <div className="sm:columns-2">
              {visibles.map((a) => (
                <div key={a.id} className="mb-4 break-inside-avoid">
                  <p className="px-2 text-[12.5px] font-semibold text-[var(--texto-3)]">{a.nombre}</p>
                  {a.examenes.map((e) => (
                    <label key={e.id} className="casilla">
                      <input
                        type="checkbox"
                        checked={marcados.includes(e.id)}
                        onChange={() => marcar(e.id)}
                      />
                      <span className="min-w-0 flex-1 text-[14px] leading-snug text-[var(--texto)]">
                        {e.nombre}
                        {e.nota && (
                          <span className="block text-[12px] text-[var(--texto-3)]">{e.nota}</span>
                        )}
                      </span>
                      <span className="shrink-0 font-mono text-[12.5px] text-[var(--texto-3)]">
                        {e.estimado ? "~" : ""}
                        {dinero(e.precio)}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="mx-6 mt-3 border-l-2 border-[var(--alerta)] bg-[var(--alerta-clara)] px-4 py-2.5 text-[14px] text-[var(--texto)]">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <span className="text-[13.5px] text-[var(--texto-2)]">
            {marcados.length === 0
              ? "Marcá lo que se va a hacer"
              : `${marcados.length} ${marcados.length === 1 ? "examen" : "exámenes"} · ${dinero(valorTotal(marcados))}`}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={cerrar} className="boton-2">
              Cancelar
            </button>
            <button type="submit" disabled={guardando || marcados.length === 0} className="boton">
              {guardando ? "Metiendo en la fila" : "Meter en la fila y atender"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
