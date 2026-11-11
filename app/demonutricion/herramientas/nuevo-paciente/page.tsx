"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Save, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/nutricion/cn";
import { ALERGENOS } from "@/lib/nutricion/cocina";
import { fechaDe, iso } from "@/lib/nutricion/format";
import { useStore } from "@/lib/nutricion/store";
import type { Alergeno, Canal, Cliente } from "@/lib/nutricion/types";
import { Card, PageHeader } from "@/components/nutricion/ui";

// Perfil de un paciente nuevo, lo crea la nutricionista en la primera
// consulta. Las medidas quedan como evaluación inicial en su progreso.

/** Años cumplidos a hoy desde una fecha ISO. */
function edadDe(nacimiento: string): number | null {
  if (!nacimiento) return null;
  const [a, m, d] = nacimiento.split("-").map(Number);
  const hoy = fechaDe(0);
  let edad = hoy.getFullYear() - a;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) edad--;
  return edad >= 0 && edad < 120 ? edad : null;
}

const num = (t: string) => Number(t.replace(",", "."));

export default function NuevoPacientePage() {
  const router = useRouter();
  const { agregarCliente } = useStore();
  const [f, setF] = useState({
    nombre: "",
    telefono: "+503 ",
    correo: "",
    nacimiento: "",
    edad: "",
    sexo: "F" as "F" | "M",
    pesoKg: "",
    alturaCm: "",
    musculoKg: "",
    grasaPct: "",
    otras: "",
    objetivo: "",
    modalidad: "presencial" as Cliente["modalidad"],
    canal: "whatsapp" as Canal,
  });
  const [alergias, setAlergias] = useState<Alergeno[]>([]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  const edadCalc = edadDe(f.nacimiento);
  const edad = edadCalc ?? (f.edad ? Number(f.edad) : null);
  const imc = num(f.pesoKg) > 0 && num(f.alturaCm) > 0 ? num(f.pesoKg) / (num(f.alturaCm) / 100) ** 2 : null;
  const listo = f.nombre.trim().length > 2 && f.telefono.replace(/\D/g, "").length >= 11 && f.objetivo.trim() && edad !== null;

  const guardar = (siguiente: "ficha" | "plan") => {
    if (!listo) return;
    const id = `c${Date.now()}`;
    const otras = f.otras
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    agregarCliente(
      {
        id,
        nombre: f.nombre.trim(),
        telefono: f.telefono.trim(),
        correo: f.correo.trim(),
        canal: f.canal,
        edad: edad!,
        sexo: f.sexo,
        objetivo: f.objetivo.trim(),
        modalidad: f.modalidad,
        fechaNacimiento: f.nacimiento || undefined,
        alturaCm: num(f.alturaCm) || undefined,
        alergias,
        restricciones: [...alergias.map((a) => `Alergia: ${ALERGENOS[a].toLowerCase()}`), ...otras],
        etiquetas: ["Nuevo"],
      },
      { pesoKg: f.pesoKg.trim(), grasaPct: f.grasaPct.trim(), musculoKg: f.musculoKg.trim() },
    );
    router.push(siguiente === "plan" ? `/demonutricion/herramientas/planes?paciente=${id}` : `/demonutricion/pacientes/${id}`);
  };

  const campo = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-[var(--consultas)]";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader title="Nuevo paciente" sub="Perfil y medidas de la primera consulta. Las alergias pasan al plan de alimentación y a la cocina." />
      <div className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6">
        <Card title="Datos personales">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Nombre completo *">
              <input value={f.nombre} onChange={set("nombre")} placeholder="Ej. Laura Méndez" className={campo} autoFocus />
            </Campo>
            <Campo label="Teléfono (WhatsApp) *">
              <input value={f.telefono} onChange={set("telefono")} inputMode="tel" className={campo} />
            </Campo>
            <Campo label="Correo">
              <input value={f.correo} onChange={set("correo")} type="email" placeholder="nombre@correo.com" className={campo} />
            </Campo>
            <div className="grid grid-cols-[1fr_90px] gap-3">
              <Campo label="Fecha de nacimiento">
                <input value={f.nacimiento} onChange={set("nacimiento")} type="date" max={iso(fechaDe(0))} className={campo} />
              </Campo>
              <Campo label="Edad *">
                {edadCalc !== null ? (
                  <p className={cn(campo, "font-bold")}>{edadCalc} años</p>
                ) : (
                  <input value={f.edad} onChange={set("edad")} inputMode="numeric" placeholder="Años" className={campo} />
                )}
              </Campo>
            </div>
            <Campo label="Sexo">
              <Opciones valor={f.sexo} opciones={[["F", "Femenino"], ["M", "Masculino"]]} onChange={(v) => setF((x) => ({ ...x, sexo: v as "F" | "M" }))} />
            </Campo>
            <Campo label="Consulta">
              <Opciones valor={f.modalidad} opciones={[["presencial", "Presencial"], ["en_linea", "En línea"]]} onChange={(v) => setF((x) => ({ ...x, modalidad: v as Cliente["modalidad"] }))} />
            </Campo>
          </div>
        </Card>

        <Card title="Composición corporal" sub="Quedan como evaluación inicial en el progreso del paciente">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Campo label="Peso (kg)">
              <input value={f.pesoKg} onChange={set("pesoKg")} inputMode="decimal" placeholder="68.5" className={campo} />
            </Campo>
            <Campo label="Altura (cm)">
              <input value={f.alturaCm} onChange={set("alturaCm")} inputMode="decimal" placeholder="165" className={campo} />
            </Campo>
            <Campo label="Masa muscular (kg)">
              <input value={f.musculoKg} onChange={set("musculoKg")} inputMode="decimal" placeholder="25.0" className={campo} />
            </Campo>
            <Campo label="Grasa corporal (%)">
              <input value={f.grasaPct} onChange={set("grasaPct")} inputMode="decimal" placeholder="30.0" className={campo} />
            </Campo>
          </div>
          {imc !== null && (
            <p className="mt-3 text-[12.5px] text-[var(--text-2)]">
              IMC calculado: <b>{imc.toFixed(1)}</b> · solo como referencia; el plan se guía por la grasa corporal y la masa muscular.
            </p>
          )}
        </Card>

        <Card title="Alergias y objetivo">
          <Campo label="Alergias e intolerancias">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(ALERGENOS) as Alergeno[]).map((a) => {
                const on = alergias.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAlergias((xs) => (on ? xs.filter((x) => x !== a) : [...xs, a]))}
                    aria-pressed={on}
                    className={cn("rounded-full border px-3 py-1 text-[12.5px] font-semibold", on ? "border-rose-500 bg-rose-500 text-white" : "border-line text-[var(--text-2)] hover:bg-surface")}
                  >
                    {ALERGENOS[a]}
                  </button>
                );
              })}
            </div>
          </Campo>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Campo label="Otras restricciones (separadas por coma)">
              <input value={f.otras} onChange={set("otras")} placeholder="Vegetariana, bajo en azúcar…" className={campo} />
            </Campo>
            <Campo label="Objetivo *">
              <input value={f.objetivo} onChange={set("objetivo")} placeholder="Ej. Bajar grasa sin perder músculo" className={campo} />
            </Campo>
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[12px] text-[var(--text-3)]">
            <ShieldCheck size={13} /> Las medidas son internas: MIA no las comparte ni las explica al paciente.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => guardar("ficha")}
              disabled={!listo}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-4 py-2.5 text-[13.5px] font-bold hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save size={15} /> Guardar perfil
            </button>
            <button
              type="button"
              onClick={() => guardar("plan")}
              disabled={!listo}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--consultas)] px-4 py-2.5 text-[13.5px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ClipboardList size={15} /> Guardar y asignar plan
            </button>
          </div>
        </div>
      </div>
    </div>
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

function Opciones({ valor, opciones, onChange }: { valor: string; opciones: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex w-full rounded-lg border border-line bg-surface p-0.5">
      {opciones.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={cn("flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-semibold", valor === v ? "bg-[var(--consultas)] text-white" : "text-[var(--text-2)]")}>
          {l}
        </button>
      ))}
    </div>
  );
}
