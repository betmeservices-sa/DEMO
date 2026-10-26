// Un .zip sin compresión, para bajar las láminas de un carrusel de una vez.
//
// Las imágenes ya vienen comprimidas (PNG, WebP, JPG): comprimirlas otra vez
// no ahorra nada, así que cada archivo va tal cual ("stored"). Sin librería:
// el formato con solo eso son tres cabeceras y un CRC.

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
  for (const b of datos) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ArchivoZip {
  nombre: string;
  datos: Uint8Array;
}

/** Los bytes del .zip. Los nombres van en UTF-8 (bit 11), así las tildes llegan bien. */
export function armarZip(archivos: ArchivoZip[], fecha = new Date()): Uint8Array {
  const hora = (fecha.getHours() << 11) | (fecha.getMinutes() << 5) | (fecha.getSeconds() >> 1);
  const dia = ((fecha.getFullYear() - 1980) << 9) | ((fecha.getMonth() + 1) << 5) | fecha.getDate();
  const utf8 = new TextEncoder();
  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let desplazamiento = 0;

  for (const a of archivos) {
    const nombre = utf8.encode(a.nombre);
    const crc = crc32(a.datos);
    const comun = (v: DataView, o: number) => {
      v.setUint16(o, 20, true); // versión necesaria
      v.setUint16(o + 2, 0x0800, true); // nombre en UTF-8
      v.setUint16(o + 4, 0, true); // sin compresión
      v.setUint16(o + 6, hora, true);
      v.setUint16(o + 8, dia, true);
      v.setUint32(o + 10, crc, true);
      v.setUint32(o + 14, a.datos.length, true);
      v.setUint32(o + 18, a.datos.length, true);
      v.setUint16(o + 22, nombre.length, true);
    };

    const local = new Uint8Array(30 + nombre.length);
    const vl = new DataView(local.buffer);
    vl.setUint32(0, 0x04034b50, true);
    comun(vl, 4);
    local.set(nombre, 30);
    locales.push(local, a.datos);

    const central = new Uint8Array(46 + nombre.length);
    const vc = new DataView(central.buffer);
    vc.setUint32(0, 0x02014b50, true);
    vc.setUint16(4, 20, true); // hecho por
    comun(vc, 6);
    vc.setUint32(42, desplazamiento, true);
    central.set(nombre, 46);
    centrales.push(central);

    desplazamiento += local.length + a.datos.length;
  }

  const tamanoCentral = centrales.reduce((n, c) => n + c.length, 0);
  const fin = new Uint8Array(22);
  const vf = new DataView(fin.buffer);
  vf.setUint32(0, 0x06054b50, true);
  vf.setUint16(8, archivos.length, true);
  vf.setUint16(10, archivos.length, true);
  vf.setUint32(12, tamanoCentral, true);
  vf.setUint32(16, desplazamiento, true);

  const partes = [...locales, ...centrales, fin];
  const salida = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of partes) {
    salida.set(p, o);
    o += p.length;
  }
  return salida;
}
