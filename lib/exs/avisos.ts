// Los avisos de WhatsApp que recibe el cliente en cada paso. Puro.
//
// Es la otra mitad de la línea de paquetes: si el cliente se entera solo de
// que su compra llegó a Miami, de que va en vuelo y de cuánto paga al estar
// lista, deja de escribir "¿ya llegó?". Cada evento de la bitácora del
// paquete es un aviso, con el mismo texto en la ficha y en la bandeja.
//
// Va de "tú", como habla Express Shopping en su sitio.

import type { Aviso, Cliente, EventoPaquete, Paquete, Vuelo } from "./tipos";
import { DIAS_ABANDONO, sucursalDef } from "./catalogo";
import { cobroDe, dinero, libras } from "./cobro";
import { fechaCorta, horaCorta, diaSV } from "@/lib/eventos/fechas";
import { diaDeVuelo, trackingLegible } from "./formato";

export interface ContextoAviso {
  cliente: Cliente;
  vuelos: readonly Vuelo[];
  /** Lo que el mismo cliente trae en el vuelo del paquete (para el beneficio de $300). */
  totalDelVuelo: number;
}

export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

/** "jue 22 oct, 9:00 p. m.": la salida de un vuelo, para las pantallas del equipo. */
export function salidaDe(v: Vuelo | undefined): string {
  if (!v) return "próximo vuelo";
  return `${fechaCorta(diaSV(v.sale))}, ${horaCorta(v.sale)}`;
}

/** Hasta qué día se puede retirar antes del abandono. */
export function limiteDeRetiro(p: Paquete): string | null {
  const listo = [...p.historial].reverse().find((e) => e.tipo === "listo");
  if (!listo) return null;
  return new Date(Date.parse(listo.ts) + DIAS_ABANDONO * 86_400_000).toISOString();
}

function lugarDeRetiro(p: Paquete): string {
  return p.entrega.tipo === "sucursal" ? sucursalDef(p.entrega.sucursal).nombre : p.entrega.zona;
}

/** El texto del aviso de un evento. null = ese evento no se le avisa al cliente. */
export function textoAviso(ev: EventoPaquete, p: Paquete, ctx: ContextoAviso): string | null {
  const nombre = primerNombre(ctx.cliente.nombre);
  const vuelo = ctx.vuelos.find((v) => v.id === p.vueloId);
  const deTienda = `de ${p.tienda}`;

  switch (ev.tipo) {
    case "prealertado":
      // Desde una captura, se repite lo que se leyó (valor incluido): así el
      // cliente corrige en el momento si algo salió mal, no en aduana.
      return p.prealerta?.origen === "captura"
        ? `¡Listo, ${nombre}! Leí tu captura y quedó prealertado tu paquete ${deTienda}: ${p.contenido} (${dinero(p.valor)}), tracking ${trackingLegible(p.tracking)}. Te aviso cuando llegue a nuestra bodega en Miami.`
        : `¡Listo, ${nombre}! Quedó prealertado tu paquete ${deTienda}: ${p.contenido}, tracking ${trackingLegible(p.tracking)}. Te aviso cuando llegue a nuestra bodega en Miami.`;

    case "miami":
      if (!p.prealerta) {
        return `Hola, ${nombre}. Recibimos en Miami un paquete ${deTienda} para tu casillero ${ctx.cliente.casillero} (${libras(p.pesoLb ?? 0)}). Para que salga en el próximo vuelo, mándanos por aquí la captura del pedido o la factura.`;
      }
      return `${nombre}, recibimos en Miami tu paquete ${deTienda} (${p.contenido}): ${libras(p.pesoLb ?? 0)}. Sale en el vuelo del ${diaDeVuelo(vuelo)}.`;

    case "en_vuelo":
      return `Tu paquete ${deTienda} (${p.contenido}) ya va en vuelo a El Salvador ✈️`;

    case "aduana":
      return `Tu paquete ${deTienda} aterrizó en El Salvador y está en trámite de aduana. Te aviso apenas lo liberen.`;

    case "retenido": {
      const motivo = (ev.detalle ?? p.retenido?.motivo ?? "aduana necesita revisarlo").replace(/^\p{Lu}/u, (l) => l.toLowerCase());
      return `${nombre}, aduana detuvo tu paquete ${deTienda} (${p.contenido}): ${motivo}. ¿Nos mandas por aquí la captura de la factura para liberarlo?`;
    }

    case "listo": {
      const c = cobroDe(p, ctx.totalDelVuelo);
      const cuenta = c.conDai
        ? `Envío ${dinero(c.envio)} + IVA ${dinero(c.impuesto.iva)}, más el DAI que liquidó aduana`
        : `Total: ${dinero(c.total)} (envío ${dinero(c.envio)} + IVA ${dinero(c.impuesto.iva)})`;
      if (p.entrega.tipo === "domicilio") {
        return `¡Tu paquete está listo, ${nombre}! ${p.contenido} ${deTienda}. ${cuenta}, más el cargo de entrega de tu zona. Te escribimos para coordinar la entrega en ${p.entrega.zona}.`;
      }
      return `¡Tu paquete está listo, ${nombre}! ${p.contenido} ${deTienda}. ${cuenta}. Retíralo en ${lugarDeRetiro(p)} con tu DUI.`;
    }

    case "entregado":
      return p.entrega.tipo === "domicilio"
        ? `Entregamos tu paquete ${deTienda} en ${p.entrega.zona}. ¡Gracias por traer tus compras con Express Shopping!`
        : `Entregamos tu paquete ${deTienda} (${p.contenido}). ¡Gracias por traer tus compras con Express Shopping!`;

    case "pagado": {
      const c = cobroDe(p, ctx.totalDelVuelo);
      return c.conDai ? `Recibimos tu pago. ¡Gracias, ${nombre}!` : `Recibimos tu pago de ${dinero(c.total)}. ¡Gracias, ${nombre}!`;
    }

    case "cambio_vuelo":
      return `Listo, ${nombre}: ${p.contenido} se va en el vuelo del ${diaDeVuelo(vuelo)}. Así no pasas de $300 en un mismo vuelo y pagas solo IVA.`;

    case "recordatorio": {
      const limite = limiteDeRetiro(p);
      const hasta = limite ? ` Tienes hasta el ${fechaCorta(diaSV(limite))} para retirarlo.` : "";
      return `Hola, ${nombre}. Tu paquete ${deTienda} (${p.contenido}) sigue esperándote en ${lugarDeRetiro(p)}.${hasta}`;
    }

    default:
      return null;
  }
}

/** Todos los avisos de un paquete, en orden. */
export function avisosDe(p: Paquete, ctx: ContextoAviso): Aviso[] {
  const out: Aviso[] = [];
  p.historial.forEach((ev, i) => {
    const texto = textoAviso(ev, p, ctx);
    if (!texto) return;
    out.push({
      id: ev.movId ? `av-${ev.movId}` : `av-${p.id}-${i}`,
      paqueteId: p.id,
      clienteId: p.clienteId,
      ts: ev.ts,
      texto,
      movId: ev.movId,
    });
  });
  return out;
}
