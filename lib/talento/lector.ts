// Lee texto libre (la descripcion de una vacante o un CV pegado) y saca los
// datos que usa el match. Por palabras clave, sin llamar a ningun modelo:
// cuesta cero y lo que no reconoce lo deja vacio para que una persona lo
// complete en el formulario, en vez de inventarlo.

import { DEPARTAMENTOS_SV, PAISES, SKILLS, normalizar } from "./catalogo";
import type { Disc, Horario, Jornada, Modalidad, NivelIngles, Pais, Requisitos } from "./tipos";

// Frases que convierten lo que sigue en "deseable" y no en requisito.
const DESEABLE = /(deseable|plus|valoramos|nice to have|preferible|se valora|un extra|opcional)/;

function contiene(texto: string, frase: string): boolean {
  // Limites de palabra para que "sql" no aparezca dentro de "mysqlx" ni "ghl"
  // dentro de otra palabra.
  const esc = frase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(texto);
}

export function skillsEn(texto: string): string[] {
  const t = normalizar(texto);
  return SKILLS.filter((s) => s.sinonimos.some((syn) => contiene(t, syn))).map((s) => s.id);
}

export function inglesEn(texto: string): NivelIngles | null {
  const t = normalizar(texto);
  const cefr = t.match(/(?:^|[^a-z0-9])(a2|b1|b2|c1|c2)(?:[^a-z0-9]|$)/);
  if (cefr) return cefr[1].toUpperCase() as NivelIngles;
  if (/(ingles nativo|native english|english native|native speaker)/.test(t)) return "C2";
  if (/(bilingue|bilingual|ingles fluido|ingles avanzado|fluent|advanced english|full english)/.test(t)) return "C1";
  if (/(ingles intermedio alto|upper intermediate)/.test(t)) return "B2";
  if (/(ingles intermedio|intermediate english|ingles conversacional)/.test(t)) return "B1";
  if (/(ingles basico|basic english)/.test(t)) return "A2";
  return null;
}

export function aniosEn(texto: string): number | null {
  const t = normalizar(texto);
  const m = t.match(/(\d{1,2})\s*\+?\s*(?:anos|ano|years|year|yrs)/);
  return m ? Number(m[1]) : null;
}

export function salarioEn(texto: string): number | null {
  const t = normalizar(texto).replace(/,/g, "");
  const m = t.match(/\$\s?(\d{3,5})/) ?? t.match(/(\d{3,5})\s?(?:usd|dolares|us\$)/);
  return m ? Number(m[1]) : null;
}

export function jornadaEn(texto: string): Jornada | null {
  const t = normalizar(texto);
  if (/(medio tiempo|part time|part-time|20 horas)/.test(t)) return "medio";
  if (/(tiempo completo|full time|full-time|40 horas)/.test(t)) return "completo";
  return null;
}

export function horarioEn(texto: string): Horario | null {
  const t = normalizar(texto);
  if (contiene(t, "pst") || /(hora del pacifico|pacific time|costa oeste)/.test(t)) return "pacifico";
  if (contiene(t, "cst") || /(hora central|central time|zona central)/.test(t)) return "central";
  if (contiene(t, "est") || /(eastern|hora del este|costa este)/.test(t)) return "este";
  return null;
}

export function modalidadEn(texto: string): Modalidad | null {
  const t = normalizar(texto);
  if (/(hibrido|hybrid)/.test(t)) return "hibrido";
  if (/(presencial|en oficina|on-site|onsite)/.test(t)) return "presencial";
  if (/(remoto|remote|desde casa|home office)/.test(t)) return "remoto";
  return null;
}

export function departamentoEn(texto: string): string | null {
  const t = normalizar(texto);
  for (const d of DEPARTAMENTOS_SV) {
    if (contiene(t, normalizar(d.nombre))) return d.nombre;
  }
  for (const d of DEPARTAMENTOS_SV) {
    if (d.municipios.some((m) => contiene(t, m))) return d.nombre;
  }
  return null;
}

export function paisesEn(texto: string): Pais[] {
  const t = normalizar(texto);
  const encontrados = PAISES.filter((p) => p.alias.some((a) => contiene(t, a))).map((p) => p.id);
  if (/(latam|latinoamerica|centroamerica)/.test(t) && encontrados.length === 0) {
    return ["SV", "GT", "HN", "NI", "CR", "PA"];
  }
  return encontrados;
}

