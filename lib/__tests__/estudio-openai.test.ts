import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generarPiezas } from "@/lib/estudio/generador";
import { guardarImagen } from "@/lib/estudio/medios";
import { conImagenes, proveedores } from "@/lib/estudio/proveedores";
import { FallaOpenAI, imagenOpenAI, lecturaDeTexto, textoOpenAI, visionOpenAI } from "@/lib/estudio/proveedores/openai";
import type { ProveedorImagen } from "@/lib/estudio/proveedores/tipos";
import { angulosEscritos, instruccionesDeMarca, pedidoDeLote } from "@/lib/estudio/redaccion";
import { MARCAS } from "@/lib/estudio/semilla";
import type { PedidoImagen } from "@/lib/estudio/tipos";

// Nada de esto sale a la red: fetch es de mentira en todas.

const PEDIDO: PedidoImagen = {
  modelo: "gpt-image-2.5-flare",
  tamano: "1088x1360",
  calidad: "medium",
  zonaLibre: "arriba",
  prompt: "Fotografía realista de una fachada recién pintada.",
};

const solano = () => MARCAS.find((m) => m.id === "solano")!;

function respuesta(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });
}

let llamadas: { url: string; init: RequestInit }[] = [];
function fetchFalso(...respuestas: Response[]) {
  llamadas = [];
  const cola = [...respuestas];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      llamadas.push({ url, init });
      const r = cola.shift();
      if (!r) throw new Error("fetch sin respuesta preparada");
      return r;
    }),
  );
}

