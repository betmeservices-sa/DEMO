"use client";

import { useMemo, useState } from "react";
import { CalendarClock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar, inicialesDe } from "@/components/ui/Avatar";
import { ETAPAS, MOTIVOS_DESCARTE, nombreEtapa, nombreFuente, nombreTipoEntrevista } from "@/lib/talento/catalogo";
import { calcularMatch } from "@/lib/talento/matching";
import { diasEnEtapa } from "@/lib/talento/metricas";
import { fechaCortaSv, horaSv } from "@/lib/talento/fechas";
import { despachar, restablecerTalento, useTalento } from "@/lib/talento/store";
import type { Etapa, Postulacion } from "@/lib/talento/tipos";
import { Boton, Capa, Encabezado, ScoreBadge, useSoloBetme } from "@/components/talento/ui";
import { FichaCandidato } from "@/components/talento/FichaCandidato";
import { textoIngles, textoPretension } from "@/lib/talento/mostrar";
import { postulacionesDelTablero } from "@/lib/talento/mezcla";
import { BarraComparar, BotonComparar } from "@/components/talento/Comparar";

export default function PipelinePage() {
  const es = useSoloBetme();
  const estado = useTalento();
  // "Ver pipeline" desde Vacantes llega con ?vacante=v1. El shell no pinta la
  // pagina en el servidor, asi que leer la URL al iniciar no desentona.
  const [vacanteId, setVacanteId] = useState<string>(() =>
    typeof window === "undefined" ? "todas" : new URLSearchParams(window.location.search).get("vacante") ?? "todas",
  );
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<Etapa | null>(null);
  const [descartando, setDescartando] = useState<string | null>(null);
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const abiertas = useMemo(() => (estado?.vacantes ?? []).filter((v) => v.estado === "abierta"), [estado]);

  const tarjetas = useMemo(() => {
    if (!estado) return [];
    const vacs = new Map(estado.vacantes.map((v) => [v.id, v]));
    const cands = new Map(estado.candidatos.map((c) => [c.id, c]));
    return postulacionesDelTablero(estado, vacanteId)
      .map((p) => {
        const v = vacs.get(p.vacanteId)!;
        const c = cands.get(p.candidatoId)!;
        const proxima = estado.entrevistas
          .filter((e) => e.postulacionId === p.id && e.estado === "programada")
          .sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
        // Las vacantes de puestos del formulario no tienen requisitos: sin match.
        const score = v.origen === "formulario" ? null : calcularMatch(c, v.requisitos).score;
        return { p, v, c, score, proxima };
      })
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.p.creada.localeCompare(a.p.creada));
  }, [estado, vacanteId]);

  if (!es) return <div className="flex-1 bg-surface" />;
  if (!estado) return <div className="flex-1 animate-pulse bg-surface" />;

  function mover(p: Postulacion, etapa: Etapa, motivo?: string) {
    despachar({ type: "MOVER", postulacionId: p.id, etapa, motivo, ts: new Date().toISOString() });
    if (etapa === "contratado") setAviso("Contratado. Su onboarding ya está abierto.");
    else setAviso(null);
  }

  function soltar(etapa: Etapa) {
    const p = estado!.postulaciones.find((x) => x.id === arrastrando);
    setArrastrando(null);
    setSobre(null);
    if (!p || p.etapa === etapa) return;
    if (etapa === "descartado") setDescartando(p.id);
    else mover(p, etapa);
  }

  const ficha = fichaId ? estado.candidatos.find((c) => c.id === fichaId) : null;
  const vacante = abiertas.find((v) => v.id === vacanteId);
  const activos = tarjetas.filter((t) => t.p.etapa !== "descartado" && t.p.etapa !== "contratado").length;

  return (
    <div className="flex h-full flex-col">
      <Encabezado
        titulo="Pipeline"
        detalle={vacante ? `${vacante.titulo} · ${vacante.cliente} · ${activos} en proceso` : `${abiertas.length} vacantes abiertas · ${activos} candidatos en proceso`}
      >
        <Boton onClick={restablecerTalento} title="Vuelve a los datos de fábrica del demo">
          <RotateCcw size={13} /> Restablecer demo
        </Boton>
      </Encabezado>

      <div className="flex flex-wrap gap-1.5 border-b border-line bg-card px-5 py-2.5">
        {[{ id: "todas", titulo: "Todas" }, ...abiertas].map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVacanteId(v.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-[12.5px] font-semibold transition",
              vacanteId === v.id ? "border-brand bg-brand text-white" : "border-line bg-card text-[var(--text-2)] hover:bg-surface",
            )}
          >
            {v.titulo}
          </button>
        ))}
      </div>

      {aviso && (
        <div className="mx-5 mt-3 rounded-xl border border-[var(--brand-green)]/40 bg-[var(--brand-green)]/10 px-3 py-2 text-[12.5px] font-semibold text-[var(--brand-green)]">
          {aviso}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden p-5">
        <div className="flex h-full gap-3">
          {ETAPAS.map((e) => {
            const col = tarjetas.filter((t) => t.p.etapa === e.id);
            return (
              <div
                key={e.id}
                data-etapa={e.id}
                onDragOver={(ev) => {
                  ev.preventDefault();
                  setSobre(e.id);
                }}
                onDragLeave={() => setSobre((s) => (s === e.id ? null : s))}
                onDrop={(ev) => {
                  ev.preventDefault();
                  soltar(e.id);
                }}
                className={cn(
                  "flex h-full min-w-[228px] flex-1 flex-col rounded-2xl border bg-surface transition",
                  sobre === e.id ? "border-[var(--brand-accent)] ring-2 ring-[var(--brand-accent)]/20" : "border-line",
                )}
              >
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="flex items-center gap-2 text-[12.5px] font-extrabold text-[var(--text)]">
                    <i className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
                    {e.nombre}
                  </span>
                  <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-bold text-[var(--text-3)] ring-1 ring-inset ring-[var(--border)]">
                    {col.length}
                  </span>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-20">
                  {col.map(({ p, v, c, score, proxima }) => {
                    const dias = diasEnEtapa(p);
                    return (
                      <div
                        key={p.id}
                        draggable
                        data-postulacion={p.id}
                        onDragStart={(ev) => {
                          ev.dataTransfer.setData("text/plain", p.id);
                          ev.dataTransfer.effectAllowed = "move";
                          setArrastrando(p.id);
                        }}
                        onDragEnd={() => {
                          setArrastrando(null);
                          setSobre(null);
                        }}
                        onClick={() => setFichaId(c.id)}
                        className={cn(
                          "cursor-grab rounded-xl border border-line bg-card p-2.5 shadow-sm transition hover:border-[var(--border-2)] active:cursor-grabbing",
                          arrastrando === p.id && "opacity-50",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <Avatar iniciales={inicialesDe(c.nombre)} size={30} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold text-[var(--text)]">{c.nombre}</p>
                            <p className="truncate text-[11.5px] text-[var(--text-3)]">
                              {vacanteId === "todas" ? v.titulo : c.titular}
                            </p>
                          </div>
                          {score !== null && <ScoreBadge score={score} />}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-3)]">
                          <span>{textoIngles(c)}</span>
                          <span>·</span>
                          <span>{textoPretension(c)}</span>
                          <span>·</span>
                          <span>{nombreFuente(c.fuente)}</span>
                          <BotonComparar id={c.id} vacanteId={p.vacanteId} className="ml-auto" />
                        </div>
                        {proxima && (
                          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-accent)]">
                            <CalendarClock size={12} /> {nombreTipoEntrevista(proxima.tipo)} {fechaCortaSv(proxima.inicio)} {horaSv(proxima.inicio)}
                          </p>
                        )}
                        {p.etapa === "descartado" && p.motivoDescarte && (
                          <p className="mt-1.5 text-[11px] font-semibold text-[var(--brand-red)]">{p.motivoDescarte}</p>
                        )}
                        {p.etapa !== "descartado" && p.etapa !== "contratado" && dias >= 5 && (
                          <p className="mt-1.5 text-[11px] font-semibold text-[var(--brand-red)]">{dias} días en {nombreEtapa(p.etapa).toLowerCase()}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BarraComparar />

      <Capa abierta={Boolean(descartando)} onCerrar={() => setDescartando(null)} titulo="Motivo del descarte" ancho="max-w-md">
        <div className="space-y-2 p-5">
          {MOTIVOS_DESCARTE.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                const p = estado.postulaciones.find((x) => x.id === descartando);
                if (p) mover(p, "descartado", m);
                setDescartando(null);
              }}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--text)] transition hover:bg-surface"
            >
              {m}
            </button>
          ))}
        </div>
      </Capa>

      <Capa abierta={Boolean(ficha)} onCerrar={() => setFichaId(null)} titulo="Perfil del candidato">
        {ficha && <FichaCandidato candidato={ficha} estado={estado} />}
      </Capa>
    </div>
  );
}
