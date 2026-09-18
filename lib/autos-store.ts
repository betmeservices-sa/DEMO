// Persistencia del embudo de la sala de ventas.
//
// COMPARTE TABLA con el embudo de credito (`ventas_solicitudes`), y no por
// ahorrar: es la misma forma. Un caso por persona, llaveado por el mismo
// telefono que la ficha y la conversacion, con sus marcas de tiempo y su
// bitacora. Lo que cambia es QUE se guarda adentro del jsonb: alla los
// documentos del expediente, aca los pasos de la venta.
//
// La frontera entre los dos tableros es la columna `tenant`, la misma que
// separa a un cliente de otro en toda la app. Nissan nunca ve un expediente de
// credito y CrediQ nunca ve una prueba de manejo.
//
// Las columnas se leen con otro nombre porque significan otra cosa:
//   vehiculo   -> modelo del catalogo
//   expediente -> pasos de la venta
//   pedidos    -> cuando se le mando la cotizacion
//   completado -> cuando dejo el deposito y la unidad salio de disponible
//
// Sin Supabase cae a memoria, igual que el resto de los stores.

import { modeloDe, type MotivoTraba } from "./autos-catalogo";
import {
  hecho,
  pasoDe,
  siguienteVendedor,
  type EstadoPaso,
  type Oportunidad,
  type Pasos,
  type Resultado,
  type Vendedor,
} from "./autos-pipeline";
import {
  asegurarSolicitud,
  asignarVendedor as asignarVendedorFila,
  cerrarSolicitud,
  eventosDe,
  fijarCanal as fijarCanalFila,
  guardarSolicitud,
  leerSolicitud,
  listarSolicitudes,
  marcarContactado as marcarContactadoFila,
  marcarTomado as marcarTomadoFila,
  reabrirSolicitud,
  registrarEvento,
  type Evento,
} from "./ventas-store";
import type { Solicitud } from "./ventas-pipeline";

export type { Evento } from "./ventas-store";
export { eventosDe, registrarEvento } from "./ventas-store";

// ---- Traduccion de la fila --------------------------------------------------

function aOportunidad(s: Solicitud): Oportunidad {
  return {
    tenant: s.tenant,
    telefono: s.telefono,
    nombre: s.nombre,
    modelo: s.vehiculo ?? null,
    // `expediente` es un jsonb suelto: en credito guarda documentos y aca
    // guarda pasos. Los dos tipos describen el MISMO json con otro
    // vocabulario, asi que este paso por `unknown` es la traduccion entre los
    // dos tableros, no un atajo para callar al compilador.
    pasos: (s.expediente ?? {}) as unknown as Pasos,
    vendedor: s.vendedor,
    creado: s.creado,
    contactado: s.contactado,
    cotizado: s.pedidos,
    separado: s.completado,
    asignado: s.asignado,
    tomado: s.tomado,
    cerrado: s.cerrado,
    resultado: s.resultado,
    motivoCierre: s.motivoCierre,
    avisado: s.avisado,
    escalado: s.escalado,
    monto: s.monto ?? null,
    // La columna es texto libre y cada tablero tiene su lista: en la sala de
    // ventas existe "llego a sala", que en credito no significa nada.
    canal: ((s.canal as string | null) ?? null) as Oportunidad["canal"],
    contactos: s.contactos ?? null,
    actualizado: s.actualizado,
  };
}

function aFila(o: Oportunidad): Solicitud {
  return {
    tenant: o.tenant,
    telefono: o.telefono,
    nombre: o.nombre,
    vehiculo: o.modelo ?? null,
    expediente: o.pasos as unknown as Solicitud["expediente"],
    vendedor: o.vendedor,
    creado: o.creado,
    contactado: o.contactado,
    pedidos: o.cotizado,
    completado: o.separado,
    asignado: o.asignado,
    tomado: o.tomado,
    cerrado: o.cerrado,
    resultado: o.resultado,
    motivoCierre: o.motivoCierre,
    avisado: o.avisado,
    escalado: o.escalado,
    monto: o.monto ?? null,
    canal: ((o.canal as string | null) ?? null) as Solicitud["canal"],
    contactos: o.contactos ?? null,
    actualizado: o.actualizado,
  };
}

/** Guarda respetando la fecha de ultimo movimiento (lo usa el sembrado). */
export async function guardarOportunidad(o: Oportunidad): Promise<Oportunidad> {
  await guardarSolicitud(aFila(o));
  return o;
}

/** Guarda y deja el caso como movido ahora, que es lo que hace el tablero. */
async function guardar(o: Oportunidad): Promise<Oportunidad> {
  const tocada = { ...o, actualizado: new Date().toISOString() };
  await guardarSolicitud(aFila(tocada));
  return tocada;
}

