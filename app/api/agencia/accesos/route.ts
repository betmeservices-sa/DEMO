// El registro de accesos al panel (audit log), para la página propia de la
// agencia. Antes vivía al fondo del tablero de la agencia.
//
// GET ?periodo=hoy|ayer|7d|30d|rango&desde=AAAA-MM-DD&hasta=AAAA-MM-DD&cliente=<tenant>
//
// Sin `cliente` trae los de todos. Solo para la cuenta de la agencia.

import { NextResponse } from "next/server";
import { leerSesion, sesionDeCookieHeader } from "@/lib/session";
import { actividadDeUsuarios, estaActivo, listarAccesos } from "@/lib/accesos";
import { DIA, esPeriodo, rangoDePeriodo } from "@/lib/periodos";
import { enRango } from "@/lib/agencia-resumen";
import { TENANTS } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cuántas filas se leen como mucho: un mes de accesos anda por unos cientos. */
const TOPE = 2000;

export async function GET(req: Request) {
  const sesion = await leerSesion(sesionDeCookieHeader(req.headers.get("cookie")));
  if (!sesion) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (!sesion.todos && sesion.tenant !== "miagentia") {
    return NextResponse.json({ ok: false, error: "Solo para la agencia" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams;
  const periodo = q.get("periodo");
  const rango = rangoDePeriodo(esPeriodo(periodo) ? periodo : "7d", new Date(), q.get("desde"), q.get("hasta"));
  const cliente = q.get("cliente");
  const ahora = Date.now();
  const dias = Math.min(366, Math.max(1, Math.ceil((ahora - Date.parse(rango.desde)) / DIA) + 1));

  const [accesos, actividad] = await Promise.all([listarAccesos({ dias, tope: TOPE }), actividadDeUsuarios()]);
  const activoPor = new Map(actividad.map((a) => [a.usuario, estaActivo(a.ultimoVisto, ahora)]));
  // "Activo" es de la persona, no del acceso: va solo en su acceso más
  // reciente (la lista viene del más nuevo al más viejo). Si no, cada login
  // viejo de alguien que está adentro ahora se leía como sesión abierta.
  const yaMarcado = new Set<string>();
  const filas = accesos
    .filter((a) => enRango(a.ts, rango.desde, rango.hasta))
    .filter((a) => !cliente || a.tenant === cliente)
    .map((a) => {
      const activo = (activoPor.get(a.usuario) ?? false) && !yaMarcado.has(a.usuario);
      if (activo) yaMarcado.add(a.usuario);
      return {
        ts: a.ts,
        tenant: a.tenant,
        cliente: TENANTS[a.tenant as keyof typeof TENANTS]?.brand.nombreCorto || a.tenant,
        usuario: a.usuario,
        nombre: a.nombre,
        rol: a.rol,
        host: a.host,
        ip: a.ip,
        activo,
      };
    });

  return NextResponse.json({
    ok: true,
    periodo: rango,
    accesos: filas,
    // Los clientes que tienen accesos en la ventana leída, con su nombre.
    clientes: [...new Set(accesos.map((a) => a.tenant))].sort().map((id) => ({
      id,
      nombre: TENANTS[id as keyof typeof TENANTS]?.brand.nombreCorto || id,
    })),
    truncado: accesos.length >= TOPE,
  });
}
