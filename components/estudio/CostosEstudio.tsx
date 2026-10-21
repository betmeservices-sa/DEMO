"use client";

// Lo que cuesta producir el contenido de cada marca, del registro de uso: cada
// llamada a un servicio deja su fila con unidades y costo. Con esto se pone el
// precio de reventa sobre datos y no a ojo. Las fechas van en hora de El
// Salvador.

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { deMarca, useEstudio, useMarcaActiva } from "@/lib/estudio/store";
import { diaDe, horaCorta, localSV, numeroDia } from "@/lib/estudio/fechas";
import { costoPorServicio, costoTotal } from "@/lib/estudio/generador";
import type { Marca, RegistroUso, Servicio } from "@/lib/estudio/tipos";
import { Cabecera, MarcaSello, Vidrio, dinero } from "./ui";

const SERVICIO: Record<Servicio, { texto: string; color: string }> = {
  avatar: { texto: "Avatar", color: "var(--es-violeta)" },
  voz: { texto: "Voz", color: "var(--es-cian)" },
  edicion: { texto: "Edición", color: "var(--es-ambar)" },
  imagen: { texto: "Imágenes", color: "#f28fb1" },
  texto: { texto: "Texto", color: "var(--es-naranja)" },
  publicacion: { texto: "Publicación", color: "var(--es-verde)" },
};

const ORDEN: Servicio[] = ["avatar", "voz", "edicion", "imagen", "texto", "publicacion"];

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "3 gráficos", "1 pieza", "0.53 min". */
function unidades(n: number, unidad: string): string {
  const cifra = n.toLocaleString("es-SV", { maximumFractionDigits: 2 });
  if (n === 1 || unidad === "min" || unidad.endsWith("s")) return `${cifra} ${unidad}`;
  return `${cifra} ${unidad === "imagen" ? "imágenes" : `${unidad}s`}`;
}

/** "YYYY-MM-DDTHH:mm" de El Salvador de un registro. */
function cuando(u: { fecha: string }): string {
  return localSV(Date.parse(u.fecha));
}

