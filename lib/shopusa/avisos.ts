// Los avisos de WhatsApp que recibe el cliente en cada paso. Puro.
//
// Es la otra mitad de la línea de paquetes: ShopUSA promete avisar por la web,
// el correo o WhatsApp cuando el paquete está para retirar, y su página de
// preguntas manda a escribir al 7858-0444 para saber si ya llegó. Si el
// cliente se entera solo de cada paso (recibido en Miami, en tránsito, en
// aduana, listo con su total), deja de preguntar. Cada evento de la bitácora
// del paquete es un aviso, con el mismo texto en la ficha y en la bandeja.
//
// Va de "tú", como habla ShopUSA en su sitio.

import type { Aviso, Carga, Cliente, EventoPaquete, Paquete } from "./tipos";
import { DIAS_ABANDONO, DIAS_SIN_ALMACENAJE, esSucursal, motivoSelectivo, sucursalDef } from "./catalogo";
import { arancelDe, cobroDeEnvio, dinero, libras, listoDesde, type Cobro } from "./cobro";
import { fechaCorta, horaCorta, diaSV } from "@/lib/eventos/fechas";
import { articuloFijo, diaDeCarga, listaDeCosas, trackingLegible } from "./formato";

export interface ContextoAviso {
  cliente: Cliente;
  cargas: readonly Carga[];
  /** Todos los paquetes: el envío consolidado se arma con los del mismo cliente. */
  paquetes: readonly Paquete[];
}

export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

/** "jue 22 oct, 9:00 p. m.": la salida de una carga, para las pantallas del equipo. */
export function salidaDe(c: Carga | undefined): string {
  if (!c) return "próxima carga";
  return `${fechaCorta(diaSV(c.sale))}, ${horaCorta(c.sale)}`;
}

const DIA_MS = 86_400_000;

/** Hasta qué día se retira sin pagar almacenaje (30 días desde que quedó listo). */
export function limiteSinAlmacenaje(p: Paquete): string | null {
  const listo = listoDesde(p);
  return listo ? new Date(Date.parse(listo) + DIAS_SIN_ALMACENAJE * DIA_MS).toISOString() : null;
}

/** El día en que cae en abandono (60 días desde que quedó listo). */
export function fechaDeAbandono(p: Paquete): string | null {
  const listo = listoDesde(p);
  return listo ? new Date(Date.parse(listo) + DIAS_ABANDONO * DIA_MS).toISOString() : null;
}

function sucursalDe(p: Paquete): string {
  return p.entrega.tipo === "sucursal" ? `la sucursal ${sucursalDef(p.entrega.sucursal).nombre}` : p.entrega.zona;
}

/** Los otros paquetes del cliente en la misma carga. */
function hermanos(p: Paquete, ctx: ContextoAviso): Paquete[] {
  if (!p.cargaId) return [];
  return ctx.paquetes.filter((x) => x.id !== p.id && x.clienteId === p.clienteId && x.cargaId === p.cargaId);
}

function cuando(x: Paquete, tipo: EventoPaquete["tipo"]): string | undefined {
  return [...x.historial].reverse().find((e) => e.tipo === tipo)?.ts;
}

function desglose(c: Cobro): string {
  const partes = [`flete ${dinero(c.flete)}`, `impuestos ${dinero(c.impuestos)}`];
  if (c.recargos) partes.push(`prealerta tardía ${dinero(c.recargos)}`);
  if (c.traslado) partes.push(`traslado ${dinero(c.traslado)}`);
  if (c.domicilio) partes.push(`domicilio ${dinero(c.domicilio)}`);
  return partes.join(" + ");
}

