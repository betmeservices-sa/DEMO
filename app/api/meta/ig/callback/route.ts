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

  const v = validarStateIg(state);
  const cookieState = req.headers.get("cookie")?.match(/(?:^|;\s*)meta_ig_state=([^;]+)/)?.[1];
  if (!v.ok || !cookieState || decodeURIComponent(cookieState) !== state) {
    return await volver("meta=error&motivo=state");
  }

  const code = url.searchParams.get("code");
  if (!code) return await volver("meta=error&motivo=sin-codigo");

  // En qué paso se cayó: Meta devuelve el mismo error genérico en varios.
  let paso = "codigo";
  try {
    const corto = await intercambiarCodigoIg(code, redirectUriIg(req.url));
    paso = "token-largo";
    const largo = await tokenLargoIg(corto.token);
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
    const motivo = e instanceof Error ? e.message : "desconocido";
    console.error(`[ig-login] callback falló en ${paso}:`, motivo);
    return await volver(`meta=error&motivo=${encodeURIComponent(motivo)}`);
  }
}
