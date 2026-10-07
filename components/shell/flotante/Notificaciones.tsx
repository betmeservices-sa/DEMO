"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, CreditCard, HandCoins, MessageCircle, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";
import { departments } from "@/lib/data/seed";
import type { DepartmentId } from "@/lib/data/types";
import { activeTenantId } from "@/lib/tenants/active";
import { abrirConversacion, urgentesDe } from "@/lib/flotante";
import type { TipoUrgente } from "@/lib/tenants/chalatenango-panel";
import { usePopover } from "./usePopover";

interface Aviso {
  id: string;
  area: DepartmentId;
  icono: "cuota" | "promesa" | "tarjeta" | "consulta" | "mensaje";
  titulo: string;
  detalle: string;
  cuando: string;
  convId?: string;
}

const ICONO = {
  cuota: HandCoins,
  promesa: HandCoins,
  tarjeta: CreditCard,
  consulta: MessagesSquare,
  mensaje: MessageCircle,
} as const;

function hora(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-SV", { hour: "numeric", minute: "2-digit", timeZone: "America/El_Salvador" }).format(d);
}

function clave(): string {
  return `ccg.notif.leidas.${activeTenantId()}`;
}

/**
 * La campana: lo urgente del dia (cuotas, promesas, solicitudes) y los chats
 * con mensajes sin leer. El contador es lo que todavia no se marco como visto,
 * por pestana del navegador y por cliente.
 */
export function Notificaciones() {
  const { state } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const { abierto, setAbierto, ref } = usePopover();
  const [leidas, setLeidas] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(clave());
      if (raw) setLeidas(new Set(JSON.parse(raw) as string[]));
    } catch {
      // json roto: se arranca sin leidas
    }
  }, []);

  function guardar(next: Set<string>) {
    setLeidas(next);
    window.localStorage.setItem(clave(), JSON.stringify([...next]));
  }

  const avisos: Aviso[] = useMemo(() => {
    const tenant = activeTenantId();
    const convDe = (contactId: string) => state.conversations.find((c) => c.contactId === contactId);
    const urgentes: Aviso[] = urgentesDe(tenant).map((u) => ({
      id: u.id,
      area: u.area,
      icono: u.tipo as TipoUrgente,
      titulo: `${u.titulo}: ${u.persona}`,
      detalle: u.detalle,
      cuando: u.cuando,
      convId: convDe(u.contactId)?.id,
    }));
    // Los chats sin leer que no estan ya como urgentes.
    const yaEstan = new Set(urgentes.map((u) => u.convId).filter(Boolean));
    const mensajes: Aviso[] = state.conversations
      .filter((c) => c.noLeidos > 0 && !yaEstan.has(c.id))
      .sort((a, b) => b.ultimoMensajeTs.localeCompare(a.ultimoMensajeTs))
      .map((c) => {
        const contacto = state.contacts.find((x) => x.id === c.contactId);
        const ultimo = state.messages
          .filter((m) => m.conversationId === c.id && m.autor === "cliente")
          .sort((a, b) => b.ts.localeCompare(a.ts))[0];
        return {
          id: `msg-${c.id}-${c.ultimoMensajeTs}`,
          area: c.departamento,
          icono: "mensaje" as const,
          titulo: contacto?.nombre ?? "Mensaje nuevo",
          detalle: ultimo?.texto ?? "",
          cuando: hora(c.ultimoMensajeTs),
          convId: c.id,
        };
      });
    return [...mensajes, ...urgentes];
  }, [state.conversations, state.contacts, state.messages]);

  const pendientes = avisos.filter((a) => !leidas.has(a.id)).length;

  function abrir(a: Aviso) {
    guardar(new Set([...leidas, a.id]));
    setAbierto(false);
    const conv = a.convId ? state.conversations.find((c) => c.id === a.convId) : undefined;
    if (conv) abrirConversacion(activeTenantId(), conv.id, conv.departamento, pathname, (r) => router.push(r));
    else router.push("/dashboard");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={pendientes > 0 ? `Notificaciones, ${pendientes} sin ver` : "Notificaciones"}
        aria-expanded={abierto}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-2)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
      >
        <Bell size={18} />
        {pendientes > 0 && (
          <span className="absolute right-1 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[var(--brand-red)] px-1 text-[10px] font-bold text-white ring-2 ring-[var(--card)]">
            {pendientes > 9 ? "9+" : pendientes}
          </span>
        )}
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(92vw,380px)] origin-top-right overflow-hidden rounded-2xl bg-[var(--card)] shadow-xl ring-1 ring-[var(--border)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <p className="text-[14px] font-bold text-[var(--text)]">Notificaciones</p>
              <button
                type="button"
                onClick={() => guardar(new Set(avisos.map((a) => a.id)))}
                disabled={pendientes === 0}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold text-[var(--brand-blue)] transition hover:bg-[var(--surface)] disabled:opacity-50"
              >
                <CheckCheck size={14} />
                Marcar todo como visto
              </button>
            </div>
            <ul className="max-h-[min(70vh,460px)] overflow-y-auto p-1.5">
              {avisos.map((a) => {
                const Icono = ICONO[a.icono];
                const d = departments.find((x) => x.id === a.area);
                const nueva = !leidas.has(a.id);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => abrir(a)}
                      className="flex w-full gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-[var(--surface)]"
                    >
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{ backgroundColor: d?.color ?? "var(--brand-blue)" }}
                      >
                        <Icono size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className={cn("text-[13px] leading-snug text-[var(--text)]", nueva ? "font-bold" : "font-medium")}>
                            {a.titulo}
                          </span>
                          <span className="shrink-0 text-[11px] text-[var(--text-3)]">{a.cuando}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-[var(--text-2)]">{a.detalle}</span>
                      </span>
                      {nueva && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--brand-red)]" aria-label="Sin ver" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
