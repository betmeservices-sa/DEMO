"use client";

// Pedidos de La Campana: la cola de cocina de cada sucursal.
//
// Los pedidos se toman SOLO por WhatsApp: si alguien pide por Instagram o
// Facebook, Sofía le pasa el enlace y el pedido se arma en WhatsApp. Cada uno
// entra a la cola de su sucursal. La cocina prepara
// hasta CAPACIDAD_COCINA a la vez; el resto espera su turno con un tiempo
// estimado. Ningún pedido ocupa la agenda: esa queda para reservaciones y
// eventos.

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bike, Bot, CalendarHeart, ChefHat, Clock, CornerDownRight, Inbox, Plus, RotateCcw, Store, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { platoPorId, precio } from "@/lib/lacampana/menu";
import { SUCURSALES_CAMPANA, sucursalPorId } from "@/lib/lacampana/sucursales";
import {
  CAPACIDAD_COCINA,
  ETAPAS,
  MINUTOS_POR_TURNO,
  ORIGEN_NOMBRE,
  colaDe,
  enCocina,
  esperaEstimada,
  hayLugarEnCocina,
  siguienteEtapa,
  totalPedido,
  unidadesPedido,
  type EtapaPedido,
  type Pedido,
} from "@/lib/lacampana/pedidos";
import { avanzar, fijarAutoCola, llenar, restablecer, simularEntrante, useCampana } from "@/lib/lacampana/store";
import { CanalChip, Pill, haceMin, hora } from "./ui";

const TONO: Record<EtapaPedido, "cola" | "cocina" | "listo" | "camino" | "neutro"> = {
  cola: "cola",
  cocina: "cocina",
  listo: "listo",
  camino: "camino",
  entregado: "neutro",
};

const ACCION: Record<EtapaPedido, string> = {
  cola: "Pasar a cocina",
  cocina: "Marcar listo",
  listo: "",
  camino: "Marcar entregado",
  entregado: "",
};

function textoAccion(p: Pedido): string {
  if (p.etapa === "listo") return p.tipo === "domicilio" ? "Enviar con motorista" : "Entregado al cliente";
  return ACCION[p.etapa];
}

