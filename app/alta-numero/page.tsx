"use client";

// Alta de un número de WhatsApp, en vivo y sin manos.
//
// Es una demo para enseñar, no una pantalla de trámite: lo que se vende es el
// minuto que tarda. Por eso el reloj corre a la vista, los pasos se van
// encendiendo solos y el momento en que Meta llama tiene su propia animación,
// que es justo cuando el prospecto entiende qué está pasando: del otro lado de
// esa llamada no hay nadie, hay un agente escuchando el código.
//
// Solo en el panel comercial de MiAgentIA (lib/modulos: MODULOS_COMERCIAL).

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, PhoneCall, Sparkles, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  PASOS,
  TEXTO_PASO,
  indiceDePaso,
  lineaLegible,
  segundos,
  waMe,
  type Corrida,
  type Paso,
} from "@/lib/alta-numero";

interface RespuestaLista {
  ok: boolean;
  error?: string;
  lineas?: string[];
  motivo?: string | null;
  conBase?: boolean;
  historial?: Corrida[];
}

interface RespuestaCorrida {
  ok: boolean;
  error?: string;
  corrida?: Corrida;
}

const CADA_MS = 1000;

export default function AltaNumeroPage() {
  const [lineas, setLineas] = useState<string[] | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [elegida, setElegida] = useState("");
  const [corrida, setCorrida] = useState<Corrida | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [arrancando, setArrancando] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());

  const cargarLineas = useCallback(async () => {
    try {
      const r = await fetch("/api/alta-numero", { cache: "no-store" });
      const d = (await r.json()) as RespuestaLista;
      if (!d.ok) throw new Error(d.error ?? "No se pudieron leer las líneas.");
      setLineas(d.lineas ?? []);
      setMotivo(d.motivo ?? null);
      setElegida((prev) => prev || (d.lineas?.[0] ?? ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron leer las líneas.");
      setLineas([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(cargarLineas, 0);
    return () => clearTimeout(t);
  }, [cargarLineas]);

  // El reloj de la pantalla. Va aparte del sondeo para que corra suave aunque
  // la respuesta del servidor tarde.
  useEffect(() => {
    if (corrida?.estado !== "corriendo") return;
    const t = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(t);
  }, [corrida?.estado]);

  // Sondeo de la corrida: rápido, porque el código puede llegar en cualquier
  // segundo y la gracia de la demo es verlo caer.
  useEffect(() => {
    if (!corrida || corrida.estado !== "corriendo") return;
    const id = corrida.id;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/alta-numero?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        const d = (await r.json()) as RespuestaCorrida;
        if (d.ok && d.corrida) setCorrida(d.corrida);
      } catch {
        // Un sondeo perdido no es nada: vuelve en un segundo.
      }
    }, CADA_MS);
    return () => clearInterval(t);
  }, [corrida]);

  // Al terminar, las líneas disponibles cambiaron: la que se usó ya no está.
  useEffect(() => {
    if (corrida?.estado === "listo") void cargarLineas();
  }, [corrida?.estado, cargarLineas]);

  const arrancar = async () => {
    if (!elegida || arrancando) return;
    setArrancando(true);
    setError(null);
    try {
      const r = await fetch("/api/alta-numero", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ numero: elegida }),
      });
      const d = (await r.json()) as RespuestaCorrida;
      if (!d.ok || !d.corrida) throw new Error(d.error ?? "No se pudo arrancar el alta.");
      setCorrida(d.corrida);
      setAhora(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo arrancar el alta.");
    } finally {
      setArrancando(false);
    }
  };

  const deNuevo = () => {
    setCorrida(null);
    setError(null);
    void cargarLineas();
  };

  const transcurrido = corrida ? segundos(corrida, ahora) : 0;

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-5 py-3">
        <div>
          <h1 className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-brand">
            <Sparkles size={17} /> Alta de número en vivo
          </h1>
          <p className="text-[12.5px] text-[var(--text-3)]">
            Meta llama para dictar el código, el agente de voz lo contesta y lo devuelve. Nadie toca un teléfono.
          </p>
        </div>
        {corrida && (
          <div className="text-right">
            <p className="font-mono text-[26px] font-extrabold leading-none text-brand tabular-nums">
              {transcurrido}s
            </p>
            <p className="text-[11px] uppercase tracking-wide text-[var(--text-3)]">
              {corrida.estado === "listo" ? "en total" : "corriendo"}
            </p>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mx-auto w-full max-w-2xl space-y-5">
          {error && (
            <p className="flex items-start gap-2 rounded-xl border border-[var(--brand-red)]/40 bg-[var(--brand-red)]/10 px-3.5 py-2.5 text-[12.5px]">
              <TriangleAlert size={15} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}

          {!corrida ? (
            <Arranque
              lineas={lineas}
              motivo={motivo}
              elegida={elegida}
              setElegida={setElegida}
              arrancar={arrancar}
              arrancando={arrancando}
            />
          ) : (
            <Progreso corrida={corrida} deNuevo={deNuevo} />
          )}
        </div>
      </div>
    </div>
  );
}

function Arranque({
  lineas,
  motivo,
  elegida,
  setElegida,
  arrancar,
  arrancando,
}: {
  lineas: string[] | null;
  motivo: string | null;
  elegida: string;
  setElegida: (v: string) => void;
  arrancar: () => void;
  arrancando: boolean;
}) {
  if (!lineas) {
    return (
      <p className="flex items-center gap-2 text-[13px] text-[var(--text-3)]">
        <Loader2 size={15} className="animate-spin text-brand" /> Viendo qué líneas están listas
      </p>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <label className="block text-[12.5px] font-semibold text-[var(--text-2)]">Número que vamos a registrar</label>
      <p className="mt-1 text-[12px] text-[var(--text-3)]">
        Solo líneas que ya tienen el agente verificador contestando. El código de Meta entra por llamada a este mismo
        número, así que tiene que ser una línea que sepamos que timbra.
      </p>

      {lineas.length === 0 ? (
        <p className="mt-4 rounded-xl border border-line bg-surface px-3.5 py-3 text-[12.5px] text-[var(--text-2)]">
          {motivo ?? "No hay líneas disponibles ahora."}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={elegida}
            onChange={(e) => setElegida(e.target.value)}
            className="min-w-[200px] rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[14px] text-[var(--text)] outline-none"
          >
            {lineas.map((l) => (
              <option key={l} value={l}>
                {lineaLegible(l)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={arrancar}
            disabled={arrancando || !elegida}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-[13px] font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
          >
            {arrancando ? <Loader2 size={15} className="animate-spin" /> : <PhoneCall size={15} />}
            {arrancando ? "Dando de alta" : "Registrar ahora"}
          </button>
          <span className="text-[12px] text-[var(--text-3)]">{lineas.length} disponibles</span>
        </div>
      )}
    </section>
  );
}

function Progreso({ corrida, deNuevo }: { corrida: Corrida; deNuevo: () => void }) {
  const actual = indiceDePaso(corrida.paso);
  const esperando = corrida.paso === "esperando-codigo" && corrida.estado === "corriendo";

  return (
    <>
      {esperando && <Llamando numero={corrida.numero} />}

      {corrida.codigo && <Codigo digitos={corrida.codigo} oido={corrida.oido} />}

      {corrida.estado === "listo" && <Listo numero={corrida.numero} />}

      {corrida.estado === "error" && (
        <section className="rounded-2xl border border-[var(--brand-red)]/40 bg-[var(--brand-red)]/10 p-5">
          <p className="flex items-start gap-2 text-[13px] font-semibold">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {corrida.error}
          </p>
          <button
            type="button"
            onClick={deNuevo}
            className="mt-3 rounded-xl border border-line bg-surface px-3.5 py-2 text-[12.5px] font-semibold"
          >
            Volver a empezar
          </button>
        </section>
      )}

      <section className="rounded-2xl border border-line bg-card p-5">
        <p className="mb-4 font-mono text-[13px] font-bold text-[var(--text-2)]">{lineaLegible(corrida.numero)}</p>
        <ol className="space-y-0">
          {PASOS.map((p, i) => (
            <Fila
              key={p}
              paso={p}
              estado={
                corrida.estado === "listo" || i < actual
                  ? "hecho"
                  : i === actual
                    ? corrida.estado === "error"
                      ? "roto"
                      : "activo"
                    : "espera"
              }
              cuando={corrida.marcas[p] ?? null}
              inicio={corrida.iniciadoEn}
              ultimo={i === PASOS.length - 1}
            />
          ))}
        </ol>
      </section>

      {corrida.estado === "listo" && (
        <button
          type="button"
          onClick={deNuevo}
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[12.5px] font-semibold text-[var(--text-2)] hover:bg-card"
        >
          Correr la demo con otra línea
        </button>
      )}
    </>
  );
}

/** El momento que vende la demo: Meta marcando y el agente escuchando. */
function Llamando({ numero }: { numero: string }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand/40 bg-brand/5 p-6 text-center">
      <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute inset-0 animate-ping rounded-full bg-brand/25"
            style={{ animationDelay: `${i * 0.6}s`, animationDuration: "1.8s" }}
          />
        ))}
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-lg">
          <PhoneCall size={26} className="animate-pulse" />
        </span>
      </div>
      <p className="mt-4 text-[15px] font-extrabold text-brand">Meta está llamando</p>
      <p className="mt-1 text-[12.5px] text-[var(--text-2)]">
        La llamada entra al <span className="font-mono font-bold">{lineaLegible(numero)}</span>. El agente ya contestó y
        está escuchando el código.
      </p>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-[var(--text-3)]">
        <Loader2 size={13} className="animate-spin" /> Suele tardar entre 20 y 40 segundos
      </p>
    </section>
  );
}

function Codigo({ digitos, oido }: { digitos: string; oido: string | null }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 text-center">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
        El agente oyó el código
      </p>
      <div className="mt-2.5 flex justify-center gap-2">
        {digitos.split("").map((d, i) => (
          <span
            key={i}
            className="flex h-12 w-10 items-center justify-center rounded-xl border border-brand/40 bg-brand/10 font-mono text-[22px] font-extrabold text-brand"
          >
            {d}
          </span>
        ))}
      </div>
      {oido && (
        <p className="mx-auto mt-3 max-w-md text-[11.5px] italic text-[var(--text-3)]">
          {oido.replace(/^(AI|User):\s*/gm, "").trim().slice(0, 160)}
        </p>
      )}
    </section>
  );
}

function Listo({ numero }: { numero: string }) {
  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--brand-green,#16a34a)_40%,transparent)] bg-[color-mix(in_srgb,var(--brand-green,#16a34a)_12%,transparent)] p-5 text-center">
      <p className="flex items-center justify-center gap-2 text-[16px] font-extrabold text-[var(--text)]">
        <CheckCircle2 size={19} className="text-[var(--brand-green,#16a34a)]" /> El número ya está contestando
      </p>
      <p className="mt-1.5 text-[13px] text-[var(--text-2)]">
        Escríbele un WhatsApp al <span className="font-mono font-bold">{lineaLegible(numero)}</span> y te contesta la
        IA.
      </p>
      <a
        href={waMe(numero)}
        target="_blank"
        rel="noreferrer"
        className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:brightness-110"
      >
        <MessageCircle size={15} /> Abrir el chat
      </a>
    </section>
  );
}

