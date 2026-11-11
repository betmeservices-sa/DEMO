"use client";

// Reporte de desempeño de Sofía, el agente de Yali Hospitality.
//
// VIVE EN EL TABLERO DE MIAGENTIA, NO EN EL DEL CLIENTE. Acá se dice "este caso
// NO cuenta para Sofía" y se nombra de quién fue cada error, incluidos los del
// equipo del hotel. Eso es material nuestro: Yali no tiene por qué leer nuestra
// auditoría de su propio agente. Los datos y los veredictos viven en
// lib/reporte-sofia.ts, con su fecha de corte.

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CircleSlash,
  MinusCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  ACTIVIDAD,
  ARRANQUE,
  CASOS,
  CORTE,
  DESCARTADO,
  HALLAZGOS,
  POR_CANAL,
  REGLA,
  SIN_AUDITAR,
  TOTAL,
  UNIVERSO,
  type CasoChat,
  type Veredicto,
} from "@/lib/reporte-sofia";

const dinero = (n: number) => "$" + n.toLocaleString("en-US");

const SELLO: Record<Veredicto, { texto: string; Icon: LucideIcon; clase: string }> = {
  suya: { texto: "Cuenta para Sofía", Icon: Check, clase: "border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400" },
  parcial: { texto: "Parcial", Icon: MinusCircle, clase: "border-amber-600/40 bg-amber-600/10 text-amber-700 dark:text-amber-400" },
  no: { texto: "No cuenta", Icon: CircleSlash, clase: "border-[var(--text-3)]/40 bg-[var(--text-3)]/10 text-[var(--text-2)]" },
};

const COLOR_QUIEN: Record<string, string> = {
  Huésped: "text-[var(--text-2)]",
  Sofía: "text-brand",
  Equipo: "text-[var(--text-2)]",
  Vero: "text-[var(--text-2)]",
};

