"use client";

// La línea de tiempo del plan de conversaciones de un cliente: cuándo arrancó
// el ciclo, cuándo se abrió cada paquete, cuándo se llenaron sus normales y su
// Day Pass (los paquetes se llenan en orden: lo que le queda a uno se gasta
// antes que lo del siguiente), y cómo va o cómo cerró. Lo pidió el usuario el
// 2026-10-01.
//
// Sale de /api/agencia/plan (lib/plan-conversaciones.ts: usoDelPlan), así que
// cuenta igual que el bloque del plan del tablero. Arranca mostrando el ciclo
// que ya tiene paquetes consumidos: el en curso si ya se le acabó alguno; si
// no, el anterior.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { TZ, miles } from "@/lib/formato-agencia";
import type { Paquete, PlanConversaciones, TipoDeConversacion, UsoDelPlan } from "@/lib/plan-conversaciones";

type Ciclo = "actual" | "anterior";

interface Leido {
  plan: PlanConversaciones;
  ciclo: { desde: string; hasta: string; etiqueta: string };
  uso: UsoDelPlan;
}

/** Un color por paquete: el plan, el 2, el 3... */
const COLOR_PAQUETE = ["#8b5cf6", "#22b8e6", "#f5a524", "#34d399", "#fb7185", "#a3e635"];
const COLOR_DAY_PASS = "#f472b6";
const color = (paquete: number) => COLOR_PAQUETE[(paquete - 1) % COLOR_PAQUETE.length]!;