/** Lo que va a pagar de impuestos, en una frase, para la confirmación de la prealerta. */
function avisoDeImpuestos(p: Paquete): string {
  const a = arancelDe(p.valor, p.categoria);
  if (a.tipo === "fija") return ` Por ser ${articuloFijo(p.categoria)} de más de $100, lleva tarifa fija de ${dinero(a.monto)} más el 13% de IVA.`;
  if (a.tipo === "dai") return ` Como tu factura pasa de $300, Aduana cobra el ${a.pct}% de DAI además del 13% de IVA.`;
  return "";
}

/** El texto del aviso de un evento. null = ese evento no se le avisa al cliente. */
export function textoAviso(ev: EventoPaquete, p: Paquete, ctx: ContextoAviso): string | null {
  const nombre = primerNombre(ctx.cliente.nombre);
  const carga = ctx.cargas.find((c) => c.id === p.cargaId);
  const deTienda = `de ${p.tienda}`;

  switch (ev.tipo) {
    case "pendiente": {
      const origen = p.prealerta?.origen;
      // Desde una captura, se repite lo que se leyó (valor incluido): así el
      // cliente corrige en el momento si algo salió mal, no en aduana.
      if (origen === "captura") {
        return `¡Listo, ${nombre}! Leí tu captura y quedó prealertado tu paquete ${deTienda}: ${p.contenido} (${dinero(p.valor)}), tracking ${trackingLegible(p.tracking)}. Lo retiras en ${sucursalDe(p)}.${avisoDeImpuestos(p)} Te aviso cuando llegue a nuestra bodega en Miami.`;
      }
      if (origen === "web") {
        return `¡Hola, ${nombre}! Recibimos tu prealerta ${deTienda}: ${p.contenido}, tracking ${trackingLegible(p.tracking)}. Te aviso cuando llegue a nuestra bodega en Miami.`;
      }
      return `¡Listo, ${nombre}! Quedó prealertado tu paquete ${deTienda}: ${p.contenido}, tracking ${trackingLegible(p.tracking)}. Te aviso cuando llegue a nuestra bodega en Miami.`;
    }

    case "miami": {
      if (!p.prealerta || p.prealerta.ts > ev.ts) {
        return `Hola, ${nombre}. Recibimos en Miami un paquete ${deTienda} a tu nombre (${libras(p.pesoLb ?? 0)}), pero no tiene prealerta. Mándanos por aquí la factura o la captura de tu pedido para declararlo: sin factura, Aduana lo valora con sus precios de referencia. Por llegar sin prealerta lleva un cargo de $1.50.`;
      }
      const sale = carga ? `Sale en la carga del ${diaDeCarga(carga)}.` : "Sale en la próxima carga.";
      // Lo que ya estaba en bodega para la misma carga se pesa junto con este.
      const antes = hermanos(p, ctx).filter((x) => {
        const t = cuando(x, "miami");
        return t !== undefined && t <= ev.ts;
      });
      const junto = antes.length
        ? ` Va en la misma carga que ${listaDeCosas(antes.map((x) => `tu ${x.contenido}`))}: se pesan juntos y pagas un solo flete.`
        : "";
      return `${nombre}, recibimos en nuestra bodega de Miami tu paquete ${deTienda} (${p.contenido}): ${libras(p.pesoLb ?? 0)}. ${sale}${junto}`;
    }

    case "transito":
      return `Tu paquete ${deTienda} (${p.contenido}) salió de Miami y va en tránsito a El Salvador ✈️`;

    case "aduana":
      return `Tu paquete ${deTienda} ya está en El Salvador, en trámite de aduana. Te aviso apenas esté listo.`;

    case "selectivo": {
      const m = motivoSelectivo(ev.detalle ?? p.selectivo?.motivo ?? "Aduana revisa el contenido del paquete");
      const motivo = m.texto.replace(/^\p{Lu}/u, (l) => l.toLowerCase());
      const sigue = m.pideFactura
        ? " ¿Nos mandas por aquí la factura de la compra para liberarlo?"
        : /permiso/i.test(m.texto)
          ? " Te escribimos para explicarte el trámite."
          : " Te aviso apenas termine la revisión.";
      return `${nombre}, Aduana le dio selectivo rojo a tu paquete ${deTienda} (${p.contenido}): ${motivo}.${sigue}`;
    }

    case "listo": {
      // Lo que salió de aduana en el mismo momento se avisa en un solo mensaje,
      // desde el primero del envío: un solo cobro, un solo aviso.
      const juntos = hermanos(p, ctx).filter((x) => x.historial.some((e) => e.tipo === "listo" && e.ts === ev.ts));
      if (juntos.some((x) => x.id < p.id)) return null;
      const envio = [p, ...juntos].sort((a, b) => a.id.localeCompare(b.id));
      const c = cobroDeEnvio(envio, Date.parse(ev.ts));
      const retiro =
        p.entrega.tipo === "domicilio"
          ? ` Te escribimos para coordinar la entrega en ${p.entrega.zona}.`
          : ` Retíralo en ${sucursalDe(p)} con tu DUI.`;
      if (envio.length === 1) {
        return `¡Tu paquete está listo, ${nombre}! ${p.contenido} ${deTienda}. Total: ${dinero(c.total)} (${desglose(c)}).${retiro}`;
      }
      return `¡Tus ${envio.length} paquetes están listos, ${nombre}! ${listaDeCosas(envio.map((x) => x.contenido))}. Los pesamos juntos (${c.libras} lb) y pagas un solo flete. Total: ${dinero(c.total)} (${desglose(c)}).${retiro}`;
    }

    case "en_camino":
      return p.entrega.tipo === "domicilio"
        ? `Tu paquete ${deTienda} (${p.contenido}) va en camino a tu casa en ${p.entrega.zona} 🚚 Al recibirlo, revisa tus productos antes de firmar la nota de remisión.`
        : null;

    case "entregado":
      return p.entrega.tipo === "domicilio"
        ? `Entregamos tu paquete ${deTienda} en ${p.entrega.zona}. ¡Gracias por traer tus compras con ShopUSA!`
        : `Entregamos tu paquete ${deTienda} (${p.contenido}). ¡Gracias por traer tus compras con ShopUSA!`;

    case "pagado": {
      // El pago de un envío consolidado se avisa una vez, desde el paquete que se cobró.
      if (ev.acompana) return null;
      const juntos = ctx.paquetes.filter((x) => x.historial.some((e) => e.tipo === "pagado" && e.acompana === p.id && e.ts === ev.ts));
      const c = cobroDeEnvio([p, ...juntos], Date.parse(ev.ts));
      const comprobante = ctx.cliente.correo ? " El comprobante te llega a tu correo." : "";
      return `Recibimos tu pago de ${dinero(c.total)}. ¡Gracias, ${nombre}!${comprobante}`;
    }

    case "traslado": {
      const destino = esSucursal(ev.detalle) ? sucursalDef(ev.detalle).nombre : "nueva";
      const cargo = p.traslado?.cobra
        ? " El traslado entre sucursales lleva un cargo de $2.50."
        : " Como lo prealertaste a tiempo, el traslado no tiene costo.";
      return `Listo, ${nombre}: tu paquete ${deTienda} (${p.contenido}) ahora se retira en la sucursal ${destino}.${cargo}`;
    }

    case "recordatorio": {
      const limite = limiteSinAlmacenaje(p);
      const abandono = fechaDeAbandono(p);
      const yaCobra = limite !== null && ev.ts > limite;
      const cola = yaCobra
        ? ` Ya cobra almacenaje (10% por semana) y el ${fechaCorta(diaSV(abandono ?? ev.ts))} pasa a abandono.`
        : limite
          ? ` Retíralo antes del ${fechaCorta(diaSV(limite))} para que no se cobre almacenaje.`
          : "";
      return `Hola, ${nombre}. Tu paquete ${deTienda} (${p.contenido}) te espera en ${sucursalDe(p)}.${cola}`;
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
