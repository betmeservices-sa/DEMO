"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardCheck, Phone, Plus, UserRound, Video } from "lucide-react";
import { cn } from "@/lib/cn";
import { staff } from "@/lib/data/seed";
import { Desplegable } from "@/components/ui/Desplegable";
import { CRITERIOS, RECOMENDACIONES, TIPOS_ENTREVISTA, nombreTipoEntrevista } from "@/lib/talento/catalogo";
import { diaSv, fechaCortaSv, horaSv, isoDesdeSv, lunesDe, minutosSv, sumarDias } from "@/lib/talento/fechas";
import { idNuevo } from "@/lib/talento/operaciones";
import { despachar, useTalento } from "@/lib/talento/store";
import type { CriterioId, Entrevista, EstadoTalento, Recomendacion, TipoEntrevista } from "@/lib/talento/tipos";
import { Boton, Campo, Capa, Encabezado, INPUT, Pastillas, Seccion, nombreStaff, useSoloBetme } from "@/components/talento/ui";
import { FichaCandidato } from "@/components/talento/FichaCandidato";

const HORA_INI = 8;
const HORA_FIN = 18;
const PX_HORA = 56;

const COLOR_TIPO: Record<TipoEntrevista, string> = {
  screening: "#1f7a93",
  tecnica: "#6d4bb8",
  disc: "#a86400",
  cliente: "#1b2a4a",
};

const ICONO_MODALIDAD = { video: Video, llamada: Phone, presencial: UserRound } as const;