// ---- Lectura ----------------------------------------------------------------

export async function listarOportunidades(tenant: string): Promise<Oportunidad[]> {
  return (await listarSolicitudes(tenant)).map(aOportunidad);
}

export async function leerOportunidad(tenant: string, telefono: string): Promise<Oportunidad | null> {
  const s = await leerSolicitud(tenant, telefono);
  return s ? aOportunidad(s) : null;
}

export async function historialDe(tenant: string, telefono: string, tope = 50): Promise<Evento[]> {
  return eventosDe(tenant, telefono, tope);
}

// ---- Alta -------------------------------------------------------------------

/**
 * Crea la oportunidad si el prospecto todavia no tiene una, y la reparte.
 *
 * El reparto es AL ENTRAR y no al final, que es la diferencia con el embudo de
 * credito: alla el caso se reparte cuando el expediente queda completo, porque
 * hasta entonces es papeleo. Aca un lead sin dueno es un lead que nadie llama,
 * y el reloj de las primeras horas es justo el que decide la venta.
 */
export async function asegurarOportunidad(
  tenant: string,
  telefono: string,
  datos?: { nombre?: string; modelo?: string | null },
  vendedores: Vendedor[] = [],
): Promise<Oportunidad> {
  const previa = await leerOportunidad(tenant, telefono);
  const base = aOportunidad(
    await asegurarSolicitud(tenant, telefono, { nombre: datos?.nombre, vehiculo: datos?.modelo ?? null }),
  );
  if (previa) return base;

  const vendedor = siguienteVendedor(vendedores, await listarOportunidades(tenant));
  if (!vendedor) return base;
  const ahora = new Date().toISOString();
  await registrarEvento(tenant, telefono, "asignado", "sistema", vendedor.nombre);
  return guardar({ ...base, vendedor: vendedor.id, asignado: ahora });
}

// ---- Movimientos ------------------------------------------------------------

export async function marcarContactado(tenant: string, telefono: string, actor: string): Promise<Oportunidad | null> {
  const s = await marcarContactadoFila(tenant, telefono, actor);
  return s ? aOportunidad(s) : null;
}

export async function marcarTomado(tenant: string, telefono: string, actor: string): Promise<Oportunidad | null> {
  const s = await marcarTomadoFila(tenant, telefono, actor);
  return s ? aOportunidad(s) : null;
}

export async function asignarVendedor(
  tenant: string,
  telefono: string,
  vendedorId: string,
  actor: string,
  nombreVendedor?: string,
): Promise<Oportunidad | null> {
  const s = await asignarVendedorFila(tenant, telefono, vendedorId, actor, nombreVendedor);
  return s ? aOportunidad(s) : null;
}

export async function fijarCanal(
  tenant: string,
  telefono: string,
  canal: Oportunidad["canal"],
  actor: string,
): Promise<Oportunidad | null> {
  const s = await fijarCanalFila(tenant, telefono, ((canal as string | null) ?? null) as Solicitud["canal"], actor);
  return s ? aOportunidad(s) : null;
}

export async function cerrarOportunidad(
  tenant: string,
  telefono: string,
  resultado: Resultado,
  motivo: string | null,
  actor: string,
): Promise<Oportunidad | null> {
  const s = await cerrarSolicitud(tenant, telefono, resultado, motivo, actor);
  return s ? aOportunidad(s) : null;
}

export async function reabrirOportunidad(tenant: string, telefono: string, actor: string): Promise<Oportunidad | null> {
  const s = await reabrirSolicitud(tenant, telefono, actor);
  return s ? aOportunidad(s) : null;
}

/**
 * El modelo que anda viendo.
 *
 * Cambia mas de lo que uno creeria: pregunta por la Frontier, ve la cuota y
 * termina en Kicks. Si el caso todavia no tiene valor, se le pone el precio de
 * lista del modelo, que es con lo que el gerente proyecta mientras no haya
 * propuesta. Queda anotado en la historia para que nadie lo confunda con un
 * precio negociado.
 */
export async function fijarModelo(
  tenant: string,
  telefono: string,
  modelo: string | null,
  actor: string,
): Promise<Oportunidad | null> {
  const o = await leerOportunidad(tenant, telefono);
  if (!o) return null;
  const m = modeloDe(modelo);
  await registrarEvento(tenant, telefono, "modelo", actor, m?.nombre ?? modelo ?? "sin modelo");
  let siguiente: Oportunidad = { ...o, modelo: m?.id ?? modelo ?? null };
  if (siguiente.monto == null && m) {
    siguiente = { ...siguiente, monto: m.desde };
    await registrarEvento(tenant, telefono, "monto", "sistema", `precio de lista de ${m.nombre}`);
  }
  return guardar(siguiente);
}

