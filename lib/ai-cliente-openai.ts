// Luna (OpenAI) hablando el idioma de Anthropic.
//
// Traído de yali/lib/ai-cliente-openai.ts. El panel arma la conversación, las
// herramientas y el consumo en formato Anthropic; este cliente traduce ida y
// vuelta, así que el resto de lib/ai.ts no se entera de con quién habla.
//
// Qué cliente usa luna lo decide su TenantConfig (ai.modelo = "luna"), no una
// variable de ambiente: así un cliente no cambia de modelo sin que nadie lo
// haya decidido. La llave va en OPENAI_API_KEY.
//
// HAY QUE USAR /v1/responses. En /v1/chat/completions estos modelos rechazan
// las herramientas: piden reasoning_effort "none" y después no lo aceptan.

import type Anthropic from "@anthropic-ai/sdk";

const URL = "https://api.openai.com/v1/responses";

/**
 * Cuánto piensa antes de contestar: low, medium, high, xhigh.
 *
 * El razonamiento se cobra como tokens de SALIDA, que en gpt-6-luna son
 * $0.50 por millón contra $0.10 de la entrada. Subirlo no es gratis.
 */
export function esfuerzoOpenAI(): string | null {
  const e = process.env.AI_ESFUERZO_OPENAI;
  return e && e !== "default" ? e : null;
}

export function modeloOpenAI(): string {
  return process.env.AI_MODELO_OPENAI || "gpt-6-luna";
}

/** El system de Anthropic viene en bloques (por la caché); acá es un texto. */
function textoDelSystem(system: Anthropic.MessageCreateParams["system"]): string {
  if (!system) return "";
  if (typeof system === "string") return system;
  return system.map((b) => ("text" in b ? b.text : "")).join("\n");
}

/** Una parte de un mensaje del huésped: texto o imagen (data URL). */
export interface ParteEntrada {
  type: "input_text" | "input_image";
  text?: string;
  image_url?: string;
  detail?: "auto" | "low" | "high";
}

interface ItemEntrada {
  role?: string;
  content?: string | ParteEntrada[];
  type?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  output?: string;
  /** Solo en los items de razonamiento que se devuelven. */
  id?: string;
  encrypted_content?: string;
  summary?: unknown[];
}

/**
 * EL RAZONAMIENTO VUELVE CON LA HERRAMIENTA, o el modelo piensa de cero.
 *
 * Los modelos con razonamiento de OpenAI devuelven, antes de cada llamada a
 * función, un item `reasoning` con lo que pensaron. La documentación pide
 * devolverlo en la siguiente vuelta junto con la salida de la función; si no se
 * devuelve, el modelo arranca la vuelta siguiente sin su propio razonamiento y
 * lo rehace (más tokens de salida, que son los caros) o pierde el hilo entre
 * una herramienta y la siguiente.
 *
 * Este cliente reconstruye el `input` desde los mensajes estilo Anthropic en
 * cada vuelta, y ahí no hay dónde guardar el razonamiento. Se guarda acá, por
 * call_id de la función a la que precedió, y `entradaDesdeMensajes` lo vuelve a
 * poner delante de esa función. Con `store: false` viaja cifrado
 * (`encrypted_content`): OpenAI no retiene nada y aun así puede reanudarlo.
 */
const RAZONAMIENTO_POR_LLAMADA = new Map<string, ItemEntrada>();
/** Para que el mapa no crezca sin fin: un turno tiene pocas llamadas. */
const TOPE_RAZONAMIENTOS = 500;

/** Guarda los items de razonamiento de una respuesta, atados a las llamadas que siguen. */
export function recordarRazonamiento(salida: RespuestaOpenAI["output"]): void {
  let pendiente: ItemEntrada | null = null;
  for (const item of salida ?? []) {
    if (item.type === "reasoning") {
      pendiente = {
        type: "reasoning",
        id: item.id,
        ...(item.encrypted_content ? { encrypted_content: item.encrypted_content } : {}),
        summary: item.summary ?? [],
      };
    } else if (item.type === "function_call" && item.call_id && pendiente) {
      if (RAZONAMIENTO_POR_LLAMADA.size >= TOPE_RAZONAMIENTOS) {
        const primero = RAZONAMIENTO_POR_LLAMADA.keys().next().value;
        if (primero) RAZONAMIENTO_POR_LLAMADA.delete(primero);
      }
      RAZONAMIENTO_POR_LLAMADA.set(item.call_id, pendiente);
    }
  }
}

