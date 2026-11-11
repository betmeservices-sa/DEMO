"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, FileUp, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { ALERGENOS, RECETARIO } from "@/lib/nutricion/cocina";
import { useStore } from "@/lib/nutricion/store";
import type { Alergeno, Plato } from "@/lib/nutricion/types";
import { Card, PageHeader } from "@/components/nutricion/ui";
import { EditorPlato } from "@/components/nutricion/EditorPlato";

// El menú de la casa: desayunos, almuerzos y cenas (y las meriendas), cada
// plato con su proteína, carbohidrato, vegetales y grasa, y los alérgenos que
// controla la cocina. Se sube o actualiza con un CSV en el mismo formato.

const TIPOS: Plato["tiempo"][] = ["Desayuno", "Almuerzo", "Cena", "Merienda"];
const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const PLANTILLA = [
  "tiempo,numero,nombre,proteina,carbohidrato,vegetales,grasa,contiene,insumos",
  'Desayuno,9,Avena cocida con manzana,Leche descremada,Avena (½ taza),Manzana en cubos,Nueces (5 unidades),lacteos|gluten|nueces,"Leche:200:ml|Avena:40:g|Manzana:1:u|Nueces:5:u"',
  'Almuerzo,9,Pollo al limón con puré de papa,Pechuga de pollo,Puré de papa,Ensalada verde,Aceite de oliva,,"Pechuga de pollo:130:g|Papa:150:g|Lechuga:40:g|Aceite de oliva:5:ml"',
  "Cena,9,Omelette de claras con hongos,Claras de huevo,1 tortilla de maíz,Hongos y espinaca,¼ aguacate,huevo,Claras de huevo:4:u|Tortilla de maíz:1:u|Hongos:50:g|Espinaca:30:g|Aguacate:0.25:u",
].join("\n");

/** Lee un CSV respetando comillas (los campos con coma van entre comillas). */
function leerCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (comillas) {
      if (ch === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (ch === '"') comillas = false;
      else campo += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === "," || ch === ";") {
      fila.push(campo);
      campo = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo);
      if (fila.some((c) => c.trim())) filas.push(fila);
      fila = [];
      campo = "";
    } else campo += ch;
  }
  fila.push(campo);
  if (fila.some((c) => c.trim())) filas.push(fila);
  return filas;
}

type Fila = { plato?: Plato; errores: string[]; linea: number; nuevo: boolean };

