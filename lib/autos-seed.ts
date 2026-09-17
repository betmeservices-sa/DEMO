// Prospectos de ejemplo para el tablero de la sala de ventas.
//
// Un embudo vacio no ensena nada: hace falta gente en cada columna, pruebas de
// manejo agendadas, una cita que ya se paso sin que nadie la cerrara, ventas
// entregadas para que la tasa de cierre signifique algo y un par de leads que
// el vendedor no tomo a tiempo.
//
// Las fechas son relativas al momento de sembrar (hace 3 horas, hace 5 dias) y
// se ponen al dia solas: asi el tablero se ve vivo el dia que se ensena, y las
// alertas de 4 y 24 horas disparan de verdad en vez de ser un adorno.

import { upsertContacto } from "./contacts-store";
import { vendedoresDe } from "./ventas-equipo";
import type { CanalLead, EstadoPaso, Oportunidad, Pasos } from "./autos-pipeline";
import { nombreDeModelo, type MotivoTraba } from "./autos-catalogo";
import { guardarOportunidad, listarOportunidades, registrarEvento } from "./autos-store";

const HORA = 3_600_000;

interface PasoSembrado {
  id: string;
  estado: EstadoPaso;
  /** Horas atras en que se movio. */
  hace?: number;
  /** Para lo agendado: horas de aca a la cita (negativo = ya paso). */
  cita?: number;
  motivo?: MotivoTraba;
  nota?: string;
}

interface Sembrado {
  telefono: string;
  nombre: string;
  modelo: string;
  /** Valor de la operacion. Sin esto, el caso vale cero en el embudo. */
  monto?: number;
  canal?: CanalLead;
  /** Horas atras en que entro el lead. */
  entro: number;
  contactado?: number;
  /** Cuando el vendedor lo tomo. Sin esto, cuenta como no tomado (alerta). */
  tomado?: number;
  pasos?: PasoSembrado[];
  cerrado?: number;
  resultado?: "venta" | "perdido";
  motivoCierre?: string;
  /** Horas atras del ultimo movimiento. Por defecto, lo mas reciente que tenga. */
  actualizado?: number;
}

