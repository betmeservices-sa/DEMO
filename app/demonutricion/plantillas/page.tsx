"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, FileText, Info, Lock, Plus, Save, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { CLINICA, MAX_PLANTILLAS } from "@/lib/nutricion/seed";
import { useStore } from "@/lib/nutricion/store";
import type { PlantillaWA } from "@/lib/nutricion/types";
import { PageHeader } from "@/components/nutricion/ui";
import { WhatsappIcon } from "@/components/nutricion/glifos";

// Editor de plantillas de WhatsApp: el equipo crea y edita hasta
// MAX_PLANTILLAS. Al enviarlas a revisión, Meta las aprueba antes de usarlas.

const ESTADO: Record<PlantillaWA["estado"], string> = {
  Borrador: "bg-slate-100 text-slate-600",
  "En revisión": "bg-amber-50 text-amber-700",
  Aprobada: "bg-emerald-50 text-emerald-700",
};

const vacia = (): PlantillaWA => ({
  id: `w${Date.now()}`,
  nombre: "",
  categoria: "UTILITY",
  cuerpo: "",
  ejemplos: [],
  botones: [],
  estado: "Borrador",
  actualizada: "Hoy",
});

/** Variables {{n}} que usa el cuerpo, en orden. */
const variables = (t: string) => [...new Set([...t.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);

const rellenar = (t: string, ej: string[]) => t.replace(/\{\{(\d+)\}\}/g, (_, n) => ej[Number(n) - 1] || `{{${n}}}`);

/** Lo que Meta rechazaría: se muestra antes de enviar. */
function problemas(p: PlantillaWA, otras: PlantillaWA[]) {
  const out: string[] = [];
  if (!/^[a-z0-9_]{3,60}$/.test(p.nombre)) out.push("El nombre solo puede llevar minúsculas, números y guion bajo (3 a 60 caracteres).");
  if (otras.some((o) => o.id !== p.id && o.nombre === p.nombre)) out.push("Ya hay una plantilla con ese nombre.");
  if (!p.cuerpo.trim()) out.push("Escribe el cuerpo del mensaje.");
  if (p.cuerpo.length > 1024) out.push("El cuerpo pasa de 1,024 caracteres.");
  const vs = variables(p.cuerpo);
  if (vs.some((v, i) => v !== i + 1)) out.push("Las variables deben ir en orden: {{1}}, {{2}}, {{3}}…");
  if (vs.some((v) => !p.ejemplos[v - 1]?.trim())) out.push("Cada variable necesita un ejemplo.");
  if (/^\s*\{\{\d+\}\}|\{\{\d+\}\}\s*$/.test(p.cuerpo.trim())) out.push("El cuerpo no puede empezar ni terminar con una variable.");
  if (p.categoria === "MARKETING" && !p.botones.some((b) => /no recibir/i.test(b))) out.push("Las de marketing necesitan el botón «No recibir más».");
  return out;
}

export default function PlantillasPage() {
  const { plantillas, guardarPlantilla, eliminarPlantilla } = useStore();
  const [editando, setEditando] = useState<PlantillaWA | null>(plantillas[0] ?? null);
  const [aviso, setAviso] = useState<string | null>(null);
  const lleno = plantillas.length >= MAX_PLANTILLAS;

  const nueva = () => {
    if (lleno) return;
    setEditando(vacia());
    setAviso(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader
        title="Plantillas de WhatsApp"
        sub={`Crea y edita los mensajes que MIA puede enviar primero o fuera de la ventana de 24 h. Máximo ${MAX_PLANTILLAS} guardadas.`}
      />
      <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* Lista */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-bold">Guardadas</p>
              <span className={cn("text-[12.5px] font-bold tabular-nums", lleno ? "text-amber-700" : "text-[var(--text-2)]")}>
                {plantillas.length} / {MAX_PLANTILLAS}
              </span>
            </div>
            <div className="mt-2 flex gap-1" aria-hidden>
              {Array.from({ length: MAX_PLANTILLAS }, (_, i) => (
                <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < plantillas.length ? "bg-brand" : "bg-surface-2")} />
              ))}
            </div>
            <button
              type="button"
              onClick={nueva}
              disabled={lleno}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-[13px] font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={15} /> Nueva plantilla
            </button>
            {lleno && (
              <p className="mt-2 flex items-start gap-1.5 text-[11.5px] text-amber-800">
                <Lock size={12} className="mt-0.5 shrink-0" /> Llegaste al límite de {MAX_PLANTILLAS}. Elimina una para crear otra.
              </p>
            )}
          </div>

          {plantillas.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setEditando(p);
                setAviso(null);
              }}
              className={cn("w-full rounded-2xl border bg-card p-3.5 text-left shadow-sm transition", editando?.id === p.id ? "border-brand ring-1 ring-brand" : "border-line hover:border-brand/40")}
            >
              <code className="block truncate text-[13px] font-bold">{p.nombre}</code>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-bold", p.categoria === "UTILITY" ? "bg-sky-50 text-sky-700" : "bg-fuchsia-50 text-fuchsia-700")}>
                  {p.categoria === "UTILITY" ? "Utilidad" : "Marketing"}
                </span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", ESTADO[p.estado])}>{p.estado}</span>
                <span className="ml-auto text-[11px] text-[var(--text-3)]">{p.actualizada}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-[12px] text-[var(--text-2)]">{p.cuerpo}</p>
            </button>
          ))}
          {editando && !plantillas.some((p) => p.id === editando.id) && (
            <div className="rounded-2xl border-2 border-dashed border-brand/50 bg-brand/5 p-3.5 text-[12.5px] font-semibold text-brand">Nueva plantilla (sin guardar)</div>
          )}
        </div>

        {/* Editor */}
        {editando ? (
          <Editor
            key={editando.id}
            inicial={editando}
            otras={plantillas}
            onGuardar={(p, msg) => {
              if (!guardarPlantilla(p)) {
                setAviso(`No se guardó: ya tienes ${MAX_PLANTILLAS} plantillas.`);
                return;
              }
              setEditando(p);
              setAviso(msg);
            }}
            onEliminar={(id) => {
              eliminarPlantilla(id);
              const resto = plantillas.filter((x) => x.id !== id);
              setEditando(resto[0] ?? null);
              setAviso("Plantilla eliminada.");
            }}
            guardada={plantillas.some((p) => p.id === editando.id)}
            aviso={aviso}
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line p-10 text-center text-[13px] text-[var(--text-3)]">
            <FileText size={28} className="mb-2 opacity-50" />
            No hay plantillas. Crea la primera.
          </div>
        )}
      </div>
    </div>
  );
}

