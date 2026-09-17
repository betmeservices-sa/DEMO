"use client";

// La reporteria del gerente de la sala de ventas.
//
// Responde, en este orden, lo que un gerente de concesionario pregunta cada
// manana: a quien no han llamado, que prueba de manejo se cayo, que unidad
// esta separada sin entregar, donde se esta trabando la venta y cuanto se
// entrego. Los numeros de "ahora" y los del periodo van separados y rotulados:
// son preguntas distintas y mezclarlas es lo que hace que un tablero mienta.

import { AlertTriangle, CalendarClock, Car, Clock, KeySquare, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { telefonoBonito } from "@/lib/phone";
import { CATEGORIA, modeloDe, nombreDeModelo } from "@/lib/autos-catalogo";
import { HORAS_AVISO, HORAS_VENCIDO, type Vendedor } from "@/lib/autos-pipeline";
import { Dona } from "@/components/ventas/Graficos";
import type { RespuestaReporte } from "./tipos";
import { Embudo } from "./Embudo";
import { Enfriandose } from "./Enfriandose";

// La paleta validada de la guia tiene cuatro colores adyacentes; por eso la
// dona muestra los cuatro modelos mas pedidos y agrupa el resto. Agregar un
// quinto tono a ojo es justo lo que el validador existe para evitar.
const PALETA = ["#3B82F6", "#059669", "#D97706", "#DB2777"];
const OTROS = "#6B7280";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function horas(n: number | null): string {
  if (n === null) return "sin datos";
  if (n < 1) return `${Math.round(n * 60)} min`;
  if (n < 48) return `${n} h`;
  return `${Math.round((n / 24) * 10) / 10} días`;
}

function fecha(iso: string): string {
  return new Date(iso).toLocaleString("es-SV", {
    timeZone: "America/El_Salvador",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function nombreCorto(vendedores: Vendedor[], id: string | null): string {
  if (!id) return "sin asignar";
  return vendedores.find((v) => v.id === id)?.nombre ?? id;
}

export function ReporteGerente({ r }: { r: RespuestaReporte }) {
  const vendedores = r.vendedores.map((v) => ({ id: v.id, nombre: v.nombre, iniciales: v.iniciales }));
  const vencidos = r.alertas.filter((a) => a.nivel === "vencido").length;
  const separados = r.embudo.find((e) => e.etapa === "separados");
  const nombreV = (id: string | null) => nombreCorto(vendedores, id);

  // La dona va por CARROCERIA y no por modelo: con ocho modelos repartidos
  // entre los cuatro colores validados, el gajo de "otros" se comia el grafico
  // y no decia nada. Por carroceria son tres grupos de verdad, que es ademas la
  // pregunta con la que se pide inventario.
  const donaCarroceria = (() => {
    const suma = new Map<string, number>();
    for (const m of r.modelos) {
      if (m.interesados === 0) continue;
      const cat = modeloDe(m.id)?.categoria;
      const nombre = cat ? CATEGORIA[cat] : "Otros";
      suma.set(nombre, (suma.get(nombre) ?? 0) + m.interesados);
    }
    return [...suma.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([nombre, valor], i) => ({
        nombre,
        valor,
        color: nombre === "Otros" ? OTROS : PALETA[i % PALETA.length],
      }));
  })();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tarjeta
          Icon={AlertTriangle}
          alarma={r.alertas.length > 0}
          valor={r.alertas.length}
          label={`Sin llamar en ${HORAS_AVISO} h`}
          pie={vencidos > 0 ? `${vencidos} pasaron las ${HORAS_VENCIDO} h` : "ninguno vencido"}
        />
        <Tarjeta
          Icon={CalendarClock}
          alarma={r.pasos.citasVencidas.length > 0}
          valor={r.pasos.pruebasAgendadas}
          label="Pruebas de manejo puestas"
          pie={
            r.pasos.citasVencidas.length > 0
              ? `${r.pasos.citasVencidas.length} citas ya pasaron sin cerrar`
              : "ninguna cita se pasó"
          }
        />
        <Tarjeta
          Icon={KeySquare}
          valor={separados?.n ?? 0}
          label="Unidades separadas"
          pie={separados && separados.monto > 0 ? `${usd(separados.monto)} por entregar` : "nada apartado"}
        />
        <Tarjeta
          Icon={Trophy}
          valor={r.movimiento.ventas}
          label={`Entregados · ${r.periodo.etiqueta.toLowerCase()}`}
          pie={
            r.movimiento.monto > 0
              ? `${usd(r.movimiento.monto)} · antes ${r.anterior.ventas}`
              : "sin entregas en el periodo"
          }
        />
      </div>

      <Embudo etapas={r.embudo} nombreVendedor={nombreV} />

      {r.alertas.length > 0 && (
        <section className="rounded-2xl border border-[var(--brand-red)]/40 bg-[var(--brand-red)]/5 p-4">
          <h3 className="flex items-center gap-2 text-[14px] font-bold text-[var(--text)]">
            <AlertTriangle size={15} className="text-[var(--brand-red)]" />
            Leads esperando la primera llamada
          </h3>
          <p className="mt-0.5 text-[12px] text-[var(--text-3)]">
            Quien deja sus datos está cotizando en varias agencias el mismo día
          </p>
          <table className="mt-2 w-full text-[12.5px]">
            <thead className="text-[11px] uppercase tracking-wide text-[var(--text-3)]">
              <tr className="text-left">
                <th className="py-1 pr-3 font-semibold">Prospecto</th>
                <th className="py-1 pr-3 font-semibold">Vendedor</th>
                <th className="py-1 pr-3 text-right font-semibold">Esperando</th>
                <th className="py-1 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {r.alertas.map((a) => (
                <tr key={a.telefono} className="border-t border-line">
                  <td className="py-1.5 pr-3">
                    <span className="font-semibold text-[var(--text)]">{a.nombre}</span>
                    <span className="block text-[11px] text-[var(--text-3)]">{telefonoBonito(a.telefono)}</span>
                  </td>
                  <td className="py-1.5 pr-3 text-[var(--text-2)]">{nombreV(a.vendedor)}</td>
                  <td className="py-1.5 pr-3 text-right font-semibold text-[var(--text-2)]">{a.horas} h</td>
                  <td className="py-1.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        a.nivel === "vencido"
                          ? "bg-[var(--brand-red)]/15 text-[var(--brand-red)]"
                          : "bg-amber-50 text-amber-700",
                      )}
                    >
                      {a.nivel === "vencido" ? "Vencido, reasignar" : `Pasó las ${HORAS_AVISO} h`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {r.pasos.citasVencidas.length > 0 && (
        <section className="rounded-2xl border border-line bg-card p-4">
          <h3 className="flex items-center gap-2 text-[14px] font-bold text-[var(--text)]">
            <CalendarClock size={15} className="text-brand" />
            Citas que ya pasaron y nadie cerró
          </h3>
          <p className="mt-0.5 text-[12px] text-[var(--text-3)]">
            Si no se marca si llegó o no llegó, el caso se queda en el tablero como si siguiera vivo
          </p>
          <ul className="mt-2 divide-y divide-line">
            {r.pasos.citasVencidas.map((c) => (
              <li key={`${c.telefono}-${c.paso}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="text-[12.5px] font-semibold text-[var(--text)]">{c.nombre}</span>
                  <span className="block text-[11.5px] text-[var(--text-3)]">
                    {c.pasoNombre} del {fecha(c.fecha)} · {nombreDeModelo(c.modelo)} · {nombreV(c.vendedor)}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-[var(--brand-red)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-red)]">
                  hace {c.dias === 0 ? "menos de un día" : `${c.dias} ${c.dias === 1 ? "día" : "días"}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-line bg-card p-4">
        <h3 className="text-[14px] font-bold text-[var(--text)]">Cómo va el equipo</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[42rem] text-[12.5px]">
            <thead className="text-[11px] uppercase tracking-wide text-[var(--text-3)]">
              <tr className="text-left">
                <th className="py-1 pr-3 font-semibold">Vendedor</th>
                <th className="py-1 pr-3 text-right font-semibold">Activos</th>
                <th className="py-1 pr-3 text-right font-semibold">Sin tomar</th>
                <th className="py-1 pr-3 text-right font-semibold">Pruebas</th>
                <th className="py-1 pr-3 text-right font-semibold">Entregados</th>
                <th className="py-1 pr-3 text-right font-semibold">Facturado</th>
                <th className="py-1 pr-3 text-right font-semibold">Cierre</th>
                <th className="py-1 text-right font-semibold">Tarda en llamar</th>
              </tr>
            </thead>
            <tbody>
              {r.vendedores.map((v) => (
                <tr key={v.id} className="border-t border-line">
                  <td className="py-1.5 pr-3 font-semibold text-[var(--text)]">{v.nombre}</td>
                  <td className="py-1.5 pr-3 text-right text-[var(--text-2)]">{v.activos}</td>
                  <td
                    className={cn(
                      "py-1.5 pr-3 text-right",
                      v.sinTomar > 0 ? "font-semibold text-[var(--brand-red)]" : "text-[var(--text-2)]",
                    )}
                  >
                    {v.sinTomar}
                  </td>
                  <td className="py-1.5 pr-3 text-right text-[var(--text-2)]">{v.pruebas}</td>
                  <td className="py-1.5 pr-3 text-right font-semibold text-[var(--text)]">{v.ventas}</td>
                  <td className="py-1.5 pr-3 text-right text-[var(--text-2)]">{v.monto > 0 ? usd(v.monto) : "sin ventas"}</td>
                  <td className="py-1.5 pr-3 text-right text-[var(--text-2)]">
                    {v.tasaCierre === null ? "sin cierres" : `${v.tasaCierre}%`}
                  </td>
                  <td className="py-1.5 text-right text-[var(--text-2)]">{horas(v.horasEnTomar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-line bg-card p-4">
          <h3 className="flex items-center gap-2 text-[14px] font-bold text-[var(--text)]">
            <Car size={15} className="text-brand" />
            Qué se está pidiendo
          </h3>
          <p className="mt-0.5 text-[12px] text-[var(--text-3)]">Los prospectos vivos, por carrocería</p>
          <div className="mt-3">
            <Dona datos={donaCarroceria} />
          </div>
          {r.modelos.some((m) => m.vendidos > 0) && (
            <table className="mt-3 w-full text-[12.5px]">
              <thead className="text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                <tr className="text-left">
                  <th className="py-1 pr-3 font-semibold">Modelo</th>
                  <th className="py-1 pr-3 text-right font-semibold">Entregados</th>
                  <th className="py-1 text-right font-semibold">Facturado</th>
                </tr>
              </thead>
              <tbody>
                {r.modelos
                  .filter((m) => m.vendidos > 0)
                  .map((m) => (
                    <tr key={m.id} className="border-t border-line">
                      <td className="py-1.5 pr-3 text-[var(--text-2)]">{m.nombre}</td>
                      <td className="py-1.5 pr-3 text-right font-semibold text-[var(--text)]">{m.vendidos}</td>
                      <td className="py-1.5 text-right text-[var(--text-2)]">{usd(m.monto)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-card p-4">
          <h3 className="text-[14px] font-bold text-[var(--text)]">Dónde se traba la venta</h3>
          {r.pasos.trabas.length === 0 ? (
            <p className="mt-1 text-[12.5px] text-[var(--text-3)]">Nadie tiene la venta trabada ahora mismo.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {r.pasos.trabas.map((t) => (
                <li key={t.motivo} className="flex items-center gap-2 text-[12.5px]">
                  <span className="w-48 shrink-0 text-[var(--text-2)]">{t.nombre}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                    <span
                      className="block h-full rounded-full bg-[var(--brand-red)]/70"
                      style={{ width: `${Math.round((t.n / Math.max(...r.pasos.trabas.map((x) => x.n))) * 100)}%` }}
                    />
                  </span>
                  <span className="w-6 text-right font-semibold text-[var(--text)]">{t.n}</span>
                </li>
              ))}
            </ul>
          )}

          {r.pasos.pendientes.length > 0 && (
            <>
              <p className="mt-3 text-[12px] font-semibold text-[var(--text-2)]">Cuántas ventas esperan cada paso</p>
              <ul className="mt-1 space-y-1.5">
                {r.pasos.pendientes.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-[12.5px]">
                    <span className="w-48 shrink-0 text-[var(--text-2)]">{p.nombre}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                      <span
                        className="block h-full rounded-full bg-brand/70"
                        style={{ width: `${Math.round((p.n / Math.max(...r.pasos.pendientes.map((x) => x.n))) * 100)}%` }}
                      />
                    </span>
                    <span className="w-6 text-right font-semibold text-[var(--text)]">{p.n}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-card p-4 xl:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text-2)]">
                <Clock size={12} /> Cuánto tarda cada tramo
              </h4>
              <ul className="mt-1.5 flex flex-col gap-1">
                {[
                  ["A primera llamada", r.tiempos.aPrimerContacto],
                  ["A cotización", r.tiempos.aCotizacion],
                  ["A prueba de manejo", r.tiempos.aPrueba],
                  ["A cierre", r.tiempos.aCierre],
                ].map(([txt, v]) => (
                  <li key={txt as string} className="flex items-center gap-2 text-[12px]">
                    <span className="w-36 shrink-0 text-[var(--text-3)]">{txt as string}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                      <span
                        className="block h-full rounded-full bg-brand/70"
                        style={{ width: `${Math.min(100, ((v as number | null) ?? 0) / 3)}%` }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right font-semibold text-[var(--text)]">
                      {horas(v as number | null)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-[12px] font-semibold text-[var(--text-2)]">
                Movimiento de {r.periodo.etiqueta.toLowerCase()}
              </h4>
              <ul className="mt-1.5 flex flex-col gap-1">
                {[
                  ["Entraron", r.movimiento.nuevos, r.anterior.nuevos],
                  ["Cotizados", r.movimiento.cotizados, r.anterior.cotizados],
                  ["Entregados", r.movimiento.ventas, r.anterior.ventas],
                ].map(([txt, ahora, antes]) => {
                  const a = ahora as number;
                  const b = antes as number;
                  const dif = a - b;
                  return (
                    <li key={txt as string} className="flex items-center gap-2 text-[12px]">
                      <span className="w-36 shrink-0 text-[var(--text-3)]">{txt as string}</span>
                      <span className="flex-1 text-right text-[15px] font-extrabold text-[var(--text)]">{a}</span>
                      <span
                        className={cn(
                          "w-16 shrink-0 text-right text-[11px] font-semibold",
                          dif > 0 ? "text-[#2f9e2f]" : dif < 0 ? "text-[var(--brand-red)]" : "text-[var(--text-3)]",
                        )}
                      >
                        {dif === 0 ? "igual" : `${dif > 0 ? "+" : ""}${dif}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[11.5px] text-[var(--text-3)]">
                {r.movimiento.tasaCierre === null
                  ? "Nada cerrado en el periodo"
                  : `${r.movimiento.tasaCierre}% de lo cerrado terminó en venta`}
              </p>
            </div>
          </div>
        </section>
      </div>

      <Enfriandose
        conCotizacion={r.enfriandose.conCotizacion}
        enNegociacion={r.enfriandose.enNegociacion}
        nombreVendedor={nombreV}
      />
    </div>
  );
}

function Tarjeta({
  Icon,
  valor,
  label,
  pie,
  alarma,
}: {
  Icon: typeof Clock;
  valor: number;
  label: string;
  pie: string;
  alarma?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4", alarma ? "border-[var(--brand-red)]/50" : "border-line")}>
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl",
          alarma ? "bg-[var(--brand-red)]/10 text-[var(--brand-red)]" : "bg-brand/10 text-brand",
        )}
      >
        <Icon size={16} />
      </span>
      <p className="mt-2.5 text-[24px] font-extrabold leading-none tracking-tight text-[var(--text)]">{valor}</p>
      <p className="mt-1 text-[12.5px] font-medium text-[var(--text-2)]">{label}</p>
      <p className="text-[11.5px] text-[var(--text-3)]">{pie}</p>
    </div>
  );
}
