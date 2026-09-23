"use client";

import { useMemo, useState } from "react";
import { FileText, Mic, Search, UserPlus } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar, inicialesDe } from "@/components/ui/Avatar";
import { Desplegable } from "@/components/ui/Desplegable";
import {
  DEPARTAMENTOS_SV,
  DISPONIBILIDADES,
  FUENTES,
  HORARIOS,
  JORNADAS,
  NIVELES_INGLES,
  PAISES,
  SKILLS,
  nombrePais,
  rangoIngles,
} from "@/lib/talento/catalogo";
import { calcularMatch } from "@/lib/talento/matching";
import { colocados } from "@/lib/talento/metricas";
import { leerCv } from "@/lib/talento/lector";
import { idNuevo } from "@/lib/talento/operaciones";
import { despachar, useTalento } from "@/lib/talento/store";
import type { Candidato, Disponibilidad, Fuente, Horario, Jornada, NivelIngles, Pais } from "@/lib/talento/tipos";
import { Boton, Campo, Capa, Encabezado, INPUT, Pastillas, ScoreBadge, Seccion, SkillChip, useSoloBetme } from "@/components/talento/ui";
import { FichaCandidato } from "@/components/talento/FichaCandidato";
import { esNuevo, ordenarPerfiles, pasaFecha, type FiltroFecha, type OrdenPerfiles } from "@/lib/talento/perfiles";
import { vocarooId } from "@/lib/talento/audio";
import { falta, textoIngles, textoPretension } from "@/lib/talento/mostrar";
import { diaSv, fechaCortaSv, sumarDias } from "@/lib/talento/fechas";
import { BarraComparar, BotonComparar } from "@/components/talento/Comparar";

type Filtro = "todos" | "pendientes" | "disponibles" | "en_proceso" | "colocados";

const ORDENES: { valor: OrdenPerfiles; etiqueta: string }[] = [
  { valor: "recientes", etiqueta: "Más recientes" },
  { valor: "antiguos", etiqueta: "Más antiguos" },
  { valor: "nombre", etiqueta: "Nombre" },
  { valor: "match", etiqueta: "Mejor match" },
];

const FECHAS: { valor: FiltroFecha["tipo"]; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Cualquier fecha" },
  { valor: "hoy", etiqueta: "Hoy" },
  { valor: "7", etiqueta: "Últimos 7 días" },
  { valor: "30", etiqueta: "Últimos 30 días" },
  { valor: "rango", etiqueta: "Rango de fechas" },
];