// Precios: los de lista del catalogo cuando todavia no hay propuesta, y el
// negociado cuando ya la hay. La diferencia entre los dos es justo lo que el
// gerente mira en el embudo.
const CASOS: Sembrado[] = [
  // --- Leads asignados: nadie les ha escrito todavia ---
  { telefono: "50370030001", nombre: "Karla Menjívar", modelo: "kicks", monto: 25000, canal: "instagram", entro: 1 },
  { telefono: "50370030002", nombre: "Douglas Peña", modelo: "frontier-dc", monto: 40000, canal: "facebook", entro: 6 },
  { telefono: "50370030003", nombre: "Ingrid Solórzano", modelo: "xtrail-epower", monto: 22000, canal: "whatsapp", entro: 30 },
  { telefono: "50370030004", nombre: "Nelson Argueta", modelo: "qashqai", monto: 30000, canal: "instagram", entro: 2 },

  // --- Contactados, sin cotizacion ---
  { telefono: "50370030005", nombre: "Yesenia Portillo", modelo: "kicks", monto: 25000, canal: "facebook", entro: 20, contactado: 19, tomado: 19 },
  { telefono: "50370030006", nombre: "Mario Escobar", modelo: "frontier-cs", monto: 35000, canal: "sala", entro: 26, contactado: 24, tomado: 24 },
  { telefono: "50370030007", nombre: "Blanca Hernández", modelo: "pathfinder", monto: 40000, canal: "whatsapp", entro: 9, contactado: 8, tomado: 8 },

  // --- Sin respuesta: se le hablo y lleva dias en silencio ---
  { telefono: "50370030008", nombre: "Ever Ramírez", modelo: "urvan", monto: 30000, canal: "facebook", entro: 150, contactado: 148, tomado: 148, actualizado: 120 },
  { telefono: "50370030009", nombre: "Rina Castellanos", modelo: "kicks", monto: 25000, canal: "instagram", entro: 190, contactado: 188, tomado: 188, actualizado: 170 },

  // --- Con cotizacion ---
  {
    telefono: "50370030010",
    nombre: "Marielos Cañas",
    modelo: "qashqai",
    monto: 30000,
    canal: "whatsapp",
    entro: 40,
    contactado: 39,
    tomado: 39,
    pasos: [{ id: "cotizacion", estado: "hecho", hace: 38 }],
    actualizado: 10,
  },
  {
    telefono: "50370030011",
    nombre: "Óscar Melgar",
    modelo: "frontier-dc",
    monto: 40000,
    canal: "sala",
    entro: 60,
    contactado: 59,
    tomado: 59,
    pasos: [{ id: "cotizacion", estado: "hecho", hace: 58 }],
    actualizado: 30,
  },
  {
    telefono: "50370030012",
    nombre: "Silvia Amaya",
    modelo: "xtrail",
    monto: 35000,
    canal: "instagram",
    entro: 130,
    contactado: 129,
    tomado: 129,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 128 },
      { id: "prueba", estado: "trabado", hace: 100, motivo: "tiempo", nota: "Viaja y vuelve hasta fin de mes." },
    ],
    actualizado: 100,
  },
  {
    telefono: "50370030013",
    nombre: "Jorge Bonilla",
    modelo: "kicks",
    monto: 25000,
    canal: "facebook",
    entro: 170,
    contactado: 169,
    tomado: 169,
    pasos: [{ id: "cotizacion", estado: "hecho", hace: 168 }],
    actualizado: 165,
  },
  {
    telefono: "50370030014",
    nombre: "Lorena Ayala",
    modelo: "xtrail-epower",
    monto: 22000,
    canal: "whatsapp",
    entro: 210,
    contactado: 209,
    tomado: 209,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 208 },
      { id: "usado", estado: "hecho", hace: 200, nota: "Sentra 2019, se le valuó en $9,500." },
    ],
    actualizado: 190,
  },

  // --- Prueba de manejo ---
  {
    telefono: "50370030015",
    nombre: "Ernesto Batres",
    modelo: "frontier-cs",
    monto: 35000,
    canal: "whatsapp",
    entro: 50,
    contactado: 49,
    tomado: 49,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 48 },
      { id: "prueba", estado: "agendado", hace: 20, cita: 26, nota: "Sábado 10 am, sucursal Autopista Sur." },
    ],
    actualizado: 20,
  },
  {
    telefono: "50370030016",
    nombre: "Patricia Aguilar",
    modelo: "xtrail",
    monto: 35000,
    canal: "instagram",
    entro: 70,
    contactado: 69,
    tomado: 69,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 68 },
      { id: "prueba", estado: "agendado", hace: 12, cita: 48, nota: "Quiere probarla con los niños en los asientos." },
    ],
    actualizado: 12,
  },
  {
    // La cita que ya paso y nadie marco. Es la fuga que el tablero destapa.
    telefono: "50370030017",
    nombre: "Wilber Chávez",
    modelo: "kicks",
    monto: 25000,
    canal: "facebook",
    entro: 120,
    contactado: 119,
    tomado: 119,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 118 },
      { id: "prueba", estado: "agendado", hace: 80, cita: -30 },
    ],
    actualizado: 80,
  },
  {
    telefono: "50370030018",
    nombre: "Claudia Interiano",
    modelo: "qashqai",
    monto: 30000,
    canal: "sala",
    entro: 46,
    contactado: 45,
    tomado: 45,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 44 },
      { id: "prueba", estado: "hecho", hace: 8 },
    ],
    actualizado: 8,
  },

  // --- Negociacion: ya hay propuesta en firme ---
  {
    telefono: "50370030019",
    nombre: "Rocío Zelaya",
    modelo: "frontier-dc",
    monto: 38200,
    canal: "whatsapp",
    entro: 90,
    contactado: 89,
    tomado: 89,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 88 },
      { id: "prueba", estado: "hecho", hace: 60 },
      { id: "propuesta", estado: "hecho", hace: 20, nota: "Descuento de empleado, 84 meses." },
    ],
    actualizado: 20,
  },
  {
    telefono: "50370030020",
    nombre: "Luis Menéndez",
    modelo: "xtrail-epower",
    monto: 21200,
    canal: "instagram",
    entro: 110,
    contactado: 109,
    tomado: 109,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 108 },
      { id: "prueba", estado: "hecho", hace: 90 },
      { id: "usado", estado: "hecho", hace: 80, nota: "Versa 2017, $7,800." },
      { id: "propuesta", estado: "hecho", hace: 72 },
      { id: "separacion", estado: "trabado", hace: 70, motivo: "cuota", nota: "Quiere quedar debajo de $380 al mes." },
    ],
    actualizado: 70,
  },
  {
    telefono: "50370030021",
    nombre: "Diego Salazar",
    modelo: "pathfinder",
    monto: 39000,
    canal: "sala",
    entro: 140,
    contactado: 139,
    tomado: 139,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 138 },
      { id: "prueba", estado: "hecho", hace: 120 },
      { id: "propuesta", estado: "hecho", hace: 102 },
      { id: "separacion", estado: "trabado", hace: 100, motivo: "inventario", nota: "La quiere gris y la gris entra hasta el otro mes." },
    ],
    actualizado: 100,
  },
  {
    telefono: "50370030022",
    nombre: "Gabriela Portillo",
    modelo: "kicks",
    monto: 24300,
    canal: "facebook",
    entro: 36,
    contactado: 35,
    tomado: 35,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 34 },
      { id: "prueba", estado: "hecho", hace: 16 },
      { id: "propuesta", estado: "hecho", hace: 4 },
    ],
    actualizado: 4,
  },

  // --- Unidad separada, esperando entrega ---
  {
    telefono: "50370030023",
    nombre: "Fátima Rodríguez",
    modelo: "xtrail",
    monto: 34100,
    canal: "whatsapp",
    entro: 220,
    contactado: 219,
    tomado: 219,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 218 },
      { id: "prueba", estado: "hecho", hace: 200 },
      { id: "propuesta", estado: "hecho", hace: 180 },
      { id: "separacion", estado: "hecho", hace: 50, nota: "Prima de $6,800." },
      { id: "entrega", estado: "agendado", hace: 40, cita: 30, nota: "Viernes 3 pm, con entrega de llaves." },
    ],
    actualizado: 40,
  },
  {
    telefono: "50370030024",
    nombre: "Josué Amaya",
    modelo: "urvan",
    monto: 29500,
    canal: "sala",
    entro: 260,
    contactado: 259,
    tomado: 259,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 258 },
      { id: "propuesta", estado: "hecho", hace: 200 },
      { id: "separacion", estado: "hecho", hace: 96, nota: "Depósito de la empresa, factura a nombre de la sociedad." },
    ],
    actualizado: 96,
  },

  // --- Entregados ---
  {
    telefono: "50370030025",
    nombre: "Ana Beatriz Cruz",
    modelo: "kicks",
    monto: 24800,
    canal: "instagram",
    entro: 300,
    contactado: 299,
    tomado: 299,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 298 },
      { id: "prueba", estado: "hecho", hace: 280 },
      { id: "propuesta", estado: "hecho", hace: 260 },
      { id: "separacion", estado: "hecho", hace: 200 },
      { id: "entrega", estado: "hecho", hace: 30 },
    ],
    cerrado: 30,
    resultado: "venta",
    actualizado: 30,
  },
  {
    telefono: "50370030026",
    nombre: "Héctor Villalta",
    modelo: "frontier-dc",
    monto: 39400,
    canal: "whatsapp",
    entro: 340,
    contactado: 339,
    tomado: 339,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 338 },
      { id: "prueba", estado: "hecho", hace: 320 },
      { id: "usado", estado: "hecho", hace: 310, nota: "Hilux 2015 a cuenta, $14,000." },
      { id: "propuesta", estado: "hecho", hace: 300 },
      { id: "separacion", estado: "hecho", hace: 240 },
      { id: "entrega", estado: "hecho", hace: 80 },
    ],
    cerrado: 80,
    resultado: "venta",
    actualizado: 80,
  },
  {
    telefono: "50370030027",
    nombre: "Verónica Sandoval",
    modelo: "qashqai",
    monto: 29600,
    canal: "facebook",
    entro: 400,
    contactado: 399,
    tomado: 399,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 398 },
      { id: "prueba", estado: "hecho", hace: 380 },
      { id: "propuesta", estado: "hecho", hace: 360 },
      { id: "separacion", estado: "hecho", hace: 300 },
      { id: "entrega", estado: "hecho", hace: 130 },
    ],
    cerrado: 130,
    resultado: "venta",
    actualizado: 130,
  },
  {
    telefono: "50370030028",
    nombre: "Rodrigo Escalante",
    modelo: "xtrail-epower",
    monto: 21800,
    canal: "sala",
    entro: 260,
    contactado: 259,
    tomado: 259,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 258 },
      { id: "prueba", estado: "hecho", hace: 240 },
      { id: "propuesta", estado: "hecho", hace: 220 },
      { id: "separacion", estado: "hecho", hace: 190 },
      { id: "entrega", estado: "hecho", hace: 6 },
    ],
    cerrado: 6,
    resultado: "venta",
    actualizado: 6,
  },

  // --- Perdidos ---
  {
    telefono: "50370030029",
    nombre: "Marvin Cordero",
    modelo: "frontier-cs",
    monto: 35000,
    canal: "facebook",
    entro: 320,
    contactado: 319,
    tomado: 319,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 318 },
      { id: "prueba", estado: "hecho", hace: 300 },
      { id: "propuesta", estado: "hecho", hace: 282 },
      { id: "separacion", estado: "trabado", hace: 280, motivo: "competencia" },
    ],
    cerrado: 120,
    resultado: "perdido",
    motivoCierre: "Compró en otra marca por entrega inmediata",
    actualizado: 120,
  },
  {
    telefono: "50370030030",
    nombre: "Sonia Mejía",
    modelo: "kicks",
    monto: 25000,
    canal: "instagram",
    entro: 280,
    contactado: 279,
    tomado: 279,
    pasos: [
      { id: "cotizacion", estado: "hecho", hace: 278 },
      { id: "propuesta", estado: "hecho", hace: 242 },
      { id: "separacion", estado: "trabado", hace: 240, motivo: "credito" },
    ],
    cerrado: 90,
    resultado: "perdido",
    motivoCierre: "No le aprobaron el financiamiento",
    actualizado: 90,
  },
  {
    telefono: "50370030031",
    nombre: "Raúl Guzmán",
    modelo: "pathfinder",
    monto: 40000,
    canal: "whatsapp",
    entro: 240,
    contactado: 239,
    tomado: 239,
    pasos: [{ id: "cotizacion", estado: "hecho", hace: 238 }],
    cerrado: 60,
    resultado: "perdido",
    motivoCierre: "Se salió del presupuesto",
    actualizado: 60,
  },
];

