// La Valeria de las REDES del Centro Ginecológico: la que contesta el Facebook
// y el Instagram del hospital en este panel, experta en todo el hospital.
//
// Pedido del usuario (2026-11-13): cada WhatsApp tiene su Valeria (lab,
// Imagenología), pero el Facebook y el Instagram son UNA cuenta para todo el
// hospital, y los contesta la Valeria con base de conocimiento de hub. Los
// chats siguen en este panel; lo único distinto es el guion
// (consultorio/valeria-redes-guion.ts) y que `kb_buscar` busca en la base del
// hospital de hub (tablas kb_*, todas las áreas) por /api/webhooks/kb-buscar.

/** Páginas (y su Instagram) que contesta la Valeria de redes del hospital. */
export const PAGINAS_REDES_HOSPITAL = new Set(["547852531898434"]);

export type AgenteIA = "redes-hospital";

export function agenteDePagina(pageId: string | null | undefined): AgenteIA | undefined {
  return pageId && PAGINAS_REDES_HOSPITAL.has(pageId) ? "redes-hospital" : undefined;
}

const HUB = (process.env.HUB_URL || "https://hub.miagentia.com").replace(/\/$/, "");

/** Lo mismo que hub le dice al modelo cuando la base no contesta. */
const SIN_BASE = JSON.stringify({
  error: "No se pudo consultar la base en este momento.",
  instrucciones: "No des precios, horarios ni requisitos de memoria. Aplica CUANDO NO SABES ALGO: da el contacto del área que corresponde.",
});

/** kb_buscar contra la base del hospital de hub. Nunca lanza. */
export async function buscarEnBaseDelHospital(
  input: { consulta?: unknown; area?: unknown },
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const secreto = process.env.VAPI_MEMORIA_SECRET || process.env.VAPI_WEBHOOK_SECRET;
  if (!secreto) return SIN_BASE;
  try {
    const r = await fetchImpl(`${HUB}/api/webhooks/kb-buscar`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-vapi-secret": secreto },
      body: JSON.stringify({ consulta: input.consulta, area: input.area }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      console.error("[redes-hospital] kb_buscar en hub:", r.status);
      return SIN_BASE;
    }
    return await r.text();
  } catch (e) {
    console.error("[redes-hospital] kb_buscar en hub:", e instanceof Error ? e.message : e);
    return SIN_BASE;
  }
}

/** La herramienta, con la misma descripción que la de hub. */
export const TOOL_KB_HOSPITAL = {
  name: "kb_buscar",
  description:
    "Busca en la base del hospital: exámenes de laboratorio, ultrasonografías y mamografía, consultas, planes de parto, hospitalización, recién nacido, médicos de Imagenología, sucursales, contactos, aseguradoras, formas de pago y promociones. Úsala SIEMPRE antes de dar un precio, un horario, una preparación, un requisito, una dirección o el contacto de un servicio: lo que no venga de aquí no lo sabes. NO la uses para las frases fijas del guion, que ya traen su número (emergencias, citas, palabras clave de Imagenología, CUANDO NO SABES ALGO): en una emergencia contestas de inmediato, sin buscar. Pásale el tema que entendiste, no el mensaje literal: si escriben 'la de ver la carita', busca 'ultra 4D'; si el mensaje trae dos temas (una sucursal y un examen), búscalos juntos o en dos llamadas. Devuelve candidatos con un puntaje de 0 a 1.",
  input_schema: {
    type: "object" as const,
    properties: {
      consulta: {
        type: "string",
        description: "El tema interpretado, en pocas palabras. Ej: 'prueba de embarazo en sangre', 'mamografía', 'sucursal Escalón horario', 'Mapfre'.",
      },
      area: {
        type: "string",
        description: "Opcional. Solo si estás segura del área; si no, no la pongas.",
        enum: ["imagenologia", "laboratorio", "consultas", "planes", "hospitalizacion", "recien_nacido", "general"],
      },
    },
    required: ["consulta"],
  },
};
