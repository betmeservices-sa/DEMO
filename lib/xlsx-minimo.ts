// Un .xlsx de verdad sin dependencias: lo justo para que Excel abra una hoja
// con una tabla. Un .xlsx es un zip con unas pocas partes XML; acá el zip va
// "stored" (sin comprimir, que el formato permite) y las celdas de texto van
// como cadenas en línea, así no hace falta tabla de cadenas compartidas.
//
// Se escribió para la tabla de paquetes del tablero de la agencia: el CSV
// "para Excel" no se veía como Excel y el usuario no lo encontraba.
//
// Puro: corre igual en el navegador (Blob) y en Node (Buffer).

export type Celda = string | number | null;

const codificador = new TextEncoder();

/** CRC-32 estándar (el del zip), tabla calculada una vez. */
const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Fecha y hora en el formato de DOS que lleva el zip (Excel no la mira). */
function fechaDos(d: Date): { hora: number; fecha: number } {
  const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const fecha = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { hora, fecha };
}

/** Un zip sin compresión con esas partes, en orden. */
export function zipSinComprimir(partes: { nombre: string; contenido: string }[], ahora = new Date()): Uint8Array {
  const { hora, fecha } = fechaDos(ahora);
  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let desplazamiento = 0;

  for (const p of partes) {
    const nombre = codificador.encode(p.nombre);
    const datos = codificador.encode(p.contenido);
    const crc = crc32(datos);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // versión necesaria
    local.setUint16(6, 0x0800, true); // nombres en UTF-8
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, hora, true);
    local.setUint16(12, fecha, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, datos.length, true);
    local.setUint32(22, datos.length, true);
    local.setUint16(26, nombre.length, true);
    local.setUint16(28, 0, true);
    locales.push(new Uint8Array(local.buffer), nombre, datos);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true); // hecho por
    central.setUint16(6, 20, true); // versión necesaria
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, 0, true);
    central.setUint16(12, hora, true);
    central.setUint16(14, fecha, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, datos.length, true);
    central.setUint32(24, datos.length, true);
    central.setUint16(28, nombre.length, true);
    central.setUint16(30, 0, true); // extra
    central.setUint16(32, 0, true); // comentario
    central.setUint16(34, 0, true); // disco
    central.setUint16(36, 0, true); // atributos internos
    central.setUint32(38, 0, true); // atributos externos
    central.setUint32(42, desplazamiento, true);
    centrales.push(new Uint8Array(central.buffer), nombre);

    desplazamiento += 30 + nombre.length + datos.length;
  }

  const tamanoCentral = centrales.reduce((s, x) => s + x.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(4, 0, true);
  fin.setUint16(6, 0, true);
  fin.setUint16(8, partes.length, true);
  fin.setUint16(10, partes.length, true);
  fin.setUint32(12, tamanoCentral, true);
  fin.setUint32(16, desplazamiento, true);
  fin.setUint16(20, 0, true);

  const total = desplazamiento + tamanoCentral + 22;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const x of [...locales, ...centrales, new Uint8Array(fin.buffer)]) {
    out.set(x, pos);
    pos += x.length;
  }
  return out;
}

function xml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** "A", "B", ... "Z", "AA"... */
export function letraDeColumna(indice: number): string {
  let n = indice + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/**
 * Un libro con una hoja. La primera fila va en negrita (es la cabecera);
 * los números quedan como números, el resto como texto. `anchos` son las
 * columnas en caracteres, opcional.
 */
export function libroXlsx(nombreHoja: string, filas: readonly (readonly Celda[])[], anchos?: readonly number[], ahora = new Date()): Uint8Array {
  const columnas = Math.max(1, ...filas.map((f) => f.length));
  const celdas = filas
    .map((fila, i) => {
      const r = i + 1;
      const cs = fila
        .map((v, j) => {
          if (v === null || v === "") return "";
          const ref = `${letraDeColumna(j)}${r}`;
          const estilo = i === 0 ? ' s="1"' : "";
          return typeof v === "number"
            ? `<c r="${ref}"${estilo}><v>${v}</v></c>`
            : `<c r="${ref}" t="inlineStr"${estilo}><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r}">${cs}</row>`;
    })
    .join("");
  const cols = (anchos ?? Array.from({ length: columnas }, () => 16))
    .map((w, j) => `<col min="${j + 1}" max="${j + 1}" width="${w}" customWidth="1"/>`)
    .join("");

  const hoja =
    DECL +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${cols}</cols><sheetData>${celdas}</sheetData></worksheet>`;
  const libro =
    DECL +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(nombreHoja)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const estilos =
    DECL +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`;
  const tipos =
    DECL +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  const relsRaiz =
    DECL +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const relsLibro =
    DECL +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  return zipSinComprimir(
    [
      { nombre: "[Content_Types].xml", contenido: tipos },
      { nombre: "_rels/.rels", contenido: relsRaiz },
      { nombre: "xl/workbook.xml", contenido: libro },
      { nombre: "xl/_rels/workbook.xml.rels", contenido: relsLibro },
      { nombre: "xl/styles.xml", contenido: estilos },
      { nombre: "xl/worksheets/sheet1.xml", contenido: hoja },
    ],
    ahora,
  );
}

export const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
