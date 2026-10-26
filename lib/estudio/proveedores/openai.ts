// Los proveedores reales de OpenAI: el texto (luna), la imagen (gpt-image) y
// la lectura de la foto que salió (luna con visión).
//
// La llave es la del panel (OPENAI_API_KEY), la misma con la que contestan
// los agentes: el modelo va en cada pedido, así que lo que use el estudio no
// les cambia nada. Lo que sí comparten es el saldo.

import { modeloOpenAI } from "../../ai-cliente-openai";
import { CREDITOS, TARIFA, generarPiezas, idiomaDe, reescribir, usoDeGeneracion } from "../generador";
import { guardarImagen } from "../medios";
import { ESQUEMA_PIEZAS, angulosEscritos, instruccionesDeMarca, pedidoDeLote, pedidoDeVersion, type PiezaEscrita } from "../redaccion";
import type { EstiloImagen, LecturaImagen, PedidoImagen } from "../tipos";
import type { ProveedorImagen, ProveedorTexto, ProveedorVision } from "./tipos";

const URL_IMAGENES = "https://api.openai.com/v1/images/generations";
const URL_RESPUESTAS = "https://api.openai.com/v1/responses";

/** WebP casi sin pérdida: la mitad de peso que un PNG y no se nota en el feed. */
const FORMATO = { output_format: "webp", output_compression: 90 } as const;

/** Algo que OpenAI no hizo, con lo que hay que decirle a la persona. */
export class FallaOpenAI extends Error {
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

function motivo(status: number, e: ErrorOpenAI["error"], que: string): FallaOpenAI {
  const texto = `${e?.code ?? ""} ${e?.type ?? ""} ${e?.message ?? ""}`;
  const detalle = `OpenAI ${status}: ${e?.message ?? "sin detalle"}`;
  if (/insufficient_quota|billing|credit/i.test(texto)) return new FallaOpenAI("La cuenta de OpenAI se quedó sin saldo.", detalle);
  if (/verif/i.test(texto)) return new FallaOpenAI("OpenAI pide verificar la organización antes de generar imágenes.", detalle);
  if (status === 401) return new FallaOpenAI("OpenAI no aceptó la llave del panel.", detalle);
  if (/moderation|safety/i.test(texto)) return new FallaOpenAI(`OpenAI no generó ${que} por sus reglas de contenido. Cambia el pedido y vuelve a generar.`, detalle);
  return new FallaOpenAI(`OpenAI no devolvió ${que}.`, detalle);
}

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/**
 * Un pedido a OpenAI con reintentos: un 429 por ir rápido o un 500 se
 * reintentan; sin saldo o con la llave mala no tiene sentido esperar. Los
 * pedidos que fallan no se cobran.
 */
async function pedir<T>(url: string, llave: string, cuerpo: unknown, que: string): Promise<T> {
  const body = JSON.stringify(cuerpo);
  for (let intento = 0; ; intento++) {
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json" },
      body,
    });
    const j = (await r.json().catch(() => ({}))) as ErrorOpenAI & T;
    if (r.ok) return j;
    const sinSaldo = /insufficient_quota|billing/i.test(`${j.error?.code ?? ""} ${j.error?.type ?? ""}`);
    const reintentable = (r.status === 429 || r.status >= 500) && !sinSaldo;
    if (!reintentable || intento >= 2) throw motivo(r.status, j.error, que);
    await esperar(3000 * 2 ** intento);
  }
}

interface Respuesta {
  output?: { type: string; content?: { type?: string; text?: string }[] }[];
}

/** El texto final de /v1/responses (sin el razonamiento). */
function textoDe(j: Respuesta): string {
  return (j.output ?? [])
    .filter((o) => o.type === "message")
    .flatMap((o) => o.content ?? [])
    .map((c) => c.text ?? "")
    .join("")
    .trim();
}

/** Un pedido a luna que solo puede contestar con la forma del esquema. */
async function responderJson(llave: string, modelo: string, instrucciones: string, contenido: unknown[], nombre: string, esquema: object, que: string): Promise<string> {
  const j = await pedir<Respuesta>(
    URL_RESPUESTAS,
    llave,
    {
      model: modelo,
      input: [
        ...(instrucciones ? [{ role: "system", content: instrucciones }] : []),
        { role: "user", content: contenido },
      ],
      text: { format: { type: "json_schema", name: nombre, strict: true, schema: esquema } },
      store: false,
      // Si el modelo razona, lo que piensa cuenta contra este tope; con poco,
      // la respuesta llega vacía. Se cobra solo lo que se usa.
      max_output_tokens: 16000,
    },
    que,
  );
  const texto = textoDe(j);
  if (!texto) throw new FallaOpenAI(`OpenAI no devolvió ${que}.`, "Respuesta vacía");
  return texto;
}

function piezasDe(texto: string): PiezaEscrita[] {
  return (JSON.parse(texto) as { piezas?: PiezaEscrita[] }).piezas ?? [];
}