function diasDelMes(mes: string): number {
  const [y, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function Cifras({ uso, piezasMes, costoVideo }: { uso: RegistroUso[]; piezasMes: number; costoVideo: number | null }) {
  const total = costoTotal(uso);
  const items = [
    { cifra: dinero(total), texto: "gastado este mes" },
    { cifra: dinero(piezasMes ? total / piezasMes : 0), texto: "por pieza" },
    { cifra: costoVideo === null ? "Sin videos" : dinero(costoVideo), texto: "por video con avatar" },
    { cifra: String(piezasMes), texto: "piezas generadas" },
  ];
  return (
    <Vidrio className="grid grid-cols-2 lg:grid-cols-4">
      {items.map((it, i) => (
        <div
          key={it.texto}
          className={cn(
            "px-5 py-4",
            i % 2 === 1 && "border-l border-[var(--border)]",
            i >= 2 && "border-t border-[var(--border)] lg:border-t-0",
            i === 2 && "lg:border-l",
          )}
        >
          <p className="es-rotulo text-[34px] font-semibold leading-none tracking-[-0.01em] sm:text-[40px]">{it.cifra}</p>
          <p className="mt-1.5 text-[12.5px] text-[var(--text-3)]">{it.texto}</p>
        </div>
      ))}
    </Vidrio>
  );
}

function PorDia({ uso, mes, hoy }: { uso: RegistroUso[]; mes: string; hoy: string }) {
  const n = diasDelMes(mes);
  const [marcado, setMarcado] = useState<number | null>(null);
  const porDia = useMemo(() => {
    const xs = Array.from({ length: n }, () => 0);
    for (const u of uso) {
      const d = numeroDia(diaDe(cuando(u)));
      xs[d - 1] += u.costoUsd;
    }
    return xs;
  }, [uso, n]);
  const max = Math.max(...porDia, 0.01);
  const hoyN = hoy.startsWith(mes) ? numeroDia(hoy) : n;
  const [, m] = mes.split("-").map(Number);

  return (
    <Vidrio className="p-4 lg:p-5">
      <Cabecera titulo="Gasto por día" detalle={`${MESES[m - 1]}, hora de El Salvador`} />
      <div className="relative">
        <div className="flex h-[170px] items-end gap-[3px]" onMouseLeave={() => setMarcado(null)}>
          {porDia.map((v, i) => {
            const dia = i + 1;
            const futuro = dia > hoyN;
            const on = marcado === dia;
            return (
              <button
                key={dia}
                type="button"
                aria-label={`Día ${dia}: ${dinero(v)}`}
                onMouseEnter={() => setMarcado(dia)}
                onFocus={() => setMarcado(dia)}
                onBlur={() => setMarcado(null)}
                className="group relative flex h-full flex-1 items-end rounded-t-[4px] outline-none"
              >
                <span
                  className={cn("block w-full rounded-t-[4px] transition-colors", futuro ? "bg-white/[0.04]" : on ? "bg-[#ff9a52]" : "")}
                  style={{
                    // La barra más alta llega al 82% para dejarle sitio a la etiqueta.
                    height: futuro ? "6px" : `${Math.max(v > 0 ? 4 : 2, (v / max) * 82)}%`,
                    background: futuro || on ? undefined : dia === hoyN ? "var(--es-naranja)" : v > 0 ? "rgba(255,122,26,0.45)" : "rgba(255,255,255,0.08)",
                  }}
                />
              </button>
            );
          })}
        </div>
        {marcado !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-[#2a231d] px-2.5 py-1.5 text-[12px] shadow-lg"
            style={{ left: `${Math.min(88, Math.max(12, ((marcado - 0.5) / n) * 100))}%` }}
          >
            <span className="text-[var(--text-3)]">
              {marcado} de {MESES[m - 1]}{" "}
            </span>
            <span className="es-rotulo text-[14px] font-semibold">{dinero(porDia[marcado - 1])}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between text-[11px] text-[var(--text-3)]">
          {[1, 5, 10, 15, 20, 25, n].map((d) => (
            <span key={d} className={cn(d === hoyN && "text-[var(--es-naranja)]")}>
              {d}
            </span>
          ))}
        </div>
      </div>
    </Vidrio>
  );
}

function BarraServicios({ porServicio, total }: { porServicio: Record<Servicio, number>; total: number }) {
  if (total <= 0) return <span className="block h-2 rounded-full bg-white/[0.05]" />;
  return (
    <span className="flex h-2 overflow-hidden rounded-full bg-white/[0.05]">
      {ORDEN.filter((s) => porServicio[s] > 0).map((s) => (
        <span
          key={s}
          title={`${SERVICIO[s].texto}: ${dinero(porServicio[s])}`}
          style={{ width: `${(porServicio[s] / total) * 100}%`, background: SERVICIO[s].color }}
        />
      ))}
    </span>
  );
}

function PorMarca({ marcas, uso, piezasPorMarca }: { marcas: Marca[]; uso: RegistroUso[]; piezasPorMarca: Record<string, number> }) {
  return (
    <Vidrio className="p-4 lg:p-5">
      <Cabecera titulo="Por marca" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-[13px]">
          <thead>
            <tr className="text-left text-[11.5px] text-[var(--text-3)]">
              <th className="pb-2 font-medium">Marca</th>
              <th className="pb-2 pl-4 text-right font-medium">Piezas</th>
              <th className="pb-2 pl-4 text-right font-medium">Gasto</th>
              <th className="pb-2 pl-4 text-right font-medium">Por pieza</th>
              <th className="w-[30%] pb-2 pl-6 font-medium">En qué se fue</th>
              <th className="pb-2 text-right font-medium">Plan</th>
            </tr>
          </thead>
          <tbody>
            {marcas.map((m) => {
              const suyo = uso.filter((u) => u.marcaId === m.id);
              const total = costoTotal(suyo);
              const piezas = piezasPorMarca[m.id] ?? 0;
              return (
                <tr key={m.id} className="border-t border-[var(--border)]">
                  <td className="py-3">
                    <span className="flex items-center gap-2">
                      <MarcaSello marca={m} size={24} />
                      <span className="truncate font-medium">{m.nombre}</span>
                    </span>
                  </td>
                  <td className="es-rotulo py-3 pl-4 text-right text-[16px] font-semibold">{piezas}</td>
                  <td className="es-rotulo py-3 pl-4 text-right text-[16px] font-semibold">{dinero(total)}</td>
                  <td className="es-rotulo py-3 pl-4 text-right text-[16px] font-semibold text-[var(--text-2)]">{dinero(piezas ? total / piezas : 0)}</td>
                  <td className="py-3 pl-6">
                    <BarraServicios porServicio={costoPorServicio(suyo)} total={total} />
                  </td>
                  <td className="py-3 text-right text-[12.5px] text-[var(--text-2)]">
                    {m.plan} · {m.piezasPlan}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {ORDEN.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--text-3)]">
            <span className="h-2 w-2 rounded-full" style={{ background: SERVICIO[s].color }} />
            {SERVICIO[s].texto}
          </span>
        ))}
      </div>
    </Vidrio>
  );
}

const POR_PAGINA = 15;

function Registro({ uso, marcas }: { uso: RegistroUso[]; marcas: Marca[] }) {
  const [filtro, setFiltro] = useState<Servicio | "todos">("todos");
  const [cuantos, setCuantos] = useState(POR_PAGINA);
  const filas = useMemo(
    () => uso.filter((u) => filtro === "todos" || u.servicio === filtro).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [uso, filtro],
  );
  const presentes = ORDEN.filter((s) => uso.some((u) => u.servicio === s));

  return (
    <Vidrio className="p-4 lg:p-5">
      <Cabecera titulo="Registro de uso" detalle={`${filas.length} movimientos`} />
      <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {(["todos", ...presentes] as const).map((s) => {
          const on = filtro === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setFiltro(s);
                setCuantos(POR_PAGINA);
              }}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold transition",
                on ? "bg-[var(--text)] text-[#16120f]" : "bg-white/[0.05] text-[var(--text-2)] hover:text-[var(--text)]",
              )}
            >
              {s !== "todos" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: SERVICIO[s].color }} />}
              {s === "todos" ? "Todo" : SERVICIO[s].texto}
            </button>
          );
        })}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[12.5px]">
          <thead>
            <tr className="text-left text-[11.5px] text-[var(--text-3)]">
              <th className="pb-2 font-medium">Cuándo</th>
              <th className="pb-2 font-medium">Marca</th>
              <th className="pb-2 font-medium">Servicio</th>
              <th className="pb-2 font-medium">Proveedor</th>
              <th className="pb-2 text-right font-medium">Unidades</th>
              <th className="pb-2 text-right font-medium">Costo</th>
            </tr>
          </thead>
          <tbody>
            {filas.slice(0, cuantos).map((u) => {
              const m = marcas.find((x) => x.id === u.marcaId);
              const t = cuando(u);
              return (
                <tr key={u.id} className="border-t border-[var(--border)]">
                  <td className="whitespace-nowrap py-2 text-[var(--text-2)]">
                    {numeroDia(diaDe(t))} {MESES[Number(t.slice(5, 7)) - 1].slice(0, 3)}, {horaCorta(t)}
                  </td>
                  <td className="py-2">
                    {m && (
                      <span className="flex items-center gap-1.5">
                        <MarcaSello marca={m} size={18} />
                        <span className="truncate">{m.nombre}</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: SERVICIO[u.servicio].color }} />
                      {SERVICIO[u.servicio].texto}
                    </span>
                  </td>
                  <td className="py-2 text-[var(--text-2)]">{u.proveedor}</td>
                  <td className="whitespace-nowrap py-2 text-right text-[var(--text-2)]">
                    {unidades(u.unidades, u.unidad)}
                  </td>
                  <td className="es-rotulo whitespace-nowrap py-2 text-right text-[14.5px] font-semibold">
                    {u.costoUsd === 0 ? "Incluido" : dinero(u.costoUsd, u.costoUsd < 0.1 ? 3 : 2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filas.length > cuantos && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setCuantos((c) => c + POR_PAGINA)}
            className="rounded-full bg-white/[0.06] px-4 py-1.5 text-[12.5px] font-semibold text-[var(--text-2)] transition hover:bg-white/[0.1] hover:text-[var(--text)]"
          >
            Ver {Math.min(POR_PAGINA, filas.length - cuantos)} más
          </button>
        </div>
      )}
    </Vidrio>
  );
}

export function CostosEstudio() {
  const e = useEstudio();
  const activa = useMarcaActiva();
  const ahora = localSV();
  const hoy = diaDe(ahora);
  const mes = hoy.slice(0, 7);

  // Lo del mes que ya pasó: un registro de uso no tiene filas del futuro.
  const usoMes = useMemo(
    () => deMarca(e.uso, activa).filter((u) => cuando(u).startsWith(mes) && cuando(u) <= ahora),
    [e.uso, activa, mes, ahora],
  );
  const piezasMes = useMemo(
    () =>
      deMarca(e.piezas, activa).filter((p) => {
        const t = localSV(Date.parse(p.creada));
        return t.startsWith(mes) && t <= ahora;
      }),
    [e.piezas, activa, mes, ahora],
  );
  const marcas = activa === "todas" ? e.marcas : e.marcas.filter((m) => m.id === activa);

  const piezasPorMarca = useMemo(() => {
    const n: Record<string, number> = {};
    for (const p of piezasMes) n[p.marcaId] = (n[p.marcaId] ?? 0) + 1;
    return n;
  }, [piezasMes]);

  // Costo por video: lo que gastaron voz, avatar y edición de las piezas de video.
  const costoVideo = useMemo(() => {
    const videos = new Set(deMarca(e.piezas, activa).filter((p) => p.tipo === "video").map((p) => p.id));
    const delVideo = usoMes.filter(
      (u) => u.piezaId && videos.has(u.piezaId) && (u.servicio === "avatar" || u.servicio === "voz" || u.servicio === "edicion"),
    );
    const cuantos = new Set(delVideo.filter((u) => u.servicio === "avatar").map((u) => u.piezaId)).size;
    return cuantos ? costoTotal(delVideo) / cuantos : null;
  }, [e.piezas, activa, usoMes]);

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <Cifras uso={usoMes} piezasMes={piezasMes.length} costoVideo={costoVideo} />
      <p className="px-1 text-[12.5px] text-[var(--text-3)]">
        Calculado con las tarifas de la muestra. El precio de reventa sale de las facturas reales de cada proveedor.
      </p>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <PorMarca marcas={marcas} uso={usoMes} piezasPorMarca={piezasPorMarca} />
        <PorDia uso={usoMes} mes={mes} hoy={hoy} />
      </div>
      <Registro uso={usoMes} marcas={e.marcas} />
    </div>
  );
}
