"use client";

// Cómo va Express Shopping en una pantalla: cuántos paquetes hay en cada punto
// de la línea, lo que necesita a alguien hoy, los vuelos y lo que la IA se
// encargó sola (capturas leídas y avisos enviados).

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MessageCircle, Plane, ScanLine, Send, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Etapa } from "@/lib/exs/tipos";
import { ETAPAS, SUCURSALES } from "@/lib/exs/catalogo";
import { cobroDe, dinero, libras } from "@/lib/exs/cobro";
import { totalDelVuelo } from "@/lib/exs/estado";
import { proximoVuelo, siguienteVuelo, vueloEnElAire } from "@/lib/exs/alertas";
import { salidaDe } from "@/lib/exs/avisos";
import { clienteDe } from "@/lib/exs/vista";
import { registrar, useExs } from "@/lib/exs/store";
import { diaHora, diaSV, fechaCorta, fechaLarga, horaCorta, sumarDias } from "@/lib/eventos/fechas";
import { useStore } from "@/lib/store";
import { useYo } from "@/lib/yo";
import { cuantos, conMayuscula } from "@/lib/exs/formato";
import { AlertaChip, PuntoEtapa } from "./ui";

const DIA_MS = 86_400_000;

export function ExsDashboard() {
  const vista = useExs();
  const yo = useYo();
  const { state } = useStore();
  const [aviso, setAviso] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setAhora(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  const hoy = diaSV(vista.ahora);
  const porEtapa = (e: Etapa) => vista.paquetes.filter((p) => p.etapa === e);
  const enAire = vueloEnElAire(vista.vuelos);
  const proximo = proximoVuelo(vista.vuelos);
  const deProximo = proximo ? vista.paquetes.filter((p) => p.vueloId === proximo.id && p.etapa === "miami") : [];
  const deAire = enAire ? vista.paquetes.filter((p) => p.vueloId === enAire.id && p.etapa === "en_vuelo") : [];
  const listos = porEtapa("listo");
  const porCobrar = listos
    .filter((p) => !p.pagado)
    .reduce((n, p) => n + cobroDe(p, totalDelVuelo(vista.paquetes, p.clienteId, p.vueloId)).total, 0);
  const hace7 = vista.ahora - 7 * DIA_MS;
  const entregados7 = porEtapa("entregado").filter((p) => Date.parse(p.historial.at(-1)?.ts ?? p.creado) >= hace7);

  // Lo que hizo la IA (y el sistema) sin que nadie escribiera nada.
  const ia = useMemo(() => {
    const capturas = vista.paquetes.filter((p) => p.prealerta?.origen === "captura" && Date.parse(p.prealerta.ts) >= hace7).length;
    let avisos = 0;
    for (const xs of vista.avisos.values()) avisos += xs.filter((a) => Date.parse(a.ts) >= hace7).length;
    const conIa = new Set(state.messages.filter((m) => m.staffId === "ia").map((m) => m.conversationId));
    const resueltosSolos = state.conversations.filter((c) => conIa.has(c.id) && c.estado === "resuelto" && !c.asignadoA).length;
    return { capturas, avisos, chats: conIa.size, resueltosSolos };
  }, [vista, state.messages, state.conversations, hace7]);

  // Recibidos en Miami por día, últimas dos semanas.
  const porDia = useMemo(() => {
    const dias = Array.from({ length: 14 }, (_, i) => sumarDias(hoy, i - 13));
    const cuenta = new Map(dias.map((d) => [d, 0]));
    for (const p of vista.paquetes) {
      const ev = p.historial.find((e) => e.tipo === "miami");
      if (!ev) continue;
      const d = diaSV(ev.ts);
      if (cuenta.has(d)) cuenta.set(d, (cuenta.get(d) ?? 0) + 1);
    }
    return dias.map((d) => ({ dia: d, n: cuenta.get(d) ?? 0 }));
  }, [vista.paquetes, hoy]);
  const maxDia = Math.max(1, ...porDia.map((d) => d.n));

  const urgentes = vista.alertas;
  const totalUrgente = urgentes.retenidos.length + urgentes.sinPrealerta.length + urgentes.porVencer.length + urgentes.sobreLimite.length;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line bg-card px-5 py-3">
        <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Cómo van los paquetes</h1>
        <p className="text-[12.5px] text-[var(--text-3)]">{conMayuscula(fechaLarga(hoy))}</p>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {/* La línea, etapa por etapa */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {ETAPAS.map((e) => {
            const xs = e.id === "entregado" ? entregados7 : porEtapa(e.id);
            let pie = "";
            let alarma = false;
            if (e.id === "prealertado") pie = `${xs.filter((p) => p.prealerta?.origen === "captura").length} leídos por la IA`;
            if (e.id === "miami") {
              const sin = xs.filter((p) => !p.prealerta).length;
              pie = sin ? `${sin} sin prealerta` : libras(xs.reduce((n, p) => n + (p.pesoLb ?? 0), 0));
              alarma = sin > 0;
            }
            if (e.id === "en_vuelo") pie = enAire ? `Aterriza a las ${horaCorta(enAire.llega)}` : "";
            if (e.id === "aduana") {
              const ret = xs.filter((p) => p.retenido).length;
              pie = ret ? `${ret} ${ret === 1 ? "retenido" : "retenidos"}` : "Sin retenidos";
              alarma = ret > 0;
            }
            if (e.id === "listo") pie = porCobrar > 0 ? `${dinero(porCobrar)} por cobrar` : "Todo cobrado";
            if (e.id === "entregado") pie = "Últimos 7 días";
            return (
              <Link
                key={e.id}
                href={e.id === "entregado" ? "/paquetes?etapa=entregado" : `/paquetes?etapa=${e.id}`}
                className="rounded-2xl border border-line bg-card p-4 transition hover:border-[var(--border-2)] hover:shadow-sm"
              >
                <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-2)]">
                  <PuntoEtapa etapa={e.id} />
                  <span className="truncate">{e.nombre}</span>
                </div>
                <p className="mt-2 text-[28px] font-extrabold leading-none text-[var(--text)]">{xs.length}</p>
                <p className={cn("mt-1.5 truncate text-[11.5px]", alarma ? "font-bold text-[var(--exs-ambar)]" : "text-[var(--text-3)]")}>{pie}</p>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* Lo urgente */}
          <Tarjeta titulo="Lo que necesita a alguien hoy" sub={totalUrgente ? `${totalUrgente} pendientes` : undefined} className="xl:col-span-2">
            {totalUrgente === 0 ? (
              <p className="flex items-center gap-2 py-6 text-[13px] font-semibold text-[var(--brand-green)]">
                <CheckCircle2 size={18} /> Todo al día.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {urgentes.sobreLimite.map((s) => {
                  const otro = siguienteVuelo(vista.vuelos, s.vuelo.id);
                  return (
                    <Urgente key={`l-${s.cliente.id}`} chip={<AlertaChip tipo="limite">Pasa de $300</AlertaChip>}>
                      <b>{s.cliente.nombre}</b> trae {dinero(s.total)} en el {s.vuelo.id}: con eso aduana le cobra IVA más DAI.
                      {s.sugerido && otro && (
                        <button
                          type="button"
                          onClick={() => {
                            if (registrar("vuelo", s.sugerido!.id, { vueloId: otro.id }, yo)) {
                              setAviso(`${s.sugerido!.contenido} pasó al ${otro.id}. ${s.cliente.nombre.split(" ")[0]} ya recibió el aviso.`);
                            }
                          }}
                          className="mt-1.5 block rounded-lg bg-brand px-2.5 py-1.5 text-[12px] font-bold text-white hover:bg-brand-dark"
                        >
                          Pasar {s.sugerido.contenido} al {otro.id}
                        </button>
                      )}
                    </Urgente>
                  );
                })}
                {urgentes.retenidos.map((p) => (
                  <Urgente key={`r-${p.id}`} chip={<AlertaChip tipo="retenido">Retenido</AlertaChip>} href={`/paquetes?id=${p.id}`}>
                    {p.contenido} de <b>{clienteDe(vista, p.clienteId)?.nombre}</b>: {p.retenido?.motivo.toLowerCase()}.
                  </Urgente>
                ))}
                {urgentes.sinPrealerta.map((p) => (
                  <Urgente key={`s-${p.id}`} chip={<AlertaChip tipo="sin_prealerta">Sin prealerta</AlertaChip>} href={`/paquetes?id=${p.id}`}>
                    Caja de {p.tienda} para <b>{clienteDe(vista, p.clienteId)?.nombre}</b> ({libras(p.pesoLb ?? 0)}) llegó a Miami sin captura del pedido.
                  </Urgente>
                ))}
                {urgentes.porVencer.map(({ paquete: p, dias, limite }) => (
                  <Urgente key={`v-${p.id}`} chip={<AlertaChip tipo="vence">{dias <= 0 ? "Vence hoy" : `Vence en ${dias} ${dias === 1 ? "día" : "días"}`}</AlertaChip>} href={`/paquetes?id=${p.id}`}>
                    {p.contenido} de <b>{clienteDe(vista, p.clienteId)?.nombre}</b> lleva casi un mes sin retirarse. Pasa a abandono el {fechaCorta(diaSV(limite))}.
                  </Urgente>
                ))}
              </ul>
            )}
          </Tarjeta>

          {/* Vuelos */}
          <Tarjeta titulo="Vuelos" accion={<Link href="/paquetes?vista=vuelos" className="text-[12px] font-bold text-[var(--brand-accent)] hover:underline">Ver todos</Link>}>
            <div className="space-y-4">
              {enAire && (
                <div>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-1.5 font-bold text-[var(--text)]">
                      <Plane size={15} className="text-[var(--exs-etapa-vuelo)]" /> {enAire.id} en el aire
                    </span>
                    <span className="text-[var(--text-2)]">
                      {cuantos(deAire.length, "paquete", "paquetes")} · {libras(deAire.reduce((n, p) => n + (p.pesoLb ?? 0), 0))}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-2 rounded-full bg-[var(--exs-etapa-vuelo)]"
                      style={{
                        width: `${Math.min(100, Math.max(0, ((ahora - Date.parse(enAire.sale)) / (Date.parse(enAire.llega) - Date.parse(enAire.sale))) * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-[var(--text-3)]">
                    Salió de Miami a las {horaCorta(enAire.sale)} · aterriza a las {horaCorta(enAire.llega)}
                  </p>
                </div>
              )}
              {proximo && (
                <div className="rounded-xl bg-surface p-3">
                  <p className="text-[12.5px] font-bold text-[var(--text)]">Próximo: {proximo.id}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--text-2)]">Sale el {salidaDe(proximo)}</p>
                  <p className="text-[12px] text-[var(--text-2)]">Corte de bodega: {diaHora(proximo.corte)}</p>
                  <p className="mt-1.5 text-[12px] text-[var(--text-2)]">
                    <b className="text-[var(--text)]">{cuantos(deProximo.length, "paquete", "paquetes")}</b> · {libras(deProximo.reduce((n, p) => n + (p.pesoLb ?? 0), 0))} ·{" "}
                    {dinero(deProximo.reduce((n, p) => n + p.valor, 0))} declarados
                  </p>
                </div>
              )}
            </div>
          </Tarjeta>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Tarjeta titulo="Lo que se hizo solo" sub="Últimos 7 días">
            <div className="grid grid-cols-2 gap-3">
              <Cifra Icon={ScanLine} valor={ia.capturas} label="capturas leídas y prealertadas por la IA" />
              <Cifra Icon={Send} valor={ia.avisos} label="avisos de WhatsApp enviados solos" />
              <Cifra Icon={MessageCircle} valor={ia.chats} label="chats atendidos por Lucía" />
              <Cifra Icon={CheckCircle2} valor={ia.resueltosSolos} label="resueltos sin pasar a una persona" />
            </div>
          </Tarjeta>

          <Tarjeta titulo="Recibidos en Miami" sub="Por día, últimas dos semanas">
            <div className="flex h-36 items-end gap-1.5" role="img" aria-label="Paquetes recibidos en Miami por día">
              {porDia.map((d) => (
                <div key={d.dia} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${fechaCorta(d.dia)}: ${d.n}`}>
                  {d.n > 0 && <span className="text-[10px] font-bold text-[var(--text-2)]">{d.n}</span>}
                  <div
                    className={cn("w-full rounded-t-md", d.dia === hoy ? "bg-brand" : "bg-[var(--exs-etapa-miami)]")}
                    style={{ height: `${(d.n / maxDia) * 100}%`, minHeight: d.n ? 4 : 0 }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[10.5px] text-[var(--text-3)]">
              <span>{fechaCorta(porDia[0].dia)}</span>
              <span>Hoy</span>
            </div>
          </Tarjeta>

          <Tarjeta titulo="Listos para entregar" sub="Dónde se retiran">
            <ul className="space-y-2.5">
              {[...SUCURSALES.map((s) => ({ id: s.id as string, nombre: s.nombre })), { id: "domicilio", nombre: "A domicilio" }].map((s) => {
                const n = listos.filter((p) => (p.entrega.tipo === "domicilio" ? "domicilio" : p.entrega.sucursal) === s.id).length;
                const max = Math.max(1, listos.length);
                return (
                  <li key={s.id}>
                    <div className="mb-1 flex justify-between text-[12.5px]">
                      <span className="font-medium text-[var(--text-2)]">{s.nombre}</span>
                      <span className="font-bold text-[var(--text)]">{n}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--surface-2)]">
                      <div className="h-2 rounded-full bg-[var(--exs-etapa-listo)]" style={{ width: `${(n / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Tarjeta>
        </div>
      </div>

      {aviso && (
        <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-[var(--text)] px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-xl">
          {aviso}
        </div>
      )}
    </div>
  );
}

function Tarjeta({
  titulo,
  sub,
  accion,
  className,
  children,
}: {
  titulo: string;
  sub?: string;
  accion?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-card p-5", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-extrabold text-[var(--text)]">{titulo}</h2>
          {sub && <p className="text-[11.5px] text-[var(--text-3)]">{sub}</p>}
        </div>
        {accion}
      </div>
      {children}
    </section>
  );
}

function Urgente({ chip, href, children }: { chip: React.ReactNode; href?: string; children: React.ReactNode }) {
  const cuerpo = (
    <div className="flex items-start gap-3 py-2.5">
      <span className="shrink-0 pt-0.5">{chip}</span>
      <div className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-[var(--text)]">{children}</div>
    </div>
  );
  return <li>{href ? <Link href={href} className="block rounded-lg px-1 hover:bg-surface">{cuerpo}</Link> : <div className="px-1">{cuerpo}</div>}</li>;
}

function Cifra({ Icon, valor, label }: { Icon: LucideIcon; valor: number; label: string }) {
  return (
    <div className="rounded-xl bg-surface p-3">
      <Icon size={16} className="text-[var(--brand-accent)]" />
      <p className="mt-1.5 text-[22px] font-extrabold leading-none text-[var(--text)]">{valor}</p>
      <p className="mt-1 text-[11px] leading-snug text-[var(--text-3)]">{label}</p>
    </div>
  );
}
