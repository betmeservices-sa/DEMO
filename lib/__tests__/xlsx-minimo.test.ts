// El .xlsx mínimo: un zip sin comprimir que Excel abre, con la tabla adentro.
import { describe, expect, it } from "vitest";
import { crc32, letraDeColumna, libroXlsx, zipSinComprimir } from "@/lib/xlsx-minimo";

const dec = new TextDecoder();

/** Lee el directorio central del zip: nombre, crc y dónde empieza cada parte. */
function entradas(zip: Uint8Array) {
  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const fin = zip.length - 22;
  expect(dv.getUint32(fin, true)).toBe(0x06054b50);
  const n = dv.getUint16(fin + 8, true);
  let pos = dv.getUint32(fin + 16, true);
  const out: { nombre: string; crc: number; tamano: number; contenido: string }[] = [];
  for (let i = 0; i < n; i++) {
    expect(dv.getUint32(pos, true)).toBe(0x02014b50);
    const crc = dv.getUint32(pos + 16, true);
    const tamano = dv.getUint32(pos + 24, true);
    const largoNombre = dv.getUint16(pos + 28, true);
    const desplazamiento = dv.getUint32(pos + 42, true);
    const nombre = dec.decode(zip.subarray(pos + 46, pos + 46 + largoNombre));
    // La cabecera local apunta a los datos.
    expect(dv.getUint32(desplazamiento, true)).toBe(0x04034b50);
    const inicioDatos = desplazamiento + 30 + dv.getUint16(desplazamiento + 26, true);
    const contenido = dec.decode(zip.subarray(inicioDatos, inicioDatos + tamano));
    out.push({ nombre, crc, tamano, contenido });
    pos += 46 + largoNombre;
  }
  return out;
}

describe("el zip sin comprimir", () => {
  it("crc32 del estándar", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it("guarda cada parte con su nombre, su tamaño y su crc, y se puede volver a leer", () => {
    const zip = zipSinComprimir([
      { nombre: "a.txt", contenido: "hola" },
      { nombre: "dir/b.xml", contenido: "<x>ñandú</x>" },
    ]);
    expect(Array.from(zip.subarray(0, 2))).toEqual([0x50, 0x4b]);
    const e = entradas(zip);
    expect(e.map((x) => [x.nombre, x.contenido])).toEqual([
      ["a.txt", "hola"],
      ["dir/b.xml", "<x>ñandú</x>"],
    ]);
    expect(e[0]!.crc).toBe(crc32(new TextEncoder().encode("hola")));
    expect(e[1]!.tamano).toBe(new TextEncoder().encode("<x>ñandú</x>").length);
  });
});

describe("el libro de Excel", () => {
  it("letras de columna", () => {
    expect([0, 1, 25, 26, 27, 701, 702].map(letraDeColumna)).toEqual(["A", "B", "Z", "AA", "AB", "ZZ", "AAA"]);
  });

  it("trae las seis partes que Excel exige y la hoja con la tabla", () => {
    const zip = libroXlsx("Paquetes", [
      ["Mes", "Paquete", "Usadas"],
      ["Septiembre 2026", 1, 1000],
      ["Octubre & más", 2, null],
    ]);
    const e = entradas(zip);
    expect(e.map((x) => x.nombre)).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
    ]);
    const hoja = e[5]!.contenido;
    // Cabecera en negrita (estilo 1) como texto en línea; números como números.
    expect(hoja).toContain('<c r="A1" t="inlineStr" s="1"><is><t xml:space="preserve">Mes</t></is></c>');
    expect(hoja).toContain('<c r="B2"><v>1</v></c>');
    expect(hoja).toContain('<c r="C2"><v>1000</v></c>');
    // El texto se escapa y una celda vacía no se escribe.
    expect(hoja).toContain("Octubre &amp; más");
    expect(hoja).not.toContain('r="C3"');
    expect(e[2]!.contenido).toContain('<sheet name="Paquetes" sheetId="1" r:id="rId1"/>');
    expect(e[0]!.contenido).toContain("/xl/worksheets/sheet1.xml");
  });
});
