"use client";

import { cn } from "@/lib/cn";
import {
  DEPARTAMENTOS_SV,
  DISC,
  HORARIOS,
  JORNADAS,
  MODALIDADES,
  NIVELES_INGLES,
  PAISES,
  SKILLS,
} from "@/lib/talento/catalogo";
import type { Requisitos } from "@/lib/talento/tipos";
import { Campo, INPUT, Pastillas } from "./ui";
import { Desplegable } from "@/components/ui/Desplegable";

const GRUPOS = [...new Set(SKILLS.map((s) => s.grupo))];
const NOMBRE_GRUPO: Record<string, string> = {
  Administracion: "Administración",
  Clientes: "Clientes y ventas",
  Marketing: "Marketing",
  Datos: "Datos",
  Legal: "Legal",
  Proyectos: "Proyectos",
  Finanzas: "Finanzas",
  Herramientas: "Herramientas",
};

/**
 * Cada skill se marca con un clic como requerida, con otro como deseable y
 * con el tercero se quita. Las requeridas pesan 35 del match y las deseables 10.
 */
export function EditorRequisitos({ valor, onChange }: { valor: Requisitos; onChange: (r: Requisitos) => void }) {
  const set = <K extends keyof Requisitos>(k: K, v: Requisitos[K]) => onChange({ ...valor, [k]: v });

  function ciclar(id: string) {
    if (valor.skills.includes(id)) {
      onChange({ ...valor, skills: valor.skills.filter((s) => s !== id), deseables: [...valor.deseables, id] });
    } else if (valor.deseables.includes(id)) {
      onChange({ ...valor, deseables: valor.deseables.filter((s) => s !== id) });
    } else {
      onChange({ ...valor, skills: [...valor.skills, id] });
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11.5px] font-bold text-[var(--text-2)]">Skills</span>
          <span className="flex items-center gap-3 text-[11px] text-[var(--text-3)]">
            <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-brand" /> Requerida</span>
            <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full border-2 border-[var(--brand-accent)]" /> Deseable</span>
          </span>
        </div>
        <div className="space-y-2">
          {GRUPOS.map((g) => (
            <div key={g} className="flex flex-wrap items-center gap-1.5">
              <span className="w-28 shrink-0 text-[11px] font-semibold text-[var(--text-3)]">{NOMBRE_GRUPO[g] ?? g}</span>
              {SKILLS.filter((s) => s.grupo === g).map((s) => {
                const req = valor.skills.includes(s.id);
                const des = valor.deseables.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => ciclar(s.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[12px] font-semibold transition",
                      req && "border-brand bg-brand text-white",
                      des && "border-2 border-[var(--brand-accent)] bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]",
                      !req && !des && "border-line bg-card text-[var(--text-2)] hover:bg-surface",
                    )}
                  >
                    {s.nombre}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo label="Inglés mínimo">
          <Desplegable
            valor={valor.ingles}
            opciones={NIVELES_INGLES.map((n) => ({ valor: n.id, etiqueta: n.nombre }))}
            onChange={(v) => set("ingles", v as Requisitos["ingles"])}
            etiquetaAria="Inglés mínimo"
          />
        </Campo>
        <Campo label="Años de experiencia">
          <input
            type="number"
            min={0}
            max={20}
            className={INPUT}
            value={valor.experiencia}
            onChange={(e) => set("experiencia", Math.max(0, Number(e.target.value) || 0))}
          />
        </Campo>
        <Campo label="Salario máximo (USD al mes)">
          <input
            type="number"
            min={0}
            step={50}
            className={INPUT}
            value={valor.salarioMax}
            onChange={(e) => set("salarioMax", Math.max(0, Number(e.target.value) || 0))}
          />
        </Campo>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Modalidad">
          <Pastillas opciones={MODALIDADES} valor={[valor.modalidad]} onChange={(v) =>
              onChange({
                ...valor,
                modalidad: v[0],
                departamento: v[0] === "remoto" ? undefined : valor.departamento ?? "San Salvador",
              })
            }
          />
        </Campo>
        {valor.modalidad === "remoto" ? (
          <Campo label="Países aceptados">
            <Pastillas opciones={PAISES} valor={valor.paises} onChange={(v) => set("paises", v)} multiple />
          </Campo>
        ) : (
          <Campo label="Oficina">
            <Desplegable
              valor={valor.departamento ?? "San Salvador"}
              opciones={DEPARTAMENTOS_SV.map((d) => ({ valor: d.nombre, etiqueta: d.nombre }))}
              onChange={(v) => set("departamento", v)}
              etiquetaAria="Departamento de la oficina"
            />
          </Campo>
        )}
        <Campo label="Jornada">
          <Pastillas opciones={JORNADAS} valor={[valor.jornada]} onChange={(v) => set("jornada", v[0])} />
        </Campo>
        <Campo label="Horario del cliente">
          <Pastillas opciones={HORARIOS} valor={[valor.horario]} onChange={(v) => set("horario", v[0])} />
        </Campo>
        <Campo label="Perfil DISC que encaja">
          <Pastillas opciones={DISC} valor={valor.disc} onChange={(v) => set("disc", v)} multiple />
        </Campo>
      </div>
    </div>
  );
}
