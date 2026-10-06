// Las cifras del tablero de Pizza Hut. Puro: recibe propuestas, llamadas y
// "ahora", devuelve lo que pinta el Dashboard.

import type { Etapa, LlamadaEvento, Propuesta, TipoEvento } from "./tipos";
import { ETAPAS, HORARIO_OFICINA, TIPOS_EVENTO, nombreTipo } from "./catalogo";
import { diaSV, diaSemanaSV, horaSV, sumarDias } from "./fechas";

const DIA_MS = 86_400_000;

/** Fuera del horario del equipo: de noche, de madrugada o en fin de semana. */
export function fueraDeHorario(iso: string): boolean {
  const h = horaSV(iso);
  const d = diaSemanaSV(iso);
  return !HORARIO_OFICINA.dias.includes(d) || h < HORARIO_OFICINA.desde || h >= HORARIO_OFICINA.hasta;
}

export interface Actividad {
  ts: string;
  texto: string;
  detalle?: string;
  real: boolean;
  propuestaId?: string;
  tipo: "propuesta" | "etapa" | "nota" | "llamada";
}

export interface ResumenTablero {
  llamadas: number;
  llamadasFuera: number;
  llamadasPropuesta: number;
  propuestasNuevas: number;
  aforoCartera: number;
  eventosCartera: number;
  tasaPropuesta: number; // 0..1
  confirmadasMes: number;
  horasPrimerContacto: number | null;
  porDia: { dia: string; total: number; propuestas: number }[];
  porTipo: { tipo: TipoEvento; nombre: string; n: number }[];
  embudo: { etapa: Etapa; nombre: string; color: string; n: number; aforo: number }[];
  porHora: { hora: number; total: number; fuera: number }[];
  proximos: Propuesta[];
  actividad: Actividad[];
}

export function resumirTablero(propuestas: Propuesta[], llamadas: LlamadaEvento[], ahora: number = Date.now()): ResumenTablero {
  const hoy = diaSV(ahora);
  const hace30 = ahora - 30 * DIA_MS;
  const desde = sumarDias(hoy, -29);
  const recientes = llamadas.filter((l) => {
    const t = Date.parse(l.inicio);
    return t >= hace30 && t <= ahora;
  });

  const llamadasPropuesta = recientes.filter((l) => l.esPropuesta).length;
  const enCartera = propuestas.filter(
    (p) => p.etapa !== "descartada" && (!p.datos.fecha_inicio || (p.datos.fecha_fin || p.datos.fecha_inicio) >= hoy),
  );

  // Confirmadas este mes: las que pasaron a "Confirmada" en el mes en curso.
  const mes = hoy.slice(0, 7);
  const confirmadasMes = propuestas.filter((p) =>
    p.historial.some((h) => h.a === "confirmada" && diaSV(h.ts).slice(0, 7) === mes),
  ).length;

  const tiempos = propuestas
    .filter((p) => p.primerContacto && Date.parse(p.creada) >= hace30)
    .map((p) => (Date.parse(p.primerContacto as string) - Date.parse(p.creada)) / 3_600_000)
    .filter((h) => h >= 0);
  const horasPrimerContacto = tiempos.length ? Math.round((tiempos.reduce((a, b) => a + b, 0) / tiempos.length) * 10) / 10 : null;

  const porDia = Array.from({ length: 30 }, (_, i) => ({ dia: sumarDias(desde, i), total: 0, propuestas: 0 }));
  const indice = new Map(porDia.map((d, i) => [d.dia, i]));
  for (const l of recientes) {
    const i = indice.get(diaSV(l.inicio));
    if (i === undefined) continue;
    porDia[i].total++;
    if (l.esPropuesta) porDia[i].propuestas++;
  }

  const porHora = Array.from({ length: 24 }, (_, hora) => ({ hora, total: 0, fuera: 0 }));
  for (const l of recientes) {
    const h = porHora[horaSV(l.inicio)];
    h.total++;
    if (fueraDeHorario(l.inicio)) h.fuera++;
  }

  const porTipo = TIPOS_EVENTO.map((t) => ({
    tipo: t.id,
    nombre: nombreTipo(t.id),
    n: propuestas.filter((p) => p.datos.tipo_evento === t.id && Date.parse(p.creada) >= ahora - 90 * DIA_MS).length,
  }))
    .filter((t) => t.n > 0)
    .sort((a, b) => b.n - a.n);

  const embudo = ETAPAS.map((e) => {
    const xs = propuestas.filter((p) => p.etapa === e.id && (e.id === "descartada" || !p.datos.fecha_inicio || (p.datos.fecha_fin || p.datos.fecha_inicio) >= hoy));
    return { etapa: e.id, nombre: e.nombre, color: e.color, n: xs.length, aforo: xs.reduce((n, p) => n + p.datos.aforo_esperado, 0) };
  });

  const proximos = enCartera
    .filter((p) => p.datos.fecha_inicio)
    .sort((a, b) => a.datos.fecha_inicio.localeCompare(b.datos.fecha_inicio))
    .slice(0, 6);

  const actividad: Actividad[] = [];
  for (const p of propuestas) {
    const nombre = p.datos.nombre_evento || "Evento sin nombre";
    const real = p.origen === "real";
    actividad.push({
      ts: p.creada,
      texto: `Nueva propuesta: ${nombre}`,
      detalle: [p.datos.recinto, p.datos.aforo_esperado ? `${p.datos.aforo_esperado.toLocaleString("en-US")} personas` : ""].filter(Boolean).join(" · "),
      real,
      propuestaId: p.id,
      tipo: "propuesta",
    });
    for (const h of p.historial) {
      if (h.a === "nueva") continue;
      const etapa = ETAPAS.find((e) => e.id === h.a)?.nombre ?? h.a;
      actividad.push({
        ts: h.ts,
        texto: `${nombre} pasó a ${etapa}`,
        detalle: h.motivo,
        real,
        propuestaId: p.id,
        tipo: "etapa",
      });
    }
  }
  for (const l of recientes) {
    if (l.esPropuesta || l.origen !== "real") continue;
    actividad.push({ ts: l.fin, texto: "Llamada atendida por Daniela", detalle: l.resumen, real: true, tipo: "llamada" });
  }
  actividad.sort((a, b) => b.ts.localeCompare(a.ts));

  return {
    llamadas: recientes.length,
    llamadasFuera: recientes.filter((l) => fueraDeHorario(l.inicio)).length,
    llamadasPropuesta,
    propuestasNuevas: propuestas.filter((p) => Date.parse(p.creada) >= hace30).length,
    aforoCartera: enCartera.reduce((n, p) => n + p.datos.aforo_esperado, 0),
    eventosCartera: enCartera.length,
    tasaPropuesta: recientes.length ? llamadasPropuesta / recientes.length : 0,
    confirmadasMes,
    horasPrimerContacto,
    porDia,
    porTipo,
    embudo,
    porHora,
    proximos,
    actividad: actividad.filter((a) => Date.parse(a.ts) <= ahora).slice(0, 14),
  };
}
