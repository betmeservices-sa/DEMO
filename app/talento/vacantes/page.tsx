"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { ME } from "@/lib/data/seed";
import {
  DISC,
  HORARIOS,
  JORNADAS,
  MODALIDADES,
  nombrePais,
  nombreSkill,
} from "@/lib/talento/catalogo";
import { topCandidatos } from "@/lib/talento/matching";
import { colocados } from "@/lib/talento/metricas";
import { leerVacante, REQUISITOS_BASE } from "@/lib/talento/lector";
import { haceSv } from "@/lib/talento/fechas";
import { idNuevo } from "@/lib/talento/operaciones";
import { despachar, useTalento } from "@/lib/talento/store";
import type { Requisitos, Vacante } from "@/lib/talento/tipos";
import { Boton, Campo, Capa, Encabezado, INPUT, Seccion, SkillChip, nombreStaff, useSoloBetme } from "@/components/talento/ui";
import { EditorRequisitos } from "@/components/talento/EditorRequisitos";
import { MatchLista } from "@/components/talento/MatchLista";
import { FichaCandidato } from "@/components/talento/FichaCandidato";
import { BarraComparar } from "@/components/talento/Comparar";

const EJEMPLO = `Executive Assistant bilingüe
Cliente: Firma de abogados de familia, Chicago IL
Requisitos: 3+ años de experiencia como asistente, inglés C1, manejo de agenda e inbox, Google Workspace y atención al cliente.
Remoto desde El Salvador, Guatemala u Honduras. Tiempo completo en hora Central (CST). Hasta $1,050 al mes.
Deseable: Clio y herramientas de IA. Perfil DISC S o C.`;

const ESTADO_VAC = {
  abierta: { nombre: "Abierta", clase: "bg-[var(--brand-green)]/10 text-[var(--brand-green)]" },
  pausada: { nombre: "Pausada", clase: "bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]" },
  cerrada: { nombre: "Cerrada", clase: "bg-surface text-[var(--text-3)]" },
} as const;

