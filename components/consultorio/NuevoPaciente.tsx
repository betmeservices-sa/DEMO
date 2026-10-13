"use client";

// Registrar un paciente a mano, desde el escritorio del doctor.
//
// Es el mismo formulario que el paciente llena al escanear el QR, pero lo
// llena el doctor o su asistente: para quien no trae teléfono inteligente,
// para quien llamó antes, para pasar la agenda de papel. Queda igual que los
// demás: en la lista del doctor y en Contactos.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/consultorio/Modal";

export function NuevoPaciente({ cerrar, registrado }: { cerrar: () => void; registrado?: () => void }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [nacimiento, setNacimiento] = useState("");
  const [sexo, setSexo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [alergias, setAlergias] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const r = await fetch("/api/consultorio/pacientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, telefono, correo, nacimiento, sexo, motivo, alergias }),
      });
      const d = await r.json();
      if (!d.ok) {
        setError(d.error ?? "No se pudo registrar.");
        setGuardando(false);
        return;
      }
      registrado?.();
      cerrar();
      // El doctor registra para atender: se abre el expediente de una vez.
      router.push(`/consultorio/paciente/${d.pacienteId}`);
    } catch {
      setError("No se pudo registrar: falló la conexión.");
      setGuardando(false);
    }
  }

  return (
    <Modal
      titulo="Registrar paciente"
      detalle="Queda en tu lista y en Contactos, igual que si hubiera escaneado tu código."
      cerrar={cerrar}
    >
      <form onSubmit={guardar} className="px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
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
          <label className="block">
            <span className="block text-[13px] font-semibold text-[var(--texto-2)]">
              Nacimiento <span className="font-normal text-[var(--texto-3)]">opcional</span>
            </span>
            <input
              type="date"
              value={nacimiento}
              onChange={(e) => setNacimiento(e.target.value)}
              className="campo mt-1"
            />
          </label>
          <label className="block">
            <span className="block text-[13px] font-semibold text-[var(--texto-2)]">
              Sexo <span className="font-normal text-[var(--texto-3)]">opcional</span>
            </span>
            <select value={sexo} onChange={(e) => setSexo(e.target.value)} className="campo mt-1">
              <option value="">Sin decir</option>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="block text-[13px] font-semibold text-[var(--texto-2)]">
              Motivo de la consulta <span className="font-normal text-[var(--texto-3)]">opcional</span>
            </span>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="campo mt-1"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="block text-[13px] font-semibold text-[var(--texto-2)]">
              Alergias <span className="font-normal text-[var(--texto-3)]">opcional</span>
            </span>
            <input
              value={alergias}
              onChange={(e) => setAlergias(e.target.value)}
              className="campo mt-1"
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 border-l-2 border-[var(--alerta)] bg-[var(--alerta-clara)] px-4 py-2.5 text-[14px] text-[var(--texto)]">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--linea)] pt-4">
          <button type="button" onClick={cerrar} className="boton-2">
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="boton">
            {guardando ? "Registrando" : "Registrar y abrir expediente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