/**
 * A quien le toca cada caso sembrado.
 *
 * NO es una rotacion pareja. Con "uno para cada quien, en orden" las cuatro
 * filas del reporte del equipo salian identicas (mismos activos, misma venta,
 * misma tasa de cierre), y una tabla asi se ve a leguas como dato inventado.
 * Estos numeros son indices del equipo, y estan desbalanceados a proposito.
 */
const REPARTO = [0, 1, 2, 0, 3, 1, 0, 2, 1, 0, 3, 2, 0, 1, 0, 2, 3, 1, 0, 1, 2, 0, 3, 0, 1, 2, 0, 3, 1, 0, 2];

/** Los telefonos del demo, para no tocar nunca un lead de una persona real. */
const DEL_DEMO = new Set(CASOS.map((c) => c.telefono));

/** El Salvador no mueve el reloj en todo el ano, asi que el desfase es fijo. */
const SV = -6 * HORA;

/**
 * Deja la cita en hora de sala de ventas.
 *
 * Sin esto, una prueba de manejo sembrada "dentro de 26 horas" cae a las 11 de
 * la noche, y en un demo eso se nota antes que cualquier otra cosa. Se corre al
 * dia siguiente (o al anterior, si la cita ya tenia que haber pasado) para que
 * siga estando del lado correcto de ahora.
 */
