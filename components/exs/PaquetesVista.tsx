"use client";

// Paquetes: la línea de cada compra, de la captura en el chat a la entrega.
// Tres vistas con la misma búsqueda (pipeline por etapa, lista y vuelos) y la
// ficha completa al abrir un paquete.

import { useEffect, useMemo, useState } from "react";
import { Columns3, LayoutList, Plane, RotateCcw, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Etapa, Paquete, SucursalId, Tienda } from "@/lib/exs/tipos";
import { ETAPAS, SUCURSALES, esEtapa, etapaDef } from "@/lib/exs/catalogo";
import { alertasDelPaquete, cuantasAlertas } from "@/lib/exs/alertas";
import { cobroDe, dinero, libras } from "@/lib/exs/cobro";
import { totalDelVuelo } from "@/lib/exs/estado";
import { clienteDe, type VistaExs } from "@/lib/exs/vista";
import { hayMovimientos, registrar, restablecer, useExs } from "@/lib/exs/store";
import { sinTildes } from "@/lib/paneles";
import { useYo } from "@/lib/yo";
import { FichaPaquete } from "./FichaPaquete";
import { Pipeline } from "./Pipeline";
import { Vuelos } from "./Vuelos";
import { AlertaChip, EtapaChip, IaChip, trackingLegible } from "./ui";

type Vista = "pipeline" | "lista" | "vuelos";

const VISTAS: { id: Vista; nombre: string; Icono: typeof Columns3 }[] = [
  { id: "pipeline", nombre: "Pipeline", Icono: Columns3 },
  { id: "lista", nombre: "Lista", Icono: LayoutList },
  { id: "vuelos", nombre: "Vuelos", Icono: Plane },
];

export function PaquetesVista() {
  const vista = useExs();
  const yo = useYo();
  const [modo, setModo] = useState<Vista>("pipeline");
  const [q, setQ] = useState("");
  const [tienda, setTienda] = useState<"" | Tienda>("");
  const [sucursal, setSucursal] = useState<"" | SucursalId | "domicilio">("");
  const [etapa, setEtapa] = useState<"" | Etapa>("");
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [movido, setMovido] = useState(false);

  // /paquetes?id=P-24410 abre esa ficha; ?etapa=aduana filtra; ?vista=vuelos.
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const id = qs.get("id");
    if (id) setAbierto(id);
    const e = qs.get("etapa");
    if (esEtapa(e)) {
      setEtapa(e);
      setModo("lista");
    }
    const v = qs.get("vista");
    if (v === "lista" || v === "vuelos" || v === "pipeline") setModo(v);
    if (qs.get("alertas")) setSoloAlertas(true);
  }, []);

  useEffect(() => setMovido(hayMovimientos()), [vista]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  const tiendas = useMemo(() => [...new Set(vista.paquetes.map((p) => p.tienda))].sort(), [vista.paquetes]);

  const filtrados = useMemo(() => {
    const busca = sinTildes(q);
    return vista.paquetes.filter((p) => {
      if (tienda && p.tienda !== tienda) return false;
      if (etapa && p.etapa !== etapa) return false;
      if (sucursal === "domicilio" && p.entrega.tipo !== "domicilio") return false;
      if (sucursal && sucursal !== "domicilio" && !(p.entrega.tipo === "sucursal" && p.entrega.sucursal === sucursal)) return false;
      if (soloAlertas && alertasDelPaquete(p, vista.alertas).length === 0) return false;
      if (busca) {
        const c = clienteDe(vista, p.clienteId);
        const texto = sinTildes([p.id, p.tracking, p.contenido, p.tienda, c?.nombre, c?.casillero, c?.telefono].join(" "));
        if (!texto.includes(busca)) return false;
      }
      return true;
    });
  }, [vista, q, tienda, etapa, sucursal, soloAlertas]);

  const paquete = abierto ? vista.paquetes.find((p) => p.id === abierto) : undefined;
  const activos = vista.paquetes.filter((p) => p.etapa !== "entregado").length;
  const alertas = cuantasAlertas(vista.alertas);
  const hayFiltros = Boolean(q || tienda || sucursal || etapa || soloAlertas);

  function mover(id: string, a: Etapa) {
    const p = vista.paquetes.find((x) => x.id === id);
    const nombre = p ? clienteDe(vista, p.clienteId)?.nombre.split(" ")[0] : undefined;
    if (registrar("etapa", id, { a }, yo)) {
      setAviso(`${etapaDef(a).nombre}.${nombre ? ` Se le avisó a ${nombre} por WhatsApp.` : ""}`);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-card px-5 py-3">
        <div className="min-w-0">
          <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Paquetes</h1>
          <p className="text-[12.5px] text-[var(--text-3)]">
            {activos} en camino o por entregar
            {alertas > 0 && (
              <>
                {" · "}
                <button type="button" onClick={() => setSoloAlertas((x) => !x)} className="font-semibold text-[var(--exs-ambar)] hover:underline">
                  {alertas} {alertas === 1 ? "necesita" : "necesitan"} atención
                </button>
              </>
            )}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-xl bg-surface p-1">
          {VISTAS.map(({ id, nombre, Icono }) => (
            <button
              key={id}
              type="button"
              onClick={() => setModo(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition",
                modo === id ? "bg-card text-brand shadow-sm" : "text-[var(--text-2)] hover:text-[var(--text)]",
              )}
            >
              <Icono size={15} /> {nombre}
            </button>
          ))}
        </div>
        {movido && (
          <button
            type="button"
            onClick={() => {
              restablecer();
              setAviso("Se restableció la muestra.");
            }}
            title="Deshacer todo lo movido en este navegador y volver a la muestra"
            aria-label="Restablecer la muestra"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-3)] transition hover:bg-surface hover:text-[var(--text)]"
          >
            <RotateCcw size={16} />
          </button>
        )}
      </header>

      {modo !== "vuelos" && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-card px-5 py-2.5">
          <label className="relative min-w-[220px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tracking, cliente, casillero o contenido"
              className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-[13px] outline-none focus:border-brand focus:bg-card"
            />
          </label>
          {modo === "lista" && (
            <select value={etapa} onChange={(e) => setEtapa(e.target.value as "" | Etapa)} className="rounded-lg border border-line bg-card px-2 py-2 text-[12.5px]">
              <option value="">Todas las etapas</option>
              {ETAPAS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          )}
          <select value={tienda} onChange={(e) => setTienda(e.target.value as "" | Tienda)} className="rounded-lg border border-line bg-card px-2 py-2 text-[12.5px]">
            <option value="">Todas las tiendas</option>
            {tiendas.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            value={sucursal}
            onChange={(e) => setSucursal(e.target.value as "" | SucursalId | "domicilio")}
            className="rounded-lg border border-line bg-card px-2 py-2 text-[12.5px]"
          >
            <option value="">Todas las entregas</option>
            {SUCURSALES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
            <option value="domicilio">A domicilio</option>
          </select>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] font-semibold text-[var(--text-2)]">
            <input type="checkbox" checked={soloAlertas} onChange={(e) => setSoloAlertas(e.target.checked)} className="accent-[var(--brand-blue)]" />
            Con alerta
          </label>
          {hayFiltros && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setTienda("");
                setSucursal("");
                setEtapa("");
                setSoloAlertas(false);
              }}
              className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--brand-accent)]"
            >
              <X size={13} /> Limpiar
            </button>
          )}
        </div>
      )}

      <div className={cn("min-h-0 flex-1 p-4", modo === "pipeline" ? "overflow-hidden" : "overflow-y-auto")}>
        {modo === "pipeline" && <Pipeline vista={vista} paquetes={filtrados} onAbrir={setAbierto} onMover={mover} />}
        {modo === "lista" && <Lista vista={vista} paquetes={filtrados} onAbrir={setAbierto} />}
        {modo === "vuelos" && <Vuelos vista={vista} yo={yo} onAbrir={setAbierto} onAviso={setAviso} />}
      </div>

      {paquete && <FichaPaquete vista={vista} paquete={paquete} yo={yo} onClose={() => setAbierto(null)} onAviso={setAviso} />}

      {aviso && (
        <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-[var(--text)] px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-xl">
          {aviso}
        </div>
      )}
    </div>
  );
}