function Editor({
  inicial,
  otras,
  onGuardar,
  onEliminar,
  guardada,
  aviso,
}: {
  inicial: PlantillaWA;
  otras: PlantillaWA[];
  onGuardar: (p: PlantillaWA, msg: string) => void;
  onEliminar: (id: string) => void;
  guardada: boolean;
  aviso: string | null;
}) {
  const [p, setP] = useState<PlantillaWA>(inicial);
  const set = <K extends keyof PlantillaWA>(k: K, v: PlantillaWA[K]) => setP((x) => ({ ...x, [k]: v }));
  const vs = variables(p.cuerpo);
  const errores = problemas(p, otras);
  const cambio = JSON.stringify(p) !== JSON.stringify(inicial);
  const campo = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-brand";

  const guardar = (estado: PlantillaWA["estado"]) => {
    if (estado !== "Borrador" && errores.length) return;
    if (estado === "Borrador" && !p.nombre.trim()) return;
    onGuardar(
      { ...p, estado, actualizada: "Hoy", encabezado: p.encabezado?.trim() || undefined, pie: p.pie?.trim() || undefined, botones: p.botones.map((b) => b.trim()).filter(Boolean) },
      estado === "Borrador" ? "Guardada como borrador." : "Enviada a revisión de Meta. Suele tardar de minutos a 24 h.",
    );
  };

  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="space-y-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[15px] font-bold">{guardada ? "Editar plantilla" : "Nueva plantilla"}</p>
          {guardada && (
            <button type="button" onClick={() => onEliminar(p.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-rose-600 hover:bg-rose-50">
              <Trash2 size={14} /> Eliminar
            </button>
          )}
        </div>
        {inicial.estado === "Aprobada" && cambio && (
          <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" /> Esta plantilla está aprobada. Si la cambias, vuelve a revisión de Meta y no se puede usar hasta que la aprueben.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <Campo label="Nombre" ayuda="Minúsculas y guion bajo, p. ej. recordatorio_vacuna">
            <input value={p.nombre} onChange={(e) => set("nombre", e.target.value.toLowerCase().replace(/\s+/g, "_"))} className={cn(campo, "font-mono")} placeholder="recordatorio_vacuna" />
          </Campo>
          <Campo label="Categoría">
            <div className="inline-flex w-full rounded-lg border border-line bg-surface p-0.5">
              {(["UTILITY", "MARKETING"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("categoria", c)}
                  className={cn("flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-semibold", p.categoria === c ? "bg-card text-[var(--text)] shadow-sm" : "text-[var(--text-3)]")}
                >
                  {c === "UTILITY" ? "Utilidad" : "Marketing"}
                </button>
              ))}
            </div>
          </Campo>
        </div>
        <p className="-mt-1 text-[11.5px] text-[var(--text-3)]">
          {p.categoria === "UTILITY" ? "Utilidad: citas, recordatorios, avisos. Sin promociones (Meta la reclasifica)." : "Marketing: reactivación y campañas. Lleva el botón «No recibir más»."}
        </p>

        <Campo label="Encabezado (opcional)" ayuda={`${(p.encabezado ?? "").length}/60`}>
          <input value={p.encabezado ?? ""} onChange={(e) => set("encabezado", e.target.value.slice(0, 60))} className={campo} placeholder="Ej. Recordatorio de cita" />
        </Campo>

        <Campo label="Cuerpo" ayuda={`${p.cuerpo.length}/1024`}>
          <textarea value={p.cuerpo} onChange={(e) => set("cuerpo", e.target.value.slice(0, 1024))} rows={5} className={campo} placeholder="Hola {{1}}, te recordamos la cita de {{2}}…" />
          <button
            type="button"
            onClick={() => set("cuerpo", `${p.cuerpo}${p.cuerpo && !p.cuerpo.endsWith(" ") ? " " : ""}{{${vs.length + 1}}}`)}
            className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 font-mono text-[11.5px] text-[var(--text-2)] hover:bg-surface-2"
          >
            <Plus size={12} /> {`{{${vs.length + 1}}}`}
          </button>
        </Campo>

        {vs.length > 0 && (
          <Campo label="Ejemplos de las variables" ayuda="Meta los pide para revisar la plantilla">
            <div className="grid gap-2 sm:grid-cols-2">
              {vs.map((v) => (
                <label key={v} className="flex items-center gap-2">
                  <code className="w-10 shrink-0 text-[12px] text-[var(--text-3)]">{`{{${v}}}`}</code>
                  <input
                    value={p.ejemplos[v - 1] ?? ""}
                    onChange={(e) => {
                      const ej = [...p.ejemplos];
                      ej[v - 1] = e.target.value;
                      set("ejemplos", ej);
                    }}
                    className={campo}
                    placeholder={v === 1 ? "Ej. Sofía" : v === 2 ? "Ej. Mishi" : "Ejemplo"}
                  />
                </label>
              ))}
            </div>
          </Campo>
        )}

        <Campo label="Pie (opcional)" ayuda={`${(p.pie ?? "").length}/60`}>
          <input value={p.pie ?? ""} onChange={(e) => set("pie", e.target.value.slice(0, 60))} className={campo} placeholder={`${CLINICA.corto} · ${CLINICA.ciudad}`} />
        </Campo>

        <Campo label={`Botones de respuesta rápida · ${p.botones.length}/3`}>
          <div className="space-y-1.5">
            {p.botones.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={b} onChange={(e) => set("botones", p.botones.map((x, j) => (j === i ? e.target.value.slice(0, 25) : x)))} className={campo} placeholder="Texto del botón" />
                <button type="button" onClick={() => set("botones", p.botones.filter((_, j) => j !== i))} aria-label="Quitar botón" className="rounded-lg p-1.5 text-[var(--text-3)] hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {p.botones.length < 3 && (
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => set("botones", [...p.botones, ""])} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-line px-2.5 py-1 text-[12px] font-semibold text-[var(--text-2)] hover:bg-surface">
                  <Plus size={13} /> Agregar botón
                </button>
                {p.categoria === "MARKETING" && !p.botones.some((b) => /no recibir/i.test(b)) && (
                  <button type="button" onClick={() => set("botones", [...p.botones, "No recibir más"])} className="rounded-lg bg-fuchsia-50 px-2.5 py-1 text-[12px] font-semibold text-fuchsia-700 hover:bg-fuchsia-100">
                    + «No recibir más»
                  </button>
                )}
              </div>
            )}
          </div>
        </Campo>

        {errores.length > 0 && (
          <ul className="space-y-1 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
            {errores.map((e) => (
              <li key={e} className="flex items-start gap-1.5">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {e}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => guardar("Borrador")}
            disabled={!p.nombre.trim() || (!cambio && guardada)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-[13px] font-semibold hover:bg-surface disabled:opacity-40"
          >
            <Save size={15} /> Guardar borrador
          </button>
          <button
            type="button"
            onClick={() => guardar("En revisión")}
            disabled={errores.length > 0 || (!cambio && guardada && inicial.estado !== "Borrador")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1ba34d] px-3.5 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={15} /> Guardar y enviar a Meta
          </button>
          {aviso && (
            <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-emerald-700">
              <CheckCircle2 size={14} /> {aviso}
            </span>
          )}
        </div>
      </section>

      {/* Vista previa */}
      <div className="space-y-2 2xl:sticky 2xl:top-0 2xl:self-start">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">Vista previa</p>
        <div className="rounded-2xl bg-[#e7ddd3] p-4 shadow-sm">
          <div className="max-w-[290px] rounded-2xl rounded-tl-md bg-white p-3 text-[13px] leading-snug text-[#111b21] shadow-sm">
            <p className="mb-1 flex items-center gap-1 text-[11px] font-bold text-[#1ba34d]">
              <WhatsappIcon size={12} /> {CLINICA.nombre}
            </p>
            {p.encabezado && <p className="mb-1 font-bold">{p.encabezado}</p>}
            <p className="whitespace-pre-line">{p.cuerpo ? rellenar(p.cuerpo, p.ejemplos) : <span className="text-[#667781]">El mensaje aparece aquí.</span>}</p>
            {p.pie && <p className="mt-1.5 text-[11.5px] text-[#667781]">{p.pie}</p>}
            <p className="mt-0.5 text-right text-[10px] text-[#667781]">10:00</p>
          </div>
          <div className="mt-1 max-w-[290px] space-y-1">
            {p.botones.filter((b) => b.trim()).map((b, i) => (
              <div key={i} className="rounded-xl bg-white py-2 text-center text-[13px] font-semibold text-[#027eb5] shadow-sm">
                {b}
              </div>
            ))}
          </div>
        </div>
        <p className="flex items-start gap-1.5 rounded-xl bg-surface p-2.5 text-[11.5px] text-[var(--text-3)]">
          <Info size={13} className="mt-0.5 shrink-0" />
          Las variables se llenan con los datos de cada cliente al enviar. Si el cliente escribió en las últimas 24 h, MIA responde con texto libre y no usa plantilla.
        </p>
      </div>
    </div>
  );
}

function Campo({ label, ayuda, children }: { label: string; ayuda?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">{label}</p>
        {ayuda && <p className="text-[11px] text-[var(--text-3)]">{ayuda}</p>}
      </div>
      {children}
    </div>
  );
}
