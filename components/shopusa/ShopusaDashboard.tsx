"use client";

// Cómo va ShopUSA en una pantalla: cuántos paquetes hay en cada punto de la
// línea, lo que necesita a alguien hoy, las cargas y lo que la IA se encargó
// sola (capturas leídas y avisos enviados).

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Layers, MessageCircle, Plane, ScanLine, Send, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Etapa } from "@/lib/shopusa/tipos";
import { ETAPAS, SUCURSALES } from "@/lib/shopusa/catalogo";
import { cobroDeEnvio, dinero, envioDe, libras, porCobrar } from "@/lib/shopusa/cobro";
import { cargaEnTransito, proximaCarga, textoAlmacenaje } from "@/lib/shopusa/alertas";
import { salidaDe } from "@/lib/shopusa/avisos";
import { clienteDe } from "@/lib/shopusa/vista";
import { useShopusa } from "@/lib/shopusa/store";
import { diaHora, diaSV, fechaCorta, fechaLarga, horaCorta, sumarDias } from "@/lib/eventos/fechas";
import { useStore } from "@/lib/store";
import { cuantos, conMayuscula, nombreCarga } from "@/lib/shopusa/formato";
import { AlertaChip, PuntoEtapa } from "./ui";

const DIA_MS = 86_400_000;

