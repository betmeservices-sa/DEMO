"use client";

// Los paquetes del cliente al lado de su chat (panel derecho de la bandeja).
//
// Lo principal es la prealerta desde la captura: el cliente manda el
// pantallazo de su pedido o su factura, la IA lee tienda, tracking, contenido
// y valor, y con un clic queda el paquete prealertado (antes de que llegue a
// Miami, así no lleva el cargo de $1.50) y el cliente recibe la confirmación
// con lo que va a pagar de impuestos. Debajo, lo que tiene en camino y lo que
// pide atención (selectivo rojo, consolidado), con su acción a la mano.

import Link from "next/link";
import { useState } from "react";
import { Check, Layers, ScanLine, ShieldCheck } from "lucide-react";
import type { Contact, Conversation } from "@/lib/data/types";
import { claveTelefono } from "@/lib/ficha-en-bandeja";
import { sucursalDef } from "@/lib/shopusa/catalogo";
import { arancelDe, cobroDeEnvio, dinero, envioDe, ivaDe } from "@/lib/shopusa/cobro";
import { paquetesDe } from "@/lib/shopusa/vista";
import { crearPrealerta, registrar, useShopusa } from "@/lib/shopusa/store";
import { motivoEnFrase, nombreCarga } from "@/lib/shopusa/formato";
import { useYo } from "@/lib/yo";
import { AlertaChip, EtapaChip, IaChip, categoriaCorta, trackingLegible } from "./ui";

export function PaquetesEnBandeja({ conversation, contact }: { conversation: Conversation; contact: Contact }) {
  const vista = useShopusa();
  const yo = useYo();
  const [hecho, setHechoEn] = useState<{ conv: string; texto: string } | null>(null);
  const setHecho = (texto: string) => setHechoEn({ conv: conversation.id, texto });

  const cliente =
    vista.clientes.find((c) => c.conversationId === conversation.id) ??
    vista.clientes.find((c) => conversation.id === `susa-${c.id}`) ??
    (contact.telefono ? vista.clientes.find((c) => claveTelefono(c.telefono) === claveTelefono(contact.telefono)) : undefined);
  const capturas = vista.capturasPendientes.filter((c) => c.conversationId === conversation.id);

  if (!cliente) {
    return (
      <div className="rounded-xl border border-dashed border-line px-3 py-2.5 text-[12px] text-[var(--text-3)]">
        Todavía no tiene cuenta en ShopUSA.
      </div>
    );
  }

  const ps = paquetesDe(vista, cliente.id).filter((p) => p.etapa !== "entregado");
  const nombre = cliente.nombre.split(" ")[0];
  // El envío consolidado que tenga en camino (dos o más paquetes en la misma carga).
  const consolidado = ps.map((p) => envioDe(p, vista.paquetes)).find((e) => e.length > 1 && e[0].etapa !== "listo");
  const ahorro = consolidado ? cobroDeEnvio(consolidado).ahorro : 0;

  return (
    <div className="space-y-2.5">
      {capturas.map((cap) => {
        const arancel = arancelDe(cap.lectura.valor, cap.lectura.categoria);
        const impuestos = ivaDe(cap.lectura.valor) + arancel.monto;
        return (
          <div key={cap.lectura.tracking} className="rounded-xl border border-[var(--brand-accent)]/30 bg-[var(--brand-accent-soft)] p-3">
            <p className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--brand-accent)]">
              <ScanLine size={14} /> Lucía leyó la captura
            </p>
            <dl className="mt-2 space-y-1 text-[12px]">
              <Linea label="Tienda" valor={`${cap.lectura.tienda} · ${cap.lectura.transportista}`} />
              <Linea label="Contenido" valor={cap.lectura.contenido} />
              <Linea label="Factura" valor={dinero(cap.lectura.valor)} />
              <Linea label="Tracking" valor={trackingLegible(cap.lectura.tracking)} mono />
              <Linea label="Categoría" valor={categoriaCorta(cap.lectura.categoria)} />
              <Linea
                label="Impuestos"
                valor={`${dinero(impuestos)} (IVA${arancel.tipo === "fija" ? " + tarifa fija" : arancel.tipo === "dai" ? ` + DAI ${arancel.pct}%` : ""})`}
              />
              <Linea label="Retira en" valor={sucursalDef(cliente.sucursal).nombre} />
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
        );
      })}

      {hecho?.conv === conversation.id && (
        <p className="rounded-lg bg-[var(--susa-verde-suave)] px-3 py-2 text-[12px] font-semibold text-[var(--brand-green)]">{hecho.texto}</p>
      )}

      <div className="rounded-xl border border-line bg-surface/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[13px] font-bold text-brand">{cliente.codigo}</p>
          <Link href={`/clientes?id=${cliente.id}`} className="text-[11.5px] font-bold text-[var(--brand-accent)] hover:underline">
            Ver cliente
          </Link>
        </div>
        <p className="text-[11.5px] text-[var(--text-3)]">Sucursal favorita: {sucursalDef(cliente.sucursal).nombre}</p>
        {!cliente.duiRegistrado && (
          <p className="mt-1.5 text-[11.5px] font-semibold text-[var(--susa-ambar)]">Sin DUI en su perfil: no puede prealertar en la web.</p>
        )}

        {consolidado && (
          <div className="mt-2.5 rounded-lg bg-[var(--susa-verde-suave)] p-2.5">
            <p className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--brand-green)]">
              <Layers size={13} /> {consolidado.length} paquetes consolidados en la {nombreCarga(consolidado[0].cargaId).toLowerCase()}
            </p>
            <p className="mt-0.5 text-[11.5px] text-[var(--text-2)]">
              Se pesan juntos y paga un solo flete{ahorro > 0 ? `: ahorra ${dinero(ahorro)}` : ""}.
            </p>
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
                  {p.etapa === "miami" && !p.prealerta && (
                    <div className="mt-1.5">
                      <AlertaChip tipo="sin_prealerta">Sin prealerta</AlertaChip>
                    </div>
                  )}
                </Link>
                {p.etapa === "aduana" && p.selectivo && (
                  <div className="mt-2 border-t border-line pt-2">
                    <p className="text-[11.5px] font-semibold text-[var(--brand-red)]">Selectivo rojo: {motivoEnFrase(p.selectivo.motivo)}</p>
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
