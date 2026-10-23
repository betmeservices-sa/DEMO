"use client";

// Los créditos de cada marca: cuánto de su plan del mes ya se usó, en qué se
// fue y cuánto queda. Sale del registro de uso, donde cada llamada a un
// servicio deja su fila con unidades y créditos. Lo que cobra cada proveedor
// queda guardado aparte (interno) y aquí no se muestra. Las fechas van en hora
// de El Salvador.

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { deMarca, useEstudio, useMarcaActiva } from "@/lib/estudio/store";
import { diaDe, horaCorta, localSV, numeroDia } from "@/lib/estudio/fechas";
import { creditosPorServicio, creditosTotal, estimarCreditos } from "@/lib/estudio/generador";
import type { Marca, OrigenImagen, RegistroUso, Servicio, TipoPieza } from "@/lib/estudio/tipos";
import { Cabecera, MarcaSello, Vidrio, creditos } from "./ui";

const SERVICIO: Record<Servicio, { texto: string; color: string }> = {
  avatar: { texto: "Avatar", color: "var(--es-violeta)" },
  voz: { texto: "Voz", color: "var(--es-cian)" },
  edicion: { texto: "Edición", color: "var(--es-ambar)" },
  imagen: { texto: "Imágenes", color: "#f28fb1" },
  texto: { texto: "Texto", color: "#8ab4f8" },
  publicacion: { texto: "Publicación", color: "var(--es-verde)" },
};

const ORDEN: Servicio[] = ["avatar", "voz", "edicion", "imagen", "texto", "publicacion"];

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "3 láminas", "1 pieza", "0.53 min". */
function unidades(n: number, unidad: string): string {
  const cifra = n.toLocaleString("es-SV", { maximumFractionDigits: 2 });
  if (n === 1 || unidad === "min" || unidad.endsWith("s")) return `${cifra} ${unidad}`;
  return `${cifra} ${unidad === "imagen" ? "imágenes" : unidad === "lámina" ? "láminas" : `${unidad}s`}`;
}

/** "YYYY-MM-DDTHH:mm" de El Salvador de un registro. */
function cuando(u: { fecha: string }): string {
  return localSV(Date.parse(u.fecha));
}

function diasDelMes(mes: string): number {
  const [y, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Celeste mientras hay margen, ámbar desde el 80% y rojo suave al pasar el plan. */
function colorDeUso(pct: number): string {
  if (pct >= 100) return "var(--es-rojo)";
  if (pct >= 80) return "var(--es-ambar)";
  return "var(--es-acento)";
}

/** Los créditos que se fueron en videos: avatar, voz y la edición de cada video. */
function creditosDeVideo(uso: RegistroUso[]): { total: number; videos: number } {
  const delVideo = uso.filter(
    (u) => u.servicio === "avatar" || u.servicio === "voz" || (u.servicio === "edicion" && u.unidad === "video"),
  );
  return { total: creditosTotal(delVideo), videos: uso.filter((u) => u.servicio === "avatar").length };
}

function Cifras({ uso, plan }: { uso: RegistroUso[]; plan: number }) {
  const usados = creditosTotal(uso);
  const video = creditosDeVideo(uso);
  // Cada pieza escrita deja una fila de texto; lo que no es video se reparte entre ellas.
  const escritas = uso.filter((u) => u.servicio === "texto").length;
  const porPieza = escritas ? (usados - video.total) / escritas : 0;
  const pct = plan ? Math.round((usados / plan) * 100) : 0;
  const items = [
    { cifra: creditos(usados), sufijo: `/${creditos(plan)}`, texto: `usados este mes, ${pct}% del plan`, color: colorDeUso(pct) },
    { cifra: creditos(Math.max(0, plan - usados)), texto: "créditos que quedan" },
    { cifra: porPieza.toLocaleString("es-SV", { maximumFractionDigits: 1 }), texto: "créditos por pieza, sin contar video" },
    { cifra: video.videos ? creditos(video.total / video.videos) : "0", texto: "créditos por video con avatar" },
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
          <p className="es-rotulo text-[34px] font-semibold leading-none tracking-[-0.01em] sm:text-[40px]">
            <span style={it.color ? { color: it.color } : undefined}>{it.cifra}</span>
            {it.sufijo && <span className="text-[22px] text-[var(--text-3)] sm:text-[26px]">{it.sufijo}</span>}
          </p>
          <p className="mt-1.5 text-[12.5px] text-[var(--text-3)]">{it.texto}</p>
        </div>
      ))}
    </Vidrio>
  );
}

