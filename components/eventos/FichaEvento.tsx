"use client";

// La ficha de una propuesta: todo lo que dejó la llamada (o el chat), lo que
// falta, por qué tiene esa prioridad, y lo que el equipo va haciendo encima.

import { useEffect, useState } from "react";
import {
  CircleCheck,
  Clock3,
  Mail,
  MessageCircle,
  Phone,
  PhoneCall,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Etapa, LlamadaEvento, Movimiento } from "@/lib/eventos/tipos";
import {
  ASESORES,
  ETAPAS,
  MOTIVOS_DESCARTE,
  NOMBRE_CANAL,
  NOMBRE_CONDICION,
  NOMBRE_ENTRADA,
  NOMBRE_ESPACIO,
  NOMBRE_MODALIDAD,
  NOMBRE_PERMISOS,
  NOMBRE_SERVICIO,
  NOMBRE_SINO,
  NOMBRE_TOLDO,
  asesorDe,
  nombreTipo,
} from "@/lib/eventos/catalogo";
import { diaHora, duracion, fechaLarga, haceCuanto } from "@/lib/eventos/fechas";
import { transcripcionDeMuestra } from "@/lib/eventos/semilla";
import type { Fila } from "./fila";
import { AsesorAvatar, CanalChip, Dato, EtapaChip, PrioridadChip, RealBadge, Seccion, miles, usd } from "./ui";
import { Transcripcion } from "./Transcripcion";
import { CompletarFaltante } from "./CompletarFaltante";

