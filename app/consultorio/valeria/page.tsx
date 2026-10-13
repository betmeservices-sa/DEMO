"use client";

// Probar a Valeria: un chat contra el guion real del hospital, sin número.
//
// Quien prueba hace de paciente. Cada turno pasa por /api/consultorio/valeria,
// que lo reenvía al hub (donde vive el guion de la Valeria del WhatsApp real)
// y el hub lo corre en modo espejo: nada se guarda, ningún caso se abre, nada
// sale a nadie. El historial vive en el navegador (localStorage) para poder
// seguir mañana, y "Reiniciar conversación" lo borra.

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, RotateCcw, Send, UserRound } from "lucide-react";
import { Encabezado } from "@/components/consultorio/Encabezado";

interface Mensaje {
  autor: "cliente" | "agente";
  texto: string;
}

interface Estado {
  sesion: string;
  mensajes: Mensaje[];
}

const LLAVE = "consultorio.valeria.prueba";
const SIN_RESPUESTA = "Valeria no respondió. Intenta de nuevo.";

function nuevoEstado(): Estado {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : String(Date.now());
  return { sesion: id, mensajes: [] };
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
      setEstado(guardado ? (JSON.parse(guardado) as Estado) : nuevoEstado());
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
        body: JSON.stringify({ sesion: estado.sesion, mensajes: conPaciente }),
      });
      const d = (await r.json()) as { ok: boolean; respuesta?: string; error?: string };
      if (!d.ok || !d.respuesta) {
        setError(d.error ?? SIN_RESPUESTA);
        return;
      }
      setEstado({ ...estado, mensajes: [...conPaciente, { autor: "agente", texto: d.respuesta }] });
    } catch {
      setError(SIN_RESPUESTA);
    } finally {
      setCargando(false);
      inputRef.current?.focus();
    }
  }

  function reiniciar() {
    if (!estado) return;
    if (estado.mensajes.length && !window.confirm("¿Borrar esta conversación de prueba y empezar de cero?")) return;
    setError(null);
    setTexto("");
    setEstado(nuevoEstado());
  }

  return (
    <>
      <Encabezado
        titulo="Probar a Valeria"
        detalle="Conversación de prueba. No sale por WhatsApp ni abre casos. Mismo guion que el número del hospital."
      >
        <button type="button" onClick={reiniciar} className="boton-2">
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
                <p className="mt-1 max-w-[44ch] text-[13.5px] leading-relaxed text-[var(--texto-2)]">
                  Pregunta precios, horarios, preparación de estudios, promociones o aseguradoras, y mira
                  qué contesta Valeria.
                </p>
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