export default function EntrevistasPage() {
  const es = useSoloBetme();
  const estado = useTalento();
  const [vista, setVista] = useState<"semana" | "scorecards">("semana");
  const [lunes, setLunes] = useState(() => lunesDe(diaSv(new Date())));
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [fichaId, setFichaId] = useState<string | null>(null);

  const dias = useMemo(() => Array.from({ length: 5 }, (_, i) => sumarDias(lunes, i)), [lunes]);

  if (!es) return <div className="flex-1 bg-surface" />;
  if (!estado) return <div className="flex-1 animate-pulse bg-surface" />;

  const hoy = diaSv(new Date());
  const post = new Map(estado.postulaciones.map((p) => [p.id, p]));
  const cand = new Map(estado.candidatos.map((c) => [c.id, c]));
  const vac = new Map(estado.vacantes.map((v) => [v.id, v]));
  const quien = (e: Entrevista) => {
    const p = post.get(e.postulacionId)!;
    return { p, c: cand.get(p.candidatoId)!, v: vac.get(p.vacanteId)! };
  };

  const semana = estado.entrevistas.filter((e) => dias.includes(diaSv(e.inicio)) && e.estado !== "cancelada");
  const pendientesScore = estado.entrevistas.filter((e) => !e.scorecard && e.estado !== "cancelada" && e.estado !== "no_asistio" && e.inicio < new Date().toISOString());
  const abierta = abiertaId ? estado.entrevistas.find((e) => e.id === abiertaId) : null;
  const ficha = fichaId ? estado.candidatos.find((c) => c.id === fichaId) : null;

  return (
    <div className="flex h-full flex-col">
      <Encabezado
        titulo="Entrevistas"
        detalle={`${semana.filter((e) => e.estado === "programada").length} por hacer esta semana · ${pendientesScore.length} sin scorecard`}
      >
        <Pastillas
          opciones={[
            { id: "semana", nombre: "Semana" },
            { id: "scorecards", nombre: "Scorecards" },
          ]}
          valor={[vista]}
          onChange={(v) => setVista(v[0] as "semana" | "scorecards")}
        />
        <Boton primario onClick={() => setCreando(true)}>
          <Plus size={14} /> Nueva entrevista
        </Boton>
      </Encabezado>

      {vista === "semana" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-line bg-card px-5 py-2">
            <button type="button" aria-label="Semana anterior" onClick={() => setLunes(sumarDias(lunes, -7))} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface">
              <ChevronLeft size={16} />
            </button>
            <button type="button" aria-label="Semana siguiente" onClick={() => setLunes(sumarDias(lunes, 7))} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface">
              <ChevronRight size={16} />
            </button>
            <Boton onClick={() => setLunes(lunesDe(hoy))}>Hoy</Boton>
            <span className="text-[13px] font-bold text-[var(--text)]">
              {fechaCortaSv(dias[0])} al {fechaCortaSv(dias[4])}
            </span>
            <span className="ml-auto hidden items-center gap-3 text-[11.5px] text-[var(--text-3)] md:flex">
              {TIPOS_ENTREVISTA.map((t) => (
                <span key={t.id} className="flex items-center gap-1">
                  <i className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_TIPO[t.id] }} />
                  {t.nombre}
                </span>
              ))}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-5">
            <div className="grid min-w-[760px] grid-cols-[52px_repeat(5,1fr)] rounded-2xl border border-line bg-card">
              <div />
              {dias.map((d) => (
                <div key={d} className={cn("border-b border-l border-line px-2 py-2 text-center text-[12.5px] font-bold", d === hoy ? "text-brand" : "text-[var(--text-2)]")}>
                  {fechaCortaSv(d)}
                </div>
              ))}
              <div className="relative" style={{ height: (HORA_FIN - HORA_INI) * PX_HORA }}>
                {Array.from({ length: HORA_FIN - HORA_INI }, (_, i) => (
                  <span key={i} className="absolute right-2 text-[10.5px] text-[var(--text-3)]" style={{ top: i * PX_HORA - 6 }}>
                    {((HORA_INI + i) % 12 || 12) + (HORA_INI + i < 12 ? " am" : " pm")}
                  </span>
                ))}
              </div>
              {dias.map((d) => (
                <div key={d} data-dia={d} className={cn("relative border-l border-line", d === hoy && "bg-[var(--brand-accent-soft)]/40")} style={{ height: (HORA_FIN - HORA_INI) * PX_HORA }}>
                  {Array.from({ length: HORA_FIN - HORA_INI }, (_, i) => (
                    <div key={i} className="absolute inset-x-0 border-t border-line/70" style={{ top: i * PX_HORA }} />
                  ))}
                  {semana
                    .filter((e) => diaSv(e.inicio) === d)
                    .map((e) => {
                      const { c, v } = quien(e);
                      const top = ((minutosSv(e.inicio) - HORA_INI * 60) / 60) * PX_HORA;
                      const alto = Math.max(34, (e.duracionMin / 60) * PX_HORA);
                      const Icono = ICONO_MODALIDAD[e.modalidad];
                      return (
                        <button
                          key={e.id}
                          type="button"
                          data-entrevista={e.id}
                          onClick={() => setAbiertaId(e.id)}
                          className={cn(
                            "absolute inset-x-1 overflow-hidden rounded-lg px-2 py-1 text-left text-white shadow-sm transition hover:brightness-110",
                            e.estado === "no_asistio" && "opacity-50 line-through",
                          )}
                          style={{ top, height: alto, backgroundColor: COLOR_TIPO[e.tipo] }}
                        >
                          <p className="flex items-center gap-1 truncate text-[11.5px] font-bold">
                            <Icono size={11} /> {horaSv(e.inicio)} {c.nombre}
                          </p>
                          <p className="truncate text-[10.5px] opacity-90">
                            {nombreTipoEntrevista(e.tipo)} · {v.titulo}
                          </p>
                          {e.scorecard && <ClipboardCheck size={12} className="absolute bottom-1 right-1" aria-label="Con scorecard" />}
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Scorecards estado={estado} onAbrir={setAbiertaId} pendientes={pendientesScore} />
      )}

      <Capa abierta={Boolean(abierta)} onCerrar={() => setAbiertaId(null)} titulo="Entrevista" ancho="max-w-xl">
        {abierta && (
          <DetalleEntrevista
            key={abierta.id}
            e={abierta}
            {...quien(abierta)}
            onPerfil={(id) => {
              setAbiertaId(null);
              setFichaId(id);
            }}
          />
        )}
      </Capa>

      <Capa abierta={creando} onCerrar={() => setCreando(false)} titulo="Nueva entrevista" ancho="max-w-xl">
        {creando && (
          <NuevaEntrevista
            estado={estado}
            onCrear={(e) => {
              despachar({ type: "CREAR_ENTREVISTA", entrevista: e });
              // Quien recibe su primera entrevista pasa solo a la columna Entrevista.
              const p = estado.postulaciones.find((x) => x.id === e.postulacionId);
              if (p && (p.etapa === "nuevo" || p.etapa === "filtrado")) {
                despachar({ type: "MOVER", postulacionId: p.id, etapa: "entrevista", ts: new Date().toISOString() });
              }
              setLunes(lunesDe(diaSv(e.inicio)));
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

function DetalleEntrevista({
  e,
  c,
  v,
  onPerfil,
}: {
  e: Entrevista;
  c: EstadoTalento["candidatos"][number];
  v: EstadoTalento["vacantes"][number];
  onPerfil: (id: string) => void;
}) {
  const [llenando, setLlenando] = useState(false);
  const [puntos, setPuntos] = useState<Record<CriterioId, number>>({ ingles: 3, comunicacion: 3, proactividad: 3, tecnico: 3, cultura: 3 });
  const [reco, setReco] = useState<Recomendacion>("avanzar");
  const [comentario, setComentario] = useState("");

  return (
    <div className="space-y-4 p-5">
      <div>
        <p className="text-[17px] font-extrabold text-[var(--text)]">{c.nombre}</p>
        <p className="text-[13px] text-[var(--text-3)]">
          {nombreTipoEntrevista(e.tipo)} · {v.titulo} · {v.cliente}
        </p>
        <p className="mt-1 text-[13px] text-[var(--text-2)]">
          {fechaCortaSv(e.inicio)} a las {horaSv(e.inicio)} · {e.duracionMin} min · {e.modalidad === "video" ? "Videollamada" : e.modalidad === "llamada" ? "Llamada" : "Presencial, oficina San Salvador"} · {nombreStaff(e.entrevistador)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Boton onClick={() => onPerfil(c.id)}>Ver perfil</Boton>
        {e.estado === "programada" && (
          <>
            <Boton onClick={() => despachar({ type: "ESTADO_ENTREVISTA", entrevistaId: e.id, estado: "no_asistio" })}>No se presentó</Boton>
            <Boton onClick={() => despachar({ type: "ESTADO_ENTREVISTA", entrevistaId: e.id, estado: "cancelada" })}>Cancelar</Boton>
          </>
        )}
        {!e.scorecard && e.estado !== "cancelada" && e.estado !== "no_asistio" && !llenando && (
          <Boton primario onClick={() => setLlenando(true)}>
            <ClipboardCheck size={14} /> Llenar scorecard
          </Boton>
        )}
      </div>

      {e.scorecard && (
        <Seccion titulo="Scorecard">
          <div className="space-y-2">
            {CRITERIOS.map((k) => (
              <div key={k.id} className="flex items-center gap-3 text-[12.5px]">
                <span className="w-32 text-[var(--text-2)]">{k.nombre}</span>
                <div className="h-2 flex-1 rounded-full bg-surface">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(e.scorecard!.criterios[k.id] / 5) * 100}%` }} />
                </div>
                <b className="w-8 text-right text-[var(--text)]">{e.scorecard!.criterios[k.id]}/5</b>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-[var(--text-2)]">
            <b>{RECOMENDACIONES.find((r) => r.id === e.scorecard!.recomendacion)?.nombre}.</b> {e.scorecard.comentario}
          </p>
        </Seccion>
      )}

      {llenando && (
        <Seccion titulo="Scorecard">
          <div className="space-y-3">
            {CRITERIOS.map((k) => (
              <div key={k.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold text-[var(--text-2)]">{k.nombre}</span>
                <Pastillas
                  opciones={[1, 2, 3, 4, 5].map((n) => ({ id: String(n), nombre: String(n) }))}
                  valor={[String(puntos[k.id])]}
                  onChange={(val) => setPuntos({ ...puntos, [k.id]: Number(val[0]) })}
                />
              </div>
            ))}
            <Campo label="Recomendación">
              <Pastillas opciones={RECOMENDACIONES} valor={[reco]} onChange={(val) => setReco(val[0])} />
            </Campo>
            <Campo label="Comentario">
              <textarea className={cn(INPUT, "min-h-[70px]")} value={comentario} onChange={(ev) => setComentario(ev.target.value)} />
            </Campo>
            <div className="flex justify-end">
              <Boton
                primario
                onClick={() =>
                  despachar({
                    type: "SCORECARD",
                    entrevistaId: e.id,
                    scorecard: { entrevistador: e.entrevistador, criterios: puntos, recomendacion: reco, comentario: comentario.trim(), ts: new Date().toISOString() },
                  })
                }
              >
                Guardar scorecard
              </Boton>
            </div>
          </div>
        </Seccion>
      )}
    </div>
  );
}

function Scorecards({ estado, onAbrir, pendientes }: { estado: EstadoTalento; onAbrir: (id: string) => void; pendientes: Entrevista[] }) {
  const post = new Map(estado.postulaciones.map((p) => [p.id, p]));
  const cand = new Map(estado.candidatos.map((c) => [c.id, c]));
  const vac = new Map(estado.vacantes.map((v) => [v.id, v]));

  // Promedio por candidato y vacante: lo que se lleva a la reunion con el cliente.
  const filas = new Map<string, { nombre: string; vacante: string; notas: Entrevista[] }>();
  for (const e of estado.entrevistas.filter((x) => x.scorecard)) {
    const p = post.get(e.postulacionId)!;
    const f = filas.get(p.id) ?? { nombre: cand.get(p.candidatoId)!.nombre, vacante: vac.get(p.vacanteId)!.titulo, notas: [] };
    f.notas.push(e);
    filas.set(p.id, f);
  }
  const prom = (es: Entrevista[], k: CriterioId) => es.reduce((n, e) => n + e.scorecard!.criterios[k], 0) / es.length;

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
      {pendientes.length > 0 && (
        <Seccion titulo="Sin scorecard">
          <ul className="space-y-1.5">
            {pendientes.map((e) => {
              const p = post.get(e.postulacionId)!;
              return (
                <li key={e.id}>
                  <button type="button" onClick={() => onAbrir(e.id)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-surface">
                    <span>
                      <b className="text-[var(--text)]">{cand.get(p.candidatoId)!.nombre}</b>{" "}
                      <span className="text-[var(--text-3)]">· {nombreTipoEntrevista(e.tipo)} · {fechaCortaSv(e.inicio)}</span>
                    </span>
                    <span className="text-[12px] font-semibold text-[var(--brand-accent)]">{nombreStaff(e.entrevistador)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Seccion>
      )}
      <Seccion titulo="Promedios por candidato">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-[12.5px]">
            <thead>
              <tr className="text-left text-[11.5px] text-[var(--text-3)]">
                <th className="py-2 pr-3 font-bold">Candidato</th>
                {CRITERIOS.map((k) => (
                  <th key={k.id} className="px-2 py-2 text-center font-bold">{k.nombre}</th>
                ))}
                <th className="px-2 py-2 text-center font-bold">Entrevistas</th>
                <th className="py-2 pl-2 font-bold">Última recomendación</th>
              </tr>
            </thead>
            <tbody>
              {[...filas.entries()].map(([id, f]) => {
                const ultima = [...f.notas].sort((a, b) => b.inicio.localeCompare(a.inicio))[0];
                return (
                  <tr key={id} className="border-t border-line">
                    <td className="py-2 pr-3">
                      <button type="button" onClick={() => onAbrir(ultima.id)} className="text-left hover:underline">
                        <b className="text-[var(--text)]">{f.nombre}</b>
                        <span className="block text-[11.5px] text-[var(--text-3)]">{f.vacante}</span>
                      </button>
                    </td>
                    {CRITERIOS.map((k) => {
                      const n = prom(f.notas, k.id);
                      return (
                        <td key={k.id} className={cn("px-2 py-2 text-center font-bold", n >= 4.5 ? "text-[var(--brand-green)]" : n < 3.5 ? "text-[var(--brand-red)]" : "text-[var(--text)]")}>
                          {n.toFixed(1)}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center text-[var(--text-2)]">{f.notas.length}</td>
                    <td className="py-2 pl-2 font-semibold text-[var(--text-2)]">
                      {RECOMENDACIONES.find((r) => r.id === ultima.scorecard!.recomendacion)?.nombre} ({nombreStaff(ultima.entrevistador)})
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Seccion>
    </div>
  );
}

const HORAS = Array.from({ length: (HORA_FIN - HORA_INI) * 2 }, (_, i) => {
  const h = HORA_INI + Math.floor(i / 2);
  const m = i % 2 ? 30 : 0;
  return { valor: `${h}:${m}`, etiqueta: `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}` };
});

function NuevaEntrevista({ estado, onCrear }: { estado: EstadoTalento; onCrear: (e: Entrevista) => void }) {
  const activas = estado.postulaciones.filter((p) => {
    const v = estado.vacantes.find((x) => x.id === p.vacanteId);
    return v?.estado === "abierta" && p.etapa !== "descartado" && p.etapa !== "contratado";
  });
  const cand = new Map(estado.candidatos.map((c) => [c.id, c]));
  const vac = new Map(estado.vacantes.map((v) => [v.id, v]));
  const manana = sumarDias(diaSv(new Date()), 1);

  const [postId, setPostId] = useState(activas[0]?.id ?? "");
  const [tipo, setTipo] = useState<TipoEntrevista>("screening");
  const [quien, setQuien] = useState(staff.find((s) => s.id !== "me")?.id ?? "me");
  const [dia, setDia] = useState(manana);
  const [hora, setHora] = useState("10:0");
  const [modalidad, setModalidad] = useState<Entrevista["modalidad"]>("video");

  const [h, m] = hora.split(":").map(Number);
  const inicio = isoDesdeSv(dia, h, m);
  const duracion = TIPOS_ENTREVISTA.find((t) => t.id === tipo)!.duracion;
  const fin = new Date(inicio).getTime() + duracion * 60000;
  const choque = estado.entrevistas.find(
    (e) =>
      e.entrevistador === quien &&
      e.estado === "programada" &&
      new Date(e.inicio).getTime() < fin &&
      new Date(e.inicio).getTime() + e.duracionMin * 60000 > new Date(inicio).getTime(),
  );
  const [a, mes, d] = dia.split("-").map(Number);
  const dow = new Date(Date.UTC(a, mes - 1, d)).getUTCDay();
  const finDeSemana = dow === 0 || dow === 6;

  return (
    <div className="space-y-4 p-5">
      <Campo label="Candidato y vacante">
        <Desplegable
          valor={postId}
          opciones={activas.map((p) => ({ valor: p.id, etiqueta: cand.get(p.candidatoId)!.nombre, detalle: vac.get(p.vacanteId)!.titulo }))}
          onChange={setPostId}
          etiquetaAria="Candidato"
        />
      </Campo>
      <Campo label="Tipo">
        <Pastillas opciones={TIPOS_ENTREVISTA} valor={[tipo]} onChange={(v) => setTipo(v[0])} />
      </Campo>
      <Campo label="Entrevistador(a)">
        <Desplegable valor={quien} opciones={staff.map((s) => ({ valor: s.id, etiqueta: s.nombre }))} onChange={setQuien} etiquetaAria="Entrevistador" />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Día">
          <input type="date" className={INPUT} value={dia} min={diaSv(new Date())} onChange={(e) => setDia(e.target.value)} />
        </Campo>
        <Campo label="Hora (El Salvador)">
          <Desplegable valor={hora} opciones={HORAS} onChange={setHora} etiquetaAria="Hora" />
        </Campo>
      </div>
      <Campo label="Modalidad">
        <Pastillas
          opciones={[
            { id: "video", nombre: "Videollamada" },
            { id: "llamada", nombre: "Llamada" },
            { id: "presencial", nombre: "Presencial" },
          ]}
          valor={[modalidad]}
          onChange={(v) => setModalidad(v[0] as Entrevista["modalidad"])}
        />
      </Campo>
      {choque && (
        <p className="rounded-xl bg-[var(--brand-red)]/10 px-3 py-2 text-[12.5px] font-semibold text-[var(--brand-red)]">
          {nombreStaff(quien)} ya tiene otra entrevista a las {horaSv(choque.inicio)}.
        </p>
      )}
      {finDeSemana && (
        <p className="rounded-xl bg-[var(--brand-red)]/10 px-3 py-2 text-[12.5px] font-semibold text-[var(--brand-red)]">Las entrevistas son de lunes a viernes.</p>
      )}
      <div className="flex justify-end">
        <Boton
          primario
          disabled={!postId || Boolean(choque) || finDeSemana}
          onClick={() =>
            onCrear({ id: idNuevo("e"), postulacionId: postId, tipo, entrevistador: quien, inicio, duracionMin: duracion, modalidad, estado: "programada" })
          }
        >
          Agendar entrevista
        </Boton>
      </div>
    </div>
  );
}
