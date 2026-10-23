"use client";

// Lo que el agente dejó apartado y espera que Reservas confirme, y lo que
// quedó a medias. Es la misma lectura que el tablero de Yali (apartados con su
// hora para pagar, el comprobante que hay que verificar, las últimas cerradas
// y lo que quedó en pausa), pero sobre la muestra del hotel.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, MessageSquare, PhoneIncoming, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { registrar } from "@/lib/hotel-muestra/store";
import type { Apartado, Cerrada, EnPausa, VistaHotel } from "@/lib/hotel-muestra/vista";
import { diaMes, dinero } from "@/lib/hotel-muestra/fechas";

function fechas(desde: string, hasta: string, noches: number) {
  return `${diaMes(desde)} al ${diaMes(hasta)} · ${noches} ${noches === 1 ? "noche" : "noches"}`;
}

const personas = (n: number) => `${n} ${n === 1 ? "persona" : "personas"}`;

/** Lo que le queda al apartado: minutos los del chat (una hora), horas los del teléfono (un día). */
const restante = (min: number) => (min < 120 ? `${min} min` : `${Math.floor(min / 60)} h`);

export function ReservasPorConfirmar({ vista, actor }: { vista: VistaHotel; actor: string }) {
  const router = useRouter();
  const conComprobante = vista.apartados.filter((a) => a.estado === "comprobante").length;

  function verChat(id: string) {
    try {
      sessionStorage.setItem("ccg.abrirConv", id);
    } catch {
      // Sin sessionStorage igual abre la bandeja.
    }
    router.push("/");
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--text)]">Reservas por confirmar</h3>
          <p className="text-[12.5px] text-[var(--text-3)]">
            Las que el agente dejó apartadas. Cuando llega el comprobante, Reservas verifica el pago y confirma.
          </p>
        </div>
        {conComprobante > 0 && (
          <span className="rounded-full bg-brand/10 px-3 py-1 text-[12px] font-bold text-brand">
            {conComprobante} con comprobante
          </span>
        )}
      </div>

      {vista.apartados.length === 0 ? (
        <p className="mt-4 rounded-xl bg-surface/70 px-3.5 py-3 text-[12.5px] text-[var(--text-2)]">
          No hay apartados esperando. Lo que el agente aparte por chat aparece acá.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {vista.apartados.map((a) => (
            <ApartadoCard key={a.id} a={a} actor={actor} onVerChat={verChat} />
          ))}
        </div>
      )}

      {vista.cerradas.length > 0 && (
        <>
          <p className="mt-5 text-[11.5px] font-bold uppercase tracking-wide text-[var(--text-3)]">Últimas cerradas</p>
          <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {vista.cerradas.slice(0, 3).map((c) => (
              <CerradaCard key={c.id} c={c} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function ApartadoCard({ a, actor, onVerChat }: { a: Apartado; actor: string; onVerChat: (id: string) => void }) {
  const comprobante = a.estado === "comprobante";
  return (
    <div className="flex flex-col rounded-xl border border-line bg-card p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-bold text-[var(--text)]">{a.huesped}</p>
          <p className="truncate text-[12px] text-[var(--text-2)]">
            {a.habitacionNombre} · {a.zonaNombre}
          </p>
        </div>
        <span className="shrink-0 font-mono text-[10.5px] text-[var(--text-3)]">{a.id}</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2 text-[12px] text-[var(--text-2)]">
        <span>
          {fechas(a.desde, a.hasta, a.noches)} · {personas(a.personas)}
        </span>
        <span className="text-[13.5px] font-extrabold text-[var(--text)]">{dinero(a.total)}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
            comprobante ? "border-brand/40 bg-brand/10 text-brand" : "border-amber-300 bg-amber-50 text-amber-800",
          )}
        >
          {comprobante ? "Comprobante recibido · verificar" : "Esperando el pago"}
        </span>
        {a.conversacionId && (
          <button
            type="button"
            onClick={() => onVerChat(a.conversacionId!)}
            className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-[var(--text-2)] transition hover:bg-surface"
          >
            <MessageSquare size={11} />
            Ver chat
          </button>
        )}
        {a.llamadaId && (
          <Link
            href={`/llamadas?llamada=${encodeURIComponent(a.llamadaId)}`}
            className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-[var(--text-2)] transition hover:bg-surface"
          >
            <PhoneIncoming size={11} />
            Ver llamada
          </Link>
        )}
        {!comprobante && (
          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-3)]">
            <Clock size={11} />
            apartada {restante(a.quedanMin)} más
          </span>
        )}
      </div>
      {a.nota && <p className="mt-2 text-[11.5px] text-[var(--text-3)]">{a.nota}</p>}
      <div className="mt-auto flex gap-2 pt-3">
        <button
          type="button"
          onClick={() => registrar({ tipo: "apartado.confirmar", apartadoId: a.id, actor })}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[12.5px] font-bold text-white transition hover:opacity-90"
        >
          <CheckCircle2 size={14} />
          Confirmar reserva
        </button>
        <button
          type="button"
          onClick={() => registrar({ tipo: "apartado.rechazar", apartadoId: a.id, actor })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[12.5px] font-semibold text-[var(--text-2)] transition hover:bg-surface"
        >
          <XCircle size={14} />
          Rechazar
        </button>
      </div>
    </div>
  );
}

function CerradaCard({ c }: { c: Cerrada }) {
  const ok = c.estado === "confirmada";
  return (
    <div className="rounded-xl border border-line bg-surface/50 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-bold text-[var(--text)]">{c.huesped}</p>
          <p className="truncate text-[12px] text-[var(--text-2)]">
            {c.habitacionNombre} · {c.zonaNombre}
          </p>
        </div>
        <span className="shrink-0 font-mono text-[10.5px] text-[var(--text-3)]">{c.id}</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2 text-[12px] text-[var(--text-2)]">
        <span>
          {fechas(c.desde, c.hasta, c.noches)} · {personas(c.personas)}
        </span>
        <span className="text-[13.5px] font-extrabold text-[var(--text)]">{dinero(c.total)}</span>
      </div>
      <span
        className={cn(
          "mt-2 inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold",
          ok ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-line bg-surface text-[var(--text-2)]",
        )}
      >
        {ok ? "Confirmada" : "Rechazada"}
      </span>
      <p className="mt-1.5 text-[11.5px] text-[var(--text-3)]">{c.detalle}</p>
      {c.nota && <p className="mt-0.5 text-[11.5px] text-[var(--text-3)]">{c.nota}</p>}
    </div>
  );
}

const GRUPOS: { id: keyof VistaHotel["pausa"]; titulo: string; ayuda: string }[] = [
  { id: "esperando_pago", titulo: "Esperando el pago", ayuda: "Ya apartó, falta que pague" },
  { id: "se_cayo", titulo: "Se cayó por no pagar", ayuda: "Venció el apartado. Todavía se puede recuperar" },
];

function hace(dias: number) {
  return dias === 0 ? "hoy" : `${dias}d`;
}

export function ReservasEnPausa({ vista }: { vista: VistaHotel }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h3 className="text-[15px] font-bold text-[var(--text)]">Reservas en pausa</h3>
      <p className="text-[12.5px] text-[var(--text-3)]">Ingresos que están por entrar y se pueden perder si nadie les da seguimiento.</p>
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {GRUPOS.map((g) => {
          const xs: EnPausa[] = vista.pausa[g.id];
          const total = xs.reduce((s, x) => s + x.total, 0);
          return (
            <div key={g.id} className="rounded-xl border border-line bg-surface/40 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-bold text-[var(--text)]">{g.titulo}</p>
                  <p className="text-[11.5px] text-[var(--text-3)]">{g.ayuda}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[18px] font-extrabold leading-none text-[var(--text)]">{xs.length}</p>
                  <p className="text-[11.5px] font-semibold text-[var(--text-2)]">{dinero(total)}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {xs.map((x, i) => (
                  <li key={`${x.huesped}-${i}`} className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-1.5 text-[12px]">
                    <span className="min-w-0 flex-1 truncate text-[var(--text)]">
                      {x.huesped} · <span className="text-[var(--text-3)]">{diaMes(x.desde)} al {diaMes(x.hasta)}</span>
                    </span>
                    <span className="font-bold text-[var(--text)]">{dinero(x.total)}</span>
                    <span className="w-8 text-right text-[11px] text-[var(--text-3)]">{hace(x.haceDias)}</span>
                  </li>
                ))}
                {xs.length === 0 && <li className="text-[12px] text-[var(--text-3)]">Nada por ahora.</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
