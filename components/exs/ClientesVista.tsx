"use client";

// Clientes: cada casillero con lo que tiene en camino, lo que está listo para
// retirar y lo que trajo. La ficha junta sus paquetes y su chat.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MapPin, MessageCircle, Phone, Search, X } from "lucide-react";
import type { Cliente, Paquete } from "@/lib/exs/tipos";
import { sucursalDef } from "@/lib/exs/catalogo";
import { cobroDe, dinero } from "@/lib/exs/cobro";
import { totalDelVuelo } from "@/lib/exs/estado";
import { alertasDelPaquete } from "@/lib/exs/alertas";
import { paquetesDe, type VistaExs } from "@/lib/exs/vista";
import { useExs } from "@/lib/exs/store";
import { haceCuanto } from "@/lib/eventos/fechas";
import { mesYAnio } from "@/lib/exs/formato";
import { telefonoBonito } from "@/lib/phone";
import { sinTildes } from "@/lib/paneles";
import { useYo } from "@/lib/yo";
import { Avatar, inicialesDe } from "@/components/ui/Avatar";
import { FichaPaquete } from "./FichaPaquete";
import { AlertaChip, EtapaChip, Seccion, abrirEnBandeja, trackingLegible, useCerrarConEscape } from "./ui";

const EN_CAMINO = new Set(["prealertado", "miami", "en_vuelo", "aduana"]);

function ultimoMovimiento(ps: Paquete[]): string {
  return ps.reduce((max, p) => {
    const ts = p.historial.at(-1)?.ts ?? p.creado;
    return ts > max ? ts : max;
  }, "");
}