const FECHA = new Intl.DateTimeFormat("es-SV", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});
/** "Dom 20 sept · 6:44 a. m." */
function fecha(iso: string): string {
  const partes = FECHA.formatToParts(new Date(iso));
  const de = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const dia = de("weekday").replace(/\.$/, "");
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${de("day")} ${de("month").replace(/\.$/, "")} · ${de("hour")}:${de("minute")} ${de("dayPeriod")}`;
}

const delPaquete = (n: number) => (n === 1 ? "del plan" : `del paquete ${n}`);

interface Barra {
  etiqueta: string;
  usadas: number;
  de: number;
  color: string;
  resto?: string;
}

interface Hito {
  ts: string;
  fecha: string;
  titulo: string;
  nota?: string;
  /** Color del punto. */
  punto: string;
  barras?: Barra[];
  grande?: boolean;
}

/** El paquete anterior a `p` que todavía tenía lugar de `t` cuando `p` se abrió. */
function anteriorConLugar(paquetes: readonly Paquete[], p: Paquete, t: TipoDeConversacion): Paquete | undefined {
  if (!p.abre) return undefined;
  const abre = Date.parse(p.abre);
  return paquetes.find((q) => q.numero < p.numero && (q[t].llenoEl === null || Date.parse(q[t].llenoEl) > abre));
}

function hitosDe({ plan, ciclo, uso }: Leido, cerrado: boolean): Hito[] {
  const hitos: Hito[] = [
    {
      ts: ciclo.desde,
      fecha: fecha(ciclo.desde),
      titulo: "Arranca el plan",
      nota: `${miles(plan.incluidas.generales)} conversaciones normales y ${miles(plan.incluidas.dayPass)} de Day Pass`,
      punto: color(1),
    },
  ];

  for (const p of uso.paquetes) {
    if (p.abre && p.abrioPor) {
      const otro: TipoDeConversacion = p.abrioPor === "generales" ? "dayPass" : "generales";
      const previo = anteriorConLugar(uso.paquetes, p, otro);
      hitos.push({
        ts: p.abre,
        fecha: fecha(p.abre),
        titulo: `Arranca el paquete ${p.numero}`,
        nota:
          `${miles(p.generales.incluidas)} normales y ${miles(p.dayPass.incluidas)} de Day Pass` +
          (previo ? `. ${otro === "dayPass" ? "El Day Pass sigue" : "Las normales siguen"} saliendo ${delPaquete(previo.numero)} hasta llenarlo` : ""),
        punto: color(p.numero),
      });
    }

    const g = p.generales;
    if (g.llenoEl) {
      const quedabaDp = p.dayPass.incluidas - (g.delOtroAlLlenarse ?? 0);
      hitos.push({
        ts: g.llenoEl,
        fecha: fecha(g.llenoEl),
        titulo: `Se acaban las ${miles(g.incluidas)} normales ${delPaquete(p.numero)}`,
        punto: color(p.numero),
        grande: true,
        barras: [
          { etiqueta: `Normales ${delPaquete(p.numero)}`, usadas: g.usadas, de: g.incluidas, color: color(p.numero) },
          {
            etiqueta: `Day Pass ${delPaquete(p.numero)}`,
            usadas: g.delOtroAlLlenarse ?? 0,
            de: p.dayPass.incluidas,
            color: COLOR_DAY_PASS,
            resto: quedabaDp > 0 ? `Le quedaban ${miles(quedabaDp)}: se siguen gastando antes que los del paquete ${p.numero + 1}` : undefined,
          },
        ],
      });
    }

    const d = p.dayPass;
    if (d.llenoEl) {
      const lleno = Date.parse(d.llenoEl);
      const siguiente = uso.paquetes.find((q) => q.numero === p.numero + 1 && q.abre && Date.parse(q.abre) <= lleno);
      hitos.push({
        ts: d.llenoEl,
        fecha: fecha(d.llenoEl),
        titulo: `Se llena el Day Pass ${delPaquete(p.numero)} (${miles(d.incluidas)})`,
        nota: siguiente ? `Desde aquí el Day Pass sale del paquete ${siguiente.numero}` : undefined,
        punto: COLOR_DAY_PASS,
      });
    }
  }

  hitos.sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));

  // Cómo cerró o cómo va: de qué paquete salen ahora las normales y el Day
  // Pass, y lo que espera en los paquetes que siguen.
  const barras: Barra[] = [];
  for (const t of ["generales", "dayPass"] as const) {
    for (const p of uso.paquetes.filter((q) => q.numero >= uso.enUso[t])) {
      barras.push({
        etiqueta: `${t === "generales" ? "Normales" : "Day Pass"} ${delPaquete(p.numero)}`,
        usadas: p[t].usadas,
        de: p[t].incluidas,
        color: t === "generales" ? color(p.numero) : COLOR_DAY_PASS,
      });
    }
  }
  const fin = cerrado ? new Date(Date.parse(ciclo.hasta) - 1).toISOString() : new Date().toISOString();
  hitos.push({
    ts: fin,
    fecha: cerrado ? `${ciclo.etiqueta} · cierre` : `Ahora · ${fecha(fin)}`,
    titulo: cerrado ? "Así cerró el ciclo" : "Así va",
    punto: color(uso.paquetes.length),
    grande: true,
    barras,
  });
  return hitos;
}

/** El paquete más nuevo abierto en ese instante: le da el color al tramo que sigue. */
function paqueteEn(uso: UsoDelPlan, ts: string): number {
  const t = Date.parse(ts);
  return uso.paquetes.filter((p) => !p.abre || Date.parse(p.abre) <= t).length;
}

export function LineaDelPlan({ cliente }: { cliente: string }) {
  const [datos, setDatos] = useState<Partial<Record<Ciclo, Leido | null>>>({});
  const [ciclo, setCiclo] = useState<Ciclo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    const leer = (c: Ciclo) =>
      fetch(`/api/agencia/plan?cliente=${encodeURIComponent(cliente)}&ciclo=${c}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => (d.ok && d.plan && d.uso ? ({ plan: d.plan, ciclo: d.ciclo, uso: d.uso } as Leido) : null));
    Promise.all([leer("actual"), leer("anterior")])
      .then(([actual, anterior]) => {
        if (!vivo) return;
        setDatos({ actual, anterior });
        setCiclo(actual && actual.uso.consumidos > 0 ? "actual" : anterior ? "anterior" : "actual");
      })
      .catch(() => {
        if (vivo) setError("No se pudo leer el plan.");
      });
    return () => {
      vivo = false;
    };
  }, [cliente]);

  const vigente = ciclo ? datos[ciclo] : null;
  const hitos = vigente && ciclo ? hitosDe(vigente, ciclo === "anterior") : [];

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text)]">Paquetes del plan</h2>
          <p className="text-[12px] text-[var(--text-3)]">
            {vigente ? `${vigente.ciclo.etiqueta} · ` : ""}cada paquete se llena en orden · hora de El Salvador
          </p>
        </div>
        {datos.anterior && (
          <div className="flex gap-1 rounded-lg border border-line bg-surface p-0.5">
            {(["actual", "anterior"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCiclo(c)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[12px] font-semibold transition",
                  ciclo === c ? "bg-brand text-white shadow-sm" : "text-[var(--text-2)] hover:bg-card",
                )}
              >
                {c === "actual" ? "Ciclo en curso" : "Ciclo anterior"}
              </button>
            ))}
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-3 text-[12.5px] text-[var(--brand-red)]">{error}</p>
      ) : !vigente ? (
        <p className="mt-4 flex items-center gap-2 text-[13px] text-[var(--text-3)]">
          <Loader2 size={15} className="animate-spin text-brand" /> Armando la línea de tiempo
        </p>
      ) : (
        <>
          <ol className="relative mt-5 pl-9">
            {hitos.map((h, i) => (
              <li key={`${h.ts}-${i}`} className="relative pb-5 last:pb-0">
                {i < hitos.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute -left-[22px] top-3 w-[3px] rounded-full"
                    style={{ background: color(paqueteEn(vigente.uso, h.ts)), height: "100%" }}
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    "absolute z-[1] rounded-full",
                    h.grande ? "-left-[27.5px] top-0.5 h-[14px] w-[14px]" : "-left-[25.5px] top-1 h-[10px] w-[10px]",
                  )}
                  style={{ background: h.punto, boxShadow: `0 0 0 3px var(--card), 0 0 0 5.5px ${h.punto}` }}
                />
                <p className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: h.punto }}>
                  {h.fecha}
                </p>
                <p className="mt-0.5 text-[14.5px] font-extrabold tracking-tight text-[var(--text)]">{h.titulo}</p>
                {h.nota && <p className="mt-0.5 text-[12.5px] text-[var(--text-2)]">{h.nota}</p>}
                {h.barras && h.barras.length > 0 && (
                  <div className="mt-2 max-w-xl space-y-2.5 rounded-xl border border-line bg-surface p-3">
                    {h.barras.map((x) => (
                      <div key={x.etiqueta}>
                        <div className="flex items-baseline justify-between gap-2 text-[12px] text-[var(--text-2)]">
                          <span>{x.etiqueta}</span>
                          <span className="tabular-nums">
                            <b className="text-[14px] font-extrabold text-[var(--text)]">{miles(x.usadas)}</b> de {miles(x.de)}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--card)]">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${x.de > 0 ? Math.min(100, (x.usadas / x.de) * 100) : 0}%`, background: x.color }}
                          />
                        </div>
                        {x.resto && <p className="mt-1 text-[11.5px] text-[var(--text-3)]">{x.resto}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-4">
            <Total valor={miles(vigente.uso.total)} texto="conversaciones" />
            <Total valor={miles(vigente.uso.generales)} texto="normales" />
            <Total valor={miles(vigente.uso.dayPass)} texto="de Day Pass" color={COLOR_DAY_PASS} />
            <Total
              valor={miles(vigente.uso.consumidos)}
              texto={vigente.uso.consumidos === 1 ? "paquete consumido" : "paquetes consumidos"}
              color={color(vigente.uso.paquetes.length)}
            />
          </div>
        </>
      )}
    </section>
  );
}

function Total({ valor, texto, color }: { valor: string; texto: string; color?: string }) {
  return (
    <div>
      <p className="text-[24px] font-extrabold leading-none tracking-tight tabular-nums" style={color ? { color } : undefined}>
        {valor}
      </p>
      <p className="mt-1 text-[12px] text-[var(--text-2)]">{texto}</p>
    </div>
  );
}
