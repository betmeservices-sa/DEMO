import { NextResponse } from "next/server";
import {
  intercambiarCodigoIg,
  perfilIg,
  redirectUriIg,
  suscribirIg,
  tokenLargoIg,
  validarStateIg,
} from "@/lib/meta-ig-login";
import { guardarLoginIg } from "@/lib/meta-store";
import { guardarEventoMeta } from "@/lib/meta-webhook-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vuelta del login de Instagram: código → token corto → token largo (60 días)
// → id y usuario de la cuenta → suscripción a los webhooks → guardar.
//
// Todo el flujo termina en /settings con ?meta=... para que la pantalla diga
// qué pasó. Los errores de Meta se pasan tal cual: "no tenés rol de tester"
// le dice a la persona qué hacer, y un genérico no.
async function canjeEnHub(cuerpo: Record<string, string>): Promise<{ token: string; vence: string | null }> {
  const hub = (process.env.HUB_URL || "https://hub.miagentia.com").replace(/\/$/, "");
  const secreto = process.env.VAPI_MEMORIA_SECRET || process.env.VAPI_WEBHOOK_SECRET || "";
  const r = await fetch(`${hub}/api/webhooks/ig-canje`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-vapi-secret": secreto },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(15_000),
  });
  const j = (await r.json().catch(() => ({}))) as { token?: string; vence?: string | null; error?: string };
  if (!r.ok || !j.token) throw new Error(j.error ?? `hub respondió ${r.status}`);
  return { token: j.token, vence: j.vence ?? null };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state");

  // El resultado se MUESTRA en una página propia y queda anotado en la base.
  // Antes volvía a /settings, y un panel sin esa pantalla (el del lab) mandaba
  // a la bandeja: la persona no veía si había funcionado y el error se perdía
  // (2026-11-13, Instagram del hospital, dos intentos sin rastro).
  const volver = async (params: string) => {
    const p = new URLSearchParams(params);
    const ok = p.get("meta") === "ig-conectado";
    await guardarEventoMeta("ig_login", { ok, ...Object.fromEntries(p) }).catch(() => {});
    const titulo = ok ? `Instagram conectado: @${p.get("cuenta") ?? ""}` : "No se pudo conectar Instagram";
    const detalle = ok
      ? p.get("aviso") === "sin-webhooks"
        ? "Quedó conectado, pero Meta no aceptó la suscripción a los mensajes."
        : "Ya puede cerrar esta pestaña. Los mensajes directos entran al panel."
      : `Motivo: ${p.get("motivo") ?? "desconocido"}`;
    const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Instagram</title></head><body style="font-family:system-ui,sans-serif;max-width:520px;margin:15vh auto;padding:0 16px;color:#111"><h1 style="font-size:22px;color:${ok ? "#166534" : "#991b1b"}">${esc(titulo)}</h1><p style="font-size:16px;line-height:1.5">${esc(detalle)}</p></body></html>`;
    const res = new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    res.cookies.set("meta_ig_state", "", { maxAge: 0, path: "/" });
    return res;
  };

  if (url.searchParams.get("error")) {
    const motivo = url.searchParams.get("error_description") ?? url.searchParams.get("error_reason") ?? "cancelado";
    return await volver(`meta=error&motivo=${encodeURIComponent(motivo)}`);
  }

  // Basta con que el state esté firmado por nosotros. La cookie ya no se exige:
  // desde el celular, la app de Instagram puede devolver a otro navegador que
  // no la tiene, y el login se perdía sin decir por qué.
  const v = validarStateIg(state);
  if (!v.ok) return await volver("meta=error&motivo=state");

  const code = url.searchParams.get("code");
  if (!code) return await volver("meta=error&motivo=sin-codigo");

  // En qué paso se cayó: Meta devuelve el mismo error genérico en varios.
  let paso = "codigo";
  try {
    // El canje usa el secreto de Instagram. Si el del demo falla, lo hace hub,
    // que tiene el bueno (con él se refrescan los tokens de Yali).
    let largo: { token: string; vence: string | null };
    let corto: { token: string } | null = null;
    try {
      corto = await intercambiarCodigoIg(code, redirectUriIg(req.url));
      paso = "token-largo";
      largo = await tokenLargoIg(corto.token);
    } catch (e1) {
      paso = `canje en hub (el del demo dijo: ${e1 instanceof Error ? e1.message : "falló"})`;
      try {
        largo = await canjeEnHub(corto ? { corto: corto.token } : { code, redirect_uri: redirectUriIg(req.url) });
      } catch (e2) {
        // El código ya se canjeó: si lo único que falla es alargar el token,
        // la cuenta queda conectada con el corto (dura una hora) y el token
        // largo se saca después con ese mismo token, sin otro login.
        if (!corto) throw e2;
        console.error("[ig-login] no se pudo alargar el token; queda el corto:", e2 instanceof Error ? e2.message : e2);
        largo = { token: corto.token, vence: new Date(Date.now() + 55 * 60_000).toISOString() };
      }
    }
    paso = "perfil";
    const perfil = await perfilIg(largo.token);
    paso = "webhooks";
    const campos = await suscribirIg(perfil.igId, largo.token);
    paso = "guardar";
    const donde = await guardarLoginIg(v.tenant, {
      igId: perfil.igId,
      igUsername: perfil.username,
      igToken: largo.token,
      igTokenVence: largo.vence,
    });
    if (donde !== "db") throw new Error("no se pudo guardar la conexión en la base");
    console.log(
      `[ig-login] tenant=${v.tenant} conectó @${perfil.username ?? perfil.igId} (${perfil.igId}); webhooks: ${campos ?? "NO"}; guardado en ${donde}`,
    );
    const p = new URLSearchParams({
      meta: "ig-conectado",
      cuenta: perfil.username ?? perfil.igId,
      ...(campos ? {} : { aviso: "sin-webhooks" }),
    });
    return await volver(p.toString());
  } catch (e) {
    const crudo = e instanceof Error ? e.message : "desconocido";
    // Meta entrega el token, pero con acceso estándar solo deja usarlo a las
    // cuentas que son "Evaluador de Instagram" de la app (así está Yali). Sin
    // ese rol, todo GET responde esto (2026-11-13, Instagram del hospital).
    const motivo = /Unsupported request - method type/i.test(crudo)
      ? "la cuenta de Instagram todavía no es Evaluador de Instagram de la app MiAgentIA, o no aceptó la invitación (Instagram > Configuración > Apps y sitios web > Invitaciones de evaluador)"
      : crudo;
    console.error(`[ig-login] callback falló en ${paso}:`, motivo);
    return await volver(`meta=error&motivo=${encodeURIComponent(`${paso}: ${motivo}`)}`);
  }
}