export default function PerfilesPage() {
  const es = useSoloBetme();
  const estado = useTalento();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [inglesMin, setInglesMin] = useState<string>("");
  const [skill, setSkill] = useState<string>("");
  const [orden, setOrden] = useState<OrdenPerfiles>("recientes");
  const [fecha, setFecha] = useState<FiltroFecha>({ tipo: "todos" });
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);

  const lista = useMemo(() => {
    if (!estado) return [];
    const col = colocados(estado.postulaciones);
    const enProceso = new Set(
      estado.postulaciones.filter((p) => p.etapa !== "descartado" && p.etapa !== "contratado").map((p) => p.candidatoId),
    );
    const abiertas = estado.vacantes.filter((v) => v.estado === "abierta" && v.origen !== "formulario");
    const t = q.trim().toLowerCase();
    const filtrados = estado.candidatos
      .filter((c) => {
        if (filtro === "pendientes" && c.decision) return false;
        if (!pasaFecha(c, fecha)) return false;
        if (filtro === "colocados" && !col.has(c.id)) return false;
        if (filtro === "en_proceso" && !enProceso.has(c.id)) return false;
        if (filtro === "disponibles" && (col.has(c.id) || enProceso.has(c.id))) return false;
        if (inglesMin && (falta(c, "ingles") || rangoIngles(c.ingles) < rangoIngles(inglesMin as NivelIngles))) return false;
        if (skill && !c.skills.includes(skill)) return false;
        if (!t) return true;
        const texto = `${c.nombre} ${c.titular} ${c.ubicacion.departamento ?? ""} ${c.ubicacion.municipio ?? ""} ${c.skills.map((s) => SKILLS.find((x) => x.id === s)?.nombre).join(" ")}`.toLowerCase();
        return texto.includes(t);
      })
      .map((c) => {
        // El mejor match del perfil contra las vacantes abiertas: dice de un
        // vistazo si hay donde meterlo hoy.
        const mejor = abiertas
          .map((v) => ({ v, score: calcularMatch(c, v.requisitos).score }))
          .sort((a, b) => b.score - a.score)[0];
        return { c, mejor, match: mejor?.score, colocado: col.has(c.id), enProceso: enProceso.has(c.id) };
      });
    return ordenarPerfiles(filtrados, orden);
  }, [estado, q, filtro, inglesMin, skill, orden, fecha]);

  if (!es) return <div className="flex-1 bg-surface" />;
  if (!estado) return <div className="flex-1 animate-pulse bg-surface" />;

  const ficha = fichaId ? estado.candidatos.find((c) => c.id === fichaId) : null;

  return (
    <div className="flex h-full flex-col">
      <Encabezado titulo="Perfiles" detalle={`${estado.candidatos.length} en el banco de talento`}>
        <Boton primario onClick={() => setAgregando(true)}>
          <UserPlus size={14} /> Agregar perfil
        </Boton>
      </Encabezado>

      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-card px-5 py-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input className={cn(INPUT, "pl-8")} placeholder="Nombre, puesto, skill o municipio" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Pastillas
          opciones={[
            { id: "todos", nombre: "Todos" },
            { id: "pendientes", nombre: "Pendientes de revisión" },
            { id: "disponibles", nombre: "Disponibles" },
            { id: "en_proceso", nombre: "En proceso" },
            { id: "colocados", nombre: "Colocados" },
          ]}
          valor={[filtro]}
          onChange={(v) => setFiltro(v[0] as Filtro)}
        />
        <Desplegable
          valor={inglesMin}
          opciones={[{ valor: "", etiqueta: "Cualquier inglés" }, ...NIVELES_INGLES.map((n) => ({ valor: n.id, etiqueta: `${n.id} o más` }))]}
          onChange={setInglesMin}
          etiquetaAria="Inglés mínimo"
          className="w-40"
        />
        <Desplegable
          valor={skill}
          opciones={[{ valor: "", etiqueta: "Cualquier skill" }, ...SKILLS.map((s) => ({ valor: s.id, etiqueta: s.nombre }))]}
          onChange={setSkill}
          etiquetaAria="Skill"
          className="w-48"
        />
        <Desplegable
          valor={fecha.tipo}
          opciones={FECHAS}
          onChange={(v) => setFecha(v === "rango" ? { tipo: "rango", desde: sumarDias(diaSv(new Date()), -13), hasta: diaSv(new Date()) } : ({ tipo: v } as FiltroFecha))}
          etiquetaAria="Fecha de ingreso"
          className="w-44"
        />
        {fecha.tipo === "rango" && (
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-3)]">
            <input type="date" aria-label="Desde" className={cn(INPUT, "w-36")} value={fecha.desde ?? ""} onChange={(e) => setFecha({ ...fecha, desde: e.target.value || undefined })} />
            <span>a</span>
            <input type="date" aria-label="Hasta" className={cn(INPUT, "w-36")} value={fecha.hasta ?? ""} onChange={(e) => setFecha({ ...fecha, hasta: e.target.value || undefined })} />
          </div>
        )}
        <Desplegable valor={orden} opciones={ORDENES} onChange={(v) => setOrden(v as OrdenPerfiles)} etiquetaAria="Orden" className="ml-auto w-44" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-24">
        {lista.length === 0 && <p className="py-10 text-center text-[13px] text-[var(--text-3)]">Nadie cumple esos filtros.</p>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lista.map(({ c, mejor, colocado, enProceso }) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              data-candidato={c.id}
              onClick={() => setFichaId(c.id)}
              onKeyDown={(e) => e.key === "Enter" && setFichaId(c.id)}
              className="cursor-pointer rounded-2xl border border-line bg-card p-4 text-left shadow-sm transition hover:border-[var(--border-2)]"
            >
              <div className="flex items-start gap-3">
                <Avatar iniciales={inicialesDe(c.nombre)} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-[14px] font-bold text-[var(--text)]">
                    {esNuevo(c) && <span data-nuevo className="h-2 w-2 shrink-0 rounded-full bg-[var(--brand-accent)]" title="Entró en las últimas 24 horas" />}
                    <span className="truncate">{c.nombre}</span>
                  </p>
                  <p className="truncate text-[12.5px] font-semibold text-[var(--brand-accent)]">{c.titular}</p>
                  <p className="truncate text-[11.5px] text-[var(--text-3)]">
                    {c.puesto && c.puesto !== c.titular ? `${c.puesto} · ` : ""}{c.ubicacion.departamento ?? nombrePais(c.ubicacion.pais)} · {textoIngles(c)} · {textoPretension(c)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <BotonComparar id={c.id} />
                  {c.audioUrl && <Mic size={14} className="text-[var(--text-3)]" aria-label="Tiene audio de presentación" />}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {c.skills.slice(0, 5).map((s) => (
                  <SkillChip key={s} id={s} />
                ))}
                {c.skills.length > 5 && <span className="px-1 text-[11px] text-[var(--text-3)]">+{c.skills.length - 5}</span>}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5 text-[11.5px]">
                <span className="min-w-0 truncate">
                  <span
                    className={cn(
                      "font-semibold",
                      c.decision?.resultado === "rechazado"
                        ? "text-[var(--brand-red)]"
                        : colocado
                          ? "text-[var(--brand-green)]"
                          : enProceso
                            ? "text-[var(--brand-accent)]"
                            : "text-[var(--text-3)]",
                    )}
                  >
                    {c.decision?.resultado === "rechazado" ? "Rechazado" : colocado ? "Colocado" : enProceso ? "En proceso" : "Disponible"}
                  </span>
                  <span className="text-[var(--text-3)]"> · {fechaCortaSv(c.creado)}</span>
                </span>
                {mejor && !colocado && (
                  <span className="flex min-w-0 items-center gap-1.5 text-[var(--text-3)]">
                    <span className="truncate">{mejor.v.titulo}</span>
                    <ScoreBadge score={mejor.score} />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <BarraComparar />

      <Capa abierta={Boolean(ficha)} onCerrar={() => setFichaId(null)} titulo="Perfil del candidato">
        {ficha && <FichaCandidato candidato={ficha} estado={estado} />}
      </Capa>

      <Capa abierta={agregando} onCerrar={() => setAgregando(false)} titulo="Agregar perfil" ancho="max-w-3xl">
        {agregando && (
          <NuevoPerfil
            onCrear={(c) => {
              despachar({ type: "CREAR_CANDIDATO", candidato: c });
              setAgregando(false);
              setFichaId(c.id);
            }}
          />
        )}
      </Capa>
    </div>
  );
}

const PAIS_OPC = PAISES.map((p) => ({ valor: p.id, etiqueta: p.nombre }));
const DEP_OPC = DEPARTAMENTOS_SV.map((d) => ({ valor: d.nombre, etiqueta: d.nombre }));

function NuevoPerfil({ onCrear }: { onCrear: (c: Candidato) => void }) {
  const [texto, setTexto] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [titular, setTitular] = useState("");
  const [pais, setPais] = useState<Pais>("SV");
  const [dep, setDep] = useState("San Salvador");
  const [anios, setAnios] = useState(1);
  const [ingles, setIngles] = useState<NivelIngles>("B2");
  const [pretension, setPretension] = useState(800);
  const [jornada, setJornada] = useState<Jornada>("completo");
  const [horarios, setHorarios] = useState<Horario[]>(["este"]);
  const [disp, setDisp] = useState<Disponibilidad>("inmediata");
  const [fuente, setFuente] = useState<Fuente>("whatsapp");
  const [skills, setSkills] = useState<string[]>([]);
  const [leido, setLeido] = useState(false);
  const [audio, setAudio] = useState("");

  function leer() {
    const l = leerCv(texto);
    if (l.nombre) setNombre(l.nombre);
    if (l.telefono) setTelefono(l.telefono);
    if (l.correo) setCorreo(l.correo);
    if (l.pais) setPais(l.pais);
    if (l.departamento) setDep(l.departamento);
    if (l.anios !== null) setAnios(l.anios);
    if (l.ingles) setIngles(l.ingles);
    if (l.pretension !== null) setPretension(l.pretension);
    if (l.jornada) setJornada(l.jornada);
    if (l.horarios.length) setHorarios(l.horarios);
    setSkills(l.skills);
    const voc = texto.match(/(?:https?:\/\/)?(?:www\.)?(?:vocaroo\.com|voca\.ro)\/[^\s,;)]+/i)?.[0];
    if (voc && vocarooId(voc)) setAudio(voc);
    const linea = texto.split(/[\n.]/).map((x) => x.trim()).find((x) => /(assistant|asistente|coordinator|coordinador|analyst|analista|paralegal|setter|manager)/i.test(x));
    if (linea) setTitular(linea.replace(/\s+con\s+\d+.*$/i, "").slice(0, 60));
    setLeido(true);
  }

  const valido = nombre.trim().length > 2 && telefono.replace(/\D/g, "").length >= 8;

  return (
    <div className="space-y-5 p-5">
      <Seccion titulo="Pegar el CV">
        <textarea
          className={cn(INPUT, "min-h-[120px] text-[12.5px]")}
          placeholder="Pegue el texto del CV o el resumen que mandó por WhatsApp."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="mt-2 flex items-center gap-2">
          <Boton primario disabled={!texto.trim()} onClick={leer}>
            <FileText size={13} /> Leer CV
          </Boton>
          {leido && <span className="text-[12px] text-[var(--text-3)]">Revise los datos antes de guardar.</span>}
        </div>
      </Seccion>

      <Seccion titulo="Datos">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo label="Nombre completo">
            <input className={INPUT} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>
          <Campo label="Puesto que busca">
            <input className={INPUT} value={titular} onChange={(e) => setTitular(e.target.value)} placeholder="Virtual Assistant" />
          </Campo>
          <Campo label="Teléfono (WhatsApp)">
            <input className={INPUT} value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+503 7000 0000" />
          </Campo>
          <Campo label="Correo">
            <input className={INPUT} value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </Campo>
          <Campo label="País">
            <Desplegable valor={pais} opciones={PAIS_OPC} onChange={(v) => setPais(v as Pais)} etiquetaAria="País" />
          </Campo>
          {pais === "SV" && (
            <Campo label="Departamento">
              <Desplegable valor={dep} opciones={DEP_OPC} onChange={setDep} etiquetaAria="Departamento" />
            </Campo>
          )}
          <Campo label="Años de experiencia">
            <input type="number" min={0} className={INPUT} value={anios} onChange={(e) => setAnios(Math.max(0, Number(e.target.value) || 0))} />
          </Campo>
          <Campo label="Audio de presentación (Vocaroo)">
            <input className={INPUT} value={audio} onChange={(e) => setAudio(e.target.value)} placeholder="vocaroo.com/... o voca.ro/..." />
          </Campo>
          <Campo label="Pretensión (USD al mes)">
            <input type="number" min={0} step={50} className={INPUT} value={pretension} onChange={(e) => setPretension(Math.max(0, Number(e.target.value) || 0))} />
          </Campo>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Inglés">
            <Pastillas opciones={NIVELES_INGLES.map((n) => ({ id: n.id, nombre: n.id }))} valor={[ingles]} onChange={(v) => setIngles(v[0])} />
          </Campo>
          <Campo label="Jornada">
            <Pastillas opciones={JORNADAS} valor={[jornada]} onChange={(v) => setJornada(v[0])} />
          </Campo>
          <Campo label="Horarios que puede cubrir">
            <Pastillas opciones={HORARIOS} valor={horarios} onChange={setHorarios} multiple />
          </Campo>
          <Campo label="Puede empezar">
            <Pastillas opciones={DISPONIBILIDADES} valor={[disp]} onChange={(v) => setDisp(v[0])} />
          </Campo>
          <Campo label="Cómo llegó">
            <Pastillas opciones={FUENTES} valor={[fuente]} onChange={(v) => setFuente(v[0])} />
          </Campo>
        </div>
        <div className="mt-4">
          <Campo label="Skills">
            <Pastillas opciones={SKILLS.map((s) => ({ id: s.id, nombre: s.nombre }))} valor={skills} onChange={setSkills} multiple />
          </Campo>
        </div>
      </Seccion>

      <div className="sticky bottom-0 -mx-5 flex justify-end border-t border-line bg-card px-5 py-3">
        <Boton
          primario
          disabled={!valido}
          onClick={() =>
            onCrear({
              id: idNuevo("c"),
              nombre: nombre.trim(),
              telefono: telefono.trim(),
              correo: correo.trim(),
              ubicacion: { pais, departamento: pais === "SV" ? dep : undefined },
              titular: titular.trim() || "Asistente virtual",
              resumen: texto.trim().slice(0, 400) || "Perfil agregado a mano.",
              experiencia: [],
              aniosExperiencia: anios,
              educacion: "Por completar",
              skills,
              ingles,
              pretension,
              jornada,
              horarios,
              disponibilidad: disp,
              fuente,
              audioUrl: vocarooId(audio) ? audio.trim() : undefined,
              creado: new Date().toISOString(),
              notas: [],
            })
          }
        >
          Guardar en el banco
        </Boton>
      </div>
    </div>
  );
}
