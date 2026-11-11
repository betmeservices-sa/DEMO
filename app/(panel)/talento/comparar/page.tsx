"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar, inicialesDe } from "@/components/ui/Avatar";
import { Desplegable } from "@/components/ui/Desplegable";
import { nombreEtapa } from "@/lib/talento/catalogo";
import { comparar, siguienteEtapa, vacanteSugerida, type Celda, type FilaComparacion } from "@/lib/talento/comparar";
import { alternarComparar, useComparar } from "@/lib/talento/seleccion";
import { despachar, useTalento } from "@/lib/talento/store";
import { Boton, Capa, Encabezado, ScoreBadge, useSoloBetme } from "@/components/talento/ui";
import { FichaCandidato } from "@/components/talento/FichaCandidato";

export default function CompararPage() {
  const es = useSoloBetme();
  const estado = useTalento();
  const sel = useComparar();
  const [elegida, setElegida] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("vacante"),
  );
  const [fichaId, setFichaId] = useState<string | null>(null);

  const vacante = useMemo(() => {
    if (!estado) return null;
    const id = elegida ?? sel.vacanteId;
    return estado.vacantes.find((v) => v.id === id) ?? vacanteSugerida(estado, sel.ids);
  }, [estado, elegida, sel]);

  const cmp = useMemo(() => (estado && vacante ? comparar(estado, sel.ids, vacante) : null), [estado, vacante, sel.ids]);

  if (!es) return <div className="flex-1 bg-surface" />;
  if (!estado) return <div className="flex-1 animate-pulse bg-surface" />;

  const ficha = fichaId ? estado.candidatos.find((c) => c.id === fichaId) : null;
  const opciones = estado.vacantes
    .filter((v) => v.origen !== "formulario")
    .sort((a, b) => Number(a.estado !== "abierta") - Number(b.estado !== "abierta"))
    .map((v) => ({ valor: v.id, etiqueta: v.titulo, detalle: v.estado === "abierta" ? v.cliente : `${v.cliente} (cerrada)` }));

  return (
    <div className="flex h-full flex-col">
      <Encabezado titulo="Comparar candidatos" detalle={vacante ? `${vacante.titulo} · ${vacante.cliente}` : undefined}>
        {vacante && (
          <Desplegable valor={vacante.id} opciones={opciones} onChange={setElegida} etiquetaAria="Vacante para comparar" className="w-64" />
        )}
      </Encabezado>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        {(!cmp || cmp.candidatos.length === 0) && (
          <div className="mx-auto max-w-md py-12 text-center text-[13px] text-[var(--text-3)]">
            <p>Marque "Comparar" en hasta tres candidatos desde Perfiles, Vacantes o el Pipeline.</p>
            <Link href="/talento/perfiles" className="mt-3 inline-block font-semibold text-[var(--brand-accent)] hover:underline">
              Ir a Perfiles
            </Link>
          </div>
        )}

        {cmp && cmp.candidatos.length > 0 && vacante && (
          <div className="overflow-x-auto rounded-2xl border border-line bg-card">
            <table className="w-full min-w-[640px] border-collapse text-[12.5px]" data-tabla-comparar>
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-36 bg-card" />
                  {cmp.candidatos.map((c, i) => {
                    const p = cmp.postulaciones[i];
                    const sig = p ? siguienteEtapa(p.etapa) : null;
                    return (
                      <th key={c.id} data-columna={c.id} className="border-l border-line p-4 text-left align-top font-normal">
                        <div className="flex items-start gap-2.5">
                          <Avatar iniciales={inicialesDe(c.nombre)} size={36} />
                          <div className="min-w-0 flex-1">
                            <button type="button" onClick={() => setFichaId(c.id)} className="text-left text-[14px] font-bold text-[var(--text)] hover:underline">
                              {c.nombre}
                            </button>
                            <p className="truncate text-[12px] text-[var(--text-3)]">{c.titular}</p>
                          </div>
                          <button
                            type="button"
                            aria-label={`Quitar a ${c.nombre}`}
                            onClick={() => alternarComparar(c.id)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-surface"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {!p && vacante.estado === "abierta" && (
                            <Boton
                              primario
                              onClick={() => despachar({ type: "AL_PIPELINE", vacanteId: vacante.id, candidatoIds: [c.id], ts: new Date().toISOString() })}
                            >
                              <Plus size={13} /> Al pipeline
                            </Boton>
                          )}
                          {p && sig && vacante.estado === "abierta" && (
                            <Boton
                              primario
                              onClick={() => despachar({ type: "MOVER", postulacionId: p.id, etapa: sig, ts: new Date().toISOString() })}
                            >
                              <ArrowRight size={13} /> A {nombreEtapa(sig).toLowerCase()}
                            </Boton>
                          )}
                          <Boton onClick={() => setFichaId(c.id)}>Ficha</Boton>
                        </div>
                      </th>
                    );
                  })}
                  {cmp.candidatos.length < 3 && (
                    <th className="border-l border-line p-4 text-left align-top font-normal">
                      <Link href="/talento/perfiles" className="text-[12.5px] font-semibold text-[var(--brand-accent)] hover:underline">
                        Agregar otro
                      </Link>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {cmp.filas.map((f) => (
                  <FilaConGrupo key={f.id} f={f} columnas={cmp.candidatos.length + (cmp.candidatos.length < 3 ? 1 : 0)} vacio={cmp.candidatos.length < 3} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Capa abierta={Boolean(ficha)} onCerrar={() => setFichaId(null)} titulo="Perfil del candidato">
        {ficha && <FichaCandidato candidato={ficha} estado={estado} />}
      </Capa>
    </div>
  );
}

// Dos bloques: los puntos del match por criterio y el perfil en crudo.
const GRUPOS: Record<string, string> = { "c-skills": "Puntos del match", requeridas: "Perfil" };

function FilaConGrupo({ f, columnas, vacio }: { f: FilaComparacion; columnas: number; vacio: boolean }) {
  return (
    <>
      {GRUPOS[f.id] && (
        <tr className="border-t border-line bg-surface">
          <th colSpan={columnas + 1} className="sticky left-0 px-4 py-1.5 text-left text-[11px] font-extrabold uppercase tracking-wide text-[var(--text-3)]">
            {GRUPOS[f.id]}
          </th>
        </tr>
      )}
      <Fila f={f} vacio={vacio} />
    </>
  );
}

// El desglose del match va con barra; el resto como texto.
function Fila({ f, vacio }: { f: FilaComparacion; vacio: boolean }) {
  const esCriterio = f.id.startsWith("c-");
  const esMatch = f.id === "match";
  return (
    <tr data-fila={f.id} className={cn("border-t border-line", esCriterio && "text-[12px]")}>
      <th
        scope="row"
        className={cn(
          "sticky left-0 z-10 bg-card px-4 py-2.5 text-left align-top font-semibold",
          "text-[var(--text-2)]",
        )}
      >
        {f.nombre}
      </th>
      {f.celdas.map((c, i) => {
        const gana = f.mejores.includes(i);
        return (
          <td
            key={i}
            data-mejor={gana || undefined}
            className={cn("border-l border-line px-4 py-2.5 align-top", gana && "bg-[var(--brand-green)]/[0.08]")}
          >
            {esMatch ? <ScoreBadge score={c.valor ?? 0} grande /> : esCriterio ? <Barra c={c} gana={gana} /> : <Valor c={c} gana={gana} />}
          </td>
        );
      })}
      {vacio && <td className="border-l border-line" />}
    </tr>
  );
}

function Barra({ c, gana }: { c: Celda; gana: boolean }) {
  const [p, m] = c.texto.split("/").map(Number);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-surface">
        <div className={cn("h-full rounded-full", gana ? "bg-[var(--brand-green)]" : "bg-brand")} style={{ width: `${m ? (p / m) * 100 : 0}%` }} />
      </div>
      <span className={cn("w-12 text-right tabular-nums", gana ? "font-bold text-[var(--brand-green)]" : "text-[var(--text-2)]")}>{c.texto}</span>
    </div>
  );
}

function Valor({ c, gana }: { c: Celda; gana: boolean }) {
  return (
    <div>
      <p className={cn("font-semibold", gana ? "text-[var(--brand-green)]" : "text-[var(--text)]")}>{c.texto}</p>
      {c.detalle && <p className="text-[11.5px] text-[var(--text-3)]">{c.detalle}</p>}
      {(c.si?.length || c.no?.length) ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {c.si?.map((s) => (
            <span key={s} className="rounded-full bg-[var(--brand-green)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-green)]">
              {s}
            </span>
          ))}
          {c.no?.map((s) => (
            <span key={s} className="rounded-full bg-[var(--brand-red)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-red)] line-through decoration-1">
              {s}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