function Fila({
  paso,
  estado,
  cuando,
  inicio,
  ultimo,
}: {
  paso: Paso;
  estado: "hecho" | "activo" | "roto" | "espera";
  cuando: string | null;
  inicio: string;
  ultimo: boolean;
}) {
  const seg = cuando ? Math.max(0, Math.round((Date.parse(cuando) - Date.parse(inicio)) / 1000)) : null;
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition",
            estado === "hecho" && "border-transparent bg-brand text-white",
            estado === "activo" && "border-brand bg-brand/15 text-brand",
            estado === "roto" && "border-[var(--brand-red)] bg-[var(--brand-red)]/15",
            estado === "espera" && "border-line text-[var(--text-3)]",
          )}
        >
          {estado === "hecho" ? (
            <CheckCircle2 size={14} />
          ) : estado === "activo" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : null}
        </span>
        {!ultimo && <span className={cn("my-0.5 w-px flex-1", estado === "hecho" ? "bg-brand/50" : "bg-line")} />}
      </div>
      <div className={cn("pb-3.5", estado === "espera" && "opacity-45")}>
        <p
          className={cn(
            "text-[13px]",
            estado === "activo" ? "font-bold text-brand" : "font-semibold text-[var(--text)]",
          )}
        >
          {TEXTO_PASO[paso]}
        </p>
        {seg !== null && <p className="text-[11.5px] text-[var(--text-3)]">a los {seg}s</p>}
      </div>
    </li>
  );
}
