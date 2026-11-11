"use client";

// Probar a Valeria: un chat de prueba, sin número.
//
// Quien prueba hace de paciente. Hay dos Valerias:
// - "Laboratorio" (por defecto): la del WhatsApp del laboratorio, con su guion
//   y su base, armados con el respaldo de la Sucursal Escalón. Corre en este
//   demo, con luna. Los casos que abriría (resultados, cotización con seguro,
//   queja) no se abren: se muestran debajo de su respuesta.
// - "Hospital": la del WhatsApp real del hospital. El turno se reenvía al hub,
//   que lo corre en modo espejo.
// Nada sale a nadie. El historial vive en el navegador (localStorage) para
// poder seguir mañana, y "Reiniciar conversación" lo borra.

import { useEffect, useRef, useState } from "react";
import { Bot, ClipboardList, Loader2, RotateCcw, Send, UserRound } from "lucide-react";
import { Encabezado } from "@/components/consultorio/Encabezado";

type Guion = "laboratorio" | "hospital";

interface Mensaje {
  autor: "cliente" | "agente";
  texto: string;
  /** Casos que Valeria habría abierto en ese turno (solo el guion del laboratorio). */
  casos?: { tipo: string; titulo: string }[];
}

interface Estado {
  sesion: string;
  guion: Guion;
  mensajes: Mensaje[];
}

const LLAVE = "consultorio.valeria.prueba";
const SIN_RESPUESTA = "Valeria no respondió. Intenta de nuevo.";

const NOMBRE_GUION: Record<Guion, string> = { laboratorio: "Laboratorio", hospital: "Hospital" };
const DETALLE_GUION: Record<Guion, string> = {
  laboratorio:
    "Conversación de prueba. No sale por WhatsApp ni abre casos. Valeria del laboratorio, con los datos del WhatsApp de la Sucursal Escalón.",
  hospital: "Conversación de prueba. No sale por WhatsApp ni abre casos. Mismo guion que el número del hospital.",
};
const PISTA_GUION: Record<Guion, string> = {
  laboratorio: "Pregunta precios de exámenes, ayuno, horarios, sucursales, seguros o tus resultados, y mira qué contesta Valeria.",
  hospital: "Pregunta precios, horarios, preparación de estudios, promociones o aseguradoras, y mira qué contesta Valeria.",
};

function nuevoEstado(guion: Guion = "laboratorio"): Estado {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : String(Date.now());
  return { sesion: id, guion, mensajes: [] };
}

