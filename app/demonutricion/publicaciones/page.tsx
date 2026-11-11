"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  BarChart3,
  CalendarClock,
  CheckCheck,
  Eye,
  Heart,
  ImagePlus,
  Megaphone,
  MessageCircle,
  Rocket,
  Send,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { diasDesde, fechaDe, fechaLegible, iso, pct } from "@/lib/nutricion/format";
import { CLIENTES, CLINICA, DISENOS, finDelPlan, planActivo, VISITAS } from "@/lib/nutricion/seed";
import { ahora, useStore } from "@/lib/nutricion/store";
import type { Campana, Cliente, Post, Red, Segmento } from "@/lib/nutricion/types";
import { Card, MetricCard, PageHeader } from "@/components/nutricion/ui";
import { FacebookIcon, InstagramIcon, WhatsappIcon } from "@/components/nutricion/glifos";

// Publicaciones: posts para Instagram y Facebook y campañas por WhatsApp.
// Las campañas usan plantillas de marketing; quien responde lo atiende MIA
// para agendar. Sin precios ni montos.

type Tab = "posts" | "campanas";

const plural = (n: number, palabra: string) => `${n} ${palabra}${n === 1 ? "" : "s"}`;

export default function PublicacionesPage() {
  const [tab, setTab] = useState<Tab>("posts");
  const { posts, campanas } = useStore();
  const publicadas = posts.filter((p) => p.estado === "publicada");
  const alcance = publicadas.reduce((n, p) => n + (p.stats?.alcance ?? 0), 0);
  const enviadas = campanas.filter((c) => c.estado === "enviada");
  const citas = enviadas.reduce((n, c) => n + (c.stats?.citas ?? 0), 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader title="Publicaciones" sub="Publica posts en Instagram y Facebook y lanza campañas por WhatsApp. MIA atiende a quien responde y agenda la cita." />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard Icon={Megaphone} valor={publicadas.length} label="Posts publicados (30 días)" hint={plural(posts.length - publicadas.length, "programado")} />
          <MetricCard Icon={Eye} valor={alcance.toLocaleString("es-SV")} label="Alcance de los posts" />
          <MetricCard Icon={Send} valor={enviadas.length} label="Campañas enviadas" hint={plural(campanas.length - enviadas.length, "programada")} />
          <MetricCard Icon={CheckCheck} valor={citas} label="Citas agendadas por campañas" hint="MIA agendó al responder" />
        </div>

        <div className="inline-flex rounded-xl border border-line bg-card p-1 shadow-sm">
          {(
            [
              ["posts", "Posts en redes"],
              ["campanas", "Campañas por WhatsApp"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn("rounded-lg px-4 py-1.5 text-[13px] font-semibold", tab === id ? "bg-brand text-white shadow-sm" : "text-[var(--text-2)] hover:bg-surface")}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "posts" ? <Posts /> : <Campanas />}
      </div>
    </div>
  );
}

/* ---------------- Posts ---------------- */

const REDES: { id: Red; label: string; Icon: typeof InstagramIcon; color: string }[] = [
  { id: "instagram", label: "Instagram", Icon: InstagramIcon, color: "#c1275b" },
  { id: "facebook", label: "Facebook", Icon: FacebookIcon, color: "#1877F2" },
];

function Posts() {
  const { posts, agregarPost } = useStore();
  const [redes, setRedes] = useState<Red[]>(["instagram", "facebook"]);
  const [texto, setTexto] = useState("");
  const [imagen, setImagen] = useState<string | undefined>();
  const [diseno, setDiseno] = useState<number | null>(0);
  const [titulo, setTitulo] = useState(DISENOS[0].titulo);
  const [cuando, setCuando] = useState<"ahora" | "programar">("ahora");
  const [fecha, setFecha] = useState(iso(fechaDe(1)));
  const [hora, setHora] = useState("10:00");
  const [hecho, setHecho] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  const listo = redes.length > 0 && texto.trim().length > 0;
  const alternar = (r: Red) => setRedes((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]));

  const subir = (f?: File) => {
    if (!f) return;
    const lector = new FileReader();
    lector.onload = () => {
      setImagen(String(lector.result));
      setDiseno(null);
    };
    lector.readAsDataURL(f);
  };

  const publicar = () => {
    if (!listo) return;
    const ahoraMismo = cuando === "ahora";
    const post: Post = {
      id: `p${Date.now()}`,
      redes,
      texto: texto.trim(),
      imagen,
      diseno: diseno !== null ? { fondo: DISENOS[diseno].fondo, titulo: titulo.trim() || DISENOS[diseno].titulo } : undefined,
      estado: ahoraMismo ? "publicada" : "programada",
      fecha: ahoraMismo ? iso(fechaDe(0)) : fecha,
      hora: ahoraMismo ? ahora() : hora,
      stats: ahoraMismo ? { alcance: 0, meGusta: 0, comentarios: 0, mensajes: 0 } : undefined,
    };
    agregarPost(post);
    setHecho(ahoraMismo ? `Publicado en ${redes.map((r) => REDES.find((x) => x.id === r)!.label).join(" y ")}.` : `Programado para ${fechaLegible(fecha)} a las ${hora}.`);
    setTexto("");
    setImagen(undefined);
    setDiseno(0);
    setTitulo(DISENOS[0].titulo);
  };

  const preview: Post = {
    id: "preview",
    redes,
    texto: texto || "Escribe el texto de tu publicación…",
    imagen,
    diseno: diseno !== null ? { fondo: DISENOS[diseno].fondo, titulo } : undefined,
    estado: "programada",
    fecha: iso(fechaDe(0)),
    hora: "",
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card title="Nuevo post" sub="Se publica en las redes conectadas de Balance">
          <div className="space-y-4">
            <Campo label="Publicar en">
              <div className="flex flex-wrap gap-2">
                {REDES.map(({ id, label, Icon, color }) => {
                  const on = redes.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => alternar(id)}
                      aria-pressed={on}
                      className={cn("inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-semibold transition", on ? "border-transparent text-white" : "border-line text-[var(--text-2)] hover:bg-surface")}
                      style={on ? { backgroundColor: color } : undefined}
                    >
                      <Icon size={15} /> {label}
                    </button>
                  );
                })}
              </div>
            </Campo>

            <Campo label="Imagen">
              <div className="flex flex-wrap gap-2">
                {DISENOS.map((d, i) => (
                  <button
                    key={d.titulo}
                    type="button"
                    onClick={() => {
                      setDiseno(i);
                      setTitulo(d.titulo);
                      setImagen(undefined);
                    }}
                    className={cn("h-16 w-16 rounded-xl p-1.5 text-left text-[9px] font-extrabold leading-tight text-white ring-offset-2 transition", diseno === i && "ring-2 ring-brand")}
                    style={{ background: d.fondo }}
                    title={d.titulo}
                  >
                    {d.titulo}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => archivo.current?.click()}
                  className={cn(
                    "flex h-16 w-16 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed border-line text-[10px] font-semibold text-[var(--text-3)] ring-offset-2 hover:bg-surface",
                    imagen && "border-solid ring-2 ring-brand",
                  )}
                  style={imagen ? { backgroundImage: `url(${imagen})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                >
                  {!imagen && (
                    <>
                      <ImagePlus size={18} /> Subir
                    </>
                  )}
                </button>
                <input ref={archivo} type="file" accept="image/*" className="hidden" onChange={(e) => subir(e.target.files?.[0])} />
              </div>
              {diseno !== null && (
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={40} placeholder="Título sobre la imagen" className={cn(campo, "mt-2")} />
              )}
            </Campo>

            <Campo label={`Texto · ${texto.length}/2200`}>
              <textarea value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 2200))} rows={5} placeholder="¿Qué quieres contarle a tus clientes? Agrega hashtags al final." className={campo} />
            </Campo>

            <Campo label="Cuándo">
              <div className="flex flex-wrap items-center gap-2">
                <Opcion on={cuando === "ahora"} onClick={() => setCuando("ahora")}>Publicar ahora</Opcion>
                <Opcion on={cuando === "programar"} onClick={() => setCuando("programar")}>Programar</Opcion>
                {cuando === "programar" && (
                  <>
                    <input type="date" value={fecha} min={iso(fechaDe(0))} onChange={(e) => setFecha(e.target.value)} className={cn(campo, "w-auto")} />
                    <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={cn(campo, "w-auto")} />
                  </>
                )}
              </div>
            </Campo>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={publicar}
                disabled={!listo}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[14px] font-bold text-white shadow-sm hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                {cuando === "ahora" ? <Send size={16} /> : <CalendarClock size={16} />}
                {cuando === "ahora" ? "Publicar" : "Programar post"}
              </button>
              {hecho && <span className="text-[13px] font-semibold text-emerald-700">✓ {hecho}</span>}
            </div>
          </div>
        </Card>

        <div className="space-y-2 xl:sticky xl:top-0 xl:self-start">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">Vista previa</p>
          <PostTarjeta p={preview} />
        </div>
      </div>

      <Card title="Publicaciones" sub="Publicadas y programadas">
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {[...posts]
            .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora))
            .map((p) => (
              <div key={p.id} className="space-y-2">
                <div className="flex items-center justify-between text-[12px]">
                  <span className={cn("rounded-full px-2 py-0.5 font-semibold", p.estado === "publicada" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                    {p.estado === "publicada" ? "Publicada" : "Programada"}
                  </span>
                  <span className="text-[var(--text-3)]">
                    {fechaLegible(p.fecha)} · {p.hora}
                  </span>
                </div>
                <PostTarjeta p={p} compacta />
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

function PostTarjeta({ p, compacta }: { p: Post; compacta?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--consultas)] text-[11px] font-extrabold text-white">BN</span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-bold">{CLINICA.usuario}</p>
          <p className="text-[11px] text-[var(--text-3)]">{CLINICA.ciudad}</p>
        </div>
        <div className="flex gap-1">
          {p.redes.map((r) => {
            const { Icon, color } = REDES.find((x) => x.id === r)!;
            return (
              <span key={r} style={{ color }}>
                <Icon size={15} />
              </span>
            );
          })}
        </div>
      </div>
      <div
        className="flex aspect-square items-end p-4"
        style={p.imagen ? { backgroundImage: `url(${p.imagen})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: p.diseno?.fondo ?? "var(--surface-2)" }}
      >
        {!p.imagen && p.diseno && (
          <div>
            <p className={cn("font-extrabold leading-tight text-white drop-shadow", compacta ? "text-[22px]" : "text-[28px]")}>{p.diseno.titulo}</p>
            <p className="mt-1 text-[12px] font-semibold text-white/85">{CLINICA.nombre}</p>
          </div>
        )}
      </div>
      {p.stats && (
        <div className="flex items-center gap-4 border-b border-line px-3 py-2 text-[12px] font-semibold text-[var(--text-2)]">
          <span className="flex items-center gap-1"><Heart size={13} /> {p.stats.meGusta}</span>
          <span className="flex items-center gap-1"><MessageCircle size={13} /> {p.stats.comentarios}</span>
          <span className="flex items-center gap-1"><Eye size={13} /> {p.stats.alcance.toLocaleString("es-SV")}</span>
          <span className="ml-auto flex items-center gap-1 text-brand" title="Mensajes recibidos por el post (los atiende MIA)">
            <Send size={12} /> {p.stats.mensajes} mensajes
          </span>
        </div>
      )}
      <p className={cn("whitespace-pre-line px-3 py-2.5 text-[13px] leading-snug", compacta && "line-clamp-3")}>
        <b>{CLINICA.usuario}</b> {p.texto}
      </p>
    </div>
  );
}

/* ---------------- Campañas ---------------- */

const SEGMENTOS: { id: Segmento; label: string; detalle: string }[] = [
  { id: "todos", label: "Todos los pacientes", detalle: "Toda la base de Balance" },
  { id: "consultas_inactivos", label: "Sin control (+1 mes)", detalle: "Última consulta hace más de 30 días" },
  { id: "plan_vencido", label: "Plan vencido", detalle: "Tuvieron plan a domicilio y no lo renovaron" },
  { id: "con_plan", label: "Con plan activo", detalle: "Reciben comida a domicilio esta semana" },
  { id: "sin_plan", label: "Sin plan a domicilio", detalle: "Candidatos para planes, retos y e-book" },
];

function enSegmento(c: Cliente, s: Segmento) {
  if (s === "todos") return true;
  if (s === "con_plan") return planActivo(c);
  if (s === "sin_plan") return !planActivo(c);
  if (s === "plan_vencido") return !!c.plan && finDelPlan(c) < 0;
  const ultima = VISITAS.filter((v) => v.clienteId === c.id).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  return !!ultima && diasDesde(ultima.fecha) > 30;
}

/** Pacientes del segmento que aceptan mensajes de promociones. */
function audiencia(s: Segmento) {
  const todos = CLIENTES.filter((c) => enSegmento(c, s));
  return { incluidos: todos.filter((c) => !c.optOutMarketing), excluidos: todos.filter((c) => c.optOutMarketing).length };
}

const MENSAJE_BASE = "Hola {{nombre}}, en Balance Nutrición nos acordamos de ti 💚 ¿Agendamos un control para medir cómo vas con tu objetivo ({{objetivo}})?";

function Campanas() {
  const { campanas, agregarCampana } = useStore();
  const [nombre, setNombre] = useState("");
  const [segmento, setSegmento] = useState<Segmento>("consultas_inactivos");
  const [mensaje, setMensaje] = useState(MENSAJE_BASE);
  const [botones, setBotones] = useState(["Agendar control", "Ahora no", "No recibir más"]);
  const [cuando, setCuando] = useState<"ahora" | "programar">("ahora");
  const [fecha, setFecha] = useState(iso(fechaDe(1)));
  const [hora, setHora] = useState("10:00");
  const [hecho, setHecho] = useState<string | null>(null);
  const aud = useMemo(() => audiencia(segmento), [segmento]);
  const ejemplo = aud.incluidos[0] ?? CLIENTES[0];

  const listo = nombre.trim() && mensaje.trim() && aud.incluidos.length > 0;
  const lanzar = () => {
    if (!listo) return;
    const ya = cuando === "ahora";
    const k: Campana = {
      id: `k${Date.now()}`,
      nombre: nombre.trim(),
      segmento,
      mensaje: mensaje.trim(),
      botones: botones.filter((b) => b.trim()),
      estado: ya ? "enviada" : "programada",
      fecha: ya ? iso(fechaDe(0)) : fecha,
      hora: ya ? ahora() : hora,
      destinatarios: aud.incluidos.length,
      stats: ya ? { entregados: aud.incluidos.length, leidos: 0, respondieron: 0, citas: 0 } : undefined,
    };
    agregarCampana(k);
    setHecho(ya ? `Campaña enviada a ${aud.incluidos.length} clientes.` : `Campaña programada para ${fechaLegible(fecha)} a las ${hora}.`);
    setNombre("");
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card title="Nueva campaña" sub="Mensaje por WhatsApp a un grupo de clientes con una plantilla de marketing">
          <div className="space-y-4">
            <Campo label="Nombre de la campaña">
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Lanzamiento del Reto de 21 días" className={campo} />
            </Campo>

            <Campo label="A quién">
              <div className="grid gap-2 sm:grid-cols-2">
                {SEGMENTOS.map((s) => {
                  const n = audiencia(s.id).incluidos.length;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSegmento(s.id)}
                      className={cn("rounded-xl border p-3 text-left transition", segmento === s.id ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-line hover:bg-surface")}
                    >
                      <p className="flex items-center justify-between gap-2 text-[13px] font-bold">
                        {s.label}
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11.5px] font-semibold text-[var(--text-2)]">
                          <Users size={11} /> {n}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[12px] text-[var(--text-3)]">{s.detalle}</p>
                    </button>
                  );
                })}
              </div>
              {aud.excluidos > 0 && <p className="mt-2 text-[12px] text-[var(--text-3)]">Se excluyen {aud.excluidos} clientes que pidieron no recibir promociones.</p>}
            </Campo>

            <Campo label="Mensaje">
              <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={4} className={campo} />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {["{{nombre}}", "{{objetivo}}"].map((v) => (
                  <button key={v} type="button" onClick={() => setMensaje((m) => `${m} ${v}`)} className="rounded-md bg-surface px-2 py-0.5 font-mono text-[11.5px] text-[var(--text-2)] hover:bg-surface-2">
                    + {v}
                  </button>
                ))}
                <span className="text-[11.5px] text-[var(--text-3)]">Se reemplazan con los datos de cada cliente.</span>
              </div>
            </Campo>

            <Campo label="Botones de respuesta">
              <div className="space-y-1.5">
                {botones.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={b} onChange={(e) => setBotones((bs) => bs.map((x, j) => (j === i ? e.target.value.slice(0, 25) : x)))} className={campo} />
                    {i < botones.length - 1 && botones.length > 1 && (
                      <button type="button" onClick={() => setBotones((bs) => bs.filter((_, j) => j !== i))} aria-label="Quitar botón" className="rounded-lg p-1.5 text-[var(--text-3)] hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <p className="text-[11.5px] text-[var(--text-3)]">«No recibir más» es obligatorio en mensajes de marketing.</p>
              </div>
            </Campo>

            <Campo label="Cuándo">
              <div className="flex flex-wrap items-center gap-2">
                <Opcion on={cuando === "ahora"} onClick={() => setCuando("ahora")}>Enviar ahora</Opcion>
                <Opcion on={cuando === "programar"} onClick={() => setCuando("programar")}>Programar</Opcion>
                {cuando === "programar" && (
                  <>
                    <input type="date" value={fecha} min={iso(fechaDe(0))} onChange={(e) => setFecha(e.target.value)} className={cn(campo, "w-auto")} />
                    <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={cn(campo, "w-auto")} />
                  </>
                )}
              </div>
              <p className="mt-1.5 text-[11.5px] text-[var(--text-3)]">Se envía solo en horario de atención (8:00–19:00).</p>
            </Campo>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={lanzar}
                disabled={!listo}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1ba34d] px-4 py-2.5 text-[14px] font-bold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Rocket size={16} /> {cuando === "ahora" ? `Lanzar campaña · ${aud.incluidos.length} clientes` : "Programar campaña"}
              </button>
              {hecho && <span className="text-[13px] font-semibold text-emerald-700">✓ {hecho}</span>}
            </div>
          </div>
        </Card>

        <div className="space-y-2 xl:sticky xl:top-0 xl:self-start">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">Vista previa · {ejemplo.nombre.split(" ")[0]}</p>
          <div className="rounded-2xl bg-[#e7ddd3] p-4 shadow-sm">
            <div className="max-w-[300px] rounded-2xl rounded-tl-md bg-white p-3 text-[13px] leading-snug text-[#111b21] shadow-sm">
              <p className="mb-1 flex items-center gap-1 text-[11px] font-bold text-[#1ba34d]">
                <WhatsappIcon size={12} /> {CLINICA.nombre}
              </p>
              <p className="whitespace-pre-line">{mensaje.replaceAll("{{nombre}}", ejemplo.nombre.split(" ")[0]).replaceAll("{{objetivo}}", ejemplo.objetivo.toLowerCase())}</p>
              <p className="mt-1 text-right text-[10px] text-[#667781]">10:00</p>
            </div>
            <div className="mt-1 max-w-[300px] space-y-1">
              {botones.filter((b) => b.trim()).map((b) => (
                <div key={b} className="rounded-xl bg-white py-2 text-center text-[13px] font-semibold text-[#027eb5] shadow-sm">
                  {b}
                </div>
              ))}
            </div>
          </div>
          <p className="flex items-start gap-1.5 rounded-xl bg-surface p-2.5 text-[11.5px] text-[var(--text-3)]">
            <ShieldCheck size={13} className="mt-0.5 shrink-0" />
            Quien toca «Agendar cita» o responde lo atiende MIA en la bandeja. «No recibir más» marca al cliente y no vuelve a recibir campañas.
          </p>
        </div>
      </div>

      <Card title="Campañas" sub="Enviadas y programadas">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wider text-[var(--text-3)]">
              <tr>
                <th className="py-2 pr-3">Campaña</th>
                <th className="py-2 pr-3">Audiencia</th>
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Leídos</th>
                <th className="py-2 pr-3">Respondieron</th>
                <th className="py-2 pr-3">Citas</th>
                <th className="py-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...campanas]
                .sort((a, b) => b.fecha.localeCompare(a.fecha))
                .map((k) => (
                  <tr key={k.id} className="align-top">
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold">{k.nombre}</p>
                      <p className="line-clamp-1 max-w-[280px] text-[12px] text-[var(--text-3)]">{k.mensaje}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <p>{SEGMENTOS.find((s) => s.id === k.segmento)?.label}</p>
                      <p className="text-[12px] text-[var(--text-3)]">{k.destinatarios} clientes</p>
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3">{fechaLegible(k.fecha)} · {k.hora}</td>
                    <td className="py-2.5 pr-3">{k.stats ? `${pct(k.stats.leidos, k.destinatarios)}%` : "—"}</td>
                    <td className="py-2.5 pr-3">{k.stats ? `${k.stats.respondieron} (${pct(k.stats.respondieron, k.destinatarios)}%)` : "—"}</td>
                    <td className="py-2.5 pr-3 font-semibold">{k.stats ? k.stats.citas : "—"}</td>
                    <td className="py-2.5">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-semibold", k.estado === "enviada" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                        {k.estado === "enviada" ? "Enviada" : "Programada"}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-[var(--text-3)]">
          <BarChart3 size={13} /> Se mide la respuesta y las citas agendadas; sin montos ni cálculos de retorno.
        </p>
      </Card>
    </div>
  );
}

/* ---------------- Piezas comunes ---------------- */

const campo = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-brand";

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">{label}</p>
      {children}
    </div>
  );
}

function Opcion({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-lg border px-3 py-1.5 text-[13px] font-semibold", on ? "border-brand bg-brand text-white" : "border-line text-[var(--text-2)] hover:bg-surface")}
    >
      {children}
    </button>
  );
}
