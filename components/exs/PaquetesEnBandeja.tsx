"use client";

// Los paquetes del cliente al lado de su chat (panel derecho de la bandeja).
//
// Lo principal es la prealerta desde la captura: el cliente manda el
// pantallazo de su pedido, la IA lee tienda, tracking, contenido y valor, y con
// un clic queda el paquete prealertado y el cliente recibe la confirmación.
// Debajo, lo que tiene en camino y lo que pide atención (retenido, pasa de $300
// en un vuelo), con su acción a la mano.

import Link from "next/link";
import { useState } from "react";
import { Check, Plane, ScanLine, ShieldCheck } from "lucide-react";
import type { Contact, Conversation } from "@/lib/data/types";
import { claveTelefono } from "@/lib/ficha-en-bandeja";
import { sucursalDef } from "@/lib/exs/catalogo";
import { dinero } from "@/lib/exs/cobro";
import { siguienteVuelo } from "@/lib/exs/alertas";
import { paquetesDe } from "@/lib/exs/vista";
import { crearPrealerta, registrar, useExs } from "@/lib/exs/store";
import { useYo } from "@/lib/yo";
import { EtapaChip, IaChip, categoriaCorta, trackingLegible } from "./ui";

export function PaquetesEnBandeja({ conversation, contact }: { conversation: Conversation; contact: Contact }) {
  const vista = useExs();
  const yo = useYo();
  const [hecho, setHecho] = useState<string | null>(null);

  const cliente =
    vista.clientes.find((c) => c.conversationId === conversation.id) ??
    vista.clientes.find((c) => conversation.id === `exs-${c.id}`) ??
    (contact.telefono ? vista.clientes.find((c) => claveTelefono(c.telefono) === claveTelefono(contact.telefono)) : undefined);
  const capturas = vista.capturasPendientes.filter((c) => c.conversationId === conversation.id);

  if (!cliente) {
    return (
      <div className="rounded-xl border border-dashed border-line px-3 py-2.5 text-[12px] text-[var(--text-3)]">
        Sin casillero todavía.
      </div>
    );
  }

  const ps = paquetesDe(vista, cliente.id).filter((p) => p.etapa !== "entregado");
  const sobre = vista.alertas.sobreLimite.find((s) => s.cliente.id === cliente.id);
  const otro = sobre ? siguienteVuelo(vista.vuelos, sobre.vuelo.id) : undefined;
  const nombre = cliente.nombre.split(" ")[0];

  return (
    <div className="space-y-2.5">
      {capturas.map((cap) => (
        <div key={cap.lectura.tracking} className="rounded-xl border border-[var(--brand-accent)]/30 bg-[var(--brand-accent-soft)] p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--brand-accent)]">
            <ScanLine size={14} /> Lucía leyó la captura
          </p>
          <dl className="mt-2 space-y-1 text-[12px]">
            <Linea label="Tienda" valor={`${cap.lectura.tienda} · ${cap.lectura.transportista}`} />
            <Linea label="Contenido" valor={cap.lectura.contenido} />
            <Linea label="Valor" valor={dinero(cap.lectura.valor)} />
            <Linea label="Tracking" valor={trackingLegible(cap.lectura.tracking)} mono />
            <Linea label="Aduana" valor={categoriaCorta(cap.lectura.categoria)} />
          </dl>
          <button
            type="button"
            onClick={() => {
              const p = crearPrealerta(cap, yo);
              if (p) setHecho(`Quedó prealertado (${p.id}) y ${nombre} recibió la confirmación.`);
            }}
            className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[12.5px] font-bold text-white hover:bg-brand-dark"
          >
            <Check size={15} /> Crear prealerta y avisar
          </button>
        </div>
      ))}

      {hecho && <p className="rounded-lg bg-[var(--exs-verde-suave)] px-3 py-2 text-[12px] font-semibold text-[var(--brand-green)]">{hecho}</p>}

      <div className="rounded-xl border border-line bg-surface/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[13px] font-bold text-brand">{cliente.casillero}</p>
          <Link href={`/clientes?id=${cliente.id}`} className="text-[11.5px] font-bold text-[var(--brand-accent)] hover:underline">
            Ver cliente
          </Link>
        </div>
        <p className="text-[11.5px] text-[var(--text-3)]">Retira en {sucursalDef(cliente.sucursal).nombre}</p>

        {sobre && otro && sobre.sugerido && (
          <div className="mt-2.5 rounded-lg bg-[var(--exs-ambar-fondo)] p-2.5">
            <p className="text-[12px] font-bold text-[var(--exs-ambar)]">
              Trae {dinero(sobre.total)} en el {sobre.vuelo.id}
            </p>
            <p className="mt-0.5 text-[11.5px] text-[var(--text-2)]">Desde $300 por vuelo paga IVA más DAI.</p>
            <button
              type="button"
              onClick={() => {
                if (registrar("vuelo", sobre.sugerido!.id, { vueloId: otro.id }, yo)) {
                  setHecho(`${sobre.sugerido!.contenido} pasó al ${otro.id}. ${nombre} recibió el aviso.`);
                }
              }}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-2.5 py-1.5 text-[12px] font-bold text-white hover:bg-brand-dark"
            >
              <Plane size={14} /> Pasar {sobre.sugerido.contenido} al {otro.id}
            </button>
          </div>
        )}

        {ps.length === 0 ? (
          <p className="mt-2.5 text-[12px] text-[var(--text-3)]">Nada en camino.</p>
        ) : (
          <ul className="mt-2.5 space-y-2">
            {ps.map((p) => (
              <li key={p.id} className="rounded-lg bg-card p-2.5">
                <Link href={`/paquetes?id=${p.id}`} className="block">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-[12.5px] font-semibold leading-snug text-[var(--text)]">{p.contenido}</p>
                    {p.prealerta?.origen === "captura" && <IaChip compacto />}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <EtapaChip etapa={p.etapa} />
                    <span className="text-[11px] text-[var(--text-3)]">{p.tienda}</span>
                  </div>
                </Link>
                {p.etapa === "aduana" && p.retenido && (
                  <div className="mt-2 border-t border-line pt-2">
                    <p className="text-[11.5px] font-semibold text-[var(--brand-red)]">{p.retenido.motivo}</p>
                    <button
                      type="button"
                      onClick={() => {
                        if (registrar("liberar", p.id, {}, yo)) setHecho(`Aduana liberó ${p.contenido}. ${nombre} recibió su total por WhatsApp.`);
                      }}
                      className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12px] font-bold text-[var(--text)] hover:bg-surface"
                    >
                      <ShieldCheck size={14} /> Aduana lo liberó
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Linea({ label, valor, mono = false }: { label: string; valor: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="shrink-0 text-[var(--text-3)]">{label}</dt>
      <dd className={`text-right font-semibold text-[var(--text)] ${mono ? "font-mono text-[11px]" : ""}`}>{valor}</dd>
    </div>
  );
}
