"use client";

// La ficha de un paquete: su línea de Miami a la entrega, lo que paga y por
// qué (con su envío consolidado si viaja con otros del mismo cliente), la
// prealerta (con la captura que leyó la IA), y cada aviso de WhatsApp que
// recibió el cliente. Desde aquí se mueve, se marca el selectivo rojo, se
// libera, se cambia de sucursal y se cobra; cada acción deja su aviso.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, MessageCircle, Truck, Undo2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Etapa, Paquete, SucursalId } from "@/lib/shopusa/tipos";
import { CARGO_DOMICILIO, ETAPAS, MOTIVOS_SELECTIVO, SUCURSALES, etapaDef, motivoSelectivo, siguienteEtapa, sucursalDef } from "@/lib/shopusa/catalogo";
import { cobroDe, dinero, libras, pesoVolumetrico, sinPrealertaATiempo } from "@/lib/shopusa/cobro";
import { alertasDelPaquete, etiquetasDelPaquete } from "@/lib/shopusa/alertas";
import { salidaDe } from "@/lib/shopusa/avisos";
import { prealertoATiempo } from "@/lib/shopusa/estado";
import { clienteDe, type VistaShopusa } from "@/lib/shopusa/vista";
import { registrar } from "@/lib/shopusa/store";
import { listaDeCosas, nombreCarga } from "@/lib/shopusa/formato";
import { diaHora, diaSV, fechaCorta, horaCorta } from "@/lib/eventos/fechas";
import { AlertaChip, Dato, EtapaChip, EtiquetaChip, IaChip, Seccion, abrirEnBandeja, trackingLegible, useCerrarConEscape } from "./ui";

const BOTON = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-bold transition disabled:opacity-50";
const PRIMARIO = `${BOTON} bg-brand text-white hover:bg-brand-dark`;
const SECUNDARIO = `${BOTON} border border-line bg-card text-[var(--text)] hover:bg-surface`;

/** Cuándo llegó a cada etapa (la última vez). */
function cuandoLlego(p: Paquete, e: Etapa): string | undefined {
  return [...p.historial].reverse().find((x) => x.tipo === e)?.ts;
}

const ORIGEN_PREALERTA = {
  captura: "La IA la leyó de la captura del chat",
  web: "El cliente la llenó en shopusa.la",
  equipo: "La registró el equipo",
} as const;