export function ShopusaDashboard() {
  const vista = useShopusa();
  const { state } = useStore();
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setAhora(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const hoy = diaSV(vista.ahora);
  const porEtapa = (e: Etapa) => vista.paquetes.filter((p) => p.etapa === e);
  const enAire = cargaEnTransito(vista.cargas);
  const proxima = proximaCarga(vista.cargas);
  const deProxima = useMemo(
    () => (proxima ? vista.paquetes.filter((p) => p.cargaId === proxima.id && p.etapa === "miami") : []),
    [proxima, vista.paquetes],
  );
  const deAire = enAire ? vista.paquetes.filter((p) => p.cargaId === enAire.id && p.etapa === "transito") : [];
  const listos = porEtapa("listo");
  const falta = porCobrar(listos, vista.ahora);
  // Los clientes de la próxima carga que van consolidados, y lo que se ahorran.
  const consolidados = useMemo(() => {
    const vistos = new Set<string>();
    let clientes = 0;
    let ahorro = 0;
    for (const p of deProxima) {
      if (vistos.has(p.id)) continue;
      const envio = envioDe(p, vista.paquetes);
      for (const x of envio) vistos.add(x.id);
      if (envio.length < 2) continue;
      clientes += 1;
      ahorro += cobroDeEnvio(envio).ahorro;
    }
    return { clientes, ahorro };
  }, [deProxima, vista.paquetes]);
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
  const totalUrgente = urgentes.selectivos.length + urgentes.sinPrealerta.length + urgentes.almacenaje.length;

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
            if (e.id === "pendiente") pie = `${xs.filter((p) => p.prealerta?.origen === "captura").length} leídos por la IA`;
            if (e.id === "miami") {
              const sin = xs.filter((p) => !p.prealerta).length;
              pie = sin ? `${sin} sin prealerta` : libras(xs.reduce((n, p) => n + (p.pesoLb ?? 0), 0));
              alarma = sin > 0;
            }
            if (e.id === "transito") pie = enAire ? `Aterriza a las ${horaCorta(enAire.llega)}` : "";
            if (e.id === "aduana") {
              const rojos = xs.filter((p) => p.selectivo).length;
              pie = rojos ? `${rojos} con selectivo rojo` : "Sin selectivo rojo";
              alarma = rojos > 0;
            }
            if (e.id === "listo") pie = falta > 0 ? `${dinero(falta)} por cobrar` : "Todo cobrado";
            if (e.id === "entregado") pie = "Últimos 7 días";
            return (
              <Link
                key={e.id}
                href={e.id === "entregado" ? "/paquetes?etapa=entregado" : `/paquetes?etapa=${e.id}`}
                className="rounded-2xl border border-line bg-card p-4 transition hover:border-[var(--border-2)] hover:shadow-sm"
              >
                <div className="flex min-h-[32px] items-center gap-2 text-[12px] font-semibold text-[var(--text-2)]">
                  <PuntoEtapa etapa={e.id} />
                  <span className="leading-tight">{e.nombre}</span>
                </div>
                <p className="mt-2 text-[28px] font-extrabold leading-none text-[var(--text)]">{xs.length}</p>
                <p className={cn("mt-1.5 truncate text-[11.5px]", alarma ? "font-bold text-[var(--susa-ambar)]" : "text-[var(--text-3)]")}>{pie}</p>
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
                {urgentes.selectivos.map((p) => (
                  <Urgente key={`r-${p.id}`} chip={<AlertaChip tipo="selectivo">Selectivo rojo</AlertaChip>} href={`/paquetes?id=${p.id}`}>
                    {p.contenido} de <b>{clienteDe(vista, p.clienteId)?.nombre}</b>: {p.selectivo?.motivo.toLowerCase()}.
                  </Urgente>
                ))}
                {urgentes.sinPrealerta.map((p) => (
                  <Urgente key={`s-${p.id}`} chip={<AlertaChip tipo="sin_prealerta">Sin prealerta</AlertaChip>} href={`/paquetes?id=${p.id}`}>
                    Caja de {p.tienda} para <b>{clienteDe(vista, p.clienteId)?.nombre}</b> ({libras(p.pesoLb ?? 0)}) llegó a Miami sin prealerta: falta su factura antes de que salga la carga.
                  </Urgente>
                ))}
                {urgentes.almacenaje.map((x) => (
                  <Urgente key={`v-${x.paquete.id}`} chip={<AlertaChip tipo="almacenaje">{textoAlmacenaje(x)}</AlertaChip>} href={`/paquetes?id=${x.paquete.id}`}>
                    {x.paquete.contenido} de <b>{clienteDe(vista, x.paquete.clienteId)?.nombre}</b>{" "}
                    {x.estado === "cobrando"
                      ? `ya cobra almacenaje (10% por semana). Cae en abandono el ${fechaCorta(diaSV(x.abandono))}.`
                      : `cumple 30 días sin retirarse el ${fechaCorta(diaSV(x.limite))}: desde ahí cobra almacenaje.`}
                  </Urgente>
                ))}
              </ul>
            )}
          </Tarjeta>

          {/* Cargas */}
          <Tarjeta titulo="Cargas" accion={<Link href="/paquetes?vista=cargas" className="text-[12px] font-bold text-[var(--brand-accent)] hover:underline">Ver todas</Link>}>
            <div className="space-y-4">
              {enAire && (
                <div>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-1.5 font-bold text-[var(--text)]">
                      <Plane size={15} className="text-[var(--susa-etapa-transito)]" /> {nombreCarga(enAire)} en el aire
                    </span>
                    <span className="text-[var(--text-2)]">
                      {cuantos(deAire.length, "paquete", "paquetes")} · {libras(deAire.reduce((n, p) => n + (p.pesoLb ?? 0), 0))}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-2 rounded-full bg-[var(--susa-etapa-transito)]"
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
              {proxima && (
                <div className="rounded-xl bg-surface p-3">
                  <p className="text-[12.5px] font-bold text-[var(--text)]">Próxima: {nombreCarga(proxima)}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--text-2)]">Sale el {salidaDe(proxima)}</p>
                  <p className="text-[12px] text-[var(--text-2)]">Corte de bodega: {diaHora(proxima.corte)}</p>
                  <p className="mt-1.5 text-[12px] text-[var(--text-2)]">
                    <b className="text-[var(--text)]">{cuantos(deProxima.length, "paquete", "paquetes")}</b> · {libras(deProxima.reduce((n, p) => n + (p.pesoLb ?? 0), 0))} ·{" "}
                    {dinero(deProxima.reduce((n, p) => n + p.valor, 0))} en facturas
                  </p>
                  {consolidados.clientes > 0 && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--brand-green)]">
                      <Layers size={13} /> {cuantos(consolidados.clientes, "cliente consolidado", "clientes consolidados")}
                      {consolidados.ahorro > 0 ? `: ahorran ${dinero(consolidados.ahorro)} de flete` : ""}
                    </p>
                  )}
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
                    className={cn("w-full rounded-t-md", d.dia === hoy ? "bg-brand" : "bg-[var(--susa-etapa-miami)]")}
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

          <Tarjeta titulo="Listos para entregar" sub="Por sucursal">
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
                      <div className="h-2 rounded-full bg-[var(--susa-etapa-listo)]" style={{ width: `${(n / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Tarjeta>
        </div>
      </div>

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