function Lista({ vista, paquetes, onAbrir }: { vista: VistaExs; paquetes: Paquete[]; onAbrir: (id: string) => void }) {
  const orden = [...paquetes].sort(
    (a, b) =>
      ETAPAS.findIndex((e) => e.id === a.etapa) - ETAPAS.findIndex((e) => e.id === b.etapa) ||
      (b.historial.at(-1)?.ts ?? "").localeCompare(a.historial.at(-1)?.ts ?? ""),
  );
  if (orden.length === 0) {
    return <p className="py-16 text-center text-[13px] text-[var(--text-3)]">Ningún paquete con esos filtros.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
      <table className="w-full min-w-[860px] text-[12.5px]">
        <thead className="bg-surface text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
          <tr>
            <th className="px-4 py-2.5">Paquete</th>
            <th className="px-2 py-2.5">Cliente</th>
            <th className="px-2 py-2.5">Etapa</th>
            <th className="px-2 py-2.5">Vuelo</th>
            <th className="px-2 py-2.5 text-right">Peso</th>
            <th className="px-2 py-2.5 text-right">Total</th>
            <th className="px-4 py-2.5">Alertas</th>
          </tr>
        </thead>
        <tbody>
          {orden.map((p) => {
            const c = clienteDe(vista, p.clienteId);
            const cobro = cobroDe(p, totalDelVuelo(vista.paquetes, p.clienteId, p.vueloId));
            const alertas = alertasDelPaquete(p, vista.alertas);
            return (
              <tr key={p.id} onClick={() => onAbrir(p.id)} className="cursor-pointer border-t border-line align-top hover:bg-surface">
                <td className="px-4 py-2.5">
                  <p className="font-semibold text-[var(--text)]">{p.contenido}</p>
                  <p className="font-mono text-[11px] text-[var(--text-3)]">
                    {p.tienda} · {trackingLegible(p.tracking)}
                  </p>
                </td>
                <td className="px-2 py-2.5">
                  <p className="font-semibold text-[var(--text)]">{c?.nombre}</p>
                  <p className="text-[11px] text-[var(--text-3)]">{c?.casillero}</p>
                </td>
                <td className="px-2 py-2.5">
                  <EtapaChip etapa={p.etapa} />
                </td>
                <td className="px-2 py-2.5 text-[var(--text-2)]">{p.vueloId ?? ""}</td>
                <td className="px-2 py-2.5 text-right text-[var(--text-2)]">{p.pesoLb !== undefined ? libras(p.pesoLb) : ""}</td>
                <td className="px-2 py-2.5 text-right font-semibold text-[var(--text)]">
                  {cobro.pesado ? dinero(cobro.total) : ""}
                  {p.pagado && <span className="ml-1 text-[10.5px] font-bold text-[var(--brand-green)]">Pagado</span>}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {p.prealerta?.origen === "captura" && <IaChip compacto />}
                    {alertas.map((a) => (
                      <AlertaChip key={a.tipo} tipo={a.tipo}>
                        {a.texto}
                      </AlertaChip>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
