// La reporteria del gerente de la sala de ventas.
//
// GET ?periodo=hoy|ayer|semana|semana_pasada|7d|mes|mes_pasado|30d|rango&desde=&hasta=
//
// Devuelve dos cosas distintas a proposito: la FOTO de ahora (cuantos hay en
// cada etapa, que se esta trabando, que cita se paso) y el MOVIMIENTO del
// periodo (cuantos entraron, cuantos probaron, cuanto se entrego). Mezclarlas
// es lo que hace que un tablero de ventas mienta.

import { NextResponse } from "next/server";
import { tenantFromRequest } from "@/lib/tenants/server";
import { esPeriodo, rangoDePeriodo } from "@/lib/periodos";
import { gerenteDe, vendedoresDe } from "@/lib/ventas-equipo";
import { reporteAutos } from "@/lib/autos-pipeline";
import { listarOportunidades } from "@/lib/autos-store";
import { sembrarAutosSiVacio } from "@/lib/autos-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const tenant = tenantFromRequest(req);
  const q = new URL(req.url).searchParams;
  const periodo = q.get("periodo");
  const rango = rangoDePeriodo(esPeriodo(periodo) ? periodo : "7d", new Date(), q.get("desde"), q.get("hasta"));

  try {
    await sembrarAutosSiVacio(tenant);
    const oportunidades = await listarOportunidades(tenant);
    const reporte = reporteAutos(oportunidades, vendedoresDe(tenant), rango);
    return NextResponse.json({ ok: true, gerente: gerenteDe(tenant), ...reporte });
  } catch (e) {
    console.error("autos reporte:", e);
    return NextResponse.json({ ok: false, error: "No se pudo armar el reporte." }, { status: 500 });
  }
}