function enHoraDeSala(ts: number, hora: number, futura: boolean): string {
  const reloj = new Date(ts + SV);
  reloj.setUTCHours(hora, 0, 0, 0);
  let cita = reloj.getTime() - SV;
  if (futura && cita <= Date.now()) cita += 24 * HORA;
  if (!futura && cita >= Date.now()) cita -= 24 * HORA;
  return new Date(cita).toISOString();
}

function aOportunidad(tenant: string, c: Sembrado, ahora: number, vendedor?: string): Oportunidad {
  const hace = (h?: number): string | null => (h == null ? null : new Date(ahora - h * HORA).toISOString());
  // Las de la manana y las de la tarde se van alternando, que es como se llena
  // una agenda de verdad.
  const enCita = (h?: number): string | null =>
    h == null ? null : enHoraDeSala(ahora + h * HORA, h % 2 === 0 ? 10 : 15, h > 0);

  const pasos: Pasos = {};
  for (const p of c.pasos ?? []) {
    pasos[p.id] = {
      estado: p.estado,
      motivo: p.motivo ?? null,
      nota: p.nota ?? null,
      fecha: p.estado === "agendado" ? enCita(p.cita) : null,
      ts: hace(p.hace) ?? hace(c.entro),
      por: vendedor ?? "sistema",
    };
  }

  const cotizacion = (c.pasos ?? []).find((p) => p.id === "cotizacion" && p.estado === "hecho");
  const separacion = (c.pasos ?? []).find((p) => p.id === "separacion" && p.estado === "hecho");
  const ultimo = c.actualizado ?? c.cerrado ?? Math.min(...[c.entro, c.contactado ?? c.entro, ...(c.pasos ?? []).map((p) => p.hace ?? c.entro)]);

  return {
    tenant,
    telefono: c.telefono,
    nombre: c.nombre,
    modelo: c.modelo,
    pasos,
    vendedor: vendedor ?? null,
    creado: hace(c.entro) as string,
    contactado: hace(c.contactado),
    cotizado: hace(cotizacion?.hace),
    separado: hace(separacion?.hace),
    // El lead se reparte al entrar: el reloj de la alerta corre desde ahi.
    asignado: vendedor ? (hace(c.entro) as string) : null,
    tomado: hace(c.tomado),
    cerrado: hace(c.cerrado),
    resultado: c.resultado ?? null,
    motivoCierre: c.motivoCierre ?? null,
    avisado: null,
    escalado: null,
    monto: c.monto ?? null,
    canal: c.canal ?? null,
    actualizado: hace(ultimo) as string,
  };
}

