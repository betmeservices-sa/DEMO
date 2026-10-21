// Las cifras de IA Performance de un hotel de muestra.
//
// En Yali salen de la base (los mensajes de WhatsApp, Messenger e Instagram y
// el análisis nocturno de cada conversación). Acá se inventan día por día con
// el mismo azar repetible del libro: el sábado escribe más gente que el
// martes, y las mismas fechas dan siempre las mismas barras.

import type { HotelMuestra } from "./tipos";
import { azar, diaMes, esDiaFinde, sumarDias } from "./fechas";
import type { ReservaMuestra } from "./tipos";

export interface DiaMensajes {
  dia: string;
  etiqueta: string;
  whatsapp: number;
  facebook: number;
  instagram: number;
}

export interface CifrasIa {
  dias: number;
  conversaciones: number;
  abiertas: number;
  sinAsignar: number;
  resueltas: number;
  resueltasPct: number;
  mensajes: number;
  personas: number;
  respuestas: number;
  delAgente: number;
  delEquipo: number;
  sinResponder: number;
  porCanal: { whatsapp: number; facebook: number; instagram: number };
  serie: DiaMensajes[];
  temas: { tema: string; conversaciones: number }[];
  fechas: { dia: string; conversaciones: number }[];
  conFechaPedida: number;
  personasEnFechas: number;
}

/**
 * La ventana termina HOY, y hoy va a medias: a las 9 de la mañana todavía no
 * escribió casi nadie. Por eso la última barra es corta, igual que en el
 * tablero real.
 */
export function cifrasIa(hotel: HotelMuestra, hoy: string, dias: number, horaDelDia: number, libro: ReservaMuestra[]): CifrasIa {
  const serie: DiaMensajes[] = [];
  let conversaciones = 0;
  for (let i = dias - 1; i >= 0; i--) {
    const dia = sumarDias(hoy, -i);
    const avance = i === 0 ? Math.min(1, Math.max(0.08, (horaDelDia - 6) / 15)) : 1;
    const base = hotel.conversacionesDia * (esDiaFinde(dia) ? 1.35 : 1) * (0.8 + azar(hotel.tenant, dia, "conv") * 0.45);
    const conv = Math.max(1, Math.round(base * avance));
    conversaciones += conv;
    // Cada conversación trae unos 4 o 5 mensajes de la persona.
    const msgs = Math.round(conv * (4.2 + azar(hotel.tenant, dia, "msg") * 1.2));
    const wa = Math.round(msgs * (0.55 + azar(hotel.tenant, dia, "wa") * 0.1));
    const ig = Math.round(msgs * (0.25 + azar(hotel.tenant, dia, "ig") * 0.08));
    serie.push({ dia, etiqueta: diaMes(dia), whatsapp: wa, instagram: ig, facebook: Math.max(0, msgs - wa - ig) });
  }

  const porCanal = serie.reduce(
    (s, d) => ({ whatsapp: s.whatsapp + d.whatsapp, facebook: s.facebook + d.facebook, instagram: s.instagram + d.instagram }),
    { whatsapp: 0, facebook: 0, instagram: 0 },
  );
  const mensajes = porCanal.whatsapp + porCanal.facebook + porCanal.instagram;
  const abiertas = Math.max(3, Math.round(conversaciones * (dias === 1 ? 0.35 : 0.12)));
  const sinAsignar = Math.round(abiertas * 0.4);
  const resueltas = conversaciones - abiertas;
  const respuestas = Math.round(mensajes * 0.93);
  const delAgente = Math.round(respuestas * 0.86);

  // Las fechas que piden son las del libro que viene: las noches que más se
  // llenan son las que más gente pregunta.
  const finVentana = sumarDias(hoy, 30);
  const porLlegada = new Map<string, number>();
  for (const r of libro) {
    if (r.desde < hoy || r.desde > finVentana) continue;
    porLlegada.set(r.desde, (porLlegada.get(r.desde) ?? 0) + 1);
  }
  const escala = Math.max(1, conversaciones / 60);
  const fechas = [...porLlegada.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([dia, n]) => ({ dia, conversaciones: Math.max(1, Math.round(n * escala * 0.9)) }));

  return {
    dias,
    conversaciones,
    abiertas,
    sinAsignar,
    resueltas,
    resueltasPct: conversaciones === 0 ? 0 : Math.round((resueltas / conversaciones) * 100),
    mensajes,
    personas: conversaciones,
    respuestas,
    delAgente,
    delEquipo: respuestas - delAgente,
    sinResponder: Math.min(abiertas, 2 + Math.round(azar(hotel.tenant, hoy, "sr") * 3)),
    porCanal,
    serie,
    temas: hotel.temas
      .map((t) => ({ tema: t.tema, conversaciones: Math.round(conversaciones * t.peso) }))
      .filter((t) => t.conversaciones > 0)
      .sort((a, b) => b.conversaciones - a.conversaciones),
    fechas,
    conFechaPedida: fechas.reduce((s, f) => s + f.conversaciones, 0),
    personasEnFechas: Math.round(fechas.reduce((s, f) => s + f.conversaciones, 0) * 2.6),
  };
}
