// Los paneles entre los que elige una cuenta de la agencia al entrar.
//
// Una cuenta con la marca `todos` (el equipo de MiAgentIA: alex@, sandra@...)
// no es de ningún cliente, así que al entrar se le pregunta a cuál panel va.
// Esto es lo puro de esa pantalla, para probarlo sin navegador: cómo se
// ordena la lista y cómo se busca en ella.

export interface PanelElegible {
  id: string;
  /** Nombre completo del cliente, como lo ve el equipo. */
  nombre: string;
  /** Nombre corto: el del mosaico, y el que hace que "nissan" encuentre a Nissan El Salvador. */
  corto: string;
}

/** Sin tildes ni mayúsculas: "Ginecológico" y "ginecologico" son lo mismo al buscar. */
export function sinTildes(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Por nombre, para que con muchos clientes se encuentre a ojo. */
export function ordenarPaneles<T extends PanelElegible>(lista: T[]): T[] {
  return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Los que contienen lo escrito en el nombre, el nombre corto o el id. Sin texto, todos. */
export function filtrarPaneles<T extends PanelElegible>(lista: T[], texto: string): T[] {
  const q = sinTildes(texto);
  if (!q) return lista;
  return lista.filter((p) => [p.nombre, p.corto, p.id].some((campo) => sinTildes(campo).includes(q)));
}

/** "Alex (MiAgentIA)" → "Alex". Para saludar sin el apellido ni la etiqueta de la agencia. */
export function primerNombre(nombre: string | null | undefined): string {
  const limpio = (nombre ?? "").replace(/\(.*?\)/g, "").trim();
  return limpio.split(/\s+/)[0] ?? "";
}

/** Las letras del mosaico: "Hospital Centro Ginecológico" → "HC", "Nissan" → "N". */
export function inicialesDe(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter((p) => /^[\p{L}\p{N}]/u.test(p))
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