/** La conversación de Anthropic, traducida a los items que espera /v1/responses. */
export function entradaDesdeMensajes(mensajes: Anthropic.MessageParam[]): ItemEntrada[] {
  const items: ItemEntrada[] = [];
  // Un mismo razonamiento precede a varias llamadas cuando el modelo pide
  // varias herramientas juntas: se devuelve una sola vez.
  const razonamientosPuestos = new Set<string>();
  for (const m of mensajes) {
    if (typeof m.content === "string") {
      items.push({ role: m.role, content: m.content });
      continue;
    }
    const textos: string[] = [];
    // Las imágenes que manda el huésped (capturas de promociones, de pagos, de
    // lo que sea) viajan como input_image. Antes se convertían en el texto
    // "[imagen]" y luna, ciega, le decía al huésped que no podía verla mientras
    // el guion asegura que sí puede (28 de septiembre de 2026, 11:06).
    const imagenes: ParteEntrada[] = [];
    const vaciar = () => {
      if (!textos.length && !imagenes.length) return;
      if (imagenes.length && m.role === "user") {
        const partes: ParteEntrada[] = [];
        if (textos.length) partes.push({ type: "input_text", text: textos.join("\n") });
        partes.push(...imagenes);
        items.push({ role: m.role, content: partes });
      } else {
        items.push({ role: m.role, content: textos.join("\n") });
      }
      textos.length = 0;
      imagenes.length = 0;
    };
    for (const b of m.content) {
      if (b.type === "text") {
        textos.push(b.text);
      } else if (b.type === "tool_use") {
        // El texto que venga junto a una llamada se manda ANTES, para no
        // perderlo ni pegarlo dentro de la llamada.
        vaciar();
        const razonamiento = RAZONAMIENTO_POR_LLAMADA.get(b.id);
        if (razonamiento?.id && !razonamientosPuestos.has(razonamiento.id)) {
          razonamientosPuestos.add(razonamiento.id);
          items.push(razonamiento);
        }
        items.push({
          type: "function_call",
          call_id: b.id,
          name: b.name,
          arguments: JSON.stringify(b.input ?? {}),
        });
      } else if (b.type === "tool_result") {
        // Lo que venga antes (texto, imagen) sale antes, en su orden.
        vaciar();
        const salida =
          typeof b.content === "string"
            ? b.content
            : (b.content ?? []).map((c) => ("text" in c ? c.text : "")).join("\n");
        items.push({ type: "function_call_output", call_id: b.tool_use_id, output: salida });
      } else if (b.type === "image") {
        if (b.source.type === "base64" && m.role === "user") {
          imagenes.push({ type: "input_image", image_url: `data:${b.source.media_type};base64,${b.source.data}`, detail: "auto" });
        } else {
          // Una imagen por URL o en un mensaje del asistente no tiene camino
          // acá; que se note en el texto en vez de desaparecer en silencio.
          textos.push("[imagen]");
        }
      }
    }
    vaciar();
  }
  return items;
}

interface RespuestaOpenAI {
  error?: { message: string };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    output_tokens_details?: { reasoning_tokens?: number };
    input_tokens_details?: { cached_tokens?: number };
  };
  output?: {
    type: string;
    call_id?: string;
    name?: string;
    arguments?: string;
    content?: { type: string; text?: string }[];
    /** Solo en los items `reasoning`. */
    id?: string;
    encrypted_content?: string;
    summary?: unknown[];
  }[];
}

/**
 * Misma firma que `messages.create` de Anthropic y misma forma de respuesta.
 *
 * Lo que NO traduce: la caché explícita. OpenAI cachea solo, por prefijo, y no
 * cobra por escribir, así que las marcas `cache_control` se ignoran y los
 * tokens cacheados se reportan como lectura.
 */
