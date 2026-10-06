// El estado de cada propuesta = su base (muestra o real) + lo que la gente
// hizo encima (movimientos). Puro.
//
// Los movimientos se guardan aparte y en orden, para la muestra y para las
// reales por igual: mover de etapa una propuesta de muestra persiste igual que
// mover una real, y la muestra se puede regenerar cada día sin perderlos.

import type { Etapa, Movimiento, Propuesta } from "./tipos";
import { asesorDe, esEtapa } from "./catalogo";
import { datosVacios, normalizarDatos } from "./contrato";

const CAMPOS = new Set(Object.keys(datosVacios()));

const DESPUES_DEL_CONTACTO: Etapa[] = ["contactado", "negociacion", "confirmada"];

export function aplicarMovimientos(base: Propuesta[], movimientos: Movimiento[]): Propuesta[] {
  const porId = new Map<string, Movimiento[]>();
  for (const m of movimientos) {
    const xs = porId.get(m.propuestaId) ?? [];
    xs.push(m);
    porId.set(m.propuestaId, xs);
  }
  return base.map((p) => {
    const ms = porId.get(p.id);
    if (!ms?.length) return p;
    return ms.sort((a, b) => a.ts.localeCompare(b.ts)).reduce(aplicar, {
      ...p,
      historial: [...p.historial],
      notasInternas: [...p.notasInternas],
    });
  });
}

function aplicar(p: Propuesta, m: Movimiento): Propuesta {
  switch (m.tipo) {
    case "etapa": {
      const a = m.valor.a;
      if (!esEtapa(a) || a === p.etapa) return p;
      const motivo = typeof m.valor.motivo === "string" && m.valor.motivo.trim() ? m.valor.motivo.trim() : undefined;
      return {
        ...p,
        etapa: a,
        motivoDescarte: a === "descartada" ? motivo : undefined,
        primerContacto: p.primerContacto ?? (DESPUES_DEL_CONTACTO.includes(a) ? m.ts : null),
        historial: [...p.historial, { ts: m.ts, de: p.etapa, a, actor: m.actor, motivo: a === "descartada" ? motivo : undefined }],
      };
    }
    case "nota": {
      const texto = typeof m.valor.texto === "string" ? m.valor.texto.trim() : "";
      if (!texto) return p;
      return { ...p, notasInternas: [...p.notasInternas, { id: m.id, ts: m.ts, autor: m.actor, texto }] };
    }
    case "asesor": {
      const id = m.valor.asesorId;
      return typeof id === "string" && asesorDe(id) ? { ...p, asesorId: id } : p;
    }
    case "contactado":
      return p.primerContacto ? p : { ...p, primerContacto: m.ts };
    case "dato": {
      // El asesor completa lo que faltaba. Pasa por el mismo normalizador que
      // la llamada, así un dato escrito a mano queda igual que uno de Daniela.
      const campo = m.valor.campo;
      if (typeof campo !== "string" || !CAMPOS.has(campo)) return p;
      return { ...p, datos: normalizarDatos({ ...p.datos, [campo]: m.valor.valor }) };
    }
    default:
      return p;
  }
}

/** Valida lo que llega de la pantalla antes de guardarlo. null = no vale. */
export function validarMovimiento(
  tipo: unknown,
  valor: unknown,
): { tipo: Movimiento["tipo"]; valor: Record<string, unknown> } | null {
  const v = (valor && typeof valor === "object" ? valor : {}) as Record<string, unknown>;
  if (tipo === "etapa") {
    if (!esEtapa(v.a)) return null;
    const motivo = typeof v.motivo === "string" ? v.motivo.trim().slice(0, 300) : "";
    if (v.a === "descartada" && !motivo) return null;
    return { tipo, valor: { a: v.a, ...(motivo ? { motivo } : {}) } };
  }
  if (tipo === "nota") {
    const texto = typeof v.texto === "string" ? v.texto.trim().slice(0, 2000) : "";
    return texto ? { tipo, valor: { texto } } : null;
  }
  if (tipo === "asesor") {
    return typeof v.asesorId === "string" && asesorDe(v.asesorId) ? { tipo, valor: { asesorId: v.asesorId } } : null;
  }
  if (tipo === "contactado") return { tipo, valor: {} };
  if (tipo === "dato") {
    if (typeof v.campo !== "string" || !CAMPOS.has(v.campo)) return null;
    const x = v.valor;
    if (typeof x === "string") return { tipo, valor: { campo: v.campo, valor: x.trim().slice(0, 300) } };
    if (typeof x === "number" && Number.isFinite(x)) return { tipo, valor: { campo: v.campo, valor: x } };
    if (typeof x === "boolean") return { tipo, valor: { campo: v.campo, valor: x } };
    return null;
  }
  return null;
}
