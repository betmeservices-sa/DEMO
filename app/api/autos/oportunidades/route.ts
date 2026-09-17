// El tablero de la sala de ventas: leer el embudo y mover una venta.
//
// GET  -> todas las oportunidades del cliente, ya con su etapa y su avance
//         calculados, mas el equipo de ventas y las alertas vivas.
// POST -> un movimiento: { accion, telefono, ... }.
//
// El tenant sale de la cookie firmada, nunca del cuerpo: si viniera del
// cliente, cualquiera moveria los prospectos de otro concesionario.

import { NextResponse } from "next/server";
import { tenantFromRequest } from "@/lib/tenants/server";
import { leerSesion, sesionDeCookieHeader } from "@/lib/session";
import { staffDeUsuario } from "@/lib/usuarios";
import { gerenteDe, vendedoresDe } from "@/lib/ventas-equipo";
import { esMotivoTraba, PASO } from "@/lib/autos-catalogo";
import { sembrarAutosSiVacio } from "@/lib/autos-seed";
import {
  alertasDe,
  avanceDe,
  citasVencidasDe,
  esCanal,
  etapaDe,
  pasosDe,
  type CanalLead,
  type EstadoPaso,
  type Oportunidad,
} from "@/lib/autos-pipeline";
import {
  asegurarOportunidad,
  asignarVendedor,
  cerrarOportunidad,
  fijarCanal,
  fijarModelo,
  fijarMonto,
  historialDe,
  listarOportunidades,
  marcarContactado,
  marcarTomado,
  moverPaso,
  reabrirOportunidad,
} from "@/lib/autos-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ESTADOS: EstadoPaso[] = ["pendiente", "agendado", "hecho", "trabado"];

function aDTO(o: Oportunidad) {
  const avance = avanceDe(o.pasos);
  return {
    ...o,
    etapa: etapaDe(o),
    avance: {
      hechos: avance.hechos,
      total: avance.total,
      resumen: avance.resumen,
      siguiente: avance.siguiente?.id ?? null,
      trabado: avance.trabados.length > 0,
      cita: avance.agendados[0]?.fecha ?? null,
    },
    /** Los pasos con su estado, en orden: es lo que pinta la ficha. */
    detalle: pasosDe(o.pasos),
  };
}

/** Quien esta moviendo el caso: su ficha de equipo si la tiene, o su usuario. */
async function actorDe(req: Request): Promise<string> {
  const sesion = await leerSesion(sesionDeCookieHeader(req.headers.get("cookie")));
  if (!sesion?.usuario) return "panel";
  return staffDeUsuario(sesion.usuario) ?? sesion.usuario;
}

