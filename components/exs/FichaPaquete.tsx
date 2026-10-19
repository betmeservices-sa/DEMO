"use client";

// La ficha de un paquete: su línea de Miami a la entrega, lo que paga y por
// qué, la prealerta (con la captura que leyó la IA), y cada aviso de WhatsApp
// que recibió el cliente. Desde aquí se mueve, se retiene, se libera y se
// cobra; cada acción deja su aviso al cliente.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, MessageCircle, Plane, Undo2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Etapa, Paquete } from "@/lib/exs/tipos";
import { ETAPAS, MOTIVOS_RETENCION, etapaDef, siguienteEtapa, sucursalDef } from "@/lib/exs/catalogo";
import { cobroDe, dinero, libras, pesoVolumetrico } from "@/lib/exs/cobro";
import { totalDelVuelo } from "@/lib/exs/estado";
import { alertasDelPaquete, siguienteVuelo } from "@/lib/exs/alertas";
import { salidaDe } from "@/lib/exs/avisos";
import { clienteDe, type VistaExs } from "@/lib/exs/vista";
import { registrar } from "@/lib/exs/store";
import { diaHora, diaSV, fechaCorta, horaCorta } from "@/lib/eventos/fechas";
import { AlertaChip, Dato, EtapaChip, IaChip, Seccion, abrirEnBandeja, categoriaCorta, trackingLegible, useCerrarConEscape } from "./ui";

const BOTON = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-bold transition disabled:opacity-50";
const PRIMARIO = `${BOTON} bg-brand text-white hover:bg-brand-dark`;
const SECUNDARIO = `${BOTON} border border-line bg-card text-[var(--text)] hover:bg-surface`;

/** Cuándo llegó a cada etapa (la última vez). */
function cuandoLlego(p: Paquete, e: Etapa): string | undefined {
  return [...p.historial].reverse().find((x) => x.tipo === e)?.ts;
}