/** El valor de la operacion, tal como quedo negociado. */
export async function fijarMonto(
  tenant: string,
  telefono: string,
  monto: number | null,
  actor: string,
): Promise<Oportunidad | null> {
  const o = await leerOportunidad(tenant, telefono);
  if (!o) return null;
  await registrarEvento(tenant, telefono, "monto", actor, monto == null ? "sin precio" : `$${monto.toLocaleString("en-US")}`);
  return guardar({ ...o, monto });
}

/**
 * Mueve un paso de la venta.
 *
 * Tres cosas pasan solas acá, y las tres son la razón de que el tablero no
 * tenga botón de "cambiar de etapa":
 *   1. La cotización enviada deja su fecha en el caso: es la primera medida
 *      real de qué tan rápido responde la sala.
 *   2. La unidad separada también, porque a partir de ahí hay una unidad
 *      reservada en inventario y eso cuesta dinero si no se entrega.
 *   3. La entrega hecha CIERRA la venta. Marcar la entrega y después tener que
 *      marcar "vendido" era pedirle al vendedor que dijera dos veces lo mismo,
 *      y una de las dos siempre se quedaba sin hacer.
 */
export async function moverPaso(opciones: {
  tenant: string;
  telefono: string;
  paso: string;
  estado: EstadoPaso;
  motivo?: MotivoTraba | null;
  nota?: string | null;
  fecha?: string | null;
  actor: string;
}): Promise<Oportunidad | null> {
  const { tenant, telefono, paso, estado, actor } = opciones;
  const o = await leerOportunidad(tenant, telefono);
  if (!o) return null;
  const ahora = new Date().toISOString();

  const pasos: Pasos = {
    ...o.pasos,
    [paso]: {
      estado,
      motivo: estado === "trabado" ? (opciones.motivo ?? "otro") : null,
      nota: opciones.nota ?? null,
      fecha: estado === "agendado" ? (opciones.fecha ?? null) : null,
      ts: ahora,
      por: actor,
    },
  };
  if (estado === "pendiente") delete pasos[paso];

  const tipo = estado === "hecho" ? "paso_hecho" : estado === "agendado" ? "paso_agendado" : "paso_trabado";
  if (estado !== "pendiente") await registrarEvento(tenant, telefono, tipo, actor, paso);

  let siguiente: Oportunidad = {
    ...o,
    pasos,
    // Tocar cualquier paso implica que ya se le habló: nadie cotiza a alguien
    // con quien no habló.
    contactado: o.contactado ?? ahora,
    tomado: o.tomado ?? (o.asignado ? ahora : o.tomado),
  };

  const cotizacionHecha = pasoDe(pasos, "cotizacion").estado === "hecho";
  if (cotizacionHecha && !siguiente.cotizado) siguiente = { ...siguiente, cotizado: ahora };
  if (!cotizacionHecha && siguiente.cotizado) siguiente = { ...siguiente, cotizado: null };

  const separacionHecha = pasoDe(pasos, "separacion").estado === "hecho";
  if (separacionHecha && !siguiente.separado) siguiente = { ...siguiente, separado: ahora };
  if (!separacionHecha && siguiente.separado) siguiente = { ...siguiente, separado: null };

  if (hecho(pasos, "entrega") && !siguiente.cerrado) {
    siguiente = { ...siguiente, cerrado: ahora, resultado: "venta", motivoCierre: null };
    await registrarEvento(tenant, telefono, "cerrado", actor, "Entregado");
  }
  // Deshacer la entrega reabre la venta: si no, un clic equivocado dejaba el
  // caso cerrado para siempre y con la unidad fuera de inventario.
  if (!hecho(pasos, "entrega") && siguiente.cerrado && siguiente.resultado === "venta") {
    siguiente = { ...siguiente, cerrado: null, resultado: null };
  }

  return guardar(siguiente);
}

/** Deja anotado que ya se avisó (o que ya venció), para no repetir el aviso. */
export async function marcarAviso(
  tenant: string,
  telefono: string,
  nivel: "aviso" | "vencido",
): Promise<void> {
  const o = await leerOportunidad(tenant, telefono);
  if (!o) return;
  const ahora = new Date().toISOString();
  await guardar(nivel === "vencido" ? { ...o, escalado: ahora, avisado: o.avisado ?? ahora } : { ...o, avisado: ahora });
}

/** El precio de lista del modelo, para ofrecerlo en la ficha sin adivinar. */
export function precioDeLista(modelo: string | null | undefined): number | null {
  return modeloDe(modelo ?? null)?.desde ?? null;
}