export default function PaginaValeria() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(LLAVE);
      const e = guardado ? (JSON.parse(guardado) as Partial<Estado>) : null;
      // Lo guardado antes de que hubiera dos guiones era del hospital.
      setEstado(e?.sesion ? { sesion: e.sesion, guion: e.guion ?? "hospital", mensajes: e.mensajes ?? [] } : nuevoEstado());
    } catch {
      setEstado(nuevoEstado());
    }
  }, []);

  useEffect(() => {
    if (!estado) return;
    try {
      localStorage.setItem(LLAVE, JSON.stringify(estado));
    } catch {
      // Sin localStorage la charla dura lo que dure la pestaña, y alcanza.
    }
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [estado]);

  async function enviar() {
    const t = texto.trim();
    if (!t || !estado || cargando) return;
    setTexto("");
    setCargando(true);
    setError(null);
    const conPaciente: Mensaje[] = [...estado.mensajes, { autor: "cliente", texto: t }];
    setEstado({ ...estado, mensajes: conPaciente });
    try {
      const r = await fetch("/api/consultorio/valeria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sesion: estado.sesion,
          guion: estado.guion,
          mensajes: conPaciente.map(({ autor, texto }) => ({ autor, texto })),
        }),
      });
      const d = (await r.json()) as {
        ok: boolean;
        respuesta?: string;
        error?: string;
        casos?: { tipo: string; titulo: string }[];
      };
      if (!d.ok || !d.respuesta) {
        setError(d.error ?? SIN_RESPUESTA);
        return;
      }
      setEstado({
        ...estado,
        mensajes: [...conPaciente, { autor: "agente", texto: d.respuesta, casos: d.casos?.length ? d.casos : undefined }],
      });
    } catch {
      setError(SIN_RESPUESTA);
    } finally {
      setCargando(false);
      inputRef.current?.focus();
    }
  }

  function reiniciar(guion?: Guion) {
    if (!estado) return;
    if (estado.mensajes.length && !window.confirm("¿Borrar esta conversación de prueba y empezar de cero?")) return;
    setError(null);
    setTexto("");
    setEstado(nuevoEstado(guion ?? estado.guion));
  }

  const guion = estado?.guion ?? "laboratorio";

  return (
    <>
      <Encabezado titulo="Probar a Valeria" detalle={DETALLE_GUION[guion]}>
        <div role="group" aria-label="Qué Valeria probar" className="inline-flex rounded-lg border border-[var(--linea)] bg-[var(--panel-2)] p-0.5">
          {(["laboratorio", "hospital"] as const).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={guion === g}
              onClick={() => g !== guion && reiniciar(g)}
              className={`rounded-md px-3 py-1 text-[12.5px] font-semibold transition ${
                guion === g ? "bg-[var(--verde)] text-white shadow-sm" : "text-[var(--texto-3)] hover:text-[var(--texto)]"
              }`}
            >
              {NOMBRE_GUION[g]}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => reiniciar()} className="boton-2">
          <RotateCcw size={15} /> Reiniciar conversación
        </button>
      </Encabezado>

      <div className="flex min-h-0 flex-1 p-6">
        <section className="tarjeta mx-auto flex min-h-[520px] w-full max-w-3xl flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
            {estado && estado.mensajes.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Bot size={30} className="mb-2 text-[var(--verde)]" />
                <p className="font-serif text-[18px] text-[var(--texto)]">Escribe como si fueras un paciente</p>
                <p className="mt-1 max-w-[44ch] text-[13.5px] leading-relaxed text-[var(--texto-2)]">{PISTA_GUION[guion]}</p>
              </div>
            )}
            {estado?.mensajes.map((m, i) => {
              const paciente = m.autor === "cliente";
              return (
                <div key={i} className={`flex items-end gap-2 ${paciente ? "justify-end" : "justify-start"}`}>
                  {!paciente && (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--verde-claro)] text-[var(--verde-hondo)]">
                      <Bot size={14} />
                    </span>
                  )}
                  <div className="max-w-[75%]">
                    <div
                      className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed ${
                        paciente
                          ? "rounded-br-sm bg-[var(--verde)] text-white"
                          : "rounded-bl-sm border border-[var(--linea)] bg-[var(--panel-2)] text-[var(--texto)]"
                      }`}
                    >
                      {m.texto}
                    </div>
                    {m.casos?.map((c, j) => (
                      <p
                        key={j}
                        className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-dashed border-[var(--linea)] px-2 py-0.5 text-[11.5px] text-[var(--texto-2)]"
                      >
                        <ClipboardList size={12} /> Abriría un caso: {c.titulo}
                      </p>
                    ))}
                    <p className={`mt-0.5 text-[11px] text-[var(--texto-3)] ${paciente ? "text-right" : ""}`}>
                      {paciente ? "Paciente" : "Valeria"}
                    </p>
                  </div>
                  {paciente && (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--linea)] bg-[var(--panel-2)] text-[var(--texto-3)]">
                      <UserRound size={14} />
                    </span>
                  )}
                </div>
              );
            })}
            {cargando && (
              <div className="flex items-center gap-2 text-[12.5px] text-[var(--texto-3)]">
                <Loader2 size={13} className="animate-spin text-[var(--verde)]" /> Valeria está escribiendo
              </div>
            )}
            <div ref={finRef} />
          </div>
          {error && (
            <p className="border-t border-[var(--linea)] bg-[var(--alerta-clara)] px-5 py-2 text-[13px] text-[var(--alerta)]">
              {error}
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void enviar();
            }}
            className="flex items-center gap-2 border-t border-[var(--linea)] p-3"
          >
            <input
              ref={inputRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={cargando || !estado}
              placeholder="Escribe como paciente"
              className="campo flex-1 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={cargando || !estado || !texto.trim()}
              className="boton h-10 w-10 justify-center px-0"
              aria-label="Enviar"
            >
              <Send size={16} />
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