export async function crearMensajePorOpenAI(
  args: Anthropic.MessageCreateParamsNonStreaming,
  // Para el panel de pruebas, que elige el modelo a mano en vez de leerlo del
  // ambiente: ahi la persona dice con cual quiere hablar.
  opts?: { modelo?: string; esfuerzo?: string | null },
): Promise<Anthropic.Message> {
  const modelo = opts?.modelo || modeloOpenAI();
  const esfuerzo = opts?.esfuerzo !== undefined ? opts.esfuerzo : esfuerzoOpenAI();
  const llave = process.env.OPENAI_API_KEY;
  if (!llave) throw new Error("Falta OPENAI_API_KEY para los clientes con luna.");

  const input: ItemEntrada[] = [];
  const system = textoDelSystem(args.system);
  if (system) input.push({ role: "system", content: system });
  input.push(...entradaDesdeMensajes(args.messages));

  const tools = (args.tools ?? []).map((t) => ({
    type: "function" as const,
    name: t.name,
    description: "description" in t ? t.description : "",
    parameters: "input_schema" in t ? t.input_schema : {},
  }));

  // EL TOPE CUBRE LO QUE PIENSA MÁS LO QUE DICE. El razonamiento se cobra
  // como salida y cuenta contra max_output_tokens: si se agota, se paga el
  // razonamiento y la respuesta llega VACÍA. Con esfuerzo alto o xhigh y cuatro
  // herramientas en un turno, 6.000 se quedaba corto; la guía de OpenAI pide
  // reservar bastante más. Las cifras que salen son las de siempre (una a tres
  // frases), así que el tope alto no encarece nada: solo evita el vacío.
  const razonaMucho = /^(high|xhigh|max)$/i.test(esfuerzo ?? "");
  const tope = esfuerzo
    ? Math.max(args.max_tokens ?? 2000, razonaMucho ? 16000 : 8000)
    : (args.max_tokens ?? 2000);
  const cuerpo = JSON.stringify({
    model: modelo,
    input,
    ...(tools.length ? { tools } : {}),
    ...(esfuerzo
      ? {
          reasoning: { effort: esfuerzo },
          // Respuestas de WhatsApp: cortas. La verbosidad es del texto final,
          // no del razonamiento, así que no le quita nada al pensar.
          text: { verbosity: "low" },
        }
      : {}),
    // SIN RETENER NADA EN OPENAI, y aun así con el razonamiento reanudable: con
    // store en false los items de razonamiento vuelven cifrados y se devuelven
    // en la vuelta siguiente (ver recordarRazonamiento).
    store: false,
    include: ["reasoning.encrypted_content"],
    max_output_tokens: tope,
  });

  // REINTENTOS CON ESPERA. Sin esto, una tanda de pruebas se llena de fallas que
  // no son del modelo: en la primera corrida de los 28 casos, 8 de 21 controles
  // rojos eran "el agente está saturado", o sea 429 de OpenAI. Un límite de tasa
  // no es una respuesta equivocada y no puede contar como si lo fuera.
  let j: RespuestaOpenAI | null = null;
  let ultimoError = "";
  for (let intento = 0; intento < 5; intento++) {
    const r = await fetch(URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json" },
      body: cuerpo,
    });
    if (r.status === 429 || r.status >= 500) {
      // SIN SALDO NO SE REINTENTA. OpenAI devuelve 429 para dos cosas
      // distintas: "vas muy rápido", que se arregla esperando, y "no te queda
      // crédito", que no se arregla nunca. Reintentar lo segundo son treinta
      // segundos de espera para terminar igual, y además el motivo se perdía:
      // quedaba solo el número 429 y la pantalla decía "el agente está
      // saturado, intente en unos segundos", que es falso y manda a la persona
      // a reintentar para siempre.
      const detalle = await r.text().catch(() => "");
      ultimoError = `${r.status} ${detalle.slice(0, 300)}`.trim();
      if (/insufficient_quota|credit_balance|billing|no credits/i.test(detalle)) {
        throw new Error(`OpenAI (${modelo}): sin saldo. ${detalle.slice(0, 200)}`);
      }
      // 2, 4, 8, 16 segundos. Con más de eso conviene que la corrida falle.
      await new Promise((ok) => setTimeout(ok, 2000 * 2 ** intento));
      continue;
    }
    j = (await r.json()) as RespuestaOpenAI;
    if (j.error && /rate|limit|overload/i.test(j.error.message)) {
      ultimoError = j.error.message;
      j = null;
      await new Promise((ok) => setTimeout(ok, 2000 * 2 ** intento));
      continue;
    }
    break;
  }
  if (!j) throw new Error(`OpenAI (${modelo}): no respondió tras 5 intentos (${ultimoError})`);
  if (j.error) throw new Error(`OpenAI (${modelo}): ${j.error.message}`);

  const salida = j.output ?? [];
  // Antes de traducir: lo que pensó queda atado a las llamadas que pidió, para
  // devolvérselo en la vuelta siguiente.
  recordarRazonamiento(salida);
  const content: Anthropic.ContentBlock[] = [];
  for (const item of salida) {
    if (item.type === "message") {
      const texto = (item.content ?? []).map((c) => c.text ?? "").join("").trim();
      if (texto) content.push({ type: "text", text: texto, citations: null } as Anthropic.ContentBlock);
    } else if (item.type === "function_call") {
      content.push({
        type: "tool_use",
        id: item.call_id ?? `oa_${Math.random().toString(36).slice(2, 12)}`,
        name: item.name ?? "",
        input: JSON.parse(item.arguments || "{}"),
      } as Anthropic.ContentBlock);
    }
  }
  // Una respuesta vacía rompe el turno más arriba: mejor un texto que el
  // revisor pueda mirar que un mensaje sin bloques.
  if (content.length === 0) {
    content.push({ type: "text", text: "", citations: null } as Anthropic.ContentBlock);
  }

  const cacheadas = j.usage?.input_tokens_details?.cached_tokens ?? 0;
  return {
    id: `msg_openai_${Date.now()}`,
    type: "message",
    role: "assistant",
    model: modelo,
    content,
    stop_reason: content.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: Math.max(0, (j.usage?.input_tokens ?? 0) - cacheadas),
      output_tokens: j.usage?.output_tokens ?? 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: cacheadas,
    },
  } as Anthropic.Message;
}
