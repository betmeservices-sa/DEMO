"use client";

// Plantillas de WhatsApp de un hotel de muestra: hasta cinco, para tener,
// crear y modificar. Como el resto de la muestra, se guardan en el navegador
// (localStorage, con la llave de ESE panel) y no se mandan a Meta: una
// plantilla nueva o editada pasa unos segundos "En revisión" y queda aprobada,
// para enseñar el ciclo sin depender de nadie.

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Clock, MessageSquareText, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { activeTenantId } from "@/lib/tenants/active";
import { hotelMuestraDe } from "@/lib/hotel-muestra/registro";
import type { PlantillaSemilla } from "@/lib/hotel-muestra/tipos";

const TENANT = activeTenantId();
const LLAVE = `ccg.plantillas.${TENANT}`;
const MAXIMO = 5;
/** Lo que dura "En revisión" una plantilla nueva o editada. */
const REVISION_MS = 8_000;

interface Plantilla extends PlantillaSemilla {
  /** ISO de la última vez que se guardó. Sin esto, viene aprobada de la muestra. */
  enviada?: string;
}

type PlantillaNueva = Omit<Plantilla, "id" | "enviada">;

const VACIA: PlantillaNueva = { nombre: "", categoria: "UTILITY", encabezado: "", cuerpo: "", pie: "", ejemplos: [] };

const CATEGORIA: Record<Plantilla["categoria"], string> = { UTILITY: "Utilidad", MARKETING: "Marketing" };

const input =
  "w-full rounded-xl border border-line bg-surface px-3 py-2 text-[13px] text-[var(--text)] outline-none transition focus:border-brand focus:bg-card";
const etiqueta = "mb-1 block text-[11.5px] font-semibold text-[var(--text-2)]";

function leer(): Plantilla[] {
  const semilla = hotelMuestraDe(TENANT)?.plantillas ?? [];
  try {
    const crudo = window.localStorage.getItem(LLAVE);
    if (crudo) return JSON.parse(crudo) as Plantilla[];
  } catch {
    // Sin almacenamiento (ventana privada): se trabaja con la muestra.
  }
  return semilla.map((p) => ({ ...p }));
}

function escribir(lista: Plantilla[]) {
  try {
    window.localStorage.setItem(LLAVE, JSON.stringify(lista));
  } catch {
    // Igual queda en pantalla mientras no se recargue.
  }
}

/** Cuántas variables usa el cuerpo: la más alta de {{1}}, {{2}}... */
function variablesDe(cuerpo: string): number {
  let max = 0;
  for (const m of cuerpo.matchAll(/\{\{(\d+)\}\}/g)) max = Math.max(max, Number(m[1]));
  return max;
}

