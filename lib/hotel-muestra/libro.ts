// El libro de reservas de la muestra y la foto que arma el Dashboard.
//
// Cada habitación se llena noche por noche con un azar repetible: más los
// viernes y sábados, menos cuanto más lejos está la fecha (lo lejano todavía
// no se vendió). A eso se le suman las reservas que entran en el demo (a mano o
// confirmando un apartado), que ocupan su noche como cualquier otra.
//
// Es la misma cuenta que hace el panel de Yali con Cloudbeds (ocupación de hoy,
// llegadas, salidas, lo reservado en la ventana, tarifa media y por dónde entra
// cada reserva), solo que con un libro inventado.

import type { HabitacionMuestra, HotelMuestra, ReservaMuestra, ZonaMuestra } from "./tipos";
import { azar, diasEntre, elegir, esNocheFinde, hash, sumarDias } from "./fechas";
import { tarifaFinde } from "./tarifas";

/** Noches hacia atrás que se generan, para que hoy tenga huéspedes que ya estaban. */
const ATRAS = 8;
/** Noches hacia adelante. Cubre el rango de 30 días del tablero. */
const ADELANTE = 45;

/** El precio de una noche: el fin de semana sube un 20 %. */
export function precioNoche(hab: HabitacionMuestra, dia: string): number {
  return esNocheFinde(dia) ? tarifaFinde(hab.tarifaNoche) : hab.tarifaNoche;
}

export function totalEstadia(hab: HabitacionMuestra, desde: string, noches: number): number {
  let total = 0;
  for (let i = 0; i < noches; i++) total += precioNoche(hab, sumarDias(desde, i));
  return total;
}

function codigo(prefijo: string, ...llave: (string | number)[]): string {
  return `${prefijo}-${hash(llave.join("|")).toString(36).toUpperCase().padStart(6, "0").slice(-6)}`;
}

function canalPara(hotel: HotelMuestra, ...llave: (string | number)[]): string {
  const total = hotel.canales.reduce((s, c) => s + c.peso, 0);
  let x = azar(...llave) * total;
  for (const c of hotel.canales) {
    x -= c.peso;
    if (x <= 0) return c.canal;
  }
  return hotel.canales[0].canal;
}

/** Las reservas de la muestra alrededor de hoy. */
export function libroDeMuestra(hotel: HotelMuestra, hoy: string): ReservaMuestra[] {
  const reservas: ReservaMuestra[] = [];
  const inicio = sumarDias(hoy, -ATRAS);
  for (const zona of hotel.zonas) {
    for (const hab of zona.habitaciones) {
      for (let u = 0; u < hab.unidades; u++) {
        let d = 0;
        while (d < ATRAS + ADELANTE) {
          const dia = sumarDias(inicio, d);
          const lejos = Math.max(0, diasEntre(hoy, dia));
          // Lo de las próximas dos semanas ya está bastante vendido; lo de
          // dentro de un mes, mucho menos.
          const caida = Math.max(0.3, 1 - lejos / 38);
          const base = esNocheFinde(dia) ? hotel.ocupacion.finde : hotel.ocupacion.semana;
          if (azar(hotel.tenant, hab.id, u, dia, "entra") < base * caida * 0.62) {
            const viernes = esNocheFinde(dia);
            const noches = viernes ? 2 + Math.floor(azar(hab.id, u, dia, "n") * 2) : 1 + Math.floor(azar(hab.id, u, dia, "n") * 4);
            const huespedes = Math.max(1, Math.min(hab.capacidad, 1 + Math.floor(azar(hab.id, u, dia, "p") * hab.capacidad)));
            const canal = canalPara(hotel, hab.id, u, dia, "c");
            const porAgente = canal === "WhatsApp" || canal === "Instagram" ? azar(hab.id, u, dia, "a") < 0.72 : false;
            reservas.push({
              id: codigo(hotel.prefijoReserva, hotel.tenant, hab.id, u, dia),
              zonaId: zona.id,
              habitacionId: hab.id,
              huesped: `${elegir(hotel.nombres, hab.id, u, dia, "nom")} ${elegir(hotel.apellidos, hab.id, u, dia, "ape")}`,
              desde: dia,
              hasta: sumarDias(dia, noches),
              huespedes,
              total: totalEstadia(hab, dia, noches),
              canal,
              origen: porAgente ? "agente" : "muestra",
            });
            d += noches;
          } else {
            d += 1;
          }
        }
      }
    }
  }
  return reservas;
}

export interface FilaOcupacion {
  id: string;
  nombre: string;
  unidades: number;
  tarifaNoche: number;
  ocupadasPorNoche: number[];
}

