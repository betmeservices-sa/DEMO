// Los proveedores reales de OpenAI: la imagen (gpt-image) y la lectura de la
// foto que salió (luna con visión).
//
// La llave es la del panel (OPENAI_API_KEY), la misma con la que contestan
// los agentes: el modelo va en cada pedido, así que lo que use el estudio no
// les cambia nada. Lo que sí comparten es el saldo.

import { modeloOpenAI } from "../../ai-cliente-openai";
import { guardarImagen } from "../medios";
import type { EstiloImagen, LecturaImagen, PedidoImagen } from "../tipos";
import type { ProveedorImagen, ProveedorVision } from "./tipos";

const URL_IMAGENES = "https://api.openai.com/v1/images/generations";
const URL_RESPUESTAS = "https://api.openai.com/v1/responses";

/** WebP casi sin pérdida: la mitad de peso que un PNG y no se nota en el feed. */
const FORMATO = { output_format: "webp", output_compression: 90 } as const;

/** Una imagen que no salió, con lo que hay que decirle a la persona. */
export class FallaImagen extends Error {
  constructor(
    readonly paraPersona: string,
    detalle: string,
  ) {
    super(detalle);
  }
}

interface ErrorOpenAI {
  error?: { message?: string; code?: string; type?: string };
}

function motivo(status: number, e: ErrorOpenAI["error"]): FallaImagen {
  const texto = `${e?.code ?? ""} ${e?.type ?? ""} ${e?.message ?? ""}`;
  const detalle = `OpenAI ${status}: ${e?.message ?? "sin detalle"}`;
  if (/insufficient_quota|billing|credit/i.test(texto)) return new FallaImagen("La cuenta de OpenAI se quedó sin saldo.", detalle);
  if (/verif/i.test(texto)) return new FallaImagen("OpenAI pide verificar la organización antes de generar imágenes.", detalle);
  if (status === 401) return new FallaImagen("OpenAI no aceptó la llave del panel.", detalle);
  if (/moderation|safety/i.test(texto)) return new FallaImagen("OpenAI no generó esa imagen por sus reglas de contenido. Cambia la idea y vuelve a generar.", detalle);
  return new FallaImagen("OpenAI no devolvió la imagen.", detalle);
}

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

export function imagenOpenAI(llave: string, guardar = guardarImagen): ProveedorImagen {
  return {
    nombre: "OpenAI",
    async generar(pedido: PedidoImagen, marcaId: string) {
      const cuerpo = JSON.stringify({
        model: pedido.modelo,
        prompt: pedido.prompt,
        size: pedido.tamano,
        quality: pedido.calidad,
        n: 1,
        ...FORMATO,
      });
      // Un 429 por ir rápido o un 500 se reintentan; sin saldo o con la llave
      // mala no tiene sentido esperar. Los pedidos que fallan no se cobran.
      for (let intento = 0; ; intento++) {
        const r = await fetch(URL_IMAGENES, {
          method: "POST",
          headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json" },
          body: cuerpo,
        });
        const j = (await r.json().catch(() => ({}))) as ErrorOpenAI & { data?: { b64_json?: string }[] };
        const b64 = j.data?.[0]?.b64_json;
        if (r.ok && b64) return { url: await guardar(Buffer.from(b64, "base64"), `image/${FORMATO.output_format}`, marcaId) };
        const sinSaldo = /insufficient_quota|billing/i.test(`${j.error?.code ?? ""} ${j.error?.type ?? ""}`);
        const reintentable = (r.status === 429 || r.status >= 500) && !sinSaldo;
        if (!reintentable || intento >= 2) throw motivo(r.status, j.error);
        await esperar(3000 * 2 ** intento);
      }
    },
  };
}

const ESTILOS: EstiloImagen[] = ["clasica", "moderna", "obra", "calida", "lujo"];
const TONOS: LecturaImagen["tono"][] = ["claro", "medio", "oscuro"];
const ZONAS: LecturaImagen["zona"][] = ["arriba", "abajo"];

const INSTRUCCIONES = `Es una foto para las redes de una empresa de servicios para la casa (pintura, techos, cocinas, baños). Encima va un titular. Di tres cosas de la foto:
- estilo: "clasica" si es una casa o un cuarto tradicional (molduras, fachada clásica); "moderna" si son líneas rectas, minimalista o contemporánea; "obra" si es un trabajo en proceso (andamios, herramientas, gente trabajando, cinta, plásticos); "calida" si es un ambiente acogedor de luz cálida, madera o un interior hogareño; "lujo" si son acabados finos, mármol, piedra o un look elegante de alto contraste.
- tono: qué tan clara es la foto en general: "claro", "medio" u "oscuro".
- zona: "arriba" o "abajo", el tercio con menos detalle, donde un titular se lee mejor.`;

/** Lo que el modelo contesta, ya validado. Si viene otra cosa, no hay lectura. */
export function lecturaDeTexto(texto: string): LecturaImagen {
  const d = JSON.parse(texto) as Partial<LecturaImagen>;
  if (!d.estilo || !ESTILOS.includes(d.estilo) || !d.tono || !TONOS.includes(d.tono) || !d.zona || !ZONAS.includes(d.zona)) {
    throw new Error(`Lectura fuera de lo esperado: ${texto.slice(0, 200)}`);
  }
  return { estilo: d.estilo, tono: d.tono, zona: d.zona };
}

export function visionOpenAI(llave: string, modelo = modeloOpenAI()): ProveedorVision {
  return {
    nombre: "OpenAI",
    async leer(url: string) {
      const r = await fetch(URL_RESPUESTAS, {
        method: "POST",
        headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelo,
          input: [
            {
              role: "user",
              content: [
                { type: "input_text", text: INSTRUCCIONES },
                // "low" alcanza para estilo, tono y zona, y cuesta una fracción.
                { type: "input_image", image_url: url, detail: "low" },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "lectura",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  estilo: { type: "string", enum: ESTILOS },
                  tono: { type: "string", enum: TONOS },
                  zona: { type: "string", enum: ZONAS },
                },
                required: ["estilo", "tono", "zona"],
                additionalProperties: false,
              },
            },
          },
          store: false,
          // Si el modelo razona, lo que piensa cuenta contra este tope; con
          // poco, la respuesta llega vacía. Se cobra solo lo que se usa.
          max_output_tokens: 4000,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as ErrorOpenAI & {
        output?: { type: string; content?: { type: string; text?: string }[] }[];
      };
      if (!r.ok) throw new Error(`OpenAI ${r.status}: ${j.error?.message ?? "sin detalle"}`);
      const texto = (j.output ?? [])
        .filter((o) => o.type === "message")
        .flatMap((o) => o.content ?? [])
        .map((c) => c.text ?? "")
        .join("")
        .trim();
      return { lectura: lecturaDeTexto(texto), uso: [] };
    },
  };
}
