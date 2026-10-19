"use client";

// Los vuelos de la semana con lo que lleva cada uno. Un vuelo se mueve entero
// (despachar, aterrizó, aduana lo liberó) y cada cliente recibe su aviso.
// Aquí se ve también quién pasa de $300 en un vuelo que todavía no sale.

import { useEffect, useState } from "react";
import { ChevronDown, Plane, PlaneLanding, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import type { EstadoVuelo, Paquete, Vuelo } from "@/lib/exs/tipos";
import { LIMITE_VUELO } from "@/lib/exs/catalogo";
import { dinero, libras } from "@/lib/exs/cobro";
import { salidaDe } from "@/lib/exs/avisos";
import { siguienteVuelo } from "@/lib/exs/alertas";
import { clienteDe, type VistaExs } from "@/lib/exs/vista";
import { registrar } from "@/lib/exs/store";
import { diaHora, horaCorta } from "@/lib/eventos/fechas";
import { cuantos } from "@/lib/exs/formato";
import { AlertaChip, EtapaChip } from "./ui";

const NOMBRE_ESTADO: Record<EstadoVuelo, string> = {
  programado: "Programado",
  en_vuelo: "En vuelo",
  en_aduana: "En aduana",
  liberado: "Liberado",
};

const COLOR_ESTADO: Record<EstadoVuelo, string> = {
  programado: "var(--exs-etapa-miami)",
  en_vuelo: "var(--exs-etapa-vuelo)",
  en_aduana: "var(--exs-etapa-aduana)",
  liberado: "var(--exs-etapa-listo)",
};

const ORDEN_ESTADO: Record<EstadoVuelo, number> = { en_vuelo: 0, programado: 1, en_aduana: 2, liberado: 3 };

/** El reloj de la pantalla, para que el vuelo en el aire avance solo. */
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

export function Vuelos({
  vista,
  yo,
  onAbrir,
  onAviso,
}: {
  vista: VistaExs;
  yo: string;
  onAbrir: (id: string) => void;
  onAviso: (texto: string) => void;
}) {
  const ahora = useAhora();
  const [abierto, setAbierto] = useState<string | null>(vista.vuelos.find((v) => v.estado === "programado")?.id ?? null);

  const vuelos = [...vista.vuelos].sort(
    (a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || (a.estado === "liberado" ? b.sale.localeCompare(a.sale) : a.sale.localeCompare(b.sale)),
  );

  function mover(v: Vuelo, estado: Exclude<EstadoVuelo, "programado">, delVuelo: Paquete[]) {
    const desde = estado === "en_vuelo" ? "miami" : estado === "en_aduana" ? "en_vuelo" : "aduana";
    const tocados = delVuelo.filter((p) => p.etapa === desde && !(estado === "liberado" && p.retenido));
    const clientes = new Set(tocados.map((p) => p.clienteId)).size;
    if (!registrar("despacho", v.id, { estado }, yo)) return;
    const que = estado === "en_vuelo" ? "despachado" : estado === "en_aduana" ? "aterrizó" : "liberado por aduana";
    onAviso(`${v.id} ${que}: ${cuantos(tocados.length, "paquete", "paquetes")}. Se le avisó por WhatsApp a ${cuantos(clientes, "cliente", "clientes")}.`);
  }

  return (
    <div className="space-y-3">
      {vuelos.map((v) => {
        const delVuelo = vista.paquetes.filter((p) => p.vueloId === v.id);
        const lb = delVuelo.reduce((n, p) => n + (p.pesoLb ?? 0), 0);
        const declarado = delVuelo.reduce((n, p) => n + p.valor, 0);
        const clientes = new Set(delVuelo.map((p) => p.clienteId)).size;
        const sobre = vista.alertas.sobreLimite.filter((s) => s.vuelo.id === v.id);
        const sinPrealerta = delVuelo.filter((p) => p.etapa === "miami" && !p.prealerta);
        const retenidos = delVuelo.filter((p) => p.etapa === "aduana" && p.retenido);
        const otro = siguienteVuelo(vista.vuelos, v.id);
        const progreso =
          v.estado === "en_vuelo"
            ? Math.min(1, Math.max(0, (ahora - Date.parse(v.sale)) / (Date.parse(v.llega) - Date.parse(v.sale))))
            : 0;
        const faltan = minutosHasta(v.llega, ahora);
        const esAbierto = abierto === v.id;

        return (
          <article key={v.id} className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: COLOR_ESTADO[v.estado] }}
                >
                  {v.estado === "en_aduana" || v.estado === "liberado" ? <PlaneLanding size={18} /> : <Plane size={18} />}
                </span>
                <div>
                  <p className="text-[14px] font-extrabold text-[var(--text)]">{v.id}</p>
                  <p className="text-[11px] text-[var(--text-3)]">{v.guia}</p>
                </div>
              </div>
              <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-bold text-[var(--text)]">{NOMBRE_ESTADO[v.estado]}</span>
              <div className="text-[12px] text-[var(--text-2)]">
                {v.estado === "programado" && (
                  <>
                    Sale el <b className="text-[var(--text)]">{salidaDe(v)}</b> · corte {diaHora(v.corte)}
                  </>
                )}
                {v.estado === "en_vuelo" && (
                  <>
                    Salió a las {horaCorta(v.sale)} ·{" "}
                    <b className="text-[var(--text)]">{faltan > 0 ? `aterriza en ${faltan} min` : "aterrizando"}</b>
                  </>
                )}
                {(v.estado === "en_aduana" || v.estado === "liberado") && <>Aterrizó el {diaHora(v.llega)}</>}
              </div>
              <div className="ml-auto flex items-center gap-3 text-[12px] text-[var(--text-2)]">
                <span>
                  <b className="text-[var(--text)]">{cuantos(delVuelo.length, "paquete", "paquetes")}</b>
                </span>
                <span>
                  <b className="text-[var(--text)]">{libras(lb)}</b>
                </span>
                <span>
                  <b className="text-[var(--text)]">{cuantos(clientes, "cliente", "clientes")}</b>
                </span>
              </div>
            </div>

            {v.estado === "en_vuelo" && (
              <div className="px-4 pb-3">
                <div className="relative h-2 rounded-full bg-[var(--surface-2)]">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--exs-etapa-vuelo)]" style={{ width: `${progreso * 100}%` }} />
                  <Plane
                    size={16}
                    className="absolute -top-[5px] text-[var(--exs-etapa-vuelo)]"
                    style={{ left: `calc(${progreso * 100}% - 8px)` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10.5px] font-semibold text-[var(--text-3)]">
                  <span>Miami</span>
                  <span>San Salvador</span>
                </div>
              </div>
            )}

            {(sobre.length > 0 || sinPrealerta.length > 0 || retenidos.length > 0) && (
              <div className="space-y-2 border-t border-line bg-surface/60 px-4 py-3">
                {sobre.map((s) => (
                  <div key={s.cliente.id} className="flex flex-wrap items-center gap-2 text-[12.5px]">
                    <AlertaChip tipo="limite">Pasa de {dinero(LIMITE_VUELO)}</AlertaChip>
                    <span className="text-[var(--text)]">
                      <b>{s.cliente.nombre}</b> trae {dinero(s.total)} en este vuelo: aduana cobraría IVA más DAI.
                    </span>
                    {s.sugerido && otro && (
                      <button
                        type="button"
                        onClick={() => {
                          if (registrar("vuelo", s.sugerido!.id, { vueloId: otro.id }, yo)) {
                            onAviso(`${s.sugerido!.contenido} pasó al ${otro.id}. ${s.cliente.nombre.split(" ")[0]} paga solo IVA en los dos vuelos y ya recibió el aviso.`);
                          }
                        }}
                        className="ml-auto rounded-lg bg-brand px-2.5 py-1.5 text-[12px] font-bold text-white hover:bg-brand-dark"
                      >
                        Pasar {s.sugerido.contenido} al {otro.id}
                      </button>
                    )}
                  </div>
                ))}
                {sinPrealerta.map((p) => (
                  <button key={p.id} type="button" onClick={() => onAbrir(p.id)} className="flex w-full items-center gap-2 text-left text-[12.5px]">
                    <AlertaChip tipo="sin_prealerta">Sin prealerta</AlertaChip>
                    <span className="text-[var(--text)]">
                      Caja de {p.tienda} para <b>{clienteDe(vista, p.clienteId)?.nombre}</b> ({libras(p.pesoLb ?? 0)}): falta la captura del pedido para declararla.
                    </span>
                  </button>
                ))}
                {retenidos.map((p) => (
                  <button key={p.id} type="button" onClick={() => onAbrir(p.id)} className="flex w-full items-center gap-2 text-left text-[12.5px]">
                    <AlertaChip tipo="retenido">Retenido</AlertaChip>
                    <span className="text-[var(--text)]">
                      {p.contenido} de <b>{clienteDe(vista, p.clienteId)?.nombre}</b>: {p.retenido?.motivo.toLowerCase()}.
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2.5">
              <button
                type="button"
                onClick={() => setAbierto(esAbierto ? null : v.id)}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--brand-accent)]"
              >
                <ChevronDown size={15} className={cn("transition", esAbierto && "rotate-180")} />
                {esAbierto ? "Ocultar manifiesto" : "Ver manifiesto"}
              </button>
              <span className="text-[11.5px] text-[var(--text-3)]">{dinero(declarado)} declarados</span>
              <div className="ml-auto">
                {v.estado === "programado" && delVuelo.some((p) => p.etapa === "miami") && (
                  <button type="button" onClick={() => mover(v, "en_vuelo", delVuelo)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white hover:bg-brand-dark">
                    <Plane size={14} /> Despachar vuelo
                  </button>
                )}
                {v.estado === "en_vuelo" && (
                  <button type="button" onClick={() => mover(v, "en_aduana", delVuelo)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white hover:bg-brand-dark">
                    <PlaneLanding size={14} /> Aterrizó
                  </button>
                )}
                {v.estado === "en_aduana" && delVuelo.some((p) => p.etapa === "aduana" && !p.retenido) && (
                  <button type="button" onClick={() => mover(v, "liberado", delVuelo)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white hover:bg-brand-dark">
                    <ShieldCheck size={14} /> Aduana liberó el vuelo
                  </button>
                )}
              </div>
            </div>

            {esAbierto && (
              <div className="overflow-x-auto border-t border-line">
                <table className="w-full min-w-[560px] text-[12.5px]">
                  <thead className="bg-surface text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                    <tr>
                      <th className="px-4 py-2">Cliente</th>
                      <th className="px-2 py-2">Contenido</th>
                      <th className="px-2 py-2 text-right">Valor</th>
                      <th className="px-2 py-2 text-right">Peso</th>
                      <th className="px-4 py-2">Etapa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {delVuelo
                      .sort((a, b) => (clienteDe(vista, a.clienteId)?.nombre ?? "").localeCompare(clienteDe(vista, b.clienteId)?.nombre ?? ""))
                      .map((p) => {
                        const c = clienteDe(vista, p.clienteId);
                        const pasa = sobre.some((s) => s.cliente.id === p.clienteId);
                        return (
                          <tr key={p.id} onClick={() => onAbrir(p.id)} className="cursor-pointer border-t border-line hover:bg-surface">
                            <td className="px-4 py-2">
                              <p className="font-semibold text-[var(--text)]">{c?.nombre}</p>
                              <p className="text-[11px] text-[var(--text-3)]">{c?.casillero}</p>
                            </td>
                            <td className="px-2 py-2 text-[var(--text-2)]">
                              {p.contenido} <span className="text-[var(--text-3)]">· {p.tienda}</span>
                            </td>
                            <td className={cn("px-2 py-2 text-right font-semibold", pasa ? "text-[var(--exs-ambar)]" : "text-[var(--text)]")}>
                              {p.valor ? dinero(p.valor) : "Por confirmar"}
                            </td>
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
