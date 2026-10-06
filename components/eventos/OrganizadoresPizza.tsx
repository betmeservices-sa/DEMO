"use client";

// Contactos de Pizza Hut: los organizadores que han propuesto eventos, con sus
// etiquetas (tipo de evento, recurrente, confirmado) y sus propuestas. Se arma
// de las propuestas (muestra y reales) y de la bandeja de muestra, así una
// persona es la misma en Eventos, en la Bandeja y aquí.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Mail, MessageCircle, Phone, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Propuesta } from "@/lib/eventos/tipos";
import { NOMBRE_CANAL, tagDeTipo } from "@/lib/eventos/catalogo";
import { fechaCorta } from "@/lib/eventos/fechas";
import { activeTenant } from "@/lib/tenants/active";
import { Avatar, inicialesDe } from "@/components/ui/Avatar";
import { useEventos } from "./useEventos";
import { EtapaChip, RealBadge, miles } from "./ui";

interface Organizador {
  clave: string;
  nombre: string;
  cargo: string;
  empresa: string;
  telefono: string;
  correo: string;
  handle?: string;
  canal: string;
  tags: string[];
  propuestas: Propuesta[];
  real: boolean;
}

function telefonoBonito(t: string): string {
  return t.length === 8 ? `${t.slice(0, 4)} ${t.slice(4)}` : t;
}

export function armarOrganizadores(propuestas: Propuesta[]): Organizador[] {
  const mapa = new Map<string, Organizador>();
  const ordenadas = [...propuestas].sort((a, b) => b.creada.localeCompare(a.creada));
  for (const p of ordenadas) {
    const d = p.datos;
    const clave = d.contacto_telefono || `${d.contacto_nombre}|${d.contacto_empresa}`.toLowerCase();
    if (!d.contacto_nombre && !d.contacto_telefono) continue;
    const o =
      mapa.get(clave) ??
      ({
        clave,
        nombre: d.contacto_nombre || "Sin nombre",
        cargo: d.contacto_cargo,
        empresa: d.contacto_empresa,
        telefono: d.contacto_telefono,
        correo: d.contacto_correo,
        canal: d.contacto_canal ? NOMBRE_CANAL[d.contacto_canal] : NOMBRE_CANAL[p.canal],
        tags: [],
        propuestas: [],
        real: false,
      } satisfies Organizador);
    o.propuestas.push(p);
    o.real ||= p.origen === "real";
    if (!o.correo && d.contacto_correo) o.correo = d.contacto_correo;
    mapa.set(clave, o);
  }
  // Los de la bandeja que todavía no dejaron una propuesta completa.
  for (const c of activeTenant().seed.contacts) {
    const tel = (c.telefono ?? "").replace(/\D/g, "").replace(/^503/, "");
    const yaEsta = [...mapa.values()].some((o) => (tel && o.telefono === tel) || o.nombre === c.nombre);
    if (yaEsta) continue;
    mapa.set(`seed-${c.id}`, {
      clave: `seed-${c.id}`,
      nombre: c.nombre,
      cargo: "",
      empresa: "",
      telefono: tel,
      correo: c.correo ?? "",
      handle: c.handle,
      canal: c.canal === "facebook" ? "Messenger" : c.canal === "instagram" ? "Instagram" : "WhatsApp",
      tags: c.tags ?? [],
      propuestas: [],
      real: false,
    });
  }
  for (const o of mapa.values()) {
    const tags = new Set(o.tags);
    for (const p of o.propuestas) tags.add(tagDeTipo(p.datos.tipo_evento));
    if (o.propuestas.length > 1 || o.propuestas.some((p) => p.datos.evento_recurrente)) tags.add("Recurrente");
    if (o.propuestas.some((p) => p.etapa === "confirmada")) tags.add("Confirmado");
    o.tags = [...tags].filter((t) => t !== "Otro");
  }
  return [...mapa.values()];
}