export function FichaEvento({
  fila,
  llamada,
  ahora,
  onCerrar,
  mover,
  onSimulada,
}: {
  fila: Fila;
  llamada?: LlamadaEvento;
  ahora: number;
  onCerrar: () => void;
  mover: (id: string, tipo: Movimiento["tipo"], valor?: Record<string, unknown>) => void;
  onSimulada: (texto: string) => void;
}) {
  const { p, prioridad, faltantes, plazo } = fila;
  const d = p.datos;
  const [nota, setNota] = useState("");
  const [descartando, setDescartando] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVOS_DESCARTE[0]);
  const [otroMotivo, setOtroMotivo] = useState("");
  const esMuestra = p.origen === "semilla";

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onCerrar]);

  function cambiarEtapa(a: Etapa) {
    if (a === p.etapa) return;
    if (a === "descartada") {
      setDescartando(true);
      return;
    }
    mover(p.id, "etapa", { a });
  }

  function confirmarDescarte() {
    const m = motivo === "Otro" ? otroMotivo.trim() : motivo;
    if (!m) return;
    mover(p.id, "etapa", { a: "descartada", motivo: m });
    setDescartando(false);
  }

  const tel = d.contacto_telefono;
  const telBonito = tel.length === 8 ? `${tel.slice(0, 4)} ${tel.slice(4)}` : tel;

  function accion(tipo: "llamar" | "whatsapp" | "correo") {
    if (esMuestra) {
      onSimulada(
        tipo === "llamar"
          ? `Llamada simulada a ${d.contacto_nombre || "el organizador"}: en la muestra no se marca a nadie.`
          : tipo === "whatsapp"
            ? `WhatsApp simulado a ${d.contacto_nombre || "el organizador"}: en la muestra no sale ningún mensaje.`
            : `Correo simulado a ${d.contacto_correo}: en la muestra no sale ningún correo.`,
      );
      if (!p.primerContacto && tipo !== "correo") mover(p.id, "contactado");
      return;
    }
    if (tipo === "llamar" && tel) window.open(`tel:+503${tel}`);
    if (tipo === "whatsapp" && tel) window.open(`https://wa.me/503${tel}`, "_blank", "noopener");
    if (tipo === "correo" && d.contacto_correo) window.open(`mailto:${d.contacto_correo}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onCerrar}>
      <aside
        className="flex h-full w-full max-w-[760px] flex-col bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={d.nombre_evento || "Propuesta"}
      >
        {/* Cabecera */}
        <header className="border-b border-line bg-card px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-[11.5px] font-semibold uppercase tracking-wide text-brand">{nombreTipo(d.tipo_evento)}</span>
                {p.origen === "real" && <RealBadge />}
                <CanalChip canal={p.canal} />
                <span className="text-[11.5px] text-[var(--text-3)]">· entró {haceCuanto(p.creada, ahora)}</span>
              </div>
              <h2 className="text-[19px] font-extrabold leading-tight tracking-tight text-[var(--text)]">
                {d.nombre_evento || "Evento sin nombre"}
              </h2>
              <p className="mt-0.5 text-[12.5px] text-[var(--text-2)]">
                {[d.fecha_inicio ? fechaLarga(d.fecha_inicio) : "Sin fecha", d.recinto, d.municipio].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-surface"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-2)]">
              Etapa
              <select
                value={p.etapa}
                onChange={(e) => cambiarEtapa(e.target.value as Etapa)}
                className="rounded-lg border border-line bg-card px-2 py-1.5 text-[12.5px] font-semibold text-[var(--text)]"
              >
                {ETAPAS.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-2)]">
              Asesor
              <select
                value={p.asesorId}
                onChange={(e) => mover(p.id, "asesor", { asesorId: e.target.value })}
                className="rounded-lg border border-line bg-card px-2 py-1.5 text-[12.5px] font-semibold text-[var(--text)]"
              >
                {ASESORES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </label>
            <PrioridadChip nivel={prioridad.nivel} className="ml-auto" />
          </div>

          {descartando && (
            <div className="mt-3 rounded-xl border border-line bg-surface p-3">
              <p className="mb-2 text-[12.5px] font-semibold text-[var(--text)]">¿Por qué se descarta?</p>
              <div className="flex flex-wrap gap-2">
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-card px-2 py-1.5 text-[12.5px]"
                >
                  {[...MOTIVOS_DESCARTE, "Otro"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                {motivo === "Otro" && (
                  <input
                    value={otroMotivo}
                    onChange={(e) => setOtroMotivo(e.target.value)}
                    placeholder="Escriba el motivo"
                    className="min-w-0 flex-1 rounded-lg border border-line bg-card px-2 py-1.5 text-[12.5px]"
                  />
                )}
                <button
                  type="button"
                  onClick={confirmarDescarte}
                  className="rounded-lg bg-[var(--brand-accent)] px-3 py-1.5 text-[12.5px] font-bold text-white"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={() => setDescartando(false)}
                  className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text-2)]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {/* Plazo del primer contacto */}
          {plazo.pendiente ? (
            <div
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] font-semibold",
                plazo.vencido ? "bg-[var(--ph-alarma-fondo)] text-[var(--brand-red)]" : "bg-card text-[var(--text-2)] border border-line",
              )}
            >
              {plazo.vencido ? <TriangleAlert size={15} /> : <Clock3 size={15} />}
              <span className="flex-1">
                {plazo.vencido
                  ? `Primer contacto vencido hace ${Math.abs(Math.round(plazo.horas))} h (plazo de 24 h)`
                  : `Primer contacto: quedan ${Math.max(0, Math.round(plazo.horas))} h del plazo de 24 h`}
              </span>
              <button
                type="button"
                onClick={() => mover(p.id, "contactado")}
                className="rounded-lg bg-[var(--brand-accent)] px-2.5 py-1 text-[12px] font-bold text-white"
              >
                Marcar contactado
              </button>
            </div>
          ) : p.primerContacto ? (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3.5 py-2.5 text-[12.5px] text-[var(--text-2)]">
              <CircleCheck size={15} className="text-[var(--brand-green)]" />
              Primer contacto {diaHora(p.primerContacto)}
              {" · "}
              {Math.max(0, Math.round((Date.parse(p.primerContacto) - Date.parse(p.creada)) / 3_600_000))} h después de entrar
            </div>
          ) : null}

          {p.etapa === "descartada" && p.motivoDescarte && (
            <div className="rounded-xl border border-line bg-card px-3.5 py-2.5 text-[12.5px] text-[var(--text-2)]">
              <span className="font-semibold text-[var(--text)]">Descartada:</span> {p.motivoDescarte}
            </div>
          )}

          {p.resumen && (
            <p className="rounded-xl border border-line bg-card px-3.5 py-3 text-[13px] leading-relaxed text-[var(--text)]">{p.resumen}</p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <Seccion titulo={`Prioridad ${prioridad.nivel === "alta" ? "alta" : prioridad.nivel === "media" ? "media" : "baja"} · ${prioridad.puntos} pts`}>
              <ul className="space-y-1">
                {prioridad.razones.map((r) => (
                  <li key={r.texto} className="flex items-start gap-2 text-[12.5px] text-[var(--text)]">
                    <span
                      className={cn(
                        "mt-px w-7 shrink-0 text-right font-mono text-[11.5px] font-bold",
                        r.puntos > 0 ? "text-[var(--brand-green)]" : r.puntos < 0 ? "text-[var(--brand-red)]" : "text-[var(--text-3)]",
                      )}
                    >
                      {r.puntos > 0 ? `+${r.puntos}` : r.puntos}
                    </span>
                    {r.texto}
                  </li>
                ))}
                {prioridad.razones.length === 0 && <li className="text-[12.5px] text-[var(--text-3)]">Sin datos para calcularla.</li>}
              </ul>
            </Seccion>

            <Seccion titulo={`Datos faltantes · ${faltantes.length}`}>
              {faltantes.length === 0 ? (
                <p className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--brand-green)]">
                  <CircleCheck size={15} /> Propuesta completa
                </p>
              ) : (
                <>
                  <p className="mb-2 text-[12px] text-[var(--text-3)]">Para completar al hablar con el organizador:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {faltantes.map((f) => (
                      <CompletarFaltante
                        key={f.campo}
                        faltante={f}
                        onGuardar={(campo, valor) => mover(p.id, "dato", { campo, valor })}
                      />
                    ))}
                  </div>
                </>
              )}
            </Seccion>
          </div>

          <Seccion titulo="Evento">
            <dl className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
              <Dato label="Tipo" valor={nombreTipo(d.tipo_evento)} />
              <Dato label="Nombre" valor={d.nombre_evento} />
              <Dato label="De qué se trata" valor={d.descripcion_evento} ancho />
              <Dato label="Fecha" valor={d.fecha_inicio ? fechaLarga(d.fecha_inicio) : ""} />
              <Dato label="Termina" valor={d.fecha_fin ? fechaLarga(d.fecha_fin) : d.fecha_inicio ? "El mismo día" : ""} />
              <Dato label="Horario" valor={d.horario} />
              <Dato
                label="Se repite"
                valor={d.evento_recurrente ? (d.asistencia_anterior ? `Sí: ${miles(d.asistencia_anterior)} asistentes la edición pasada` : "Sí") : "No"}
              />
            </dl>
          </Seccion>

          <Seccion titulo="Público">
            <dl className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
              <Dato label="Aforo esperado" valor={d.aforo_esperado ? `${miles(d.aforo_esperado)} personas` : ""} />
              <Dato label="Perfil" valor={d.perfil_publico} />
              <Dato label="Entrada" valor={NOMBRE_ENTRADA[d.tipo_entrada]} />
              <Dato label="Precio del boleto" valor={d.tipo_entrada === "con_boleto" && d.precio_boleto ? usd(d.precio_boleto) : d.tipo_entrada === "gratuita" ? "No aplica" : ""} />
            </dl>
          </Seccion>

          <Seccion titulo="Qué propone">
            <dl className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
              <Dato label="Modalidad" valor={NOMBRE_MODALIDAD[d.modalidad]} />
              <Dato label="Condición comercial" valor={NOMBRE_CONDICION[d.condicion_comercial]} />
              {(d.condicion_comercial === "cuota_fija" || d.condicion_comercial === "cuota_mas_comision") && (
                <Dato label="Cuota" valor={d.monto_cuota ? usd(d.monto_cuota) : ""} />
              )}
              {(d.condicion_comercial === "comision" || d.condicion_comercial === "cuota_mas_comision") && (
                <Dato label="Comisión" valor={d.porcentaje_comision ? `${d.porcentaje_comision}% de las ventas` : ""} />
              )}
              <Dato label="Exclusividad de pizza" valor={NOMBRE_SINO[d.exclusividad_pizza]} />
              <Dato label="Otros vendedores de comida" valor={d.otros_vendedores_comida ? miles(d.otros_vendedores_comida) : ""} />
              <Dato label="Promoción de marca" valor={d.promocion_de_marca} />
              <Dato label="Medios de pago" valor={d.medios_de_pago} />
              <Dato label="Piden respuesta antes del" valor={d.fecha_limite_respuesta ? fechaLarga(d.fecha_limite_respuesta) : "Sin fecha límite"} />
            </dl>
          </Seccion>

          <Seccion titulo="Logística">
            <dl className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
              <Dato label="Lugar" valor={d.recinto} />
              <Dato label="Municipio y departamento" valor={[d.municipio, d.departamento].filter(Boolean).join(", ")} />
              <Dato label="Espacio" valor={NOMBRE_ESPACIO[d.espacio]} />
              <Dato label="Tamaño del espacio" valor={d.tamano_espacio} />
              <Dato label="Energía eléctrica" valor={NOMBRE_SERVICIO[d.energia_electrica]} />
              <Dato label="Agua" valor={NOMBRE_SERVICIO[d.agua]} />
              <Dato label="Toldo y mobiliario" valor={NOMBRE_TOLDO[d.toldo_mobiliario]} />
              <Dato label="Montaje" valor={d.montaje} />
              <Dato label="Permisos a cargo de" valor={NOMBRE_PERMISOS[d.permisos_a_cargo_de]} />
            </dl>
          </Seccion>

          <Seccion titulo="Contacto">
            <dl className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
              <Dato label="Nombre" valor={d.contacto_nombre} />
              <Dato label="Cargo" valor={d.contacto_cargo} />
              <Dato label="Empresa u organización" valor={d.contacto_empresa} />
              <Dato label="Teléfono" valor={telBonito} />
              <Dato label="Correo" valor={d.contacto_correo} />
              <Dato label="Mejor horario" valor={d.contacto_horario} />
              <Dato label="Prefiere" valor={d.contacto_canal ? NOMBRE_CANAL[d.contacto_canal] : ""} />
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <BotonContacto Icono={Phone} texto="Llamar" onClick={() => accion("llamar")} deshabilitado={!tel} />
              <BotonContacto Icono={MessageCircle} texto="WhatsApp" onClick={() => accion("whatsapp")} deshabilitado={!tel} />
              <BotonContacto Icono={Mail} texto="Correo" onClick={() => accion("correo")} deshabilitado={!d.contacto_correo} />
            </div>
            {d.notas && <p className="mt-3 text-[12.5px] text-[var(--text-2)]">Notas de la llamada: {d.notas}</p>}
          </Seccion>

          {llamada ? (
            <LlamadaOrigen llamada={llamada} p={fila.p} />
          ) : (
            <Seccion titulo="Cómo entró">
              <p className="text-[12.5px] text-[var(--text-2)]">
                Por {NOMBRE_CANAL[p.canal]} el {diaHora(p.creada)}.{" "}
                {p.canal !== "llamada" && p.canal !== "correo" ? "Daniela tomó los datos en el chat; la conversación está en la Bandeja." : ""}
              </p>
            </Seccion>
          )}

          <Seccion titulo="Notas del equipo">
            <ul className="space-y-2.5">
              {p.notasInternas.map((n) => (
                <li key={n.id} className="flex gap-2.5">
                  <AsesorAvatar id={n.autor} size={24} />
                  <div className="min-w-0">
                    <p className="text-[11.5px] text-[var(--text-3)]">
                      <span className="font-semibold text-[var(--text-2)]">{asesorDe(n.autor)?.nombre ?? (n.autor === "me" ? "Gerencia" : n.autor)}</span>
                      {" · "}
                      {diaHora(n.ts)}
                    </p>
                    <p className="text-[13px] text-[var(--text)]">{n.texto}</p>
                  </div>
                </li>
              ))}
              {p.notasInternas.length === 0 && <li className="text-[12.5px] text-[var(--text-3)]">Sin notas todavía.</li>}
            </ul>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!nota.trim()) return;
                mover(p.id, "nota", { texto: nota.trim() });
                setNota("");
              }}
            >
              <input
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Agregar una nota para el equipo"
                className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-[13px]"
              />
              <button type="submit" disabled={!nota.trim()} className="rounded-lg bg-[var(--brand-accent)] px-3 py-2 text-[12.5px] font-bold text-white disabled:opacity-40">
                Anotar
              </button>
            </form>
          </Seccion>

          <Seccion titulo="Historial de etapas">
            <ol className="relative space-y-3 border-l border-line pl-4">
              {[...p.historial].reverse().map((h, i) => (
                <li key={`${h.ts}-${i}`} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-card" style={{ backgroundColor: ETAPAS.find((e) => e.id === h.a)?.color }} />
                  <p className="text-[12.5px] font-semibold text-[var(--text)]">
                    {h.de ? "Pasó a " : "Entró como "}
                    <EtapaChip etapa={h.a} className="ml-0.5" />
                  </p>
                  <p className="text-[11.5px] text-[var(--text-3)]">
                    {diaHora(h.ts)} · {h.actor === "ia" ? "Daniela (IA)" : (asesorDe(h.actor)?.nombre ?? "Gerencia")}
                    {h.motivo ? ` · ${h.motivo}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </Seccion>
        </div>
      </aside>
    </div>
  );
}

