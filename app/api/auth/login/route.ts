import { NextResponse } from "next/server";
import { validarCredenciales } from "@/lib/auth-server";
import { cookieDeSesion, crearSesion } from "@/lib/session";
import { tenantRequiere2FA, verificarTotp } from "@/lib/totp";

export const dynamic = "force-dynamic";

// Login REAL: las credenciales se validan en el servidor y la sesion sale como
// cookie HttpOnly firmada. El navegador nunca decide si esta autenticado.
export async function POST(req: Request) {
  let usuario = "";
  let password = "";
  let token = "";
  try {
    const body = (await req.json()) as {
      usuario?: string;
      password?: string;
      token?: string;
    };
    usuario = body.usuario ?? "";
    password = body.password ?? "";
    token = body.token ?? "";
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo invalido" }, { status: 400 });
  }

  const tenant = validarCredenciales(usuario, password);
  if (!tenant) {
    // Mensaje generico a proposito: no revelamos si el usuario existe.
    return NextResponse.json({ ok: false, error: "Credenciales invalidas" }, { status: 401 });
  }

  // Segundo factor (2FA por app de autenticador). Solo si el tenant lo tiene
  // configurado. El flujo es stateless: la UI reenvia usuario+password+token,
  // no guardamos un "login a medias" en el servidor.
  if (tenantRequiere2FA(tenant)) {
    if (!token) {
      // Contraseña correcta pero falta el codigo: la UI muestra el paso del codigo.
      return NextResponse.json({ ok: false, need2fa: true });
    }
    const codigoValido = await verificarTotp(tenant, token);
    if (!codigoValido) {
      return NextResponse.json(
        { ok: false, need2fa: true, error: "Código de verificación inválido" },
        { status: 401 },
      );
    }
  }

  const sesion = await crearSesion(tenant);
  if (!sesion) {
    // Fail-closed: falta SESSION_SECRET en el servidor. No emitimos una sesion
    // insegura; el operador debe configurar la variable.
    return NextResponse.json(
      { ok: false, error: "Login no disponible: el servidor no está configurado." },
      { status: 503 },
    );
  }
  const res = NextResponse.json({ ok: true, tenant });
  res.headers.set("Set-Cookie", cookieDeSesion(sesion.valor, sesion.maxAge));
  return res;
}
