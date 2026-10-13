"use client";

// Lo que la clínica sabe de este contacto: los exámenes que se ha hecho, las
// facturas que pagó y lo que el doctor le dejó escrito. Se arma por teléfono
// desde el módulo del consultorio (lib/consultorio/historial.ts).

import { useEffect, useState } from "react";
import { FileText, FlaskConical, Receipt, StickyNote } from "lucide-react";
import type { Historial } from "@/lib/consultorio/historial";

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "short", year: "numeric" });

const dinero = (n: number | null) =>
  n === null ? "" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TIPO: Record<Historial["documentos"][number]["tipo"], string> = {
  receta: "Receta",
  nota: "Nota de consulta",
  orden: "Orden de laboratorio",
  imagen: "Orden de imagenología",
  proceso: "Procedimiento",
};

export function HistorialClinico({ telefono }: { telefono: string }) {
  const [h, setH] = useState<Historial | null | "error">(null);

  useEffect(() => {
    let vivo = true;
    setH(null);
    fetch(`/api/consultorio/historial?telefono=${encodeURIComponent(telefono)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (vivo) setH(d.ok ? d.historial : "error");
      })
      .catch(() => vivo && setH("error"));
    return () => {
      vivo = false;
    };
  }, [telefono]);

  if (h === null) return <p className="px-1 text-[12.5px] text-[var(--text-3)]">Buscando en la clínica...</p>;
  if (h === "error") return <p className="px-1 text-[12.5px] text-[var(--text-3)]">No se pudo leer el historial.</p>;

  return (
    <div className="space-y-4 px-1">
      {h.registros.length > 0 && (
        <p className="text-[12.5px] text-[var(--text-2)]">
          {h.registros.map((r, i) => (
            <span key={i} className="block">
              Registrado con {r.doctor} el {fecha(r.creado)}
              {r.motivo ? `: ${r.motivo}` : ""}
            </span>
          ))}
        </p>
      )}

      <Bloque Icon={FlaskConical} titulo="Exámenes realizados" vacio="Sin exámenes todavía." n={h.examenes.length}>
        {h.examenes.map((e, i) => (
          <li key={i} className="py-1.5">
            <span className="flex items-baseline justify-between gap-2 text-[12.5px]">
              <span className="font-semibold text-[var(--text)]">{e.unidad}</span>
              <span className="shrink-0 text-[var(--text-3)]">{fecha(e.fecha)}</span>
            </span>
            <span className="block text-[12.5px] text-[var(--text-2)]">
              {e.examenes.length > 0 ? e.examenes.join(", ") : "Nada hecho todavía"}
              {e.pendientes > 0 && (
                <span className="ml-1 text-[var(--text-3)]">
                  ({e.pendientes} {e.pendientes === 1 ? "pendiente" : "pendientes"})
                </span>
              )}
            </span>
          </li>
        ))}
      </Bloque>

      <Bloque Icon={Receipt} titulo="Facturas" vacio="Sin facturas todavía." n={h.facturas.length}>
        {h.facturas.map((f, i) => (
          <li key={i} className="flex items-baseline justify-between gap-2 py-1.5 text-[12.5px]">
            <span className="min-w-0">
              <span className="font-mono font-semibold text-[var(--text)]">{f.numero}</span>
              <span className="block text-[var(--text-3)]">
                {f.unidad} · {fecha(f.fecha)}
              </span>
            </span>
            <span className="shrink-0 font-semibold text-[var(--text)]">{dinero(f.monto)}</span>
          </li>
        ))}
      </Bloque>

      <Bloque Icon={FileText} titulo="Recetas y notas" vacio="Sin recetas ni notas todavía." n={h.documentos.length}>
        {h.documentos.map((d) => (
          <li key={d.id} className="py-1.5">
            <span className="flex items-baseline justify-between gap-2 text-[12.5px]">
              <span className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
                {d.tipo === "nota" ? <StickyNote size={12} /> : null}
                {TIPO[d.tipo]}
                {d.codigo && <span className="font-mono font-normal text-[var(--text-3)]">{d.codigo}</span>}
              </span>
              <span className="shrink-0 text-[var(--text-3)]">{fecha(d.fecha)}</span>
            </span>
            <span className="block text-[12.5px] text-[var(--text-2)]">
              {d.resumen}
              {d.doctor && <span className="text-[var(--text-3)]"> · {d.doctor}</span>}
            </span>
          </li>
        ))}
      </Bloque>
    </div>
  );
}

function Bloque({
  Icon,
  titulo,
  vacio,
  n,
  children,
}: {
  Icon: typeof FileText;
  titulo: string;
  vacio: string;
  n: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-[var(--text-3)]">
        <Icon size={12} /> {titulo}
        {n > 0 && <span className="font-normal normal-case tracking-normal">({n})</span>}
      </p>
      {n === 0 ? (
        <p className="mt-1 text-[12.5px] text-[var(--text-3)]">{vacio}</p>
      ) : (
        <ul className="mt-1 divide-y divide-line">{children}</ul>
      )}
    </div>
  );
}
