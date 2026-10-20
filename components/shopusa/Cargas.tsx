"use client";

// Las cargas aéreas de Miami a El Salvador con lo que lleva cada una. Una
// carga se mueve entera (despachar, aterrizó, aduana la liberó) y cada cliente
// recibe su aviso. Aquí se ve también quién va consolidado (un solo flete por
// sus paquetes) y lo que pide atención antes de que salga.

import { useEffect, useState } from "react";
import { ChevronDown, Layers, Plane, PlaneLanding, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Carga, EstadoCarga, Paquete } from "@/lib/shopusa/tipos";
import { cobroDeEnvio, dinero, envioDe, libras } from "@/lib/shopusa/cobro";
import { salidaDe } from "@/lib/shopusa/avisos";
import { clienteDe, type VistaShopusa } from "@/lib/shopusa/vista";
import { registrar } from "@/lib/shopusa/store";
import { diaHora, horaCorta } from "@/lib/eventos/fechas";
import { cuantos, nombreCarga } from "@/lib/shopusa/formato";
import { AlertaChip, EtapaChip, EtiquetaChip } from "./ui";

const NOMBRE_ESTADO: Record<EstadoCarga, string> = {
  programada: "Programada",
  en_transito: "En tránsito",
  en_aduana: "En aduana",
  liberada: "Liberada",
};

const COLOR_ESTADO: Record<EstadoCarga, string> = {
  programada: "var(--susa-etapa-miami)",
  en_transito: "var(--susa-etapa-transito)",
  en_aduana: "var(--susa-etapa-aduana)",
  liberada: "var(--susa-etapa-listo)",
};

const ORDEN_ESTADO: Record<EstadoCarga, number> = { en_transito: 0, programada: 1, en_aduana: 2, liberada: 3 };

/** El reloj de la pantalla, para que la carga en el aire avance sola. */
function useAhora(cadaMs = 30_000): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setAhora(Date.now()), cadaMs);
    return () => window.clearInterval(t);
  }, [cadaMs]);
  return ahora;
}

function minutosHasta(iso: string, ahora: number): number {
  return Math.round((Date.parse(iso) - ahora) / 60_000);
}

/** Los clientes que llevan más de un paquete en la carga, con lo que ahorran al pesarlos juntos. */
function consolidadosDe(delaCarga: Paquete[], todos: readonly Paquete[]): { clienteId: string; paquetes: Paquete[]; ahorro: number }[] {
  const vistos = new Set<string>();
  const out: { clienteId: string; paquetes: Paquete[]; ahorro: number }[] = [];
  for (const p of delaCarga) {
    if (vistos.has(p.id) || p.etapa === "entregado") continue;
    const envio = envioDe(p, todos);
    for (const x of envio) vistos.add(x.id);
    if (envio.length < 2) continue;
    out.push({ clienteId: p.clienteId, paquetes: envio, ahorro: cobroDeEnvio(envio).ahorro });
  }
  return out;
}