export async function GET(req: Request) {
  const tenant = tenantFromRequest(req);
  const url = new URL(req.url);
  const telefono = url.searchParams.get("telefono");

  try {
    // El demo se siembra solo la primera vez: un embudo vacio no ensena nada.
    await sembrarAutosSiVacio(tenant);
    const oportunidades = await listarOportunidades(tenant);

    if (telefono) {
      const o = oportunidades.find((x) => x.telefono === telefono);
      if (!o) return NextResponse.json({ ok: false, error: "Esa venta no existe." }, { status: 404 });
      return NextResponse.json({ ok: true, caso: aDTO(o), eventos: await historialDe(tenant, telefono) });
    }

    const abiertas = oportunidades.filter((o) => !o.cerrado);
    return NextResponse.json({
      ok: true,
      oportunidades: oportunidades.map(aDTO),
      vendedores: vendedoresDe(tenant),
      gerente: gerenteDe(tenant),
      alertas: alertasDe(abiertas),
      citasVencidas: citasVencidasDe(abiertas),
    });
  } catch (e) {
    console.error("autos GET:", e);
    return NextResponse.json({ ok: false, error: "No se pudo leer el embudo." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const tenant = tenantFromRequest(req);
  const actor = await actorDe(req);
  let body: {
    accion?: string;
    telefono?: string;
    nombre?: string;
    modelo?: string | null;
    monto?: number | string | null;
    paso?: string;
    estado?: EstadoPaso;
    motivo?: string;
    nota?: string;
    fecha?: string;
    vendedor?: string;
    canal?: string | null;
    resultado?: "venta" | "perdido";
    motivoCierre?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const telefono = (body.telefono ?? "").replace(/[^\d]/g, "");
  if (!telefono) return NextResponse.json({ ok: false, error: "Falta el prospecto." }, { status: 400 });

  try {
    let caso: Oportunidad | null = null;
    switch (body.accion) {
      case "crear":
        caso = await asegurarOportunidad(
          tenant,
          telefono,
          { nombre: body.nombre, modelo: body.modelo ?? null },
          vendedoresDe(tenant),
        );
        break;
      case "contactado":
        caso = await marcarContactado(tenant, telefono, actor);
        break;
      case "paso": {
        const paso = (body.paso ?? "").trim();
        const estado = body.estado;
        if (!PASO[paso] || !estado || !ESTADOS.includes(estado)) {
          return NextResponse.json({ ok: false, error: "Paso o estado inválido." }, { status: 400 });
        }
        if (estado === "agendado" && !body.fecha) {
          return NextResponse.json({ ok: false, error: "Una cita necesita fecha y hora." }, { status: 400 });
        }
        caso = await moverPaso({
          tenant,
          telefono,
          paso,
          estado,
          motivo: esMotivoTraba(body.motivo) ? body.motivo : null,
          nota: body.nota?.trim() || null,
          fecha: body.fecha ?? null,
          actor,
        });
        break;
      }
      case "modelo":
        caso = await fijarModelo(tenant, telefono, body.modelo ?? null, actor);
        break;
      case "monto": {
        // Vacio es una respuesta valida: borrar un precio mal puesto tiene que
        // poder hacerse, si no el embudo queda mintiendo para siempre.
        const crudo = typeof body.monto === "string" ? body.monto.replace(/[^\d.]/g, "") : body.monto;
        const monto = crudo === "" || crudo == null ? null : Number(crudo);
        if (monto !== null && (!Number.isFinite(monto) || monto < 0)) {
          return NextResponse.json({ ok: false, error: "Ese precio no se entiende." }, { status: 400 });
        }
        caso = await fijarMonto(tenant, telefono, monto, actor);
        break;
      }
      case "canal": {
        // Se acepta vacio a proposito: marcar mal y no poder desmarcar es peor
        // que no haber marcado.
        const canal: CanalLead | null = esCanal(body.canal) ? body.canal : null;
        if (body.canal != null && body.canal !== "" && canal === null) {
          return NextResponse.json({ ok: false, error: "Ese canal no existe." }, { status: 400 });
        }
        caso = await fijarCanal(tenant, telefono, canal, actor);
        break;
      }
      case "asignar": {
        const vendedor = vendedoresDe(tenant).find((v) => v.id === body.vendedor);
        if (!vendedor) return NextResponse.json({ ok: false, error: "Ese vendedor no existe." }, { status: 400 });
        caso = await asignarVendedor(tenant, telefono, vendedor.id, actor, vendedor.nombre);
        break;
      }
      case "tomar":
        caso = await marcarTomado(tenant, telefono, actor);
        break;
      case "cerrar": {
        const resultado = body.resultado;
        if (resultado !== "venta" && resultado !== "perdido") {
          return NextResponse.json({ ok: false, error: "Falta si fue venta o perdido." }, { status: 400 });
        }
        caso = await cerrarOportunidad(tenant, telefono, resultado, body.motivoCierre ?? null, actor);
        break;
      }
      case "reabrir":
        caso = await reabrirOportunidad(tenant, telefono, actor);
        break;
      default:
        return NextResponse.json({ ok: false, error: "Acción desconocida." }, { status: 400 });
    }

    if (!caso) return NextResponse.json({ ok: false, error: "Esa venta no existe." }, { status: 404 });
    return NextResponse.json({ ok: true, caso: aDTO(caso) });
  } catch (e) {
    console.error("autos POST:", e);
    return NextResponse.json({ ok: false, error: "No se pudo mover la venta." }, { status: 500 });
  }
}