function BotonContacto({
  Icono,
  texto,
  onClick,
  deshabilitado,
}: {
  Icono: typeof Phone;
  texto: string;
  onClick: () => void;
  deshabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      className="flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text)] transition hover:border-[var(--text)] disabled:opacity-40"
    >
      <Icono size={14} />
      {texto}
    </button>
  );
}

/** La llamada que originó la propuesta: resumen, audio y transcripción. */
function LlamadaOrigen({ llamada, p }: { llamada: LlamadaEvento; p: Fila["p"] }) {
  const [texto, setTexto] = useState<string | null>(null);
  const real = llamada.origen === "real";

  useEffect(() => {
    if (!real) {
      setTexto(transcripcionDeMuestra(llamada, p));
      return;
    }
    let vivo = true;
    fetch(`/api/eventos/llamadas/${encodeURIComponent(llamada.id)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => vivo && setTexto(d.ok ? d.transcripcion || "" : ""))
      .catch(() => vivo && setTexto(""));
    return () => {
      vivo = false;
    };
  }, [llamada, p, real]);

  return (
    <Seccion titulo="La llamada">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[var(--text-2)]">
        <span className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
          <PhoneCall size={14} /> Atendió Daniela (IA)
        </span>
        <span>{diaHora(llamada.inicio)}</span>
        <span>Duración {duracion(llamada.duracionSeg)}</span>
        {llamada.numero && <span>Desde {llamada.numero}</span>}
        {real && <RealBadge />}
      </div>
      {real && llamada.grabacion ? (
        <audio controls preload="none" className="mb-3 h-9 w-full" src={`/api/eventos/llamadas/${encodeURIComponent(llamada.id)}/grabacion`} />
      ) : !real ? (
        <p className="mb-3 rounded-lg bg-surface px-3 py-2 text-[12px] text-[var(--text-3)]">Llamada de muestra: la transcripción está armada con los datos de la propuesta y no tiene audio.</p>
      ) : null}
      {texto === null ? (
        <p className="text-[12.5px] text-[var(--text-3)]">Cargando la transcripción...</p>
      ) : texto ? (
        <Transcripcion texto={texto} />
      ) : (
        <p className="text-[12.5px] text-[var(--text-3)]">Esta llamada no dejó transcripción.</p>
      )}
    </Seccion>
  );
}
