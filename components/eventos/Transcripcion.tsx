"use client";

// Una transcripción de llamada, en burbujas. La plataforma de voz la entrega
// como líneas "AI: ..." y "User: ..."; lo que no trae prefijo sigue a la línea
// anterior.

import { cn } from "@/lib/cn";

interface Turno {
  quien: "agente" | "cliente";
  texto: string;
}

export function partirTranscripcion(texto: string): Turno[] {
  const out: Turno[] = [];
  for (const cruda of texto.split(/\r?\n/)) {
    const linea = cruda.trim();
    if (!linea) continue;
    const m = linea.match(/^(AI|Assistant|Bot|Daniela|User|Customer|Cliente|Organizador)\s*:\s*(.*)$/i);
    if (m) {
      const quien = /^(ai|assistant|bot|daniela)$/i.test(m[1]) ? "agente" : "cliente";
      out.push({ quien, texto: m[2] });
    } else if (out.length) {
      out[out.length - 1].texto += ` ${linea}`;
    } else {
      out.push({ quien: "cliente", texto: linea });
    }
  }
  return out;
}

export function Transcripcion({ texto, quienLlama = "Organizador" }: { texto: string; quienLlama?: string }) {
  const turnos = partirTranscripcion(texto);
  return (
    <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-lg bg-surface p-3">
      {turnos.map((t, i) => (
        <div key={i} className={cn("flex", t.quien === "agente" ? "justify-start" : "justify-end")}>
          <div
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed",
              t.quien === "agente" ? "rounded-tl-sm bg-card text-[var(--text)] shadow-sm" : "rounded-tr-sm bg-[var(--brand-accent)] text-white",
            )}
          >
            <p className={cn("mb-0.5 text-[10.5px] font-bold", t.quien === "agente" ? "text-brand" : "text-white/75")}>
              {t.quien === "agente" ? "Daniela" : quienLlama}
            </p>
            {t.texto}
          </div>
        </div>
      ))}
    </div>
  );
}