export function FichaPaquete({
  vista,
  paquete: p,
  yo,
  onClose,
  onAviso,
}: {
  vista: VistaExs;
  paquete: Paquete;
  yo: string;
  onClose: () => void;
  /** Para el aviso de la pantalla ("Se le avisó por WhatsApp a ..."). */
  onAviso?: (texto: string) => void;
}) {
  const router = useRouter();
  useCerrarConEscape(onClose);
  const [motivo, setMotivo] = useState(MOTIVOS_RETENCION[0]);
  const [reteniendo, setReteniendo] = useState(false);
  const cliente = clienteDe(vista, p.clienteId);
  const vuelo = vista.vuelos.find((v) => v.id === p.vueloId);
  const total = totalDelVuelo(vista.paquetes, p.clienteId, p.vueloId);
  const cobro = cobroDe(p, total);
  const alertas = alertasDelPaquete(p, vista.alertas);
  const avisos = vista.avisos.get(p.id) ?? [];
  const sigue = siguienteEtapa(p.etapa);
  const idx = ETAPAS.findIndex((e) => e.id === p.etapa);
  const sobre = vista.alertas.sobreLimite.find((s) => s.paquetes.some((x) => x.id === p.id));
  const otroVuelo = p.vueloId ? siguienteVuelo(vista.vuelos, p.vueloId) : undefined;
  const nombre = cliente?.nombre.split(" ")[0] ?? "el cliente";

  function hacer(tipo: Parameters<typeof registrar>[0], valor: Record<string, unknown>, aviso: string) {
    if (registrar(tipo, p.id, valor, yo)) onAviso?.(aviso);
  }

  const conversacion = cliente?.conversationId ?? (avisos.some((a) => a.movId) ? `exs-${p.clienteId}` : undefined);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[520px] flex-col bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Paquete ${p.id}`}
      >
        <header className="border-b border-line bg-card px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-semibold text-[var(--text-3)]">
                {p.id} · {p.tienda} · {p.transportista}
              </p>
              <h2 className="mt-0.5 text-[17px] font-extrabold leading-snug text-[var(--text)]">{p.contenido}</h2>
              <p className="mt-0.5 font-mono text-[12px] text-[var(--text-2)]">{trackingLegible(p.tracking)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <EtapaChip etapa={p.etapa} />
                {p.prealerta?.origen === "captura" && <IaChip />}
                {alertas.map((a) => (
                  <AlertaChip key={a.tipo} tipo={a.tipo}>
                    {a.texto}
                  </AlertaChip>
                ))}
                {p.pagado && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--exs-verde-suave)] px-1.5 py-0.5 text-[10.5px] font-bold text-[var(--brand-green)]">
                    <Check size={11} strokeWidth={3} /> Pagado
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-surface"
            >
              <X size={18} />
            </button>
          </div>

          {/* La línea del paquete */}
          <ol className="mt-4 grid grid-cols-6 gap-1">
            {ETAPAS.map((e, i) => {
              const hecho = i <= idx;
              const ts = hecho ? cuandoLlego(p, e.id) : undefined;
              return (
                <li key={e.id} className="min-w-0">
                  <div className={cn("h-1.5 rounded-full", hecho ? "" : "bg-[var(--surface-2)]")} style={hecho ? { backgroundColor: e.color } : undefined} />
                  <p className={cn("mt-1 truncate text-[10.5px] font-semibold", hecho ? "text-[var(--text)]" : "text-[var(--text-3)]")} title={e.nombre}>
                    {e.corto}
                  </p>
                  {ts && (
                    <p className="text-[10px] leading-tight text-[var(--text-3)]">
                      {fechaCorta(diaSV(ts)).replace(/^\S+\s/, "")}
                      <br />
                      {horaCorta(ts)}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {/* Lo que pide atención, con su acción a la mano */}
          {p.etapa === "aduana" && p.retenido && (
            <div className="rounded-xl border border-[var(--brand-red)]/25 bg-[var(--exs-rojo-fondo)] p-3.5">
              <p className="text-[13px] font-bold text-[var(--brand-red)]">{p.retenido.motivo}</p>
              <p className="mt-0.5 text-[12px] text-[var(--text-2)]">Retenido desde el {diaHora(p.retenido.desde)}. El aviso con el pedido de la factura ya le llegó a {nombre}.</p>
              <button type="button" className={`${PRIMARIO} mt-2.5`} onClick={() => hacer("liberar", {}, `Aduana liberó el paquete. Se le avisó a ${nombre} por WhatsApp con su total.`)}>
                <Check size={15} /> Aduana lo liberó
              </button>
            </div>
          )}
          {sobre && otroVuelo && (
            <div className="rounded-xl border border-[var(--exs-ambar)]/25 bg-[var(--exs-ambar-fondo)] p-3.5">
              <p className="text-[13px] font-bold text-[var(--exs-ambar)]">
                {nombre} trae {dinero(sobre.total)} en el {sobre.vuelo.id}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--text-2)]">
                Desde $300 por vuelo aduana cobra IVA más DAI. Con este paquete en el {otroVuelo.id} ({salidaDe(otroVuelo)}), los dos vuelos pagan solo IVA.
              </p>
              <button
                type="button"
                className={`${PRIMARIO} mt-2.5`}
                onClick={() => hacer("vuelo", { vueloId: otroVuelo.id }, `Pasó al ${otroVuelo.id}. Se le avisó a ${nombre} por WhatsApp.`)}
              >
                <Plane size={15} /> Pasar al {otroVuelo.id}
              </button>
            </div>
          )}

          <Seccion
            titulo="Cliente"
            accion={
              conversacion ? (
                <button
                  type="button"
                  onClick={() => abrirEnBandeja(conversacion, (href) => router.push(href))}
                  className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--brand-accent)] hover:underline"
                >
                  <MessageCircle size={13} /> Abrir chat
                </button>
              ) : undefined
            }
          >
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <Dato label="Nombre" valor={cliente?.nombre} />
              <Dato label="Casillero" valor={cliente?.casillero} />
              <Dato
                label="Entrega"
                valor={p.entrega.tipo === "sucursal" ? sucursalDef(p.entrega.sucursal).nombre : `A domicilio, ${p.entrega.zona}`}
                ancho={p.entrega.tipo === "domicilio"}
              />
              {p.entrega.tipo === "domicilio" && <Dato label="Dirección" valor={p.entrega.direccion} ancho />}
            </dl>
          </Seccion>

          <Seccion titulo="Cobro">
            {!cobro.pesado ? (
              <p className="text-[12.5px] text-[var(--text-2)]">
                Se calcula al pesarlo en Miami. Valor declarado: <b className="text-[var(--text)]">{dinero(p.valor)}</b>.
              </p>
            ) : (
              <div className="space-y-1.5 text-[12.5px]">
                <Fila
                  izq={`Envío: ${cobro.libras} lb x ${dinero(cobro.precioLibra)}${cobro.porVolumen ? " (por volumen)" : ""}`}
                  der={dinero(cobro.envio)}
                />
                <Fila izq={`IVA 13% sobre ${dinero(cobro.impuesto.cif)} de valor en aduana`} der={dinero(cobro.impuesto.iva)} />
                {cobro.conDai && <Fila izq="DAI" der="Según liquidación de aduana" />}
                <div className="flex items-center justify-between border-t border-line pt-2 text-[14px] font-extrabold text-[var(--text)]">
                  <span>{cobro.conDai ? "Envío + IVA" : "Total"}</span>
                  <span>{dinero(cobro.total)}</span>
                </div>
                <p className="text-[11px] text-[var(--text-3)]">
                  Valor declarado {dinero(p.valor)} + 10% de flete + 1.5% de seguro = {dinero(cobro.impuesto.cif)}. Así calcula aduana el CIF; no se cobran aparte.
                </p>
              </div>
            )}
          </Seccion>

          <Seccion titulo="Paquete">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <Dato label="Tienda" valor={p.tienda} />
              <Dato label="Categoría en aduana" valor={categoriaCorta(p.categoria)} />
              <Dato label="Valor declarado" valor={p.valor ? dinero(p.valor) : "Por confirmar"} />
              <Dato label="Peso real" valor={p.pesoLb !== undefined ? libras(p.pesoLb) : ""} />
              {p.medidas && (
                <>
                  <Dato label="Medidas" valor={`${p.medidas.largo} x ${p.medidas.ancho} x ${p.medidas.alto} pulg.`} />
                  <Dato label="Peso volumétrico" valor={libras(pesoVolumetrico(p.medidas))} />
                </>
              )}
              <Dato label="Vuelo" valor={vuelo ? `${vuelo.id} · ${salidaDe(vuelo)}` : "Se asigna al llegar a Miami"} ancho />
            </dl>
          </Seccion>

          <Seccion titulo="Prealerta">
            {!p.prealerta ? (
              <p className="text-[12.5px] text-[var(--text-2)]">Llegó a Miami sin prealerta: el aviso automático ya le pidió a {nombre} la captura del pedido o la factura.</p>
            ) : (
              <div className="flex gap-3">
                {p.prealerta.capturaUrl && (
                  <a href={p.prealerta.capturaUrl} target="_blank" rel="noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.prealerta.capturaUrl} alt="Captura del pedido" className="h-28 w-auto rounded-lg border border-line" />
                  </a>
                )}
                <div className="min-w-0 text-[12.5px] text-[var(--text-2)]">
                  <p className="font-semibold text-[var(--text)]">
                    {p.prealerta.origen === "captura" ? "La IA la leyó de la captura del chat" : "La registró el equipo a mano"}
                  </p>
                  <p className="mt-0.5">{diaHora(p.prealerta.ts)}</p>
                  {p.prealerta.lectura && (
                    <p className="mt-1">
                      Lectura: {p.prealerta.lectura.tienda}, {p.prealerta.lectura.contenido}, {dinero(p.prealerta.lectura.valor)}. Confianza{" "}
                      {Math.round(p.prealerta.lectura.confianza * 100)}%.
                    </p>
                  )}
                </div>
              </div>
            )}
          </Seccion>

          <Seccion titulo={`Avisos por WhatsApp (${avisos.length})`}>
            {avisos.length === 0 ? (
              <p className="text-[12.5px] text-[var(--text-3)]">Todavía no se le ha avisado nada.</p>
            ) : (
              <ol className="space-y-2.5">
                {avisos.map((a) => (
                  <li key={a.id} className="rounded-lg bg-surface px-3 py-2">
                    <p className="text-[12.5px] leading-relaxed text-[var(--text)]">{a.texto}</p>
                    <p className="mt-1 text-[10.5px] text-[var(--text-3)]">{diaHora(a.ts)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Seccion>
        </div>

        {/* Acciones */}
        <footer className="flex flex-wrap items-center gap-2 border-t border-line bg-card px-4 py-3">
          {sigue && !(p.etapa === "aduana" && p.retenido) && (
            <button
              type="button"
              className={PRIMARIO}
              onClick={() => hacer("etapa", { a: sigue }, `${etapaDef(sigue).nombre}. Se le avisó a ${nombre} por WhatsApp.`)}
            >
              {etapaDef(sigue).nombre} <ArrowRight size={15} />
            </button>
          )}
          {p.etapa === "aduana" && !p.retenido && !reteniendo && (
            <button type="button" className={SECUNDARIO} onClick={() => setReteniendo(true)}>
              Retener en aduana
            </button>
          )}
          {reteniendo && (
            <div className="flex w-full flex-wrap items-center gap-2">
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-line bg-card px-2 py-2 text-[12.5px]">
                {MOTIVOS_RETENCION.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <button
                type="button"
                className={PRIMARIO}
                onClick={() => {
                  setReteniendo(false);
                  hacer("retener", { motivo }, `Quedó retenido. Se le pidió la factura a ${nombre} por WhatsApp.`);
                }}
              >
                Retener
              </button>
              <button type="button" className={SECUNDARIO} onClick={() => setReteniendo(false)}>
                <Undo2 size={14} />
              </button>
            </div>
          )}
          {(p.etapa === "listo" || p.etapa === "entregado") && !p.pagado && (
            <button
              type="button"
              className={SECUNDARIO}
              onClick={() => hacer("pagado", {}, `Pago registrado. ${nombre} recibió la confirmación por WhatsApp.`)}
            >
              <Check size={15} /> Marcar pagado
            </button>
          )}
          {p.etapa === "listo" && (
            <button
              type="button"
              className={SECUNDARIO}
              onClick={() => hacer("recordatorio", {}, `Se le recordó a ${nombre} por WhatsApp que lo retire.`)}
            >
              Recordar retiro
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}

function Fila({ izq, der }: { izq: string; der: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[var(--text-2)]">
      <span>{izq}</span>
      <span className="shrink-0 font-semibold text-[var(--text)]">{der}</span>
    </div>
  );
}