export interface RepartoCanal {
  canal: string;
  reservas: number;
  ingreso: number;
}

export interface LlegadaPanel extends ReservaMuestra {
  zonaNombre: string;
  habitacionNombre: string;
}

export interface FotoZona {
  id: string;
  nombre: string;
  ubicacion: string;
  unidades: number;
  ocupadasHoy: number;
  ocupacionHoyPct: number;
  llegadasHoy: number;
  salidasHoy: number;
  huespedesEnCasa: number;
  ingresoVentana: number;
  reservasVentana: number;
  nochesVendidas: number;
  tarifaMedia: number;
  reservasDelAgente: number;
  filas: FilaOcupacion[];
  porCanal: RepartoCanal[];
  llegadas: LlegadaPanel[];
}

export interface FotoHotel {
  hoy: string;
  dias: number;
  /** Las 14 noches de la franja de ocupación. */
  fechas: string[];
  zonas: FotoZona[];
  total: Omit<FotoZona, "id" | "nombre" | "ubicacion" | "filas">;
}

export const NOCHES_FRANJA = 14;

function habitacionDe(hotel: HotelMuestra, id: string): { zona: ZonaMuestra; hab: HabitacionMuestra } | null {
  for (const zona of hotel.zonas) {
    const hab = zona.habitaciones.find((h) => h.id === id);
    if (hab) return { zona, hab };
  }
  return null;
}

/** Ocupa una noche: la reserva cuenta si esa noche cae entre su llegada y su salida. */
function ocupa(r: ReservaMuestra, dia: string): boolean {
  return r.desde <= dia && dia < r.hasta;
}

/**
 * Noches de la reserva que caen en la ventana [hoy, hoy + dias), con su
 * precio. Lo reservado "a 7 días" es lo que se va a cobrar en esos 7 días, no
 * la estadía entera de quien llega el día 6 y se queda dos semanas.
 */
function enVentana(hotel: HotelMuestra, r: ReservaMuestra, hoy: string, dias: number): { noches: number; ingreso: number } {
  const ref = habitacionDe(hotel, r.habitacionId);
  const nochesTotal = Math.max(1, diasEntre(r.desde, r.hasta));
  let noches = 0;
  let ingreso = 0;
  for (let i = 0; i < dias; i++) {
    const dia = sumarDias(hoy, i);
    if (!ocupa(r, dia)) continue;
    noches++;
    ingreso += ref ? precioNoche(ref.hab, dia) * (r.total / Math.max(1, totalEstadia(ref.hab, r.desde, nochesTotal))) : r.total / nochesTotal;
  }
  return { noches, ingreso };
}

/**
 * La foto del tablero: por zona y del hotel entero.
 *
 * Una habitación no se puede ocupar dos veces: si una reserva nueva cae sobre
 * una noche ya llena (el demo deja confirmar aunque no haya cupo), la cuenta se
 * corta en el número de unidades.
 */