export default function VacantesPage() {
  const es = useSoloBetme();
  const estado = useTalento();
  const [selId, setSelId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [incluirColocados, setIncluirColocados] = useState(false);
  const [enviados, setEnviados] = useState<number | null>(null);

  const vacantes = useMemo(
    () =>
      [...(estado?.vacantes ?? [])].sort((a, b) => {
        const orden = { abierta: 0, pausada: 1, cerrada: 2 };
        return orden[a.estado] - orden[b.estado] || b.creada.localeCompare(a.creada);
      }),
    [estado],
  );
  const sel = vacantes.find((v) => v.id === selId) ?? vacantes[0];

  const candidatosPorId = useMemo(() => new Map((estado?.candidatos ?? []).map((c) => [c.id, c])), [estado]);

  // El match se recalcula solo: al abrir la vacante, al crearla y cada vez
  // que alguien entra al pipeline (sale de la lista) o al banco.
  const top = useMemo(() => {
    if (!estado || !sel) return [];
    const excluir = new Set(estado.postulaciones.filter((p) => p.vacanteId === sel.id).map((p) => p.candidatoId));
    if (!incluirColocados) for (const id of colocados(estado.postulaciones)) excluir.add(id);
    return topCandidatos(sel, estado.candidatos, { limite: 10, excluir, minimo: 40 });
  }, [estado, sel, incluirColocados]);

  if (!es) return <div className="flex-1 bg-surface" />;
  if (!estado) return <div className="flex-1 animate-pulse bg-surface" />;

  const enPipeline = (v: Vacante) => estado.postulaciones.filter((p) => p.vacanteId === v.id);
  const ficha = fichaId ? estado.candidatos.find((c) => c.id === fichaId) : null;

  return (
    <div className="flex h-full flex-col">
      <Encabezado titulo="Vacantes" detalle={`${vacantes.filter((v) => v.estado === "abierta").length} abiertas · ${estado.candidatos.length} perfiles en el banco`}>
        <Boton primario onClick={() => setCreando(true)}>
          <Plus size={14} /> Nueva vacante
        </Boton>
      </Encabezado>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="max-h-64 shrink-0 overflow-y-auto border-b border-line bg-card lg:max-h-none lg:w-80 lg:border-b-0 lg:border-r">
          {vacantes.map((v) => {
            const ps = enPipeline(v);
            const activos = ps.filter((p) => p.etapa !== "descartado" && p.etapa !== "contratado").length;
            const contratados = ps.filter((p) => p.etapa === "contratado").length;
            return (
              <button
                key={v.id}
                type="button"
                data-vacante={v.id}
                onClick={() => {
                  setSelId(v.id);
                  setEnviados(null);
                }}
                className={cn(
                  "block w-full border-b border-line px-4 py-3 text-left transition",
                  sel?.id === v.id ? "bg-[var(--brand-accent-soft)]" : "hover:bg-surface",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13.5px] font-bold text-[var(--text)]">{v.titulo}</p>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold", ESTADO_VAC[v.estado].clase)}>
                    {ESTADO_VAC[v.estado].nombre}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--text-3)]">{v.cliente}</p>
                <p className="mt-1 text-[11.5px] text-[var(--text-3)]">
                  {activos} en proceso · {contratados}/{v.plazas} {v.plazas === 1 ? "plaza" : "plazas"} · {haceSv(v.creada)}
                </p>
              </button>
            );
          })}
        </aside>

        {sel && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 pb-24">
            <Seccion>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[18px] font-extrabold text-[var(--text)]">{sel.titulo}</p>
                  <p className="text-[13px] text-[var(--text-3)]">
                    {sel.cliente} · {sel.area} · {nombreStaff(sel.responsable)}
                  </p>
                  <p className="mt-2 max-w-3xl text-[13px] text-[var(--text-2)]">{sel.descripcion}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/talento?vacante=${sel.id}`} className="inline-flex items-center rounded-lg border border-line bg-card px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text-2)] hover:bg-surface">
                    Ver pipeline ({enPipeline(sel).length})
                  </Link>
                  {sel.estado !== "cerrada" && (
                    <Boton
                      onClick={() =>
                        despachar({ type: "ESTADO_VACANTE", vacanteId: sel.id, estado: sel.estado === "abierta" ? "pausada" : "abierta", ts: new Date().toISOString() })
                      }
                    >
                      {sel.estado === "abierta" ? "Pausar" : "Reabrir"}
                    </Boton>
                  )}
                </div>
              </div>
              <ResumenRequisitos r={sel.requisitos} />
            </Seccion>

            <Seccion>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-1.5 text-[14px] font-extrabold text-[var(--text)]">
                    <Sparkles size={15} className="text-[var(--brand-accent)]" /> Perfiles que más cumplen
                  </h3>
                  <p className="text-[12px] text-[var(--text-3)]">Del banco de talento, sin contar a quien ya está en esta vacante.</p>
                </div>
                <label className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-2)]">
                  <input type="checkbox" className="h-4 w-4 accent-[var(--brand-blue)]" checked={incluirColocados} onChange={(e) => setIncluirColocados(e.target.checked)} />
                  Incluir ya colocados
                </label>
              </div>
              {enviados !== null && (
                <p className="mb-3 rounded-xl border border-[var(--brand-green)]/40 bg-[var(--brand-green)]/10 px-3 py-2 text-[12.5px] font-semibold text-[var(--brand-green)]">
                  {enviados === 1 ? "1 candidato entró" : `${enviados} candidatos entraron`} al pipeline en la etapa Nuevo.{" "}
                  <Link href={`/talento?vacante=${sel.id}`} className="underline">
                    Ver pipeline
                  </Link>
                </p>
              )}
              <MatchLista
                key={sel.id}
                vacanteId={sel.id}
                resultados={top}
                candidatos={candidatosPorId}
                onAbrir={setFichaId}
                onEnviar={
                  sel.estado === "cerrada"
                    ? undefined
                    : (ids) => {
                        despachar({ type: "AL_PIPELINE", vacanteId: sel.id, candidatoIds: ids, ts: new Date().toISOString() });
                        setEnviados(ids.length);
                      }
                }
              />
            </Seccion>
          </div>
        )}
      </div>

      <BarraComparar />

      <Capa abierta={creando} onCerrar={() => setCreando(false)} titulo="Nueva vacante" ancho="max-w-3xl">
        {creando && (
          <NuevaVacante
            onCrear={(v) => {
              despachar({ type: "CREAR_VACANTE", vacante: v });
              setSelId(v.id);
              setCreando(false);
            }}
          />
        )}
      </Capa>

      <Capa abierta={Boolean(ficha)} onCerrar={() => setFichaId(null)} titulo="Perfil del candidato">
        {ficha && <FichaCandidato candidato={ficha} estado={estado} />}
      </Capa>
    </div>
  );
}

function ResumenRequisitos({ r }: { r: Requisitos }) {
  const lugar =
    r.modalidad === "remoto"
      ? `Remoto (${r.paises.map(nombrePais).join(", ")})`
      : `${MODALIDADES.find((m) => m.id === r.modalidad)?.nombre} en ${r.departamento ?? "San Salvador"}`;
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {r.skills.map((s) => (
          <SkillChip key={s} id={s} />
        ))}
        {r.deseables.map((s) => (
          <span key={s} className="rounded-full border border-dashed border-[var(--border-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-3)]">
            {nombreSkill(s)} (deseable)
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-[var(--text-2)]">
        <span>Inglés <b>{r.ingles}</b></span>
        <span><b>{r.experiencia}</b> años o más</span>
        <span>Hasta <b>${r.salarioMax.toLocaleString("en-US")}</b></span>
        <span>{lugar}</span>
        <span>{JORNADAS.find((j) => j.id === r.jornada)?.nombre}</span>
        <span>{HORARIOS.find((h) => h.id === r.horario)?.nombre}</span>
        {r.disc.length > 0 && <span>DISC {r.disc.map((d) => DISC.find((x) => x.id === d)?.id).join("/")}</span>}
      </div>
    </div>
  );
}

function NuevaVacante({ onCrear }: { onCrear: (v: Vacante) => void }) {
  const estado = useTalento();
  const [texto, setTexto] = useState("");
  const [titulo, setTitulo] = useState("");
  const [cliente, setCliente] = useState("");
  const [area, setArea] = useState("");
  const [plazas, setPlazas] = useState(1);
  const [req, setReq] = useState<Requisitos>(REQUISITOS_BASE);
  const [leidos, setLeidos] = useState<string[] | null>(null);

  function leer(t: string) {
    const l = leerVacante(t);
    if (l.titulo) setTitulo(l.titulo);
    if (l.cliente) setCliente(l.cliente);
    setReq(l.requisitos);
    setLeidos(l.leidos);
  }

  // Vista previa en vivo: el match corre mientras se arma la vacante.
  const previa = useMemo(() => {
    if (!estado) return [];
    return topCandidatos({ requisitos: req }, estado.candidatos, { limite: 5, excluir: colocados(estado.postulaciones), minimo: 40 });
  }, [estado, req]);
  const porId = useMemo(() => new Map((estado?.candidatos ?? []).map((c) => [c.id, c])), [estado]);

  const valida = titulo.trim().length > 2 && req.skills.length > 0;

  return (
    <div className="space-y-5 p-5">
      <Seccion titulo="Pegar la descripción">
        <textarea
          className={cn(INPUT, "min-h-[120px] font-mono text-[12.5px]")}
          placeholder="Pegue la descripción del puesto tal como la mandó el cliente."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Boton primario disabled={!texto.trim()} onClick={() => leer(texto)}>
            <FileText size={13} /> Leer requisitos
          </Boton>
          <Boton
            onClick={() => {
              setTexto(EJEMPLO);
              leer(EJEMPLO);
            }}
          >
            Usar un ejemplo
          </Boton>
          {leidos && (
            <span className="text-[12px] text-[var(--text-3)]">
              {leidos.length === 0 ? "No se reconoció ningún requisito. Complételos abajo." : `Se leyeron ${leidos.length} de 11 campos. Revise el resto abajo.`}
            </span>
          )}
        </div>
      </Seccion>

      <Seccion titulo="Posición">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo label="Título">
            <input className={INPUT} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Executive Virtual Assistant" />
          </Campo>
          <Campo label="Cliente">
            <input className={INPUT} value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Rubro y ciudad del cliente" />
          </Campo>
          <Campo label="Área">
            <input className={INPUT} value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ejecutiva, Legal, Operaciones..." />
          </Campo>
          <Campo label="Plazas">
            <input type="number" min={1} max={20} className={INPUT} value={plazas} onChange={(e) => setPlazas(Math.max(1, Number(e.target.value) || 1))} />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Requisitos">
        <EditorRequisitos valor={req} onChange={setReq} />
      </Seccion>

      <Seccion titulo="Así queda el match">
        <MatchLista resultados={previa} candidatos={porId} />
      </Seccion>

      <div className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t border-line bg-card px-5 py-3">
        <Boton
          primario
          disabled={!valida}
          onClick={() =>
            onCrear({
              id: idNuevo("v"),
              titulo: titulo.trim(),
              cliente: cliente.trim() || "Cliente por confirmar",
              area: area.trim() || "General",
              descripcion: texto.trim().split("\n").slice(1).join(" ").slice(0, 280) || "Sin descripción.",
              requisitos: req,
              estado: "abierta",
              plazas,
              responsable: ME,
              creada: new Date().toISOString(),
            })
          }
        >
          Crear vacante y buscar perfiles
        </Boton>
      </div>
    </div>
  );
}
