"use client";

// La línea de tiempo del plan de conversaciones de un cliente: cuándo arrancó
// el ciclo, cuándo se acabó cada paquete (y cómo quedó), cuándo arrancó el
// siguiente y con qué, cuándo se gastó el Day Pass del plan, y cómo va o cómo
// cerró. Lo pidió el usuario el 2026-10-01 ("cuándo se gastaron las primeras
// 1000 normales y cuándo las otras 1000 con los 500 de Day Pass").
//
// Sale de /api/agencia/plan (lib/plan-conversaciones.ts: usoDelPlan), así que
// cuenta igual que el bloque del plan del tablero. Arranca mostrando el ciclo
// que ya tiene paquetes consumidos: el en curso si ya se le acabó alguno; si
// no, el anterior.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { TZ, miles } from "@/lib/formato-agencia";
import type { Bolsa, PlanConversaciones, UsoDelPlan } from "@/lib/plan-conversaciones";

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

interface Hito {
  ts: string;
  fecha: string;
  titulo: string;
  nota?: string;
  /** Color del punto. */
  punto: string;
  /** Color del tramo de línea que baja de este hito: el paquete que corre después. */
  tramo: string | null;
  barras?: { etiqueta: string; b: Bolsa; color: string; resto?: string }[];
  grande?: boolean;
}

function hitosDe({ plan, ciclo, uso }: Leido, cerrado: boolean): Hito[] {
  const hitos: Hito[] = [];
  hitos.push({
    ts: ciclo.desde,
    fecha: fecha(ciclo.desde),
    titulo: "Arranca el plan",
    nota: `${miles(plan.incluidas.generales)} conversaciones normales y ${miles(plan.incluidas.dayPass)} de Day Pass`,
    punto: color(1),
    tramo: color(1),
  });

  for (const p of uso.consumidos) {
    const sig = p.numero + 1;
    const otro = p.porque === "generales" ? "dayPass" : "generales";
    const sobra = p.alLlenarse[otro].disponibles - p.alLlenarse[otro].usadas;
    const queSeAcabo =
      p.porque === "generales"
        ? p.numero === 1
          ? `Se acaban las primeras ${miles(p.alLlenarse.generales.disponibles)} normales`
          : `Se acaban las ${miles(p.alLlenarse.generales.disponibles)} normales del paquete ${p.numero}`
        : `Se acaba el Day Pass del paquete ${p.numero}`;
    hitos.push({
      ts: p.llenoEl,
      fecha: fecha(p.llenoEl),
      titulo: queSeAcabo,
      punto: color(p.numero),
      tramo: color(p.numero),
      grande: true,
      barras: (
        [
          { tipo: "generales", etiqueta: p.numero === 1 ? "Normales" : `Normales del paquete ${p.numero}`, color: color(p.numero) },
          { tipo: "dayPass", etiqueta: p.numero === 1 ? "Day Pass" : `Day Pass del paquete ${p.numero}`, color: COLOR_DAY_PASS },
        ] as const
      ).map(({ tipo, etiqueta, color: c }) => ({
        etiqueta,
        b: p.alLlenarse[tipo],
        color: c,
        resto: tipo === otro && sobra > 0 ? `Sobraron ${miles(sobra)}, que pasan al paquete ${sig}` : undefined,
      })),
    });
    const s = p.siguiente;
    const conArrastre = (b: Bolsa) => (b.arrastre > 0 ? ` (${miles(b.arrastre)} que sobraron + ${miles(b.disponibles - b.arrastre)})` : "");
    hitos.push({
      ts: p.abreSiguiente,
      fecha: fecha(p.abreSiguiente),
      titulo: `Arranca el paquete ${sig}`,
      nota: `${miles(s.generales.disponibles)} normales${conArrastre(s.generales)} y ${miles(s.dayPass.disponibles)} de Day Pass${conArrastre(s.dayPass)}`,
      punto: color(sig),
      tramo: color(sig),
    });
  }

  // Cuándo se gastó el Day Pass que trae el plan. Si fue eso lo que abrió un
  // paquete, ya está dicho arriba.
  const dp = uso.dayPassDelPlanLlenoEl;
  if (dp && !uso.consumidos.some((p) => p.porque === "dayPass" && p.llenoEl === dp)) {
    const corriendo = 1 + uso.consumidos.filter((p) => Date.parse(p.abreSiguiente) <= Date.parse(dp)).length;
    hitos.push({
      ts: dp,
      fecha: fecha(dp),
      titulo: `Se acaban los ${miles(plan.incluidas.dayPass)} de Day Pass del plan`,
      nota: corriendo > 1 ? `Desde aquí el Day Pass sale del paquete ${corriendo}` : undefined,
      punto: COLOR_DAY_PASS,
      tramo: color(corriendo),
    });
  }

  hitos.sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));

  const fin = cerrado ? new Date(Date.parse(ciclo.hasta) - 1).toISOString() : new Date().toISOString();
  hitos.push({
    ts: fin,
    fecha: cerrado ? `${ciclo.etiqueta} · cierre` : `Ahora · ${fecha(fin)}`,
    titulo: cerrado ? `El ciclo cierra en el paquete ${uso.paquete}` : `Va en el paquete ${uso.paquete}`,
    punto: color(uso.paquete),
    tramo: null,
    grande: true,
    barras: [
      { etiqueta: uso.paquete === 1 ? "Normales" : `Normales del paquete ${uso.paquete}`, b: uso.actual.generales, color: color(uso.paquete) },
      { etiqueta: uso.paquete === 1 ? "Day Pass" : `Day Pass del paquete ${uso.paquete}`, b: uso.actual.dayPass, color: COLOR_DAY_PASS },
    ],
  });
  return hitos;
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
        setCiclo(actual && actual.uso.consumidos.length > 0 ? "actual" : anterior ? "anterior" : "actual");
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
            {vigente ? `${vigente.ciclo.etiqueta} · ` : ""}cuándo se acabó cada paquete · hora de El Salvador
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
                {h.tramo && (
                  <span
                    aria-hidden
                    className="absolute -left-[22px] top-3 w-[3px] rounded-full"
                    style={{ background: h.tramo, height: "100%" }}
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
                {h.barras && (
                  <div className="mt-2 max-w-xl space-y-2.5 rounded-xl border border-line bg-surface p-3">
                    {h.barras.map((x) => (
                      <div key={x.etiqueta}>
                        <div className="flex items-baseline justify-between gap-2 text-[12px] text-[var(--text-2)]">
                          <span>{x.etiqueta}</span>
                          <span className="tabular-nums">
                            <b className="text-[14px] font-extrabold text-[var(--text)]">{miles(x.b.usadas)}</b> de {miles(x.b.disponibles)}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--card)]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${x.b.disponibles > 0 ? Math.min(100, (x.b.usadas / x.b.disponibles) * 100) : 0}%`,
                              background: x.color,
                            }}
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
              valor={miles(vigente.uso.consumidos.length)}
              texto={vigente.uso.consumidos.length === 1 ? "paquete consumido" : "paquetes consumidos"}
              color={color(Math.max(1, vigente.uso.paquete))}
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