/** Como lo pide Meta: minúsculas, números y guiones bajos. */
function nombreValido(n: string): string {
  return n
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function conEjemplos(cuerpo: string, ejemplos: string[]): string {
  return cuerpo.replace(/\{\{(\d+)\}\}/g, (todo, n) => ejemplos[Number(n) - 1]?.trim() || todo);
}

function enRevision(p: Plantilla, ahora: number): boolean {
  return Boolean(p.enviada) && ahora - Date.parse(p.enviada as string) < REVISION_MS;
}

export default function PlantillasPage() {
  const [lista, setLista] = useState<Plantilla[]>([]);
  const [editando, setEditando] = useState<string | "nueva" | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    setLista(leer());
  }, []);

  // Mientras haya alguna en revisión, el reloj avanza para que pase sola a aprobada.
  const hayEnRevision = lista.some((p) => enRevision(p, ahora));
  useEffect(() => {
    if (!hayEnRevision) return;
    const t = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [hayEnRevision]);

  function guardar(v: PlantillaNueva, id?: string) {
    const limpia: Plantilla = {
      ...v,
      id: id ?? `pl-${Math.random().toString(36).slice(2, 9)}`,
      nombre: nombreValido(v.nombre),
      encabezado: v.encabezado?.trim() || undefined,
      pie: v.pie?.trim() || undefined,
      cuerpo: v.cuerpo.trim(),
      ejemplos: v.ejemplos.slice(0, variablesDe(v.cuerpo)),
      enviada: new Date().toISOString(),
    };
    const nueva = id ? lista.map((p) => (p.id === id ? limpia : p)) : [...lista, limpia];
    setLista(nueva);
    escribir(nueva);
    setAhora(Date.now());
    setEditando(null);
  }

  function borrar(p: Plantilla) {
    if (!window.confirm(`¿Eliminar la plantilla "${p.nombre}"?`)) return;
    const nueva = lista.filter((x) => x.id !== p.id);
    setLista(nueva);
    escribir(nueva);
  }

  const llena = lista.length >= MAXIMO;

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-5 py-3">
        <div>
          <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Plantillas WhatsApp</h1>
          <p className="text-[12.5px] text-[var(--text-3)]">
            Los mensajes aprobados para escribirle a un huésped fuera de la ventana de 24 horas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12.5px] font-semibold text-[var(--text-3)]">
            {lista.length} de {MAXIMO}
          </span>
          <button
            type="button"
            disabled={llena || editando === "nueva"}
            onClick={() => setEditando("nueva")}
            title={llena ? `Máximo ${MAXIMO} plantillas: borre o edite una` : undefined}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-[13px] font-bold text-white shadow-sm shadow-brand/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={15} />
            Nueva plantilla
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {llena && editando !== "nueva" && (
          <p className="flex items-start gap-2 rounded-xl border border-[var(--brand-accent)]/45 bg-[var(--brand-accent)]/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[var(--text-2)]">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-[var(--brand-accent)]" />
            Ya tiene las {MAXIMO} plantillas del plan. Para sumar otra, edite o borre una de las que tiene.
          </p>
        )}

        {editando === "nueva" && (
          <Formulario titulo="Nueva plantilla" inicial={VACIA} onCancelar={() => setEditando(null)} onGuardar={(v) => guardar(v)} />
        )}

        {lista.length === 0 && editando !== "nueva" ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-2)] bg-card p-8 text-center">
            <MessageSquareText size={26} className="mx-auto text-[var(--text-3)]" />
            <p className="mt-3 text-[13.5px] font-bold text-[var(--text)]">Todavía no hay plantillas</p>
            <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-[var(--text-3)]">
              Cree hasta {MAXIMO}: confirmaciones de reserva, recordatorios de llegada o promociones.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {lista.map((p) =>
              editando === p.id ? (
                <Formulario
                  key={p.id}
                  titulo="Editar plantilla"
                  inicial={p}
                  onCancelar={() => setEditando(null)}
                  onGuardar={(v) => guardar(v, p.id)}
                />
              ) : (
                <Tarjeta
                  key={p.id}
                  plantilla={p}
                  revision={enRevision(p, ahora)}
                  onEditar={() => setEditando(p.id)}
                  onBorrar={() => borrar(p)}
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Tarjeta({
  plantilla,
  revision,
  onEditar,
  onBorrar,
}: {
  plantilla: Plantilla;
  revision: boolean;
  onEditar: () => void;
  onBorrar: () => void;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-mono text-[13.5px] font-bold text-[var(--text)]">{plantilla.nombre}</h2>
          <p className="mt-0.5 text-[12px] text-[var(--text-3)]">
            {CATEGORIA[plantilla.categoria]} · Español · {variablesDe(plantilla.cuerpo)} variable
            {variablesDe(plantilla.cuerpo) === 1 ? "" : "s"}
          </p>
        </div>
        <Estado revision={revision} />
      </div>

      <div className="mt-3 flex-1">
        <VistaPrevia plantilla={plantilla} />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onEditar}
          className="ml-auto rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-2)] transition hover:bg-surface"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onBorrar}
          aria-label={`Borrar ${plantilla.nombre}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-3)] transition hover:bg-[var(--brand-red)]/10 hover:text-[var(--brand-red)]"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}

function Estado({ revision }: { revision: boolean }) {
  return revision ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--brand-accent)]/12 px-2.5 py-0.5 text-[11.5px] font-bold text-[var(--brand-accent)]">
      <Clock size={12} />
      En revisión
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--brand-green)]/12 px-2.5 py-0.5 text-[11.5px] font-bold text-[var(--brand-green)]">
      <Check size={12} />
      Aprobada
    </span>
  );
}

/** El mensaje como le llega al huésped, con los valores de ejemplo puestos. */
function VistaPrevia({ plantilla }: { plantilla: PlantillaNueva }) {
  const cuerpo = conEjemplos(plantilla.cuerpo, plantilla.ejemplos);
  return (
    <div className="rounded-xl bg-[#e7ddd3] p-3">
      <div className="max-w-[92%] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
        {plantilla.encabezado?.trim() && (
          <p className="text-[13px] font-bold text-[#111b21]">{plantilla.encabezado}</p>
        )}
        <p className="whitespace-pre-wrap text-[13px] leading-snug text-[#111b21]">
          {cuerpo || <span className="text-[#667781]">El texto del mensaje aparece acá.</span>}
        </p>
        {plantilla.pie?.trim() && <p className="mt-1 text-[11.5px] text-[#667781]">{plantilla.pie}</p>}
        <p className="mt-0.5 text-right text-[10.5px] text-[#667781]">10:24 a. m.</p>
      </div>
    </div>
  );
}

function Formulario({
  titulo,
  inicial,
  onCancelar,
  onGuardar,
}: {
  titulo: string;
  inicial: PlantillaNueva;
  onCancelar: () => void;
  onGuardar: (v: PlantillaNueva) => void;
}) {
  const [v, setV] = useState<PlantillaNueva>({ ...inicial, ejemplos: [...inicial.ejemplos] });
  const n = variablesDe(v.cuerpo);
  const ejemplos = useMemo(() => Array.from({ length: n }, (_, i) => v.ejemplos[i] ?? ""), [n, v.ejemplos]);

  const faltan: string[] = [];
  if (!nombreValido(v.nombre)) faltan.push("el nombre");
  if (!v.cuerpo.trim()) faltan.push("el texto");
  if (ejemplos.some((e) => !e.trim())) faltan.push("un ejemplo para cada variable");

  function set<K extends keyof PlantillaNueva>(k: K, valor: PlantillaNueva[K]) {
    setV((x) => ({ ...x, [k]: valor }));
  }

  function insertarVariable() {
    set("cuerpo", `${v.cuerpo}${v.cuerpo && !v.cuerpo.endsWith(" ") ? " " : ""}{{${n + 1}}}`);
  }

  return (
    <section className="rounded-2xl border border-brand/45 bg-card p-5 shadow-sm xl:col-span-2">
      <div className="flex items-center justify-between">
        <h2 className="text-[14.5px] font-bold text-[var(--text)]">{titulo}</h2>
        <button
          type="button"
          onClick={onCancelar}
          aria-label="Cancelar"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-3)] transition hover:bg-surface"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className={etiqueta}>Nombre</span>
              <input
                className={cn(input, "font-mono")}
                value={v.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                placeholder="confirmacion_reserva"
              />
              {v.nombre && nombreValido(v.nombre) !== v.nombre && (
                <span className="mt-1 block text-[11px] text-[var(--text-3)]">Se guarda como {nombreValido(v.nombre) || "…"}</span>
              )}
            </label>
            <label>
              <span className={etiqueta}>Categoría</span>
              <select
                className={input}
                value={v.categoria}
                onChange={(e) => set("categoria", e.target.value as PlantillaNueva["categoria"])}
              >
                <option value="UTILITY">Utilidad (reservas, recordatorios)</option>
                <option value="MARKETING">Marketing (promociones)</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className={etiqueta}>Encabezado (opcional)</span>
            <input className={input} maxLength={60} value={v.encabezado ?? ""} onChange={(e) => set("encabezado", e.target.value)} />
          </label>

          <label className="block">
            <span className={cn(etiqueta, "flex items-center justify-between")}>
              Texto del mensaje
              <span className="font-normal text-[var(--text-3)]">{v.cuerpo.length} / 1024</span>
            </span>
            <textarea
              className={cn(input, "min-h-[110px] resize-y")}
              maxLength={1024}
              value={v.cuerpo}
              onChange={(e) => set("cuerpo", e.target.value)}
              placeholder="Hola {{1}}, su reserva en Capitán Hawk quedó confirmada…"
            />
          </label>
          <button
            type="button"
            onClick={insertarVariable}
            className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-2)] transition hover:bg-surface"
          >
            + Agregar variable {`{{${n + 1}}}`}
          </button>

          {n > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ejemplos.map((e, i) => (
                <label key={i}>
                  <span className={etiqueta}>Ejemplo de {`{{${i + 1}}}`}</span>
                  <input
                    className={input}
                    value={e}
                    onChange={(ev) => {
                      const nuevos = [...ejemplos];
                      nuevos[i] = ev.target.value;
                      set("ejemplos", nuevos);
                    }}
                  />
                </label>
              ))}
            </div>
          )}

          <label className="block">
            <span className={etiqueta}>Pie (opcional)</span>
            <input className={input} maxLength={60} value={v.pie ?? ""} onChange={(e) => set("pie", e.target.value)} />
          </label>
        </div>

        <div>
          <span className={etiqueta}>Así lo ve el huésped</span>
          <VistaPrevia plantilla={{ ...v, ejemplos }} />
          <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--text-3)]">
            Al guardar queda unos segundos en revisión, como cuando Meta la aprueba.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        {faltan.length > 0 && <span className="mr-auto text-[12px] text-[var(--text-3)]">Falta {faltan.join(", ")}.</span>}
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-xl border border-line bg-card px-3.5 py-2 text-[13px] font-semibold text-[var(--text-2)] transition hover:bg-surface"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={faltan.length > 0}
          onClick={() => onGuardar({ ...v, ejemplos })}
          className="rounded-xl bg-brand px-3.5 py-2 text-[13px] font-bold text-white shadow-sm shadow-brand/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Guardar plantilla
        </button>
      </div>
    </section>
  );
}