/** Convierte las filas del CSV en platos, con los errores de cada una. */
function interpretar(texto: string): Fila[] {
  const [cab, ...filas] = leerCsv(texto.replace(/^﻿/, ""));
  if (!cab) return [];
  const col = (n: string) => cab.findIndex((c) => norm(c) === n);
  const idx = {
    tiempo: col("tiempo"),
    numero: col("numero"),
    id: col("id"),
    nombre: col("nombre") >= 0 ? col("nombre") : col("menu"),
    proteina: col("proteina"),
    carbohidrato: col("carbohidrato"),
    vegetales: col("vegetales"),
    grasa: col("grasa"),
    contiene: col("contiene"),
    insumos: col("insumos"),
  };
  if (idx.nombre < 0 || idx.tiempo < 0) return [{ errores: ["La primera fila debe tener al menos las columnas tiempo y nombre."], linea: 1, nuevo: false }];
  const alergeno = (t: string) => (Object.keys(ALERGENOS) as Alergeno[]).find((a) => norm(a) === norm(t) || norm(ALERGENOS[a]) === norm(t));
  return filas.map((f, i) => {
    const v = (k: keyof typeof idx) => (idx[k] >= 0 ? (f[idx[k]] ?? "").trim() : "");
    const errores: string[] = [];
    const nombre = v("nombre");
    if (!nombre) errores.push("Falta el nombre.");
    const tiempo = TIPOS.find((t) => norm(v("tiempo")).startsWith(norm(t)));
    if (!tiempo) errores.push(`Tiempo «${v("tiempo")}» no válido: usa Desayuno, Almuerzo, Cena o Merienda.`);
    const numero = Number(v("numero")) || undefined;
    const contiene: Alergeno[] = [];
    for (const t of v("contiene").split("|").filter((x) => x.trim())) {
      const a = alergeno(t);
      if (a) contiene.push(a);
      else errores.push(`Alérgeno «${t.trim()}» desconocido.`);
    }
    const insumos: [string, number, string][] = [];
    for (const t of v("insumos").split("|").filter((x) => x.trim())) {
      const [nom, cant, uni = "g"] = t.split(":").map((x) => x.trim());
      const num = Number(cant?.replace(",", "."));
      if (!nom || !Number.isFinite(num) || num <= 0) errores.push(`Insumo «${t.trim()}» debe ser nombre:cantidad:unidad.`);
      else insumos.push([nom, num, uni]);
    }
    // El id sale del tiempo y el número (D9, A9, C9, m7…) si no viene.
    const id = v("id") || (tiempo && numero ? `${tiempo === "Merienda" ? "m" : tiempo[0]}${numero}` : `u${Date.now().toString(36)}${i}`);
    const existente = RECETARIO.find((x) => x.id === id);
    const componentes = v("proteina") || v("carbohidrato") ? { proteina: v("proteina"), carbohidrato: v("carbohidrato"), vegetales: v("vegetales"), grasa: v("grasa") } : existente?.componentes;
    const plato: Plato | undefined = errores.length
      ? undefined
      : { id, numero, nombre, tiempo: tiempo!, componentes, contiene, etiquetas: existente?.etiquetas ?? [], insumos: insumos.length ? insumos : (existente?.insumos ?? []) };
    return { plato, errores, linea: i + 2, nuevo: !existente };
  });
}

