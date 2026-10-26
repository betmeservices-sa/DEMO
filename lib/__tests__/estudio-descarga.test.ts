import { describe, expect, it } from "vitest";
import { extensionDe, nombreArchivo, partirEquilibrado } from "@/lib/estudio/descarga";
import { armarZip, crc32 } from "@/lib/estudio/zip";

// Cada letra mide lo mismo: así los renglones se pueden contar a mano.
const medir = (s: string) => s.length * 10;

describe("descarga de la pieza", () => {
  it("parte el titular parejo, sin una palabra sola al final", () => {
    const lineas = partirEquilibrado("Tres días y dos manos después", medir, 230);
    expect(lineas).toHaveLength(2);
    const largos = lineas.map((l) => l.length);
    expect(Math.abs(largos[0] - largos[1])).toBeLessThanOrEqual(6);
    expect(partirEquilibrado("Corto", medir, 230)).toEqual(["Corto"]);
  });

  it("nombra los archivos por marca, título y lámina", () => {
    expect(nombreArchivo("Solano Pro Painting", "Antes y después, fachada", "png", 2)).toBe("solano-pro-painting-antes-y-despues-fachada-2.png");
    expect(nombreArchivo("Solano Pro Painting", "Antes y después", "zip")).toBe("solano-pro-painting-antes-y-despues.zip");
    expect(extensionDe("image/jpeg")).toBe("jpg");
    expect(extensionDe("image/webp")).toBe("webp");
  });

  it("el .zip lleva cada archivo tal cual con su CRC", () => {
    expect(crc32(new TextEncoder().encode("The quick brown fox jumps over the lazy dog"))).toBe(0x414fa339);
    const datos = new TextEncoder().encode("hola");
    const zip = armarZip([{ nombre: "lámina-1.png", datos }]);
    const v = new DataView(zip.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    expect(v.getUint32(14, true)).toBe(crc32(datos));
    const fin = zip.length - 22;
    expect(v.getUint32(fin, true)).toBe(0x06054b50);
    expect(v.getUint16(fin + 10, true)).toBe(1);
  });
});
