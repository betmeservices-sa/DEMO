// Puerta del demo: sin cookie de sesión válida, toda página manda a /login.
// Con sesión, cada perfil solo abre sus pantallas; si pide otra, va a su inicio.
// Vive dentro del demo general: el proxy.ts de la raíz le pasa todo lo que
// cuelga de /demonutricion.

import { NextResponse, type NextRequest } from "next/server";
import { puedeVer, ROL_INFO } from "@/lib/nutricion/roles";
import { COOKIE, rolDeSesion } from "@/lib/nutricion/session";

const PUBLICAS = ["/demonutricion/login", "/demonutricion/api/login", "/demonutricion/api/logout"];

export async function proxyNutricion(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLICAS.includes(pathname)) return NextResponse.next();
  const rol = await rolDeSesion(req.cookies.get(COOKIE)?.value);
  if (rol) {
    if (pathname.startsWith("/demonutricion/api/") || puedeVer(rol, pathname)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = rol === "general" ? "/demonutricion" : ROL_INFO[rol].inicio;
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/demonutricion/api/")) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/demonutricion/login";
  url.search = "";
  return NextResponse.redirect(url);
}
