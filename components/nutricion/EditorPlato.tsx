"use client";

import { useState, type ReactNode } from "react";
import { Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { ALERGENOS, RECETARIO } from "@/lib/nutricion/cocina";
import type { Alergeno, Plato } from "@/lib/nutricion/types";
import { Modal } from "./ResumenConsulta";

// Formulario para agregar un plato al menú o editar uno existente: cómo se
// arma (proteína, carbohidrato, vegetales, grasa), sus alérgenos y los
// ingredientes por porción que usa la producción del día.

const TIPOS: Plato["tiempo"][] = ["Desayuno", "Almuerzo", "Cena", "Merienda"];
const ETIQUETAS: Plato["etiquetas"][number][] = ["Vegetariano", "Bajo en azúcar", "Alto en proteína"];
const UNIDADES = ["g", "ml", "u", "rebanadas", "dientes", "hojas"];
const prefijo = (t: Plato["tiempo"]) => (t === "Merienda" ? "m" : t[0]);

/** Siguiente número libre del tiempo (9 si ya hay 8 desayunos…). */
function siguiente(t: Plato["tiempo"]) {
  return Math.max(0, ...RECETARIO.filter((x) => x.tiempo === t).map((x) => x.numero ?? 0)) + 1;
}

export function EditorPlato({
  plato,
  tiempo: tiempoInicial,
  cerrar,
  guardar,
}: {
  plato?: Plato;
  tiempo: Plato["tiempo"];
  cerrar: () => void;
  guardar: (p: Plato, nuevo: boolean) => void;
}) {
  const nuevo = !plato;
  const [tiempo, setTiempo] = useState<Plato["tiempo"]>(plato?.tiempo ?? tiempoInicial);
  const [numero, setNumero] = useState(String(plato?.numero ?? siguiente(tiempoInicial)));
  const [nombre, setNombre] = useState(plato?.nombre ?? "");
  const [c, setC] = useState(plato?.componentes ?? { proteina: "", carbohidrato: "", vegetales: "", grasa: "" });
  const [contiene, setContiene] = useState<Alergeno[]>(plato?.contiene ?? []);
  const [etiquetas, setEtiquetas] = useState<Plato["etiquetas"]>(plato?.etiquetas ?? []);
  const [insumos, setInsumos] = useState<{ nombre: string; cant: string; unidad: string }[]>(
    plato?.insumos.length ? plato.insumos.map(([n, q, u]) => ({ nombre: n, cant: String(q), unidad: u })) : [{ nombre: "", cant: "", unidad: "g" }],
  );

  const id = plato?.id ?? `${prefijo(tiempo)}${numero}`;
  // Un plato nuevo no puede pisar a otro con el mismo tiempo y número.
  const choca = nuevo && RECETARIO.some((x) => x.id === id);
  const validos = insumos.filter((i) => i.nombre.trim() && Number(i.cant.replace(",", ".")) > 0);
  const listo = nombre.trim() && Number(numero) > 0 && !choca;

  const enviar = () => {
    if (!listo) return;
    guardar(
      {
        id,
        numero: Number(numero),
        nombre: nombre.trim(),
        tiempo,
        componentes: c.proteina || c.carbohidrato || c.vegetales || c.grasa ? { proteina: c.proteina.trim(), carbohidrato: c.carbohidrato.trim(), vegetales: c.vegetales.trim(), grasa: c.grasa.trim() } : undefined,
        contiene,
        etiquetas,
        insumos: validos.map((i) => [i.nombre.trim(), Number(i.cant.replace(",", ".")), i.unidad] as [string, number, string]),
      },
      nuevo,
    );
  };

  const campo = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-[var(--consultas)]";
  const editarInsumo = (i: number, cambio: Partial<(typeof insumos)[number]>) => setInsumos((xs) => xs.map((x, j) => (j === i ? { ...x, ...cambio } : x)));

  return (
    <Modal titulo={nuevo ? "Agregar plato al menú" : `Editar · ${plato.nombre}`} Icon={UtensilsCrossed} onClose={cerrar}>
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_90px] gap-3">
          <Campo label="Tiempo de comida">
            <select
              value={tiempo}
              disabled={!nuevo}
              onChange={(e) => {
                const t = e.target.value as Plato["tiempo"];
                setTiempo(t);
                setNumero(String(siguiente(t)));
              }}
              className={cn(campo, !nuevo && "opacity-60")}
            >
              {TIPOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Número">
            <input value={numero} onChange={(e) => setNumero(e.target.value.replace(/\D/g, ""))} inputMode="numeric" disabled={!nuevo} className={cn(campo, !nuevo && "opacity-60")} />
          </Campo>
        </div>
        {choca && <p className="text-[12px] font-semibold text-rose-700">Ya hay un {tiempo.toLowerCase()} número {numero}: usa otro número o edita ese plato.</p>}
        <Campo label="Nombre del plato *">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Omelette de vegetales con tortilla" className={campo} autoFocus />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Proteína">
            <input value={c.proteina} onChange={(e) => setC({ ...c, proteina: e.target.value })} placeholder="2 huevos" className={campo} />
          </Campo>
          <Campo label="Carbohidrato">
            <input value={c.carbohidrato} onChange={(e) => setC({ ...c, carbohidrato: e.target.value })} placeholder="1 tortilla de maíz" className={campo} />
          </Campo>
          <Campo label="Vegetales">
            <input value={c.vegetales} onChange={(e) => setC({ ...c, vegetales: e.target.value })} placeholder="Espinaca, tomate, cebolla" className={campo} />
          </Campo>
          <Campo label="Grasa">
            <input value={c.grasa} onChange={(e) => setC({ ...c, grasa: e.target.value })} placeholder="¼ aguacate" className={campo} />
          </Campo>
        </div>

        <div>
          <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">Alérgenos que contiene</span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ALERGENOS) as Alergeno[]).map((a) => {
              const on = contiene.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setContiene((xs) => (on ? xs.filter((x) => x !== a) : [...xs, a]))}
                  aria-pressed={on}
                  className={cn("rounded-full border px-3 py-1 text-[12.5px] font-semibold", on ? "border-rose-500 bg-rose-500 text-white" : "border-line text-[var(--text-2)] hover:bg-surface")}
                >
                  {ALERGENOS[a]}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">Etiquetas</span>
          <div className="flex flex-wrap gap-1.5">
            {ETIQUETAS.map((e) => {
              const on = etiquetas.includes(e);
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEtiquetas((xs) => (on ? xs.filter((x) => x !== e) : [...xs, e]))}
                  aria-pressed={on}
                  className={cn("rounded-full border px-3 py-1 text-[12.5px] font-semibold", on ? "border-[var(--consultas)] bg-[var(--consultas)] text-white" : "border-line text-[var(--text-2)] hover:bg-surface")}
                >
                  {e}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">Ingredientes por porción (para calcular la producción)</span>
          <div className="space-y-1.5">
            {insumos.map((i, k) => (
              <div key={k} className="flex items-center gap-1.5">
                <input value={i.nombre} onChange={(e) => editarInsumo(k, { nombre: e.target.value })} placeholder="Ingrediente" className={cn(campo, "min-w-0 flex-1")} />
                <input value={i.cant} onChange={(e) => editarInsumo(k, { cant: e.target.value })} inputMode="decimal" placeholder="Cant." className={cn(campo, "w-20")} />
                <select value={i.unidad} onChange={(e) => editarInsumo(k, { unidad: e.target.value })} className={cn(campo, "w-28")}>
                  {UNIDADES.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setInsumos((xs) => (xs.length > 1 ? xs.filter((_, j) => j !== k) : [{ nombre: "", cant: "", unidad: "g" }]))} aria-label="Quitar ingrediente" className="rounded-lg p-1.5 text-[var(--text-3)] hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setInsumos((xs) => [...xs, { nombre: "", cant: "", unidad: "g" }])} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand hover:underline">
              <Plus size={13} /> Agregar ingrediente
            </button>
          </div>
        </div>
        {!nuevo && <p className="rounded-lg bg-surface px-3 py-2 text-[11.5px] text-[var(--text-3)]">Los cambios se ven en los planes y en la producción. Las órdenes ya confirmadas conservan el nombre del plato, con los ingredientes nuevos.</p>}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={cerrar} className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold hover:bg-surface">
          Cancelar
        </button>
        <button type="button" onClick={enviar} disabled={!listo} className="rounded-lg bg-[var(--consultas)] px-3 py-1.5 text-[13px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
          {nuevo ? "Agregar al menú" : "Guardar cambios"}
        </button>
      </div>
    </Modal>
  );
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-[var(--text-2)]">{label}</span>
      {children}
    </label>
  );
}
