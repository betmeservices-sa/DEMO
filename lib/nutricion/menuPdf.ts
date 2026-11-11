// Arma el PDF del menú personalizado: encabezado de la agencia, datos del
// paciente, tiempos de comida, indicaciones, lista de compras y firma de la
// nutricionista. jsPDF se carga solo al usarse (no entra en el servidor).

import { CLINICA, STAFF, cliente } from "./seed";
import { isoDeTexto, PLAN_INFO } from "./format";
import type { Menu } from "./types";

const VERDE: [number, number, number] = [21, 128, 61];
const GRIS: [number, number, number] = [92, 106, 122];
const TEXTO: [number, number, number] = [22, 32, 44];

export function nombreArchivo(m: Menu) {
  const f = isoDeTexto(m.fecha).replace(/-/g, "");
  const nombre = cliente(m.clienteId).nombre.split(/\s+/).slice(0, 2).join("_");
  return `Menu_${nombre}_${f}.pdf`;
}

export async function menuPdf(m: Menu) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const cli = cliente(m.clienteId);
  const ancho = doc.internal.pageSize.getWidth();
  const X = 20;
  const W = ancho - X * 2;
  let y = 22;
  // Si lo que sigue no cabe, pasa a una página nueva.
  const espacio = (alto: number) => {
    if (y + alto <= 250) return;
    doc.addPage();
    y = 22;
  };

  // Encabezado
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(...VERDE);
  doc.text(CLINICA.nombre, X, y);
  doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...GRIS);
  doc.text(`${CLINICA.direccion} · WhatsApp 7979-0000`, X, (y += 6));
  const [a, mes, d] = isoDeTexto(m.fecha).split("-").map(Number);
  const fecha = new Date(a, mes - 1, d).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" });
  doc.setFontSize(10).text(`Fecha: ${fecha}`, ancho - X, 22, { align: "right" });
  doc.setDrawColor(...VERDE).setLineWidth(0.8).line(X, (y += 4), ancho - X, y);

  // Paciente
  y += 9;
  const dato = (label: string, valor: string, x: number) => {
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...TEXTO).text(`${label}: `, x, y);
    const w = doc.getTextWidth(`${label}: `);
    doc.setFont("helvetica", "normal").text(doc.splitTextToSize(valor, W / 2 - w - 4)[0], x + w, y);
  };
  dato("Paciente", cli.nombre, X);
  dato("Edad", `${cli.edad} años`, X + W / 2);
  y += 6;
  dato("Objetivo", cli.objetivo, X);
  dato("Teléfono", cli.telefono, X + W / 2);
  y += 6;
  dato("Plan", cli.plan ? PLAN_INFO[cli.plan.plan].label : "Menú en casa", X);
  dato("Vigencia", m.vigencia, X + W / 2);

  // Tiempos de comida
  y += 14;
  doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(...VERDE).text("Menú personalizado", X, y);
  y += 3;
  for (const it of m.items) {
    const comida = doc.splitTextToSize(it.comida, W - 38);
    const detalle = [it.porcion, it.nota].filter((t) => t.trim()).join(" · ");
    const lineas = detalle ? doc.splitTextToSize(detalle, W - 38) : [];
    const alto = 6 + comida.length * 5 + lineas.length * 4.5;
    espacio(alto + 2);
    y += 6;
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...VERDE).text(it.tiempo.toUpperCase(), X, y);
    doc.setFontSize(11.5).setTextColor(...TEXTO).text(comida, X + 38, y);
    y += comida.length * 5;
    if (lineas.length) {
      doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...GRIS).text(lineas, X + 38, y - 0.5);
      y += lineas.length * 4.5;
    }
    doc.setDrawColor(223, 228, 236).setLineWidth(0.2).line(X, y + 1, ancho - X, y + 1);
  }

  // Indicaciones
  if (m.indicaciones) {
    const lineas = doc.splitTextToSize(m.indicaciones, W - 8);
    const alto = 10 + lineas.length * 5;
    espacio(alto + 10);
    y += 9;
    doc.setFillColor(232, 245, 236).roundedRect(X, y - 5, W, alto, 2, 2, "F");
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...TEXTO).text("Indicaciones", X + 4, y + 1);
    doc.setFont("helvetica", "normal").setTextColor(...GRIS).text(lineas, X + 4, y + 7);
    y += alto;
  }

  // Lista de compras, en dos columnas
  const compras = (m.compras ?? "").split("\n").map((t) => t.trim()).filter(Boolean);
  if (compras.length) {
    const filas = Math.ceil(compras.length / 2);
    espacio(14 + filas * 5.5);
    y += 10;
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...VERDE).text("Lista de compras", X, y);
    doc.setFont("helvetica", "normal").setFontSize(10.5).setTextColor(...TEXTO);
    compras.forEach((p, i) => {
      const col = i < filas ? 0 : 1;
      doc.text(`-  ${p}`, X + col * (W / 2), y + 6 + (i % filas) * 5.5);
    });
    y += 6 + filas * 5.5;
  }

  // Firma
  espacio(30);
  const yFirma = Math.max(y + 25, 225);
  doc.setDrawColor(...GRIS).setLineWidth(0.3).line(ancho - X - 70, yFirma, ancho - X, yFirma);
  doc.setFont("helvetica", "bold").setFontSize(10.5).setTextColor(...TEXTO).text(STAFF.nutricionista.nombre, ancho - X - 35, yFirma + 5, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...GRIS).text(STAFF.nutricionista.cargo, ancho - X - 35, yFirma + 10, { align: "center" });

  doc.setFontSize(8).text(`Rutina de entrenamiento: ${STAFF.entrenador.nombre}. Ante cualquier duda sobre el menú, comuníquese con el equipo.`, ancho / 2, 262, { align: "center" });
  return doc;
}

/** Descarga el PDF del menú. */
export async function descargarMenu(m: Menu) {
  const doc = await menuPdf(m);
  doc.save(nombreArchivo(m));
}

/** Abre el PDF en una pestaña nueva para revisarlo antes de enviar. */
export async function verMenu(m: Menu) {
  // La pestaña se abre antes de generar el PDF para que el navegador no la bloquee.
  const w = window.open("", "_blank");
  const doc = await menuPdf(m);
  const url = String(doc.output("bloburl"));
  if (w) w.location.href = url;
  else window.open(url, "_blank");
}
