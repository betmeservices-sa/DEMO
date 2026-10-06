"use client";

// Daniela, la agente del área de eventos: qué atiende, qué pregunta y qué no
// hace. Debajo va la tarjeta de siempre, con su línea y el marcador.

import { Instagram, Facebook, MessageCircle, Phone } from "lucide-react";
import { LINEA_DANIELA } from "@/lib/tenants/pizzahut";

const PREGUNTA = [
  "Tipo de evento, fecha, horario y lugar",
  "Aforo, perfil del público y tipo de entrada",
  "Qué proponen: venta en sitio, patrocinio, catering o donación",
  "Condiciones: cuota, comisión, exclusividad y otros vendedores",
  "Logística: espacio, energía, agua, toldo, montaje y permisos",
  "Los datos del organizador y cómo prefiere que lo contacten",
];

export function DanielaPerfil() {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-[22px] font-extrabold text-white">D</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-extrabold tracking-tight text-[var(--text)]">Daniela</h2>
          <p className="text-[12.5px] text-[var(--text-2)]">
            Atiende a los organizadores que invitan a Pizza Hut a su evento, toma la propuesta completa y avisa que un asesor les va a
            contactar. Las 24 horas, todos los días.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-accent)] px-2.5 py-1.5 font-mono text-[13px] font-bold text-white">
              <Phone size={14} /> {LINEA_DANIELA}
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-2)]">
              <MessageCircle size={14} /> WhatsApp
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-2)]">
              <Instagram size={14} /> Instagram
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-2)]">
              <Facebook size={14} /> Messenger
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--text-3)]">Lo que pregunta</h3>
          <ul className="space-y-1">
            {PREGUNTA.map((p) => (
              <li key={p} className="flex gap-2 text-[12.5px] text-[var(--text)]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--text-3)]">Lo que no hace</h3>
          <ul className="space-y-1 text-[12.5px] text-[var(--text)]">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ph-gris)]" />
              No acepta ni rechaza propuestas: eso lo decide el equipo.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ph-gris)]" />
              No negocia condiciones ni da precios.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ph-gris)]" />
              Si llaman por un pedido o una sucursal, los orienta y lo cuenta aparte.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