export default function MenusPage() {
  const { agregarPlatos, eliminarPlato, planesAlim, recetarioVersion, rol } = useStore();
  // Plato en edición: uno existente, o "nuevo" con el tiempo elegido.
  const [editando, setEditando] = useState<{ plato?: Plato; tiempo: Plato["tiempo"] } | null>(null);
  const [q, setQ] = useState("");
  const [sin, setSin] = useState<Alergeno[]>([]);
  const [carga, setCarga] = useState<{ archivo: string; filas: Fila[] } | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const lista = useMemo(
    () => RECETARIO.filter((x) => (!q.trim() || norm(x.nombre).includes(norm(q)) || norm(Object.values(x.componentes ?? {}).join(" ")).includes(norm(q))) && !x.contiene.some((a) => sin.includes(a))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, sin, recetarioVersion],
  );
  // Cuántos pacientes tienen cada plato entre sus opciones.
  const usos = (id: string) => planesAlim.filter((x) => Object.values(x.opciones).some((ids) => ids?.includes(id))).length;

  const leer = (f?: File) => {
    if (!f) return;
    setHecho(null);
    const r = new FileReader();
    r.onload = () => setCarga({ archivo: f.name, filas: interpretar(String(r.result)) });
    r.readAsText(f, "utf-8");
  };
  const validos = carga?.filas.filter((f) => f.plato) ?? [];
  const importar = () => {
    const nuevos = validos.filter((f) => f.nuevo).length;
    agregarPlatos(validos.map((f) => f.plato!));
    setHecho(`Se cargaron ${validos.length} platos (${nuevos} nuevos, ${validos.length - nuevos} actualizados). Ya aparecen para armar los planes y en cocina.`);
    setCarga(null);
  };
  const plantilla = () => {
    const url = URL.createObjectURL(new Blob(["﻿" + PLANTILLA], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_menu.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader
        title={rol === "chef" ? "Menús" : "Menús disponibles"}
        sub="El menú de la casa por tiempo de comida. De aquí la nutricionista arma el menú de cada cliente."
        right={
          <>
            <button type="button" onClick={() => setEditando({ tiempo: "Desayuno" })} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--consultas)] px-3 py-2 text-[13px] font-bold text-white hover:opacity-90">
              <Plus size={15} /> Agregar plato
            </button>
            <button type="button" onClick={plantilla} className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2 text-[13px] font-semibold hover:bg-surface">
              <Download size={15} /> Plantilla CSV
            </button>
            <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--entregas)] px-3 py-2 text-[13px] font-bold text-white hover:opacity-90">
              <FileUp size={15} /> Subir menú (CSV)
            </button>
            <input
              ref={input}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                leer(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </>
        }
      />
      <div className="space-y-5 p-4 sm:p-6">
        {hecho && <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-[13px] font-semibold text-emerald-700">✓ {hecho}</p>}

        {carga && (
          <Card
            title={
              <span className="flex items-center gap-2">
                <Upload size={16} /> Vista previa · {carga.archivo}
              </span>
            }
            sub={`${validos.length} de ${carga.filas.length} filas listas para cargar. Las filas con error no se cargan.`}
            action={
              <button type="button" onClick={() => setCarga(null)} aria-label="Cancelar" className="rounded-lg p-1 text-[var(--text-3)] hover:bg-surface">
                <X size={18} />
              </button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[12.5px]">
                <thead className="text-[10.5px] uppercase tracking-wider text-[var(--text-3)]">
                  <tr>
                    <th className="py-1.5 pr-2">Fila</th>
                    <th className="py-1.5 pr-2">Plato</th>
                    <th className="py-1.5 pr-2">Tiempo</th>
                    <th className="py-1.5 pr-2">Contiene</th>
                    <th className="py-1.5">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line align-top">
                  {carga.filas.map((f) => (
                    <tr key={f.linea}>
                      <td className="py-1.5 pr-2 tabular-nums text-[var(--text-3)]">{f.linea}</td>
                      <td className="py-1.5 pr-2 font-semibold">{f.plato ? `${f.plato.numero ? `${f.plato.numero}. ` : ""}${f.plato.nombre}` : "—"}</td>
                      <td className="py-1.5 pr-2">{f.plato?.tiempo ?? "—"}</td>
                      <td className="py-1.5 pr-2">{f.plato?.contiene.map((a) => ALERGENOS[a]).join(", ") || (f.plato ? "Nada" : "—")}</td>
                      <td className="py-1.5">
                        {f.errores.length ? (
                          <span className="flex items-start gap-1 text-rose-700">
                            <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {f.errores.join(" ")}
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-700">{f.nuevo ? "Nuevo" : "Actualiza el existente"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={importar} disabled={!validos.length} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--entregas)] px-4 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-40">
                <Upload size={15} /> Cargar {validos.length} platos
              </button>
            </div>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[200px] flex-1 items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 sm:max-w-xs">
            <Search size={14} className="text-[var(--text-3)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar plato o ingrediente" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" />
          </div>
          <span className="text-[12px] font-semibold text-[var(--text-3)]">Sin:</span>
          {(Object.keys(ALERGENOS) as Alergeno[]).map((a) => {
            const on = sin.includes(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() => setSin((xs) => (on ? xs.filter((x) => x !== a) : [...xs, a]))}
                aria-pressed={on}
                className={cn("rounded-full border px-2.5 py-0.5 text-[12px] font-semibold", on ? "border-rose-500 bg-rose-500 text-white" : "border-line bg-card text-[var(--text-2)] hover:bg-surface")}
              >
                {ALERGENOS[a]}
              </button>
            );
          })}
        </div>

        {TIPOS.map((t) => {
          const del = lista.filter((x) => x.tiempo === t).sort((a, b) => (a.numero ?? 99) - (b.numero ?? 99));
          if (!del.length) return null;
          return (
            <Card
              key={t}
              title={t === "Merienda" ? "Meriendas" : `${t}s`}
              sub={t === "Merienda" ? "Parte del plan de Premium y Two Meals (2 al día). No las prepara la cocina." : `${del.length} opciones`}
              action={
                <button type="button" onClick={() => setEditando({ tiempo: t })} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold hover:bg-surface">
                  <Plus size={13} /> Agregar {t === "Merienda" ? "merienda" : t.toLowerCase()}
                </button>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-[12.5px]">
                  <thead className="text-[10.5px] uppercase tracking-wider text-[var(--text-3)]">
                    <tr>
                      <th className="py-1.5 pr-2">#</th>
                      <th className="py-1.5 pr-2">Menú</th>
                      <th className="py-1.5 pr-2">Proteína</th>
                      <th className="py-1.5 pr-2">Carbohidrato</th>
                      <th className="py-1.5 pr-2">Vegetales</th>
                      <th className="py-1.5 pr-2">Grasa</th>
                      <th className="py-1.5 pr-2">Alérgenos</th>
                      <th className="py-1.5 pr-2">Pacientes</th>
                      <th className="py-1.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line align-top">
                    {del.map((x) => {
                      const n = usos(x.id);
                      return (
                        <tr key={x.id}>
                          <td className="py-2 pr-2 font-bold tabular-nums text-[var(--text-3)]">{x.numero ?? "—"}</td>
                          <td className="py-2 pr-2 font-bold">{x.nombre}</td>
                          <td className="py-2 pr-2">{x.componentes?.proteina ?? "—"}</td>
                          <td className="py-2 pr-2">{x.componentes?.carbohidrato ?? "—"}</td>
                          <td className="py-2 pr-2">{x.componentes?.vegetales ?? "—"}</td>
                          <td className="py-2 pr-2">{x.componentes?.grasa ?? "—"}</td>
                          <td className="py-2 pr-2">
                            {x.contiene.length ? (
                              <span className="flex flex-wrap gap-1">
                                {x.contiene.map((a) => (
                                  <span key={a} className="rounded bg-rose-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-rose-700">
                                    {ALERGENOS[a]}
                                  </span>
                                ))}
                              </span>
                            ) : (
                              <span className="text-[var(--text-3)]">Ninguno</span>
                            )}
                          </td>
                          <td className="py-2 pr-2 tabular-nums text-[var(--text-2)]" title="Pacientes que lo tienen entre sus opciones">
                            {n || "—"}
                          </td>
                          <td className="whitespace-nowrap py-2 text-right">
                            <button type="button" onClick={() => setEditando({ plato: x, tiempo: x.tiempo })} className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[12px] font-semibold hover:bg-surface">
                              <Pencil size={12} /> Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Eliminar «${x.nombre}» del menú?`)) {
                                  eliminarPlato(x.id);
                                  setHecho(`Se eliminó «${x.nombre}» del menú.`);
                                }
                              }}
                              disabled={n > 0}
                              title={n > 0 ? "Está en el plan de algún paciente: quítalo de sus planes primero" : "Eliminar del menú"}
                              aria-label={`Eliminar ${x.nombre}`}
                              className="ml-1 rounded-lg p-1.5 text-[var(--text-3)] hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
        {lista.length === 0 && <p className="py-8 text-center text-[13px] text-[var(--text-3)]">Ningún plato con estos filtros.</p>}
        {editando && (
          <EditorPlato
            plato={editando.plato}
            tiempo={editando.tiempo}
            cerrar={() => setEditando(null)}
            guardar={(pl, nuevo) => {
              agregarPlatos([pl]);
              setHecho(nuevo ? `Se agregó «${pl.nombre}» al menú.` : `Se actualizó «${pl.nombre}». Los planes y la cocina ya lo ven así.`);
              setEditando(null);
            }}
          />
        )}
        <p className="text-[11.5px] text-[var(--text-3)]">
          Formato del CSV: <code>tiempo,numero,nombre,proteina,carbohidrato,vegetales,grasa,contiene,insumos</code>. Alérgenos separados por «|» (lacteos, gluten, huevo, mani, nueces, soya, pescado, mariscos); insumos opcionales como <code>nombre:cantidad:unidad</code> separados por «|», para calcular la producción. Un plato con el mismo tiempo y número se actualiza.
        </p>
      </div>
    </div>
  );
}