/** Lo que cuesta cada formato, armado con la misma tabla que descuenta los créditos. */
function Tarifas() {
  const filas: { tipo: TipoPieza; texto: string; nota?: string; origen?: OrigenImagen }[] = [
    { tipo: "texto", texto: "Post de texto" },
    { tipo: "imagen", texto: "Post con foto de obra", origen: "obra" },
    { tipo: "imagen", texto: "Post con imagen de IA", origen: "ia" },
    { tipo: "carrusel", texto: "Carrusel de 3 láminas", nota: "con fotos de obra", origen: "obra" },
    { tipo: "carrusel", texto: "Carrusel de 3 láminas", nota: "con las 3 imágenes de IA", origen: "ia" },
    { tipo: "anuncio", texto: "Anuncio", nota: "titular, texto, botón e imagen de IA", origen: "ia" },
    { tipo: "video", texto: "Video de 30 s con avatar", nota: "guion, voz, avatar y subtítulos" },
  ];
  const valor = (f: (typeof filas)[number]) => {
    const e = estimarCreditos(f.tipo, 1, f.origen);
    return e.ahora + e.alAprobar;
  };
  const max = Math.max(...filas.map(valor));
  return (
    <Vidrio className="p-4 lg:p-5">
      <Cabecera titulo="Lo que cuesta cada formato" detalle="Al generarlo; regenerar el texto suma 1" />
      <ul className="space-y-3">
        {filas.map((f) => {
          const v = valor(f);
          return (
            <li key={`${f.tipo}-${f.origen ?? ""}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-[13px]">
                  <span className="font-medium">{f.texto}</span>
                  {f.nota && <span className="block truncate text-[11.5px] text-[var(--text-3)]">{f.nota}</span>}
                </span>
                <span className="es-rotulo shrink-0 text-[20px] font-semibold leading-none">{v}</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                <div className="h-full rounded-full bg-[var(--es-acento)]" style={{ width: `${(v / max) * 100}%`, opacity: 0.35 + (v / max) * 0.65 }} />
              </div>
            </li>
          );
        })}
      </ul>
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
      xs[d - 1] += u.creditos;
    }
    return xs;
  }, [uso, n]);
  const max = Math.max(...porDia, 1);
  const hoyN = hoy.startsWith(mes) ? numeroDia(hoy) : n;
  const [, m] = mes.split("-").map(Number);

  return (
    <Vidrio className="p-4 lg:p-5">
      <Cabecera titulo="Créditos por día" detalle={`${MESES[m - 1]}, hora de El Salvador`} />
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
                aria-label={`Día ${dia}: ${creditos(v)} créditos`}
                onMouseEnter={() => setMarcado(dia)}
                onFocus={() => setMarcado(dia)}
                onBlur={() => setMarcado(null)}
                className="group relative flex h-full flex-1 items-end rounded-t-[4px] outline-none"
              >
                <span
                  className={cn("block w-full rounded-t-[4px] transition-colors", futuro ? "bg-white/[0.04]" : on ? "bg-[#8fd6e8]" : "")}
                  style={{
                    // La barra más alta llega al 82% para dejarle sitio a la etiqueta.
                    height: futuro ? "6px" : `${Math.max(v > 0 ? 4 : 2, (v / max) * 82)}%`,
                    background: futuro || on ? undefined : dia === hoyN ? "var(--es-acento)" : v > 0 ? "rgba(91,188,214,0.45)" : "rgba(255,255,255,0.08)",
                  }}
                />
              </button>
            );
          })}
        </div>
        {marcado !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-[#22334f] px-2.5 py-1.5 text-[12px] shadow-lg"
            style={{ left: `${Math.min(88, Math.max(12, ((marcado - 0.5) / n) * 100))}%` }}
          >
            <span className="text-[var(--text-3)]">
              {marcado} de {MESES[m - 1]}{" "}
            </span>
            <span className="es-rotulo text-[14px] font-semibold">{creditos(porDia[marcado - 1])}</span>
            <span className="text-[var(--text-3)]"> créditos</span>
          </div>
        )}
        {/* Cada número va bajo el centro de su barra. */}
        <div className="relative mt-2 h-4 text-[11px] text-[var(--text-3)]">
          {[...new Set([1, 5, 10, 15, 20, 25, n].filter((d) => Math.abs(d - hoyN) > 2).concat(hoyN))].map((d) => (
            <span
              key={d}
              className={cn("absolute -translate-x-1/2", d === hoyN && "font-semibold text-[var(--es-acento)]")}
              style={{ left: `${((d - 0.5) / n) * 100}%` }}
            >
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
          title={`${SERVICIO[s].texto}: ${creditos(porServicio[s])} créditos`}
          style={{ width: `${(porServicio[s] / total) * 100}%`, background: SERVICIO[s].color }}
        />
      ))}
    </span>
  );
}

/** La barra de uso del plan, con el porcentaje. La comparte Marcas. */
export function BarraPlan({ usados, plan, className }: { usados: number; plan: number; className?: string }) {
  const pct = plan ? Math.round((usados / plan) * 100) : 0;
  const color = colorDeUso(pct);
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </span>
      <span className="es-rotulo w-[42px] shrink-0 text-right text-[15px] font-semibold" style={{ color }}>
        {pct}%
      </span>
    </span>
  );
}

function PorMarca({ marcas, uso }: { marcas: Marca[]; uso: RegistroUso[] }) {
  return (
    <Vidrio className="p-4 lg:p-5">
      <Cabecera titulo="Por marca" />
      {/* En celular, una tarjeta por marca: la tabla no cabe sin esconder las cifras. */}
      <ul className="space-y-3 md:hidden">
        {marcas.map((m) => {
          const suyo = uso.filter((u) => u.marcaId === m.id);
          const usados = creditosTotal(suyo);
          return (
            <li key={m.id} className="es-hueco rounded-[16px] p-3">
              <div className="flex items-center gap-2">
                <MarcaSello marca={m} size={24} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{m.nombre}</span>
                  <span className="block text-[11.5px] text-[var(--text-3)]">
                    {m.plan}, quedan {creditos(Math.max(0, m.creditosPlan - usados))}
                  </span>
                </span>
                <span className="es-rotulo text-[17px] font-semibold">
                  {creditos(usados)}
                  <span className="text-[var(--text-3)]">/{creditos(m.creditosPlan)}</span>
                </span>
              </div>
              <BarraPlan usados={usados} plan={m.creditosPlan} className="mt-2.5" />
              <div className="mt-2">
                <BarraServicios porServicio={creditosPorServicio(suyo)} total={usados} />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="text-left text-[11.5px] text-[var(--text-3)]">
              <th className="pb-2 font-medium">Marca</th>
              <th className="pb-2 pl-4 font-medium">Plan</th>
              <th className="pb-2 pl-4 text-right font-medium">Usados</th>
              <th className="pb-2 pl-4 text-right font-medium">Quedan</th>
              <th className="w-[22%] pb-2 pl-6 font-medium">Uso del plan</th>
              <th className="w-[22%] pb-2 pl-6 font-medium">En qué se fue</th>
            </tr>
          </thead>
          <tbody>
            {marcas.map((m) => {
              const suyo = uso.filter((u) => u.marcaId === m.id);
              const usados = creditosTotal(suyo);
              return (
                <tr key={m.id} className="border-t border-[var(--border)]">
                  <td className="py-3">
                    <span className="flex items-center gap-2">
                      <MarcaSello marca={m} size={24} />
                      <span className="truncate font-medium">{m.nombre}</span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-3 pl-4 text-[12.5px] text-[var(--text-2)]">
                    {m.plan} <span className="text-[var(--text-3)]">· {creditos(m.creditosPlan)}</span>
                  </td>
                  <td className="es-rotulo py-3 pl-4 text-right text-[16px] font-semibold">{creditos(usados)}</td>
                  <td className="es-rotulo py-3 pl-4 text-right text-[16px] font-semibold text-[var(--text-2)]">
                    {creditos(Math.max(0, m.creditosPlan - usados))}
                  </td>
                  <td className="py-3 pl-6">
                    <BarraPlan usados={usados} plan={m.creditosPlan} />
                  </td>
                  <td className="py-3 pl-6">
                    <BarraServicios porServicio={creditosPorServicio(suyo)} total={usados} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {ORDEN.filter((s) => s !== "publicacion").map((s) => (
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
                on ? "bg-[var(--text)] text-[#13203a]" : "bg-white/[0.05] text-[var(--text-2)] hover:text-[var(--text)]",
              )}
            >
              {s !== "todos" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: SERVICIO[s].color }} />}
              {s === "todos" ? "Todo" : SERVICIO[s].texto}
            </button>
          );
        })}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-[12.5px]">
          <thead>
            <tr className="text-left text-[11.5px] text-[var(--text-3)]">
              <th className="pb-2 font-medium">Cuándo</th>
              <th className="pb-2 font-medium">Marca</th>
              <th className="pb-2 font-medium">Servicio</th>
              <th className="pb-2 text-right font-medium">Unidades</th>
              <th className="pb-2 text-right font-medium">Créditos</th>
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
                  <td className="whitespace-nowrap py-2 text-right text-[var(--text-2)]">{unidades(u.unidades, u.unidad)}</td>
                  <td className="es-rotulo whitespace-nowrap py-2 text-right text-[14.5px] font-semibold">
                    {u.creditos === 0 ? "Incluido" : creditos(u.creditos)}
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

/** Lo usado en el mes por marca, en créditos. Lo comparten Créditos y Marcas. */
export function usoDelMes(uso: RegistroUso[], ahora: string = localSV()): RegistroUso[] {
  const mes = ahora.slice(0, 7);
  // Un registro de uso no tiene filas del futuro.
  return uso.filter((u) => {
    const t = cuando(u);
    return t.startsWith(mes) && t <= ahora;
  });
}

export function CreditosEstudio() {
  const e = useEstudio();
  const activa = useMarcaActiva();
  const ahora = localSV();
  const hoy = diaDe(ahora);
  const mes = hoy.slice(0, 7);

  const usoMes = useMemo(() => usoDelMes(deMarca(e.uso, activa), ahora), [e.uso, activa, ahora]);
  const marcas = activa === "todas" ? e.marcas : e.marcas.filter((m) => m.id === activa);
  const plan = marcas.reduce((s, m) => s + m.creditosPlan, 0);

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <Cifras uso={usoMes} plan={plan} />
      <PorMarca marcas={marcas} uso={usoMes} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <PorDia uso={usoMes} mes={mes} hoy={hoy} />
        <Tarifas />
      </div>
      <Registro uso={usoMes} marcas={e.marcas} />
    </div>
  );
}