export function Cargas({
  vista,
  yo,
  onAbrir,
  onAviso,
}: {
  vista: VistaShopusa;
  yo: string;
  onAbrir: (id: string) => void;
  onAviso: (texto: string) => void;
}) {
  const ahora = useAhora();
  const [abierta, setAbierta] = useState<string | null>(vista.cargas.find((c) => c.estado === "programada")?.id ?? null);

  const cargas = [...vista.cargas].sort(
    (a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || (a.estado === "liberada" ? b.sale.localeCompare(a.sale) : a.sale.localeCompare(b.sale)),
  );

  function mover(c: Carga, estado: Exclude<EstadoCarga, "programada">, delaCarga: Paquete[]) {
    const desde = estado === "en_transito" ? "miami" : estado === "en_aduana" ? "transito" : "aduana";
    const tocados = delaCarga.filter((p) => p.etapa === desde && !(estado === "liberada" && p.selectivo));
    const clientes = new Set(tocados.map((p) => p.clienteId)).size;
    if (!registrar("despacho", c.id, { estado }, yo)) return;
    const que = estado === "en_transito" ? "despachada" : estado === "en_aduana" ? "aterrizó" : "liberada por aduana";
    onAviso(`${nombreCarga(c)} ${que}: ${cuantos(tocados.length, "paquete", "paquetes")}. Se le avisó por WhatsApp a ${cuantos(clientes, "cliente", "clientes")}.`);
  }

  return (
    <div className="space-y-3">
      {cargas.map((c) => {
        const delaCarga = vista.paquetes.filter((p) => p.cargaId === c.id);
        const lb = delaCarga.reduce((n, p) => n + (p.pesoLb ?? 0), 0);
        const facturas = delaCarga.reduce((n, p) => n + p.valor, 0);
        const clientes = new Set(delaCarga.map((p) => p.clienteId)).size;
        const consolidados = consolidadosDe(delaCarga, vista.paquetes);
        const ahorro = consolidados.reduce((n, x) => n + x.ahorro, 0);
        const consolidadosIds = new Set(consolidados.flatMap((x) => x.paquetes.map((p) => p.id)));
        const sinPrealerta = delaCarga.filter((p) => p.etapa === "miami" && !p.prealerta);
        const selectivos = delaCarga.filter((p) => p.etapa === "aduana" && p.selectivo);
        const progreso =
          c.estado === "en_transito"
            ? Math.min(1, Math.max(0, (ahora - Date.parse(c.sale)) / (Date.parse(c.llega) - Date.parse(c.sale))))
            : 0;
        const faltan = minutosHasta(c.llega, ahora);
        const esAbierta = abierta === c.id;
        const conAvisos = (c.estado !== "liberada" && consolidados.length > 0) || sinPrealerta.length > 0 || selectivos.length > 0;

        return (
          <article key={c.id} className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ backgroundColor: COLOR_ESTADO[c.estado] }}>
                  {c.estado === "en_aduana" || c.estado === "liberada" ? <PlaneLanding size={18} /> : <Plane size={18} />}
                </span>
                <div>
                  <p className="text-[14px] font-extrabold text-[var(--text)]">{nombreCarga(c)}</p>
                  <p className="text-[11px] text-[var(--text-3)]">{c.guia}</p>
                </div>
              </div>
              <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-bold text-[var(--text)]">{NOMBRE_ESTADO[c.estado]}</span>
              <div className="text-[12px] text-[var(--text-2)]">
                {c.estado === "programada" && (
                  <>
                    Sale el <b className="text-[var(--text)]">{salidaDe(c)}</b> · corte {diaHora(c.corte)}
                  </>
                )}
                {c.estado === "en_transito" && (
                  <>
                    Salió de Miami a las {horaCorta(c.sale)} ·{" "}
                    <b className="text-[var(--text)]">{faltan > 0 ? `aterriza en ${faltan} min` : "aterrizando"}</b>
                  </>
                )}
                {(c.estado === "en_aduana" || c.estado === "liberada") && <>Aterrizó el {diaHora(c.llega)}</>}
              </div>
              <div className="ml-auto flex items-center gap-3 text-[12px] text-[var(--text-2)]">
                <b className="text-[var(--text)]">{cuantos(delaCarga.length, "paquete", "paquetes")}</b>
                <b className="text-[var(--text)]">{libras(lb)}</b>
                <b className="text-[var(--text)]">{cuantos(clientes, "cliente", "clientes")}</b>
              </div>
            </div>

            {c.estado === "en_transito" && (
              <div className="px-4 pb-3">
                <div className="relative h-2 rounded-full bg-[var(--surface-2)]">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--susa-etapa-transito)]" style={{ width: `${progreso * 100}%` }} />
                  <Plane size={16} className="absolute -top-[5px] text-[var(--susa-etapa-transito)]" style={{ left: `calc(${progreso * 100}% - 8px)` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[10.5px] font-semibold text-[var(--text-3)]">
                  <span>Miami</span>
                  <span>San Salvador</span>
                </div>
              </div>
            )}

            {conAvisos && (
              <div className="space-y-2 border-t border-line bg-surface/60 px-4 py-3">
                {c.estado !== "liberada" && consolidados.length > 0 && (
                  <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--text)]">
                    <EtiquetaChip tipo="consolidado">Consolidados</EtiquetaChip>
                    <span>
                      {consolidados.map((x) => clienteDe(vista, x.clienteId)?.nombre).join(", ")}{" "}
                      {consolidados.length === 1 ? "lleva" : "llevan"} varios paquetes: se pesan juntos
                      {ahorro > 0 ? <> y se ahorran <b>{dinero(ahorro)}</b> de flete.</> : "."}
                    </span>
                  </p>
                )}
                {sinPrealerta.map((p) => (
                  <button key={p.id} type="button" onClick={() => onAbrir(p.id)} className="flex w-full items-center gap-2 text-left text-[12.5px]">
                    <AlertaChip tipo="sin_prealerta">Sin prealerta</AlertaChip>
                    <span className="text-[var(--text)]">
                      Caja de {p.tienda} para <b>{clienteDe(vista, p.clienteId)?.nombre}</b> ({libras(p.pesoLb ?? 0)}): falta la factura para declararla.
                    </span>
                  </button>
                ))}
                {selectivos.map((p) => (
                  <button key={p.id} type="button" onClick={() => onAbrir(p.id)} className="flex w-full items-center gap-2 text-left text-[12.5px]">
                    <AlertaChip tipo="selectivo">Selectivo rojo</AlertaChip>
                    <span className="text-[var(--text)]">
                      {p.contenido} de <b>{clienteDe(vista, p.clienteId)?.nombre}</b>: {p.selectivo?.motivo.toLowerCase()}.
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2.5">
              <button type="button" onClick={() => setAbierta(esAbierta ? null : c.id)} className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--brand-accent)]">
                <ChevronDown size={15} className={cn("transition", esAbierta && "rotate-180")} />
                {esAbierta ? "Ocultar manifiesto" : "Ver manifiesto"}
              </button>
              <span className="text-[11.5px] text-[var(--text-3)]">{dinero(facturas)} en facturas</span>
              <div className="ml-auto">
                {c.estado === "programada" && delaCarga.some((p) => p.etapa === "miami") && (
                  <button type="button" onClick={() => mover(c, "en_transito", delaCarga)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white hover:bg-brand-dark">
                    <Plane size={14} /> Despachar carga
                  </button>
                )}
                {c.estado === "en_transito" && (
                  <button type="button" onClick={() => mover(c, "en_aduana", delaCarga)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white hover:bg-brand-dark">
                    <PlaneLanding size={14} /> Aterrizó
                  </button>
                )}
                {c.estado === "en_aduana" && delaCarga.some((p) => p.etapa === "aduana" && !p.selectivo) && (
                  <button type="button" onClick={() => mover(c, "liberada", delaCarga)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white hover:bg-brand-dark">
                    <ShieldCheck size={14} /> Aduana liberó la carga
                  </button>
                )}
              </div>
            </div>

            {esAbierta && (
              <div className="overflow-x-auto border-t border-line">
                <table className="w-full min-w-[560px] text-[12.5px]">
                  <thead className="bg-surface text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                    <tr>
                      <th className="px-4 py-2">Cliente</th>
                      <th className="px-2 py-2">Contenido</th>
                      <th className="px-2 py-2 text-right">Factura</th>
                      <th className="px-2 py-2 text-right">Peso</th>
                      <th className="px-4 py-2">Etapa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {delaCarga
                      .sort((a, b) => (clienteDe(vista, a.clienteId)?.nombre ?? "").localeCompare(clienteDe(vista, b.clienteId)?.nombre ?? ""))
                      .map((p) => {
                        const cl = clienteDe(vista, p.clienteId);
                        return (
                          <tr key={p.id} onClick={() => onAbrir(p.id)} className="cursor-pointer border-t border-line hover:bg-surface">
                            <td className="px-4 py-2">
                              <p className="font-semibold text-[var(--text)]">{cl?.nombre}</p>
                              <p className="text-[11px] text-[var(--text-3)]">{cl?.codigo}</p>
                            </td>
                            <td className="px-2 py-2 text-[var(--text-2)]">
                              {p.contenido} <span className="text-[var(--text-3)]">· {p.tienda}</span>
                              {consolidadosIds.has(p.id) && (
                                <Layers size={13} className="ml-1 inline align-[-2px] text-[var(--brand-green)]" aria-label="Consolidado" />
                              )}
                            </td>
                            <td className="px-2 py-2 text-right font-semibold text-[var(--text)]">{p.valor ? dinero(p.valor) : "Por confirmar"}</td>
                            <td className="px-2 py-2 text-right text-[var(--text-2)]">{p.pesoLb !== undefined ? libras(p.pesoLb) : ""}</td>
                            <td className="px-4 py-2">
                              <EtapaChip etapa={p.etapa} />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
