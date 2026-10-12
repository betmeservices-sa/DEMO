import { claveIp, golpe } from "@/lib/freno";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A dónde manda el navegador los avisos de la Content-Security-Policy (que
// por ahora corre solo en modo reporte, ver next.config.ts). Cada aviso queda
// en el log del despliegue como una línea `[csp]`: con eso se ve qué recurso
// se saldría de la política antes de ponerla en firme.
//
// Es PÚBLICA porque el navegador la llama solo, sin sesión, y puede llamarla
// desde la pantalla de login. Se defiende con un tope por IP y de tamaño, y
// nunca devuelve nada.
const FRENO = { max: 30, ventanaSeg: 60 };
const MAX_BYTES = 8_000;

export async function POST(req: Request) {
  if (await golpe(claveIp(req, "csp"), FRENO)) return new Response(null, { status: 429 });
  const crudo = await req.text().catch(() => "");
  if (crudo.length > MAX_BYTES) return new Response(null, { status: 413 });
  try {
    const j = JSON.parse(crudo) as { "csp-report"?: Record<string, unknown> } & Record<string, unknown>;
    const r = (j["csp-report"] ?? j) as Record<string, unknown>;
    console.warn(
      "[csp]",
      JSON.stringify({
        directiva: r["effective-directive"] ?? r["violated-directive"] ?? null,
        bloqueado: r["blocked-uri"] ?? null,
        pagina: r["document-uri"] ?? null,
        linea: r["line-number"] ?? null,
      }),
    );
  } catch {
    // Un cuerpo que no es JSON no vale la pena ni anotarlo.
  }
  return new Response(null, { status: 204 });
}
