"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Check,
  Copy,
  GraduationCap,
  Languages,
  MapPin,
  MessageCircle,
  Mic,
  Plus,
  Wallet,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";
import { activeTenant } from "@/lib/tenants/active";
import { ME } from "@/lib/data/seed";
import { Desplegable } from "@/components/ui/Desplegable";
import { ChannelBadge } from "@/components/ui/ChannelBadge";
import {
  CRITERIOS,
  DISC,
  DISPONIBILIDADES,
  ETAPAS,
  HORARIOS,
  JORNADAS,
  nombreFuente,
  nombrePais,
  nombreTipoEntrevista,
  RECOMENDACIONES,
} from "@/lib/talento/catalogo";
import { calcularMatch } from "@/lib/talento/matching";
import { fechaCortaSv, haceSv, horaSv } from "@/lib/talento/fechas";
import { despachar } from "@/lib/talento/store";
import { idNuevo } from "@/lib/talento/operaciones";
import type { Candidato, EstadoTalento, Etapa } from "@/lib/talento/tipos";
import { Boton, EtapaPill, INPUT, ScoreBadge, SkillChip, nombreStaff } from "./ui";

type Pestana = "cv" | "proceso" | "conversaciones" | "notas";

const soloDigitos = (t?: string) => (t ?? "").replace(/\D/g, "");

