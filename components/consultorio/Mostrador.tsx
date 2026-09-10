"use client";

// La consola del mostrador: la fila de hoy y el récord de quien está siendo
// atendido.
//
// Es la contraparte de la pantalla del paciente. Sin esto la fila no avanza
// nunca y el "sos el 4" se queda congelado para siempre.
//
// Se refresca sola cada cinco segundos porque llegan turnos mientras la
// pantalla está abierta: alguien escanea en la entrada y tiene que aparecer sin
// que nadie toque nada.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Printer, Timer } from "lucide-react";
import { agrupar } from "@/lib/consultorio/examenes";
import type { Sucursal, Turno } from "@/lib/consultorio/tipos";

/** A los diez minutos esperando, la fila deja de ser un detalle. */
const TARDE = 10 * 60 * 1000;

const reloj = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Al registrarse el teléfono se guarda sin espacios, y ocho dígitos seguidos
    no se leen de un vistazo cuando hay que marcarlos. */
const telefono = (t: string) => (/^\d{8}$/.test(t) ? `${t.slice(0, 4)} ${t.slice(4)}` : t);

/** Lo que lleva el cronómetro: lo acumulado más lo que corre ahora mismo. */
function corridos(t: Turno, ahora: number | null): number {
  if (!t.abierto || ahora === null) return t.segundos;
  return t.segundos + Math.max(0, Math.round((ahora - Date.parse(t.abierto)) / 1000));
}

