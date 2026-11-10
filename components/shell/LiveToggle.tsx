"use client";

import { cn } from "@/lib/cn";
import { useLive } from "@/lib/live-context";
import { activeTenant } from "@/lib/tenants/active";

export function LiveToggle() {
  const { enabled, toggle } = useLive();
  // Un panel sin simulación (los que atienden gente de verdad, como el lab) no
  // muestra el botón: prenderlo metía chats inventados entre los reales.
  if (activeTenant().simulacion.turnos.length === 0) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition",
        enabled
          ? "border-[#00c040]/30 bg-[#00c040]/10 text-[#2f9e2f]"
          : "border-line bg-surface text-[var(--text-3)]",
      )}
      title={enabled ? "Mensajes entrando en tiempo real" : "Pausado"}
    >
      <span className={cn("h-2 w-2 rounded-full", enabled ? "bg-[#00c040]" : "bg-[var(--text-3)]")}>
        {enabled && <span className="block h-2 w-2 animate-ping rounded-full bg-[#00c040]" />}
      </span>
      {enabled ? "En vivo" : "Pausado"}
    </button>
  );
}