function mesAnio(ym?: string): string {
  if (!ym) return "hoy";
  const [a, m] = ym.split("-").map(Number);
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${MESES[m - 1]} ${a}`;
}

export function FichaCandidato({ candidato, estado }: { candidato: Candidato; estado: EstadoTalento }) {
  const router = useRouter();
  const { state } = useStore();
  const [pestana, setPestana] = useState<Pestana>("cv");
  const [nota, setNota] = useState("");
  const [plantilla, setPlantilla] = useState("");
  const [copiado, setCopiado] = useState(false);

  const c = candidato;
  const postulaciones = estado.postulaciones.filter((p) => p.candidatoId === c.id);
  const entrevistas = estado.entrevistas
    .filter((e) => postulaciones.some((p) => p.id === e.postulacionId))
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
  const vacantePorId = new Map(estado.vacantes.map((v) => [v.id, v]));
  // Las vacantes abiertas donde todavia no esta, de la que mejor encaja a la peor.
  const encaja = estado.vacantes
    .filter((v) => v.estado === "abierta" && !postulaciones.some((p) => p.vacanteId === v.id))
    .map((v) => ({ v, m: calcularMatch(c, v.requisitos) }))
    .sort((a, b) => b.m.score - a.m.score);

  // Las conversaciones de la bandeja con esta persona: por telefono o, en
  // Instagram y Facebook (que no traen telefono), por nombre.
  const conversaciones = useMemo(() => {
    const tel = soloDigitos(c.telefono);
    const contactos = state.contacts.filter(
      (k) => (tel && soloDigitos(k.telefono) === tel) || k.nombre.trim().toLowerCase() === c.nombre.toLowerCase(),
    );
    const ids = new Set(contactos.map((k) => k.id));
    return state.conversations
      .filter((cv) => ids.has(cv.contactId))
      .map((cv) => ({
        cv,
        mensajes: state.messages.filter((m) => m.conversationId === cv.id).sort((a, b) => a.ts.localeCompare(b.ts)),
      }));
  }, [c.telefono, c.nombre, state.contacts, state.conversations, state.messages]);

  // Plantillas con los datos de esta persona ya puestos.
  const principal = postulaciones.find((p) => p.etapa !== "descartado") ?? postulaciones[0];
  const proxima = entrevistas.filter((e) => e.estado === "programada").sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
  const variables = [
    c.nombre.split(" ")[0],
    principal ? vacantePorId.get(principal.vacanteId)?.titulo ?? "la posición" : "la posición",
    proxima ? `${fechaCortaSv(proxima.inicio)} a las ${horaSv(proxima.inicio)}` : "próximo día hábil",
  ];
  const plantillas = activeTenant().waTemplates.map((t) => {
    const cuerpo = t.components.find((x) => x.type === "BODY")?.text ?? "";
    return { name: t.name, texto: cuerpo.replace(/\{\{(\d+)\}\}/g, (_, n) => variables[Number(n) - 1] ?? "") };
  });
  const textoPlantilla = plantillas.find((p) => p.name === plantilla)?.texto ?? "";

  function abrirChat() {
    const conv = conversaciones.find((x) => x.cv.canal === "whatsapp") ?? conversaciones[0];
    if (conv) sessionStorage.setItem("ccg.abrirConv", conv.cv.id);
    else sessionStorage.setItem("ccg.iniciarConv", JSON.stringify({ telefono: c.telefono, nombre: c.nombre }));
    router.push("/");
  }

  function agregarNota() {
    const texto = nota.trim();
    if (!texto) return;
    despachar({ type: "NOTA", candidatoId: c.id, nota: { id: idNuevo("n"), autor: ME, texto, ts: new Date().toISOString() } });
    setNota("");
  }

  const ubicacion = [c.ubicacion.municipio, c.ubicacion.departamento, nombrePais(c.ubicacion.pais)]
    .filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i)
    .join(", ");

  return (
    <div className="flex flex-col">
      <div className="space-y-3 border-b border-line px-5 py-4">
        <div>
          <p className="text-[18px] font-extrabold leading-tight text-[var(--text)]">{c.nombre}</p>
          <p className="text-[13px] font-semibold text-[var(--brand-accent)]">{c.titular}</p>
          <p className="mt-1 text-[12px] text-[var(--text-3)]">
            {c.telefono} · {c.correo} · {nombreFuente(c.fuente)}
            {c.referidoPor ? ` (${c.referidoPor})` : ""} · {haceSv(c.creado)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Boton primario onClick={abrirChat}>
            <MessageCircle size={14} /> {conversaciones.length ? "Abrir chat" : "Escribir por WhatsApp"}
          </Boton>
          {encaja.length > 0 && (
            <Boton onClick={() => setPestana("proceso")}>
              <Plus size={14} /> Agregar a vacante
            </Boton>
          )}
        </div>
        <div className="flex gap-1">
          {(
            [
              ["cv", "CV"],
              ["proceso", `Proceso (${postulaciones.length})`],
              ["conversaciones", `Conversaciones (${conversaciones.length})`],
              ["notas", `Notas (${c.notas.length})`],
            ] as [Pestana, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPestana(id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition",
                pestana === id ? "bg-brand text-white" : "text-[var(--text-2)] hover:bg-surface",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-5">
        {pestana === "cv" && (
          <>
            <p className="text-[13.5px] leading-relaxed text-[var(--text-2)]">{c.resumen}</p>
            <div className="grid grid-cols-1 gap-2.5 text-[12.5px] sm:grid-cols-2">
              <Dato Icon={MapPin} label="Ubicación" valor={ubicacion} />
              <Dato Icon={Languages} label="Idiomas" valor={`Español nativo · Inglés ${c.ingles}${c.otrosIdiomas?.length ? ` · ${c.otrosIdiomas.join(", ")}` : ""}`} />
              <Dato Icon={Wallet} label="Pretensión" valor={`$${c.pretension.toLocaleString("en-US")} al mes`} />
              <Dato
                Icon={Clock}
                label="Disponibilidad"
                valor={`${JORNADAS.find((j) => j.id === c.jornada)?.nombre} · ${c.horarios.map((h) => HORARIOS.find((x) => x.id === h)?.nombre.match(/\((.+)\)/)?.[1]).join(", ")} · ${DISPONIBILIDADES.find((d) => d.id === c.disponibilidad)?.nombre}`}
              />
              <Dato Icon={Briefcase} label="Experiencia" valor={`${c.aniosExperiencia} años`} />
              <Dato
                Icon={Check}
                label="DISC"
                valor={c.disc ? `${c.disc.primario}${c.disc.secundario ? `/${c.disc.secundario}` : ""} (${DISC.find((d) => d.id === c.disc!.primario)?.nombre})` : "Sin evaluar"}
              />
              <Dato Icon={GraduationCap} label="Educación" valor={c.educacion} />
              <Dato Icon={Mic} label="Grabación en inglés" valor={c.grabacion ? "Recibida (60 s)" : "Pendiente"} />
            </div>
            <div>
              <p className="mb-2 text-[11.5px] font-bold text-[var(--text-2)]">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {c.skills.map((s) => (
                  <SkillChip key={s} id={s} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11.5px] font-bold text-[var(--text-2)]">Experiencia</p>
              <ol className="space-y-3 border-l-2 border-line pl-4">
                {c.experiencia.map((x, i) => (
                  <li key={i}>
                    <p className="text-[13px] font-bold text-[var(--text)]">{x.puesto}</p>
                    <p className="text-[12px] text-[var(--text-3)]">
                      {x.empresa} · {mesAnio(x.desde)} a {mesAnio(x.hasta)}
                    </p>
                    {x.descripcion && <p className="mt-0.5 text-[12.5px] text-[var(--text-2)]">{x.descripcion}</p>}
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}

        {pestana === "proceso" && (
          <>
            {encaja.length > 0 && (
              <div className="rounded-xl border border-dashed border-[var(--border-2)] p-3">
                <p className="mb-2 text-[11.5px] font-bold text-[var(--text-2)]">Vacantes abiertas donde encaja</p>
                <ul className="space-y-1.5">
                  {encaja.map(({ v, m }) => (
                    <li key={v.id} className="flex items-center gap-2.5">
                      <ScoreBadge score={m.score} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-bold text-[var(--text)]">{v.titulo}</p>
                        <p className="truncate text-[11.5px] text-[var(--text-3)]">{v.cliente}</p>
                      </div>
                      <Boton
                        onClick={() =>
                          despachar({ type: "AL_PIPELINE", vacanteId: v.id, candidatoIds: [c.id], ts: new Date().toISOString() })
                        }
                      >
                        <Plus size={13} /> Al pipeline
                      </Boton>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {postulaciones.map((p) => {
              const v = vacantePorId.get(p.vacanteId);
              if (!v) return null;
              const m = calcularMatch(c, v.requisitos);
              return (
                <div key={p.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-start gap-3">
                    <ScoreBadge score={m.score} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-bold text-[var(--text)]">{v.titulo}</p>
                      <p className="text-[12px] text-[var(--text-3)]">{v.cliente}</p>
                    </div>
                    <EtapaPill etapa={p.etapa} />
                  </div>
                  <ol className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-[var(--text-3)]">
                    {p.historial.map((h, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: ETAPAS.find((e) => e.id === h.etapa)?.color }} />
                        {ETAPAS.find((e) => e.id === h.etapa)?.nombre} {fechaCortaSv(h.ts)}
                      </li>
                    ))}
                  </ol>
                  {p.motivoDescarte && <p className="mt-2 text-[12px] font-semibold text-[var(--brand-red)]">{p.motivoDescarte}</p>}
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-[11.5px] font-semibold text-[var(--text-3)]">Mover a</span>
                    <Desplegable
                      valor={p.etapa}
                      opciones={ETAPAS.map((e) => ({ valor: e.id, etiqueta: e.nombre }))}
                      onChange={(v) =>
                        despachar({ type: "MOVER", postulacionId: p.id, etapa: v as Etapa, ts: new Date().toISOString() })
                      }
                      etiquetaAria={`Etapa en ${v.titulo}`}
                      className="min-w-[150px]"
                    />
                  </div>
                  {m.falta.length > 0 && (
                    <p className="mt-2 text-[11.5px] text-[var(--text-3)]">Le falta: {m.falta.join(" · ")}</p>
                  )}
                </div>
              );
            })}
            {entrevistas.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11.5px] font-bold text-[var(--text-2)]">Entrevistas</p>
                {entrevistas.map((e) => (
                  <div key={e.id} className="rounded-xl border border-line p-3 text-[12.5px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-[var(--text)]">
                        {nombreTipoEntrevista(e.tipo)} · {fechaCortaSv(e.inicio)} {horaSv(e.inicio)}
                      </p>
                      <span className="text-[var(--text-3)]">{nombreStaff(e.entrevistador)}</span>
                    </div>
                    {e.scorecard ? (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {CRITERIOS.map((k) => (
                            <span key={k.id} className="rounded-md bg-surface px-2 py-0.5 text-[11.5px] text-[var(--text-2)]">
                              {k.nombre} <b className="text-[var(--text)]">{e.scorecard!.criterios[k.id]}</b>/5
                            </span>
                          ))}
                        </div>
                        <p className="mt-1.5 text-[var(--text-2)]">
                          <b>{RECOMENDACIONES.find((r) => r.id === e.scorecard!.recomendacion)?.nombre}.</b> {e.scorecard.comentario}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-[var(--text-3)]">
                        {e.estado === "programada" ? "Programada" : e.estado === "no_asistio" ? "No se presentó" : e.estado === "cancelada" ? "Cancelada" : "Sin scorecard"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {pestana === "conversaciones" && (
          <>
            <div className="rounded-xl border border-line p-3">
              <p className="mb-2 text-[11.5px] font-bold text-[var(--text-2)]">Mensaje con plantilla</p>
              <Desplegable
                valor={plantilla}
                opciones={[{ valor: "", etiqueta: "Elegir plantilla" }, ...plantillas.map((p) => ({ valor: p.name, etiqueta: p.name.replace(/_/g, " ") }))]}
                onChange={(v) => {
                  setPlantilla(v);
                  setCopiado(false);
                }}
                etiquetaAria="Plantilla de mensaje"
              />
              {textoPlantilla && (
                <>
                  <p className="mt-2 whitespace-pre-wrap rounded-lg bg-surface p-2.5 text-[12.5px] text-[var(--text-2)]">{textoPlantilla}</p>
                  <div className="mt-2 flex gap-2">
                    <Boton
                      onClick={() => {
                        void navigator.clipboard?.writeText(textoPlantilla);
                        setCopiado(true);
                      }}
                    >
                      {copiado ? <Check size={14} /> : <Copy size={14} />} {copiado ? "Copiado" : "Copiar"}
                    </Boton>
                    <Boton primario onClick={abrirChat}>
                      <MessageCircle size={14} /> Ir al chat
                    </Boton>
                  </div>
                </>
              )}
            </div>
            {conversaciones.length === 0 && (
              <p className="text-[13px] text-[var(--text-3)]">Todavía no ha escrito por WhatsApp, Instagram ni Facebook.</p>
            )}
            {conversaciones.map(({ cv, mensajes }) => (
              <div key={cv.id} className="rounded-xl border border-line">
                <div className="flex items-center justify-between border-b border-line px-3 py-2">
                  <ChannelBadge channel={cv.canal} showLabel />
                  <button
                    type="button"
                    onClick={() => {
                      sessionStorage.setItem("ccg.abrirConv", cv.id);
                      router.push("/");
                    }}
                    className="text-[12px] font-semibold text-[var(--brand-accent)] hover:underline"
                  >
                    Abrir en la bandeja
                  </button>
                </div>
                <div className="space-y-2 p-3">
                  {mensajes.slice(-6).map((m) => (
                    <div key={m.id} className={cn("flex", m.autor === "staff" ? "justify-end" : "justify-start")}>
                      <p
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-1.5 text-[12.5px]",
                          m.autor === "staff" ? "bg-brand text-white" : "bg-surface text-[var(--text)]",
                        )}
                      >
                        {m.texto}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {pestana === "notas" && (
          <>
            <div className="flex gap-2">
              <input
                className={INPUT}
                placeholder="Agregar una nota para el equipo"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && agregarNota()}
              />
              <Boton primario onClick={agregarNota} disabled={!nota.trim()}>
                Guardar
              </Boton>
            </div>
            {c.notas.length === 0 && <p className="text-[13px] text-[var(--text-3)]">Sin notas.</p>}
            <ul className="space-y-2">
              {c.notas.map((n) => (
                <li key={n.id} className="rounded-xl border border-line p-3">
                  <p className="text-[13px] text-[var(--text)]">{n.texto}</p>
                  <p className="mt-1 text-[11.5px] text-[var(--text-3)]">
                    {nombreStaff(n.autor)} · {fechaCortaSv(n.ts)} {horaSv(n.ts)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function Dato({ Icon, label, valor }: { Icon: typeof MapPin; label: string; valor: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-surface px-3 py-2">
      <Icon size={15} className="mt-0.5 shrink-0 text-[var(--brand-accent)]" />
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-[var(--text-3)]">{label}</p>
        <p className="text-[12.5px] text-[var(--text)]">{valor}</p>
      </div>
    </div>
  );
}
