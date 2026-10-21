"use client";

// Meter una reserva a mano en la muestra: la que llega por teléfono o en
// persona. Ocupa su noche en el libro y suma al tablero igual que las demás.

import { useMemo, useState } from "react";
import { BedDouble, X } from "lucide-react";
import type { HotelMuestra } from "@/lib/hotel-muestra/tipos";
import type { VistaHotel } from "@/lib/hotel-muestra/vista";
import { hayLugar, habitacionDe, totalEstadia } from "@/lib/hotel-muestra/libro";
import { dinero, hash, sumarDias } from "@/lib/hotel-muestra/fechas";
import { registrar } from "@/lib/hotel-muestra/store";

export function NuevaReservaMuestra({
  hotel,
  vista,
  zonaInicial,
  actor,
  onCerrar,
}: {
  hotel: HotelMuestra;
  vista: VistaHotel;
  zonaInicial?: string;
  actor: string;
  onCerrar: () => void;
}) {
  const primera = (hotel.zonas.find((z) => z.id === zonaInicial) ?? hotel.zonas[0]).habitaciones[0];
  const [habitacionId, setHabitacionId] = useState(primera.id);
  const [huesped, setHuesped] = useState("");
  const [desde, setDesde] = useState(sumarDias(vista.hoy, 1));
  const [noches, setNoches] = useState(2);
  const [personas, setPersonas] = useState(2);
  const [canal, setCanal] = useState("Directo");
  const [error, setError] = useState<string | null>(null);

  const ref = habitacionDe(hotel, habitacionId);
  const total = useMemo(() => (ref ? totalEstadia(ref.hab, desde, noches) : 0), [ref, desde, noches]);
  const libre = hayLugar(hotel, vista.libro, habitacionId, desde, noches);

  function guardar() {
    if (!ref) return;
    if (!huesped.trim()) return setError("Falta el nombre del huésped.");
    if (desde < vista.hoy) return setError("La llegada no puede ser antes de hoy.");
    if (personas > ref.hab.capacidad) return setError(`En ${ref.hab.nombre} caben ${ref.hab.capacidad}.`);
    if (!libre) return setError("Esa habitación está llena en alguna de esas noches.");
    registrar({
      tipo: "reserva.nueva",
      actor,
      reserva: {
        id: `${hotel.prefijoReserva}-${hash(`${huesped}|${desde}|${Date.now()}`).toString(36).toUpperCase().slice(-6)}`,
        zonaId: ref.zona.id,
        habitacionId,
        huesped: huesped.trim(),
        desde,
        hasta: sumarDias(desde, noches),
        huespedes: personas,
        total,
        canal,
        origen: "manual",
      },
    });
    onCerrar();
  }

  const campo = "w-full rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-[var(--text)] outline-none focus:border-brand";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-label="Nueva reserva"
        className="w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-[var(--text)]">
            <BedDouble size={16} className="text-brand" />
            Nueva reserva
          </h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1 text-[var(--text-3)] hover:bg-surface">
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-[12px] font-semibold text-[var(--text-2)]">
          <label className="block">
            Huésped
            <input className={campo} value={huesped} onChange={(e) => setHuesped(e.target.value)} placeholder="Nombre y apellido" />
          </label>
          <label className="block">
            Habitación
            <select className={campo} value={habitacionId} onChange={(e) => setHabitacionId(e.target.value)}>
              {hotel.zonas.map((z) => (
                <optgroup key={z.id} label={z.nombre}>
                  {z.habitaciones.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.nombre} · hasta {h.capacidad} · {dinero(h.tarifaNoche)} la noche
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="col-span-1 block">
              Llegada
              <input type="date" className={campo} value={desde} min={vista.hoy} onChange={(e) => setDesde(e.target.value)} />
            </label>
            <label className="block">
              Noches
              <input type="number" min={1} max={14} className={campo} value={noches} onChange={(e) => setNoches(Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <label className="block">
              Personas
              <input type="number" min={1} max={12} className={campo} value={personas} onChange={(e) => setPersonas(Math.max(1, Number(e.target.value) || 1))} />
            </label>
          </div>
          <label className="block">
            Canal
            <select className={campo} value={canal} onChange={(e) => setCanal(e.target.value)}>
              {hotel.canales.map((c) => (
                <option key={c.canal}>{c.canal}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-surface/70 px-3.5 py-2.5 text-[12.5px]">
          <span className={libre ? "text-[var(--text-2)]" : "font-semibold text-red-700"}>
            {libre ? "Hay lugar esas noches" : "Sin lugar en alguna noche"}
          </span>
          <span className="text-[15px] font-extrabold text-[var(--text)]">{dinero(total)}</span>
        </div>
        {error && <p className="mt-2 text-[12px] font-semibold text-red-700">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="rounded-lg border border-line px-3 py-2 text-[12.5px] font-semibold text-[var(--text-2)] hover:bg-surface">
            Cancelar
          </button>
          <button type="button" onClick={guardar} className="rounded-lg bg-brand px-3.5 py-2 text-[12.5px] font-bold text-white hover:opacity-90">
            Guardar reserva
          </button>
        </div>
      </div>
    </div>
  );
}