export function ClientesVista() {
  const vista = useExs();
  const yo = useYo();
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [paqueteAbierto, setPaqueteAbierto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // /clientes?id=c10 abre esa ficha.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) setAbierto(id);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  const filas = useMemo(() => {
    const busca = sinTildes(q);
    return vista.clientes
      .map((c) => {
        const ps = paquetesDe(vista, c.id);
        return {
          c,
          ps,
          enCamino: ps.filter((p) => EN_CAMINO.has(p.etapa)).length,
          listos: ps.filter((p) => p.etapa === "listo").length,
          alertas: ps.reduce((n, p) => n + alertasDelPaquete(p, vista.alertas).length, 0),
          ultimo: ultimoMovimiento(ps),
        };
      })
      .filter(({ c }) => !busca || sinTildes([c.nombre, c.casillero, c.telefono, c.correo].join(" ")).includes(busca))
      .sort((a, b) => b.ultimo.localeCompare(a.ultimo));
  }, [vista, q]);

  const cliente = abierto ? vista.clientes.find((c) => c.id === abierto) : undefined;
  const paquete = paqueteAbierto ? vista.paquetes.find((p) => p.id === paqueteAbierto) : undefined;

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-card px-5 py-3">
        <div className="min-w-0">
          <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Clientes</h1>
          <p className="text-[12.5px] text-[var(--text-3)]">{vista.clientes.length} casilleros activos</p>
        </div>
        <label className="relative ml-auto w-full max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre, casillero o teléfono"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-[13px] outline-none focus:border-brand focus:bg-card"
          />
        </label>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[820px] text-[12.5px]">
            <thead className="bg-surface text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
              <tr>
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-2 py-2.5">Casillero</th>
                <th className="px-2 py-2.5">Retira en</th>
                <th className="px-2 py-2.5 text-center">En camino</th>
                <th className="px-2 py-2.5 text-center">Para retirar</th>
                <th className="px-4 py-2.5">Último movimiento</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ c, enCamino, listos, alertas, ultimo }) => (
                <tr key={c.id} onClick={() => setAbierto(c.id)} className="cursor-pointer border-t border-line hover:bg-surface">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar iniciales={inicialesDe(c.nombre)} size={32} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--text)]">{c.nombre}</p>
                        <p className="text-[11px] text-[var(--text-3)]">{telefonoBonito(c.telefono)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 font-mono font-semibold text-[var(--text)]">{c.casillero}</td>
                  <td className="px-2 py-2.5 text-[var(--text-2)]">{sucursalDef(c.sucursal).nombre}</td>
                  <td className="px-2 py-2.5 text-center font-semibold text-[var(--text)]">{enCamino || ""}</td>
                  <td className="px-2 py-2.5 text-center font-semibold text-[var(--text)]">{listos || ""}</td>
                  <td className="px-4 py-2.5 text-[var(--text-2)]">
                    <span>{ultimo ? haceCuanto(ultimo, vista.ahora) : ""}</span>
                    {alertas > 0 && (
                      <span className="ml-2">
                        <AlertaChip tipo="vence">
                          {alertas} {alertas === 1 ? "alerta" : "alertas"}
                        </AlertaChip>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[13px] text-[var(--text-3)]">
                    Nadie con ese nombre, casillero o teléfono.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {cliente && !paquete && (
        <FichaCliente vista={vista} cliente={cliente} onClose={() => setAbierto(null)} onAbrirPaquete={setPaqueteAbierto} />
      )}
      {paquete && <FichaPaquete vista={vista} paquete={paquete} yo={yo} onClose={() => setPaqueteAbierto(null)} onAviso={setAviso} />}

      {aviso && (
        <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-[var(--text)] px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-xl">
          {aviso}
        </div>
      )}
    </div>
  );
}

function FichaCliente({
  vista,
  cliente: c,
  onClose,
  onAbrirPaquete,
}: {
  vista: VistaExs;
  cliente: Cliente;
  onClose: () => void;
  onAbrirPaquete: (id: string) => void;
}) {
  const router = useRouter();
  useCerrarConEscape(onClose);
  const ps = paquetesDe(vista, c.id).sort((a, b) => (b.historial.at(-1)?.ts ?? b.creado).localeCompare(a.historial.at(-1)?.ts ?? a.creado));
  const activos = ps.filter((p) => p.etapa !== "entregado");
  const paraRetirar = ps.filter((p) => p.etapa === "listo");
  const porPagar = ps
    .filter((p) => p.etapa === "listo" && !p.pagado)
    .reduce((n, p) => n + cobroDe(p, totalDelVuelo(vista.paquetes, p.clienteId, p.vueloId)).total, 0);
  const s = sucursalDef(c.sucursal);
  const conversacion = c.conversationId ?? (ps.some((p) => (vista.avisos.get(p.id) ?? []).some((a) => a.movId)) ? `exs-${c.id}` : undefined);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside className="flex h-full w-full max-w-[480px] flex-col bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={c.nombre}>
        <header className="flex items-start gap-3 border-b border-line bg-card px-5 py-4">
          <Avatar iniciales={inicialesDe(c.nombre)} size={48} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-extrabold text-[var(--text)]">{c.nombre}</h2>
            <p className="font-mono text-[13px] font-semibold text-brand">{c.casillero}</p>
            <p className="text-[11.5px] text-[var(--text-3)]">Cliente desde {mesYAnio(c.desde)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-surface">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-2">
            <Cifra valor={String(activos.length)} label="en camino o por retirar" />
            <Cifra valor={String(paraRetirar.length)} label="listos para retirar" />
            <Cifra valor={porPagar > 0 ? dinero(porPagar) : String(ps.length)} label={porPagar > 0 ? "por pagar al retirar" : "paquetes con nosotros"} />
          </div>

          <Seccion
            titulo="Contacto"
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
            <ul className="space-y-2 text-[12.5px] text-[var(--text-2)]">
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-[var(--text-3)]" /> {telefonoBonito(c.telefono)}
              </li>
              {c.correo && (
                <li className="flex items-center gap-2">
                  <Mail size={14} className="text-[var(--text-3)]" /> {c.correo}
                </li>
              )}
              <li className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 text-[var(--text-3)]" />
                <span>
                  Retira en {s.nombre} ({s.zona})
                  {c.domicilio && (
                    <>
                      <br />A domicilio: {c.domicilio.direccion}, {c.domicilio.zona}
                    </>
                  )}
                </span>
              </li>
            </ul>
            {c.notas && <p className="mt-2.5 rounded-lg bg-surface px-3 py-2 text-[12px] text-[var(--text-2)]">{c.notas}</p>}
          </Seccion>

          <Seccion titulo={`Paquetes (${ps.length})`}>
            <ul className="divide-y divide-[var(--border)]">
              {ps.map((p) => {
                const alertas = alertasDelPaquete(p, vista.alertas);
                return (
                  <li key={p.id}>
                    <button type="button" onClick={() => onAbrirPaquete(p.id)} className="flex w-full items-start gap-3 py-2.5 text-left hover:bg-surface">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-[var(--text)]">{p.contenido}</p>
                        <p className="truncate font-mono text-[11px] text-[var(--text-3)]">
                          {p.tienda} · {trackingLegible(p.tracking)}
                        </p>
                        {alertas.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {alertas.map((a) => (
                              <AlertaChip key={a.tipo} tipo={a.tipo}>
                                {a.texto}
                              </AlertaChip>
                            ))}
                          </div>
                        )}
                      </div>
                      <EtapaChip etapa={p.etapa} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Seccion>
        </div>
      </aside>
    </div>
  );
}

function Cifra({ valor, label }: { valor: string; label: string }) {
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2.5">
      <p className="text-[16px] font-extrabold text-[var(--text)]">{valor}</p>
      <p className="text-[11px] font-medium text-[var(--text-3)]">{label}</p>
    </div>
  );
}
