// Consumo de la IA de UN cliente en un periodo, para el tablero de la agencia.
//
// GET ?cliente=<tenant>&periodo=hoy|ayer|semana|semana_pasada|7d|mes|mes_pasado|30d|rango&desde=AAAA-MM-DD&hasta=AAAA-MM-DD
//
// Solo para la cuenta de la agencia. Lee todas las filas del cliente y las
// agrega en hora de El Salvador (ver lib/agencia-consumo).

import { NextResponse } from "next/server";
import { leerSesion, sesionDeCookieHeader } from "@/lib/session";
import { TENANTS } from "@/lib/tenants";
import type { TenantId } from "@/lib/tenants/types";
import { detalleConsumo } from "@/lib/tokens-store";
import { esPeriodo, rangoDePeriodo, reporteConsumo } from "@/lib/agencia-consumo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// TECHO DE SEGURIDAD, no el recorte del periodo.
//
// El periodo ahora se filtra EN LA CONSULTA, así que esto solo existe para que
// un rango absurdo no lea la tabla entera. Antes era el recorte de verdad y por
// eso mentía: con 5.000 y Yali en 7.021 filas de 30 días, la vista de "30 días"
// mostraba los últimos ~21 y el contador se quedaba clavado en 5.000. Cuando se
// toca, el reporte lo DICE (`truncado`) en vez de devolver un número redondo.
const TOPE_FILAS = 40000;

export async function GET(req: Request) {
  const sesion = await leerSesion(sesionDeCookieHeader(req.headers.get("cookie")));
  if (!sesion) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (!sesion.todos && sesion.tenant !== "miagentia") {
    return NextResponse.json({ ok: false, error: "Solo para la agencia" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams;
  const cliente = q.get("cliente") ?? "";
  if (!(cliente in TENANTS)) {
    return NextResponse.json({ ok: false, error: "Cliente desconocido" }, { status: 400 });
  }
  const periodo = q.get("periodo");
  const rango = rangoDePeriodo(esPeriodo(periodo) ? periodo : "7d", new Date(), q.get("desde"), q.get("hasta"));

  // Se lee desde el inicio del tramo ANTERIOR, que es lo que el reporte compara.
  const filas = await detalleConsumo(cliente, TOPE_FILAS, rango.anterior.desde, rango.hasta).catch((e) => {
    console.error("[agencia/consumo]", cliente, e instanceof Error ? e.message : e);
    return [];
  });
  const reporte = reporteConsumo(filas, rango);

  // Si se tocó el techo, hay filas que no se leyeron y las cifras salen cortas.
  // Se dice; un tablero que se queda corto en silencio es peor que uno que
  // avisa, porque el número parece bueno.
  const truncado = filas.length >= TOPE_FILAS;
  if (truncado) {
    console.warn(`[agencia/consumo] ${cliente}: se tocó el techo de ${TOPE_FILAS} filas; el periodo sale corto.`);
  }

  return NextResponse.json({
    ok: true,
    cliente: { id: cliente, nombre: TENANTS[cliente as TenantId].brand.nombreCorto },
    filasLeidas: filas.length,
    truncado,
    ...reporte,
  });
}