export function Mostrador({
  sucursal,
  iniciales,
  escritorio,
}: {
  sucursal: Sucursal;
  iniciales: Turno[];
  /** El selector de con cuál sucursal se está mirando. Lo arma la página. */
  escritorio?: React.ReactNode;
}) {
  const [turnos, setTurnos] = useState<Turno[]>(iniciales);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  // Empieza en null y lo llena el navegador: si el servidor pintara una hora,
  // el primer render del cliente no cuadraría con la que llegó en el HTML.
  const [ahora, setAhora] = useState<number | null>(null);

  const traer = useCallback(async () => {
    try {
      const r = await fetch("/api/consultorio/turnos", { cache: "no-store" });
      const d = await r.json();
      if (d.ok) setTurnos(d.turnos);
    } catch {
      // La siguiente vuelta corrige. Un error en pantalla por un parpadeo de
      // red, en un mostrador con gente esperando, es peor que el parpadeo.
    }
  }, []);

  useEffect(() => {
    const id = setInterval(traer, 5000);
    return () => clearInterval(id);
  }, [traer]);

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const mandar = useCallback(
    async (id: string, cuerpo: Record<string, unknown>) => {
      setOcupado(true);
      setAviso(null);
      try {
        const r = await fetch(`/api/consultorio/turnos/${id}/estado`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo),
        });
        const d = await r.json();
        if (!d.ok) setAviso(d.error ?? "No se pudo mover la fila.");
        await traer();
      } catch {
        setAviso("No se pudo mover la fila: falló la conexión.");
      }
      setOcupado(false);
    },
    [traer],
  );

  const esperando = useMemo(() => turnos.filter((t) => t.estado === "esperando"), [turnos]);
  const pendientes = useMemo(() => turnos.filter((t) => t.estado === "pendiente"), [turnos]);
  const abierto = turnos.find((t) => t.estado === "atendiendo") ?? null;
  const atendidos = turnos.filter((t) => t.estado === "atendido").length;

  return (
    <div>
      <header className="no-imprimir bg-[var(--barra)] text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4">
          <span className="min-w-0">
            <span className="block font-serif text-[19px] leading-tight">{sucursal.nombre}</span>
            <span className="block text-[12.5px] text-white/60">
              {esperando.length} esperando · {atendidos} atendidos hoy
            </span>
          </span>
          <a
            href={`/api/consultorio/publico/qr/${sucursal.codigo}`}
            download={`qr-${sucursal.codigo}.png`}
            className="ml-auto text-[13.5px] text-white/70 underline underline-offset-4 transition hover:text-white"
          >
            Descargar el QR de la entrada
          </a>
          {escritorio}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6 pb-24">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            {abierto ? (
              <Record
                key={abierto.id}
                turno={abierto}
                segundos={corridos(abierto, ahora)}
                ocupado={ocupado}
                cerrar={(hechos, final) =>
                  mandar(abierto.id, { accion: final ? "finalizar" : "continuar", hechos })
                }
              />
            ) : (
              <section className="tarjeta px-6 py-6">
                <p className="font-serif text-[24px] text-[var(--texto)]">
                  {esperando.length === 0 ? "No hay nadie esperando" : "Nadie en el mostrador"}
                </p>
                <button
                  type="button"
                  disabled={ocupado || esperando.length === 0}
                  onClick={() => esperando[0] && mandar(esperando[0].id, { accion: "abrir" })}
                  className="boton mt-4"
                >
                  Atender al siguiente
                </button>
              </section>
            )}
            {aviso && <p className="mt-3 text-[13.5px] text-[var(--ambar)]">{aviso}</p>}

            <h2 className="mt-7 font-serif text-[19px] text-[var(--texto)]">
              Esperando{esperando.length > 0 ? ` (${esperando.length})` : ""}
            </h2>
            {esperando.length === 0 ? (
              <p className="tarjeta mt-3 px-6 py-8 text-center text-[14px] text-[var(--texto-2)]">
                Cuando alguien escanee el QR de la entrada va a aparecer acá.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {esperando.map((t) => {
                  // Rojo a los diez minutos de haberse registrado. No lleva
                  // rótulo: en una fila, rojo ya quiere decir una sola cosa.
                  const tarde = ahora !== null && ahora - Date.parse(t.creado) >= TARDE;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => mandar(t.id, { accion: "abrir" })}
                        className={`tarjeta fila-cola flex w-full items-center gap-4 px-4 py-3 text-left transition ${
                          tarde ? "tarde" : ""
                        }`}
                      >
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-serif text-[17px] ${
                            tarde
                              ? "bg-[var(--alerta)] text-white"
                              : "bg-[var(--panel-2)] text-[var(--texto)]"
                          }`}
                        >
                          {t.numero}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-serif text-[16px] text-[var(--texto)]">
                            {t.nombre}
                          </span>
                          <span
                            className={`block text-[13px] ${
                              tarde ? "text-[var(--alerta)]" : "text-[var(--texto-2)]"
                            }`}
                          >
                            {t.examenes.length} {t.examenes.length === 1 ? "examen" : "exámenes"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {pendientes.length > 0 && (
              <>
                <h2 className="mt-7 font-serif text-[19px] text-[var(--texto)]">
                  Con exámenes pendientes
                </h2>
                <ul className="mt-3 space-y-2">
                  {pendientes.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => mandar(t.id, { accion: "abrir" })}
                        className="tarjeta fila-cola flex w-full items-center gap-4 px-4 py-3 text-left transition"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--panel-2)] font-serif text-[17px] text-[var(--texto)]">
                          {t.numero}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-serif text-[16px] text-[var(--texto)]">
                            {t.nombre}
                          </span>
                          <span className="block text-[13px] text-[var(--texto-2)]">
                            {t.hechos.length} de {t.examenes.length} hechos · {reloj(t.segundos)} en
                            el mostrador
                          </span>
                        </span>
                        <span className="chip chip-ambar shrink-0">
                          faltan {t.examenes.length - t.hechos.length}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <aside className="documento self-start px-6 py-6 text-center">
            <p className="font-serif text-[14px] text-[var(--texto-2)]">{sucursal.nombre}</p>
            <h2 className="mt-2 font-serif text-[21px] leading-snug text-[var(--texto)]">
              Escaneá para tomar turno
            </h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/consultorio/publico/qr/${sucursal.codigo}`}
              alt={`Código QR de ${sucursal.nombre}`}
              width={240}
              height={240}
              className="mx-auto mt-3 w-full max-w-[240px]"
            />
            <p className="mt-2 font-mono text-[17px] font-semibold tracking-[0.3em] text-[var(--texto)]">
              {sucursal.codigo}
            </p>
            <button
              type="button"
              onClick={() => window.print()}
              className="boton-2 no-imprimir mt-4 w-full"
            >
              <Printer size={15} /> Imprimir para la entrada
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}

/**
 * El récord de quien está en el mostrador.
 *
 * Se monta cuando la recepción abre a alguien y se desmonta al cerrarlo, así
 * que lo marcado empieza limpio con cada persona (la clave del padre es el id).
 * Lo marcado vive acá y no en el servidor a propósito: mientras la
 * recepcionista tantea qué se va a hacer y qué no, eso no le importa a nadie
 * más. Lo que se guarda es la decisión, al darle continuar o finalizar.
 */
function Record({
  turno,
  segundos,
  ocupado,
  cerrar,
}: {
  turno: Turno;
  segundos: number;
  ocupado: boolean;
  cerrar: (hechos: string[], final: boolean) => void;
}) {
  // La primera vez llegan todos marcados, que es el caso normal: vino por diez
  // y se hace los diez. Si vuelve por lo que le faltó, se abre con lo que ya
  // tiene hecho y se le agrega lo de hoy.
  const [marcados, setMarcados] = useState<string[]>(turno.cerrado ? turno.hechos : turno.examenes);

  const grupos = useMemo(() => agrupar(turno.examenes), [turno.examenes]);

  function marcar(id: string) {
    setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  }

  return (
    <section className="tarjeta abierta">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3 border-b border-[var(--linea)] px-6 py-5">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-3">
            <span className="font-serif text-[40px] leading-none text-[var(--texto)]">
              {turno.numero}
            </span>
            <span className="font-serif text-[22px] leading-tight text-[var(--texto)]">
              {turno.nombre}
            </span>
          </p>
          <p className="mt-1.5 text-[13.5px] text-[var(--texto-2)]">
            {telefono(turno.telefono)}
            {turno.correo && ` · ${turno.correo}`}
          </p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1.5 font-mono text-[26px] leading-none text-[var(--texto)]">
            <Timer size={17} className="text-[var(--texto-3)]" />
            {reloj(segundos)}
          </p>
          <p className="mt-1.5 font-mono text-[14px] tracking-[0.12em] text-[var(--texto-2)]">
            {turno.codigo}
          </p>
        </div>
      </div>

      <div className="px-6 py-5">
        <p className="text-[13.5px] text-[var(--texto-2)]">Desmarcá lo que no se va a hacer hoy.</p>
        <div className="mt-3 sm:columns-2">
          {grupos.map((g) => (
            <div key={g.area} className="mb-4 break-inside-avoid">
              <p className="px-2 text-[12.5px] font-semibold text-[var(--texto-3)]">{g.area}</p>
              {g.examenes.map((e) => (
                <label key={e.id} className="casilla">
                  <input
                    type="checkbox"
                    checked={marcados.includes(e.id)}
                    onChange={() => marcar(e.id)}
                  />
                  <span className="text-[14.5px] leading-snug text-[var(--texto)]">{e.nombre}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--linea)] px-6 py-4">
        <span className="text-[13.5px] text-[var(--texto-2)]">
          {marcados.length} de {turno.examenes.length}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            disabled={ocupado}
            onClick={() => cerrar(marcados, false)}
            className="boton-2"
          >
            Continuar
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => cerrar(marcados, true)}
            className="boton"
          >
            Finalizar
          </button>
        </div>
      </div>
    </section>
  );
}