export function fotoHotel(hotel: HotelMuestra, libro: ReservaMuestra[], hoy: string, dias: number): FotoHotel {
  const fechas = Array.from({ length: NOCHES_FRANJA }, (_, i) => sumarDias(hoy, i));

  const zonas: FotoZona[] = hotel.zonas.map((zona) => {
    const propias = libro.filter((r) => r.zonaId === zona.id);
    const unidades = zona.habitaciones.reduce((s, h) => s + h.unidades, 0);

    const filas: FilaOcupacion[] = zona.habitaciones.map((h) => {
      const deEsta = propias.filter((r) => r.habitacionId === h.id);
      return {
        id: h.id,
        nombre: h.nombre,
        unidades: h.unidades,
        tarifaNoche: h.tarifaNoche,
        ocupadasPorNoche: fechas.map((f) => Math.min(h.unidades, deEsta.filter((r) => ocupa(r, f)).length)),
      };
    });

    const ocupadasHoy = filas.reduce((s, f) => s + f.ocupadasPorNoche[0], 0);
    const enCasa = propias.filter((r) => ocupa(r, hoy));
    const tocanVentana = propias
      .map((r) => ({ r, v: enVentana(hotel, r, hoy, dias) }))
      .filter((x) => x.v.noches > 0);
    const ingresoVentana = tocanVentana.reduce((s, x) => s + x.v.ingreso, 0);
    const nochesVendidas = tocanVentana.reduce((s, x) => s + x.v.noches, 0);

    const porCanal = new Map<string, RepartoCanal>();
    for (const x of tocanVentana) {
      const c = porCanal.get(x.r.canal) ?? { canal: x.r.canal, reservas: 0, ingreso: 0 };
      c.reservas += 1;
      c.ingreso += x.v.ingreso;
      porCanal.set(x.r.canal, c);
    }

    const finVentana = sumarDias(hoy, Math.max(1, dias));
    const llegadas: LlegadaPanel[] = propias
      .filter((r) => r.desde >= hoy && r.desde < finVentana)
      .sort((a, b) => (a.desde === b.desde ? a.huesped.localeCompare(b.huesped) : a.desde < b.desde ? -1 : 1))
      .map((r) => ({
        ...r,
        zonaNombre: zona.nombre,
        habitacionNombre: zona.habitaciones.find((h) => h.id === r.habitacionId)?.nombre ?? r.habitacionId,
      }));

    return {
      id: zona.id,
      nombre: zona.nombre,
      ubicacion: zona.ubicacion,
      unidades,
      ocupadasHoy,
      ocupacionHoyPct: unidades === 0 ? 0 : Math.round((ocupadasHoy / unidades) * 100),
      llegadasHoy: propias.filter((r) => r.desde === hoy).length,
      salidasHoy: propias.filter((r) => r.hasta === hoy).length,
      huespedesEnCasa: enCasa.reduce((s, r) => s + r.huespedes, 0),
      ingresoVentana: Math.round(ingresoVentana),
      reservasVentana: tocanVentana.length,
      nochesVendidas,
      tarifaMedia: nochesVendidas === 0 ? 0 : Math.round(ingresoVentana / nochesVendidas),
      reservasDelAgente: tocanVentana.filter((x) => x.r.origen === "agente").length,
      filas,
      porCanal: [...porCanal.values()]
        .map((c) => ({ ...c, ingreso: Math.round(c.ingreso) }))
        .sort((a, b) => b.reservas - a.reservas),
      llegadas,
    };
  });

  const suma = (k: keyof FotoZona) => zonas.reduce((s, z) => s + (z[k] as number), 0);
  const unidades = suma("unidades");
  const ocupadasHoy = suma("ocupadasHoy");
  const ingresoVentana = suma("ingresoVentana");
  const nochesVendidas = suma("nochesVendidas");

  const canales = new Map<string, RepartoCanal>();
  for (const z of zonas) {
    for (const c of z.porCanal) {
      const t = canales.get(c.canal) ?? { canal: c.canal, reservas: 0, ingreso: 0 };
      t.reservas += c.reservas;
      t.ingreso += c.ingreso;
      canales.set(c.canal, t);
    }
  }

  return {
    hoy,
    dias,
    fechas,
    zonas,
    total: {
      unidades,
      ocupadasHoy,
      ocupacionHoyPct: unidades === 0 ? 0 : Math.round((ocupadasHoy / unidades) * 100),
      llegadasHoy: suma("llegadasHoy"),
      salidasHoy: suma("salidasHoy"),
      huespedesEnCasa: suma("huespedesEnCasa"),
      ingresoVentana,
      reservasVentana: suma("reservasVentana"),
      nochesVendidas,
      tarifaMedia: nochesVendidas === 0 ? 0 : Math.round(ingresoVentana / nochesVendidas),
      reservasDelAgente: suma("reservasDelAgente"),
      porCanal: [...canales.values()].sort((a, b) => b.reservas - a.reservas),
      llegadas: zonas
        .flatMap((z) => z.llegadas)
        .sort((a, b) => (a.desde === b.desde ? a.huesped.localeCompare(b.huesped) : a.desde < b.desde ? -1 : 1)),
    },
  };
}

/** ¿Hay lugar en esa habitación todas las noches de la estadía? */
export function hayLugar(hotel: HotelMuestra, libro: ReservaMuestra[], habitacionId: string, desde: string, noches: number): boolean {
  const ref = habitacionDe(hotel, habitacionId);
  if (!ref) return false;
  for (let i = 0; i < noches; i++) {
    const dia = sumarDias(desde, i);
    const ocupadas = libro.filter((r) => r.habitacionId === habitacionId && ocupa(r, dia)).length;
    if (ocupadas >= ref.hab.unidades) return false;
  }
  return true;
}

export function nombreHabitacion(hotel: HotelMuestra, habitacionId: string): string {
  return habitacionDe(hotel, habitacionId)?.hab.nombre ?? habitacionId;
}

export function nombreZona(hotel: HotelMuestra, zonaId: string): string {
  return hotel.zonas.find((z) => z.id === zonaId)?.nombre ?? zonaId;
}

export { habitacionDe };