export function FichaPaquete({
  vista,
  paquete: p,
  yo,
  onClose,
  onAviso,
}: {
  vista: VistaShopusa;
  paquete: Paquete;
  yo: string;
  onClose: () => void;
  /** Para el aviso de la pantalla ("Se le avisó por WhatsApp a ..."). */
  onAviso?: (texto: string) => void;
}) {
  const router = useRouter();
  useCerrarConEscape(onClose);
  const [motivo, setMotivo] = useState(MOTIVOS_SELECTIVO[0].texto);
  const [marcando, setMarcando] = useState(false);
  const [destino, setDestino] = useState<SucursalId | "">("");
  const cliente = clienteDe(vista, p.clienteId);
  const carga = vista.cargas.find((c) => c.id === p.cargaId);
  const cobro = cobroDe(p, vista.paquetes, vista.ahora);
  const alertas = alertasDelPaquete(p, vista.alertas);
  const etiquetas = etiquetasDelPaquete(p, vista.paquetes);
  const almacenaje = vista.alertas.almacenaje.find((x) => x.paquete.id === p.id);
  const avisos = vista.avisos.get(p.id) ?? [];
  const sigue = siguienteEtapa(p.etapa);
  const idx = ETAPAS.findIndex((e) => e.id === p.etapa);
  const otros = cobro.lineas.filter((l) => l.paquete.id !== p.id).map((l) => l.paquete);
  const nombre = cliente?.nombre.split(" ")[0] ?? "el cliente";
  const tarde = sinPrealertaATiempo(p);
  const sucursalActual = p.entrega.tipo === "sucursal" ? p.entrega.sucursal : null;
  const salioACasa = p.historial.some((e) => e.tipo === "en_camino");

  function hacer(tipo: Parameters<typeof registrar>[0], valor: Record<string, unknown>, aviso: string) {
    if (registrar(tipo, p.id, valor, yo)) onAviso?.(aviso);
  }

  const conversacion = cliente?.conversationId ?? (avisos.some((a) => a.movId) ? `susa-${p.clienteId}` : undefined);

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
                {etiquetas.map((e) => (
                  <EtiquetaChip key={e.tipo} tipo={e.tipo}>
                    {e.texto}
                  </EtiquetaChip>
                ))}
                {p.pagado && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--susa-verde-suave)] px-1.5 py-0.5 text-[10.5px] font-bold text-[var(--brand-green)]">
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

          {/* La línea del paquete, con los pasos del rastreo de shopusa.la */}
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
          {p.etapa === "aduana" && p.selectivo && (
            <div className="rounded-xl border border-[var(--brand-red)]/25 bg-[var(--susa-rojo-fondo)] p-3.5">
              <p className="text-[13px] font-bold text-[var(--brand-red)]">Selectivo rojo: {p.selectivo.motivo.charAt(0).toLowerCase() + p.selectivo.motivo.slice(1)}</p>
              <p className="mt-0.5 text-[12px] text-[var(--text-2)]">
                Desde el {diaHora(p.selectivo.desde)}.{" "}
                {motivoSelectivo(p.selectivo.motivo).pideFactura
                  ? `El aviso con el pedido de la factura ya le llegó a ${nombre}.`
                  : `${nombre} ya sabe que Aduana lo está revisando.`}
              </p>
              <button type="button" className={`${PRIMARIO} mt-2.5`} onClick={() => hacer("liberar", {}, `Aduana liberó el paquete. Se le avisó a ${nombre} por WhatsApp con su total.`)}>
                <Check size={15} /> Aduana lo liberó
              </button>
            </div>
          )}
          {p.etapa === "miami" && !p.prealerta && (
            <div className="rounded-xl border border-[var(--susa-ambar)]/25 bg-[var(--susa-ambar-fondo)] p-3.5">
              <p className="text-[13px] font-bold text-[var(--susa-ambar)]">Llegó a Miami sin prealerta</p>
              <p className="mt-0.5 text-[12px] text-[var(--text-2)]">
                Lleva cargo de $1.50 y, sin factura, Aduana lo valora con sus precios de referencia. El aviso automático ya le pidió a {nombre} la factura o la captura del pedido.
              </p>
            </div>
          )}
          {almacenaje && (
            <div className="rounded-xl border border-[var(--susa-ambar)]/25 bg-[var(--susa-ambar-fondo)] p-3.5">
              <p className="text-[13px] font-bold text-[var(--susa-ambar)]">
                {almacenaje.estado === "cobrando"
                  ? `Lleva ${almacenaje.semanas} ${almacenaje.semanas === 1 ? "semana" : "semanas"} de almacenaje`
                  : `Sin costo hasta el ${fechaCorta(diaSV(almacenaje.limite))}`}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--text-2)]">
                {almacenaje.estado === "cobrando"
                  ? `Cobra 10% del total por cada semana después de los 30 días, y el ${fechaCorta(diaSV(almacenaje.abandono))} cae en abandono.`
                  : "Después de 30 días en la sucursal se cobra 10% del total por cada semana de almacenaje."}
              </p>
              <button type="button" className={`${PRIMARIO} mt-2.5`} onClick={() => hacer("recordatorio", {}, `Se le recordó a ${nombre} por WhatsApp que lo retire.`)}>
                Recordarle por WhatsApp
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
              <Dato label="Código de cliente" valor={cliente?.codigo} />
              <Dato
                label="Entrega"
                valor={p.entrega.tipo === "sucursal" ? `Sucursal ${sucursalDef(p.entrega.sucursal).nombre}` : `A domicilio, ${p.entrega.zona}`}
                ancho={p.entrega.tipo === "domicilio"}
              />
              {p.entrega.tipo === "domicilio" && <Dato label="Dirección" valor={p.entrega.direccion} ancho />}
            </dl>
            {p.etapa !== "entregado" && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <select
                  value={destino}
                  onChange={(e) => setDestino(e.target.value as SucursalId | "")}
                  aria-label="Cambiar a otra sucursal"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-card px-2 py-1.5 text-[12.5px]"
                >
                  <option value="">Retirar en otra sucursal…</option>
                  {SUCURSALES.filter((s) => s.id !== sucursalActual).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                {destino && (
                  <button
                    type="button"
                    className={SECUNDARIO}
                    onClick={() => {
                      const d = destino;
                      setDestino("");
                      hacer("traslado", { sucursal: d }, `Ahora se retira en ${sucursalDef(d).nombre}. Se le avisó a ${nombre} por WhatsApp.`);
                    }}
                  >
                    Cambiar ({prealertoATiempo(p) ? "sin costo" : "$2.50"})
                  </button>
                )}
              </div>
            )}
          </Seccion>

          <Seccion titulo={cobro.consolidado ? `Cobro del envío (${cobro.lineas.length} paquetes)` : "Cobro"}>
            {cobro.consolidado && (
              <p className="mb-2.5 rounded-lg bg-[var(--susa-verde-suave)] px-3 py-2 text-[12px] text-[var(--text)]">
                <b className="text-[var(--brand-green)]">Consolidado:</b> viaja en la {nombreCarga(p.cargaId).toLowerCase()} con{" "}
                {listaDeCosas(otros.map((x) => x.contenido))}. Se pesan juntos y se cobra un solo flete.
              </p>
            )}
            <div className="space-y-1.5 text-[12.5px]">
              {cobro.pesado ? (
                <Fila
                  izq={`Flete: ${cobro.libras} lb x ${dinero(cobro.precioLibra)}${cobro.lineas.some((l) => l.porVolumen) ? " (promedio con el peso volumétrico)" : ""}`}
                  der={dinero(cobro.flete)}
                />
              ) : (
                <Fila izq="Flete: se calcula al pesarlo en Miami" der="" />
              )}
              {cobro.consolidado && cobro.ahorro > 0 && (
                <p className="text-[11.5px] font-semibold text-[var(--brand-green)]">
                  Por separado serían {dinero(cobro.fleteSeparado)}: ahorra {dinero(cobro.ahorro)}.
                </p>
              )}
              <Fila izq={`IVA 13% sobre ${cobro.consolidado ? "las facturas" : `la factura de ${dinero(p.valor)}`}`} der={dinero(cobro.iva)} />
              {cobro.lineas
                .filter((l) => l.arancel.tipo !== "ninguno")
                .map((l) => (
                  <Fila
                    key={l.paquete.id}
                    izq={
                      l.arancel.tipo === "fija"
                        ? `Tarifa fija${cobro.consolidado ? ` (${l.paquete.contenido})` : ""}`
                        : `DAI ${l.arancel.pct}%${cobro.consolidado ? ` (${l.paquete.contenido})` : ""}, factura de más de $300`
                    }
                    der={dinero(l.arancel.monto)}
                  />
                ))}
              {cobro.recargos > 0 && <Fila izq="Sin prealerta antes de llegar a Miami" der={dinero(cobro.recargos)} />}
              {cobro.traslado > 0 && <Fila izq="Traslado entre sucursales" der={dinero(cobro.traslado)} />}
              {cobro.domicilio > 0 && (
                <Fila izq={`Entrega a domicilio (${cobro.domicilio === CARGO_DOMICILIO.metro ? "área metropolitana" : "fuera del área metropolitana"})`} der={dinero(cobro.domicilio)} />
              )}
              {cobro.almacenaje > 0 && (
                <Fila izq={`Almacenaje: ${cobro.semanasAlmacenaje} ${cobro.semanasAlmacenaje === 1 ? "semana" : "semanas"} al 10%`} der={dinero(cobro.almacenaje)} />
              )}
              <div className="flex items-center justify-between border-t border-line pt-2 text-[14px] font-extrabold text-[var(--text)]">
                <span>{cobro.pesado ? "Total" : "Impuestos estimados"}</span>
                <span>{dinero(cobro.total)}</span>
              </div>
              <p className="text-[11px] text-[var(--text-3)]">
                Como la calculadora de shopusa.la: libra o fracción a $4.99 hasta 5 lb y a $4.40 desde 6 lb, IVA 13% sobre la factura, y DAI o tarifa fija según la categoría.
              </p>
            </div>
          </Seccion>

          <Seccion titulo="Paquete">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <Dato label="Tienda" valor={p.tienda} />
              <Dato label="Valor de la factura" valor={p.valor ? dinero(p.valor) : "Por confirmar"} />
              <Dato label="Categoría" valor={p.categoria} ancho />
              <Dato label="Peso real" valor={p.pesoLb !== undefined ? libras(p.pesoLb) : ""} />
              <Dato label="En el rastreo" valor={`${etapaDef(p.etapa).nombre} (${etapaDef(p.etapa).codigo})`} />
              {p.medidas && (
                <>
                  <Dato label="Medidas" valor={`${p.medidas.largo} x ${p.medidas.ancho} x ${p.medidas.alto} pulg.`} />
                  <Dato label="Peso volumétrico" valor={libras(pesoVolumetrico(p.medidas))} />
                </>
              )}
              <Dato label="Carga" valor={carga ? `${nombreCarga(carga)} · sale ${salidaDe(carga)}` : "Se asigna al llegar a Miami"} ancho />
            </dl>
          </Seccion>

          <Seccion titulo="Prealerta">
            {!p.prealerta ? (
              <p className="text-[12.5px] text-[var(--text-2)]">Llegó a Miami sin prealerta: el aviso automático ya le pidió a {nombre} la factura o la captura del pedido.</p>
            ) : (
              <div className="flex gap-3">
                {p.prealerta.capturaUrl && (
                  <a href={p.prealerta.capturaUrl} target="_blank" rel="noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.prealerta.capturaUrl} alt="Captura del pedido" className="h-28 w-auto rounded-lg border border-line" />
                  </a>
                )}
                <div className="min-w-0 text-[12.5px] text-[var(--text-2)]">
                  <p className="font-semibold text-[var(--text)]">{ORIGEN_PREALERTA[p.prealerta.origen]}</p>
                  <p className="mt-0.5">{diaHora(p.prealerta.ts)}</p>
                  {tarde && <p className="mt-1 font-semibold text-[var(--susa-ambar)]">Llegó después que el paquete: lleva el cargo de $1.50.</p>}
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
          {sigue && !(p.etapa === "aduana" && p.selectivo) && (
            <button
              type="button"
              className={PRIMARIO}
              onClick={() => hacer("etapa", { a: sigue }, `${etapaDef(sigue).nombre}. Se le avisó a ${nombre} por WhatsApp.`)}
            >
              {etapaDef(sigue).nombre} <ArrowRight size={15} />
            </button>
          )}
          {p.etapa === "aduana" && !p.selectivo && !marcando && (
            <button type="button" className={SECUNDARIO} onClick={() => setMarcando(true)}>
              Selectivo rojo
            </button>
          )}
          {marcando && (
            <div className="flex w-full flex-wrap items-center gap-2">
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-line bg-card px-2 py-2 text-[12.5px]">
                {MOTIVOS_SELECTIVO.map((m) => (
                  <option key={m.texto}>{m.texto}</option>
                ))}
              </select>
              <button
                type="button"
                className={PRIMARIO}
                onClick={() => {
                  setMarcando(false);
                  hacer("selectivo", { motivo }, `Quedó con selectivo rojo. Se le avisó a ${nombre} por WhatsApp.`);
                }}
              >
                Marcar
              </button>
              <button type="button" className={SECUNDARIO} onClick={() => setMarcando(false)} aria-label="Cancelar">
                <Undo2 size={14} />
              </button>
            </div>
          )}
          {p.etapa === "listo" && p.entrega.tipo === "domicilio" && !salioACasa && (
            <button type="button" className={SECUNDARIO} onClick={() => hacer("en_camino", {}, `Salió a domicilio. ${nombre} recibió el aviso por WhatsApp.`)}>
              <Truck size={15} /> Salió a domicilio
            </button>
          )}
          {(p.etapa === "listo" || p.etapa === "entregado") && !p.pagado && (
            <button
              type="button"
              className={SECUNDARIO}
              onClick={() => hacer("pagado", {}, `Pago registrado. ${nombre} recibió la confirmación por WhatsApp.`)}
            >
              <Check size={15} /> Marcar pagado{cobro.consolidado ? ` (${cobro.lineas.length} paquetes)` : ""}
            </button>
          )}
          {p.etapa === "listo" && !almacenaje && (
            <button type="button" className={SECUNDARIO} onClick={() => hacer("recordatorio", {}, `Se le recordó a ${nombre} por WhatsApp que lo retire.`)}>
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