export function OrganizadoresPizza() {
  const { datos } = useEventos();
  const tagsTenant = activeTenant().tags;
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [activo, setActivo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const organizadores = useMemo(() => (datos ? armarOrganizadores(datos.propuestas) : []), [datos]);
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return organizadores.filter(
      (o) => (!tag || o.tags.includes(tag)) && (!t || [o.nombre, o.empresa, o.telefono, o.correo, o.handle ?? ""].join(" ").toLowerCase().includes(t)),
    );
  }, [organizadores, q, tag]);
  const sel = organizadores.find((o) => o.clave === activo) ?? filtrados[0];

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4500);
    return () => clearTimeout(t);
  }, [aviso]);

  function accion(o: Organizador, tipo: "llamar" | "whatsapp" | "correo") {
    if (!o.real) {
      setAviso(`${tipo === "llamar" ? "Llamada" : tipo === "whatsapp" ? "WhatsApp" : "Correo"} simulado: en la muestra no se contacta a nadie.`);
      return;
    }
    if (tipo === "llamar" && o.telefono) window.open(`tel:+503${o.telefono}`);
    if (tipo === "whatsapp" && o.telefono) window.open(`https://wa.me/503${o.telefono}`, "_blank", "noopener");
    if (tipo === "correo" && o.correo) window.open(`mailto:${o.correo}`);
  }

  const color = (t: string) => {
    const i = tagsTenant.indexOf(t);
    return i >= 7 ? "var(--brand-blue)" : "var(--ph-negro)";
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line bg-card px-5 py-3">
        <h1 className="text-[17px] font-extrabold tracking-tight text-brand">Contactos</h1>
        <p className="text-[12.5px] text-[var(--text-3)]">{organizadores.length} organizadores</p>
      </header>
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-card px-5 py-2.5">
        <label className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nombre, empresa o teléfono" className="w-64 rounded-lg border border-line bg-surface py-1.5 pl-8 pr-2 text-[12.5px]" />
        </label>
        {tagsTenant.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag((x) => (x === t ? "" : t))}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition",
              tag === t ? "border-[var(--brand-accent)] bg-[var(--brand-accent)] text-white" : "border-line bg-card text-[var(--text-2)] hover:border-[var(--text)]",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        <ul className="w-full max-w-sm shrink-0 overflow-y-auto border-r border-line bg-card">
          {filtrados.map((o) => (
            <li key={o.clave}>
              <button
                type="button"
                onClick={() => setActivo(o.clave)}
                className={cn("flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition hover:bg-surface", sel?.clave === o.clave && "bg-surface")}
              >
                <Avatar iniciales={inicialesDe(o.nombre)} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-[13px] font-bold text-[var(--text)]">
                    {o.nombre}
                    {o.real && <RealBadge />}
                  </p>
                  <p className="truncate text-[11.5px] text-[var(--text-2)]">{o.empresa || o.handle || telefonoBonito(o.telefono)}</p>
                </div>
                <span className="text-[11px] font-semibold text-[var(--text-3)]">{o.propuestas.length || ""}</span>
              </button>
            </li>
          ))}
          {filtrados.length === 0 && <li className="p-6 text-center text-[12.5px] text-[var(--text-3)]">Nadie con ese filtro.</li>}
        </ul>

        <div className="min-w-0 flex-1 overflow-y-auto p-5">
          {sel ? (
            <div className="max-w-3xl space-y-4">
              <div className="flex items-start gap-4">
                <Avatar iniciales={inicialesDe(sel.nombre)} size={52} />
                <div className="min-w-0 flex-1">
                  <h2 className="flex items-center gap-2 text-[19px] font-extrabold text-[var(--text)]">
                    {sel.nombre} {sel.real && <RealBadge />}
                  </h2>
                  <p className="text-[12.5px] text-[var(--text-2)]">{[sel.cargo, sel.empresa].filter(Boolean).join(" · ") || sel.handle}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {sel.tags.map((t) => (
                      <span key={t} className="flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-[var(--text)]">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color(t) }} />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-xl border border-line bg-card p-4 sm:grid-cols-3">
                <Campo label="Teléfono" valor={sel.telefono ? telefonoBonito(sel.telefono) : ""} />
                <Campo label="Correo" valor={sel.correo} />
                <Campo label="Prefiere" valor={sel.canal} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Boton Icono={Phone} texto="Llamar" onClick={() => accion(sel, "llamar")} off={!sel.telefono} />
                <Boton Icono={MessageCircle} texto="WhatsApp" onClick={() => accion(sel, "whatsapp")} off={!sel.telefono} />
                <Boton Icono={Mail} texto="Correo" onClick={() => accion(sel, "correo")} off={!sel.correo} />
              </div>

              <section className="rounded-xl border border-line bg-card">
                <h3 className="border-b border-line px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide text-[var(--text-3)]">Propuestas</h3>
                {sel.propuestas.length === 0 ? (
                  <p className="px-4 py-3 text-[12.5px] text-[var(--text-3)]">Todavía no deja una propuesta completa: la conversación sigue en la Bandeja.</p>
                ) : (
                  <ul>
                    {sel.propuestas.map((p) => (
                      <li key={p.id}>
                        <Link href={`/eventos?id=${encodeURIComponent(p.id)}`} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0 hover:bg-surface/60">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold text-[var(--text)]">{p.datos.nombre_evento || "Evento sin nombre"}</p>
                            <p className="truncate text-[11.5px] text-[var(--text-2)]">
                              {[p.datos.fecha_inicio ? fechaCorta(p.datos.fecha_inicio) : "Sin fecha", p.datos.recinto, p.datos.aforo_esperado ? `${miles(p.datos.aforo_esperado)} pers.` : ""]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <EtapaChip etapa={p.etapa} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : (
            <p className="text-[13px] text-[var(--text-3)]">{datos ? "Elija un organizador." : "Cargando..."}</p>
          )}
        </div>
      </div>

      {aviso && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-[var(--brand-accent)] px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-xl">{aviso}</div>
      )}
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-[var(--text-3)]">{label}</p>
      <p className={cn("truncate text-[13px] font-semibold", valor ? "text-[var(--text)]" : "italic text-[var(--text-3)]")}>{valor || "Sin dato"}</p>
    </div>
  );
}

function Boton({ Icono, texto, onClick, off }: { Icono: typeof Phone; texto: string; onClick: () => void; off?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={off}
      className="flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text)] transition hover:border-[var(--text)] disabled:opacity-40"
    >
      <Icono size={14} />
      {texto}
    </button>
  );
}