function Caso({ caso }: { caso: CasoChat }) {
  const [abierto, setAbierto] = useState(false);
  const sello = SELLO[caso.veredicto];
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--text-3)]/5"
      >
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-[var(--text-3)] transition-transform", abierto && "rotate-180")}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold text-[var(--text)]">{caso.huesped}</p>
          <p className="truncate text-[12px] text-[var(--text-3)]">
            {caso.fecha} · {caso.sede} · {caso.canal}
          </p>
        </div>
        <span className="shrink-0 text-[14px] font-bold tabular-nums text-[var(--text)]">
          {dinero(caso.monto)}
        </span>
        <span
          className={cn(
            "hidden shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold sm:flex",
            sello.clase,
          )}
        >
          <sello.Icon size={13} />
          {sello.texto}
        </span>
      </button>

      {abierto && (
        <div className="space-y-4 px-4 pb-5 pl-11">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold sm:hidden",
              sello.clase,
            )}
          >
            <sello.Icon size={13} />
            {sello.texto}
          </span>

          <p className="max-w-3xl text-[13.5px] leading-relaxed text-[var(--text-2)]">{caso.resumen}</p>

          {caso.culpa && (
            <p className="flex max-w-3xl items-start gap-2 rounded-xl border border-[var(--brand-red)]/40 bg-[var(--brand-red)]/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[var(--text-2)]">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--brand-red)]" />
              <span>
                <b className="text-[var(--text)]">De quién fue: </b>
                {caso.culpa}
              </span>
            </p>
          )}

          <div>
            <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
              El chat
            </p>
            <div className="space-y-1.5 rounded-xl border border-line bg-[var(--text-3)]/[0.04] p-3">
              {caso.turnos.map((t, i) => (
                <p key={i} className="flex gap-2.5 text-[12.5px] leading-relaxed">
                  <span className="w-10 shrink-0 tabular-nums text-[var(--text-3)]">{t.hora}</span>
                  <span className={cn("w-14 shrink-0 font-semibold", COLOR_QUIEN[t.quien])}>{t.quien}</span>
                  <span className="text-[var(--text-2)]">{t.texto}</span>
                </p>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
              Por qué
            </p>
            <ul className="max-w-3xl list-disc space-y-1.5 pl-5 text-[12.5px] leading-relaxed text-[var(--text-2)]">
              {caso.porque.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportePage() {
  const totEscribio = POR_CANAL.reduce((s, f) => s + f.escribio.n, 0);
  const totEscribioM = POR_CANAL.reduce((s, f) => s + f.escribio.monto, 0);
  const totTecleo = POR_CANAL.reduce((s, f) => s + f.tecleo.n, 0);
  const totTecleoM = POR_CANAL.reduce((s, f) => s + f.tecleo.monto, 0);
  const pctRes = Math.round((TOTAL.reservas / UNIVERSO.reservas) * 100);
  const pctMonto = Math.round((TOTAL.monto / UNIVERSO.monto) * 100);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line bg-card px-5 py-3">
        <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Reporte de Sofía · Yali Hospitality</h1>
        <p className="text-[12.5px] text-[var(--text-3)]">
          Qué reservas le pertenecen y por qué. Uso interno. Corte del {CORTE}.
        </p>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {/* Titular */}
        <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
          <p className="text-[12.5px] text-[var(--text-3)]">
            De las {UNIVERSO.reservas} reservas que entraron desde el {UNIVERSO.desde}, por{" "}
            {dinero(UNIVERSO.monto)}
          </p>
          <p className="mt-1 text-[44px] font-extrabold leading-none tracking-tight text-[var(--text)]">
            {TOTAL.reservas}
            <span className="ml-2 text-[20px] font-bold text-[var(--text-2)]">
              reservas · {dinero(TOTAL.monto)}
            </span>
          </p>
          <p className="mt-2 text-[12.5px] text-[var(--text-2)]">
            Es el {pctRes}% de las reservas y el {pctMonto}% del dinero.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-[var(--text-3)]/[0.06] px-3.5 py-2.5 text-[12px] leading-relaxed text-[var(--text-2)]">
            El cruce automático daba <b className="text-[var(--text)]">{REGLA.reservas}</b> y{" "}
            {dinero(REGLA.monto)}. Al leer los chats se cayeron{" "}
            <b className="text-[var(--text)]">{DESCARTADO.reservas}</b> ({dinero(DESCARTADO.monto)}):
            en una Sofía solo saludó, en otra la reserva ya existía y en otra vendió el equipo del
            hotel. El titular usa lo auditado.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-[12px] text-[var(--text-3)]">
            {ARRANQUE.map((a) => (
              <span key={a.canal}>
                <b className="text-[var(--text-2)]">{a.canal}</b> desde el {a.fecha} ({a.dias} días)
              </span>
            ))}
          </div>
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {ACTIVIDAD.map((a) => (
            <div key={a.etiqueta} className="rounded-2xl border border-line bg-card p-4 shadow-sm">
              <p className="text-[12px] leading-snug text-[var(--text-2)]">{a.etiqueta}</p>
              <p className="mt-1 text-[24px] font-extrabold leading-none tracking-tight text-[var(--text)]">
                {a.valor}
              </p>
              <p className="mt-1 text-[11.5px] text-[var(--text-3)]">{a.pie}</p>
            </div>
          ))}
        </div>

        {/* Por canal */}
        <div>
          <h2 className="mb-1 text-[15px] font-bold text-[var(--text)]">Por canal</h2>
          <p className="mb-3 max-w-3xl text-[12.5px] text-[var(--text-2)]">
            Cada reserva aparece una sola vez. Las filas suman al total de la derecha y las columnas
            al de abajo.
          </p>
          <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11.5px] text-[var(--text-3)]">
                  <th className="px-4 py-2.5 text-left font-semibold">Canal del chat</th>
                  <th className="px-4 py-2.5 text-right font-semibold">El sistema la escribió</th>
                  <th className="px-4 py-2.5 text-right font-semibold">La tecleó el hotel</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {POR_CANAL.map((f) => (
                  <tr key={f.canal} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-3 font-medium text-[var(--text)]">{f.canal}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <b className="text-[var(--text)]">{f.escribio.n}</b>
                      <span className="ml-1.5 text-[11.5px] text-[var(--text-3)]">
                        {dinero(f.escribio.monto)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <b className="text-[var(--text)]">{f.tecleo.n}</b>
                      <span className="ml-1.5 text-[11.5px] text-[var(--text-3)]">
                        {dinero(f.tecleo.monto)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <b className="text-[var(--text)]">{f.escribio.n + f.tecleo.n}</b>
                      <span className="ml-1.5 text-[11.5px] text-[var(--text-3)]">
                        {dinero(f.escribio.monto + f.tecleo.monto)}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-[var(--text-3)]/[0.05] font-bold">
                  <td className="px-4 py-3 text-[var(--text)]">Todos</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--text)]">
                    {totEscribio}
                    <span className="ml-1.5 text-[11.5px] font-normal text-[var(--text-3)]">
                      {dinero(totEscribioM)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--text)]">
                    {totTecleo}
                    <span className="ml-1.5 text-[11.5px] font-normal text-[var(--text-3)]">
                      {dinero(totTecleoM)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--text)]">
                    {TOTAL.reservas}
                    <span className="ml-1.5 text-[11.5px] font-normal text-[var(--text-3)]">
                      {dinero(TOTAL.monto)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Los chats */}
        <div>
          <h2 className="mb-1 text-[15px] font-bold text-[var(--text)]">
            Los {CASOS.length} de WhatsApp, leídos uno por uno
          </h2>
          <p className="mb-3 max-w-3xl text-[12.5px] text-[var(--text-2)]">
            Clic para ver el chat y el veredicto. Tres de los seis no cuentan para Sofía: decirlo
            acá evita defender un número que no se sostiene.
          </p>
          <p className="mb-3 max-w-3xl rounded-xl border border-amber-600/40 bg-amber-600/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-[var(--text-2)]">
            <b className="text-[var(--text)]">Faltan {SIN_AUDITAR.reservas} por auditar.</b> De las{" "}
            {totTecleo} tecleadas que cuentan, 3 salen de estos 6 chats de WhatsApp. Las otras{" "}
            {SIN_AUDITAR.reservas} ({dinero(SIN_AUDITAR.monto)}) son de {SIN_AUDITAR.canales} y
            todavía nadie abrió esos chats.
          </p>
          <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
            {CASOS.map((c) => (
              <Caso key={c.id} caso={c} />
            ))}
          </div>
        </div>

        {/* Hallazgos */}
        <div>
          <h2 className="mb-3 text-[15px] font-bold text-[var(--text)]">Lo que sale de leerlos</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {HALLAZGOS.map((h) => (
              <div key={h.titulo} className="rounded-2xl border border-line bg-card p-4 shadow-sm">
                <p className="text-[13.5px] font-bold text-[var(--text)]">{h.titulo}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--text-2)]">{h.detalle}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="border-t border-line pt-3 text-[11.5px] leading-relaxed text-[var(--text-3)]">
          Fuente: Cloudbeds de las tres sedes, la tabla de apartados y los mensajes, cruzados el{" "}
          {CORTE}. Sofía se identifica por la marca del dato, no por &quot;mensaje sin operador&quot;:
          esa regla mete los mensajes que el hotel manda desde su propio WhatsApp. Horas en hora de
          El Salvador.
        </p>
      </div>
    </div>
  );
}