beforeEach(() => {
  // Una llave en el entorno de quien corre las pruebas no debe llegar a OpenAI.
  vi.stubEnv("OPENAI_API_KEY", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("imagen con OpenAI", () => {
  it("pide la imagen con los parámetros del pedido y guarda lo que vuelve", async () => {
    fetchFalso(respuesta(200, { data: [{ b64_json: Buffer.from("imagen").toString("base64") }] }));
    const guardar = vi.fn(async () => "https://base/estudio/solano/x.webp");
    const { url } = await imagenOpenAI("sk-prueba", guardar).generar(PEDIDO, "solano");

    expect(url).toBe("https://base/estudio/solano/x.webp");
    expect(llamadas[0].url).toBe("https://api.openai.com/v1/images/generations");
    expect((llamadas[0].init.headers as Record<string, string>).Authorization).toBe("Bearer sk-prueba");
    const cuerpo = JSON.parse(String(llamadas[0].init.body));
    expect(cuerpo).toMatchObject({ model: "gpt-image-2.5-flare", size: "1088x1360", quality: "medium", n: 1, output_format: "webp" });
    expect(cuerpo.prompt).toBe(PEDIDO.prompt);
    expect(guardar).toHaveBeenCalledWith(Buffer.from("imagen"), "image/webp", "solano");
  });

  it("si va muy rápido espera y reintenta", async () => {
    vi.useFakeTimers();
    fetchFalso(
      respuesta(429, { error: { message: "Rate limit reached", code: "rate_limit_exceeded" } }),
      respuesta(200, { data: [{ b64_json: "aG9sYQ==" }] }),
    );
    const promesa = imagenOpenAI("sk", async () => "u").generar(PEDIDO, "solano");
    await vi.advanceTimersByTimeAsync(3000);
    expect((await promesa).url).toBe("u");
    expect(llamadas).toHaveLength(2);
  });

  it("sin saldo no reintenta y dice por qué", async () => {
    fetchFalso(respuesta(429, { error: { message: "You exceeded your current quota", code: "insufficient_quota", type: "insufficient_quota" } }));
    const e = await imagenOpenAI("sk", async () => "u").generar(PEDIDO, "solano").catch((x) => x);
    expect(e).toBeInstanceOf(FallaOpenAI);
    expect(e.paraPersona).toMatch(/sin saldo/);
    expect(llamadas).toHaveLength(1);
  });

  it("si OpenAI pide verificar la organización, lo dice", async () => {
    fetchFalso(respuesta(403, { error: { message: "Your organization must be verified to use the model gpt-image-2.5-flare." } }));
    const e = await imagenOpenAI("sk", async () => "u").generar(PEDIDO, "solano").catch((x) => x);
    expect(e.paraPersona).toMatch(/verificar la organización/);
  });

  it("en local sin la base, la imagen vuelve dentro de la pieza", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(await guardarImagen(Buffer.from("x"), "image/webp", "solano")).toBe(`data:image/webp;base64,${Buffer.from("x").toString("base64")}`);
  });
});

describe("lectura de la foto con OpenAI", () => {
  it("manda la imagen y pide estilo, tono y zona en un formato fijo", async () => {
    fetchFalso(
      respuesta(200, {
        output: [
          { type: "reasoning", summary: [] },
          { type: "message", content: [{ type: "output_text", text: '{"estilo":"moderna","tono":"claro","zona":"arriba"}' }] },
        ],
      }),
    );
    const r = await visionOpenAI("sk", "gpt-6-luna").leer("https://base/estudio/solano/x.webp");
    expect(r.lectura).toEqual({ estilo: "moderna", tono: "claro", zona: "arriba" });
    const cuerpo = JSON.parse(String(llamadas[0].init.body));
    expect(llamadas[0].url).toBe("https://api.openai.com/v1/responses");
    expect(cuerpo.model).toBe("gpt-6-luna");
    expect(cuerpo.input[0].content[1]).toMatchObject({ type: "input_image", image_url: "https://base/estudio/solano/x.webp" });
    expect(cuerpo.text.format).toMatchObject({ type: "json_schema", strict: true });
  });

  it("una lectura fuera de lo esperado no se usa", () => {
    expect(() => lecturaDeTexto('{"estilo":"barroca","tono":"claro","zona":"arriba"}')).toThrow();
    expect(() => lecturaDeTexto("")).toThrow();
  });
});

describe("qué proveedor contesta", () => {
  it("con la llave del panel, las fotos de muestra se leen de la tabla y las generadas van al modelo", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-prueba");
    fetchFalso(respuesta(200, { output: [{ type: "message", content: [{ text: '{"estilo":"obra","tono":"medio","zona":"abajo"}' }] }] }));
    const { vision } = proveedores();

    const muestra = await vision.leer("/brand/estudio/casa-blanca.jpg");
    expect(muestra.lectura).toBeDefined();
    expect(llamadas).toHaveLength(0);

    const generada = await vision.leer("https://base/estudio/solano/x.webp");
    expect(generada.lectura).toEqual({ estilo: "obra", tono: "medio", zona: "abajo" });
    expect(llamadas).toHaveLength(1);
  });

  it("sin la llave contesta el simulado y no sale a la red", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    fetchFalso();
    const { url } = await proveedores().imagen.generar(PEDIDO, "solano");
    expect(url).toMatch(/^\/brand\/estudio\//);
    expect(llamadas).toHaveLength(0);
  });

  it("si una imagen falla, las que faltan ya no se piden", async () => {
    const piezas = generarPiezas({
      marca: solano(),
      texto: "colores para fachada",
      formato: "carrusel",
      cantidad: 3,
      idiomas: { es: 100, en: 0 },
      origenImagen: "ia",
      encargoId: "enc-falla",
      actor: "Prueba",
      ahoraIso: "2026-10-21T16:00:00Z",
    });
    const total = piezas.reduce((n, p) => n + p.medios.length, 0);
    let pedidas = 0;
    const imagen: ProveedorImagen = {
      nombre: "Prueba",
      async generar() {
        pedidas++;
        throw new FallaOpenAI("OpenAI no devolvió la imagen.", "500");
      },
    };
    await expect(conImagenes(piezas, solano(), imagen)).rejects.toBeInstanceOf(FallaOpenAI);
    expect(total).toBeGreaterThan(4);
    expect(pedidas).toBeLessThanOrEqual(4);
  });
});

describe("textos con OpenAI", () => {
  const escrita = (titulo: string, extra: Partial<Record<string, unknown>> = {}) => ({
    titulo,
    texto: "Lavado a presión, sellador y dos manos. La casa quedó como nueva.",
    hashtags: ["PinturaMiami", "#Coral Gables"],
    laminas: ["Primero se lava", "Después, dos manos"],
    guion: "",
    duracion: 0,
    idea: "Fachada blanca recién pintada al atardecer",
    ...extra,
  });

  it("el pedido lleva la voz de la marca, lo que no se dice y un idioma por pieza", () => {
    const m = solano();
    const inst = instruccionesDeMarca(m);
    expect(inst).toContain(m.tono);
    expect(inst).toContain(m.ofertas[0]);
    expect(inst).toContain(`"${m.palabrasProhibidas[0]}"`);
    expect(inst).toMatch(/No inventes/);
    const lote = pedidoDeLote("Colores para fachada en Miami", "carrusel", m, ["es", "en", "es"]);
    expect(lote).toContain("Pedido: Colores para fachada en Miami");
    expect(lote).toContain("1. español, 2. inglés, 3. español");
    expect(lote).toMatch(/láminas 2 a 3/);
  });

  it("lo escrito se vuelve ángulos con hashtags limpios y una foto de la marca", () => {
    const [a] = angulosEscritos([escrita("Fachada nueva en 3 días")], "imagen", solano());
    expect(a.es.hashtags).toEqual(["#PinturaMiami", "#CoralGables"]);
    expect(a.es.laminas).toBeUndefined();
    expect(a.fotos[0]).toMatch(/^\/brand\/estudio\//);
    expect(angulosEscritos([escrita("")], "imagen", solano())).toHaveLength(0);
  });

  it("arma el lote con lo que escribió el modelo, en el idioma de cada pieza", async () => {
    fetchFalso(
      respuesta(200, {
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: JSON.stringify({ piezas: [escrita("Antes y después en Coral Gables"), escrita("Before and after in Coral Gables")] }) }],
          },
        ],
      }),
    );
    const { piezas, uso } = await textoOpenAI("sk", "gpt-6-luna").generar({
      marca: solano(),
      texto: "antes y después de una fachada",
      formato: "carrusel",
      cantidad: 2,
      idiomas: { es: 50, en: 50 },
      origenImagen: "ia",
      encargoId: "enc-ia",
      actor: "Prueba",
    });
    expect(piezas.map((p) => [p.idioma, p.titulo])).toEqual([
      ["es", "Antes y después en Coral Gables"],
      ["en", "Before and after in Coral Gables"],
    ]);
    expect(piezas[0].rotulos?.slice(0, 2)).toEqual(["Antes y después en Coral Gables", "Primero se lava"]);
    expect(piezas[0].ideaImagen).toBe("Fachada blanca recién pintada al atardecer");
    expect(uso.find((u) => u.servicio === "texto")?.proveedor).toBe("OpenAI");
    const cuerpo = JSON.parse(String(llamadas[0].init.body));
    expect(cuerpo.text.format).toMatchObject({ type: "json_schema", name: "piezas", strict: true });
    expect(cuerpo.input[0].role).toBe("system");
  });

  it("otra versión conserva la imagen generada y su escena", async () => {
    const [p] = await conImagenes(
      generarPiezas({
        marca: solano(),
        texto: "fachada",
        formato: "imagen",
        cantidad: 1,
        idiomas: { es: 100, en: 0 },
        origenImagen: "ia",
        encargoId: "enc-v",
        actor: "Prueba",
        ahoraIso: "2026-10-21T16:00:00Z",
      }),
      solano(),
    );
    fetchFalso(respuesta(200, { output: [{ type: "message", content: [{ text: JSON.stringify({ piezas: [escrita("Tres días, dos manos", { idea: "Otra escena" })] }) }] }] }));
    const { pieza } = await textoOpenAI("sk", "gpt-6-luna").reescribir(p, solano(), "más corto");
    expect(pieza.titulo).toBe("Tres días, dos manos");
    expect(pieza.medios).toEqual(p.medios);
    expect(pieza.ideaImagen).toBe(p.ideaImagen);
    expect(JSON.parse(String(llamadas[0].init.body)).input[1].content[0].text).toContain("Motivo de quien la revisó: más corto");
  });

  it("si no vuelve texto, el encargo falla sin piezas", async () => {
    fetchFalso(respuesta(200, { output: [{ type: "message", content: [{ text: '{"piezas":[]}' }] }] }));
    const e = await textoOpenAI("sk", "m")
      .generar({ marca: solano(), texto: "x", formato: "texto", cantidad: 1, idiomas: { es: 100, en: 0 }, encargoId: "e", actor: "P" })
      .catch((x) => x);
    expect(e).toBeInstanceOf(FallaOpenAI);
  });
});
