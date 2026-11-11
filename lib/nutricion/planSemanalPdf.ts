// PDF del plan alimenticio semanal en formato calendario (hoja carta
// horizontal): los días en columnas y los tiempos de comida en filas, con los
// cambios escritos por la nutricionista. jsPDF se carga solo al usarse.

import { ALERGENOS, incluido, NO_INCLUIDOS, plato, semanaTexto } from "./cocina";
import { diaCorto, PLAN_INFO, textoFecha } from "./format";
import { CLINICA, STAFF, cliente } from "./seed";
import type { Orden, PlanAlimentacion, Tiempo } from "./types";

const VERDE: [number, number, number] = [21, 128, 61];
const GRIS: [number, number, number] = [92, 106, 122];
const TEXTO: [number, number, number] = [22, 32, 44];
const MORADO: [number, number, number] = [109, 40, 217];

export const TIEMPOS: Tiempo[] = ["Desayuno", "Merienda AM", "Almuerzo", "Merienda PM", "Cena"];

export function nombreArchivo(o: Orden) {
  const c = cliente(o.clienteId);
  return `Plan_${c.nombre.split(/\s+/).slice(0, 2).join("_")}_${semanaTexto(o.semana).replace(/\s+/g, "_")}.pdf`;
}

export async function planSemanalPdf(o: Orden, p?: PlanAlimentacion) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "landscape" });
  const c = cliente(o.clienteId);
  const ancho = doc.internal.pageSize.getWidth();
  const X = 12;
  const tiempos = TIEMPOS.filter((t) => o.dias.some((d) => d.items.some((i) => i.tiempo === t)));

  // Encabezado
  doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(...VERDE).text(CLINICA.nombre, X, 15);
  doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...GRIS).text("Plan alimenticio semanal", X, 20.5);
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(...TEXTO).text(c.nombre, ancho - X, 15, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...GRIS);
  const datos = [`Plan ${PLAN_INFO[o.plan].label}`, semanaTexto(o.semana), p ? `${p.kcal} kcal · ${p.proteinaG} g proteína` : "", c.objetivo].filter(Boolean).join(" · ");
  doc.text(doc.splitTextToSize(datos, 170)[0], ancho - X, 20.5, { align: "right" });
  doc.setDrawColor(...VERDE).setLineWidth(0.7).line(X, 24, ancho - X, 24);

  // Calendario: columna de tiempos + una por día.
  const col0 = 26;
  const w = (ancho - X * 2 - col0) / o.dias.length;
  let y = 30;
  doc.setFillColor(232, 245, 236).rect(X, y, ancho - X * 2, 8, "F");
  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(...VERDE);
  o.dias.forEach((d, i) => {
    const dc = diaCorto(d.dia);
    doc.text(`${dc.nombre} ${dc.num}`, X + col0 + w * i + w / 2, y + 5.3, { align: "center" });
  });
  y += 8;
  for (const t of tiempos) {
    // Alto de la fila según la celda con más texto.
    const celdas = o.dias.map((d) => {
      const it = d.items.find((i) => i.tiempo === t);
      if (!it) return { nombre: ["—"], ajuste: [] as string[] };
      doc.setFont("helvetica", "bold").setFontSize(8.5);
      const nombre = doc.splitTextToSize(plato(it.platoId).nombre, w - 4) as string[];
      doc.setFont("helvetica", "italic").setFontSize(7.5);
      const ajuste = it.ajuste ? (doc.splitTextToSize(`* ${it.ajuste}`, w - 4) as string[]) : [];
      return { nombre, ajuste };
    });
    const alto = Math.max(12, ...celdas.map((x) => 4 + x.nombre.length * 3.6 + x.ajuste.length * 3.2));
    if (y + alto > 195) {
      doc.addPage();
      y = 15;
    }
    const merienda = t.startsWith("Merienda");
    const fuera = !incluido(t, o.plan);
    if (merienda || fuera) doc.setFillColor(246, 247, 250).rect(X, y, ancho - X * 2, alto, "F");
    doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(...(merienda || fuera ? GRIS : VERDE)).text(doc.splitTextToSize(`${t.toUpperCase()}${fuera ? " *" : ""}`, col0 - 3), X + 1.5, y + 5);
    celdas.forEach((cel, i) => {
      const cx = X + col0 + w * i + 2;
      doc.setFont("helvetica", fuera ? "italic" : "bold").setFontSize(8.5).setTextColor(...(fuera ? GRIS : TEXTO)).text(cel.nombre, cx, y + 5);
      if (cel.ajuste.length) doc.setFont("helvetica", "italic").setFontSize(7.5).setTextColor(...MORADO).text(cel.ajuste, cx, y + 5 + cel.nombre.length * 3.6);
    });
    doc.setDrawColor(223, 228, 236).setLineWidth(0.2).line(X, y + alto, ancho - X, y + alto);
    for (let i = 0; i <= o.dias.length; i++) doc.line(X + col0 + w * i, y, X + col0 + w * i, y + alto);
    y += alto;
  }

  // Pie: indicaciones y firma.
  y += 6;
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...GRIS);
  const notas = [p?.alergias.length ? `Alergias: ${p.alergias.map((a) => ALERGENOS[a].toLowerCase()).join(", ")}.` : "", p?.noLeGusta.length ? `No le gusta: ${p.noLeGusta.join(", ")}.` : "", NO_INCLUIDOS[o.plan].length ? `${NO_INCLUIDOS[o.plan].join(", ")} *: no incluido en el plan, sugerencia para preparar en casa.` : "", "* Cambio indicado por la nutricionista (en morado)."].filter(Boolean).join("  ");
  if (y < 200) doc.text(doc.splitTextToSize(notas, ancho - X * 2 - 70), X, y);
  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(...TEXTO).text(STAFF.nutricionista.nombre, ancho - X, 203, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...GRIS).text(`${STAFF.nutricionista.cargo} · ${textoFecha(0)}`, ancho - X, 207, { align: "right" });
  return doc;
}

export async function descargarPlan(o: Orden, p?: PlanAlimentacion) {
  const doc = await planSemanalPdf(o, p);
  doc.save(nombreArchivo(o));
}

/** Abre el PDF listo para imprimir (el diálogo de impresión sale solo). */
export async function imprimirPlan(o: Orden, p?: PlanAlimentacion) {
  // La pestaña se abre antes de generar el PDF para que el navegador no la bloquee.
  const w = window.open("", "_blank");
  const doc = await planSemanalPdf(o, p);
  doc.autoPrint();
  const url = String(doc.output("bloburl"));
  if (w) w.location.href = url;
  else window.open(url, "_blank");
}