/** Cada cuanto se vuelve a poner al dia el demo. */
const FRESCURA = 20 * HORA;

function correr(iso: string | null | undefined, delta: number): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : new Date(t + delta).toISOString();
}

/**
 * Le suma `delta` a TODAS las fechas del caso, incluidas las de cada paso y las
 * de las citas.
 *
 * Se mueve todo por igual: las distancias entre fechas son lo que hace que las
 * alertas de 4 y 24 horas signifiquen algo, y una prueba de manejo agendada
 * para el sabado tiene que seguir cayendo despues de hoy.
 */
function correrFechas(o: Oportunidad, delta: number): Oportunidad {
  const pasos: Pasos = {};
  for (const [id, p] of Object.entries(o.pasos ?? {})) {
    pasos[id] = { ...p, ts: correr(p.ts, delta), fecha: correr(p.fecha, delta) };
  }
  return {
    ...o,
    pasos,
    creado: correr(o.creado, delta) ?? o.creado,
    contactado: correr(o.contactado, delta),
    cotizado: correr(o.cotizado, delta),
    separado: correr(o.separado, delta),
    asignado: correr(o.asignado, delta),
    tomado: correr(o.tomado, delta),
    cerrado: correr(o.cerrado, delta),
    avisado: correr(o.avisado, delta),
    escalado: correr(o.escalado, delta),
    actualizado: correr(o.actualizado, delta) ?? o.actualizado,
  };
}

/**
 * Pone al dia lo ya sembrado.
 *
 * El sembrado corre UNA vez, y las fechas son relativas al dia en que corrio:
 * a la semana siguiente el tablero amanece sin movimiento, las ventanas de 7
 * dias salen vacias y las pruebas de manejo "agendadas" quedan todas en el
 * pasado. Aca se corren todas las fechas el mismo tanto, asi que el demo
 * amanece al dia sin perder ni el orden ni las distancias.
 */
async function ponerAlDia(existentes: Oportunidad[]): Promise<number> {
  const delDemo = existentes.filter((o) => DEL_DEMO.has(o.telefono));
  if (delDemo.length === 0) return 0;
  // La referencia es `creado`: es la unica fecha que nadie mueve desde la
  // pantalla, asi que dice de verdad que tan viejo esta el demo.
  const masNuevo = Math.max(...delDemo.map((o) => Date.parse(o.creado) || 0));
  const atraso = Date.now() - masNuevo;
  if (atraso <= FRESCURA) return 0;

  for (const o of delDemo) await guardarOportunidad(correrFechas(o, atraso));
  return delDemo.length;
}

/**
 * Llena el tablero la primera vez. Devuelve cuantos casos sembro; 0 si el
 * cliente ya tenia los suyos (nunca pisa datos reales).
 */
export async function sembrarAutosSiVacio(tenant: string): Promise<number> {
  const equipo = vendedoresDe(tenant);
  if (equipo.length === 0) return 0;

  const existentes = await listarOportunidades(tenant);
  if (existentes.length > 0) {
    await ponerAlDia(existentes);
    return 0;
  }

  const ahora = Date.now();
  for (const [i, c] of CASOS.entries()) {
    const o = aOportunidad(tenant, c, ahora, equipo[REPARTO[i % REPARTO.length] % equipo.length]?.id);
    await guardarOportunidad(o);
    await upsertContacto({
      from: c.telefono,
      nombre: c.nombre.split(" ")[0],
      apellido: c.nombre.split(" ").slice(1).join(" "),
      notas: `Viendo ${nombreDeModelo(c.modelo)}`,
      tenant,
    });
    await registrarEvento(tenant, c.telefono, "creado", "sistema", "sembrado");
  }
  return CASOS.length;
}