export function PedidosVista() {
  const { pedidos, autoCola } = useCampana();
  const [ahora, setAhora] = useState(() => Date.now());
  const [sucursal, setSucursal] = useState<string>("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  const visibles = useMemo(() => (sucursal ? pedidos.filter((p) => p.sucursalId === sucursal) : pedidos), [pedidos, sucursal]);

  // Las sucursales con algo en cola o en cocina, la más cargada primero.
  const cocinas = useMemo(() => {
    return SUCURSALES_CAMPANA.map((s) => ({
      ...s,
      cocina: enCocina(pedidos, s.id),
      cola: colaDe(pedidos, s.id, ahora).length,
    }))
      .filter((s) => s.cocina + s.cola > 0)
      .sort((a, b) => b.cola - a.cola || b.cocina - a.cocina);
  }, [pedidos, ahora]);

  const cuenta = (e: EtapaPedido) => visibles.filter((p) => p.etapa === e).length;
  // Los programados esperan su hora a propósito: no cuentan para la espera.
  const enColaTodos = visibles.filter((p) => p.etapa === "cola" && !p.programado);
  const esperaProm =
    enColaTodos.length === 0
      ? 0
      : Math.round(enColaTodos.reduce((t, p) => t + esperaEstimada(p, pedidos, ahora), 0) / enColaTodos.length);
  const pedidoAbierto = abierto ? pedidos.find((p) => p.id === abierto) ?? null : null;

  function mover(p: Pedido) {
    const antes = p.etapa;
    avanzar(p.id);
    if (antes === "cocina" && autoCola) {
      const sig = colaDe(pedidos, p.sucursalId, Date.now()).find((x) => x.id !== p.id);
      if (sig) setAviso(`#${p.numero} listo. La cocina de ${sucursalPorId(p.sucursalId)?.nombre} tomó el #${sig.numero} de la cola.`);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line bg-card px-5 py-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Pedidos</h1>
            <p className="text-[12.5px] text-[var(--text-3)]">
              Solo por WhatsApp · cola de cocina por sucursal · los pedidos no ocupan la agenda de reservas y eventos
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-card px-3 py-1.5 text-[12px] font-semibold text-[var(--text-2)]">
              <input type="checkbox" checked={autoCola} onChange={(e) => fijarAutoCola(e.target.checked)} className="accent-[var(--brand-blue)]" />
              La cocina toma sola de la cola
            </label>
            <button
              type="button"
              onClick={() => {
                const p = simularEntrante();
                setAviso(`Entró el #${p.numero} por WhatsApp${p.origen !== "whatsapp" ? ` (Sofía lo pasó desde ${ORIGEN_NOMBRE[p.origen]})` : ""}: va a la cola de ${sucursalPorId(p.sucursalId)?.nombre}.`);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90"
            >
              <Plus size={13} />
              Simular pedido entrante
            </button>
            <button
              type="button"
              onClick={() => restablecer()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-2)] transition hover:bg-surface"
              title="Volver a la muestra"
            >
              <RotateCcw size={13} />
              Restablecer
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {aviso && (
          <p className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/[0.06] px-3.5 py-2.5 text-[12.5px] text-[var(--text)]">
            <ChefHat size={15} className="shrink-0 text-brand" />
            {aviso}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi rotulo="En cola" valor={cuenta("cola")} Icono={Clock} tono="cola" />
          <Kpi rotulo="En cocina" valor={cuenta("cocina")} Icono={ChefHat} tono="cocina" />
          <Kpi rotulo="Listos" valor={cuenta("listo")} Icono={Store} tono="listo" />
          <Kpi rotulo="En camino" valor={cuenta("camino")} Icono={Bike} tono="camino" />
          <Kpi rotulo="Entregados hoy" valor={cuenta("entregado")} Icono={Inbox} tono="neutro" />
          <Kpi rotulo="Espera promedio en cola" valor={enColaTodos.length ? `${esperaProm} min` : "—"} Icono={Clock} tono="neutro" />
        </div>

        <div className="grid gap-4 2xl:grid-cols-[1fr_300px]">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sucursal}
                onChange={(e) => setSucursal(e.target.value)}
                className="rounded-lg border border-line bg-card px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text)]"
              >
                <option value="">Todas las sucursales</option>
                {SUCURSALES_CAMPANA.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
              {sucursal && (
                <span className="text-[12px] text-[var(--text-3)]">
                  Cocina {enCocina(pedidos, sucursal)}/{CAPACIDAD_COCINA} · {colaDe(pedidos, sucursal, ahora).length} en cola
                </span>
              )}
            </div>

            <div className="grid min-w-0 gap-3 lg:grid-cols-5">
              {ETAPAS.map((et) => {
                const lista = visibles
                  .filter((p) => p.etapa === et.id)
                  .sort((a, b) =>
                    et.id === "cola"
                      ? esperaEstimada(a, pedidos, ahora) - esperaEstimada(b, pedidos, ahora) || a.recibido.localeCompare(b.recibido)
                      : b.desde.localeCompare(a.desde),
                  );
                return (
                  <section key={et.id} className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface-2/60 p-2.5">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="flex items-center gap-2 text-[12.5px] font-bold text-[var(--text)]">
                        <span className={cn("h-2 w-2 rounded-full", {
                          "bg-[var(--lc-cola)]": et.id === "cola",
                          "bg-[var(--lc-cocina)]": et.id === "cocina",
                          "bg-[var(--lc-listo)]": et.id === "listo",
                          "bg-[var(--lc-camino)]": et.id === "camino",
                          "bg-[var(--text-3)]": et.id === "entregado",
                        })} />
                        {et.nombre}
                      </span>
                      <span className="text-[12px] font-semibold tabular-nums text-[var(--text-3)]">{lista.length}</span>
                    </div>
                    <p className="mb-2 px-1 text-[11px] text-[var(--text-3)]">{et.ayuda}</p>
                    <div className="space-y-2">
                      {lista.map((p) => (
                        <Tarjeta key={p.id} p={p} pedidos={pedidos} ahora={ahora} onAbrir={() => setAbierto(p.id)} onMover={() => mover(p)} />
                      ))}
                      {lista.length === 0 && <p className="px-1 py-4 text-center text-[11.5px] text-[var(--text-3)]">Nada aquí</p>}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          <aside className="grid gap-4 md:grid-cols-2 2xl:grid-cols-1 2xl:content-start">
            <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
              <h2 className="text-sm font-bold text-[var(--text)]">Cocinas con movimiento</h2>
              <p className="mb-3 mt-0.5 text-[12px] text-[var(--text-3)]">
                Cada cocina prepara {CAPACIDAD_COCINA} pedidos a la vez; un turno son ~{MINUTOS_POR_TURNO} min.
              </p>
              <ul className="space-y-3">
                {cocinas.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => setSucursal(s.id === sucursal ? "" : s.id)} className="w-full text-left">
                      <div className="mb-1 flex items-center justify-between text-[12.5px]">
                        <span className={cn("font-semibold", s.id === sucursal ? "text-brand" : "text-[var(--text)]")}>{s.nombre}</span>
                        <span className="tabular-nums text-[var(--text-3)]">
                          {s.cocina}/{CAPACIDAD_COCINA}
                          {s.cola > 0 && <span className="ml-1.5 font-semibold text-[var(--lc-cola)]">+{s.cola} en cola</span>}
                        </span>
                      </div>
                      <span className="flex h-2 gap-[2px]">
                        {Array.from({ length: CAPACIDAD_COCINA }, (_, i) => (
                          <span key={i} className={cn("flex-1 rounded-full", i < s.cocina ? "bg-[var(--lc-cocina)]" : "bg-surface-2")} />
                        ))}
                      </span>
                    </button>
                    {s.cocina < CAPACIDAD_COCINA && s.cola > 0 && !autoCola && (
                      <button type="button" onClick={() => llenar(s.id)} className="mt-1.5 text-[11.5px] font-semibold text-brand underline">
                        Pasar la cola a cocina
                      </button>
                    )}
                  </li>
                ))}
                {cocinas.length === 0 && <li className="text-[12px] text-[var(--text-3)]">Todas las cocinas libres.</li>}
              </ul>
            </section>

            <Link
              href="/agenda"
              className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm transition hover:bg-surface"
            >
              <CalendarHeart size={18} className="mt-0.5 shrink-0 text-brand" />
              <span>
                <span className="block text-[13px] font-bold text-[var(--text)]">Reservas y eventos van aparte</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-[var(--text-2)]">
                  La agenda solo lleva reservaciones de mesa y eventos. Los pedidos, aunque sean programados, esperan aquí en la cola.
                </span>
              </span>
            </Link>
          </aside>
        </div>
      </div>

      {pedidoAbierto && <Ficha p={pedidoAbierto} pedidos={pedidos} ahora={ahora} onCerrar={() => setAbierto(null)} onMover={() => mover(pedidoAbierto)} />}
    </div>
  );
}

function Kpi({ rotulo, valor, Icono, tono }: { rotulo: string; valor: string | number; Icono: typeof Clock; tono: "cola" | "cocina" | "listo" | "camino" | "neutro" }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3.5 shadow-sm">
      <span
        className={cn("flex h-8 w-8 items-center justify-center rounded-lg", {
          "bg-[var(--lc-cola-fondo)] text-[var(--lc-cola)]": tono === "cola",
          "bg-[var(--lc-cocina-fondo)] text-[var(--lc-cocina)]": tono === "cocina",
          "bg-[var(--lc-listo-fondo)] text-[var(--lc-listo)]": tono === "listo",
          "bg-[var(--lc-camino-fondo)] text-[var(--lc-camino)]": tono === "camino",
          "bg-surface-2 text-[var(--text-2)]": tono === "neutro",
        })}
      >
        <Icono size={16} />
      </span>
      <p className="mt-2 text-[22px] font-extrabold leading-none tabular-nums text-[var(--text)]">{valor}</p>
      <p className="mt-1 text-[12px] text-[var(--text-3)]">{rotulo}</p>
    </div>
  );
}

function Tarjeta({ p, pedidos, ahora, onAbrir, onMover }: { p: Pedido; pedidos: Pedido[]; ahora: number; onAbrir: () => void; onMover: () => void }) {
  const suc = sucursalPorId(p.sucursalId)?.nombre ?? p.sucursalId;
  const sig = siguienteEtapa(p);
  const lleno = p.etapa === "cola" && !hayLugarEnCocina(pedidos, p.sucursalId);
  const posicion = p.etapa === "cola" ? colaDe(pedidos, p.sucursalId, ahora).findIndex((x) => x.id === p.id) + 1 : 0;
  const espera = esperaEstimada(p, pedidos, ahora);
  const resumen = p.lineas.map((l) => `${l.cantidad}× ${platoPorId(l.platoId)?.nombre ?? l.platoId}`).join(", ");

  return (
    <article className="rounded-xl border border-line bg-card p-3 shadow-sm">
      <button type="button" onClick={onAbrir} className="block w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-extrabold text-[var(--text)]">#{p.numero}</span>
          <CanalChip canal="whatsapp" />
        </div>
        <p className="mt-1 truncate text-[12.5px] font-semibold text-[var(--text)]">{p.cliente}</p>
        <p className="truncate text-[11.5px] text-[var(--text-3)]">{suc}</p>
        <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-[var(--text-2)]">{resumen}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Pill tono="neutro">
            {p.tipo === "domicilio" ? <Bike size={11} /> : <Store size={11} />}
            {p.tipo === "domicilio" ? "Domicilio" : "Retiro"}
          </Pill>
          {p.porSofia && (
            <Pill tono="neutro">
              <Bot size={11} /> Sofía
            </Pill>
          )}
          {p.origen !== "whatsapp" && (
            <Pill tono="neutro">
              <CornerDownRight size={11} /> Desde {ORIGEN_NOMBRE[p.origen]}
            </Pill>
          )}
          {p.programado && <Pill tono="cola">Para {hora(p.programado)}</Pill>}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[11.5px]">
          <span className="font-bold tabular-nums text-[var(--text)]">{precio(totalPedido(p))}</span>
          <span className="text-right text-[var(--text-3)]">
            {p.etapa === "cola" ? `#${posicion} en cola · ${espera === 0 ? "entra ya" : `~${espera} min`}` : haceMin(p.desde, ahora)}
          </span>
        </div>
      </button>
      {sig && (
        <button
          type="button"
          onClick={onMover}
          disabled={lleno}
          title={lleno ? `La cocina de ${suc} está llena (${CAPACIDAD_COCINA}/${CAPACIDAD_COCINA})` : undefined}
          className={cn(
            "mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-semibold transition",
            lleno ? "cursor-not-allowed bg-surface-2 text-[var(--text-3)]" : "bg-brand/[0.08] text-brand hover:bg-brand/[0.14]",
          )}
        >
          {lleno ? "Cocina llena" : textoAccion(p)}
          {!lleno && <ArrowRight size={12} />}
        </button>
      )}
    </article>
  );
}

function Ficha({ p, pedidos, ahora, onCerrar, onMover }: { p: Pedido; pedidos: Pedido[]; ahora: number; onCerrar: () => void; onMover: () => void }) {
  const suc = sucursalPorId(p.sucursalId)?.nombre ?? p.sucursalId;
  const sig = siguienteEtapa(p);
  const lleno = p.etapa === "cola" && !hayLugarEnCocina(pedidos, p.sucursalId);
  const etapa = ETAPAS.find((e) => e.id === p.etapa);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onCerrar}>
      <aside className="flex h-full w-full max-w-md flex-col bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-3)]">Pedido</p>
            <h2 className="text-[20px] font-extrabold text-[var(--text)]">#{p.numero}</h2>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Pill tono={TONO[p.etapa]}>{etapa?.nombre}</Pill>
              <CanalChip canal="whatsapp" conNombre />
              {p.origen !== "whatsapp" && (
                <Pill tono="neutro">
                  <CornerDownRight size={11} /> Empezó en {ORIGEN_NOMBRE[p.origen]}
                </Pill>
              )}
              {p.porSofia && (
                <Pill tono="neutro">
                  <Bot size={11} /> Tomado por Sofía
                </Pill>
              )}
            </div>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-[var(--text-3)] hover:bg-surface">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 text-[13px]">
          <dl className="grid grid-cols-[110px_1fr] gap-y-1.5">
            <dt className="text-[var(--text-3)]">Cliente</dt>
            <dd className="font-semibold text-[var(--text)]">{p.cliente}</dd>
            <dt className="text-[var(--text-3)]">Teléfono</dt>
            <dd className="text-[var(--text)]">{p.telefono}</dd>
            <dt className="text-[var(--text-3)]">Sucursal</dt>
            <dd className="text-[var(--text)]">{suc}</dd>
            <dt className="text-[var(--text-3)]">Entrega</dt>
            <dd className="text-[var(--text)]">{p.tipo === "domicilio" ? `A domicilio · ${p.direccion ?? ""}` : "Retiro en sucursal"}</dd>
            <dt className="text-[var(--text-3)]">Pago</dt>
            <dd className="capitalize text-[var(--text)]">{p.pago}</dd>
            <dt className="text-[var(--text-3)]">Recibido</dt>
            <dd className="text-[var(--text)]">
              {hora(p.recibido)} · {haceMin(p.recibido, ahora)}
            </dd>
            {p.programado && (
              <>
                <dt className="text-[var(--text-3)]">Programado</dt>
                <dd className="text-[var(--text)]">
                  {new Date(p.programado).toLocaleString("es-SV", { weekday: "long", hour: "numeric", minute: "2-digit" })}
                </dd>
              </>
            )}
            {p.etapa === "cola" && (
              <>
                <dt className="text-[var(--text-3)]">Espera</dt>
                <dd className="font-semibold text-[var(--lc-cola)]">~{esperaEstimada(p, pedidos, ahora)} min para entrar a cocina</dd>
              </>
            )}
          </dl>

          <section>
            <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--text-3)]">Orden · {unidadesPedido(p)} platos</h3>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {p.lineas.map((l) => {
                const plato = platoPorId(l.platoId);
                return (
                  <li key={l.platoId} className="flex items-center gap-3 p-2.5">
                    {plato?.foto ? (
                      <Image src={plato.foto} alt="" width={44} height={44} className="h-11 w-11 rounded-lg object-cover" />
                    ) : (
                      <span className="h-11 w-11 rounded-lg bg-surface-2" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[var(--text)]">
                        {l.cantidad}× {plato?.nombre ?? l.platoId}
                      </p>
                      {l.nota && <p className="text-[12px] text-[var(--text-3)]">{l.nota}</p>}
                    </div>
                    <span className="font-semibold tabular-nums text-[var(--text)]">{precio((plato?.precio ?? 0) * l.cantidad)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex justify-between px-1 font-bold">
              <span>Total</span>
              <span className="tabular-nums text-brand">{precio(totalPedido(p))}</span>
            </div>
            {p.tipo === "domicilio" && <p className="mt-1 px-1 text-[12px] text-[var(--text-3)]">Más el envío que confirma la sucursal.</p>}
          </section>

          <Link href="/" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand underline">
            Ver el chat de WhatsApp en la bandeja
          </Link>
        </div>

        {sig && (
          <footer className="border-t border-line p-4">
            <button
              type="button"
              onClick={onMover}
              disabled={lleno}
              className="w-full rounded-xl bg-brand py-2.5 text-[13.5px] font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-[var(--text-3)]"
            >
              {lleno ? `Cocina llena (${CAPACIDAD_COCINA}/${CAPACIDAD_COCINA}): espera en cola` : textoAccion(p)}
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
