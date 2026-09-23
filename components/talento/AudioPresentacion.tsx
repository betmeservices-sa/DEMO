"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { embedVocaroo, linkVocaroo, vocarooId } from "@/lib/talento/audio";
import { despachar } from "@/lib/talento/store";
import type { Candidato } from "@/lib/talento/tipos";
import { Boton, INPUT } from "./ui";

/** La grabacion de 60 s en ingles, reproducida dentro de la ficha. */
export function AudioPresentacion({ c }: { c: Candidato }) {
  const id = vocarooId(c.audioUrl);
  const [link, setLink] = useState("");
  const valido = vocarooId(link);

  return (
    <div data-audio={id ? "si" : "no"} className="rounded-xl border border-line p-3">
      <p className="mb-2 text-[12.5px] font-bold text-[var(--text)]">Audio de presentación</p>
      {id ? (
        <>
          <iframe
            title={`Audio de ${c.nombre}`}
            src={embedVocaroo(id)}
            className="h-[60px] w-full rounded-lg border-0 bg-surface"
            allow="autoplay"
            loading="lazy"
          />
          <a
            href={linkVocaroo(id)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--brand-accent)] hover:underline"
          >
            <ExternalLink size={11} /> Abrir en Vocaroo
          </a>
        </>
      ) : (
        <div className="flex gap-2">
          <input
            className={INPUT}
            placeholder="Link de Vocaroo (vocaroo.com/... o voca.ro/...)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <Boton disabled={!valido} onClick={() => despachar({ type: "AUDIO_LINK", candidatoId: c.id, url: link })}>
            Guardar
          </Boton>
        </div>
      )}
    </div>
  );
}