export function discEn(texto: string): Disc[] {
  const t = normalizar(texto);
  const salida: Disc[] = [];
  if (!/(^|[^a-z])disc([^a-z]|$)/.test(t)) return salida;
  const m = t.match(/disc[^a-z0-9]+([dics](?:\s*(?:[/,]|y|o)\s*[dics])*)(?:[^a-z]|$)/);
  if (m) {
    for (const letra of m[1].replace(/[^dics]/g, "").split("")) {
      const d = letra.toUpperCase() as Disc;
      if (!salida.includes(d)) salida.push(d);
    }
  }
  const nombres: [RegExp, Disc][] = [
    [/dominante/, "D"],
    [/influyente/, "I"],
    [/estable/, "S"],
    [/concienzud/, "C"],
  ];
  for (const [re, d] of nombres) if (re.test(t) && !salida.includes(d)) salida.push(d);
  return salida;
}

export interface LecturaVacante {
  titulo: string;
  cliente: string;
  requisitos: Requisitos;
  /** Que campos se leyeron del texto y cuales quedaron con el valor por defecto. */
  leidos: (keyof Requisitos)[];
}

export const REQUISITOS_BASE: Requisitos = {
  skills: [],
  deseables: [],
  ingles: "B2",
  experiencia: 1,
  salarioMax: 1000,
  modalidad: "remoto",
  paises: ["SV", "GT", "HN"],
  jornada: "completo",
  horario: "este",
  disc: [],
};

export function leerVacante(texto: string): LecturaVacante {
  const lineas = texto
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const titulo = (lineas[0] ?? "").replace(/^(puesto|posicion|vacante|titulo)\s*:\s*/i, "").slice(0, 80);
  const lineaCliente = lineas.find((l) => /^(cliente|empresa|client)\s*:/i.test(l));
  const cliente = lineaCliente ? lineaCliente.replace(/^[^:]+:\s*/, "") : "";

  // Requeridas y deseables se separan por frase: lo que aparece en una frase
  // que dice "deseable" va a deseables, todo lo demas es requisito.
  const frases = texto.split(/[\n.;]+/);
  const req = new Set<string>();
  const des = new Set<string>();
  let enBloqueDeseable = false;
  for (const f of frases) {
    const n = normalizar(f);
    if (DESEABLE.test(n)) enBloqueDeseable = true;
    else if (/(requisitos|requerimos|indispensable|must)/.test(n)) enBloqueDeseable = false;
    for (const s of skillsEn(f)) (enBloqueDeseable ? des : req).add(s);
  }
  for (const s of req) des.delete(s);

  const leidos: (keyof Requisitos)[] = [];
  const r: Requisitos = { ...REQUISITOS_BASE, skills: [...req], deseables: [...des] };
  if (req.size) leidos.push("skills");
  if (des.size) leidos.push("deseables");
  const ing = inglesEn(texto);
  if (ing) (r.ingles = ing), leidos.push("ingles");
  const an = aniosEn(texto);
  if (an !== null) (r.experiencia = an), leidos.push("experiencia");
  const sal = salarioEn(texto);
  if (sal !== null) (r.salarioMax = sal), leidos.push("salarioMax");
  const mod = modalidadEn(texto);
  if (mod) (r.modalidad = mod), leidos.push("modalidad");
  const ps = paisesEn(texto);
  if (ps.length) (r.paises = ps), leidos.push("paises");
  const dep = departamentoEn(texto);
  if (dep && r.modalidad !== "remoto") (r.departamento = dep), leidos.push("departamento");
  const jor = jornadaEn(texto);
  if (jor) (r.jornada = jor), leidos.push("jornada");
  const hor = horarioEn(texto);
  if (hor) (r.horario = hor), leidos.push("horario");
  const disc = discEn(texto);
  if (disc.length) (r.disc = disc), leidos.push("disc");

  return { titulo, cliente, requisitos: r, leidos };
}

export interface LecturaCv {
  nombre: string;
  correo: string;
  telefono: string;
  skills: string[];
  ingles: NivelIngles | null;
  anios: number | null;
  pretension: number | null;
  departamento: string | null;
  pais: Pais | null;
  jornada: Jornada | null;
  horarios: Horario[];
}

export function leerCv(texto: string): LecturaCv {
  const lineas = texto
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const correo = texto.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? "";
  const telefono = texto.match(/\+?\d[\d\s-]{7,}\d/)?.[0]?.trim() ?? "";
  // El nombre suele ser la primera linea que no es correo ni telefono.
  const nombre =
    lineas.find((l) => !l.includes("@") && !/\d{4}/.test(l) && l.split(/\s+/).length <= 5) ?? "";
  const dep = departamentoEn(texto);
  const paises = paisesEn(texto);
  const hor = horarioEn(texto);
  return {
    nombre,
    correo,
    telefono,
    skills: skillsEn(texto),
    ingles: inglesEn(texto),
    anios: aniosEn(texto),
    pretension: salarioEn(texto),
    departamento: dep,
    pais: dep ? "SV" : paises[0] ?? null,
    jornada: jornadaEn(texto),
    horarios: hor ? [hor] : [],
  };
}
