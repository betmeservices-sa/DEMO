// Etiquetas de empaque: una por entrega (un día de un paquete), 2 × 5 en
// hoja carta. Llevan paciente, entrega, platos y las alergias en rojo para
// que nadie en cocina ni en reparto las pase por alto.

import { ALERGENOS, enCocina, plato } from "./cocina";
import { etiquetaDia, PLAN_INFO } from "./format";
import { cliente } from "./seed";
import type { DiaOrden, Orden, PlanAlimentacion } from "./types";

/** Una entrega: el paquete y el día que se empaca. */
export type Entrega = { o: Orden; d: DiaOrden };

const ROJO: [number, number, number] = [190, 18, 60];
const GRIS: [number, number, number] = [92, 106, 122];
const TEXTO: [number, number, number] = [22, 32, 44];
const NARANJA: [number, number, number] = [194, 65, 12];

export async function etiquetasPdf(entregas: Entrega[], planes: PlanAlimentacion[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const M = 10;
  const W = (ancho - M * 3) / 2;
  const H = 50;
  entregas.forEach(({ o, d }, i) => {
    const pos = i % 10;
    if (i > 0 && pos === 0) doc.addPage();
    const x = M + (pos % 2) * (W + M);
    const y = M + Math.floor(pos / 2) * (H + 2);
    const c = cliente(o.clienteId);
    const p = planes.find((q) => q.clienteId === o.clienteId);
    doc.setDrawColor(...GRIS).setLineWidth(0.3).roundedRect(x, y, W, H, 2, 2);
    doc.setFillColor(...NARANJA).rect(x, y, 3, H, "F");
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...TEXTO).text(doc.splitTextToSize(c.nombre, W - 40)[0], x + 6, y + 7);
    doc.setFontSize(9).setTextColor(...NARANJA).text(`${PLAN_INFO[o.plan].label}${p ? ` · ${p.porcion}` : ""}`, x + W - 3, y + 7, { align: "right" });
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...GRIS);
    doc.text(`${etiquetaDia(d.dia)} ${d.hora} · Ruta ${o.zona}`, x + 6, y + 12);
    let yy = y + 18;
    const alergias = p?.alergias ?? c.alergias ?? [];
    if (alergias.length) {
      doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...ROJO);
      doc.text(`ALERGIA: ${alergias.map((a) => ALERGENOS[a].toUpperCase()).join(", ")}`, x + 6, yy);
      yy += 5;
    }
    doc.setFontSize(8.5);
    for (const it of d.items.filter((x) => enCocina(x.tiempo, o.plan))) {
      if (yy > y + H - 4) break;
      const nombre = plato(it.platoId).nombre + (it.ajuste ? " *" : "");
      doc.setFont("helvetica", "bold").setTextColor(...TEXTO).text(`${it.tiempo}:`, x + 6, yy);
      doc.setFont("helvetica", "normal").text(doc.splitTextToSize(nombre, W - 34)[0], x + 28, yy);
      yy += 4.3;
    }
    // Pie: el primer ajuste escrito por la nutricionista, o lo que no le gusta.
    const ajuste = d.items.find((it) => enCocina(it.tiempo, o.plan) && it.ajuste)?.ajuste;
    const pie = ajuste ? `* ${ajuste}` : p?.noLeGusta.length ? `Sin: ${p.noLeGusta.join(", ")}` : "";
    if (pie && yy <= y + H - 3) {
      doc.setFont("helvetica", "italic").setFontSize(7.5).setTextColor(...(ajuste ? ROJO : GRIS)).text(doc.splitTextToSize(pie, W - 10)[0], x + 6, y + H - 3);
    }
  });
  return doc;
}

export async function descargarEtiquetas(entregas: Entrega[], planes: PlanAlimentacion[], nombre = "Etiquetas_cocina.pdf") {
  const doc = await etiquetasPdf(entregas, planes);
  doc.save(nombre);
}
