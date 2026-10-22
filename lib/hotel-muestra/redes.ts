// Redes y comentarios de un hotel de muestra, armados desde sus datos.
//
// Las publicaciones salen con la forma del seed de cualquier panel (Redes lee
// el seed y nada más). Los comentarios salen con la forma que devuelve
// /api/meta/comentarios, así la pantalla de Comentarios es la de siempre: lee
// de acá en vez de Meta, y responder, ocultar o dar me gusta se guarda como
// movimiento del demo.

import type { SocialPost } from "@/lib/data/types";
import type { Comentario, RedComentario } from "@/lib/meta-comentarios";
import type { HotelMuestra, Movimiento } from "./tipos";
import { sumarDias } from "./fechas";

/** Las publicaciones con su fecha en hora de El Salvador ("2026-10-20T18:30:00"). */
export function publicacionesDeMuestra(hotel: HotelMuestra, hoy: string): SocialPost[] {
  return (hotel.redes?.publicaciones ?? []).map((p) => ({
    id: p.id,
    red: p.red,
    estado: p.estado,
    texto: p.texto,
    fecha: `${sumarDias(hoy, p.enDias)}T${p.hora}:00`,
    imagenes: p.imagenes,
    engagement: p.engagement,
  }));
}

const esRedComentario = (red: string): red is RedComentario => red === "facebook" || red === "instagram";

/** La "página" de cada red, para el selector de Comentarios. */
export function paginasDeMuestra(hotel: HotelMuestra): { id: string; nombre: string }[] {
  return (hotel.redes?.cuentas ?? [])
    .filter((c) => esRedComentario(c.red))
    .map((c) => ({ id: `${hotel.tenant}-${c.red}`, nombre: c.handle }));
}

const iso = (ms: number) => new Date(ms).toISOString();

export function comentariosDeMuestra(hotel: HotelMuestra, movimientos: Movimiento[], ahora: number): Comentario[] {
  const redes = hotel.redes;
  if (!redes) return [];
  const nuestroNombre = (red: RedComentario) =>
    redes.cuentas.find((c) => c.red === red)?.handle.replace(/^@/, "") ?? hotel.tenant;

  const raices: Comentario[] = [];
  const hilos = new Map<string, Comentario[]>();
  // Los que se contestaron por privado: no dejan nada en el hilo público,
  // pero ya no están en la cola.
  const enPrivado = new Set<string>();

  for (const s of redes.comentarios) {
    const pub = redes.publicaciones.find((p) => p.id === s.publicacionId);
    if (!pub || !esRedComentario(pub.red)) continue;
    const red = pub.red;
    const comun = {
      red,
      postId: pub.id,
      postResumen: pub.texto,
      postImagen: pub.imagenes?.[0],
      pageId: `${hotel.tenant}-${red}`,
      // Solo Facebook deja dar me gusta y escribir por privado desde la API.
      puedeMeGusta: red === "facebook",
      privadoPosible: red === "facebook",
    };
    raices.push({
      ...comun,
      id: s.id,
      autor: s.autor,
      texto: s.texto,
      ts: iso(ahora - s.haceMin * 60_000),
      respuestas: 0,
      esRespuesta: false,
      respondido: false,
      oculto: Boolean(s.oculto),
      meGusta: s.meGusta ?? 0,
    });
    hilos.set(
      s.id,
      (s.respuestas ?? []).map((r, i) => ({
        ...comun,
        id: `${s.id}-r${i + 1}`,
        autor: r.nuestra ? nuestroNombre(red) : r.autor,
        texto: r.texto,
        ts: iso(ahora - r.haceMin * 60_000),
        respuestas: 0,
        esRespuesta: true,
        respondido: Boolean(r.nuestra),
        nuestro: r.nuestra || undefined,
        respuestaA: s.autor,
        padreId: s.id,
        oculto: false,
        meGusta: r.meGusta ?? 0,
      })),
    );
  }

  const buscar = (id: string): Comentario | undefined =>
    raices.find((c) => c.id === id) ?? [...hilos.values()].flat().find((c) => c.id === id);
  const cambiar = (id: string, f: (c: Comentario) => Comentario) => {
    const i = raices.findIndex((c) => c.id === id);
    if (i >= 0) {
      raices[i] = f(raices[i]);
      return;
    }
    for (const [k, lista] of hilos) {
      const j = lista.findIndex((c) => c.id === id);
      if (j >= 0) hilos.set(k, lista.map((c, n) => (n === j ? f(c) : c)));
    }
  };

  for (const m of movimientos) {
    if (m.tipo === "comentario.responder") {
      const c = buscar(m.comentarioId);
      if (!c) continue;
      const raiz = c.padreId ?? c.id;
      if (m.privado) {
        enPrivado.add(raiz);
        continue;
      }
      const padre = raices.find((x) => x.id === raiz);
      if (!padre) continue;
      const hilo = hilos.get(raiz) ?? [];
      // La muestra se arma contra el reloj de cada carga: una respuesta de
      // ayer no puede quedar ANTES de lo que contesta.
      const ultimo = Math.max(Date.parse(padre.ts), ...hilo.map((x) => Date.parse(x.ts)));
      hilos.set(raiz, [
        ...hilo,
        {
          ...padre,
          id: m.id,
          autor: nuestroNombre(padre.red),
          texto: m.texto,
          ts: iso(Math.max(Date.parse(m.ts), ultimo + 60_000)),
          respuestas: 0,
          esRespuesta: true,
          respondido: true,
          nuestro: true,
          respuestaA: padre.autor,
          padreId: raiz,
          oculto: false,
          meGusta: 0,
          meGustaNuestro: undefined,
        },
      ]);
    } else if (m.tipo === "comentario.ocultar") {
      cambiar(m.comentarioId, (c) => ({ ...c, oculto: m.oculto }));
    } else if (m.tipo === "comentario.megusta") {
      cambiar(m.comentarioId, (c) =>
        Boolean(c.meGustaNuestro) === m.valor
          ? c
          : { ...c, meGustaNuestro: m.valor, meGusta: Math.max(0, c.meGusta + (m.valor ? 1 : -1)) },
      );
    }
  }

  // Atendido = lo último que se dijo en el hilo es nuestro (la misma regla de
  // Meta): si otra persona contestó después, vuelve a la cola.
  const salida: Comentario[] = [];
  for (const c of raices.sort((a, b) => (a.ts < b.ts ? 1 : -1))) {
    const hilo = (hilos.get(c.id) ?? []).slice().sort((a, b) => (a.ts < b.ts ? -1 : 1));
    const ultimo = hilo[hilo.length - 1];
    salida.push({
      ...c,
      respuestas: hilo.length,
      respondido: enPrivado.has(c.id) || Boolean(ultimo?.nuestro),
    });
  }
  for (const c of salida.slice()) salida.push(...(hilos.get(c.id) ?? []));
  return salida;
}
