import { NextResponse } from "next/server";
import { ROL_INFO } from "@/lib/nutricion/roles";
import { CLAVE, COOKIE, DURACION_S, firmaSesion, rolDeUsuario } from "@/lib/nutricion/session";

export async function POST(req: Request) {
  const { usuario, password } = (await req.json().catch(() => ({}))) as { usuario?: string; password?: string };
  const rol = usuario ? rolDeUsuario(usuario) : null;
  if (!rol || password !== CLAVE) {
    // Un poco de espera para que adivinar claves no sea gratis.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, inicio: rol === "general" ? "/demonutricion" : ROL_INFO[rol].inicio });
  res.cookies.set(COOKIE, await firmaSesion(rol), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/demonutricion",
    maxAge: DURACION_S,
  });
  return res;
}