export function textoOpenAI(llave: string, modelo = modeloOpenAI()): ProveedorTexto {
  return {
    nombre: "OpenAI",
    async generar(pedido) {
      const n = Math.max(1, Math.min(pedido.cantidad, 12));
      const idiomas = Array.from({ length: n }, (_, i) => idiomaDe(i, pedido.idiomas.es));
      const texto = await responderJson(
        llave,
        modelo,
        instruccionesDeMarca(pedido.marca),
        [{ type: "input_text", text: pedidoDeLote(pedido.texto, pedido.formato, pedido.marca, idiomas) }],
        "piezas",
        ESQUEMA_PIEZAS,
        "el texto",
      );
      const angulos = angulosEscritos(piezasDe(texto).slice(0, n), pedido.formato, pedido.marca);
      if (!angulos.length) throw new FallaOpenAI("OpenAI no devolvió el texto.", texto.slice(0, 300));
      const ahoraIso = new Date().toISOString();
      const piezas = generarPiezas({ ...pedido, cantidad: angulos.length, ahoraIso }, angulos);
      return { piezas, uso: piezas.flatMap((p) => usoDeGeneracion(p, ahoraIso, "OpenAI")) };
    },
    async reescribir(pieza, marca, motivoDeRevision) {
      const texto = await responderJson(
        llave,
        modelo,
        instruccionesDeMarca(marca),
        [{ type: "input_text", text: pedidoDeVersion(pieza, marca, motivoDeRevision) }],
        "piezas",
        ESQUEMA_PIEZAS,
        "el texto",
      );
      const [otro] = angulosEscritos(piezasDe(texto).slice(0, 1), pieza.tipo, marca);
      if (!otro) throw new FallaOpenAI("OpenAI no devolvió el texto.", texto.slice(0, 300));
      const ahoraIso = new Date().toISOString();
      return {
        pieza: reescribir(pieza, marca, motivoDeRevision, ahoraIso, otro),
        uso: [
          {
            marcaId: pieza.marcaId,
            servicio: "texto",
            proveedor: "OpenAI",
            unidades: 1,
            unidad: "pieza",
            creditos: CREDITOS.texto,
            costoUsd: TARIFA.textoPorPieza,
            fecha: ahoraIso,
            piezaId: pieza.id,
          },
        ],
      };
    },
  };
}

export function imagenOpenAI(llave: string, guardar = guardarImagen): ProveedorImagen {
  return {
    nombre: "OpenAI",
    async generar(pedido: PedidoImagen, marcaId: string) {
      const j = await pedir<{ data?: { b64_json?: string }[] }>(
        URL_IMAGENES,
        llave,
        { model: pedido.modelo, prompt: pedido.prompt, size: pedido.tamano, quality: pedido.calidad, n: 1, ...FORMATO },
        "la imagen",
      );
      const b64 = j.data?.[0]?.b64_json;
      if (!b64) throw new FallaOpenAI("OpenAI no devolvió la imagen.", "Respuesta sin imagen");
      return { url: await guardar(Buffer.from(b64, "base64"), `image/${FORMATO.output_format}`, marcaId) };
    },
  };
}

const ESTILOS: EstiloImagen[] = ["clasica", "moderna", "obra", "calida", "lujo"];
const TONOS: LecturaImagen["tono"][] = ["claro", "medio", "oscuro"];
const ZONAS: LecturaImagen["zona"][] = ["arriba", "abajo"];

const INSTRUCCIONES_LECTURA = `Es una foto para las redes de una empresa de servicios para la casa (pintura, techos, cocinas, baños). Encima va un titular. Di tres cosas de la foto:
- estilo: "clasica" si es una casa o un cuarto tradicional (molduras, fachada clásica); "moderna" si son líneas rectas, minimalista o contemporánea; "obra" si es un trabajo en proceso (andamios, herramientas, gente trabajando, cinta, plásticos); "calida" si es un ambiente acogedor de luz cálida, madera o un interior hogareño; "lujo" si son acabados finos, mármol, piedra o un look elegante de alto contraste.
- tono: qué tan clara es la foto en general: "claro", "medio" u "oscuro".
- zona: "arriba" o "abajo", el tercio con menos detalle, donde un titular se lee mejor.`;

const ESQUEMA_LECTURA = {
  type: "object",
  properties: {
    estilo: { type: "string", enum: ESTILOS },
    tono: { type: "string", enum: TONOS },
    zona: { type: "string", enum: ZONAS },
  },
  required: ["estilo", "tono", "zona"],
  additionalProperties: false,
};

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
      const texto = await responderJson(
        llave,
        modelo,
        "",
        [
          { type: "input_text", text: INSTRUCCIONES_LECTURA },
          // "low" alcanza para estilo, tono y zona, y cuesta una fracción.
          { type: "input_image", image_url: url, detail: "low" },
        ],
        "lectura",
        ESQUEMA_LECTURA,
        "la lectura de la foto",
      );
      return { lectura: lecturaDeTexto(texto), uso: [] };
    },
  };
}
